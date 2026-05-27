import path from "path";
import fs from "fs/promises";
import admin from "firebase-admin";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { initializeApp as initializeClientApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { setDb, setAdminDb, setClientAuth, setFirebaseConfig, handleAdminError, setIsAdminSDKActive } from "./db";
import { initEmail } from "./email";

export async function initSDKs() {
  try {
    const configPath = path.resolve("firebase-applet-config.json");
    let config;
    try {
      const configData = await fs.readFile(configPath, "utf-8");
      config = JSON.parse(configData);
    } catch (e) {
      console.warn("[Init] firebase-applet-config.json not found, falling back to env...");
      config = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID || '(default)'
      };
    }
    
    setFirebaseConfig(config);

    if (config.projectId) {
      console.log(`[Firebase] Initializing for project: ${config.projectId}`);
      
      const dbIdOrig = config.firestoreDatabaseId;
      const dbId = (dbIdOrig === '(default)' || !dbIdOrig) ? undefined : dbIdOrig;

      // Admin SDK initialization
      if (!admin.apps.length) {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
          try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
              databaseURL: config.databaseURL
            });
            console.log(`[Firebase] Admin SDK initialized via Service Account Key`);
          } catch (e) {
            console.warn("[Firebase] Failed to parse service account key, initializing with default credentials...");
            admin.initializeApp({ projectId: config.projectId });
          }
        } else {
          admin.initializeApp({ projectId: config.projectId });
          console.log(`[Firebase] Admin SDK initialized via Project ID`);
        }
      } else {
        console.log(`[Firebase] Admin SDK already initialized. Apps: ${admin.apps.length}`);
      }

        // Always set the adminDb reference, even if already initialized
        const appInstance = admin.apps[0];
        const adb = dbId ? getAdminFirestore(appInstance, dbId) : getAdminFirestore(appInstance);
        setAdminDb(adb);
        
        // Non-blocking verification of connection and permissions
        console.log(`[Firebase] Checking Admin DB connection capability...`);
        try {
          await adb.collection("_health_check").limit(1).get();
          console.log(`[Firebase] Admin DB verification passed (DB: ${dbId || 'default'}).`);
          setIsAdminSDKActive(true);
        } catch (authErr: any) {
          const errMsg = authErr.message || "";
          const isCredErr = errMsg.toLowerCase().includes("credential") || 
                            errMsg.toLowerCase().includes("could not load default") ||
                            errMsg.toLowerCase().includes("permission") ||
                            errMsg.toLowerCase().includes("unauthenticated") ||
                            errMsg.toLowerCase().includes("unauthorized") ||
                            errMsg.toLowerCase().includes("google-auth");
          
          if (isCredErr) {
            console.log(`[Firebase] Admin SDK disabled (will operate in clean local fallback mode): Default credentials absent`);
          } else {
            console.warn(`[Firebase] Admin DB connection verification info:`, errMsg);
          }
          handleAdminError(authErr, "Startup verification");
        }

      // Client SDK initialization
      console.log(`[Firebase] Initializing/Checking Client SDK...`);
      try {
        const { getApp, getApps } = await import("firebase/app");
        let clientApp;
        if (!getApps().length) {
          clientApp = initializeClientApp(config);
          console.log("[Firebase] Client App newly initialized");
        } else {
          clientApp = getApp();
          console.log("[Firebase] Using existing Client App");
        }
        
        const firestore = dbId ? getFirestore(clientApp, dbId) : getFirestore(clientApp);
        setDb(firestore);
        setClientAuth(getAuth(clientApp));
        console.log(`[Firebase] Client SDK reference set. Valid db: ${!!firestore}`);
      } catch (clientErr: any) {
        console.error("[Firebase] Client SDK initialization failed:", clientErr.message);
      }
    }

    // Email
    await initEmail();

  } catch (error) {
    console.error("[Init] Error during SDK initialization:", error);
  }
}
