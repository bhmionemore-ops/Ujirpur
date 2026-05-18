import express from "express";
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, query, where, limit, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { robustSendMail } from "./email";
import { FIRESTORE_SERVER_KEY } from "./constants";

export function setupVamshavaliRoutes(app: express.Application, db: any, adminDb: any, admin: any) {
  // Send OTP
  app.post("/api/vamshavali/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      let saved = false;
      if (adminDb) {
        try {
          await adminDb.collection("vamshavali_otps").doc(email).set({
            otp,
            expiresAt,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          saved = true;
        } catch (e) {}
      }
      if (!saved && db) {
        await setDoc(doc(db, "vamshavali_otps", email), {
          otp,
          expiresAt,
          createdAt: serverTimestamp(),
          serverKey: FIRESTORE_SERVER_KEY
        });
        saved = true;
      }

      const mailOptions = {
        from: `"Barnali AI" <no-reply@barnaliai.com>`,
        to: email,
        subject: `Your OTP for Vamshavali`,
        html: `<h1>Your OTP: ${otp}</h1>`
      };

      await robustSendMail(mailOptions);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Verify OTP & Profile management...
  // (Moving more logic here later)
}
