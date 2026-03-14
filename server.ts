import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import fetch from "node-fetch";

dotenv.config();

const firebaseConfig = JSON.parse(await fs.readFile(path.resolve("firebase-applet-config.json"), "utf-8"));

async function getNewsItem(id: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/news/${id}`;
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

async function getProfileItem(id: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/influencers/${id}`;
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

  app.use(express.json());

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // Changed to custom to handle routes manually
    });
    app.use(vite.middlewares);

    app.get("/news/:id", async (req, res) => {
      const newsItem = await getNewsItem(req.params.id);
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
      const profile = await getProfileItem(req.params.id);
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
  } else {
    app.use(express.static("dist", { index: false }));

    app.get("/news/:id", async (req, res) => {
      const newsItem = await getNewsItem(req.params.id);
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
      const profile = await getProfileItem(req.params.id);
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
