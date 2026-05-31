import express from "express";
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, query, where, limit, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { robustSendMail } from "./email";
import { FIRESTORE_SERVER_KEY } from "./constants";
import * as DB from "./db";

const memoryVamshavaliOtps = new Map<string, any>();

export function setupVamshavaliRoutes(app: express.Application, _db: any, _adminDb: any, admin: any) {
  // Send OTP
  app.post("/api/vamshavali/send-otp", async (req, res) => {
    let { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    email = email.toLowerCase().trim();

    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const otpDocData = {
        otp,
        expiresAt,
        createdAt: admin ? admin.firestore.FieldValue.serverTimestamp() : new Date()
      };

      // 0. Always save to Memory first (Most reliable)
      memoryVamshavaliOtps.set(email, { otp, expiresAt });
      let saved = true; // Memory is always successful, so consider it saved!

      // 1. Try StateAdminDB
      if (DB.state.adminDb) {
        try {
          await DB.withTimeout(
            DB.state.adminDb.collection("vamshavali_otps").doc(email).set(otpDocData),
            3000,
            "AdminDB set Vamshavali OTP"
          );
        } catch (e: any) {
          console.warn("[Vamshavali] AdminDB save failed or timed out:", e.message);
          // If StateAdminDB fails, try fallback ONLY if default is different
          try {
            const defaultDb = admin.firestore();
            if (defaultDb !== DB.state.adminDb) {
              await DB.withTimeout(
                defaultDb.collection("vamshavali_otps").doc(email).set(otpDocData),
                3000,
                "DefaultDb set Vamshavali OTP"
              );
            }
          } catch (e2) {}
        }
      } else if (admin && typeof admin.firestore === 'function') {
        // 2. Try direct admin.firestore() ONLY if state was null
        try {
          await DB.withTimeout(
            admin.firestore().collection("vamshavali_otps").doc(email).set(otpDocData),
            3000,
            "DirectAdmin Firestore set Vamshavali OTP"
          );
        } catch (e) {}
      }
      
      // 3. Try Client SDK
      if (DB.state.db) {
        try {
          await DB.withTimeout(
            setDoc(doc(DB.state.db, "vamshavali_otps", email), {
              ...otpDocData,
              createdAt: serverTimestamp(),
              serverKey: FIRESTORE_SERVER_KEY
            }),
            3000,
            "ClientDB set Vamshavali OTP"
          );
        } catch (e) {}
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
    let { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    email = email.toLowerCase().trim();
    otp = otp.trim();

    try {
      let otpData: any = null;

      // 1. Check Memory (Primary)
      const memData = memoryVamshavaliOtps.get(email);
      if (memData) {
        if (memData.otp === otp && memData.expiresAt > new Date()) {
          otpData = memData;
          console.log(`[Vamshavali] OTP verified via memory`);
        }
      }

      // 2. Try StateAdminDB
      if (!otpData && DB.state.adminDb) {
        try {
          const snap: any = await DB.withTimeout(
            DB.state.adminDb.collection("vamshavali_otps").doc(email).get(),
            3000,
            "AdminDB get Vamshavali OTP"
          );
          if (snap && snap.exists) otpData = snap.data();
        } catch (e: any) {
          console.warn("[Vamshavali] AdminDB verify check failed or timed out:", e.message);
          // If StateAdminDB fails, try fallback ONLY if default is different
          try {
            const defaultDb = admin.firestore();
            if (defaultDb !== DB.state.adminDb) {
              const snap: any = await DB.withTimeout(
                defaultDb.collection("vamshavali_otps").doc(email).get(),
                3000,
                "DefaultDb get Vamshavali OTP"
              );
              if (snap && snap.exists) otpData = snap.data();
            }
          } catch (e2) {}
        }
      } else if (!otpData && admin && typeof admin.firestore === 'function') {
        // Try direct admin.firestore() ONLY if state was null
        try {
          const snap: any = await DB.withTimeout(
            admin.firestore().collection("vamshavali_otps").doc(email).get(),
            3000,
            "DirectAdmin Firestore get Vamshavali OTP"
          );
          if (snap && snap.exists) otpData = snap.data();
        } catch (e) {}
      }
      
      // 3. Try Client SDK
      if (!otpData && DB.state.db) {
        try {
          const snap: any = await DB.withTimeout(
            getDoc(doc(DB.state.db, "vamshavali_otps", email)),
            3000,
            "ClientDB get Vamshavali OTP"
          );
          if (snap && snap.exists()) otpData = snap.data();
        } catch (e) {}
      }

      if (!otpData || otpData.otp !== otp) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Check expiry
      let expiresAt: Date;
      if (otpData.expiresAt?.toDate) expiresAt = otpData.expiresAt.toDate();
      else if (otpData.expiresAt?._seconds) expiresAt = new Date(otpData.expiresAt._seconds * 1000);
      else expiresAt = new Date(otpData.expiresAt);

      if (expiresAt < new Date()) {
        return res.status(400).json({ error: "OTP has expired" });
      }

      // Cleanup
      memoryVamshavaliOtps.delete(email);
      if (DB.state.adminDb) {
        DB.state.adminDb.collection("vamshavali_otps").doc(email).delete().catch(() => {});
      }

      // Fetch or Bootstrap Profile
      let profile: any = null;
      if (DB.state.adminDb) {
        try {
          const snap: any = await DB.withTimeout(
            DB.state.adminDb.collection("vamshavali_profiles").where("email", "==", email).limit(1).get(),
            3000,
            "AdminDB get Vamshavali Profile"
          );
          if (snap && !snap.empty) {
            profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
          }
        } catch (e: any) {
          console.warn("[Vamshavali] AdminDB query profile timed out or failed:", e.message);
        }
      }
      if (!profile && DB.state.db) {
        try {
          const q = query(collection(DB.state.db, "vamshavali_profiles"), where("email", "==", email), limit(1));
          const snap: any = await DB.withTimeout(
            getDocs(q),
            3000,
            "ClientDB get Vamshavali Profile"
          );
          if (snap && !snap.empty) {
            profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
          }
        } catch (e: any) {
          console.warn("[Vamshavali] ClientDB query profile timed out or failed:", e.message);
        }
      }

      if (!profile) {
        try {
          const { bootstrapProfile } = await import("./vamshavali-logic");
          profile = await DB.withTimeout(
            bootstrapProfile(email, DB.state.db, DB.state.adminDb, admin),
            3500,
            "Bootstrap Profile"
          );
        } catch (e: any) {
          console.error("[Vamshavali] Bootstrap Profile failed or timed out:", e.message);
          // Return offline memory profile as last resort
          const { demoMembers } = await import("./vamshavali-logic");
          profile = {
            id: `temp_${Date.now()}`,
            email,
            name: "Family Heritage Profile",
            shareId: Math.random().toString(36).substring(2, 10).toUpperCase(),
            parents: "Traditional Ancestors",
            grandparents: "Ancestral Roots",
            gotra: "Kashyap",
            kuldevi: "Mata Rani",
            kuldevta: "Lord Shiva",
            nativePlace: "Varanasi, Uttar Pradesh",
            members: demoMembers
          };
        }
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
        try {
          const snap: any = await DB.withTimeout(
            DB.state.adminDb.collection("vamshavali_profiles").where("email", "==", email).limit(1).get(),
            3000,
            "AdminDB get profile param"
          );
          if (snap && !snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
        } catch (e) {}
      }
      if (!profile && DB.state.db) {
        try {
          const q = query(collection(DB.state.db, "vamshavali_profiles"), where("email", "==", email), limit(1));
          const snap: any = await DB.withTimeout(
            getDocs(q),
            3000,
            "ClientDB get profile param"
          );
          if (snap && !snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
        } catch (e) {}
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
