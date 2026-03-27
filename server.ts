// Server entry point
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



async function getProfileItem(id: string, projectId: string, databaseId: string) {
  console.log(`[MetaTags] Fetching profile for ID: ${id}`);
  try {
    let data: any = null;
    
    // 1. Try using Client SDK (already authenticated as server-admin)
    if (db) {
      try {
        const docRef = doc(db, "influencers", id);
        const docSnap = await getDocFromServer(docRef);
        if (docSnap.exists()) {
          data = docSnap.data();
          console.log(`[MetaTags] Profile found via Client SDK: ${data.name}`);
        }
      } catch (clientError) {
        console.warn(`[MetaTags] Client SDK fetch failed for ID ${id}:`, clientError);
      }
    }

    // 2. Try using Admin SDK if available
    if (!data && adminDb) {
      try {
        const doc = await adminDb.collection("influencers").doc(id).get();
        if (doc.exists) {
          data = doc.data();
          console.log(`[MetaTags] Profile found via Admin SDK: ${data.name}`);
        }
      } catch (adminError) {
        console.warn(`[MetaTags] Admin SDK fetch failed for ID ${id}:`, adminError);
      }
    }
    
    // 3. Fallback to REST API
    if (!data) {
      const dbIds = [databaseId, '(default)'].filter(Boolean);
      for (const dbId of dbIds) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/influencers/${id}`;
        console.log(`[MetaTags] Trying REST API (${dbId}): ${url}`);
        const response = await fetch(url);
        if (response.ok) {
          const restData = await response.json();
          const fields = restData.fields;
          if (fields) {
            data = {
              name: fields.name?.stringValue,
              bio: fields.bio?.stringValue,
              avatar: fields.avatar?.stringValue,
              socials: fields.socials?.arrayValue?.values?.map((v: any) => v.stringValue) || []
            };
            console.log(`[MetaTags] Profile found via REST API (${dbId}): ${data.name}`);
            break; // Found it!
          }
        } else {
          const errText = await response.text();
          console.warn(`[MetaTags] Profile not found via REST API (${dbId}). Status: ${response.status}`);
        }
      }
    }

    if (!data) {
      console.warn(`[MetaTags] No profile data found for ID: ${id}`);
      return null;
    }

    // Fallback for missing avatar
    if (!data.avatar) {
      data.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=random&color=fff&size=512`;
    }

    // Format social media info for description - using cleaner emojis for "real" feel
    const socialIcons: { [key: string]: string } = {
      'instagram.com': '📸',
      'facebook.com': '🟦',
      'twitter.com': '🐦',
      'x.com': '🐦',
      'youtube.com': '🟥',
      'linkedin.com': '💼',
      'github.com': '💻',
      'tiktok.com': '🎵',
      'pinterest.com': '📌',
      'snapchat.com': '👻',
      'twitch.tv': '🎮',
      'threads.net': '🧵'
    };

    const socialPlatforms = (data.socials || [])
      .map((url: string) => {
        const match = Object.keys(socialIcons).find(key => url.toLowerCase().includes(key));
        return match ? socialIcons[match] : '🌐';
      })
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i); // Unique platforms

    const socialIconsStr = socialPlatforms.join(' ');
    const socialInfo = (data.socials || [])
      .map((url: string) => {
        const match = Object.keys(socialIcons).find(key => url.toLowerCase().includes(key));
        const name = match ? match.split('.')[0].charAt(0).toUpperCase() + match.split('.')[0].slice(1) : 'Social';
        return match ? `${socialIcons[match]} ${name}` : '🌐 Social';
      })
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
      .join(' • ');

    return {
      name: data.name || "Barnia Profile",
      bio: data.bio || "Explore professional influencer profiles and collaboration opportunities in our community network.",
      avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=random&color=fff&size=512`,
      rawAvatar: data.avatar, // Keep original for proxy
      socialInfo: socialInfo || '',
      socialIconsStr: socialIconsStr || ''
    };
  } catch (error) {
    console.error(`[MetaTags] Error fetching profile for ID: ${id}:`, error);
    return null;
  }
}

async function getNewsItem(date: string, tab: string, index: string, projectId: string, databaseId: string) {
  try {
    let data: any = null;
    
    // 1. Try Client SDK
    if (db) {
      try {
        const docRef = doc(db, "news", date);
        const docSnap = await getDocFromServer(docRef);
        if (docSnap.exists()) {
          data = docSnap.data();
          console.log(`[MetaTags] News found via Client SDK for date: ${date}`);
        }
      } catch (e) {
        console.warn(`[MetaTags] Client SDK news fetch failed for date ${date}:`, e);
      }
    }

    // 2. Fallback to REST API
    if (!data) {
      const dbId = databaseId || '(default)';
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/news/${date}`;
      const response = await fetch(url);
      if (response.ok) {
        const restData = await response.json();
        const fields = restData.fields;
        if (fields) {
          // Map REST fields to regular object
          data = {};
          for (const key in fields) {
            if (fields[key].arrayValue) {
              data[key] = fields[key].arrayValue.values?.map((v: any) => {
                if (v.mapValue) {
                  const mapFields = v.mapValue.fields;
                  const item: any = {};
                  for (const mk in mapFields) {
                    item[mk] = mapFields[mk].stringValue || mapFields[mk].integerValue || mapFields[mk].booleanValue;
                  }
                  return item;
                }
                return v.stringValue;
              });
            }
          }
        }
      }
    }

    if (!data) return null;
    
    const tabData = data[tab];
    if (!tabData || !tabData[parseInt(index)]) return null;
    
    const item = tabData[parseInt(index)];
    return {
      title: item.title || "Barnia News",
      content: item.content || "Latest news from our community.",
      image: item.image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1200"
    };
  } catch (error) {
    console.error("Error fetching news for meta tags:", error);
    return null;
  }
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function injectMetaTags(html: string, metadata: { title: string, description: string, image: string, url: string }) {
  const escapedTitle = escapeHtml(metadata.title);
  const escapedDescription = escapeHtml(metadata.description);
  const escapedImage = escapeHtml(metadata.image);
  const escapedUrl = escapeHtml(metadata.url);

  const metaTags = `
    <!-- Meta Injected -->
    <title>${escapedTitle}</title>
    <meta name="description" content="${escapedDescription}" />
    <meta property="fb:app_id" content="966242223397117" />
    <meta property="og:image" content="${escapedImage}" />
    <meta property="og:image:secure_url" content="${escapedImage}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapedTitle}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:url" content="${escapedUrl}" />
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="Barnia Digital Hub" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${escapedImage}" />
    <meta name="twitter:image:alt" content="${escapedTitle}" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    <meta name="twitter:url" content="${escapedUrl}" />
    <link rel="canonical" href="${escapedUrl}" />
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
    'og:image:secure_url',
    'og:image:width',
    'og:image:height',
    'og:image:alt',
    'og:url', 
    'og:type', 
    'og:site_name',
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image',
    'twitter:image:alt',
    'twitter:url'
  ];
  
  tagsToRemove.forEach(tag => {
    // More robust regex to match meta tags regardless of attribute order
    const regex = new RegExp(`<meta\\s+[^>]*?(name|property)=["']${tag}["'][^>]*?\\/?>`, 'gi');
    modifiedHtml = modifiedHtml.replace(regex, "");
  });

  // Remove canonical link if it exists
  modifiedHtml = modifiedHtml.replace(/<link rel=["']canonical["'].*?\/?>/gi, "");
  
  // Inject new tags into head
  const headRegex = /(<head[^>]*>)/i;
  if (headRegex.test(modifiedHtml)) {
    return modifiedHtml.replace(headRegex, `$1${metaTags}`);
  }
  return metaTags + modifiedHtml;
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

  // SEO Files - MUST be at the very top to avoid being caught by catch-all routes
  app.get("/robots.txt", async (req, res) => {
    try {
      console.log(`[SEO] Request for robots.txt from ${req.ip}`);
      const content = await fs.readFile(path.resolve("robots.txt"), "utf-8");
      res.status(200).set("Content-Type", "text/plain").send(content);
    } catch (error) {
      console.error("[SEO] Error serving robots.txt:", error);
      res.status(404).send("robots.txt not found");
    }
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      console.log(`[SEO] Request for sitemap.xml from ${req.ip}`);
      const content = await fs.readFile(path.resolve("sitemap.xml"), "utf-8");
      res.status(200).set("Content-Type", "application/xml").send(content);
    } catch (error) {
      console.error("[SEO] Error serving sitemap.xml:", error);
      res.status(404).send("sitemap.xml not found");
    }
  });

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

  // Meta Tag Routes (MUST be before static/vite middleware)
  app.get("/api/image/influencer/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const profile = firebaseConfig ? await getProfileItem(id, firebaseConfig.projectId, firebaseConfig.firestoreDatabaseId) : null;
      
      if (!profile || !profile.rawAvatar) {
        return res.status(404).send("Image not found");
      }

      if (profile.rawAvatar.startsWith('data:image')) {
        const base64Data = profile.rawAvatar.split(',')[1];
        const img = Buffer.from(base64Data, 'base64');
        const mimeType = profile.rawAvatar.split(';')[0].split(':')[1];
        
        res.writeHead(200, {
          'Content-Type': mimeType,
          'Content-Length': img.length,
          'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
        });
        res.end(img);
      } else {
        // If it's already a URL, redirect to it
        res.redirect(profile.rawAvatar);
      }
    } catch (error) {
      console.error("Error serving proxy image:", error);
      res.status(500).send("Internal server error");
    }
  });

  app.get("/news/:date/:tab/:index", async (req, res) => {
    const { date, tab, index } = req.params;
    const newsItem = firebaseConfig ? await getNewsItem(date, tab, index, firebaseConfig.projectId, firebaseConfig.firestoreDatabaseId) : null;
    
    let html: string;
    if (process.env.NODE_ENV !== "production" && vite) {
      html = await fs.readFile(path.resolve("index.html"), "utf-8");
      html = await vite.transformIndexHtml(req.originalUrl, html);
    } else {
      html = await fs.readFile(path.resolve("dist", "index.html"), "utf-8");
    }
    
    const host = req.get('host')?.split(':')[0];
    const forwardedProto = req.headers['x-forwarded-proto'] as string;
    // Force HTTPS for social sharing links as required by platforms
    const protocol = 'https';
    const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
    const fullUrl = `${baseUrl}${req.originalUrl}`;

    const metadata = newsItem ? {
      title: newsItem.title,
      description: newsItem.content.substring(0, 200) + "...",
      image: newsItem.image,
      url: fullUrl
    } : {
      title: "Latest News | Barnia community",
      description: "Stay updated with the latest news, events, and announcements from the Barnia community.",
      image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1200&h=630",
      url: fullUrl
    };

    console.log(`[MetaTags] Injecting tags for news: ${metadata.title}, URL: ${fullUrl}`);
    html = await injectMetaTags(html, metadata);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });

  app.get("/profile/:id", async (req, res) => {
    const userAgent = req.get('User-Agent') || '';
    console.log(`[ProfileRoute] Request for ID: ${req.params.id}, User-Agent: ${userAgent}`);
    
    const profile = firebaseConfig ? await getProfileItem(req.params.id, firebaseConfig.projectId, firebaseConfig.firestoreDatabaseId) : null;
    
    let html: string;
    if (process.env.NODE_ENV !== "production" && vite) {
      html = await fs.readFile(path.resolve("index.html"), "utf-8");
      html = await vite.transformIndexHtml(req.originalUrl, html);
    } else {
      html = await fs.readFile(path.resolve("dist", "index.html"), "utf-8");
    }
    
    const host = req.get('host')?.split(':')[0];
    const forwardedProto = req.headers['x-forwarded-proto'] as string;
    // Force HTTPS for social sharing links as required by platforms
    const protocol = 'https';
    const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
    const fullUrl = `${baseUrl}${req.originalUrl}`;
    
    let metadata;
    if (profile) {
      // Use proxy URL for Base64 images to satisfy social media crawlers
      let imageUrl = profile.avatar;
      if (imageUrl && imageUrl.startsWith('data:image')) {
        imageUrl = `${baseUrl}/api/image/influencer/${req.params.id}`;
      } else if (imageUrl && imageUrl.startsWith('/')) {
        imageUrl = `${baseUrl}${imageUrl}`;
      }

      const bioText = profile.bio.length > 60 ? profile.bio.substring(0, 57) + "..." : profile.bio;
      // Put bio and social icons in the title so they are visible on mobile
      const title = `${profile.name} ✅ | ${bioText} ${profile.socialIconsStr}`;
      const description = `${profile.bio} | Connect: ${profile.socialInfo} | ✨ Join Barnia Digital Hub!`.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

      metadata = {
        title: title,
        description: description,
        image: imageUrl,
        url: fullUrl
      };
    } else {
      metadata = {
        title: "Influencer Profile | Barnia Digital Hub",
        description: "Explore professional influencer profiles and collaboration opportunities in our community network.",
        image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1200&h=630",
        url: fullUrl
      };
    }

    console.log(`[MetaTags] Injecting tags for profile: ${metadata.title}, URL: ${fullUrl}`);
    html = await injectMetaTags(html, metadata);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });

  // Generic Meta Tag Injection for other routes
  app.get(["/bazar", "/influencers", "/ponjika"], async (req, res) => {
    let html: string;
    if (process.env.NODE_ENV !== "production" && vite) {
      html = await fs.readFile(path.resolve("index.html"), "utf-8");
      html = await vite.transformIndexHtml(req.originalUrl, html);
    } else {
      html = await fs.readFile(path.resolve("dist", "index.html"), "utf-8");
    }

    const host = req.get('host')?.split(':')[0];
    const protocol = 'https';
    const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
    const fullUrl = `${baseUrl}${req.originalUrl}`;

    let metadata = {
      title: "Barnia Digital Hub | Community Platform",
      description: "Connect with Barnia, Ujirpur, and Nadia. Check Barnia Bazar market prices and local influencers.",
      image: "https://i.postimg.cc/McBQ2pVg/barnia-logo-120x120.png",
      url: fullUrl
    };

    if (req.originalUrl.includes("/bazar")) {
      metadata.title = "Barnia Bazar | Daily Market Prices in Barnia";
      metadata.description = "Get the latest market prices for vegetables, fish, and groceries at Barnia Bazar, Nadia.";
    } else if (req.originalUrl.includes("/influencers")) {
      metadata.title = "Influencer Network | Barnia & Ujirpur Talents";
      metadata.description = "Meet the top influencers and creators from Barnia and Ujirpur. Collaborate and grow together.";
    } else if (req.originalUrl.includes("/ponjika")) {
      metadata.title = "Bengali Ponjika | Daily Tithi & Festivals in Barnia";
      metadata.description = "Check the daily Bengali Ponjika, auspicious timings, and upcoming festivals for Barnia and Nadia.";
    }

    html = await injectMetaTags(html, metadata);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
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

  let vite: any;
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // Changed to custom to handle routes manually
    });
    app.use(vite.middlewares);

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

    app.get("*", async (req, res) => {
      res.sendFile(path.resolve("dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
