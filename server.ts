// Server entry point - Updated trending news limit to 6
import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import fetch from "node-fetch";
import admin from "firebase-admin";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { initializeApp as initializeClientApp } from "firebase/app";
import { 
  getAuth, 
  signInWithCustomToken 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  setDoc, 
  serverTimestamp,
  query,
  where,
  deleteDoc,
  Firestore,
  initializeFirestore,
  getDocFromServer
} from "firebase/firestore";

dotenv.config();

let db: Firestore | null = null;
let adminDb: any = null;
let clientAuth: any = null;

let currentUpdatePromise: Promise<boolean | void> | null = null;



async function getNewsItem(id: string, projectId: string, databaseId: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/news/${id}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    
    // Firestore REST API format is a bit weird, we need to extract fields
    const fields = data.fields;
    return {
      title: fields.title?.stringValue || "Ujirpur Barnia News",
      content: fields.content?.stringValue || "Local news and community platform.",
      imageUrl: fields.imageUrl?.stringValue || "https://picsum.photos/seed/nadia/1200/630"
    };
  } catch (error) {
    console.error("Error fetching news for meta tags:", error);
    return null;
  }
}

async function getProfileItem(id: string, projectId: string, databaseId: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/influencers/${id}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    
    const fields = data.fields;
    return {
      name: fields.name?.stringValue || "Ujirpur Barnia Profile",
      bio: fields.bio?.stringValue || "Community member profile.",
      avatar: fields.avatar?.stringValue || "https://picsum.photos/seed/profile/200/200"
    };
  } catch (error) {
    console.error("Error fetching profile for meta tags:", error);
    return null;
  }
}

async function injectMetaTags(html: string, metadata: { title: string, description: string, image: string, url: string }) {
  const metaTags = `
    <title>${metadata.title}</title>
    <meta name="description" content="${metadata.description}" />
    <meta property="og:title" content="${metadata.title}" />
    <meta property="og:description" content="${metadata.description}" />
    <meta property="og:image" content="${metadata.image}" />
    <meta property="og:url" content="${metadata.url}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Ujirpur Barnia Digital Hub" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${metadata.title}" />
    <meta name="twitter:description" content="${metadata.description}" />
    <meta name="twitter:image" content="${metadata.image}" />
  `;

  // Remove existing title and meta tags that we are replacing
  let modifiedHtml = html;
  
  // Remove title
  modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/gi, "");
  
  // Remove existing meta tags that might conflict
  const tagsToRemove = [
    'description', 
    'og:title', 
    'og:description', 
    'og:image', 
    'og:url', 
    'og:type', 
    'og:site_name',
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image'
  ];
  
  tagsToRemove.forEach(tag => {
    const regex = new RegExp(`<meta (name|property)="${tag}" content=".*?"\\s*\\/?>`, 'gi');
    modifiedHtml = modifiedHtml.replace(regex, "");
  });
  
  // Inject new tags into head
  return modifiedHtml.replace("<head>", `<head>${metaTags}`);
}

const DATA_FILE = path.resolve("data.json");

async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {
      collabRequests: [],
      userInfluencers: [],
      userShops: []
    };
  }
}

