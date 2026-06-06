import express from "express";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, getDocFromServer } from "firebase/firestore";
import { getGeminiApiKey, callGeminiWithRetry } from "./gemini";
import { parseGeminiJson, getNewsPrompt } from "./utils";
import { FIRESTORE_SERVER_KEY } from "./constants";
import { cleanupOldNews } from "./background-tasks";
import * as DB from "./db";

function getEmergencyMockNews(date: string, lang: 'bn' | 'en') {
  const isBn = lang === 'bn';
  return {
    local: [
      {
        title: isBn ? `বার্নিয়া-নদীয়াতে নতুন উন্নয়ন আপডেট (${date})` : `New Development Update in Barnia-Nadia (${date})`,
        content: isBn 
          ? "বার্নিয়া এবং নদীয়া জেলার বিভিন্ন এলাকায় যোগাযোগ ব্যবস্থার উন্নয়নে নতুন সড়ক সংস্কার কাজের সবুজ সংকেত দেওয়া হয়েছে। এতে স্থানীয় জনসাধারণ ও ব্যবসায়ী মহলে অত্যন্ত ইতিবাচক সাড়া পাওয়া গেছে। স্থানীয় প্রশাসন পানির সুব্যবস্থা করার বিষয়েও দ্রুত পদক্ষেপ নেবে।"
          : "Repairs and development of roads in various areas of Barnia and Nadia districts have been greenlit to improve local communication. Local businessmen and citizens are very happy with this decision. Local authorities are also resolving water supply issues soon.",
        source: isBn ? "স্থানীয় তথ্য বিভাগ" : "Local Info Desk",
        date: date
      },
      {
        title: isBn ? "নদীয়া জেলায় হস্তশিল্পের প্রসার" : "Promotion of Handicrafts in Nadia District",
        content: isBn
          ? "আমাদের অঞ্চলের ঐতিহ্যবাহী তাঁতশিল্পী এবং মাটির পুতুল শিল্পীদের উন্নয়নে বিশেষ অর্থ বরাট অনুমোদন হয়েছে। এর মাধ্যমে উন্নয়নমুখী কারিগরদের ডিজিটাল বিপণন সংক্রান্ত সহায়তা দেওয়া হবে।"
          : "Special funding has been approved for the development of traditional handloom and clay doll artists in our region. This will help provide digital marketing support directly to local artisans.",
        source: isBn ? "কুটির শিল্প ডেস্ক" : "Cottage Industry Desk",
        date: date
      }
    ],
    fbTrends: [
      {
        title: isBn ? `১ম স্থান (নদীয়া): #NadiaCuisine` : `Top 1 (WB): #NadiaCuisine`,
        content: isBn 
          ? "ভাইরাল কৌশল: স্থানীয় মিষ্টি ছবি পোস্ট করুন। হুক আইডিয়া: 'শান্তিপুরের এই সুস্বাদু সন্দেশ কখনো খেয়েছেন?' তৈরির টিপস: উজ্জ্বল আলো ব্যবহার করুন। ভাইরাল সিক্রেট: রেসিপি ট্র্যাকার হ্যাশট্যাগ ব্যবহার করুন। এনগেজমেন্ট বুস্টার: মন্তব্য করতে উৎসাহিত করুন। মনিটাইজেশন টিপ: স্থানীয় সুইট স্টল স্পনসরশিপ নিন। হ্যাশট্যাগ: #মিষ্টি #খাবার"
          : "Viral Strategy: Focus on famous sweets of Nadia. Hook Idea: 'Ever tried the softest Sandesh in Nadia?' Creation Tips: Close-up slow-motion videos. Viral Secret: Tag culinary accounts. Engagement Booster: Ask followers to comment on their favorite sweet. Monetization Tip: Partner with local sweet shops. Hashtags: #SweetNadia #BengaliFood",
        source: "Digital Trends West Bengal",
        date: date
      }
    ],
    igTrends: [
      {
        title: isBn ? `১ম স্থান (নদীয়া): ঐতিহ্যবাহী ব্লক প্রিন্ট রিলস` : `Top 1 (WB): Heritage Block Print Reels`,
        content: isBn 
          ? "ভাইরাল কৌশল: নদীয়ার ঐতিহ্যবাহী তাঁতে শাড়ির ব্লক প্রিন্টিং প্রদর্শন। হুক আইডিয়া: 'কিভাবে ৫ সেকেন্ডে পারফেক্ট ব্লক প্রিন্ট তৈরি হয়?' তৈরির টিপস: প্রসেসিং ফাস্ট রাখুন। ভাইরাল সিক্রেট: লোকসংগীতের আধুনিক ট্র্যাক ব্যবহার করুন। এনগেজমেন্ট বুস্টার: সবাইকে কমেন্ট করতে বলুন। মনিটাইজেশন টিপ: বুটিক কালেকশন কোলাব করুন। হ্যাশট্যাগ: #তাঁত #ফ্যাশন"
          : "Viral Strategy: Showcasing traditional handloom weaving from Nadia. Hook Idea: 'How a perfect hand block print is made in 5 seconds?' Creation Tips: Keep video transitions matching fast beats. Viral Secret: Use popular regional folk fusion audio. Engagement Booster: Encourage users to tag fashion enthusiasts. Monetization Tip: Partner with boutiques. Hashtags: #NadiaHandloom #BengalPrints",
        source: "Instagram Insights Bengal",
        date: date
      }
    ],
    isMock: true,
    isFallback: true,
    date: date,
    updatedAt: new Date().toISOString()
  };
}

