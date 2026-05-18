import express from "express";
import { robustSendMail } from "./email";
import { FIRESTORE_SERVER_KEY } from "./constants";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

export function setupAuthRoutes(app: express.Application, db: any, adminDb: any, admin: any) {
  // Send OTP
  app.post("/api/auth/otp/send", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      let saved = false;
      if (adminDb) {
        try {
          await adminDb.collection("auth_otps").doc(email).set({
            otp,
            expiresAt,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          saved = true;
        } catch (e: any) {
          console.warn("[AuthAPI] Admin SDK OTP save failed:", e.message);
        }
      }

      if (!saved && db) {
        try {
          await setDoc(doc(db, "auth_otps", email), {
            otp,
            expiresAt,
            createdAt: serverTimestamp(),
            serverKey: FIRESTORE_SERVER_KEY
          });
          saved = true;
        } catch (e: any) {
          console.error("[AuthAPI] Client SDK OTP save failed:", e.message);
        }
      }

      if (!saved) {
        throw new Error("Failed to save OTP to database");
      }

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
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    try {
      let otpData: any = null;

      if (adminDb) {
        try {
          const snap = await adminDb.collection("auth_otps").doc(email).get();
          if (snap.exists) otpData = snap.data();
        } catch (e: any) {
          console.warn("[AuthAPI] Admin SDK OTP fetch failed:", e.message);
        }
      }

      if (!otpData && db) {
        try {
          const snap = await getDoc(doc(db, "auth_otps", email));
          if (snap.exists()) otpData = snap.data();
        } catch (e: any) {
          console.warn("[AuthAPI] Client SDK OTP fetch failed:", e.message);
        }
      }

      if (!otpData) {
        return res.status(400).json({ error: "OTP not found or expired" });
      }

      // Check expiry
      const expiresAt = otpData.expiresAt.toDate ? otpData.expiresAt.toDate() : new Date(otpData.expiresAt);
      if (expiresAt < new Date()) {
        return res.status(400).json({ error: "OTP has expired" });
      }

      // Check OTP
      if (otpData.otp !== otp) {
        return res.status(400).json({ error: "Invalid OTP" });
      }

      // Cleanup OTP
      if (adminDb) {
        adminDb.collection("auth_otps").doc(email).delete().catch(() => {});
      }

      // Create or get user in Firebase Auth
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // Create new user if not exists
          userRecord = await admin.auth().createUser({
            email,
            emailVerified: true,
            displayName: email.split('@')[0]
          });
        } else {
          throw error;
        }
      }

      // Generate custom token
      const customToken = await admin.auth().createCustomToken(userRecord.uid);
      
      res.json({ success: true, customToken });
    } catch (error: any) {
      console.error("[AuthAPI] OTP Verification Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
