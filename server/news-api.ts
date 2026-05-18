import express from "express";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, getDocFromServer } from "firebase/firestore";
import { getGeminiApiKey, callGeminiWithRetry } from "./gemini";
import { parseGeminiJson } from "./utils";
import { FIRESTORE_SERVER_KEY } from "./constants";
import { cleanupOldNews } from "./background-tasks";

export function setupNewsRoutes(app: express.Application, db: any, adminDb: any, newsLocks: Map<string, number>, getCurrentNewsDate: () => string) {
  app.get("/api/news", async (req, res) => {
    const { date, lang, force } = req.query;
    if (!date) return res.status(400).json({ error: "Date is required" });
    const language = (lang === 'bn' ? 'bn' : 'en') as 'bn' | 'en';
    const docId = `${date}-${language}`;
    const now = Date.now();
    
    // Periodically cleanup if it's the current date and not a forced request
    if (date === getCurrentNewsDate() && !force && Math.random() < 0.1) {
      cleanupOldNews().catch(console.error);
    }

    const lockTime = newsLocks.get(docId);
    if (lockTime && (now - lockTime < 120000) && !force) {
      return res.status(202).json({ status: "generating" });
    }

    try {
      let data: any = null;
      if (!force && adminDb) {
        try {
          const snap = await adminDb.collection("news").doc(docId).get();
          if (snap.exists) data = snap.data();
        } catch (adminErr: any) {
          console.warn(`[NewsAPI] Admin SDK fetch failed (doc: ${docId}):`, adminErr.message);
          // If it's a NOT_FOUND error for the database, we should probably set adminDb to null to stop future attempts?
          // No, just log and continue to client fallback.
        }
      }

      if (!data && !force && db) {
        try {
          const snap = await getDocFromServer(doc(db, "news", docId));
          if (snap.exists()) data = snap.data();
        } catch (clientErr: any) {
          console.warn(`[NewsAPI] Client SDK fetch failed (doc: ${docId}):`, clientErr.message);
        }
      }
      
      if (data) return res.json(data);
      return res.status(404).json({ error: "Not found", triggerFrontendGen: true });
    } catch (e) {
      console.error("[NewsAPI] GET Error:", e);
      res.status(500).json({ error: "Internal error" });
    }
  });

  app.post("/api/news/cleanup", async (req, res) => {
    try {
      await cleanupOldNews();
      res.json({ success: true, message: "Old news cleaned up" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/news/generate", async (req, res) => {
    const { date, lang } = req.body;
    if (!date || !lang) return res.status(400).json({ error: "Date and lang are required" });

    const docId = `${date}-${lang}`;
    const now = Date.now();
    const lockTime = newsLocks.get(docId);
    
    if (lockTime && (now - lockTime < 120000)) {
      return res.status(202).json({ status: "generating" });
    }

    newsLocks.set(docId, now);

    try {
      const apiKey = await getGeminiApiKey();
      const prompt = `Find latest news and trends for ${date} in ${lang}. 
      Include: 5 Local News items (Barnia, Nadia, West Bengal), 5 FB trends, 5 IG trends.
      Return in JSON: {
        "local": [{"title": "...", "content": "...", "source": "...", "date": "${date}"}],
        "fbTrends": [...],
        "igTrends": [...]
      }`;

      const response = await callGeminiWithRetry(apiKey, {
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const newsData = parseGeminiJson(response.text || '{}');
      newsData.updatedAt = new Date().toISOString();
      newsData.date = date;
      newsData.serverKey = FIRESTORE_SERVER_KEY;

      let saved = false;
      if (adminDb) {
        try {
          await adminDb.collection("news").doc(docId).set(newsData);
          saved = true;
          console.log(`[NewsAPI] Generated news saved via Admin SDK for ${docId}`);
        } catch (e: any) {
          console.warn(`[NewsAPI] Admin SDK save failed for ${docId}:`, e.message);
        }
      }
      
      if (!saved && db) {
        try {
          await setDoc(doc(db, "news", docId), newsData);
          saved = true;
          console.log(`[NewsAPI] Generated news saved via Client SDK for ${docId}`);
        } catch (e: any) {
          console.error(`[NewsAPI] Client SDK save failed for ${docId}:`, e.message);
        }
      }

      newsLocks.delete(docId);
      res.json(newsData);
    } catch (error: any) {
      newsLocks.delete(docId);
      console.error("[NewsAPI] Generate Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate news" });
    }
  });

  app.post("/api/news", async (req, res) => {
    const { date, lang, newsData } = req.body;
    if (!date || !lang || !newsData) return res.status(400).json({ error: "Missing required fields" });

    const docId = `${date}-${lang}`;
    try {
      const dataToSave = {
        ...newsData,
        date,
        updatedAt: new Date().toISOString(),
        serverKey: FIRESTORE_SERVER_KEY
      };

      let saved = false;
      if (adminDb) {
        try {
          await adminDb.collection("news").doc(docId).set(dataToSave);
          saved = true;
        } catch (e: any) {
          console.warn(`[NewsAPI] Admin SDK cache save failed:`, e.message);
        }
      }
      
      if (!saved && db) {
        try {
          await setDoc(doc(db, "news", docId), dataToSave);
          saved = true;
        } catch (e: any) {
          console.error(`[NewsAPI] Client SDK cache save failed:`, e.message);
        }
      }
      
      if (saved) {
        res.json({ success: true });
      } else {
        throw new Error("Failed to save news to both Admin and Client SDKs");
      }
    } catch (error: any) {
      console.error("[NewsAPI] Cache Save Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
