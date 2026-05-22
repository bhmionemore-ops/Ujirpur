import express from "express";
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, query, where, limit, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { robustSendMail } from "./email";
import { FIRESTORE_SERVER_KEY } from "./constants";
import * as DB from "./db";

export function setupVamshavaliRoutes(app: express.Application, _db: any, _adminDb: any, admin: any) {
  // Send OTP
  app.post("/api/vamshavali/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const otpDocData = {
        otp,
        expiresAt,
        createdAt: admin ? admin.firestore.FieldValue.serverTimestamp() : new Date()
      };

      let saved = false;
      // 1. Try StateAdminDB
      if (DB.state.adminDb) {
        try {
          await DB.state.adminDb.collection("vamshavali_otps").doc(email).set(otpDocData);
          saved = true;
        } catch (e) {
          // If StateAdminDB fails, try fallback ONLY if default is different
          try {
            const defaultDb = admin.firestore();
            if (defaultDb !== DB.state.adminDb) {
              await defaultDb.collection("vamshavali_otps").doc(email).set(otpDocData);
              saved = true;
            }
          } catch (e2) {}
        }
      } else if (admin && typeof admin.firestore === 'function') {
        // 2. Try direct admin.firestore() ONLY if state was null
        try {
          await admin.firestore().collection("vamshavali_otps").doc(email).set(otpDocData);
          saved = true;
        } catch (e) {}
      }
      // 3. Try Client SDK
      if (!saved && DB.state.db) {
        try {
          await setDoc(doc(DB.state.db, "vamshavali_otps", email), {
            ...otpDocData,
            createdAt: serverTimestamp(),
            serverKey: FIRESTORE_SERVER_KEY
          });
          saved = true;
        } catch (e) {}
      }

      if (!saved) {
        throw new Error("Failed to save OTP to any available database");
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
      // Try StateAdminDB
      if (DB.state.adminDb) {
        try {
          const snap = await DB.state.adminDb.collection("vamshavali_otps").doc(email).get();
          if (snap.exists) otpData = snap.data();
        } catch (e) {
          // If StateAdminDB fails, try fallback ONLY if default is different
          try {
            const defaultDb = admin.firestore();
            if (defaultDb !== DB.state.adminDb) {
              const snap = await defaultDb.collection("vamshavali_otps").doc(email).get();
              if (snap.exists) otpData = snap.data();
            }
          } catch (e2) {}
        }
      } else if (admin && typeof admin.firestore === 'function') {
        // Try direct admin.firestore() ONLY if state was null
        try {
          const snap = await admin.firestore().collection("vamshavali_otps").doc(email).get();
          if (snap.exists) otpData = snap.data();
        } catch (e) {}
      }
      // Try Client SDK
      if (!otpData && DB.state.db) {
        const snap = await getDoc(doc(DB.state.db, "vamshavali_otps", email));
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
      if (DB.state.adminDb) DB.state.adminDb.collection("vamshavali_otps").doc(email).delete().catch(() => {});

      // Fetch or Bootstrap Profile
      let profile: any = null;
      if (DB.state.adminDb) {
        const snap = await DB.state.adminDb.collection("vamshavali_profiles").where("email", "==", email).limit(1).get();
        if (!snap.empty) {
          profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }
      if (!profile && DB.state.db) {
        const q = query(collection(DB.state.db, "vamshavali_profiles"), where("email", "==", email), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }

      if (!profile) {
        const { bootstrapProfile } = await import("./vamshavali-logic");
        profile = await bootstrapProfile(email, DB.state.db, DB.state.adminDb, admin);
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
      if (DB.state.adminDb) {
        const snap = await DB.state.adminDb.collection("vamshavali_profiles").where("email", "==", email).limit(1).get();
        if (!snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
      if (!profile && DB.state.db) {
        const q = query(collection(DB.state.db, "vamshavali_profiles"), where("email", "==", email), limit(1));
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
      const { id, ...profileData } = profile;
      
      let saved = false;
      if (DB.state.adminDb) {
        try {
          const dataForAdmin = {
            ...profileData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          await DB.state.adminDb.collection("vamshavali_profiles").doc(id).set(dataForAdmin, { merge: true });
          saved = true;
        } catch (e: any) {
          console.warn("[VamshavaliAPI] Admin SDK profile update failed:", e.message);
        }
      }

      if (!saved && DB.state.db) {
        try {
          await updateDoc(doc(DB.state.db, "vamshavali_profiles", id), {
            ...profileData,
            updatedAt: serverTimestamp(),
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
      if (DB.state.adminDb) {
        const snap = await DB.state.adminDb.collection("vamshavali_profiles").where("shareId", "==", shareId).limit(1).get();
        if (!snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
      if (!profile && DB.state.db) {
        const q = query(collection(DB.state.db, "vamshavali_profiles"), where("shareId", "==", shareId), limit(1));
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
