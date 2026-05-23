import express from "express";
import { robustSendMail } from "./email";
import { FIRESTORE_SERVER_KEY } from "./constants";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import * as DB from "./db";

const memoryOtps = new Map<string, any>();

export function setupAuthRoutes(app: express.Application, _db: any, _adminDb: any, admin: any) {
  console.log(`[AuthAPI] Setup Routes. DB available: ${!!DB.state.db}, AdminDB available: ${!!DB.state.adminDb}`);
  
  // Send OTP
  app.post("/api/auth/otp/send", async (req, res) => {
    let { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    
    email = email.toLowerCase().trim();

    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      console.log(`[AuthAPI] Generating OTP for ${email}...`);

      let saved = false;
      const otpDocData = {
        otp,
        expiresAt,
        createdAt: admin ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
        serverKey: FIRESTORE_SERVER_KEY
      };

      // 0. Always save to Memory first (Most reliable)
      memoryOtps.set(email, { otp, expiresAt });
      
      // 1. Try DB.state.adminDb (Primary Admin SDK)
      if (DB.state.adminDb) {
        try {
          await DB.state.adminDb.collection("auth_otps").doc(email).set(otpDocData);
          saved = true;
          console.log(`[AuthAPI] OTP saved to AdminDB`);
        } catch (e: any) {
          console.warn("[AuthAPI] AdminDB save failed:", e.message);
          DB.handleAdminError(e, "AuthAPI OTP send");
        }
      }

      // 2. Try Client SDK
      if (!saved && DB.state.db) {
        try {
          await setDoc(doc(DB.state.db, "auth_otps", email), {
            otp,
            expiresAt,
            createdAt: serverTimestamp(),
            serverKey: FIRESTORE_SERVER_KEY
          });
          saved = true;
          console.log(`[AuthAPI] OTP saved to ClientDB`);
        } catch (e: any) {
          console.warn("[AuthAPI] ClientDB save failed:", e.message);
        }
      }

      // We consider it "saved" if it's in memory at least
      const mailOptions = {
        from: `"Barnali AI" <no-reply@barnaliai.com>`,
        to: email,
        subject: `Your Login OTP for Barnia Digital Hub`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb;">Login Verification</h2>
            <p>Use the following One-Time Password (OTP) to log in to your account. This OTP is valid for 10 minutes.</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px;">
              ${otp}
            </div>
            <p style="margin-top: 20px; color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          </div>
        `
      };

      await robustSendMail(mailOptions);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[AuthAPI] OTP Send Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Verify OTP
  app.post("/api/auth/otp/verify", async (req, res) => {
    let { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    email = email.toLowerCase().trim();
    otp = otp.trim();

    try {
      let otpData: any = null;
      console.log(`[AuthAPI] Verifying OTP for ${email}...`);

      // 1. Check Memory (Primary)
      const memData = memoryOtps.get(email);
      if (memData) {
        if (memData.otp === otp && memData.expiresAt > new Date()) {
          otpData = memData;
          console.log(`[AuthAPI] OTP verified via memory`);
        }
      }

      // 2. Fallback to DBs if not in memory
      if (!otpData && DB.state.adminDb) {
        try {
          const snap = await DB.state.adminDb.collection("auth_otps").doc(email).get();
          if (snap.exists) otpData = snap.data();
        } catch (eOnAdmin: any) {
          DB.handleAdminError(eOnAdmin, "AuthAPI OTP verify");
        }
      }

      if (!otpData && DB.state.db) {
        try {
          const snap = await getDoc(doc(DB.state.db, "auth_otps", email));
          if (snap.exists()) otpData = snap.data();
        } catch (e) {}
      }

      if (!otpData) {
        return res.status(400).json({ error: "Invalid or expired OTP. Please request a new one." });
      }

      // Final check for DB data
      if (otpData.otp !== otp) {
        return res.status(400).json({ error: "Invalid OTP code." });
      }

      // Expiry cross-check for DB data if not already checked in memory pass
      if (!memData) {
        let expiresAt: Date;
        if (otpData.expiresAt?.toDate) expiresAt = otpData.expiresAt.toDate();
        else if (otpData.expiresAt?._seconds) expiresAt = new Date(otpData.expiresAt._seconds * 1000);
        else expiresAt = new Date(otpData.expiresAt);
        
        if (expiresAt < new Date()) {
          return res.status(400).json({ error: "OTP has expired." });
        }
      }

      // Cleanup
      memoryOtps.delete(email);
      if (DB.state.adminDb) {
        DB.state.adminDb.collection("auth_otps").doc(email).delete().catch((e: any) => {
          DB.handleAdminError(e, "AuthAPI OTP delete");
        });
      }

      // Auth Fallback Logic
      let userRecord: any = { uid: `user_${email.replace(/[^a-z0-9]/g, '_')}`, email };
      let authEnabled = true;

      try {
        userRecord = await admin.auth().getUserByEmail(email);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          userRecord = await admin.auth().createUser({ email, emailVerified: true });
        } else {
          const errorStr = JSON.stringify(error);
          if (errorStr.includes('identitytoolkit') || errorStr.includes('PERMISSION_DENIED') || errorStr.includes('403')) {
            console.warn("[AuthAPI] Identity Toolkit API error, falling back to session-only mode.");
            authEnabled = false;
          } else {
            throw error;
          }
        }
      }

      let customToken = null;
      if (authEnabled) {
        try {
          customToken = await admin.auth().createCustomToken(userRecord.uid);
        } catch (tokenErr: any) {
          console.warn("[AuthAPI] Custom Token failed, falling back to session-only.");
          authEnabled = false;
        }
      }
      
      res.json({ 
        success: true, 
        customToken, 
        user: { 
          uid: userRecord.uid, 
          email: userRecord.email, 
          displayName: userRecord.displayName || email.split('@')[0] 
        },
        authStatus: customToken ? 'firebase' : 'session_only',
        error: customToken ? null : "Identity Toolkit API issue. Using fallback session. Visit GCP Console to ensure API is fully active."
      });
    } catch (error: any) {
      console.error("[AuthAPI] OTP Verification Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
