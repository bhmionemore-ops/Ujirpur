import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import fetch from "node-fetch";
import admin from "firebase-admin";
import { generateLocalNews, generateTrendingNews } from "./src/services/gemini.ts";

dotenv.config();

let firestore: admin.firestore.Firestore | null = null;

let currentUpdatePromise: Promise<boolean | void> | null = null;

// Background Task: Auto-update news every 2 hours
async function autoUpdateNews(): Promise<boolean | void> {
  if (currentUpdatePromise) {
    console.log("News update already in progress, waiting for it to complete...");
    return currentUpdatePromise;
  }

  currentUpdatePromise = (async () => {
    if (!firestore) {
      console.error("Skipping news update: Firestore not initialized");
      return;
    }
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Starting automated news update...`);
    try {
      // 1. Fetch all news categories in parallel
      console.log(`[${timestamp}] Fetching all news categories in parallel...`);
      const [localNewsBn, localNewsEn, trendingBn, trendingEn] = await Promise.all([
        generateLocalNews("Ujirpur Barnia Nadia, WB, India", "bn"),
        generateLocalNews("Ujirpur Barnia Nadia, WB, India", "en"),
        generateTrendingNews("bn"),
        generateTrendingNews("en")
      ]);

      const results = {
        localBn: localNewsBn,
        localEn: localNewsEn,
        trendingBn: trendingBn,
        trendingEn: trendingEn
      };

      console.log(`[${timestamp}] Fetch results: Local BN: ${localNewsBn.length}, Local EN: ${localNewsEn.length}, Trending BN: ${trendingBn.length}, Trending EN: ${trendingEn.length}`);

      if (Object.values(results).every(arr => arr.length === 0)) {
        console.warn("No news generated for any category, skipping update.");
        if (firestore) {
          await firestore.collection("system").doc("news_status").set({
            lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
            status: "no_news",
            error: "No news found for any category."
          }, { merge: true });
        }
        return false;
      }

      const batch = firestore.batch();
      const newsCollection = firestore.collection("news");
      const trendingCollection = firestore.collection("trending_news");
      let totalAdded = 0;

      // Helper to update a category
      const updateCategory = async (items: any[], collection: admin.firestore.CollectionReference, lang: string, isTrending: boolean) => {
        if (items.length === 0) return;

        // Clear existing items for this language/category
        const q = await collection.where('language', '==', lang).get();
        q.forEach(doc => batch.delete(doc.ref));

        // Add new items
        items.forEach(item => {
          const { id, ...rest } = item;
          batch.set(collection.doc(), { 
            ...rest, 
            language: lang, 
            createdAt: admin.firestore.FieldValue.serverTimestamp() 
          });
          totalAdded++;
        });
      };

      await updateCategory(localNewsBn, newsCollection, 'bn', false);
      await updateCategory(localNewsEn, newsCollection, 'en', false);
      await updateCategory(trendingBn, trendingCollection, 'bn', true);
      await updateCategory(trendingEn, trendingCollection, 'en', true);

      // Update status
      batch.set(firestore.collection("system").doc("news_status"), {
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
        status: "success",
        count: totalAdded,
        details: {
          localBn: localNewsBn.length,
          localEn: localNewsEn.length,
          trendingBn: trendingBn.length,
          trendingEn: trendingEn.length
        }
      });

      await batch.commit();
      console.log(`[${new Date().toISOString()}] Successfully updated news. Total items added: ${totalAdded}`);
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Automated news update failed:`, error);
      if (firestore) {
        await firestore.collection("system").doc("news_status").set({
          lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
          status: "error",
          error: error instanceof Error ? error.message : String(error)
        }, { merge: true });
      }
      throw error; // Re-throw so callers know it failed
    }
  })();

  try {
    return await currentUpdatePromise;
  } finally {
    currentUpdatePromise = null;
  }
}

// Middleware to check if news is stale and trigger update
async function checkNewsFreshness(req: any, res: any, next: any) {
  if (!firestore) return next();
  
  try {
    const statusDoc = await firestore.collection("system").doc("news_status").get();
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;
    
    if (!statusDoc.exists) {
      console.log("No news status found, triggering initial update...");
      autoUpdateNews().catch(err => console.error("Background update failed:", err));
    } else {
      const data = statusDoc.data();
      const lastUpdated = data?.lastUpdated?.toDate()?.getTime() || 0;
      
      if (now - lastUpdated > twoHours && !currentUpdatePromise) {
        console.log(`News is stale (${Math.floor((now - lastUpdated) / 60000)}m old), triggering background update...`);
        autoUpdateNews().catch(err => console.error("Background update failed:", err));
      }
    }
  } catch (error) {
    console.error("Error checking news freshness:", error);
  }
  next();
}

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
    
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    firestore = admin.firestore(firebaseConfig.firestoreDatabaseId);
    console.log("Firebase Admin initialized successfully.");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }

  app.use(express.json());
  app.use(checkNewsFreshness);

  // Logging middleware for API requests
  app.use("/api", (req, res, next) => {
    console.log(`[${new Date().toISOString()}] API Request: ${req.method} ${req.originalUrl}`);
    next();
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Load initial data
  let db = await loadData();

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
    res.json(db.userInfluencers);
  });

  app.post("/api/influencers", async (req, res) => {
    const influencer = {
      ...req.body,
      id: Math.random().toString(36).substr(2, 9)
    };
    db.userInfluencers.push(influencer);
    await saveData(db);
    res.json({ success: true, influencer });
  });

  app.get("/api/shops", (req, res) => {
    res.json(db.userShops);
  });

  app.post("/api/shops", async (req, res) => {
    const shop = {
      ...req.body,
      id: Math.random().toString(36).substr(2, 9)
    };
    db.userShops.push(shop);
    await saveData(db);
    res.json({ success: true, shop });
  });

  app.get("/api/collab-requests", (req, res) => {
    res.json(db.collabRequests);
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

    db.collabRequests.push(newRequest);
    await saveData(db);

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

  app.post("/api/admin/update-news", async (req, res) => {
    console.log("Received manual news update request");
    // In a real app, we would verify the admin token here
    // For this app, we'll assume the request is authorized if it comes from the admin UI
    try {
      const updated = await autoUpdateNews();
      if (updated === true) {
        console.log("Manual news update completed successfully");
        res.json({ success: true, message: "News update triggered successfully" });
      } else if (updated === false) {
        console.log("Manual news update completed, but no news was found");
        res.json({ success: true, message: "Update completed, but no new news was found for today.", noNews: true });
      } else {
        res.json({ success: true, message: "News update already in progress" });
      }
    } catch (error) {
      console.error("Manual news update failed:", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to update news" });
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
    
    // Start background tasks after server is listening
    setInterval(() => {
      autoUpdateNews().catch(err => console.error("Interval news update failed:", err));
    }, 7200000);

    console.log("Scheduling initial news update in 5 seconds...");
    setTimeout(() => {
      autoUpdateNews().catch(err => console.error("Initial news update failed:", err));
    }, 5000);
  });
}

startServer();