async function saveData(data: any) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  let firebaseConfig: any = null;
  try {
    const configData = await fs.readFile(path.resolve("firebase-applet-config.json"), "utf-8");
    firebaseConfig = JSON.parse(configData);
    
    // Initialize Client SDK (for client-side compatible operations if needed)
    const clientApp = initializeClientApp(firebaseConfig);
    // Use initializeFirestore with long polling to avoid gRPC issues in Node.js environment
    db = initializeFirestore(clientApp, {
      experimentalForceLongPolling: true
    }, firebaseConfig.firestoreDatabaseId || undefined);
    clientAuth = getAuth(clientApp);
    
    // Initialize Admin SDK for server-side administrative tasks (bypasses rules)
    if (!admin.apps.length) {
      try {
        // Try initializing with application default credentials
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: firebaseConfig.projectId
        });
        console.log("Admin SDK initialized with Application Default Credentials.");
      } catch (credError) {
        console.warn("Could not load default credentials, trying to initialize with project ID only:", credError);
        try {
          // Fallback: Initialize with just the project ID. 
          // In some environments, this is enough if the environment is already authenticated.
          admin.initializeApp({
            projectId: firebaseConfig.projectId
          });
          console.log("Admin SDK initialized with project ID only.");
        } catch (initError) {
          console.error("Admin SDK failed to initialize even with project ID fallback:", initError);
        }
      }
    }
    
    try {
      adminDb = getAdminFirestore(admin.app(), firebaseConfig.firestoreDatabaseId || undefined);
      console.log(`Admin Firestore instance created for database: ${firebaseConfig.firestoreDatabaseId || '(default)'}`);
    } catch (dbError) {
      console.error("Failed to create Admin Firestore instance:", dbError);
    }

    // Test write with Admin SDK
    try {
      console.log(`Attempting Admin Firestore startup test write to system/admin_test...`);
      await adminDb.collection("system").doc("admin_test").set({
        lastStartup: admin.firestore.FieldValue.serverTimestamp(),
        databaseId: firebaseConfig.firestoreDatabaseId || '(default)'
      }, { merge: true });
      console.log("Admin Firestore startup test successful.");
      
      // Try to list collections as a further test of permissions
      try {
        const collections = await adminDb.listCollections();
        console.log(`Admin SDK can list collections: ${collections.map((c: any) => c.id).join(", ")}`);
      } catch (listError) {
        console.warn("Admin SDK failed to list collections (might be expected if no collections exist or limited permissions):", listError);
      }
    } catch (testError) {
      console.error("Admin Firestore startup test failed:", testError);
    }

      // Sign in as the server admin using a custom token to satisfy security rules
      try {
        const customToken = await admin.auth().createCustomToken("server-admin", {
          admin: true,
          email: "okbgmi611@gmail.com",
          email_verified: true
        });
        await signInWithCustomToken(clientAuth, customToken);
        const user = clientAuth.currentUser;
        console.log(`Server authenticated as 'server-admin' (UID: ${user?.uid})`);
        
        // Log token claims for debugging
        const idTokenResult = await user?.getIdTokenResult();
        console.log("Server Admin Token Claims:", JSON.stringify(idTokenResult?.claims));
        
        // Force a refresh of the auth state to ensure it's propagated
        await user?.getIdToken(true);
      
      // Test write to verify connection and rules
      try {
        const testPath = "system/startup_test";
        console.log(`Attempting Client SDK startup test write to ${testPath}...`);
        await setDoc(doc(db, "system", "startup_test"), {
          lastStartup: serverTimestamp(),
          authenticatedAs: "server-admin",
          uid: clientAuth.currentUser?.uid,
          timestamp: new Date().toISOString()
        }, { merge: true });
        console.log("Firestore Client SDK startup test successful.");
      } catch (testError) {
        console.error("Firestore Client SDK startup test failed (Rules issue?):", testError);
        if (testError instanceof Error) {
          console.error("Error details:", testError.message);
        }
      }
    } catch (authError) {
      console.error("Server authentication failed:", authError);
    }
    
    console.log(`Firebase SDKs initialized. Project: ${firebaseConfig.projectId}, Database: ${firebaseConfig.firestoreDatabaseId || '(default)'}`);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Logging middleware for API requests
  app.use("/api", (req, res, next) => {
    console.log(`[${new Date().toISOString()}] API Request: ${req.method} ${req.originalUrl}`);
    next();
  });

  app.post("/api/admin/save-news", async (req, res) => {
    if (!adminDb) {
      console.error("Admin Firestore not initialized during save-news request");
      return res.status(500).json({ error: "Admin Firestore not initialized" });
    }
    
    console.log(`[${new Date().toISOString()}] Save news request via Admin SDK`);
    
    const { localBn, localEn, trendingBn, trendingEn } = req.body;
    const timestamp = new Date().toISOString();
    
    try {
      console.log(`[${timestamp}] Saving news provided by client using Admin SDK...`);
      
      const newsCollection = adminDb.collection("news");
      const trendingCollection = adminDb.collection("trending_news");
      let totalAdded = 0;

      // Helper to delete old items safely in batches
      const deleteOldItems = async (colRef: any, lang: string) => {
        console.log(`Deleting old items for language: ${lang} in ${colRef.path}`);
        
        // Try Admin SDK first
        try {
          const q = await colRef.where("language", "==", lang).get();
          console.log(`[Admin] Found ${q.docs.length} items to delete for ${lang}`);
          
          let batch = adminDb.batch();
          let count = 0;
          for (const document of q.docs) {
            batch.delete(document.ref);
            count++;
            if (count >= 450) {
              await batch.commit();
              batch = adminDb.batch();
              count = 0;
            }
          }
          if (count > 0) await batch.commit();
          
          // Also check for items with NO language field and delete them if this is the first time
          const qNoLang = await colRef.where("language", "==", null).get();
          if (qNoLang.docs.length > 0) {
            console.log(`[Admin] Found ${qNoLang.docs.length} items with NO language to delete`);
            let batch2 = adminDb.batch();
            let count2 = 0;
            for (const document of qNoLang.docs) {
              batch2.delete(document.ref);
              count2++;
              if (count2 >= 450) {
                await batch2.commit();
                batch2 = adminDb.batch();
                count2 = 0;
              }
            }
            if (count2 > 0) await batch2.commit();
          }
          
          return count;
        } catch (adminError) {
          console.warn(`[Admin] Failed to delete items for ${lang}, trying Client SDK:`, adminError);
          
          // Fallback to Client SDK if Admin fails
          if (db) {
            const q = query(collection(db, colRef.id), where("language", "==", lang));
            const snapshot = await getDocs(q);
            console.log(`[Client] Found ${snapshot.docs.length} items to delete for ${lang}`);
            
            const batch = writeBatch(db);
            snapshot.docs.forEach(document => {
              batch.delete(doc(db, colRef.id, document.id));
            });
            await batch.commit();
            return snapshot.docs.length;
          }
          throw adminError;
        }
      };

      const saveCategory = async (items: any[], colRef: any, lang: string) => {
        if (!items || items.length === 0) {
          console.log(`No items to save for ${lang} in ${colRef.path}`);
          return;
        }
        
        await deleteOldItems(colRef, lang);
        
        console.log(`Saving ${items.length} new items for ${lang} in ${colRef.path}. First title: "${items[0]?.title}"`);
        
        try {
          // Try Admin SDK first
          let batch = adminDb.batch();
          let count = 0;
          for (const item of items) {
            const { id, ...rest } = item;
            batch.set(colRef.doc(), {
              ...rest,
              language: lang,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            count++;
            totalAdded++;
            if (count >= 450) {
              await batch.commit();
              batch = adminDb.batch();
              count = 0;
            }
          }
          if (count > 0) await batch.commit();
        } catch (adminError) {
          console.warn(`[Admin] Failed to save items for ${lang}, trying Client SDK:`, adminError);
          
          // Fallback to Client SDK
          if (db) {
            const batch = writeBatch(db);
            for (const item of items) {
              const { id, ...rest } = item;
              const newDocRef = doc(collection(db, colRef.id));
              batch.set(newDocRef, {
                ...rest,
                language: lang,
                createdAt: serverTimestamp()
              });
              totalAdded++;
            }
            await batch.commit();
          } else {
            throw adminError;
          }
        }
      };

      await Promise.all([
        saveCategory(localBn, newsCollection, 'bn'),
        saveCategory(localEn, newsCollection, 'en'),
        saveCategory(trendingBn, trendingCollection, 'bn'),
        saveCategory(trendingEn, trendingCollection, 'en')
      ]);

      await adminDb.collection("system").doc("news_status").set({
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        status: "success",
        count: totalAdded
      }, { merge: true });

      console.log(`Successfully saved ${totalAdded} news items via Admin SDK`);
      res.json({ success: true, count: totalAdded });
    } catch (error) {
      console.error("Failed to save news via Admin SDK:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.post("/api/admin/update-news", async (req, res) => {
    res.status(405).json({ error: "Method not allowed. Generation must happen on client." });
  });

  // Diagnostic endpoint
  app.get("/api/admin/diag", async (req, res) => {
    const diag: any = {
      timestamp: new Date().toISOString(),
      firebaseConfig: {
        projectId: firebaseConfig?.projectId,
        databaseId: firebaseConfig?.firestoreDatabaseId,
      },
      clientAuth: {
        authenticated: !!clientAuth?.currentUser,
        uid: clientAuth?.currentUser?.uid,
        email: clientAuth?.currentUser?.email,
      },
      adminDb: !!adminDb,
    };

    if (db) {
      try {
        const testDoc = await getDocFromServer(doc(db, "system", "startup_test"));
        diag.clientDbTest = {
          success: true,
          exists: testDoc.exists(),
          data: testDoc.exists() ? testDoc.data() : null
        };
      } catch (e: any) {
        diag.clientDbTest = { success: false, error: e.message };
      }
    }

    if (adminDb) {
      try {
        const testDoc = await adminDb.collection("system").doc("admin_test").get();
        diag.adminDbTest = {
          success: true,
          exists: testDoc.exists,
          data: testDoc.exists ? testDoc.data() : null
        };
      } catch (e: any) {
        diag.adminDbTest = { success: false, error: e.message };
      }
    }

    res.json(diag);
  });

  app.post("/api/admin/update-news", async (req, res) => {
    res.status(405).json({ error: "Method not allowed. Generation must happen on client." });
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Load initial data
  let localDb = await loadData();

  // Email Transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const RECIPIENT = process.env.NOTIFICATION_EMAIL || "ujirpur.barnia6@gmail.com";

  // API Routes
  app.get("/api/influencers", (req, res) => {
    res.json(localDb.userInfluencers);
  });

  app.post("/api/influencers", async (req, res) => {
    const influencer = {
      ...req.body,
      id: Math.random().toString(36).substr(2, 9)
    };
    localDb.userInfluencers.push(influencer);
    await saveData(localDb);
    res.json({ success: true, influencer });
  });

  app.get("/api/shops", (req, res) => {
    res.json(localDb.userShops);
  });

  app.post("/api/shops", async (req, res) => {
    const shop = {
      ...req.body,
      id: Math.random().toString(36).substr(2, 9)
    };
    localDb.userShops.push(shop);
    await saveData(localDb);
    res.json({ success: true, shop });
  });

  app.get("/api/collab-requests", (req, res) => {
    res.json(localDb.collabRequests);
  });

  app.post("/api/collab-request", async (req, res) => {
    const { fromName, toInfluencerId, toInfluencerName, message } = req.body;
    
    const newRequest = {
      id: Math.random().toString(36).substr(2, 9),
      fromName,
      toInfluencerId,
      toInfluencerName,
      message,
      timestamp: new Date().toISOString()
    };

    localDb.collabRequests.push(newRequest);
    await saveData(localDb);

    // Also send an email notification
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: RECIPIENT,
          subject: `New Collaboration Request for ${toInfluencerName}`,
          text: `
            From: ${fromName}
            To: ${toInfluencerName}
            Message: ${message}
            Time: ${newRequest.timestamp}
          `,
        });
      }
    } catch (error) {
      console.error("Error sending collab email:", error);
    }

    res.json({ success: true, request: newRequest });
  });

  app.post("/api/notify", async (req, res) => {
    const { type, data } = req.body;
    
    let subject = "";
    let text = "";

    if (type === "influencer") {
      subject = `New Influencer Registration: ${data.name}`;
      text = `
        New Influencer Details:
        Name: ${data.name}
        Bio: ${data.bio}
        Social Media 1: ${data.socials[0]}
        Social Media 2: ${data.socials[1]}
        Social Media 3: ${data.socials[2]}
      `;
    } else if (type === "chat") {
      subject = `New Chat Message from ${data.sender}`;
      text = `
        Message Details:
        Sender: ${data.sender}
        Message: ${data.message}
        Time: ${new Date().toLocaleString()}
      `;
    }

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: RECIPIENT,
          subject: subject,
          text: text,
        });
        res.json({ success: true, message: "Notification sent" });
      } else {
        console.log("Email credentials missing, logging to console instead:");
        console.log(`Subject: ${subject}`);
        console.log(`Text: ${text}`);
        res.json({ success: true, message: "Logged to console (no email credentials)" });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ success: false, error: "Failed to send notification" });
    }
  });

  app.post("/api/admin/clear-news", async (req, res) => {
    console.log(`[${new Date().toISOString()}] Clear news request received (Aggressive Nuke)`);
    
    try {
      const collections = ["news", "trending_news"];
      let totalDeleted = 0;
      
      for (const colName of collections) {
        console.log(`Aggressively clearing collection: ${colName}`);
        
        // Try Admin SDK first (bypasses rules)
        try {
          if (!adminDb) throw new Error("Admin Firestore not initialized");
          
          const colRef = adminDb.collection(colName);
          const snapshot = await colRef.get();
          console.log(`[Admin] Found ${snapshot.docs.length} docs in ${colName} to delete`);
          
          if (snapshot.docs.length > 0) {
            let batch = adminDb.batch();
            let count = 0;
            for (const document of snapshot.docs) {
              batch.delete(document.ref);
              count++;
              totalDeleted++;
              if (count >= 450) {
                await batch.commit();
                batch = adminDb.batch();
                count = 0;
              }
            }
            if (count > 0) await batch.commit();
          }
        } catch (adminError) {
          console.warn(`[Admin] Failed to clear ${colName} via Admin SDK, trying Client SDK:`, adminError);
          
          // Fallback to Client SDK (respects rules)
          if (db) {
            const colRef = collection(db, colName);
            const snapshot = await getDocs(colRef);
            console.log(`[Client] Found ${snapshot.docs.length} docs in ${colName} to delete`);
            
            if (snapshot.docs.length > 0) {
              let batch = writeBatch(db);
              let count = 0;
              for (const document of snapshot.docs) {
                batch.delete(doc(db, colName, document.id));
                count++;
                totalDeleted++;
                if (count >= 450) {
                  await batch.commit();
                  batch = writeBatch(db);
                  count = 0;
                }
              }
              if (count > 0) await batch.commit();
            }
          } else {
            throw adminError;
          }
        }
      }
      
      // Reset status
      try {
        const statusData = {
          status: "cleared",
          lastUpdated: null,
          lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
          clearedAt: new Date().toISOString()
        };
        
        if (adminDb) {
          await adminDb.collection("system").doc("news_status").set(statusData, { merge: true });
        } else if (db) {
          await setDoc(doc(db, "system", "news_status"), statusData, { merge: true });
        }
      } catch (statusErr) {
        console.warn("Failed to update news_status after clear:", statusErr);
      }
      
      res.json({ success: true, message: `Successfully cleared ${totalDeleted} items from news and trending_news`, count: totalDeleted });
    } catch (error) {
      console.error("Error clearing news:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
            lastUpdated: null,
            lastAttempt: serverTimestamp()
          }, { merge: true });
        }
      } catch (statusError) {
        console.warn("Failed to update status doc after clear:", statusError);
      }
      
      console.log(`Successfully cleared ${totalDeleted} news items`);
      res.json({ success: true, deletedCount: totalDeleted });
    } catch (error) {
      console.error("Clear news failed:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // Changed to custom to handle routes manually
    });
    app.use(vite.middlewares);

    app.get("/news/:id", async (req, res) => {
      const newsItem = firebaseConfig ? await getNewsItem(req.params.id, firebaseConfig.projectId, firebaseConfig.firestoreDatabaseId) : null;
      let html = await fs.readFile(path.resolve("index.html"), "utf-8");
      html = await vite.transformIndexHtml(req.originalUrl, html);
      
      if (newsItem) {
        const host = req.get('host');
        const protocol = req.protocol === 'http' && host?.includes('.run.app') ? 'https' : req.protocol;
        const fullUrl = `${protocol}://${host}${req.originalUrl}`;
        
        html = await injectMetaTags(html, {
          title: newsItem.title,
          description: newsItem.content.substring(0, 160) + "...",
          image: newsItem.imageUrl,
          url: fullUrl
        });
      }
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    });

    app.get("/profile/:id", async (req, res) => {
      const profile = firebaseConfig ? await getProfileItem(req.params.id, firebaseConfig.projectId, firebaseConfig.firestoreDatabaseId) : null;
      let html = await fs.readFile(path.resolve("index.html"), "utf-8");
      html = await vite.transformIndexHtml(req.originalUrl, html);
      
      if (profile) {
        const host = req.get('host');
        const protocol = req.protocol === 'http' && host?.includes('.run.app') ? 'https' : req.protocol;
        const fullUrl = `${protocol}://${host}${req.originalUrl}`;

        html = await injectMetaTags(html, {
          title: profile.name,
          description: profile.bio,
          image: profile.avatar,
          url: fullUrl
        });
      }
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    });

    app.get("*", async (req, res) => {
      let html = await fs.readFile(path.resolve("index.html"), "utf-8");
      html = await vite.transformIndexHtml(req.originalUrl, html);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    });

    // Catch-all for unmatched API POST requests
    app.post("/api/*", (req, res) => {
      console.warn(`Unmatched API POST request: ${req.originalUrl}`);
      res.status(404).json({ success: false, error: `API route not found: ${req.originalUrl}` });
    });
  } else {
    app.use(express.static("dist", { index: false }));

    app.get("/news/:id", async (req, res) => {
      const newsItem = firebaseConfig ? await getNewsItem(req.params.id, firebaseConfig.projectId, firebaseConfig.firestoreDatabaseId) : null;
      let html = await fs.readFile(path.resolve("dist", "index.html"), "utf-8");
      
      if (newsItem) {
        const host = req.get('host');
        const protocol = req.protocol === 'http' && host?.includes('.run.app') ? 'https' : req.protocol;
        const fullUrl = `${protocol}://${host}${req.originalUrl}`;

        html = await injectMetaTags(html, {
          title: newsItem.title,
          description: newsItem.content.substring(0, 160) + "...",
          image: newsItem.imageUrl,
          url: fullUrl
        });
      }
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    });

    app.get("/profile/:id", async (req, res) => {
      const profile = firebaseConfig ? await getProfileItem(req.params.id, firebaseConfig.projectId, firebaseConfig.firestoreDatabaseId) : null;
      let html = await fs.readFile(path.resolve("dist", "index.html"), "utf-8");
      
      if (profile) {
        const host = req.get('host');
        const protocol = req.protocol === 'http' && host?.includes('.run.app') ? 'https' : req.protocol;
        const fullUrl = `${protocol}://${host}${req.originalUrl}`;

        html = await injectMetaTags(html, {
          title: profile.name,
          description: profile.bio,
          image: profile.avatar,
          url: fullUrl
        });
      }
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    });

    app.get("*", async (req, res) => {
      res.sendFile(path.resolve("dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
