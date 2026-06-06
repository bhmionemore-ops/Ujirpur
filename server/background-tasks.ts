import { collection, query, where, limit, getDocs, setDoc, doc, serverTimestamp, writeBatch, getDoc } from "firebase/firestore";
import admin from "firebase-admin";
import { state, handleAdminError } from "./db";
import { FIRESTORE_SERVER_KEY } from "./constants";
import { getGeminiApiKey, callGeminiWithRetry } from "./gemini";
import { parseGeminiJson, slugify, getNewsPrompt } from "./utils";
import { getCurrentFactDate, getCurrentNewsDate } from "./date-utils";

export async function cleanupOldNews() {
  try {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const dateStr = fifteenDaysAgo.toISOString().split('T')[0];

    const currentAdminDb = state.adminDb;
    const currentDb = state.db;

    let hasRun = false;

    if (currentAdminDb) {
      try {
        const oldNews = await currentAdminDb.collection("news").where("date", "<", dateStr).get();
        if (!oldNews.empty) {
          const batch = currentAdminDb.batch();
          oldNews.docs.forEach((doc: any) => batch.delete(doc.ref));
          await batch.commit();
          console.log(`[Cleanup] Deleted ${oldNews.size} old news documents via Admin SDK`);
        }
        hasRun = true;
      } catch (adminErr: any) {
        console.warn(`[Cleanup] Admin SDK operation failed:`, adminErr.message);
        handleAdminError(adminErr, "cleanupOldNews admin block");
      }
    }

    if (!hasRun && currentDb) {
      const q = query(collection(currentDb, "news"), where("date", "<", dateStr));
      const oldNews = await getDocs(q);
      if (!oldNews.empty) {
        const batch = writeBatch(currentDb);
        oldNews.docs.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
        console.log(`[Cleanup] Deleted ${oldNews.size} old news documents via Client SDK`);
      }
    }
  } catch (error) {
    console.error("[Cleanup] Outer Error:", error);
  }
}

