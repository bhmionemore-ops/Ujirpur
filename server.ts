// Server entry point
import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import nodemailer from "nodemailer";
import { simpleParser } from "mailparser";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import fetch from "node-fetch";
import admin from "firebase-admin";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { initializeApp as initializeClientApp } from "firebase/app";
import { 
  getAuth
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
  limit,
  deleteDoc,
  addDoc,
  Firestore,
  initializeFirestore,
  getDocFromServer
} from "firebase/firestore";

dotenv.config();

let db: Firestore | null = null;
let adminDb: any = null;
let clientAuth: any = null;
let firebaseConfig: any = null;



async function getShopItem(idOrSlug: string, projectId: string, databaseId: string) {
  console.log(`[MetaTags] Fetching shop for ID/Slug: ${idOrSlug}`);
  try {
    let data: any = null;
    
    // Try Admin SDK first (bypasses rules)
    if (adminDb) {
      try {
        // Try fetching by slug first
        const shopsBySlug = await adminDb.collection("shops").where("slug", "==", idOrSlug).limit(1).get();
        if (!shopsBySlug.empty) {
          data = shopsBySlug.docs[0].data();
        } else {
          // Fallback to ID
          const shopById = await adminDb.collection("shops").doc(idOrSlug).get();
          if (shopById.exists) {
            data = shopById.data();
          }
        }
      } catch (adminError) {
        console.warn(`[MetaTags] Admin SDK failed to fetch shop ${idOrSlug}, falling back to client SDK:`, adminError);
      }
    }

    // Fallback to Client SDK if Admin SDK failed or was not available
    if (!data && db) {
      try {
        const q = query(collection(db, "shops"), where("slug", "==", idOrSlug), limit(1));
        const shopsBySlug = await getDocs(q);
        if (!shopsBySlug.empty) {
          data = shopsBySlug.docs[0].data();
        } else {
          const shopById = await getDocFromServer(doc(db, "shops", idOrSlug));
          if (shopById.exists()) {
            data = shopById.data();
          }
        }
      } catch (clientError) {
        console.error(`[MetaTags] Client SDK also failed to fetch shop ${idOrSlug}:`, clientError);
      }
    }

    // Fallback to REST API if both SDKs failed
    if (!data) {
      try {
        console.log(`[MetaTags] Falling back to REST API for shop ${idOrSlug}`);
        const dbId = databaseId || '(default)';
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/shops/${idOrSlug}`;
        const response = await fetch(url);
        if (response.ok) {
          const json: any = await response.json();
          const fields = json.fields;
          if (fields) {
            data = {};
            for (const key in fields) {
              if (fields[key].stringValue) data[key] = fields[key].stringValue;
              else if (fields[key].integerValue) data[key] = fields[key].integerValue;
              else if (fields[key].booleanValue) data[key] = fields[key].booleanValue;
              else if (fields[key].arrayValue) {
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
        } else {
          // If ID fetch failed, try slug query via REST
          const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents:runQuery`;
          const queryBody = {
            structuredQuery: {
              from: [{ collectionId: "shops" }],
              where: {
                fieldFilter: {
                  field: { fieldPath: "slug" },
                  op: "EQUAL",
                  value: { stringValue: idOrSlug }
                }
              },
              limit: 1
            }
          };
          const queryResponse = await fetch(queryUrl, {
            method: 'POST',
            body: JSON.stringify(queryBody)
          });
          if (queryResponse.ok) {
            const queryJson: any = await queryResponse.json();
            if (queryJson[0] && queryJson[0].document) {
              const fields = queryJson[0].document.fields;
              if (fields) {
                data = {};
                for (const key in fields) {
                  if (fields[key].stringValue) data[key] = fields[key].stringValue;
                  else if (fields[key].integerValue) data[key] = fields[key].integerValue;
                  else if (fields[key].booleanValue) data[key] = fields[key].booleanValue;
                  else if (fields[key].arrayValue) {
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
        }
      } catch (restError) {
        console.error(`[MetaTags] REST API also failed for shop ${idOrSlug}:`, restError);
      }
    }

    if (!data) return null;

    return {
      name: data.name || "Barnia Shop",
      category: data.category || "General",
      location: data.location || "Barnia Bazar",
      image: data.image || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?fm=jpg&fit=crop&q=80&w=1200",
      phone: data.phone || "",
      products: data.products || []
    };
  } catch (error) {
    console.error(`[MetaTags] Error fetching shop for ${idOrSlug}:`, error);
    return null;
  }
}

async function getProfileItem(idOrSlug: string, projectId: string, databaseId: string) {
  console.log(`[MetaTags] Fetching profile for ID/Slug: ${idOrSlug}`);
  try {
    let data: any = null;
    
    // Try Admin SDK first (bypasses rules)
    if (adminDb) {
      try {
        // Try fetching by slug first
        const influencersBySlug = await adminDb.collection("influencers").where("slug", "==", idOrSlug).limit(1).get();
        if (!influencersBySlug.empty) {
          data = influencersBySlug.docs[0].data();
        } else {
          // Fallback to ID
          const influencerById = await adminDb.collection("influencers").doc(idOrSlug).get();
          if (influencerById.exists) {
            data = influencerById.data();
          }
        }
      } catch (adminError) {
        console.warn(`[MetaTags] Admin SDK failed to fetch profile ${idOrSlug}, falling back to client SDK:`, adminError);
      }
    }

    // Fallback to Client SDK if Admin SDK failed or was not available
    if (!data && db) {
      try {
        const q = query(collection(db, "influencers"), where("slug", "==", idOrSlug), limit(1));
        const influencersBySlug = await getDocs(q);
        if (!influencersBySlug.empty) {
          data = influencersBySlug.docs[0].data();
        } else {
          const influencerById = await getDocFromServer(doc(db, "influencers", idOrSlug));
          if (influencerById.exists()) {
            data = influencerById.data();
          }
        }
      } catch (clientError) {
        console.error(`[MetaTags] Client SDK also failed to fetch profile ${idOrSlug}:`, clientError);
      }
    }

    // Fallback to REST API if both SDKs failed
    if (!data) {
      try {
        console.log(`[MetaTags] Falling back to REST API for profile ${idOrSlug}`);
        const dbId = databaseId || '(default)';
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/influencers/${idOrSlug}`;
        const response = await fetch(url);
        if (response.ok) {
          const json: any = await response.json();
          const fields = json.fields;
          if (fields) {
            data = {};
            for (const key in fields) {
              if (fields[key].stringValue) data[key] = fields[key].stringValue;
              else if (fields[key].integerValue) data[key] = fields[key].integerValue;
              else if (fields[key].booleanValue) data[key] = fields[key].booleanValue;
              else if (fields[key].arrayValue) {
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
        } else {
          // If ID fetch failed, try slug query via REST
          const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents:runQuery`;
          const queryBody = {
            structuredQuery: {
              from: [{ collectionId: "influencers" }],
              where: {
                fieldFilter: {
                  field: { fieldPath: "slug" },
                  op: "EQUAL",
                  value: { stringValue: idOrSlug }
                }
              },
              limit: 1
            }
          };
          const queryResponse = await fetch(queryUrl, {
            method: 'POST',
            body: JSON.stringify(queryBody)
          });
          if (queryResponse.ok) {
            const queryJson: any = await queryResponse.json();
            if (queryJson[0] && queryJson[0].document) {
              const fields = queryJson[0].document.fields;
              if (fields) {
                data = {};
                for (const key in fields) {
                  if (fields[key].stringValue) data[key] = fields[key].stringValue;
                  else if (fields[key].integerValue) data[key] = fields[key].integerValue;
                  else if (fields[key].booleanValue) data[key] = fields[key].booleanValue;
                  else if (fields[key].arrayValue) {
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
        }
      } catch (restError) {
        console.error(`[MetaTags] REST API also failed for profile ${idOrSlug}:`, restError);
      }
    }

    if (!data) {
      console.warn(`[MetaTags] No profile data found for ID/Slug: ${idOrSlug}`);
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
      socialIconsStr: socialIconsStr || '',
      socials: data.socials || []
    };
  } catch (error) {
    console.error(`[MetaTags] Error fetching profile for ${idOrSlug}:`, error);
    return null;
  }
}

async function getNewsItem(date: string, tab: string, index: string, projectId: string, databaseId: string) {
  try {
    let data: any = null;
    
    // 1. Try Admin SDK (preferred on server)
    if (adminDb) {
      try {
        const docSnap = await adminDb.collection("news").doc(date).get();
        if (docSnap.exists) {
          data = docSnap.data();
          console.log(`[MetaTags] News found via Admin SDK for date: ${date}`);
        }
      } catch (e) {
        console.warn(`[MetaTags] Admin SDK news fetch failed for date ${date}:`, e);
      }
    }

    // 2. Try Client SDK (fallback)
    if (!data && db) {
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
      image: item.image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?fm=jpg&fit=crop&q=80&w=1200"
    };
  } catch (error) {
    console.error("Error fetching news for meta tags:", error);
    return null;
  }
}

function getCurrentNewsDate() {
  const now = new Date();
  // Use Intl to get IST parts accurately
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const dateParts: { [key: string]: string } = {};
  parts.forEach(p => dateParts[p.type] = p.value);
  
  let year = parseInt(dateParts.year);
  let month = parseInt(dateParts.month);
  let day = parseInt(dateParts.day);
  let hour = parseInt(dateParts.hour);
  
  // If before 6 AM IST, we are still in the previous "news day"
  if (hour < 6) {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - 1);
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }
  
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Priority list of environment variables to check for the Gemini API key
async function getGeminiApiKey(): Promise<string> {
  // Priority list of environment variables to check for the Gemini API key
  const keyNames = [
    'GOOGLE_API_KEY', // Prioritize this as it's a common override name
    'GEMINI_API_KEY',
    'NEXT_PUBLIC_GEMINI_API_KEY',
    'API_KEY',
    'VITE_GEMINI_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY'
  ];

  let apiKey: string | undefined;

  // 1. Try the known keys in order
  // We prioritize GEMINI_API_KEY as it's the standard for AI Studio
  for (const name of keyNames) {
    const val = process.env[name];
    // Check for valid key: not empty, not placeholder, not the string "undefined", not the string "null"
    if (val && 
        val !== "MY_GEMINI_API_KEY" && 
        val !== "" && 
        val !== "undefined" && 
        val !== "null" &&
        val !== "AI Studio Free Tier"
    ) {
      apiKey = val;
      console.log(`[NewsAPI] Selected API key from: ${name} (Length: ${val.length})`);
      
      // If this key matches the Firebase key, we should warn that it might be restricted
      if (firebaseConfig?.apiKey === val) {
        console.warn(`[NewsAPI] WARNING: The selected key from ${name} matches the Firebase Browser Key. This key is often RESTRICTED by default in Google Cloud Console, which causes 'API_KEY_SERVICE_BLOCKED' errors.`);
      }
      break;
    }
  }

  // 2. Search for ANY key that starts with 'AIza' (standard prefix for Google API keys)
  if (!apiKey) {
    const aizaKeyName = Object.keys(process.env).find(k => {
      const val = process.env[k];
      return val && typeof val === 'string' && val.startsWith('AIza') && val.length > 10;
    });
    if (aizaKeyName) {
      apiKey = process.env[aizaKeyName];
      console.log(`[NewsAPI] Found valid Google API key in environment variable: ${aizaKeyName}`);
    }
  }

  // 3. Final fallback: Search for ANY key containing GEMINI or AI_KEY that isn't a placeholder
  if (!apiKey) {
    const potentialKeys = Object.keys(process.env).filter(k => 
      (k.includes('GEMINI') || k.includes('AI_KEY') || k.includes('GOOGLE_API')) && 
      process.env[k] && 
      process.env[k] !== "MY_GEMINI_API_KEY" &&
      process.env[k] !== "undefined" &&
      process.env[k] !== "null" &&
      process.env[k] !== "" &&
      process.env[k] !== "AI Studio Free Tier"
    );
    if (potentialKeys.length > 0) {
      apiKey = process.env[potentialKeys[0]];
      const prefix = apiKey ? apiKey.substring(0, 4) : "null";
      console.log(`[NewsAPI] Found potential key in: ${potentialKeys[0]} (Prefix: ${prefix}..., Length: ${apiKey?.length})`);
    }
  }

  // 3. Last resort: Try the Firebase API key from config
  if (!apiKey) {
    try {
      const configPath = path.resolve("firebase-applet-config.json");
      const configData = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(configData);
      if (config.apiKey && !config.apiKey.includes("TODO") && config.apiKey.length > 10) {
        apiKey = config.apiKey;
        const prefix = apiKey.substring(0, 4);
        console.log(`[NewsAPI] Using Firebase API key as last resort fallback. (Prefix: ${prefix}..., Length: ${apiKey.length})`);
      }
    } catch (e: any) {
      console.warn(`[NewsAPI] Firebase config fallback failed: ${e.message}`);
    }
  }
  
  // Comprehensive logging for debugging
  const allEnvKeys = Object.keys(process.env);
  const keyRelatedEnv = allEnvKeys.filter(k => k.includes('KEY') || k.includes('API') || k.includes('GEMINI') || k.includes('TOKEN'));
  console.log(`[NewsAPI] Environment check - Key-related variables found: ${keyRelatedEnv.join(', ')}`);
  
  // Log if any of them start with AIza
  const aizaKeys = allEnvKeys.filter(k => process.env[k]?.startsWith('AIza'));
  if (aizaKeys.length > 0) {
    console.log(`[NewsAPI] Environment check - AIza keys found in: ${aizaKeys.join(', ')}`);
    aizaKeys.forEach(k => {
      const val = process.env[k];
      if (val) {
        console.log(`- ${k}: prefix=${val.substring(0, 8)}...`);
      }
    });
  }
  
  // Check if any of them match the Firebase key
  const firebaseKey = firebaseConfig?.apiKey;
  if (firebaseKey) {
    const matchingEnv = allEnvKeys.find(k => process.env[k] === firebaseKey);
    if (matchingEnv) {
      console.log(`[NewsAPI] Environment check - Firebase key matches environment variable: ${matchingEnv}`);
    } else {
      console.log(`[NewsAPI] Environment check - Firebase key NOT found in environment variables.`);
    }
  }
  
  console.log("[NewsAPI] Environment check:");
  console.log(`- Total Env Keys: ${allEnvKeys.length}`);
  keyRelatedEnv.forEach(k => {
    const val = process.env[k];
    const isPlaceholder = val === "MY_GEMINI_API_KEY";
    const isLabel = val === "AI Studio Free Tier";
    const isEmpty = val === "";
    const isStringUndefined = val === "undefined";
    const isStringNull = val === "null";
    const startsWithAIza = typeof val === 'string' && val.startsWith('AIza');
    const prefix = val && typeof val === 'string' ? val.substring(0, 4) : 'N/A';
    console.log(`- ${k}: present=${!!val}, len=${val?.length || 0}, aiza=${startsWithAIza}, placeholder=${isPlaceholder}, label=${isLabel}, empty=${isEmpty}, str_undef=${isStringUndefined}, str_null=${isStringNull}, prefix=${prefix}`);
  });
  
  console.log(`- Final API Key selected: ${apiKey ? apiKey.substring(0, 4) + "..." : "None"}`);
  
  if (!apiKey) {
    const errorMsg = `Gemini API key is missing. Please ensure you have clicked 'Save' in the Secrets menu after selecting 'AI Studio Free Tier' or adding GOOGLE_API_KEY.`;
    console.error(`[NewsAPI] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  return apiKey;
}

async function cleanupOldNews() {
  try {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const dateStr = fifteenDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`[NewsAPI] Cleaning up news older than: ${dateStr}`);

    if (adminDb) {
      try {
        const oldNews = await adminDb.collection("news").where("date", "<", dateStr).get();
        if (!oldNews.empty) {
          const batch = adminDb.batch();
          oldNews.docs.forEach((doc: any) => batch.delete(doc.ref));
          await batch.commit();
          console.log(`[NewsAPI] [Admin] Cleaned up ${oldNews.size} old news documents.`);
        }
      } catch (adminError: any) {
        console.warn(`[NewsAPI] Admin cleanup failed, falling back to client SDK: ${adminError.message}`);
        // Fallback to client SDK logic below
        const q = query(collection(db, "news"), where("date", "<", dateStr));
        const oldNews = await getDocs(q);
        if (!oldNews.empty) {
          const batch = writeBatch(db);
          oldNews.docs.forEach((docSnap) => batch.delete(docSnap.ref));
          await batch.commit();
          console.log(`[NewsAPI] [Client] Cleaned up ${oldNews.size} old news documents.`);
        }
      }
    } else if (db) {
      const q = query(collection(db, "news"), where("date", "<", dateStr));
      const oldNews = await getDocs(q);
      if (!oldNews.empty) {
        const batch = writeBatch(db);
        oldNews.docs.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
        console.log(`[NewsAPI] [Client] Cleaned up ${oldNews.size} old news documents.`);
      }
    }
  } catch (error) {
    console.error("[NewsAPI] Error during news cleanup:", error);
  }
}

/**
 * Mock news data as a last resort fallback
 */

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function injectMetaTags(html: string, metadata: { title: string, description: string, image: string, url: string, type?: string, imageWidth?: number, imageHeight?: number, keywords?: string }) {
  const escapedTitle = escapeHtml(metadata.title);
  const escapedDescription = escapeHtml(metadata.description);
  const escapedImage = escapeHtml(metadata.image);
  const escapedUrl = escapeHtml(metadata.url);
  const escapedKeywords = metadata.keywords ? escapeHtml(metadata.keywords) : "barnia, ujirpur, barnia bazar, nadia, thatta, west bengal, influencer, market prices, bengali ponjika, community hub, digital barnia";
  const type = metadata.type || 'website';
  const updatedTime = new Date().toISOString();
  const imageWidth = metadata.imageWidth || 1200;
  const imageHeight = metadata.imageHeight || 630;

  const metaTags = `
    <!-- Meta Injected -->
    <title>${escapedTitle}</title>
    <meta name="description" content="${escapedDescription}" />
    <meta name="keywords" content="${escapedKeywords}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="googlebot" content="index, follow" />
    <meta name="facebook-domain-verification" content="qqo7i4cm5uqezzfiga7mn2vdqm8iy3" />
    <meta property="fb:app_id" content="2201629183577400" />
    <meta property="og:site_name" content="Barnia Digital Hub" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:url" content="${escapedUrl}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:image" content="${escapedImage}" />
    <meta property="og:image:secure_url" content="${escapedImage}" />
    <meta property="og:image:width" content="${imageWidth}" />
    <meta property="og:image:height" content="${imageHeight}" />
    <meta property="og:image:alt" content="${escapedTitle}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:locale:alternate" content="bn_BD" />
    <meta property="og:updated_time" content="${updatedTime}" />
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
    'twitter:url',
    'facebook-domain-verification'
  ];
  
  tagsToRemove.forEach(tag => {
    // More robust regex to match meta tags regardless of attribute order
    const regex = new RegExp(`<meta\\s+[^>]*?(name|property)=["']${tag}["'][^>]*?\\/?>`, 'gi');
    modifiedHtml = modifiedHtml.replace(regex, "");
  });

  // Remove keywords tag as well
  modifiedHtml = modifiedHtml.replace(/<meta name=["']keywords["'].*?\/?>/gi, "");

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

  // Email Transporter
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  
  console.log(`[Server] Initializing email transporter...`);
  console.log(`[Server] EMAIL_USER: ${emailUser || 'NOT_SET'}`);
  
  if (emailPass) {
    const passLen = emailPass.length;
    const firstChar = emailPass.charAt(0);
    const lastChar = emailPass.charAt(passLen - 1);
    console.log(`[Server] EMAIL_PASS is set (Length: ${passLen}, Starts with: ${firstChar}, Ends with: ${lastChar})`);
    
    if (emailPass.includes(' ')) {
      console.warn(`[Server] WARNING: EMAIL_PASS contains spaces. This will cause login failures.`);
    }
    if (passLen !== 16) {
      console.warn(`[Server] WARNING: Gmail App Passwords should be exactly 16 characters. Yours is ${passLen}.`);
    }
  } else {
    console.warn(`[Server] EMAIL_PASS is not set. Emails will fail to send.`);
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    debug: true, // show debug output
    logger: true // log information in console
  });

  const RECIPIENT = process.env.NOTIFICATION_EMAIL || "info@barnia.in";

  // Body parser middleware - MUST be before routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Trust proxy for correct protocol/host detection behind Render/AI Studio proxies
  app.set('trust proxy', true);

  // Trailing Slash & Domain Redirect Middleware
  app.use((req, res, next) => {
    const host = req.get('host');
    
    // 1. Domain Redirect (onrender.com -> barnia.in OR www -> non-www)
    if (host) {
      if (host.includes('barnia.onrender.com') || host.startsWith('www.')) {
        const cleanHost = host.replace('www.', '').replace('barnia.onrender.com', 'barnia.in');
        return res.redirect(301, `https://${cleanHost}${req.originalUrl}`);
      }
    }

    // 2. Trailing Slash Redirect (except root and API)
    // Redirect /path/ to /path
    if (req.path !== '/' && req.path.endsWith('/') && !req.path.startsWith('/api/')) {
      const query = req.url.slice(req.path.length);
      const safepath = req.path.slice(0, -1).replace(/\/+/g, '/');
      return res.redirect(301, safepath + query);
    }

    next();
  });

  // SEO Files - MUST be at the very top to avoid being caught by catch-all routes
  app.get("/robots.txt", (req, res) => {
    const protocol = 'https';
    const baseUrl = "https://barnia.in";
    
    const robots = [
      "User-agent: *",
      "Allow: /",
      "Allow: /api/image/",
      "Disallow: /api/",
      "Disallow: /admin/",
      `Sitemap: ${baseUrl}/sitemap.xml`,
      "Host: barnia.in"
    ].join("\n");
    
    res.status(200).set("Content-Type", "text/plain").send(robots);
  });

  app.get("/manifest.json", async (req, res) => {
    try {
      const data = await fs.readFile(path.resolve("manifest.json"), "utf-8");
      res.status(200).set("Content-Type", "application/json").send(data);
    } catch (e) {
      res.status(404).send("Not found");
    }
  });

  app.get("/sw.js", async (req, res) => {
    try {
      const data = await fs.readFile(path.resolve("sw.js"), "utf-8");
      res.status(200)
        .set("Content-Type", "application/javascript")
        .set("Cache-Control", "no-cache, no-store, must-revalidate")
        .send(data);
    } catch (e) {
      res.status(404).send("Not found");
    }
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = "https://barnia.in";
      
      let urls = [
        { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
        { loc: `${baseUrl}/bazar`, changefreq: 'daily', priority: '0.9' },
        { loc: `${baseUrl}/influencers`, changefreq: 'daily', priority: '0.9' },
        { loc: `${baseUrl}/ponjika`, changefreq: 'weekly', priority: '0.7' },
        { loc: `${baseUrl}/chat`, changefreq: 'always', priority: '0.5' },
      ];

      if (adminDb) {
        // Fetch shops
        try {
          const shopsSnap = await adminDb.collection("shops").get();
          shopsSnap.forEach((doc: any) => {
            const shop = doc.data();
            const slug = shop.slug || doc.id;
            urls.push({
              loc: `${baseUrl}/shop/${slug}`,
              changefreq: 'weekly',
              priority: '0.8'
            });
          });
        } catch (e) {
          console.error("[Sitemap] Failed to fetch shops:", e);
        }

        // Fetch influencers
        try {
          const influencersSnap = await adminDb.collection("influencers").get();
          influencersSnap.forEach((doc: any) => {
            const influencer = doc.data();
            const slug = influencer.slug || doc.id;
            urls.push({
              loc: `${baseUrl}/profile/${slug}`,
              changefreq: 'weekly',
              priority: '0.8'
            });
          });
        } catch (e) {
          console.error("[Sitemap] Failed to fetch influencers:", e);
        }

        // Fetch news dates for sitemap
        try {
          const newsSnap = await adminDb.collection("news").orderBy("__name__", "desc").limit(10).get();
          newsSnap.forEach((doc: any) => {
            const date = doc.id;
            const data = doc.data();
            // Add top news items from each tab
            ['top', 'local', 'sports'].forEach(tab => {
              if (data[tab] && data[tab].length > 0) {
                data[tab].forEach((_: any, index: number) => {
                  if (index < 3) { // Only first 3 news items per tab to avoid sitemap bloat
                    urls.push({
                      loc: `${baseUrl}/news/${date}/${tab}/${index}`,
                      changefreq: 'monthly',
                      priority: '0.6'
                    });
                  }
                });
              }
            });
          });
        } catch (e) {
          console.error("[Sitemap] Failed to fetch news:", e);
        }
      }

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  ${urls.map(url => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('')}
</urlset>`;

      res.status(200).set("Content-Type", "application/xml").send(sitemap);
    } catch (error) {
      console.error("[SEO] Error generating sitemap.xml:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  try {
    const configData = await fs.readFile(path.resolve("firebase-applet-config.json"), "utf-8");
    firebaseConfig = JSON.parse(configData);
    
    // Initialize Client SDK (for client-side compatible operations if needed)
    console.log(`[Firebase] Initializing Client SDK for project: ${firebaseConfig.projectId}`);
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
        console.log("[Firebase] Attempting Admin SDK initialization with Application Default Credentials...");
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: firebaseConfig.projectId
        });
        console.log("[Firebase] Admin SDK initialized with Application Default Credentials.");
      } catch (credError: any) {
        console.warn("[Firebase] Could not load default credentials, trying to initialize with project ID only:", credError.message);
        try {
          // Fallback: Initialize with just the project ID. 
          admin.initializeApp({
            projectId: firebaseConfig.projectId
          });
          console.log("[Firebase] Admin SDK initialized with project ID only.");
        } catch (initError: any) {
          console.error("[Firebase] Admin SDK failed to initialize even with project ID fallback:", initError.message);
        }
      }
    }
    
    try {
      adminDb = getAdminFirestore(admin.app(), firebaseConfig.firestoreDatabaseId || undefined);
      console.log(`Admin Firestore instance created for database: ${firebaseConfig.firestoreDatabaseId || '(default)'}`);
      
      // Test Admin SDK permissions with a more robust check
      try {
        // Try to write and then delete a test document to ensure full permissions
        const testRef = adminDb.collection("_health_check").doc("server_init_test");
        await testRef.set({ 
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: "testing"
        });
        await testRef.delete();
        console.log("Admin SDK permissions verified (Read/Write).");
      } catch (permError: any) {
        console.warn(`Admin SDK health check failed: ${permError.message} (Code: ${permError.code})`);
        if (permError.message && (permError.message.includes("PERMISSION_DENIED") || permError.code === 7)) {
          console.warn("Admin SDK lacks Firestore permissions. Disabling Admin SDK for Firestore operations.");
          adminDb = null;
        } else {
          console.warn("Admin SDK health check failed (non-permission error). Continuing with Admin SDK enabled.");
        }
      }
    } catch (dbError) {
      console.error("Failed to create Admin Firestore instance:", dbError);
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

  // Keep-alive endpoint for cron jobs
  app.get("/api/ping", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Inbound Email Webhook (for App Inbox)
  // This endpoint receives forwarded emails from services like Cloudflare Email Routing or ImprovMX
  app.post("/api/webhooks/email", async (req, res) => {
    try {
      console.log("[Webhook] Received inbound email POST request.");
      console.log("[Webhook] Headers:", req.headers);
      console.log("[Webhook] Body Type:", typeof req.body);
      console.log("[Webhook] Body Keys:", Object.keys(req.body || {}));
      
      if (!req.body || Object.keys(req.body).length === 0) {
        console.warn("[Webhook] Received empty body. Body parser might not be working or request is empty.");
      }

      // Basic structure for common email forwarding services
      const { from, to, subject, body, html, text } = req.body;
      
      let cleanFrom = from || req.body.sender || "unknown@example.com";
      let cleanTo = to || req.body.recipient || "info@barnia.in";
      let cleanSubject = subject || "No Subject";
      let cleanBody = body || text || "No content";
      let cleanHtml = html || "";

      // If it looks like raw MIME, parse it
      if (cleanBody.includes('DKIM-Signature:') || cleanBody.includes('Received:')) {
        try {
          const parsed = await simpleParser(cleanBody);
          cleanFrom = parsed.from?.text || cleanFrom;
          cleanTo = (Array.isArray(parsed.to) ? parsed.to.map(t => t.text).join(', ') : parsed.to?.text) || cleanTo;
          cleanSubject = parsed.subject || cleanSubject;
          cleanBody = parsed.text || cleanBody;
          cleanHtml = (typeof parsed.html === 'string' ? parsed.html : "") || cleanHtml;
        } catch (parseError) {
          console.error("[Webhook] Failed to parse raw email:", parseError);
        }
      }

      const emailData = {
        from: cleanFrom,
        to: cleanTo,
        subject: cleanSubject,
        body: cleanBody,
        html: cleanHtml,
        timestamp: new Date(), // Use JS Date for fallback, serverTimestamp for Firestore
        raw: JSON.stringify(req.body) // Store raw for debugging
      };

      let saved = false;

      // 1. Try Admin SDK first (bypasses rules)
      if (adminDb) {
        try {
          await adminDb.collection("inbound_emails").add({
            ...emailData,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log("[Webhook] Inbound email saved to Firestore using Admin SDK.");
          saved = true;
        } catch (adminError) {
          console.error("[Webhook] Admin SDK failed to save email:", adminError);
        }
      }

      // 2. Fallback to Client SDK if Admin SDK failed or was not available
      if (!saved && db) {
        try {
          await addDoc(collection(db, "inbound_emails"), {
            ...emailData,
            timestamp: serverTimestamp()
          });
          console.log("[Webhook] Inbound email saved to Firestore using Client SDK.");
          saved = true;
        } catch (clientError) {
          console.error("[Webhook] Client SDK failed to save email:", clientError);
        }
      }

      if (saved) {
        // Send auto-reply
        try {
          const autoReplyOptions = {
            from: `"Barnia Digital Hub" <${process.env.EMAIL_USER || 'info@barnia.in'}>`,
            to: cleanFrom,
            subject: `Re: ${cleanSubject}`,
            html: `
              <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; color: #18181b; max-width: 600px; margin: 0 auto; border: 1px solid #f4f4f5; border-radius: 24px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #FF6321; padding: 40px 20px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">Message Received!</h1>
                  <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">Barnia Digital Hub Support</p>
                </div>
                <div style="padding: 40px;">
                  <p style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">Hi there,</p>
                  <p style="font-size: 15px; line-height: 1.6; color: #52525b; margin-bottom: 24px;">
                    Thank you for reaching out to Barnia Digital Hub. We have received your message regarding <strong>"${cleanSubject}"</strong> and our team will get back to you as soon as possible.
                  </p>
                  <div style="background-color: #f8fafc; padding: 20px; border-radius: 16px; margin-bottom: 24px; border: 1px dashed #e2e8f0;">
                    <p style="margin: 0; font-size: 13px; color: #64748b; font-style: italic;">
                      "Your message is important to us. We typically respond within 24 hours."
                    </p>
                  </div>
                  <p style="font-size: 14px; color: #71717a; border-top: 1px solid #f4f4f5; padding-top: 20px;">
                    Best regards,<br>
                    <strong>The Barnia Digital Hub Team</strong>
                  </p>
                </div>
                <div style="background-color: #f4f4f5; padding: 20px; text-align: center; font-size: 11px; color: #a1a1aa;">
                  © 2026 Barnia Digital Hub. All rights reserved.<br>
                  Nadia, West Bengal, India
                </div>
              </div>
            `
          };
          await transporter.sendMail(autoReplyOptions);
          console.log(`[Webhook] Auto-reply sent to ${cleanFrom}`);
        } catch (replyError) {
          console.error("[Webhook] Failed to send auto-reply:", replyError);
        }

        res.status(200).json({ status: "success" });
      } else {
        console.error("[Webhook] Failed to save email with both Admin and Client SDKs.");
        res.status(500).json({ error: "Failed to save email to database" });
      }
    } catch (error) {
      console.error("[Webhook] Error processing inbound email:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Self-pinging mechanism to keep the server awake
  const APP_URL = process.env.APP_URL || "https://barnia.in";
  let lastPingTimestamp = "Never";
  console.log(`[Keep-Alive] Initializing self-ping for: ${APP_URL}/api/ping`);
  
  setInterval(() => {
    fetch(`${APP_URL}/api/ping`)
      .then(() => {
        lastPingTimestamp = new Date().toISOString();
        console.log(`[Keep-Alive] Self-ping successful for ${APP_URL} at ${lastPingTimestamp}`);
      })
      .catch(err => console.error(`[Keep-Alive] Self-ping failed for ${APP_URL}:`, err.message));
  }, 10 * 60 * 1000); // Every 10 minutes

  // Diagnostic endpoint
  app.get("/api/admin/diag", async (req, res) => {
    const now = new Date();
    const currentNewsDate = getCurrentNewsDate();
    
    // Get API key info (safely)
    const getMaskedKey = (key: string | undefined) => {
      if (!key) return "Not Set";
      if (key.length < 8) return "Too Short";
      return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    };

    const allEnvKeys = Object.keys(process.env);
    const aizaKeys: any = {};
    allEnvKeys.filter(k => process.env[k]?.startsWith('AIza')).forEach(k => {
      aizaKeys[k] = getMaskedKey(process.env[k]);
    });

    const diag: any = {
      timestamp: now.toISOString(),
      serverTimeIST: new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now),
      currentNewsDate,
      env: process.env.NODE_ENV || 'development',
      aizaKeys,
      keys: {
        GEMINI_API_KEY: getMaskedKey(process.env.GEMINI_API_KEY),
        API_KEY: getMaskedKey(process.env.API_KEY),
        GOOGLE_API_KEY: getMaskedKey(process.env.GOOGLE_API_KEY),
        FIREBASE_CONFIG_KEY: getMaskedKey(firebaseConfig?.apiKey),
      },
      firebase: {
        projectId: firebaseConfig?.projectId,
        databaseId: firebaseConfig?.firestoreDatabaseId,
      },
      newsStatus: {
        isGenerating: false,
        startTime: null,
      }
    };

    res.json(diag);
  });

  // Test Gemini API directly
  app.get("/api/admin/test-gemini", async (req, res) => {
    try {
      console.log("[TestGemini] Starting test...");
      const apiKey = await getGeminiApiKey();
      const ai = new GoogleGenAI({ apiKey });
      
      // Try multiple models in order of preference
      const modelsToTry = ["gemini-3-flash-preview", "gemini-flash-latest", "gemini-3.1-flash-lite-preview"];
      let lastError = null;
      
      for (const model of modelsToTry) {
        try {
          console.log(`[TestGemini] Trying model: ${model}`);
          const response = await ai.models.generateContent({
            model: model,
            contents: "Hello, are you working?",
          });
          return res.json({ 
            status: "success", 
            text: response.text,
            modelUsed: model,
            keyPrefix: apiKey.substring(0, 8),
            keyLength: apiKey.length
          });
        } catch (e: any) {
          console.warn(`[TestGemini] Model ${model} failed: ${e.message}`);
          lastError = e;
        }
      }
      
      throw lastError || new Error("All models failed");
    } catch (error: any) {
      console.error("[TestGemini] Test failed:", error);
      res.status(500).json({ 
        status: "error", 
        message: error.message,
        details: error.stack,
        code: error.code || "UNKNOWN"
      });
    }
  });

  // Debug endpoint for news generation parameters
  app.get("/api/debug-news", (req, res) => {
    const now = new Date();
    const currentNewsDate = getCurrentNewsDate();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    
    // Get last 50 lines of logs if possible
    let logs = "Logs not available";
    try {
      // We don't have a log file, but we can maybe capture console.log?
      // For now, just return the environment info
    } catch (e) {}

    res.json({
      serverTime: now.toISOString(),
      currentNewsDate,
      istParts: parts,
      isGeneratingNews: false,
      generationStartTime: null,
      env: {
        GEMINI_API_KEY_PRESENT: !!process.env.GEMINI_API_KEY,
        GEMINI_API_KEY_PREFIX: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 4) : null,
        API_KEY_PRESENT: !!process.env.API_KEY,
        API_KEY_PREFIX: process.env.API_KEY ? process.env.API_KEY.substring(0, 4) : null,
        GOOGLE_API_KEY_PRESENT: !!process.env.GOOGLE_API_KEY,
        GOOGLE_API_KEY_PREFIX: process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.substring(0, 4) : null,
        FIREBASE_API_KEY_PRESENT: !!firebaseConfig?.apiKey,
        FIREBASE_API_KEY_PREFIX: firebaseConfig?.apiKey ? firebaseConfig?.apiKey.substring(0, 4) : null,
      }
    });
  });

  app.get("/api/news", async (req, res) => {
    const { date, lang } = req.query;
    if (!date) return res.status(400).json({ error: "Date is required" });
    
    const language = (lang === 'bn' ? 'bn' : 'en') as 'bn' | 'en';
    const docId = `${date}-${language}`;
    const currentNewsDate = getCurrentNewsDate();

    // Cleanup old news (older than 15 days) periodically
    if (date === currentNewsDate && Math.random() < 0.1) {
      cleanupOldNews().catch(err => console.error("[NewsAPI] Cleanup failed:", err));
    }

    try {
      let data: any = null;
      
      // 1. Try fetching from Firestore (Admin SDK first, then Client SDK)
      if (adminDb) {
        try {
          const docSnap = await adminDb.collection("news").doc(docId).get();
          if (docSnap.exists) {
            data = docSnap.data();
          }
        } catch (adminError) {
          console.warn(`[NewsAPI] Admin SDK fetch failed for ${docId}:`, adminError);
        }
      }

      if (!data && db) {
        try {
          const docSnap = await getDocFromServer(doc(db, "news", docId));
          if (docSnap.exists()) {
            data = docSnap.data();
          }
        } catch (clientError) {
          console.warn(`[NewsAPI] Client SDK fetch failed for ${docId}:`, clientError);
        }
      }

      if (data) {
        return res.json(data);
      }

      // 2. If not in Firestore, return 404 to trigger frontend generation
      return res.status(404).json({ 
        error: "News not found in cache", 
        docId,
        triggerFrontendGen: true 
      });
    } catch (error: any) {
      console.error(`[NewsAPI] Error fetching news for ${docId}:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/news", async (req, res) => {
    const { date, lang, newsData } = req.body;
    if (!date || !lang || !newsData) {
      return res.status(400).json({ error: "Missing required fields: date, lang, newsData" });
    }

    const docId = `${date}-${lang}`;
    const dataToSave = {
      ...newsData,
      date,
      lang,
      updatedAt: new Date().toISOString(),
      createdAt: adminDb ? admin.firestore.FieldValue.serverTimestamp() : serverTimestamp()
    };

    console.log(`[NewsAPI] Attempting to cache news for ${docId}. Data keys: ${Object.keys(dataToSave).join(", ")}`);

    try {
      let saved = false;
      if (adminDb) {
        try {
          await adminDb.collection("news").doc(docId).set(dataToSave);
          console.log(`[NewsAPI] Successfully saved news for ${docId} via Admin SDK`);
          saved = true;
        } catch (adminSaveError: any) {
          console.warn(`[NewsAPI] Admin SDK save failed for ${docId}: ${adminSaveError.message}`);
        }
      }

      if (!saved && db) {
        try {
          await setDoc(doc(db, "news", docId), dataToSave);
          console.log(`[NewsAPI] Successfully saved news for ${docId} via Client SDK`);
          saved = true;
        } catch (clientSaveError: any) {
          console.warn(`[NewsAPI] Client SDK save failed for ${docId}: ${clientSaveError.message}`);
          // Log more details if it's a permission error
          if (clientSaveError.message.includes("PERMISSION_DENIED")) {
            console.error(`[NewsAPI] PERMISSION_DENIED for ${docId}. Check firestore.rules. Data:`, JSON.stringify({
              date: dataToSave.date,
              lang: dataToSave.lang,
              hasLocal: !!dataToSave.local,
              hasFb: !!dataToSave.fbTrends,
              hasIg: !!dataToSave.igTrends
            }));
          }
        }
      }

      if (saved) {
        return res.json({ success: true, docId });
      } else {
        return res.status(500).json({ error: "Failed to save news to any database" });
      }
    } catch (error: any) {
      console.error(`[NewsAPI] Error saving news for ${docId}:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Redirects for common typos
  app.get("/bazaar", (req, res) => {
    res.redirect(301, "/bazar");
  });

  // Load initial data
  let localDb = await loadData();

  // API Routes
  app.get("/api/influencers", (req, res) => {
    res.json(localDb.userInfluencers);
  });

  // Welcome Email Endpoint
  app.post("/api/send-welcome-email", async (req, res) => {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Diagnostic check for secrets
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("[WelcomeEmail] Missing secrets. EMAIL_USER:", !!process.env.EMAIL_USER, "EMAIL_PASS:", !!process.env.EMAIL_PASS);
      return res.status(500).json({ 
        error: "Server configuration error", 
        details: `Missing secrets: ${!process.env.EMAIL_USER ? 'EMAIL_USER ' : ''}${!process.env.EMAIL_PASS ? 'EMAIL_PASS' : ''}. Please ensure you named your secrets EXACTLY 'EMAIL_USER' and 'EMAIL_PASS' and clicked 'Apply changes'.`
      });
    }

    console.log(`[WelcomeEmail] Sending welcome email to ${email} (${name || 'User'})`);

    const mailOptions = {
      from: `"Barnia Digital Hub" <${process.env.EMAIL_USER || 'info@barnia.in'}>`,
      to: email,
      subject: "Welcome to Barnia Digital Hub! 🚀",
      html: `
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; color: #18181b; max-width: 600px; margin: 0 auto; border: 1px solid #f4f4f5; border-radius: 24px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #FF6321; padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">Welcome to the Hub!</h1>
            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500;">Barnia Digital Hub</p>
          </div>
          <div style="padding: 40px;">
            <p style="font-size: 18px; font-weight: 700; margin-bottom: 16px;">Hi ${name || 'there'},</p>
            <p style="font-size: 16px; line-height: 1.6; color: #52525b; margin-bottom: 24px;">
              We're thrilled to have you join our community! Barnia Digital Hub is your one-stop platform for everything local in Barnia, Ujirpur, and Nadia.
            </p>
            <div style="background-color: #f8fafc; padding: 24px; border-radius: 16px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: 0.05em;">What you can do now:</h3>
              <ul style="margin: 0; padding: 0; list-style: none;">
                <li style="margin-bottom: 8px; font-size: 14px; color: #475569; display: flex; align-items: center;">
                  <span style="color: #FF6321; margin-right: 8px;">•</span> Check daily market prices at Barnia Bazar
                </li>
                <li style="margin-bottom: 8px; font-size: 14px; color: #475569; display: flex; align-items: center;">
                  <span style="color: #FF6321; margin-right: 8px;">•</span> Connect with local influencers
                </li>
                <li style="margin-bottom: 0; font-size: 14px; color: #475569; display: flex; align-items: center;">
                  <span style="color: #FF6321; margin-right: 8px;">•</span> Stay updated with Bengali Ponjika
                </li>
              </ul>
            </div>
            <a href="https://barnia.in" style="display: inline-block; background-color: #FF6321; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 10px 15px -3px rgba(245, 99, 33, 0.3);">Explore the Website</a>
            <p style="margin-top: 40px; font-size: 14px; color: #71717a; border-top: 1px solid #f4f4f5; pt-20px; padding-top: 20px;">
              If you have any questions, just reply to this email. We're here to help!<br><br>
              Best regards,<br>
              <strong>The Barnia Digital Hub Team</strong>
            </p>
          </div>
          <div style="background-color: #f4f4f5; padding: 20px; text-align: center; font-size: 12px; color: #a1a1aa;">
            © 2026 Barnia Digital Hub. All rights reserved.<br>
            Nadia, West Bengal, India
          </div>
        </div>
      `
    };

    try {
      console.log(`[WelcomeEmail] Attempting to send email via transporter to ${email}...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`[WelcomeEmail] Email sent successfully to ${email}. MessageId: ${info.messageId}`);
      res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("[WelcomeEmail] Failed to send email:", error.message);
      res.status(500).json({ error: "Failed to send email", details: error.message });
    }
  });

  // Meta Tag Routes (MUST be before static/vite middleware)
  app.get("/api/image/influencer/:id", async (req, res) => {
    try {
      let { id } = req.params;
      // Remove extension if present (e.g. .jpg)
      id = id.replace(/\.(jpg|jpeg|png|webp)$/i, '');
      
      const profile = firebaseConfig ? await getProfileItem(id, firebaseConfig.projectId, firebaseConfig.firestoreDatabaseId) : null;
      
      if (!profile || !profile.rawAvatar) {
        return res.status(404).send("Image not found");
      }

      if (profile.rawAvatar.startsWith('data:image')) {
        const parts = profile.rawAvatar.split(',');
        if (parts.length < 2) return res.status(400).send("Invalid image data");
        
        const base64Data = parts[1];
        const img = Buffer.from(base64Data, 'base64');
        const mimeType = profile.rawAvatar.split(';')[0].split(':')[1] || 'image/jpeg';
        
        res.writeHead(200, {
          'Content-Type': mimeType,
          'Content-Length': img.length,
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
          'X-Content-Type-Options': 'nosniff'
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
    
    const baseUrl = "https://barnia.in";
    const fullUrl = `${baseUrl}${req.path}`;

    const metadata = newsItem ? {
      title: newsItem.title,
      description: newsItem.content.substring(0, 200) + "...",
      image: newsItem.image,
      url: fullUrl,
      type: 'article'
    } : {
      title: "Latest News | Barnia community",
      description: "Stay updated with the latest news, events, and announcements from the Barnia community.",
      image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?fm=jpg&fit=crop&q=80&w=1200&h=630",
      url: fullUrl,
      type: 'article'
    };

    console.log(`[MetaTags] Injecting tags for news: ${metadata.title}, URL: ${fullUrl}`);
    html = await injectMetaTags(html, metadata);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });

  app.get("/shop/:slug", async (req, res) => {
    const { slug } = req.params;
    console.log(`[ShopRoute] Request for Slug: ${slug}`);
    
    const shop = firebaseConfig ? await getShopItem(slug, firebaseConfig.projectId, firebaseConfig.firestoreDatabaseId) : null;
    
    let html: string;
    if (process.env.NODE_ENV !== "production" && vite) {
      html = await fs.readFile(path.resolve("index.html"), "utf-8");
      html = await vite.transformIndexHtml(req.originalUrl, html);
    } else {
      html = await fs.readFile(path.resolve("dist", "index.html"), "utf-8");
    }
    
    const baseUrl = "https://barnia.in";
    const fullUrl = `${baseUrl}${req.path}`;
    
    let metadata;
    if (shop) {
      const productList = shop.products.map((p: any) => p.name).join(', ');
      const title = `${shop.name} | Barnia Bazar - Best ${shop.category} in Tehatta`;
      const description = `Visit ${shop.name} at Barnia Bazar. Best ${shop.category} in Tehatta, Nadia. Products: ${productList}. Contact: ${shop.phone}`;

      metadata = {
        title: title,
        description: description,
        image: shop.image,
        url: fullUrl,
        type: 'business.business',
        imageWidth: 1200,
        imageHeight: 630
      };

      // Add LocalBusiness and Breadcrumb Structured Data
      const shopSchema = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": shop.name,
        "image": shop.image,
        "@id": fullUrl,
        "url": fullUrl,
        "telephone": shop.phone,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Barnia Bazar",
          "addressLocality": "Tehatta",
          "addressRegion": "West Bengal",
          "postalCode": "741160",
          "addressCountry": "IN"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 23.7333,
          "longitude": 88.5167
        }
      };
      const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": baseUrl
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Barnia Bazar",
            "item": `${baseUrl}/bazar`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": shop.name,
            "item": fullUrl
          }
        ]
      };
      html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(shopSchema)}</script><script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script></head>`);
    } else {
      metadata = {
        title: "Shop Profile | Barnia Bazar",
        description: "Explore local shops and market prices at Barnia Bazar, Nadia.",
        image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?fm=jpg&fit=crop&q=80&w=1200&h=630",
        url: fullUrl,
        type: 'website'
      };
    }

    console.log(`[MetaTags] Injecting tags for shop: ${metadata.title}, URL: ${fullUrl}`);
    html = await injectMetaTags(html, metadata);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });

  app.get("/profile/:id", async (req, res) => {
    const userAgent = req.get('User-Agent') || '';
    console.log(`[ProfileRoute] Request for ID/Slug: ${req.params.id}, User-Agent: ${userAgent}`);
    
    const profile = firebaseConfig ? await getProfileItem(req.params.id, firebaseConfig.projectId, firebaseConfig.firestoreDatabaseId) : null;
    
    let html: string;
    if (process.env.NODE_ENV !== "production" && vite) {
      html = await fs.readFile(path.resolve("index.html"), "utf-8");
      html = await vite.transformIndexHtml(req.originalUrl, html);
    } else {
      html = await fs.readFile(path.resolve("dist", "index.html"), "utf-8");
    }
    
    const baseUrl = "https://barnia.in";
    const fullUrl = `${baseUrl}${req.path}`;
    
    let metadata;
    if (profile) {
      // Use proxy URL for Base64 images to satisfy social media crawlers
      // Adding .jpg extension helps Facebook recognize it as an image
      let imageUrl = profile.avatar;
      if (imageUrl && imageUrl.startsWith('data:image')) {
        imageUrl = `${baseUrl}/api/image/influencer/${req.params.id}.jpg`;
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
        url: fullUrl,
        type: 'profile',
        imageWidth: 1200,
        imageHeight: 630
      };

      // Add Person and Breadcrumb Structured Data
      const personSchema = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": profile.name,
        "description": profile.bio,
        "image": imageUrl,
        "url": fullUrl,
        "sameAs": profile.socials || [],
        "jobTitle": "Content Creator",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Tehatta",
          "addressRegion": "West Bengal",
          "addressCountry": "IN"
        }
      };
      const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": baseUrl
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Influencers",
            "item": `${baseUrl}/influencers`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": profile.name,
            "item": fullUrl
          }
        ]
      };
      html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(personSchema)}</script><script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script></head>`);
    } else {
      metadata = {
        title: "Influencer Profile | Barnia Digital Hub",
        description: "Explore professional influencer profiles and collaboration opportunities in our community network.",
        image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?fm=jpg&fit=crop&q=80&w=1200&h=630",
        url: fullUrl,
        type: 'profile'
      };
    }

    console.log(`[MetaTags] Injecting tags for profile: ${metadata.title}, URL: ${fullUrl}`);
    html = await injectMetaTags(html, metadata);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });

  // Generic Meta Tag Injection for other routes
  app.get(["/", "/bazar", "/influencers", "/ponjika"], async (req, res) => {
    try {
      const isProd = process.env.NODE_ENV === "production";
      const indexPath = isProd ? path.resolve("dist", "index.html") : path.resolve("index.html");
      
      console.log(`[SSR] Handling route: ${req.path}, indexPath: ${indexPath}, isProd: ${isProd}`);
      
      let html = "";
      try {
        html = await fs.readFile(indexPath, "utf-8");
      } catch (readError) {
        console.error(`[SSR] Failed to read index file at ${indexPath}:`, readError);
        // Fallback to other index if one fails
        const fallbackPath = isProd ? path.resolve("index.html") : path.resolve("dist", "index.html");
        console.log(`[SSR] Attempting fallback to: ${fallbackPath}`);
        html = await fs.readFile(fallbackPath, "utf-8");
      }

      if (process.env.NODE_ENV !== "production" && vite) {
        html = await vite.transformIndexHtml(req.originalUrl, html);
      }

      if (!html || html.trim() === "") {
        console.error("[SSR] Generated HTML is empty before injection!");
        // Re-read if empty
        html = await fs.readFile(indexPath, "utf-8");
        if (!isProd && vite) html = await vite.transformIndexHtml(req.originalUrl, html);
      }

      const protocol = (req.headers['x-forwarded-proto'] as string) || (req.hostname === 'localhost' ? 'http' : 'https');
      const host = req.headers.host;
      const baseUrl = process.env.APP_URL || (host ? `${protocol}://${host}` : "https://barnia.in");
      const fullUrl = `${baseUrl}${req.path}`;

      let metadata = {
        title: "Barnia Digital Hub | Barnia Bazar, Influencers & Ponjika",
        description: "The official community platform for Barnia, Ujirpur, Nadia. Check daily Barnia Bazar market prices, connect with local influencers, and view the Bengali Ponjika.",
        image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?fm=jpg&fit=crop&q=80&w=1200&h=630",
        url: fullUrl,
        type: 'website',
        imageWidth: 1200,
        imageHeight: 630,
        keywords: "barnia, ujirpur, barnia bazar, nadia, thatta, west bengal, influencer, market prices, bengali ponjika, community hub, digital barnia"
      };

      if (req.path.includes("/bazar")) {
        metadata.title = "Barnia Bazar | Daily Market Prices in Barnia";
        metadata.description = "Get the latest market prices for vegetables, fish, and groceries at Barnia Bazar, Nadia.";
        metadata.image = "https://images.unsplash.com/photo-1464226184884-fa280b87c399?fm=jpg&fit=crop&q=80&w=1200&h=630";
      } else if (req.path.includes("/influencers")) {
        metadata.title = "Influencer Network | Barnia & Ujirpur Talents";
        metadata.description = "Meet the top influencers and creators from Barnia and Ujirpur. Collaborate and grow together.";
        metadata.image = "https://images.unsplash.com/photo-1590005354167-6da97870c921?fm=jpg&fit=crop&q=80&w=1200&h=630";
      } else if (req.path.includes("/ponjika")) {
        metadata.title = "Bengali Ponjika | Daily Tithi & Festivals in Barnia";
        metadata.description = "Check the daily Bengali Ponjika, auspicious timings, and upcoming festivals for Barnia and Nadia.";
        metadata.image = "https://images.unsplash.com/photo-1506784919141-177b7ec8eead?fm=jpg&fit=crop&q=80&w=1200&h=630";
      }

      try {
        html = await injectMetaTags(html, metadata);
      } catch (metaError) {
        console.error("[SSR] Error injecting meta tags:", metaError);
      }

      if (!html || html.trim() === "") {
        console.error("[SSR] Generated HTML is empty after injection!");
        return res.status(500).send("Internal Server Error: Empty HTML");
      }

      // Add WebSite and Organization Structured Data for Home Page
      if (req.path === "/" || req.path === "") {
        try {
          const websiteSchema = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Barnia Digital Hub",
            "url": baseUrl,
            "potentialAction": {
              "@type": "SearchAction",
              "target": `${baseUrl}/bazar?q={search_term_string}`,
              "query-input": "required name=search_term_string"
            }
          };
          const orgSchema = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Barnia Digital Hub",
            "url": baseUrl,
            "logo": "https://i.postimg.cc/McBQ2pVg/barnia-logo-120x120.png",
            "sameAs": [
              "https://www.facebook.com/barnia.in",
              "https://www.instagram.com/barnia.in"
            ]
          };
          
          const schemaHtml = `
            <script type="application/ld+json">${JSON.stringify(websiteSchema)}</script>
            <script type="application/ld+json">${JSON.stringify(orgSchema)}</script>
          `;
          
          // Use a case-insensitive replace for </head>
          const headEndRegex = /(<\/head>)/i;
          if (headEndRegex.test(html)) {
            html = html.replace(headEndRegex, `${schemaHtml}$1`);
          } else {
            html += schemaHtml;
          }
        } catch (schemaError) {
          console.error("[SSR] Error adding structured data:", schemaError);
        }
      }

      if (!html || html.trim() === "") {
        console.error("[SSR] Generated HTML is empty!");
        return res.status(500).send("Internal Server Error: Empty HTML");
      }

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      console.error(`[SSR] Fatal error handling route ${req.path}:`, error);
      res.status(500).send("Internal Server Error");
    }
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

  // Facebook OAuth Routes
  app.get('/api/auth/facebook/url', (req, res) => {
    // Use environment variables if available, otherwise use hardcoded fallbacks
    const appId = process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID || "2201629183577400";
    const host = req.get('host');
    // Force https for production domains to avoid protocol mismatch errors
    const protocol = (host?.includes('localhost') || host?.includes('127.0.0.1')) ? 'http' : 'https';
    const currentUrl = `${protocol}://${host}`;
    const redirectUri = `${currentUrl}/auth/facebook/callback`;

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      // Simplified scope to avoid "Advanced Access" blocks for basic login
      // Add back 'instagram_basic', etc. only after your app is approved by Facebook
      scope: 'public_profile,email',
      response_type: 'code',
      auth_type: 'rerequest', // Prompt user again if they denied permissions
      display: 'popup'
    });

    const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
    console.log(`[FacebookAuth] Generated Auth URL: ${authUrl}`);
    res.json({ url: authUrl });
  });

  // Facebook OAuth Callback
  app.get('/auth/facebook/callback', async (req, res) => {
    const { code, error } = req.query;
    const host = req.get('host');
    // Force https for production domains to avoid protocol mismatch errors
    const protocol = (host?.includes('localhost') || host?.includes('127.0.0.1')) ? 'http' : 'https';
    const currentUrl = `${protocol}://${host}`;
    const redirectUri = `${currentUrl}/auth/facebook/callback`;
    
    if (error) {
      console.error(`[FacebookAuth] Error from Facebook: ${error}`);
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', provider: 'facebook', error: '${error}' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication failed: ${error}. This window should close automatically.</p>
          </body>
        </html>
      `);
    }

    try {
      const appId = process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID || "2201629183577400";
      const appSecret = process.env.FACEBOOK_CLIENT_SECRET || "3494ad98c498cda892b65006cf833273";

      console.log(`[FacebookAuth] Exchanging code for token. Redirect URI: ${redirectUri}`);
      // 1. Exchange code for access token
      const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
      const tokenResponse = await fetch(tokenUrl);
      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error(`[FacebookAuth] Token exchange failed:`, tokens.error);
        throw new Error(tokens.error.message);
      }

      console.log(`[FacebookAuth] Token received. Fetching user profile...`);
      // 2. Fetch user profile data
      const userResponse = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,email,picture&access_token=${tokens.access_token}`);
      const userData = await userResponse.json();

      if (userData.error) {
        console.error(`[FacebookAuth] Profile fetch failed:`, userData.error);
        throw new Error(userData.error.message);
      }

      console.log(`[FacebookAuth] User data fetched: ${userData.name} (${userData.id})`);
      // 3. Send success message with user data back to parent window
      res.send(`
        <html>
          <body>
            <script>
              console.log('[FacebookAuth] Sending success message to opener...');
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  provider: 'facebook',
                  accessToken: ${JSON.stringify(tokens.access_token)},
                  user: ${JSON.stringify({
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    picture: userData.picture?.data?.url
                  })}
                }, '*');
                console.log('[FacebookAuth] Message sent. Closing window in 500ms...');
                setTimeout(() => window.close(), 500);
              } else {
                console.warn('[FacebookAuth] No opener found. Redirecting to home...');
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (err) {
      console.error('[FacebookAuth] Fatal error:', err);
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', provider: 'facebook', error: 'Failed to fetch user data' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication error. This window should close automatically.</p>
          </body>
        </html>
      `);
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
      // This is the final catch-all. If it's an asset, it should have been caught by static middleware.
      // If it's a page, we serve index.html with default meta tags.
      try {
        const isProd = process.env.NODE_ENV === "production";
        const indexPath = isProd ? path.resolve("dist", "index.html") : path.resolve("index.html");
        
        let html = await fs.readFile(indexPath, "utf-8");
        if (!vite) {
          // If vite is not available, we might be in a weird state, but try to serve
        } else if (!isProd) {
          html = await vite.transformIndexHtml(req.originalUrl, html);
        }
        
        // Always use barnia.in as the canonical base in production
        const baseUrl = (process.env.NODE_ENV === "production") ? "https://barnia.in" : (process.env.APP_URL || `http://${req.headers.host}`);
        
        const metadata = {
          title: "Barnia Digital Hub | Community Platform",
          description: "The official community platform for Barnia, Ujirpur, Nadia.",
          image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?fm=jpg&fit=crop&q=80&w=1200&h=630",
          url: `${baseUrl}${req.path === '/' ? '' : req.path}`,
          type: 'website',
          keywords: "barnia, ujirpur, barnia bazar, nadia, thatta, west bengal, influencer, market prices, bengali ponjika, community hub, digital barnia"
        };
        
        html = await injectMetaTags(html, metadata);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (err) {
        console.error("[SSR] Catch-all error:", err);
        res.status(500).send("Internal Server Error");
      }
    });
  } else {
    app.use(express.static("dist", { index: false }));

    app.get("*", async (req, res) => {
      try {
        // Always use barnia.in as the canonical base in production
        const baseUrl = "https://barnia.in";

        let html = await fs.readFile(path.resolve("dist", "index.html"), "utf-8");
        
        const metadata = {
          title: "Barnia Digital Hub | Community Platform",
          description: "The official community platform for Barnia, Ujirpur, Nadia.",
          image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?fm=jpg&fit=crop&q=80&w=1200&h=630",
          url: `${baseUrl}${req.path === '/' ? '' : req.path}`,
          type: 'website',
          keywords: "barnia, ujirpur, barnia bazar, nadia, thatta, west bengal, influencer, market prices, bengali ponjika, community hub, digital barnia"
        };
        
        html = await injectMetaTags(html, metadata);
        res.status(200)
          .set({ 
            "Content-Type": "text/html",
            "Cache-Control": "no-cache, no-store, must-revalidate"
          })
          .end(html);
      } catch (err) {
        console.error("[SSR] Production catch-all error:", err);
        res.status(500).send("Internal Server Error");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