async function generateNewsInternal(date: string, language: 'bn' | 'en', newsLocks: Map<string, number>): Promise<any> {
  const docId = `${date}-${language}`;
  const now = Date.now();
  
  // Set lock to prevent concurrent triggers
  newsLocks.set(docId, now);

  try {
    const apiKey = await getGeminiApiKey();
    const prompt = getNewsPrompt(date, language);

    console.log(`[NewsAPI] On-demand generation starting for ${docId}`);
    const response = await callGeminiWithRetry(apiKey, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { 
        temperature: 0.7,
        responseMimeType: "application/json" 
      }
    });

    const newsData = parseGeminiJson(response.text || '{}');
    newsData.updatedAt = new Date().toISOString();
    newsData.date = date;
    newsData.serverKey = FIRESTORE_SERVER_KEY;
    newsData.isMock = false;

    // Validate structure
    if (!newsData.local || !Array.isArray(newsData.local)) newsData.local = [];
    if (!newsData.fbTrends || !Array.isArray(newsData.fbTrends)) newsData.fbTrends = [];
    if (!newsData.igTrends || !Array.isArray(newsData.igTrends)) newsData.igTrends = [];

    let saved = false;
    if (DB.state.adminDb) {
      try {
        await DB.state.adminDb.collection("news").doc(docId).set(newsData);
        saved = true;
        console.log(`[NewsAPI] Generated news saved via Admin SDK for ${docId}`);
      } catch (e: any) {
        console.error(`[NewsAPI] Admin SDK save CRITICAL FAILURE for ${docId}:`, e);
        DB.handleAdminError(e, `NewsAPI generate save ${docId}`);
      }
    }
    
    if (!saved && DB.state.db) {
      try {
        await setDoc(doc(DB.state.db, "news", docId), newsData);
        saved = true;
        console.log(`[NewsAPI] Generated news saved via Client SDK for ${docId}`);
      } catch (e: any) {
        console.error(`[NewsAPI] Client SDK save CRITICAL FAILURE for ${docId}:`, e);
      }
    }

    return newsData;
  } catch (error: any) {
    console.error(`[NewsAPI] Generation failed for ${docId}, fallback to local mock news. Error:`, error.message);
    const mockData = getEmergencyMockNews(date, language);
    
    // Save mock news so we don't spam Gemini API again for this date
    let saved = false;
    if (DB.state.adminDb) {
      try {
        await DB.state.adminDb.collection("news").doc(docId).set(mockData);
        saved = true;
      } catch (e) {}
    }
    if (!saved && DB.state.db) {
      try {
        await setDoc(doc(DB.state.db, "news", docId), mockData);
      } catch (e) {}
    }
    return mockData;
  } finally {
    newsLocks.delete(docId);
  }
}

export function setupNewsRoutes(app: express.Application, _db: any, _adminDb: any, newsLocks: Map<string, number>, getCurrentNewsDate: () => string) {
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

    // Check if locks are already active on this news key
    const lockTime = newsLocks.get(docId);
    if (lockTime && (now - lockTime < 120000) && !force) {
      return res.status(202).json({ status: "generating" });
    }

    try {
      let data: any = null;
      if (!force && DB.state.adminDb) {
        try {
          const snap = await DB.state.adminDb.collection("news").doc(docId).get();
          if (snap.exists) data = snap.data();
        } catch (adminErr: any) {
          console.warn(`[NewsAPI] Admin SDK fetch failed (doc: ${docId}):`, adminErr.message);
          DB.handleAdminError(adminErr, `NewsAPI GET doc ${docId}`);
        }
      }

      if (!data && !force && DB.state.db) {
        try {
          const snap = await getDocFromServer(doc(DB.state.db, "news", docId));
          if (snap.exists()) data = snap.data();
        } catch (clientErr: any) {
          console.warn(`[NewsAPI] Client SDK fetch failed (doc: ${docId}):`, clientErr.message);
        }
      }
      
      // If we found the cached data, return it immediately
      if (data) {
        return res.json(data);
      }

      // If we didn't find the news and we are not in passive mode, initiate server-side generation on-the-fly!
      console.log(`[NewsAPI] Cache miss for ${docId}. Performing on-demand generation...`);
      const generatedNews = await generateNewsInternal(date as string, language, newsLocks);
      return res.json(generatedNews);

    } catch (e) {
      console.error("[NewsAPI] GET Error:", e);
      res.status(500).json({ error: "Internal error during news lookup/generation" });
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

    try {
      const newsData = await generateNewsInternal(date, lang as 'bn' | 'en', newsLocks);
      res.json(newsData);
    } catch (error: any) {
      console.error("[NewsAPI] POST Generate Error:", error);
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
      if (DB.state.adminDb) {
        try {
          await DB.state.adminDb.collection("news").doc(docId).set(dataToSave);
          saved = true;
        } catch (e: any) {
          console.error(`[NewsAPI] Admin SDK cache save CRITICAL FAILURE:`, e);
          DB.handleAdminError(e, `NewsAPI cache save ${docId}`);
        }
      }
      
      if (!saved && DB.state.db) {
        try {
          await setDoc(doc(DB.state.db, "news", docId), dataToSave);
          saved = true;
        } catch (e: any) {
          console.error(`[NewsAPI] Client SDK cache save CRITICAL FAILURE:`, e);
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