export async function generateDailySanataniFacts() {
  try {
    const today = getCurrentFactDate();
    const currentFirebaseConfig = state.firebaseConfig;
    const apiKey = await getGeminiApiKey(currentFirebaseConfig);
    if (!apiKey) return;
    
    let alreadyExists = false;
    let checkSuccess = false;
    const currentAdminDb = state.adminDb;
    const currentDb = state.db;

    if (currentAdminDb) {
      try {
        const existing = await currentAdminDb.collection("fact_checks").where("date", "==", today).limit(1).get();
        alreadyExists = !existing.empty;
        checkSuccess = true;
      } catch (adminErr: any) {
        console.warn(`[SanataniFacts] Admin SDK check failed:`, adminErr.message);
        handleAdminError(adminErr, "generateDailySanataniFacts admin check");
      }
    }

    if (!checkSuccess && currentDb) {
      const q = query(collection(currentDb, "fact_checks"), where("date", "==", today), limit(1));
      const existing = await getDocs(q);
      alreadyExists = !existing.empty;
    }
    
    if (alreadyExists) return;

    const prompt = `Act as the Sanatani Truth Bot, an AI guardian of Sanatana Dharma. Find 5 current rumors or myths about Sanatana Dharma. Perform rigorous fact-check. 
    Respond in a JSON array format where each object MUST look exactly like this:
    {
      "claim": "The exact viral claim or myth being checked",
      "status": "verified" | "false" | "misleading",
      "explanation": "Detailed explanation based on scriptures and facts",
      "source": "Authentic scripture, historical record, or statements by Swami Avimukteshwaranand",
      "guidance": "Final spiritual or practical guidance for a Sanatani"
    }`;

    const response = await callGeminiWithRetry(apiKey, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const rawFacts = parseGeminiJson(response.text || '[]');
    // Normalize facts to ensure we satisfy validation rules perfectly
    const facts = rawFacts.map((fact: any) => {
      const claim = fact.claim || fact.rumor || fact.myth || "";
      const rawStatus = fact.status || fact.verdict || "verified";
      const status = ["verified", "false", "misleading"].includes(rawStatus) ? rawStatus : "verified";
      const explanation = fact.explanation || fact.details || fact.description || "Verified by Sanatani Truth Bot.";
      const source = fact.source || "Dharmic Scriptures";
      const guidance = fact.guidance || "Adhere to the teachings of scriptures.";
      return { claim, status, explanation, source, guidance };
    }).filter((f: any) => f.claim && f.claim.length > 0);

    let saved = false;
    
    if (currentAdminDb) {
      try {
        const batch = currentAdminDb.batch();
        facts.forEach((fact: any) => {
          const id = slugify(fact.claim).substring(0, 50) + '-' + Math.random().toString(36).substring(2, 7);
          const docRef = currentAdminDb.collection("fact_checks").doc(id);
          batch.set(docRef, { 
            ...fact, 
            date: today, 
            serverKey: FIRESTORE_SERVER_KEY, 
            createdAt: admin.firestore.FieldValue.serverTimestamp() 
          });
        });
        await batch.commit();
        console.log(`[SanataniFacts] Generated ${facts.length} facts for ${today}`);
        saved = true;
      } catch (adminErr: any) {
        console.warn(`[SanataniFacts] Admin SDK save failed:`, adminErr.message);
        handleAdminError(adminErr, "generateDailySanataniFacts admin save");
      }
    }

    if (!saved && currentDb) {
      const batch = writeBatch(currentDb);
      facts.forEach((fact: any) => {
        const id = slugify(fact.claim).substring(0, 50) + '-' + Math.random().toString(36).substring(2, 7);
        const docRef = doc(currentDb, "fact_checks", id);
        batch.set(docRef, { 
          ...fact, 
          date: today, 
          serverKey: FIRESTORE_SERVER_KEY, 
          createdAt: serverTimestamp() 
        });
      });
      await batch.commit();
      console.log(`[SanataniFacts] Generated ${facts.length} facts for ${today} (Client SDK fallback)`);
    }
  } catch (error: any) {
    console.error("[SanataniFacts] Generation Outer Error:", error);
  }
}

export async function autoGenerateDailyNews() {
  try {
    const date = getCurrentNewsDate();
    const currentFirebaseConfig = state.firebaseConfig;
    const apiKey = await getGeminiApiKey(currentFirebaseConfig);
    if (!apiKey) return;

    const currentAdminDb = state.adminDb;
    const currentDb = state.db;

    for (const lang of ['bn', 'en']) {
      const docId = `${date}-${lang}`;
      let exists = false;
      let checkSuccess = false;

      if (currentAdminDb) {
        try {
          const snap = await currentAdminDb.collection("news").doc(docId).get();
          exists = snap.exists;
          checkSuccess = true;
        } catch (adminErr: any) {
          console.warn(`[DailyNews] Admin SDK check failed for ${docId}:`, adminErr.message);
          handleAdminError(adminErr, "autoGenerateDailyNews admin check");
        }
      }

      if (!checkSuccess && currentDb) {
        const docRef = doc(currentDb, "news", docId);
        const snap = await getDoc(docRef);
        exists = snap.exists();
      }
      if (exists) continue;

      const prompt = getNewsPrompt(date, lang as 'bn' | 'en');
      const response = await callGeminiWithRetry(apiKey, { 
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { 
          temperature: 0.7,
          responseMimeType: "application/json" 
        }
      });

      const newsData = parseGeminiJson(response.text || '{}');
      if (!newsData.local) newsData.local = [];
      if (!newsData.fbTrends) newsData.fbTrends = [];
      if (!newsData.igTrends) newsData.igTrends = [];
      let saved = false;

      if (currentAdminDb) {
        try {
          await currentAdminDb.collection("news").doc(docId).set({ ...newsData, date, updatedAt: new Date().toISOString(), serverKey: FIRESTORE_SERVER_KEY });
          console.log(`[DailyNews] Auto-generated news for ${docId}`);
          saved = true;
        } catch (adminErr: any) {
          console.warn(`[DailyNews] Admin SDK save failed for ${docId}:`, adminErr.message);
          handleAdminError(adminErr, "autoGenerateDailyNews admin save");
        }
      }

      if (!saved && currentDb) {
        const docRef = doc(currentDb, "news", docId);
        await setDoc(docRef, { ...newsData, date, updatedAt: new Date().toISOString(), serverKey: FIRESTORE_SERVER_KEY });
        console.log(`[DailyNews] Auto-generated news for ${docId} (Client SDK fallback)`);
      }
    }
  } catch (error: any) {
    console.error("[DailyNews] Auto-generation Outer Error:", error);
  }
}
