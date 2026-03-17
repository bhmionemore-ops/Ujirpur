// Server entry point - Updated trending news limit to 6
import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import fetch from "node-fetch";
import admin from "firebase-admin";
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
  Firestore
} from "firebase/firestore";

dotenv.config();

let db: Firestore | null = null;

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
    
    // Initialize Client SDK (more reliable for permissions in this environment)
    const clientApp = initializeClientApp(firebaseConfig);
    db = getFirestore(clientApp, firebaseConfig.firestoreDatabaseId || undefined);
    const clientAuth = getAuth(clientApp);
    
    // Still init Admin for other potential uses (like Auth if needed later)
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
    }

    // Sign in as server admin using a custom token to satisfy security rules
    try {
      const customToken = await admin.auth().createCustomToken("server-admin");
      await signInWithCustomToken(clientAuth, customToken);
      console.log("Server authenticated as 'server-admin'");
    } catch (authError) {
      console.error("Server authentication failed:", authError);
    }
    
    console.log(`Firebase Client SDK initialized. Project: ${firebaseConfig.projectId}`);
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
    if (!db) return res.status(500).json({ error: "Firestore not initialized" });
    
    const clientAuth = getAuth();
    console.log(`[${new Date().toISOString()}] Save news request. Current UID: ${clientAuth.currentUser?.uid}`);
    
    const { localBn, localEn, trendingBn, trendingEn } = req.body;
    const timestamp = new Date().toISOString();
    
    try {
      console.log(`[${timestamp}] Saving news provided by client...`);
      
      const newsCollection = collection(db, "news");
      const trendingCollection = collection(db, "trending_news");
      let totalAdded = 0;

      // Helper to delete old items safely in batches
      const deleteOldItems = async (colRef: any, lang: string) => {
        const q = await getDocs(query(colRef, where("language", "==", lang)));
        let batch = writeBatch(db!);
        let count = 0;
        for (const document of q.docs) {
          batch.delete(document.ref);
          count++;
          if (count >= 450) {
            await batch.commit();
            batch = writeBatch(db!);
            count = 0;
          }
        }
        if (count > 0) await batch.commit();
        return count;
      };

      const saveCategory = async (items: any[], colRef: any, lang: string) => {
        if (!items || items.length === 0) return;
        await deleteOldItems(colRef, lang);
        
        let batch = writeBatch(db!);
        let count = 0;
        for (const item of items) {
          const { id, ...rest } = item;
          batch.set(doc(colRef), {
            ...rest,
            language: lang,
            createdAt: serverTimestamp()
          });
          count++;
          totalAdded++;
          if (count >= 450) {
            await batch.commit();
            batch = writeBatch(db!);
            count = 0;
          }
        }
        if (count > 0) await batch.commit();
      };

      await Promise.all([
        saveCategory(localBn, newsCollection, 'bn'),
        saveCategory(localEn, newsCollection, 'en'),
        saveCategory(trendingBn, trendingCollection, 'bn'),
        saveCategory(trendingEn, trendingCollection, 'en')
      ]);

      await setDoc(doc(db, "system", "news_status"), {
        lastUpdated: serverTimestamp(),
        status: "success",
        count: totalAdded
      }, { merge: true });

      res.json({ success: true, count: totalAdded });
    } catch (error) {
      console.error("Failed to save news:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
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
    if (!db) return res.status(500).json({ error: "Firestore not initialized" });
    
    const clientAuth = getAuth();
    console.log(`[${new Date().toISOString()}] Clear news request. Current UID: ${clientAuth.currentUser?.uid}`);
    
    try {
      console.log(`[${new Date().toISOString()}] Manual news clear requested`);
      
      const collections = ["news", "trending_news"];
      let totalDeleted = 0;
      
      for (const colName of collections) {
        const colRef = collection(db, colName);
        const q = await getDocs(colRef);
        let batch = writeBatch(db);
        let count = 0;
        
        for (const document of q.docs) {
          batch.delete(document.ref);
          count++;
          totalDeleted++;
          
          if (count >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        
        if (count > 0) {
          await batch.commit();
        }
        console.log(`Cleared ${count} items from ${colName}`);
      }
      
      // Reset status
      await setDoc(doc(db, "system", "news_status"), {
        status: "cleared",
        lastUpdated: null,
        lastAttempt: serverTimestamp()
      }, { merge: true });
      
      res.json({ success: true, deletedCount: totalDeleted });
    } catch (error) {
      console.error("Clear news failed:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.post("/api/admin/update-news", async (req, res) => {
    res.status(405).json({ error: "Method not allowed. Generation must happen on client." });
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
