import path from "path";
import fs from "fs/promises";
import admin from "firebase-admin";
import { initializeApp as initializeClientApp } from "firebase/app";
import { getFirestore as initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { setDb, setAdminDb, setClientAuth, setFirebaseConfig } from "./db";
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
            setAdminDb(dbId ? admin.firestore(dbId) : admin.firestore());
            console.log(`[Firebase] Admin SDK initialized via Service Account Key (DB: ${dbId || 'default'})`);
          } catch (e) {
            console.warn("[Firebase] Failed to parse service account key, initializing with default credentials...");
            admin.initializeApp({ projectId: config.projectId });
            setAdminDb(dbId ? admin.firestore(dbId) : admin.firestore());
          }
        } else {
          admin.initializeApp({ projectId: config.projectId });
          setAdminDb(dbId ? admin.firestore(dbId) : admin.firestore());
          console.log(`[Firebase] Admin SDK initialized via Project ID (DB: ${dbId || 'default'})`);
        }
      }

      // Client SDK initialization
      const clientApp = initializeClientApp(config);
      setDb(dbId ? initializeFirestore(clientApp, dbId) : initializeFirestore(clientApp));
      setClientAuth(getAuth(clientApp));
    }

    // Email
    await initEmail();

  } catch (error) {
    console.error("[Init] Error during SDK initialization:", error);
  }
}
