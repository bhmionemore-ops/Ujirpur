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

  // Verify OTP & Profile management
  app.post("/api/vamshavali/verify-otp", async (req: express.Request, res: express.Response) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    try {
      let otpData: any = null;
      if (adminDb) {
        const snap = await adminDb.collection("vamshavali_otps").doc(email).get();
        if (snap.exists) otpData = snap.data();
      }
      if (!otpData && db) {
        const snap = await getDoc(doc(db, "vamshavali_otps", email));
        if (snap.exists()) otpData = snap.data();
      }

      if (!otpData || otpData.otp !== otp) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Check expiry
      const expiresAt = otpData.expiresAt.toDate ? otpData.expiresAt.toDate() : new Date(otpData.expiresAt);
      if (expiresAt < new Date()) {
        return res.status(400).json({ error: "OTP has expired" });
      }

      // Cleanup
      if (adminDb) adminDb.collection("vamshavali_otps").doc(email).delete().catch(() => {});

      // Fetch or Bootstrap Profile
      let profile: any = null;
      if (adminDb) {
        const snap = await adminDb.collection("vamshavali_profiles").where("email", "==", email).limit(1).get();
        if (!snap.empty) {
          profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }
      if (!profile && db) {
        const q = query(collection(db, "vamshavali_profiles"), where("email", "==", email), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }

      if (!profile) {
        const { bootstrapProfile } = await import("./vamshavali-logic");
        profile = await bootstrapProfile(email, db, adminDb, admin);
      }

      res.json({ success: true, profile });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/vamshavali/profile/:email", async (req, res) => {
    const { email } = req.params;
    try {
      let profile: any = null;
      if (adminDb) {
        const snap = await adminDb.collection("vamshavali_profiles").where("email", "==", email).limit(1).get();
        if (!snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
      if (!profile && db) {
        const q = query(collection(db, "vamshavali_profiles"), where("email", "==", email), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }

      if (profile) res.json(profile);
      else res.status(404).json({ error: "Profile not found" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/vamshavali/update-profile", async (req, res) => {
    const profile = req.body;
    if (!profile || !profile.id) return res.status(400).json({ error: "Invalid profile data" });

    try {
      const { id, ...data } = profile;
      data.updatedAt = adminDb ? admin.firestore.FieldValue.serverTimestamp() : serverTimestamp();
      
      let saved = false;
      if (adminDb) {
        try {
          await adminDb.collection("vamshavali_profiles").doc(id).set(data, { merge: true });
          saved = true;
        } catch (e: any) {
          console.warn("[VamshavaliAPI] Admin SDK profile update failed:", e.message);
        }
      }

      if (!saved && db) {
        try {
          await updateDoc(doc(db, "vamshavali_profiles", id), {
            ...data,
            serverKey: FIRESTORE_SERVER_KEY
          });
          saved = true;
        } catch (e: any) {
          console.error("[VamshavaliAPI] Client SDK profile update failed:", e.message);
        }
      }

      if (saved) res.json({ success: true });
      else throw new Error("Failed to save profile");
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/vamshavali/p/:shareId", async (req, res) => {
    const { shareId } = req.params;
    try {
      let profile: any = null;
      if (adminDb) {
        const snap = await adminDb.collection("vamshavali_profiles").where("shareId", "==", shareId).limit(1).get();
        if (!snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
      if (!profile && db) {
        const q = query(collection(db, "vamshavali_profiles"), where("shareId", "==", shareId), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }

      if (profile) {
        // Remove sensitive info for public view
        const { email, ...publicData } = profile;
        res.json(publicData);
      } else {
        res.status(404).json({ error: "Public profile not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
