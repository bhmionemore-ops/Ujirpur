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
      console.log(`🔑 [DEVELOPER] Generated OTP for ${email} is: ${otp}`);

      let saved = false;
      const otpDocData = {
        otp,
        expiresAt,
        createdAt: admin ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
        serverKey: FIRESTORE_SERVER_KEY
      };

      // 0. Always save to Memory first (Most reliable)
      memoryOtps.set(email, { otp, expiresAt });
      
      // Save to databases in the background so the user gets their OTP instantly without waiting
      (async () => {
        if (DB.state.adminDb) {
          try {
            await DB.withTimeout(
              DB.state.adminDb.collection("auth_otps").doc(email).set(otpDocData),
              3000,
              "AdminDB save OTP"
            );
            console.log(`[AuthAPI] OTP saved to AdminDB (bg)`);
            return;
          } catch (e: any) {
            console.warn("[AuthAPI] AdminDB background save failed:", e.message);
            DB.handleAdminError(e, "AuthAPI OTP send bg");
          }
        }

        if (DB.state.db) {
          try {
            await DB.withTimeout(
              setDoc(doc(DB.state.db, "auth_otps", email), {
                otp,
                expiresAt,
                createdAt: serverTimestamp(),
                serverKey: FIRESTORE_SERVER_KEY
              }),
              3000,
              "ClientDB save OTP"
            );
            console.log(`[AuthAPI] OTP saved to ClientDB (bg)`);
          } catch (e: any) {
            console.warn("[AuthAPI] ClientDB background save failed:", e.message);
          }
        }
      })().catch(err => console.error("[AuthAPI] Background OTP save failed:", err));

      // We consider it "saved" if it's in memory at least
      const mailOptions = {
        from: `"Barnia Digital Hub" <no-reply@barnaliai.com>`,
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

      // Send the email in the background to ensure instantaneous response without network timeouts
      robustSendMail(mailOptions).catch(err => {
        console.error(`[AuthAPI] Background send OTP email failed for ${email}:`, err);
      });
      
      // Only allow sandbox/debug OTP bypass for verified developer/admin accounts to prevent unauthorized access to other accounts
      const isDeveloper = (email === "okbgmi611@gmail.com" || email === "ujirpur.barnia6@gmail.com");
      res.json({ 
        success: true,
        ...(isDeveloper ? { debugOtp: otp } : {})
      });
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
        const hasMatch = memData.otp === otp;
        const hasTime = memData.expiresAt > new Date();
        console.log(`[AuthAPI] Memory OTP check for ${email}: input="${otp}", stored="${memData.otp}" (match: ${hasMatch}), expires="${memData.expiresAt.toISOString()}" (valid: ${hasTime})`);
        if (hasMatch && hasTime) {
          otpData = memData;
          console.log(`[AuthAPI] OTP verified via memory`);
        }
      } else {
        console.log(`[AuthAPI] No active memory OTP found for ${email}`);
      }

      // 2. Fallback to DBs if not in memory
      if (!otpData && DB.state.adminDb) {
        try {
          const snap: any = await DB.withTimeout(
            DB.state.adminDb.collection("auth_otps").doc(email).get(),
            3000,
            "AdminDB get OTP"
          );
          if (snap && snap.exists) {
            otpData = snap.data();
            console.log(`[AuthAPI] Loaded stored OTP from AdminDB for ${email}`);
          }
        } catch (eOnAdmin: any) {
          console.warn("[AuthAPI] AdminDB verify check failed or timed out:", eOnAdmin.message);
          DB.handleAdminError(eOnAdmin, "AuthAPI OTP verify");
        }
      }

      if (!otpData && DB.state.db) {
        try {
          const snap: any = await DB.withTimeout(
            getDoc(doc(DB.state.db, "auth_otps", email)),
            3000,
            "ClientDB get OTP"
          );
          if (snap && snap.exists()) {
            otpData = snap.data();
            console.log(`[AuthAPI] Loaded stored OTP from ClientDB for ${email}`);
          }
        } catch (e) {
          console.warn("[AuthAPI] ClientDB verify check failed or timed out:", e.message);
        }
      }

      if (!otpData) {
        console.warn(`[AuthAPI] Verification failed: No stored OTP data found for ${email}`);
        return res.status(400).json({ error: "Invalid or expired OTP. Please request a new one." });
      }

      // Final check for DB data
      if (otpData.otp !== otp) {
        console.warn(`[AuthAPI] Verification failed: OTP code mismatch for ${email}. Entered "${otp}", Expected "${otpData.otp}"`);
        return res.status(400).json({ error: "Invalid OTP code." });
      }

      // Expiry cross-check for DB data if not already checked in memory pass
      if (!memData) {
        let expiresAt: Date;
        if (otpData.expiresAt?.toDate) expiresAt = otpData.expiresAt.toDate();
        else if (otpData.expiresAt?._seconds) expiresAt = new Date(otpData.expiresAt._seconds * 1000);
        else expiresAt = new Date(otpData.expiresAt);
        
        console.log(`[AuthAPI] DB OTP expiry check: expires="${expiresAt.toISOString()}", now="${new Date().toISOString()}"`);
        if (expiresAt < new Date()) {
          console.warn(`[AuthAPI] Verification failed: DB OTP has expired for ${email}`);
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
      let authEnabled = DB.state.isAdminSDKActive;

      if (authEnabled) {
        try {
          userRecord = await DB.withTimeout(
            admin.auth().getUserByEmail(email),
            2000,
            "AdminAuth getUserByEmail"
          );
        } catch (error: any) {
          const errMsg = error.message || String(error);
          if (errMsg.includes("timed out")) {
            console.warn("[AuthAPI] admin.auth().getUserByEmail timed out, falling back to session-only mode.");
            authEnabled = false;
          } else if (error.code === 'auth/user-not-found') {
            try {
              userRecord = await DB.withTimeout(
                admin.auth().createUser({ email, emailVerified: true }),
                2000,
                "AdminAuth createUser"
              );
            } catch (createErr: any) {
              console.warn("[AuthAPI] Failed to create user via Admin SDK, setting authEnabled false:", createErr.message || createErr);
              authEnabled = false;
            }
          } else {
            const errorStr = JSON.stringify(error) || String(error);
            const isCredOrPermErr = errorStr.includes('identitytoolkit') || 
                                    errorStr.includes('PERMISSION_DENIED') || 
                                    errorStr.includes('403') ||
                                    errorStr.toLowerCase().includes('credential') ||
                                    errorStr.toLowerCase().includes('could not load default');
            if (isCredOrPermErr) {
              console.warn("[AuthAPI] Admin Auth permission/credential issue, falling back to session-only mode.");
              authEnabled = false;
            } else {
              throw error;
            }
          }
        }
      }

      let customToken = null;
      if (authEnabled) {
        try {
          customToken = await DB.withTimeout(
            admin.auth().createCustomToken(userRecord.uid),
            2000,
            "AdminAuth createCustomToken"
          );
        } catch (tokenErr: any) {
          console.warn("[AuthAPI] Custom Token failed, falling back to session-only:", tokenErr.message || tokenErr);
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

  // Send Welcome Email
  app.post("/api/send-welcome-email", async (req, res) => {
    let { email, name } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    email = email.toLowerCase().trim();
    const displayName = name || email.split('@')[0];

    try {
      console.log(`[AuthAPI] Sending welcome email to ${email}...`);

      const mailOptions = {
        from: `"Barnia Digital Hub" <no-reply@barnaliai.com>`,
        to: email,
        subject: `Welcome to Barnia Digital Hub, ${displayName}!`,
        html: `
          <div style="font-family: sans-serif; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #1f2937;">
            <div style="text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
              <h1 style="color: #2563eb; font-size: 24px; margin: 0;">Barnia Digital Hub</h1>
              <p style="color: #4b5563; font-size: 14px; margin: 5px 0 0 0;">Empowering our community, together.</p>
            </div>
            
            <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Welcome and Greetings, ${displayName}! 🌟</h2>
            
            <p>We are absolutely thrilled to welcome you to the <strong>Barnia Digital Hub</strong> community!</p>
            
            <p>Our platform is designed to connect, coordinate and serve. Here are some of the fantastic features you now have full access to:</p>
            
            <ul style="padding-left: 20px; line-height: 1.6;">
              <li><strong>Live Chat Support & Bot "Barnali"</strong> – Chat, get instant intelligence, ask questions or speak with the admin team anytime.</li>
              <li><strong>Local News & Ponjika system</strong> – Stay fully updated with high-relevance local announcements and daily insights.</li>
              <li><strong>Vamshavali (Family Tree) Builder</strong> – Connect back to roots and chart your family's heritage cleanly.</li>
              <li><strong>Village Transportation Logistics</strong> – Local coordinate routes, schedules, and connectivity maps.</li>
            </ul>

            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <p style="margin: 0; font-weight: 600; color: #374151;">Account Status: Active</p>
              <p style="margin: 5px 0 0 0; color: #4b5563; font-size: 13px;">You have loaded 10 complimentary developer & search credits!</p>
            </div>

            <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">If you ever need anything, have questions, or want to contribute to our digital space, just tap on the live chat widget inside the app.</p>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 25px; text-align: center; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">This email was automatically generated by Barnia Digital Hub on behalf of the administration.</p>
              <p style="margin: 5px 0 0 0;">&copy; 2026 Barnia Digital Hub. All rights reserved.</p>
            </div>
          </div>
        `
      };

      // Send the welcome email in the background to avoid blocking and timing out
      robustSendMail(mailOptions).catch(err => {
        console.error(`[AuthAPI] Background send welcome email failed for ${email}:`, err);
      });
      res.json({ success: true, message: "Welcome email sent successfully" });
    } catch (error: any) {
      console.error("[AuthAPI] Error sending welcome email:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
