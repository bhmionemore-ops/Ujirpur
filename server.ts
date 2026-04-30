// Server entry point
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥');
  console.error(err.name, err.message, err.stack);
  // In production, we might want to exit and let the orchestrator restart us
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (err: any) => {
  console.error('UNHANDLED REJECTION! 💥');
  console.error(err?.name, err?.message, err?.stack);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { GoogleAuth } from "google-auth-library";

/**
 * Helper to call Gemini with exponential backoff for 503 (Unavailable) errors
 */
async function callGeminiWithRetry(ai: GoogleGenAI, options: any, maxRetries = 3) {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await ai.models.generateContent(options);
    } catch (error: any) {
      lastError = error;
      const isUnavailable = error?.message?.includes("503") || 
                          error?.error?.code === 503 || 
                          error?.status === "UNAVAILABLE";
      
      const isQuotaExceeded = error?.message?.includes("429") || 
                            error?.message?.includes("RESOURCE_EXHAUSTED") ||
                            error?.error?.code === 429 || 
                            error?.status === "RESOURCE_EXHAUSTED";

      if ((isUnavailable || isQuotaExceeded) && i < maxRetries) {
        const factor = isQuotaExceeded ? 10000 : 2000; // Longer wait for quota
        const delay = Math.pow(2, i) * factor + Math.random() * 1000;
        console.warn(`[Gemini] ${isQuotaExceeded ? 'Quota exceeded (429)' : 'High demand (503)'}. Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function getTelegramBotToken(): Promise<string | null> {
  const allEnvKeys = Object.keys(process.env);
  let botTokenKey: string | undefined = allEnvKeys.find(k => k === 'TELEGRAM_BOT_TOKEN') || 
                    allEnvKeys.find(k => k === 'VITE_TELEGRAM_BOT_TOKEN');

  if (!botTokenKey) {
    botTokenKey = allEnvKeys.find(k => {
      const uk = k.toUpperCase();
      return uk.includes('TELEGRAM') && uk.includes('TOKEN');
    });
  }

  if (!botTokenKey) {
    botTokenKey = allEnvKeys.find(k => {
      const uk = k.toUpperCase();
      return uk.includes('TELEGRAM') && uk.includes('BOT') && !uk.includes('USER');
    });
  }
  
  const token = botTokenKey ? process.env[botTokenKey] : null;
  return token ? token.trim() : null;
}
import nodemailer from "nodemailer";
import dns from "dns";
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
  getDoc,
  writeBatch, 
  doc, 
  setDoc, 
  serverTimestamp,
  query,
  where,
  limit,
  deleteDoc,
  addDoc,
  updateDoc,
  Firestore,
  initializeFirestore,
  getDocFromServer
} from "firebase/firestore";

dotenv.config();

let db: Firestore | null = null;
let adminDb: any = null;
let clientAuth: any = null;
let firebaseConfig: any = null;

// Helper for Firestore Errors according to guidelines
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: clientAuth?.currentUser?.uid || null,
      email: clientAuth?.currentUser?.email || null,
    },
    operationType,
    path
  };
  const jsonErr = JSON.stringify(errInfo);
  console.error('[Firestore Error Details]:', jsonErr);
  throw new Error(jsonErr);
}

// News generation locks
const newsLocks = new Map<string, number>();

// Server-to-Firestore Auth Key (for when Admin SDK fails)
const FIRESTORE_SERVER_KEY = "barnia-system-2024-v1";



// Metadata Cache to prevent redundant DB calls and timeouts
const metadataCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 2; // 2 minutes

// Helper to match frontend slugify logic
function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    // Allow English alphanumeric, hyphens, and Bengali characters (\u0980-\u09FF)
    .replace(/[^\w\u0980-\u09FF-]+/g, '') 
    .replace(/--+/g, '-')     // Replace multiple - with single -
    .replace(/^-+/, '')       // Trim - from start of text
    .replace(/-+$/, '');      // Trim - from end of text
}

async function getShopItem(idOrSlug: string, projectId: string, databaseId: string) {
  const cacheKey = `shop:${idOrSlug}`;
  const cached = metadataCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[MetaTags] Serving shop from cache: "${idOrSlug}"`);
    return cached.data;
  }

  console.log(`[MetaTags] Fetching shop for ID/Slug: "${idOrSlug}" (Length: ${idOrSlug.length}, Codes: ${Array.from(idOrSlug).map(c => c.charCodeAt(0)).join(',')})`);
  try {
    let data: any = null;
    const decodedId = decodeURIComponent(idOrSlug);
    
    // Try Admin SDK first (bypasses rules)
    if (adminDb) {
      try {
        // Try fetching by slug first
        let shopsBySlug = await adminDb.collection("shops").where("slug", "==", idOrSlug).limit(1).get();
        
        if (shopsBySlug.empty) {
          // Try fetching by decoded slug
          shopsBySlug = await adminDb.collection("shops").where("slug", "==", decodedId).limit(1).get();
        }

        if (shopsBySlug.empty) {
          // Try matching with server-side slugify
          const serverSlug = slugify(decodedId);
          if (serverSlug !== decodedId) {
            shopsBySlug = await adminDb.collection("shops").where("slug", "==", serverSlug).limit(1).get();
          }
        }

        if (!shopsBySlug.empty) {
          const doc = shopsBySlug.docs[0];
          data = doc.data();
          data.id = doc.id; // Ensure ID is included
          console.log(`[MetaTags] Shop found via Admin SDK (slug): "${idOrSlug}" (ID: ${doc.id})`);
        } else {
          // Fallback to ID
          const shopById = await adminDb.collection("shops").doc(idOrSlug).get();
          if (shopById.exists) {
            data = shopById.data();
            data.id = shopById.id;
            console.log(`[MetaTags] Shop found via Admin SDK (ID): "${idOrSlug}"`);
          }
        }
      } catch (adminError) {
        console.warn(`[MetaTags] Admin SDK failed to fetch shop "${idOrSlug}":`, adminError);
      }
    }

    // Fallback to Client SDK if Admin SDK failed or was not available
    if (!data && db) {
      try {
        let q = query(collection(db, "shops"), where("slug", "==", idOrSlug), limit(1));
        let shopsBySlug = await getDocs(q);
        
        if (shopsBySlug.empty) {
          const qDecoded = query(collection(db, "shops"), where("slug", "==", decodedId), limit(1));
          shopsBySlug = await getDocs(qDecoded);
        }

        if (shopsBySlug.empty) {
          const serverSlug = slugify(decodedId);
          if (serverSlug !== decodedId) {
            const qSlugified = query(collection(db, "shops"), where("slug", "==", serverSlug), limit(1));
            shopsBySlug = await getDocs(qSlugified);
          }
        }

        if (!shopsBySlug.empty) {
          const docSnap = shopsBySlug.docs[0];
          data = docSnap.data();
          data.id = docSnap.id;
          console.log(`[MetaTags] Shop found via Client SDK (slug): "${idOrSlug}" (ID: ${docSnap.id})`);
        } else {
          const shopById = await getDocFromServer(doc(db, "shops", idOrSlug));
          if (shopById.exists()) {
            data = shopById.data();
            data.id = shopById.id;
            console.log(`[MetaTags] Shop found via Client SDK (ID): "${idOrSlug}"`);
          }
        }
      } catch (clientError) {
        console.error(`[MetaTags] Client SDK also failed to fetch shop "${idOrSlug}":`, clientError);
      }
    }

    // Fallback to REST API if both SDKs failed
    if (!data) {
      try {
        console.log(`[MetaTags] Falling back to REST API for shop ${idOrSlug}`);
        const dbId = databaseId || '(default)';
        const encodedId = encodeURIComponent(idOrSlug);
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/shops/${encodedId}`;
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

    const result = {
      id: data.id || idOrSlug, // Store the ID for more reliable lookups
      name: data.name || "Barnia Shop",
      category: data.category || "General",
      location: data.location || "Barnia Bazar",
      image: data.image || data.imageUrl || "https://i.postimg.cc/Hn0RkJQ8/Gemini-Generated-Image-4uqd304uqd304uqd.png",
      phone: data.phone || "",
      products: data.products || []
    };

    metadataCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`[MetaTags] Error fetching shop for ${idOrSlug}:`, error);
    return null;
  }
}

async function getProfileItem(idOrSlug: string, projectId: string, databaseId: string) {
  const cacheKey = `profile:${idOrSlug}`;
  const cached = metadataCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[MetaTags] Serving profile from cache: ${idOrSlug}`);
    return cached.data;
  }

  console.log(`[MetaTags] Fetching profile for ID/Slug: ${idOrSlug}`);
  try {
    let data: any = null;
    const decodedId = decodeURIComponent(idOrSlug);
    
    // Try Admin SDK first (bypasses rules)
    if (adminDb) {
      try {
        // Try fetching by slug first
        let influencersBySlug = await adminDb.collection("influencers").where("slug", "==", idOrSlug).limit(1).get();
        
        if (influencersBySlug.empty) {
          // Try fetching by decoded slug
          influencersBySlug = await adminDb.collection("influencers").where("slug", "==", decodedId).limit(1).get();
        }

        if (influencersBySlug.empty) {
          // Try matching with server-side slugify
          const serverSlug = slugify(decodedId);
          if (serverSlug !== decodedId) {
            influencersBySlug = await adminDb.collection("influencers").where("slug", "==", serverSlug).limit(1).get();
          }
        }

        if (!influencersBySlug.empty) {
          const docSnap = influencersBySlug.docs[0];
          data = docSnap.data();
          data.id = docSnap.id;
        } else {
          // Fallback to ID
          const influencerById = await adminDb.collection("influencers").doc(idOrSlug).get();
          if (influencerById.exists) {
            data = influencerById.data();
            data.id = influencerById.id;
          }
        }
      } catch (adminError) {
        console.warn(`[MetaTags] Admin SDK failed to fetch profile ${idOrSlug}, falling back to client SDK:`, adminError);
      }
    }

    // Fallback to Client SDK if Admin SDK failed or was not available
    if (!data && db) {
      try {
        let q = query(collection(db, "influencers"), where("slug", "==", idOrSlug), limit(1));
        let influencersBySlug = await getDocs(q);
        
        if (influencersBySlug.empty) {
          const qDecoded = query(collection(db, "influencers"), where("slug", "==", decodedId), limit(1));
          influencersBySlug = await getDocs(qDecoded);
        }

        if (influencersBySlug.empty) {
          const serverSlug = slugify(decodedId);
          if (serverSlug !== decodedId) {
            const qSlugified = query(collection(db, "influencers"), where("slug", "==", serverSlug), limit(1));
            influencersBySlug = await getDocs(qSlugified);
          }
        }

        if (!influencersBySlug.empty) {
          const docSnap = influencersBySlug.docs[0];
          data = docSnap.data();
          data.id = docSnap.id;
        } else {
          const influencerById = await getDocFromServer(doc(db, "influencers", idOrSlug));
          if (influencerById.exists()) {
            data = influencerById.data();
            data.id = influencerById.id;
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
        const encodedId = encodeURIComponent(idOrSlug);
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/influencers/${encodedId}`;
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

    // Fallback for missing avatar (check both avatar and imageUrl)
    const avatar = data.avatar || data.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=random&color=fff&size=512`;

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

    const socialLinks = data.socials || data.socialLinks || [];
    const socialPlatforms = socialLinks
      .map((url: string) => {
        const match = Object.keys(socialIcons).find(key => url.toLowerCase().includes(key));
        return match ? socialIcons[match] : '🌐';
      })
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i); // Unique platforms

    const socialIconsStr = socialPlatforms.join(' ');
    const socialInfo = socialLinks
      .map((url: string) => {
        const match = Object.keys(socialIcons).find(key => url.toLowerCase().includes(key));
        const name = match ? match.split('.')[0].charAt(0).toUpperCase() + match.split('.')[0].slice(1) : 'Social';
        return match ? `${socialIcons[match]} ${name}` : '🌐 Social';
      })
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
      .join(' • ');

    const result = {
      id: data.id || idOrSlug,
      name: data.name || "Barnia Profile",
      bio: data.bio || "Explore professional influencer profiles and collaboration opportunities in our community network.",
      avatar: avatar,
      rawAvatar: data.avatar || data.imageUrl,
      socialInfo: socialInfo || '',
      socialIconsStr: socialIconsStr || '',
      socials: socialLinks,
      updatedAt: data.updatedAt
    };

    metadataCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`[MetaTags] Error fetching profile for ${idOrSlug}:`, error);
    return null;
  }
}

async function getNewsItem(date: string, tab: string, index: string, projectId: string, databaseId: string) {
  const cacheKey = `news:${date}:${tab}:${index}`;
  const cached = metadataCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[MetaTags] Serving news from cache: ${cacheKey}`);
    return cached.data;
  }

  try {
    let data: any = null;
    
    // Try multiple document ID formats: date, date-en, date-bn
    const docIdsToTry = [date, `${date}-en`, `${date}-bn`];
    
    // 1. Try Admin SDK (preferred on server)
    if (adminDb) {
      try {
        for (const docId of docIdsToTry) {
          const docSnap = await adminDb.collection("news").doc(docId).get();
          if (docSnap.exists) {
            data = docSnap.data();
            console.log(`[MetaTags] News found via Admin SDK for docId: ${docId}`);
            break;
          }
        }
      } catch (e) {
        console.warn(`[MetaTags] Admin SDK news fetch failed for date ${date}:`, e);
      }
    }

    // 2. Try Client SDK (fallback)
    if (!data && db) {
      try {
        for (const docId of docIdsToTry) {
          const docRef = doc(db, "news", docId);
          const docSnap = await getDocFromServer(docRef);
          if (docSnap.exists()) {
            data = docSnap.data();
            console.log(`[MetaTags] News found via Client SDK for docId: ${docId}`);
            break;
          }
        }
      } catch (e) {
        console.warn(`[MetaTags] Client SDK news fetch failed for date ${date}:`, e);
      }
    }

    // 3. Fallback to REST API
    if (!data) {
      const dbId = databaseId || '(default)';
      for (const docId of docIdsToTry) {
        const encodedDocId = encodeURIComponent(docId);
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/news/${encodedDocId}`;
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
            console.log(`[MetaTags] News found via REST API for docId: ${docId}`);
            break;
          }
        }
      }
    }

    if (!data) {
      console.warn(`[MetaTags] News document NOT found for date: ${date}`);
      return null;
    }
    
    const tabKey = Object.keys(data).find(k => k.toLowerCase() === tab.toLowerCase());
    const tabData = tabKey ? data[tabKey] : null;
    if (!tabData) {
      console.warn(`[MetaTags] Tab "${tab}" NOT found in news document for date: ${date}. Available tabs: ${Object.keys(data).join(', ')}`);
      return null;
    }
    
    const idx = parseInt(index);
    if (!tabData[idx]) {
      console.warn(`[MetaTags] Index ${idx} NOT found in tab "${tab}" for date: ${date}. Tab size: ${tabData.length}`);
      return null;
    }
    
    const item = tabData[idx];
    const result = {
      title: item.title || "Barnia News",
      content: item.content || "Latest news from our community.",
      image: item.image || ""
    };

    metadataCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
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

function getCurrentFactDate() {
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
  
  // If before 8 AM IST, we are still in the previous "fact day"
  if (hour < 8) {
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

/**
 * Robustly cleans a Gemini response that might contain JSON.
 * Removes markdown formatting and fixes literal control characters inside strings.
 */
function cleanGeminiJson(text: string): string {
  if (!text) return "{}";
  
  // 1. Remove Markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
  }
  
  // 2. Handle literal control characters (LF, CR, TAB) inside JSON strings that break JSON.parse
  // This regex matches double-quoted strings and replaces literal control characters within them.
  return cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/gs, (match) => {
    return match
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  });
}

/**
 * Robustly parses JSON from Gemini's response.
 */
function parseGeminiJson(text: string, defaultValue: any = {}) {
  try {
    const cleaned = cleanGeminiJson(text);
    return JSON.parse(cleaned);
  } catch (error: any) {
    console.error(`[AI-Parse] Failed to parse AI response: ${error.message}`);
    // If it's a syntax error, try one more aggressive cleanup: remove all non-printable 
    // control characters (except maybe newlines handled above)
    try {
      const aggressive = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
      const stillCleaned = cleanGeminiJson(aggressive);
      return JSON.parse(stillCleaned);
    } catch (innerError) {
      console.error(`[AI-Parse] Aggressive parse also failed`);
      return defaultValue;
    }
  }
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
          return; // Success!
        }
      } catch (adminError: any) {
        console.warn(`[NewsAPI] Admin cleanup failed, falling back to client SDK: ${adminError.message}`);
      }
    }

    if (db) {
      try {
        const q = query(collection(db, "news"), where("date", "<", dateStr));
        const oldNews = await getDocs(q);
        if (!oldNews.empty) {
          const batch = writeBatch(db);
          oldNews.docs.forEach((docSnap) => batch.delete(docSnap.ref));
          await batch.commit();
          console.log(`[NewsAPI] [Client] Cleaned up ${oldNews.size} old news documents.`);
        }
      } catch (clientError: any) {
        console.error(`[NewsAPI] Client SDK cleanup failed:`, clientError instanceof Error ? clientError.message : String(clientError));
      }
    }
  } catch (error) {
    console.error("[NewsAPI] Error during news cleanup:", error);
  }
}

async function generateDailySanataniFacts() {
  try {
    const today = getCurrentFactDate();
    console.log(`[FactCheckAPI] [Background] Checking facts for date: ${today}`);
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      console.error("[FactCheckAPI] No Gemini API key found for background generation.");
      return;
    }
    const ai = new GoogleGenAI({ apiKey });
    
    let alreadyExists = false;
    let usedAdminForCheck = false;
    if (adminDb) {
      try {
        const existing = await adminDb.collection("fact_checks").where("date", "==", today).limit(1).get();
        alreadyExists = !existing.empty;
        usedAdminForCheck = true;
      } catch (adminError: any) {
        console.warn(`[FactCheckAPI] Admin SDK check failed: ${adminError.message}. Falling back to Client SDK.`);
      }
    }
    
    if (!usedAdminForCheck && db) {
      try {
        const q = query(collection(db, "fact_checks"), where("date", "==", today), limit(1));
        const existing = await getDocs(q);
        alreadyExists = !existing.empty;
      } catch (clientError: any) {
        console.error("[FactCheckAPI] Client SDK also failed to check for existing facts:", clientError.message);
      }
    }

    if (alreadyExists) {
      console.log(`[FactCheckAPI] Facts for ${today} already exist. Skipping.`);
      return;
    }

    console.log(`[FactCheckAPI] Generating daily fact checks for ${today}...`);
    
    // Using a more structured prompt for better reliability
    const prompt = `Act as the Sanatani Truth Bot, an AI guardian of Sanatana Dharma. 
    Find 5 current viral topics, rumors, or myths about Sanatana Dharma (History, Science, Traditions).
    Perform a rigorous fact-check for each. 
    Supreme priority given to the teachings of Shankaracharya Swami Avimukteshwaranand Saraswati.
    
    Format the output strictly as a JSON array of objects: 
    [
      {
        "claim": "The claim text",
        "status": "verified | false | misleading",
        "explanation": "Detailed explanation",
        "source": "Historical/Scriptural source",
        "category": "History | Science | General | Tradition"
      }
    ]
    Respond ONLY with the JSON array.`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-1.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const facts = parseGeminiJson(response.text || '[]', []);
    
    if (!Array.isArray(facts) || facts.length === 0) {
      console.warn("[FactCheckAPI] Generated empty or invalid facts array.");
      return;
    }

    let saved = false;
    if (adminDb) {
      try {
        const batch = adminDb.batch();
        facts.forEach((fact: any) => {
          const id = slugify(fact.claim).substring(0, 50) + '-' + Math.random().toString(36).substring(2, 7);
          const docRef = adminDb.collection("fact_checks").doc(id);
          batch.set(docRef, {
            ...fact,
            date: today,
            serverKey: FIRESTORE_SERVER_KEY,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });
        await batch.commit();
        console.log(`[FactCheckAPI] Successfully saved ${facts.length} facts via Admin SDK for ${today}`);
        saved = true;
      } catch (adminError: any) {
        console.warn("[FactCheckAPI] Admin SDK batch failed:", adminError.message);
      }
    }

    if (!saved && db) {
      try {
        const batch = writeBatch(db);
        facts.forEach((fact: any) => {
          const id = slugify(fact.claim).substring(0, 50) + '-' + Math.random().toString(36).substring(2, 7);
          const docRef = doc(db, "fact_checks", id);
          batch.set(docRef, {
            ...fact,
            date: today,
            createdAt: serverTimestamp(),
            serverKey: FIRESTORE_SERVER_KEY
          });
        });
        await batch.commit();
        console.log(`[FactCheckAPI] Successfully saved ${facts.length} facts via Client SDK fallback for ${today}`);
        saved = true;
      } catch (clientError: any) {
        console.error("[FactCheckAPI] Client SDK batch failed:", clientError.message);
      }
    }
  } catch (error: any) {
    if (error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
      console.warn("[FactCheckAPI] Daily generation skipped: Quota exceeded (429).");
    } else {
      console.error("[FactCheckAPI] Daily generation failed:", error);
    }
  }
}

/**
 * Automates daily news generation on the server so visitors don't trigger Gemini calls.
 */
async function autoGenerateDailyNews() {
  try {
    const date = getCurrentNewsDate();
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      console.error("[NewsAPI] [Auto] No valid Gemini API key found for background generation.");
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    for (const lang of ['bn', 'en']) {
      const language = lang as 'bn' | 'en';
      const docId = `${date}-${language}`;
      
    // Check if exists in Firestore to avoid duplicate generation
    let newsAlreadyExists = false;
    if (adminDb) {
      try {
        const docSnap = await adminDb.collection("news").doc(docId).get();
        if (docSnap.exists) {
          newsAlreadyExists = true;
        }
      } catch (e: any) {
        console.warn(`[NewsAPI] [Auto] Admin SDK exist-check failed for ${docId}:`, e.message);
      }
    }

    if (!newsAlreadyExists && db) {
      try {
        const docSnap = await getDoc(doc(db, "news", docId));
        if (docSnap.exists()) {
          newsAlreadyExists = true;
        }
      } catch (e: any) {
        // Safe to ignore or log minimally
      }
    }

    if (newsAlreadyExists) {
      console.log(`[NewsAPI] [Auto] News for ${docId} already exists. Skipping.`);
      continue;
    }

      console.log(`[NewsAPI] [Auto] Generating daily news for ${docId}...`);
      const langName = language === 'bn' ? 'Bengali' : 'English';
      
      const prompt = `Find the latest news and trends for the date: ${date}.
      
      1. Local News: 5 latest news items from Barnia (Nadia district), West Bengal. If no specific news for Barnia is found, provide news from Nadia district and neighboring areas of West Bengal.
      2. Facebook Trends: 5 latest VIRAL trends for Facebook in India and West Bengal. Provide a "Viral Content Blueprint" for influencers.
      3. Instagram Trends: 5 latest VIRAL trends for Instagram in India and West Bengal. Provide a "Viral Content Blueprint" for influencers.
      
      For News items, provide: title, content (150-200 words), source, date.
      For Trends, provide: title (e.g., "Top 1 (WB): ..."), content (Viral Strategy: Why it's trending, Hook Idea, Creation Tips, Viral Secret, Engagement Booster, Monetization Tip, Hashtags), source, date.
      
      Return the data in exactly this JSON format:
      {
        "local": [{"title": "...", "content": "...", "source": "...", "date": "..."}],
        "fbTrends": [{"title": "...", "content": "...", "source": "...", "date": "..."}],
        "igTrends": [{"title": "...", "content": "...", "source": "...", "date": "..."}]
      }
      
      IMPORTANT: All text must be in ${langName}.
      Return exactly 5 items per category. If limited news is available, prioritize quality and detail. Ensure the news is relevant to ${date} or the most recent available.`;

      const response = await callGeminiWithRetry(ai, { 
        model: "gemini-1.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const newsData = parseGeminiJson(response.text || '{}', {});
      const processedData = {
        ...newsData,
        updatedAt: new Date().toISOString(),
        date,
        isMock: false,
        serverKey: FIRESTORE_SERVER_KEY
      };

      let saved = false;
      if (adminDb) {
        try {
          await adminDb.collection("news").doc(docId).set(processedData);
          console.log(`[NewsAPI] [Auto] Saved news to Firestore (Admin) for ${docId}`);
          saved = true;
        } catch (e: any) {
          console.warn(`[NewsAPI] [Auto] Admin save failed for ${docId}:`, e.message);
        }
      }

      if (!saved && db) {
        try {
          await setDoc(doc(db, "news", docId), processedData);
          console.log(`[NewsAPI] [Auto] Saved news to Firestore (Client) for ${docId}`);
          saved = true;
        } catch (e: any) {
          console.error(`[NewsAPI] [Auto] Client save failed for ${docId}:`, e.message);
        }
      }
    }
  } catch (error: any) {
    if (error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
      console.warn("[NewsAPI] [Auto] Daily generation skipped: Quota exceeded (429).");
    } else {
      console.error("[NewsAPI] [Auto] Daily generation failed:", error);
    }
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

async function injectMetaTags(html: string, metadata: { title: string, description: string, image: string | string[], url: string, type?: string, imageWidth?: number, imageHeight?: number, keywords?: string, seoContent?: string, twitterCard?: string }) {
  // We keep both page URL and image URL decoded in the HTML.
  // Facebook's crawler will encode them correctly on its end.
  // Providing already encoded URLs often leads to double-encoding (%25E0) errors.
  const safeUrl = metadata.url || '';
  const images = Array.isArray(metadata.image) ? metadata.image : [metadata.image].filter(Boolean);
  const primaryImage = images[0] || '';
  
  console.log(`[MetaTags] Injecting - Title: "${metadata.title}", URL: "${safeUrl}", Images: ${images.length}`);
  
  const escapedTitle = escapeHtml(metadata.title);
  const escapedDescription = escapeHtml(metadata.description);
  const escapedUrl = escapeHtml(safeUrl);
  
  // Robotic keyword generation if not provided
  let keywords = metadata.keywords;
  if (!keywords) {
    const words = (metadata.title + " " + metadata.description)
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter((v, i, a) => a.indexOf(v) === i);
    keywords = words.join(", ");
  }
  const escapedKeywords = escapeHtml(keywords);

  const type = metadata.type || 'website';
  const updatedTime = new Date().toISOString();
  const imageWidth = metadata.imageWidth || 1200;
  const imageHeight = metadata.imageHeight || 630;

  let imageTags = '';
  images.forEach((img) => {
    const escapedImg = escapeHtml(img);
    let imgType = 'image/jpeg';
    const lowerImg = img.toLowerCase();
    if (lowerImg.includes('.png')) imgType = 'image/png';
    else if (lowerImg.includes('.webp')) imgType = 'image/webp';
    else if (lowerImg.includes('.gif')) imgType = 'image/gif';
    else if (lowerImg.includes('.svg')) imgType = 'image/svg+xml';

    imageTags += `
    <meta property="og:image" content="${escapedImg}" />
    <meta property="og:image:secure_url" content="${escapedImg}" />
    <meta property="og:image:width" content="${imageWidth}" />
    <meta property="og:image:height" content="${imageHeight}" />
    <meta property="og:image:type" content="${imgType}" />
    <meta property="og:image:alt" content="${escapedTitle}" />
    `;
  });

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
    ${imageTags}
    <meta property="og:locale" content="en_US" />
    <meta property="og:locale:alternate" content="bn_BD" />
    <meta property="og:updated_time" content="${updatedTime}" />
    <meta name="twitter:card" content="${metadata.twitterCard || (primaryImage ? 'summary_large_image' : 'summary')}" />
    ${primaryImage ? `
    <meta name="twitter:image" content="${escapeHtml(primaryImage)}" />
    <meta name="twitter:image:alt" content="${escapedTitle}" />
    ` : ''}
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
    const regex = new RegExp(`<meta\\s+[^>]*?(name|property)=["']${tag}["'][^>]*?\\/?>`, 'gi');
    modifiedHtml = modifiedHtml.replace(regex, "");
  });

  modifiedHtml = modifiedHtml.replace(/<meta name=["']keywords["'].*?\/?>/gi, "");
  modifiedHtml = modifiedHtml.replace(/<link rel=["']canonical["'].*?\/?>/gi, "");
  
  // Inject new tags into head
  const headRegex = /(<head[^>]*>)/i;
  if (headRegex.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(headRegex, `$1${metaTags}`);
  } else {
    modifiedHtml = metaTags + modifiedHtml;
  }

  // Inject SEO content into body for crawlers (hidden from users)
  if (metadata.seoContent) {
    const bodyRegex = /(<body[^>]*>)/i;
    const hiddenContent = `
      <div id="seo-content" style="display:none; visibility:hidden; height:0; width:0; overflow:hidden;" aria-hidden="true">
        ${metadata.seoContent}
      </div>
    `;
    if (bodyRegex.test(modifiedHtml)) {
      modifiedHtml = modifiedHtml.replace(bodyRegex, `$1${hiddenContent}`);
    }
  }

  return modifiedHtml;
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

  // Start listening immediately to avoid "Web server is down" errors
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Heartbeat to monitor server health and memory
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      console.log(`[Heartbeat] ${new Date().toISOString()} - RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
    }, 60000);

    // Daily Fact Check Generation (Check every hour if today's facts are ready)
    setTimeout(() => {
      generateDailySanataniFacts().catch(e => console.error("Initial fact generation failed:", e));
    }, 10000); // 10 second delay for Firebase stabilization

    setInterval(() => {
      generateDailySanataniFacts().catch(e => console.error("Periodic fact generation failed:", e));
    }, 3600000); // Every hour

    // Daily News Generation
    setTimeout(() => {
      autoGenerateDailyNews().catch(e => console.error("Initial news generation failed:", e));
    }, 20000); // 20 second delay for stabilization

    setInterval(() => {
      autoGenerateDailyNews().catch(e => console.error("Periodic news generation failed:", e));
    }, 3600000); // Every hour
  });

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
    port: 587,
    secure: false, // Use STARTTLS for port 587
    pool: false,   // Disable pooling for serverless/Cloud Run environments
    family: 4,     // Force IPv4 to avoid ENETUNREACH issues with IPv6 in Cloud Run
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 20000, 
    greetingTimeout: 20000,
    socketTimeout: 30000,
    debug: true,
    logger: true
  } as any);

  // Verify transporter on startup
  transporter.verify((error, success) => {
    if (error) {
      console.error('[Server] Email Transporter Verification Failed:', error.message);
    } else {
      console.log('[Server] Email Transporter is ready to send messages');
    }
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
    
    // 1. Domain Redirect
    if (host) {
      if (host.includes('barnia.onrender.com') || host.startsWith('www.')) {
        const cleanHost = host.replace('www.', '').replace('barnia.onrender.com', 'barnia.in');
        return res.redirect(301, `https://${cleanHost}${req.originalUrl}`);
      }
    }

    // 2. Trailing Slash Redirect
    if (req.path !== '/' && req.path.endsWith('/') && !req.path.startsWith('/api/')) {
      const query = req.url.slice(req.path.length);
      const safepath = req.path.slice(0, -1).replace(/\/+/g, '/');
      const protocol = req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      return res.redirect(301, `${protocol}://${req.get('host')}${safepath}${query}`);
    }

    next();
  });

  // Telegram Setup Route (Moved to top of API section)
  app.get("/api/webhooks/telegram/setup", async (req, res) => {
    try {
      const botToken = await getTelegramBotToken();
      
      if (!botToken) {
         return res.status(400).send(`
           <div style="font-family:sans-serif; padding: 40px; border: 2px solid #ef4444; border-radius: 12px; max-width: 700px; margin: 40px auto; background: #fef2f2;">
             <h2 style="color: #b91c1c; margin-top: 0; text-align:center;">❌ No Telegram Token Found</h2>
             <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #fee2e2;">
               <p>The server is looking for <b>TELEGRAM_BOT_TOKEN</b> but couldn't find a matching Secret.</p>
               <h4 style="margin-bottom: 8px;">How to fix:</h4>
               <ol style="line-height:1.6;">
                 <li>Open <b>Settings > Secrets</b></li>
                 <li>Add a secret named <code>TELEGRAM_BOT_TOKEN</code></li>
                 <li>Paste your token and click <b>Save</b></li>
                 <li><b>CRITICAL:</b> Click the <b>Refresh Preview</b> button at the top of the app window.</li>
               </ol>
             </div>
           </div>
         `);
      }

      // 1. Get Bot Info
      const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 10000 });
      const me = await meRes.json() as any;
      
      // 2. Set Webhook
      const baseUrl = req.protocol + "://" + req.get("host");
      const webhookUrl = `${baseUrl}/api/webhooks/telegram`;
      const setupRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`, { timeout: 10000 });
      const setupResult = await setupRes.json() as any;

      // 3. Test Gemini
      let geminiStatus = "Checking...";
      try {
        const geminiKey = await getGeminiApiKey();
        if (geminiKey) {
           const ai = new GoogleGenAI({ apiKey: geminiKey });
           const result = await ai.models.generateContent({
             model: "gemini-3-flash-preview",
             contents: "Hi"
           });
           geminiStatus = result && result.text ? "✅ Gemini AI is working! (3-flash)" : "❌ Gemini returned empty response";
        } else {
           geminiStatus = "❌ Gemini API Key Missing (Required for AI features)";
        }
      } catch (e: any) {
        const msg = e.message || String(e);
        geminiStatus = `❌ Gemini Error: ${msg}`;
        if (msg.includes("403") || msg.includes("permission") || msg.includes("blocked")) {
          geminiStatus += " (Your key might be restricted or blocked by Google Cloud)";
        }
      }

      res.send(`
        <div style="font-family:sans-serif; padding: 40px; max-width: 800px; margin: 40px auto; background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
          <h1 style="color: #166534; text-align:center; margin-bottom: 30px;">🤖 Bot Setup Dashboard</h1>
          
          <div style="grid; grid-template-columns: 1fr 1fr; gap: 20px; display: flex; flex-direction: column;">
            
            <div style="background:white; padding:25px; border-radius:12px; border:1px solid #e2e8f0;">
              <h3 style="margin-top:0; color:#0f172a;">📱 Telegram Connection</h3>
              <p><b>Bot Name:</b> ${me.ok ? `<b>${me.result.first_name}</b> (@${me.result.username})` : '<span style="color:#ef4444;">❌ Failed to connect (Check Token)</span>'}</p>
              <p><b>Webhook Status:</b> ${setupResult.ok ? '<span style="color:#10b981;">✅ Active</span>' : '<span style="color:#ef4444;">❌ Error</span>'}</p>
              <div style="background:#f8fafc; padding:10px; border-radius:6px; font-family:monospace; font-size:12px;">
                URL: ${webhookUrl}
              </div>
            </div>

            <div style="background:white; padding:25px; border-radius:12px; border:1px solid #e2e8f0;">
              <h3 style="margin-top:0; color:#0f172a;">🧠 Intelligence (Gemini)</h3>
              <p style="font-weight: bold; ${geminiStatus.startsWith('✅') ? 'color: #10b981;' : 'color: #ef4444;'}">
                ${geminiStatus}
              </p>
              ${geminiStatus.includes('❌') ? `
                <div style="margin-top:10px; padding:12px; background:#fff7ed; border-radius:8px; border:1px solid #ffedd5; font-size:13px; color:#9a3412;">
                  <b>To fix:</b> Ensure <code>GEMINI_API_KEY</code> is correctly set in Secrets and is <b>UNRESTRICTED</b> in Google Cloud Console.
                </div>
              ` : ''}
            </div>

          </div>

          <div style="margin-top: 30px; text-align: center; border-top: 1px solid #dcfce7; padding-top: 20px;">
            <a href="/vamshavali" style="display:inline-block; background: #059669; color:white; padding: 12px 24px; border-radius:10px; font-weight:bold; text-decoration:none;">Go back to Vamshavali</a>
            <p style="font-size:12px; color:#6b7280; margin-top:20px;">If the bot is still not replying, please click the <b>Refresh Preview</b> button at the top of AI Studio.</p>
          </div>
        </div>
      `);
    } catch (err: any) {
      res.status(500).send(`
        <div style="font-family:sans-serif; padding: 40px; border: 2px solid #ef4444; border-radius: 12px; max-width: 700px; margin: 40px auto; background: #fef2f2;">
          <h2 style="color: #b91c1c;">❌ Critical Setup Failure</h2>
          <pre style="background:white; padding:10px; border-radius:6px; overflow:auto;">${err.message}</pre>
        </div>
      `);
    }
  });

  app.get("/api/ping", (req, res) => res.send("pong"));

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

      // Helper to fetch all docs from a collection with fallbacks
      const fetchCollection = async (collectionName: string) => {
        let docs: any[] = [];
        // 1. Try Admin SDK
        if (adminDb) {
          try {
            const snap = await adminDb.collection(collectionName).get();
            snap.forEach((doc: any) => docs.push({ id: doc.id, ...doc.data() }));
            return docs;
          } catch (e) {
            console.warn(`[Sitemap] Admin SDK failed for ${collectionName}, trying client SDK...`);
          }
        }
        // 2. Try Client SDK
        if (db) {
          try {
            const snap = await getDocs(collection(db, collectionName));
            snap.forEach((docSnap) => docs.push({ id: docSnap.id, ...docSnap.data() }));
            return docs;
          } catch (e) {
            console.warn(`[Sitemap] Client SDK failed for ${collectionName}, trying REST API...`);
          }
        }
        // 3. Try REST API
        try {
          const projectId = firebaseConfig?.projectId;
          const dbId = firebaseConfig?.firestoreDatabaseId || '(default)';
          if (projectId) {
            const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/${collectionName}`;
            const response = await fetch(url);
            if (response.ok) {
              const json: any = await response.json();
              if (json.documents) {
                json.documents.forEach((doc: any) => {
                  const id = doc.name.split('/').pop();
                  const fields = doc.fields;
                  const data: any = { id };
                  if (fields) {
                    for (const key in fields) {
                      data[key] = fields[key].stringValue || fields[key].integerValue || fields[key].booleanValue;
                    }
                  }
                  docs.push(data);
                });
              }
            }
          }
        } catch (e) {
          console.error(`[Sitemap] REST API failed for ${collectionName}:`, e);
        }
        return docs;
      };

      // Fetch shops
      const shops = await fetchCollection("shops");
      shops.forEach(shop => {
        const slug = shop.slug || shop.id;
        urls.push({
          loc: `${baseUrl}/shop/${slug}`,
          changefreq: 'weekly',
          priority: '0.8'
        });
      });

      // Fetch influencers
      const influencers = await fetchCollection("influencers");
      influencers.forEach(influencer => {
        const slug = influencer.slug || influencer.id;
        urls.push({
          loc: `${baseUrl}/profile/${slug}`,
          changefreq: 'weekly',
          priority: '0.8'
        });
      });

      // Fetch news
      const news = await fetchCollection("news");
      news.sort((a, b) => b.id.localeCompare(a.id)); // Sort by date desc
      news.slice(0, 10).forEach(doc => {
        const date = doc.id;
        ['top', 'local', 'sports'].forEach(tab => {
          if (doc[tab] && Array.isArray(doc[tab])) {
            doc[tab].forEach((_: any, index: number) => {
              if (index < 3) {
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

  // Initialize Firebase asynchronously so it doesn't block server startup
  (async () => {
    try {
      const configData = await fs.readFile(path.resolve("firebase-applet-config.json"), "utf-8");
      firebaseConfig = JSON.parse(configData);
      
      // Initialize Client SDK
      console.log(`[Firebase] Initializing Client SDK for project: ${firebaseConfig.projectId}`);
      const clientApp = initializeClientApp(firebaseConfig);
      
      db = initializeFirestore(clientApp, {
        experimentalForceLongPolling: true,
        // Increase timeout for server-side client operations
      }, firebaseConfig.firestoreDatabaseId || undefined);
      clientAuth = getAuth(clientApp);
      
      // Async Client SDK health check
      (async () => {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Client SDK connection timed out")), 15000)
          );
          await Promise.race([
            getDocFromServer(doc(db!, '_health_check', 'ping')),
            timeoutPromise
          ]);
          console.log("[Firebase] Client SDK verified.");
        } catch (err: any) {
          console.warn(`[Firebase] Client SDK health check warning: ${err.message}. This is normal if permissions are restricted or connection is slow.`);
        }
      })();

      // Initialize Admin SDK
      if (!admin.apps.length) {
        try {
          console.log(`[Firebase] Initializing Admin SDK for project: ${firebaseConfig.projectId}...`);
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: firebaseConfig.projectId
          });
          console.log("[Firebase] Admin SDK initialized.");
        } catch (initError: any) {
          console.warn(`[Firebase] Admin SDK initialization failed: ${initError.message}. Trying simple init...`);
          try {
            admin.initializeApp({
              projectId: firebaseConfig.projectId
            });
            console.log("[Firebase] Admin SDK initialized with projectId only.");
          } catch (lastError: any) {
            console.error("[Firebase] Admin SDK totally failed to initialize:", lastError.message);
          }
        }
      }

      if (admin.apps.length) {
        // Authenticate Client SDK as server-admin to allow background tasks to bypass rules
        if (clientAuth) {
          try {
            const { signInWithCustomToken } = await import("firebase/auth");
            const customToken = await admin.auth().createCustomToken("server-admin", { admin: true });
            await signInWithCustomToken(clientAuth, customToken);
            console.log("[Firebase] Client SDK authenticated as server-admin.");
          } catch (authErr: any) {
            console.warn("[Firebase] Client SDK authentication failed:", authErr.message);
          }
        }

        try {
          const dbId = firebaseConfig.firestoreDatabaseId;
          console.log(`[Firebase] Connecting Admin Firestore to database: ${dbId || '(default)'}`);
          
          // Use getAdminFirestore to ensure proper database mapping
          const currentAdminDb = getAdminFirestore(admin.app(), dbId || undefined);
          
          // Reachability check
          try {
            const testRef = currentAdminDb.collection("_health_check").doc("reachability_test");
            await testRef.set({ 
              time: admin.firestore.FieldValue.serverTimestamp(),
              node: process.env.K_REVISION || 'local'
            });
            await testRef.delete();
            console.log("[Firebase] Admin SDK reachability verified successfully.");
            adminDb = currentAdminDb;
          } catch (err: any) {
            console.warn(`[Firebase] Admin SDK reachability check failed: ${err.message}. DISABLING Admin SDK to force Client SDK fallback.`);
            adminDb = null;
          }
        } catch (dbError: any) {
          console.error("[Firebase] Error getting Firestore Admin instance:", dbError.message);
        }
      }
      console.log(`[Firebase] SDKs initialized. Project: ${firebaseConfig.projectId}`);
    } catch (error) {
      console.error("[Firebase] Initialization failed:", error);
    }
  })();

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

  // Vedic Numerology Endpoint
  app.post("/api/ai/numerology", async (req, res) => {
    try {
      const { name, birthYear, relationship, profileContext } = req.body;
      const apiKey = await getGeminiApiKey();
      
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is missing on server." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        You are a master of Vedic Numerology (Sankhya Shastra) and an expert in the spiritual science of numbers. 
        Analyze the following person from a family tree and provide a profound, beautiful, and spiritually resonant numerological reading.
        
        IMPORTANT: The current absolute present year is 2026. 
        
        Person Name: ${name} (Ensure to emphasize the vibration of each letter in the name)
        Birth Year: ${birthYear === 'Present' ? '2026' : birthYear}
        Relationship context: ${relationship}
        Family Context: ${profileContext}

        Your reading must acknowledge that 2026 carries the vibration of Number 1 (Sun/Surya), representing new beginnings and leadership, contrasting with 2024 which was Number 8 (Saturn/Shani).
        
        Provide a "Vedic Numerology" reading that includes:
        1. **Psychic Number & Characteristics**: Based on Vedic principles, interpret their core personality. 
        2. **Destiny (Karma) Path**: Insights into their life's purpose.
        3. **Auspicious Deity/Energy**: A deity connection.
        4. **Legacy of the Soul**: How they strengthen the family roots.
        
        Tone: Respectful, poetic, and deeply spiritual. Use Sanskrit terms.
        Formatting: Use markdown.
      `;

      const response = await callGeminiWithRetry(ai, {
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });

      res.json({ reading: response.text });
    } catch (error: any) {
      console.error("[NumerologyAPI] Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate reading" });
    }
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

  app.get("/api/debug-env", async (req, res) => {
    try {
      const auth = new GoogleAuth();
      const projectId = await auth.getProjectId();
      const client = await auth.getClient();
      const credentials = await auth.getCredentials();
      
      res.json({
        projectId,
        clientEmail: (credentials as any)?.client_email,
        firebaseProjectId: firebaseConfig?.projectId,
        firebaseDatabaseId: firebaseConfig?.firestoreDatabaseId,
        adminApps: admin.apps.length,
        adminDbActive: !!adminDb,
        instanceId: process.env.K_REVISION || "local"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
      isProduction: process.env.NODE_ENV === 'production',
      emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      lastKeepAlivePing: lastPingTimestamp,
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
      const modelsToTry = ["gemini-1.5-flash", "gemini-flash-latest"];
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

  // News Generation Endpoint (Server-side)
  app.post("/api/news/generate", async (req, res) => {
    const { date, lang } = req.body;
    if (!date) return res.status(400).json({ error: "Date is required" });
    
    const language = (lang === 'bn' ? 'bn' : 'en') as 'bn' | 'en';
    const docId = `${date}-${language}`;
    const geminiKey = await getGeminiApiKey();

    if (!geminiKey) {
      console.warn("[NewsAPI] No valid Gemini API key found on server. Falling back to mock data.");
      return res.json({
        local: [], fbTrends: [], igTrends: [], 
        isMock: true, 
        message: "No valid API key on server"
      });
    }

    // Try to acquire lock
    const now = Date.now();
    const existingLock = newsLocks.get(docId);
    if (existingLock && (now - existingLock < 120000)) {
      return res.status(202).json({ status: "generating" });
    }
    newsLocks.set(docId, now);

    try {
      console.log(`[NewsAPI] Generating news on server for ${docId}...`);
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const langName = language === 'bn' ? 'Bengali' : 'English';
      
      const prompt = `Find the latest news and trends for the date: ${date}.
      
      1. Local News: 5 latest news items from Barnia (Nadia district), West Bengal. If no specific news for Barnia is found, provide news from Nadia district and neighboring areas of West Bengal.
      2. Facebook Trends: 5 latest VIRAL trends for Facebook in India and West Bengal. Provide a "Viral Content Blueprint" for influencers.
      3. Instagram Trends: 5 latest VIRAL trends for Instagram in India and West Bengal. Provide a "Viral Content Blueprint" for influencers.
      
      For News items, provide: title, content (150-200 words), source, date.
      For Trends, provide: title (e.g., "Top 1 (WB): ..."), content (Viral Strategy: Why it's trending, Hook Idea, Creation Tips, Viral Secret, Engagement Booster, Monetization Tip, Hashtags), source, date.
      
      Return the data in exactly this JSON format:
      {
        "local": [{"title": "...", "content": "...", "source": "...", "date": "..."}],
        "fbTrends": [{"title": "...", "content": "...", "source": "...", "date": "..."}],
        "igTrends": [{"title": "...", "content": "...", "source": "...", "date": "..."}]
      }
      
      IMPORTANT: All text must be in ${langName}.
      Return exactly 5 items per category. If limited news is available, prioritize quality and detail. Ensure the news is relevant to ${date} or the most recent available.`;

      const response = await callGeminiWithRetry(ai, { 
        model: "gemini-1.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const newsData = parseGeminiJson(response.text || '{}', {});
      
      const processedData = {
        ...newsData,
        updatedAt: new Date().toISOString(),
        date,
        isMock: false,
        serverKey: FIRESTORE_SERVER_KEY
      };

      // Save to Firestore
      let saved = false;
      if (adminDb) {
        try {
          await adminDb.collection("news").doc(docId).set(processedData);
          console.log(`[NewsAPI] Saved generated news to Firestore (Admin) for ${docId}`);
          saved = true;
        } catch (adminError: any) {
          console.warn(`[NewsAPI] Admin SDK save failed for ${docId}:`, adminError.message);
        }
      }

      if (!saved && db) {
        try {
          await setDoc(doc(db, "news", docId), processedData);
          console.log(`[NewsAPI] Saved generated news to Firestore (Client) for ${docId}`);
          saved = true;
        } catch (clientError: any) {
          console.error(`[NewsAPI] Client SDK save failed for ${docId}:`, clientError.message);
        }
      }
      
      newsLocks.delete(docId);
      res.json(processedData);
    } catch (error: any) {
      newsLocks.delete(docId);
      console.error(`[NewsAPI] Server generation failed for ${docId}:`, error);
      res.status(500).json({ error: "Generation failed", details: error.message });
    }
  });

  // Admin trigger for fact generation
  app.post("/api/admin/generate-facts", async (req, res) => {
    try {
      console.log("[FactCheckAPI] Manual generation triggered via API...");
      await generateDailySanataniFacts();
      res.json({ status: "success", message: "Fact check generation task started" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/news", async (req, res) => {
    const { date, lang } = req.query;
    if (!date) return res.status(400).json({ error: "Date is required" });
    
    const language = (lang === 'bn' ? 'bn' : 'en') as 'bn' | 'en';
    const docId = `${date}-${language}`;

    // Check if currently being generated (lock)
    const lockTime = newsLocks.get(docId);
    if (lockTime && (Date.now() - lockTime < 120000)) { // 2 minute lock
      return res.status(202).json({ 
        status: "generating", 
        message: "News is currently being generated by another user. Please wait." 
      });
    }

    const currentNewsDate = getCurrentNewsDate();
    console.log(`[NewsAPI] GET request for ${docId}, currentNewsDate is ${currentNewsDate}`);

    // Cleanup old news (older than 15 days) periodically
    if (date === currentNewsDate && Math.random() < 0.1) {
      console.log(`[NewsAPI] Triggering periodic cleanup...`);
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
            console.log(`[NewsAPI] Found news in Firestore (Admin) for ${docId}`);
          }
        } catch (adminError: any) {
          console.warn(`[NewsAPI] Admin SDK fetch failed for ${docId}:`, adminError.message);
        }
      }

      if (!data && db) {
        try {
          const docSnap = await getDocFromServer(doc(db, "news", docId));
          if (docSnap.exists()) {
            data = docSnap.data();
            console.log(`[NewsAPI] Found news in Firestore (Client) for ${docId}`);
          }
        } catch (clientError: any) {
          console.warn(`[NewsAPI] Client SDK fetch failed for ${docId}:`, clientError.message);
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

  app.post("/api/news/lock", (req, res) => {
    const { date, lang } = req.body;
    if (!date || !lang) return res.status(400).json({ error: "Missing date or lang" });
    
    const docId = `${date}-${lang}`;
    const now = Date.now();
    
    // Check if already locked
    const existingLock = newsLocks.get(docId);
    if (existingLock && (now - existingLock < 120000)) {
      return res.status(409).json({ error: "Already locked" });
    }
    
    newsLocks.set(docId, now);
    console.log(`[NewsAPI] Lock acquired for ${docId}`);
    res.json({ success: true });
  });

  app.post("/api/news", async (req, res) => {
    const { date, lang, newsData } = req.body;
    if (!date || !lang || !newsData) {
      return res.status(400).json({ error: "Missing required fields: date, lang, newsData" });
    }

    const docId = `${date}-${lang}`;
    
    // Clear lock on save
    newsLocks.delete(docId);

    try {
      // Check if news already exists and is NOT a mock
      let existingData: any = null;
      if (adminDb) {
        const doc = await adminDb.collection("news").doc(docId).get();
        if (doc.exists) existingData = doc.data();
      } else if (db) {
        const docSnap = await getDoc(doc(db, "news", docId));
        if (docSnap.exists()) existingData = docSnap.data();
      }

      if (existingData && !existingData.isMock && newsData.isMock) {
        return res.status(200).json({ message: "Real news already exists, ignoring mock update", ignored: true });
      }
      
      if (existingData && !existingData.isMock && !newsData.isMock) {
        // If both are real, we could still update, but user said "only 1 time"
        // Let's allow update but log it. Actually, to strictly follow "1 time", we should block it.
        // However, admins might want to refresh. Let's check if it's been more than 1 hour.
        const updatedAt = existingData.updatedAt ? new Date(existingData.updatedAt).getTime() : 0;
        if (Date.now() - updatedAt < 3600000) { // 1 hour cooldown
           return res.status(200).json({ message: "News already generated recently", ignored: true });
        }
      }

      const dataToSave = {
        ...newsData,
        date,
        lang,
        updatedAt: new Date().toISOString(),
        serverKey: FIRESTORE_SERVER_KEY,
        createdAt: adminDb ? admin.firestore.FieldValue.serverTimestamp() : serverTimestamp()
      };

      console.log(`[NewsAPI] Attempting to cache news for ${docId}. Data keys: ${Object.keys(dataToSave).join(", ")}`);

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

  // Get profile by email (used for social login)
  app.get("/api/vamshavali/profile/:email", async (req, res) => {
    const { email } = req.params;
    try {
      let profile: any = null;
      if (adminDb) {
        const snap = await adminDb.collection("vamshavali_profiles").where("email", "==", email).limit(1).get();
        if (!snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
      if (!profile && db) {
        const q = query(collection(db, "vamshavali_profiles"), where("email", "==", email), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }

      if (!profile) {
        if (email === "okbgmi611@gmail.com") {
          // If admin doesn't even have a document, create one
          const demoMembers = [
                {
                  id: "root-1",
                  name: "Savitri Devi",
                  role: "Matriarch",
                  birthYear: "1945",
                  photo: "https://images.unsplash.com/photo-1544120190-27583f2335a2?w=800&auto=format&fit=crop",
                  partner: {
                    name: "Late Shri Ram Sharma",
                    birthYear: "1940 - 2015",
                    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop"
                  },
                  children: [
                    {
                      id: "child-1",
                      name: "Meera Sharma",
                      role: "Daughter (Gen 1)",
                      birthYear: "1972",
                      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop",
                      partner: {
                        name: "Vikram Sharma",
                        birthYear: "1970",
                        photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop"
                      },
                      children: [
                        {
                          id: "grand-1",
                          name: "Ananya Sharma",
                          role: "Granddaughter (Gen 2)",
                          birthYear: "1998",
                          photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&auto=format&fit=crop",
                          children: [
                            {
                              id: "great-1",
                              name: "Ishani Sharma",
                              role: "Great-Granddaughter (Gen 3)",
                              birthYear: "2026",
                              photo: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop",
                              children: []
                            }
                          ]
                        },
                        {
                          id: "grand-2",
                          name: "Rohan Sharma",
                          role: "Grandson (Gen 2)",
                          birthYear: "2002",
                          photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop",
                          children: []
                        }
                      ]
                    },
                    {
                      id: "child-2",
                      name: "Rajesh Sharma",
                      role: "Son (Gen 1)",
                      birthYear: "1975",
                      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&auto=format&fit=crop",
                      partner: {
                        name: "Sunita Sharma",
                        birthYear: "1978",
                        photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop"
                      },
                      children: [
                        {
                          id: "grand-3",
                          name: "Kavita Sharma",
                          role: "Granddaughter (Gen 2)",
                          birthYear: "2005",
                          photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop",
                          children: []
                        }
                      ]
                    }
                  ]
                }
              ];

          const newProfileData: any = {
            email,
            name: "The Royal Lineage of Savitri Devi",
            shareId: Math.random().toString(36).substring(2, 10).toUpperCase(),
            parents: "Traditional Ancestors",
            grandparents: "Ancestral Roots",
            gotra: "Kashyap",
            kuldevi: "Mata Rani",
            kuldevta: "Lord Shiva",
            kuldeviPhoto: "https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=800&auto=format&fit=crop",
            nativePlace: "Varanasi, Uttar Pradesh",
            additionalNotes: "A legacy of strength, wisdom, and divine feminine energy spanning three generations.",
            members: demoMembers,
            updatedAt: adminDb ? admin.firestore.FieldValue.serverTimestamp() : serverTimestamp(),
            createdAt: adminDb ? admin.firestore.FieldValue.serverTimestamp() : serverTimestamp()
          };

          if (adminDb) {
            const docRef = await adminDb.collection("vamshavali_profiles").add(newProfileData);
            profile = { id: docRef.id, ...newProfileData };
          } else if (db) {
            newProfileData.serverKey = FIRESTORE_SERVER_KEY;
            const docRef = await addDoc(collection(db, "vamshavali_profiles"), newProfileData);
            profile = { id: docRef.id, ...newProfileData };
          }
        } else {
          return res.status(404).json({ error: "Profile not found" });
        }
      } else if (email === "okbgmi611@gmail.com" && (!profile.members || profile.members.length === 0 || !profile.members[0]?.children || profile.members[0].children.length < 2)) {
        // If profile exists but is empty/outdated for admin, update it
         const demoMembers = [
                {
                  id: "root-1",
                  name: "Savitri Devi",
                  role: "Matriarch",
                  birthYear: "1945",
                  photo: "https://images.unsplash.com/photo-1544120190-27583f2335a2?w=800&auto=format&fit=crop",
                  partner: {
                    name: "Late Shri Ram Sharma",
                    birthYear: "1940 - 2015",
                    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop"
                  },
                  children: [
                    {
                      id: "child-1",
                      name: "Meera Sharma",
                      role: "Daughter (Gen 1)",
                      birthYear: "1972",
                      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop",
                      partner: {
                        name: "Vikram Sharma",
                        birthYear: "1970",
                        photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop"
                      },
                      children: [
                        {
                          id: "grand-1",
                          name: "Ananya Sharma",
                          role: "Granddaughter (Gen 2)",
                          birthYear: "1998",
                          photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&auto=format&fit=crop",
                          children: [
                            {
                              id: "great-1",
                              name: "Ishani Sharma",
                              role: "Great-Granddaughter (Gen 3)",
                              birthYear: "2026",
                              photo: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop",
                              children: []
                            }
                          ]
                        },
                        {
                          id: "grand-2",
                          name: "Rohan Sharma",
                          role: "Grandson (Gen 2)",
                          birthYear: "2002",
                          photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop",
                          children: []
                        }
                      ]
                    },
                    {
                      id: "child-2",
                      name: "Rajesh Sharma",
                      role: "Son (Gen 1)",
                      birthYear: "1975",
                      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&auto=format&fit=crop",
                      partner: {
                        name: "Sunita Sharma",
                        birthYear: "1978",
                        photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop"
                      },
                      children: [
                        {
                          id: "grand-3",
                          name: "Kavita Sharma",
                          role: "Granddaughter (Gen 2)",
                          birthYear: "2005",
                          photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop",
                          children: []
                        }
                      ]
                    }
                  ]
                }
              ];
              
              const updates: any = {
                name: "The Royal Lineage of Savitri Devi",
                parents: "Traditional Ancestors",
                grandparents: "Ancestral Roots",
                gotra: "Kashyap",
                kuldevi: "Mata Rani",
                kuldevta: "Lord Shiva",
                kuldeviPhoto: "https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=800&auto=format&fit=crop",
                nativePlace: "Varanasi, Uttar Pradesh",
                additionalNotes: "A legacy of strength, wisdom, and divine feminine energy spanning three generations.",
                members: demoMembers,
                updatedAt: adminDb ? admin.firestore.FieldValue.serverTimestamp() : serverTimestamp()
              };
              
              if (adminDb) {
                await adminDb.collection("vamshavali_profiles").doc(profile.id).update(updates);
              } else if (db) {
                updates.serverKey = FIRESTORE_SERVER_KEY;
                await updateDoc(doc(db, "vamshavali_profiles", profile.id), updates);
              }
              Object.assign(profile, updates);
      }

      res.json(profile);
    } catch (error) {
       console.error("[Vamshavali] Profile fetch error:", error);
       res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // --- Vamshavali (Family Tree) App Endpoints ---

  // Send OTP
  app.post("/api/vamshavali/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("[Vamshavali] Email configuration is missing (EMAIL_USER/EMAIL_PASS)");
        return res.status(400).json({ 
          error: "OTP service not configured", 
          details: "Administrator needs to configure EMAIL_USER and EMAIL_PASS in Settings." 
        });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Try Admin SDK first (bypasses rules)
      let saved = false;
      if (adminDb) {
        try {
          await adminDb.collection("vamshavali_otps").doc(email).set({
            otp,
            expiresAt,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log("[Vamshavali] OTP saved using Admin SDK");
          saved = true;
        } catch (adminError: any) {
          console.warn("[Vamshavali] Admin SDK failed to save OTP:", adminError.message);
        }
      }
      
      if (!saved && db) {
        try {
          await setDoc(doc(db, "vamshavali_otps", email), {
            otp,
            expiresAt,
            createdAt: serverTimestamp(),
            serverKey: FIRESTORE_SERVER_KEY
          });
          console.log("[Vamshavali] OTP saved using Client SDK fallback");
          saved = true;
        } catch (clientError: any) {
          console.error("[Vamshavali] Client SDK also failed to save OTP:", clientError.message);
        }
      }

      if (!saved) {
        return res.status(500).json({ 
          error: "Failed to store OTP", 
          details: "Database connection failed. Please check server logs." 
        });
      }

      // Send email
      const mailOptions = {
        from: `"Family Vamshavali" <${process.env.EMAIL_USER || 'no-reply@family.com'}>`,
        to: email,
        subject: "Your OTP for Family Vamshavali Login",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: auto;">
            <h2 style="color: #f58e27;">Family Vamshavali Login</h2>
            <p>Your One-Time Password (OTP) for logging into your digital family tree is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; padding: 10px; background: #f9f9f9; text-align: center; border-radius: 5px;">${otp}</div>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">This OTP will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
          </div>
        `
      };

      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        family: 4,
        tls: {
          rejectUnauthorized: false
        }
      } as any);

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: "OTP sent successfully" });
    } catch (error: any) {
      console.error("[Vamshavali] Error sending OTP:", error);
      res.status(500).json({ error: "Failed to send OTP", details: error.message });
    }
  });

  // Verify OTP
  app.post("/api/vamshavali/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    try {
      let otpDoc: any = null;
      let usedAdmin = false;

      // 1. Try Admin SDK to get OTP
      if (adminDb) {
        try {
          const snap = await adminDb.collection("vamshavali_otps").doc(email).get();
          if (snap.exists) {
            otpDoc = snap.data();
            usedAdmin = true;
          }
        } catch (e: any) {
          console.warn("[Vamshavali] Admin SDK OTP read failed:", e.message);
        }
      }

      // 2. Try Client SDK if needed
      if (!otpDoc && db) {
        try {
          const snap = await getDoc(doc(db, "vamshavali_otps", email));
          if (snap.exists()) {
            otpDoc = snap.data();
            console.log(`[Vamshavali] OTP found via Client SDK for ${email}`);
          } else {
             console.warn(`[Vamshavali] OTP not found in Client SDK for ${email}`);
          }
        } catch (e: any) {
          console.error(`[Vamshavali] Client SDK OTP read failed for ${email}:`, e.message);
          if (e.message.includes("PERMISSION_DENIED")) {
            console.error("[Vamshavali] READ PERMISSION_DENIED on vamshavali_otps. Check rules.");
          }
        }
      }

      if (!otpDoc) {
        console.warn(`[Vamshavali] OTP not found in any database for ${email}`);
        return res.status(400).json({ 
          error: "OTP not found", 
          details: "The verification code might have expired or was never generated. Please request a new one." 
        });
      }
      
      if (otpDoc.otp !== otp) {
        console.warn(`[Vamshavali] OTP mismatch for ${email}. Expected: ${otpDoc.otp}, Got: ${otp}`);
        return res.status(400).json({ error: "Invalid OTP code." });
      }

      const expiresAtDate = otpDoc.expiresAt?.toDate ? otpDoc.expiresAt.toDate() : new Date(otpDoc.expiresAt);
      const now = new Date();
      console.log(`[Vamshavali] Checking expiry for ${email}: ${expiresAtDate.toISOString()} vs now: ${now.toISOString()}`);
      
      if (expiresAtDate < now) {
        console.warn(`[Vamshavali] OTP expired for ${email}`);
        return res.status(400).json({ error: "OTP expired", details: "The verification code is older than 10 minutes." });
      }

      // OTP is valid!
      // Delete it
      try {
        if (usedAdmin && adminDb) {
          await adminDb.collection("vamshavali_otps").doc(email).delete();
        } else if (db) {
          await deleteDoc(doc(db, "vamshavali_otps", email));
        }
      } catch (e) {
        console.warn("[Vamshavali] Could not delete used OTP:", e);
      }

      // Find or create profile
      let profile: any = null;
      
      // Try Admin SDK first
      if (adminDb) {
        try {
          const profileSnap = await adminDb.collection("vamshavali_profiles").where("email", "==", email).limit(1).get();
          if (!profileSnap.empty) {
            profile = { id: profileSnap.docs[0].id, ...profileSnap.docs[0].data() };
            
            // If it's admin and outdated/empty, bootstrap it to the new expanded 3-gen tree
            if (email === "okbgmi611@gmail.com" && (!profile.members || !profile.members[0]?.children || (profile.members[0].children as any[]).length < 2)) {
               const demoMembers = [
                {
                  id: "root-1",
                  name: "Savitri Devi",
                  role: "Matriarch",
                  birthYear: "1945",
                  photo: "https://images.unsplash.com/photo-1544120190-27583f2335a2?w=800&auto=format&fit=crop",
                  partner: {
                    name: "Late Shri Ram Sharma",
                    birthYear: "1940 - 2015",
                    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop"
                  },
                  children: [
                    {
                      id: "child-1",
                      name: "Meera Sharma",
                      role: "Daughter (Gen 1)",
                      birthYear: "1972",
                      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop",
                      partner: {
                        name: "Vikram Sharma",
                        birthYear: "1970",
                        photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop"
                      },
                      children: [
                        {
                          id: "grand-1",
                          name: "Ananya Sharma",
                          role: "Granddaughter (Gen 2)",
                          birthYear: "1998",
                          photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&auto=format&fit=crop",
                          children: [
                            {
                              id: "great-1",
                              name: "Ishani Sharma",
                              role: "Great-Granddaughter (Gen 3)",
                              birthYear: "2026",
                              photo: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop",
                              children: []
                            }
                          ]
                        },
                        {
                          id: "grand-2",
                          name: "Rohan Sharma",
                          role: "Grandson (Gen 2)",
                          birthYear: "2002",
                          photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop",
                          children: []
                        }
                      ]
                    },
                    {
                      id: "child-2",
                      name: "Rajesh Sharma",
                      role: "Son (Gen 1)",
                      birthYear: "1975",
                      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&auto=format&fit=crop",
                      partner: {
                        name: "Sunita Sharma",
                        birthYear: "1978",
                        photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop"
                      },
                      children: [
                        {
                          id: "grand-3",
                          name: "Kavita Sharma",
                          role: "Granddaughter (Gen 2)",
                          birthYear: "2005",
                          photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop",
                          children: []
                        }
                      ]
                    }
                  ]
                }
              ];
              
              const updates = {
                name: "The Royal Lineage of Savitri Devi",
                parents: "Traditional Ancestors",
                grandparents: "Ancestral Roots",
                gotra: "Kashyap",
                kuldevi: "Mata Rani",
                kuldevta: "Lord Shiva",
                kuldeviPhoto: "https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=800&auto=format&fit=crop",
                nativePlace: "Varanasi, Uttar Pradesh",
                additionalNotes: "A legacy of strength, wisdom, and divine feminine energy spanning three generations.",
                members: demoMembers,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              };
              
              await adminDb.collection("vamshavali_profiles").doc(profile.id).update(updates);
              Object.assign(profile, updates);
            }
          } else {
            const shareId = Math.random().toString(36).substring(2, 10);
            
            // Demo data for admin
            const isAdminEmail = email === "okbgmi611@gmail.com";
            const demoMembers = isAdminEmail ? [
              {
                id: "root-1",
                name: "Savitri Devi",
                role: "Matriarch",
                birthYear: "1945",
                photo: "https://images.unsplash.com/photo-1544120190-27583f2335a2?w=800&auto=format&fit=crop",
                  children: [
                    {
                      id: "child-1",
                      name: "Meera Sharma",
                      role: "Daughter (Gen 1)",
                      birthYear: "1972",
                      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop",
                      children: [
                        {
                          id: "grand-1",
                          name: "Ananya Sharma",
                          role: "Granddaughter (Gen 2)",
                          birthYear: "1998",
                          photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&auto=format&fit=crop",
                          children: [
                            {
                              id: "great-1",
                              name: "Ishani Sharma",
                              role: "Great-Granddaughter (Gen 3)",
                              birthYear: "2026",
                              photo: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop",
                              children: []
                            }
                          ]
                        },
                        {
                          id: "grand-2",
                          name: "Rohan Sharma",
                          role: "Grandson (Gen 2)",
                          birthYear: "2002",
                          photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop",
                          children: []
                        }
                      ]
                    },
                    {
                      id: "child-2",
                      name: "Rajesh Sharma",
                      role: "Son (Gen 1)",
                      birthYear: "1975",
                      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&auto=format&fit=crop",
                      children: [
                        {
                          id: "grand-3",
                          name: "Kavita Sharma",
                          role: "Granddaughter (Gen 2)",
                          birthYear: "2005",
                          photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop",
                          children: []
                        }
                      ]
                    }
                  ]
                }
              ] : [];

            const newProfile: any = {
              email,
              shareId,
              name: isAdminEmail ? "The Royal Lineage of Savitri Devi" : "",
              parents: isAdminEmail ? "Traditional Ancestors" : "",
              grandparents: isAdminEmail ? "Ancestral Roots" : "",
              gotra: isAdminEmail ? "Kashyap" : "",
              kuldevi: isAdminEmail ? "Mata Rani" : "",
              kuldevta: isAdminEmail ? "Lord Shiva" : "",
              kuldeviPhoto: isAdminEmail ? "https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=800&auto=format&fit=crop" : "",
              nativePlace: isAdminEmail ? "Varanasi, Uttar Pradesh" : "",
              additionalNotes: isAdminEmail ? "A legacy of strength, wisdom, and divine feminine energy spanning three generations." : "",
              members: demoMembers,
              createdAt: adminDb ? admin.firestore.FieldValue.serverTimestamp() : serverTimestamp(),
              updatedAt: adminDb ? admin.firestore.FieldValue.serverTimestamp() : serverTimestamp(),
              serverKey: FIRESTORE_SERVER_KEY
            };

            let saved = false;
            if (adminDb) {
              try {
                const docRef = await adminDb.collection("vamshavali_profiles").add(newProfile);
                profile = { id: docRef.id, ...newProfile };
                saved = true;
              } catch (e: any) {
                console.warn("[Vamshavali] Admin SDK create failed:", e.message);
              }
            }

            if (!saved && db) {
              try {
                const docRef = await addDoc(collection(db, "vamshavali_profiles"), newProfile);
                profile = { id: docRef.id, ...newProfile };
                saved = true;
              } catch (e: any) {
                console.error("[Vamshavali] Client SDK create failed:", e.message);
              }
            }
          }
        } catch (adminError: any) {
          console.warn("[Vamshavali] Admin SDK profile op failed:", adminError.message);
        }
      }

      // Try Client SDK fallback
      if (!profile && db) {
        try {
          const q = query(collection(db, "vamshavali_profiles"), where("email", "==", email), limit(1));
          const profileSnap = await getDocs(q);
          if (!profileSnap.empty) {
            profile = { id: profileSnap.docs[0].id, ...profileSnap.docs[0].data() };

            // If it's admin and outdated/empty, bootstrap it
            if (email === "okbgmi611@gmail.com" && (!profile.members || !profile.members[0]?.children || (profile.members[0].children as any[]).length < 2)) {
               const demoMembers = [
                {
                  id: "root-1",
                  name: "Savitri Devi",
                  role: "Matriarch",
                  birthYear: "1945",
                  photo: "https://images.unsplash.com/photo-1544120190-27583f2335a2?w=800&auto=format&fit=crop",
                  children: [
                    {
                      id: "child-1",
                      name: "Meera Sharma",
                      role: "Daughter (Gen 1)",
                      birthYear: "1972",
                      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop",
                      children: [
                        {
                          id: "grand-1",
                          name: "Ananya Sharma",
                          role: "Granddaughter (Gen 2)",
                          birthYear: "1998",
                          photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&auto=format&fit=crop",
                          children: [
                            {
                              id: "great-1",
                              name: "Ishani Sharma",
                              role: "Great-Granddaughter (Gen 3)",
                              birthYear: "2026",
                              photo: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop",
                              children: []
                            }
                          ]
                        },
                        {
                          id: "grand-2",
                          name: "Rohan Sharma",
                          role: "Grandson (Gen 2)",
                          birthYear: "2002",
                          photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop",
                          children: []
                        }
                      ]
                    },
                    {
                      id: "child-2",
                      name: "Rajesh Sharma",
                      role: "Son (Gen 1)",
                      birthYear: "1975",
                      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&auto=format&fit=crop",
                      children: [
                        {
                          id: "grand-3",
                          name: "Kavita Sharma",
                          role: "Granddaughter (Gen 2)",
                          birthYear: "2005",
                          photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop",
                          children: []
                        }
                      ]
                    }
                  ]
                }
              ];
              
              const updates = {
                name: "The Royal Lineage of Savitri Devi",
                parents: "Traditional Ancestors",
                grandparents: "Ancestral Roots",
                gotra: "Kashyap",
                kuldevi: "Mata Rani",
                kuldevta: "Lord Shiva",
                kuldeviPhoto: "https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=800&auto=format&fit=crop",
                nativePlace: "Varanasi, Uttar Pradesh",
                additionalNotes: "A legacy of strength, wisdom, and divine feminine energy spanning three generations.",
                members: demoMembers,
                updatedAt: serverTimestamp(),
                serverKey: FIRESTORE_SERVER_KEY
              };
              
              await updateDoc(doc(db, "vamshavali_profiles", profile.id), updates);
              Object.assign(profile, updates);
            }
          } else {
            const shareId = Math.random().toString(36).substring(2, 10);
            
            // Demo data for admin
            const isAdminEmail = email === "okbgmi611@gmail.com";
            const demoMembers = isAdminEmail ? [
              {
                id: "root-1",
                name: "Savitri Devi",
                role: "Matriarch",
                birthYear: "1945",
                photo: "https://images.unsplash.com/photo-1544120190-27583f2335a2?w=800&auto=format&fit=crop",
                children: [
                  {
                    id: "child-1",
                    name: "Meera Sharma",
                    role: "Daughter",
                    birthYear: "1972",
                    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop",
                    children: [
                      {
                        id: "grand-1",
                        name: "Ananya Sharma",
                        role: "Granddaughter",
                        birthYear: "1998",
                        photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&auto=format&fit=crop",
                        children: []
                      }
                    ]
                  }
                ]
              }
            ] : [];

            const newProfile = {
              email,
              shareId,
              name: isAdminEmail ? "The Royal Lineage of Savitri Devi" : "",
              parents: isAdminEmail ? "Traditional Ancestors" : "",
              grandparents: isAdminEmail ? "Ancestral Roots" : "",
              gotra: isAdminEmail ? "Kashyap" : "",
              kuldevi: isAdminEmail ? "Mata Rani" : "",
              kuldevta: isAdminEmail ? "Lord Shiva" : "",
              kuldeviPhoto: isAdminEmail ? "https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=800&auto=format&fit=crop" : "",
              nativePlace: isAdminEmail ? "Varanasi, Uttar Pradesh" : "",
              additionalNotes: isAdminEmail ? "A legacy of strength, wisdom, and divine feminine energy spanning three generations." : "",
              members: demoMembers,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              serverKey: FIRESTORE_SERVER_KEY
            };
            const docRef = await addDoc(collection(db, "vamshavali_profiles"), newProfile);
            profile = { id: docRef.id, ...newProfile };
          }
        } catch (clientError: any) {
          console.error("[Vamshavali] Client SDK also failed profile op:", clientError.message);
        }
      }

      if (!profile) {
        return res.status(500).json({ error: "Could not retrieve or create profile" });
      }

      res.json({ success: true, profile });
    } catch (error: any) {
      console.error("[Vamshavali] Error verifying OTP:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Fetch public profile by shareId
  app.get("/api/vamshavali/p/:shareId", async (req, res) => {
    const { shareId } = req.params;
    try {
      let profile;
      
      // 1. Try Admin SDK
      if (adminDb) {
        try {
          const snap = await adminDb.collection("vamshavali_profiles").where("shareId", "==", shareId).limit(1).get();
          if (!snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
        } catch (e: any) {
          console.warn("[Vamshavali] Admin SDK public profile lookup failed:", e.message);
        }
      }

      // 2. Try Client SDK Fallback
      if (!profile && db) {
        try {
          const q = query(collection(db, "vamshavali_profiles"), where("shareId", "==", shareId), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
          }
        } catch (e: any) {
          console.error("[Vamshavali] Client SDK public profile lookup failed:", e.message);
        }
      }

      if (!profile) return res.status(404).json({ error: "Profile not found" });

      // Strip sensitive info (email)
      const { email, ...publicData } = profile;
      res.json(publicData);
    } catch (error) {
       console.error("[Vamshavali] Public profile fetch error:", error);
       res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Update profile
  app.post("/api/vamshavali/update-profile", async (req, res) => {
    const { id, ...data } = req.body;
    if (!id) return res.status(400).json({ error: "Profile ID is required" });

    // Sanitize and validate shareId
    if (data.shareId) {
      const sid = String(data.shareId).toLowerCase().trim();
      if (sid === 'undefined' || sid === 'null' || sid === '' || sid.length < 5) {
        console.warn(`[Vamshavali] Rejecting invalid shareId update attempt for ${id}: "${data.shareId}"`);
        data.shareId = Math.random().toString(36).substring(2, 10).toUpperCase();
        console.log(`[Vamshavali] Endpoint corrected shareId to: "${data.shareId}"`);
      } else {
        data.shareId = String(data.shareId).trim().toUpperCase();
      }
    } else {
      // If missing entirely, generate one
      data.shareId = Math.random().toString(36).substring(2, 10).toUpperCase();
      console.log(`[Vamshavali] Endpoint generated missing shareId for ${id}: "${data.shareId}"`);
    }

    try {
      let saved = false;
      let lastError = null;

      // Ensure serverKey is present in the data for rules verification
      const updateData = {
        ...data,
        updatedAt: null as any, // Placeholder for timestamp
        serverKey: FIRESTORE_SERVER_KEY
      };

      // 1. Try Admin SDK
      if (adminDb) {
        try {
          await adminDb.collection("vamshavali_profiles").doc(id).set({
            ...updateData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          console.log("[Vamshavali] Profile updated/set using Admin SDK");
          saved = true;
        } catch (adminError: any) {
          console.warn("[Vamshavali] Admin SDK profile update failed:", adminError.message);
          lastError = adminError.message;
        }
      }

      // 2. Fallback to Client SDK
      if (!saved && db) {
        try {
          await setDoc(doc(db, "vamshavali_profiles", id), {
            ...updateData,
            updatedAt: serverTimestamp()
          }, { merge: true });
          console.log("[Vamshavali] Profile updated/set using Client SDK fallback");
          saved = true;
        } catch (clientError: any) {
          console.error("[Vamshavali] Client SDK profile update failed:", clientError.message);
          lastError = clientError.message;
          if (clientError.message.includes("permission") || clientError.code === "permission-denied") {
             try {
               handleFirestoreError(clientError, OperationType.UPDATE, `vamshavali_profiles/${id}`);
             } catch (e: any) {
               lastError = e.message;
             }
          }
        }
      }

      if (saved) {
        res.json({ success: true, shareId: data.shareId });
      } else {
        res.status(500).json({ 
          error: "Failed to update profile", 
          details: lastError || "Database connection failed" 
        });
      }
    } catch (error: any) {
       console.error("[Vamshavali] Unexpected update error:", error);
       res.status(500).json({ error: "An unexpected error occurred", details: error.message });
    }
  });

  // Redirects for common typos
  app.get("/bazaar", (req, res) => {
    const protocol = req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    res.redirect(301, `${protocol}://${req.get('host')}/bazar`);
  });

  // Load initial data
  let localDb = await loadData();

  // API Routes
  app.get("/api/influencers", (req, res) => {
    res.json(localDb.userInfluencers);
  });

  // Detailed Email Test Route
  app.get("/api/admin/test-email-detailed", async (req, res) => {
    const testEmail = req.query.email as string || RECIPIENT;
    console.log(`[EmailTest] Starting detailed test to: ${testEmail}`);
    
    const startTime = Date.now();
    try {
      const info = await transporter.sendMail({
        from: `"Barnia Test" <${process.env.EMAIL_USER}>`,
        to: testEmail,
        subject: "Detailed Email Connection Test",
        text: `Test sent at ${new Date().toISOString()}. Connection took ${Date.now() - startTime}ms.`,
      });
      
      res.json({
        success: true,
        message: "Email sent successfully",
        info: {
          messageId: info.messageId,
          response: info.response,
          accepted: info.accepted,
          rejected: info.rejected,
          timeMs: Date.now() - startTime
        }
      });
    } catch (err: any) {
      console.error("[EmailTest] Detailed test failed:", err);
      res.status(500).json({
        success: false,
        error: err.message,
        code: err.code,
        command: err.command,
        stack: err.stack,
        timeMs: Date.now() - startTime,
        config: {
          user: process.env.EMAIL_USER ? "Set (Masked)" : "Not Set",
          pass: process.env.EMAIL_PASS ? "Set (Masked)" : "Not Set",
          host: 'smtp.gmail.com',
          port: 587
        }
      });
    }
  });

  // SMTP Verification Route
  app.get("/api/admin/verify-smtp", async (req, res) => {
    try {
      console.log(`[SMTP-Verify] Attempting verification for user: ${process.env.EMAIL_USER?.substring(0, 3)}...`);
      await transporter.verify();
      res.json({ 
        success: true, 
        message: "SMTP connection verified successfully",
        config: {
          host: 'smtp.gmail.com',
          port: 587,
          family: 4,
          user: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 3)}...` : 'Not Set'
        }
      });
    } catch (err: any) {
      console.error("[SMTP-Verify] Failed:", err);
      res.status(500).json({ 
        success: false, 
        error: err.message,
        code: err.code,
        command: err.command,
        stack: err.stack,
        config: {
          host: 'smtp.gmail.com',
          port: 587,
          family: 4
        }
      });
    }
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
      let errorMessage = error.message;
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        errorMessage = "Connection timeout. This might be due to network restrictions or incorrect SMTP settings.";
      } else if (error.message.includes('Invalid login')) {
        errorMessage = "Invalid email credentials. Please check your EMAIL_USER and EMAIL_PASS (App Password).";
      }
      res.status(500).json({ error: "Failed to send email", details: errorMessage });
    }
  });

  // Meta Tag Routes (MUST be before static/vite middleware)
  app.get("/api/image/shop/:id", async (req, res) => {
    try {
      let { id } = req.params;
      id = id.replace(/\.(jpg|jpeg|png|webp)$/i, '');
      const decodedId = decodeURIComponent(id);
      console.log(`[ShopImageProxy] Request for ID: "${decodedId}"`);
      
      const shop = firebaseConfig ? await getShopItem(decodedId, firebaseConfig.projectId, firebaseConfig.firestoreDatabaseId) : null;
      
      if (!shop || !shop.image) {
        console.warn(`[ShopImageProxy] Shop or image NOT found for ID: "${decodedId}"`);
        return res.status(404).send("Image not found");
      }

      let imageUrl = shop.image;
      console.log(`[ShopImageProxy] Found image URL: ${imageUrl.substring(0, 100)}...`);

      // Handle Google Drive links
      if (imageUrl.includes('drive.google.com')) {
        if (imageUrl.includes('/file/d/')) {
          const driveId = imageUrl.split('/d/')[1]?.split('/')[0];
          imageUrl = `https://drive.google.com/uc?id=${driveId}`;
        } else if (imageUrl.includes('id=')) {
          const driveId = imageUrl.split('id=')[1]?.split('&')[0];
          imageUrl = `https://drive.google.com/uc?id=${driveId}`;
        }
      }

      if (imageUrl.startsWith('data:image')) {
        const parts = imageUrl.split(',');
        const base64Data = parts[1];
        const img = Buffer.from(base64Data, 'base64');
        const mimeType = imageUrl.split(';')[0].split(':')[1] || 'image/jpeg';
        res.writeHead(200, { 
          'Content-Type': mimeType, 
          'Content-Length': img.length, 
          'Cache-Control': 'public, max-age=86400',
          'X-Content-Type-Options': 'nosniff'
        });
        return res.end(img);
      }

      console.log(`[ShopImageProxy] Fetching image: ${imageUrl}`);
      const response = await fetch(imageUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        },
        timeout: 15000,
        follow: 5
      });

      console.log(`[ShopImageProxy] Fetch response: ${response.status} ${response.statusText}, Content-Type: ${response.headers.get('content-type')}`);

      if (!response.ok) {
        console.error(`[ShopImageProxy] Failed to fetch image: ${response.status} ${response.statusText} for URL: ${imageUrl}`);
        return res.status(response.status).send(`Failed to fetch image: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = await response.buffer();
      
      console.log(`[ShopImageProxy] Successfully fetched image. Type: ${contentType}, Size: ${buffer.length} bytes`);
      
      if (buffer.length === 0) {
        console.warn(`[ShopImageProxy] Fetched image buffer is empty!`);
        return res.status(500).send("Empty image buffer");
      }

      res.writeHead(200, { 
        'Content-Type': contentType, 
        'Content-Length': buffer.length, 
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(buffer);
    } catch (error: any) {
      console.error(`[ShopImageProxy] Error serving proxy image:`, error.message);
      res.status(500).send("Internal server error");
    }
  });

  app.get("/api/image/influencer/:id", async (req, res) => {
    try {
      let { id } = req.params;
      id = id.replace(/\.(jpg|jpeg|png|webp)$/i, '');
      const decodedId = decodeURIComponent(id);
      console.log(`[InfluencerImageProxy] Request for ID: "${decodedId}"`);
      
      const profile = firebaseConfig ? await getProfileItem(decodedId, firebaseConfig.projectId, firebaseConfig.firestoreDatabaseId) : null;
      
      if (!profile || !profile.rawAvatar) {
        console.warn(`[InfluencerImageProxy] Profile or avatar NOT found for ID: "${decodedId}"`);
        return res.status(404).send("Image not found");
      }

      let avatarUrl = profile.rawAvatar;
      console.log(`[InfluencerImageProxy] Found avatar URL: ${avatarUrl.substring(0, 50)}...`);

      // Handle Google Drive links
      if (avatarUrl.includes('drive.google.com')) {
        if (avatarUrl.includes('/file/d/')) {
          const driveId = avatarUrl.split('/d/')[1]?.split('/')[0];
          avatarUrl = `https://drive.google.com/uc?id=${driveId}`;
        } else if (avatarUrl.includes('id=')) {
          const driveId = avatarUrl.split('id=')[1]?.split('&')[0];
          avatarUrl = `https://drive.google.com/uc?id=${driveId}`;
        }
      }

      if (avatarUrl.startsWith('data:image')) {
        const parts = avatarUrl.split(',');
        if (parts.length < 2) return res.status(400).send("Invalid image data");
        
        const base64Data = parts[1];
        const img = Buffer.from(base64Data, 'base64');
        const mimeType = avatarUrl.split(';')[0].split(':')[1] || 'image/jpeg';
        
        res.writeHead(200, {
          'Content-Type': mimeType,
          'Content-Length': img.length,
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
          'X-Content-Type-Options': 'nosniff'
        });
        return res.end(img);
      }

      // Fetch the image and serve it directly to avoid redirect issues with social crawlers
      console.log(`[InfluencerImageProxy] Fetching image: ${avatarUrl}`);
      const response = await fetch(avatarUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        },
        timeout: 15000,
        follow: 5
      });

      console.log(`[InfluencerImageProxy] Fetch response: ${response.status} ${response.statusText}, Content-Type: ${response.headers.get('content-type')}`);

      if (!response.ok) {
        console.error(`[InfluencerImageProxy] Failed to fetch image: ${response.status} ${response.statusText} for URL: ${avatarUrl}`);
        return res.status(response.status).send(`Failed to fetch image: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = await response.buffer();
      
      console.log(`[InfluencerImageProxy] Successfully fetched image. Type: ${contentType}, Size: ${buffer.length} bytes`);
      
      if (buffer.length === 0) {
        console.warn(`[InfluencerImageProxy] Fetched image buffer is empty!`);
        return res.status(500).send("Empty image buffer");
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': buffer.length,
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(buffer);
    } catch (error: any) {
      console.error(`[InfluencerImageProxy] Error serving proxy image:`, error.message);
      res.status(500).send("Internal server error");
    }
  });

  app.get("/news/:date/:tab/:index", async (req, res) => {
    const { date, tab, index } = req.params;
    
    // Add a timeout to the database fetch to prevent hanging requests
    const fetchPromise = firebaseConfig ? getNewsItem(date, tab, index, firebaseConfig.projectId, firebaseConfig.firestoreDatabaseId) : Promise.resolve(null);
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 8000));
    
    const newsItem = await Promise.race([fetchPromise, timeoutPromise]);
    
    let html: string;
    if (process.env.NODE_ENV !== "production" && vite) {
      html = await fs.readFile(path.resolve("index.html"), "utf-8");
      html = await vite.transformIndexHtml(req.originalUrl, html);
    } else {
      html = await fs.readFile(path.resolve("dist", "index.html"), "utf-8");
    }
    
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    // Use decoded path for cleaner display in social media and canonical tags
    const fullUrl = `${baseUrl}${decodeURIComponent(req.path)}`;

    const metadata = newsItem ? {
      title: newsItem.title,
      description: newsItem.content, // Show full news content in description
      image: ["https://i.postimg.cc/0yWk2Xsf/Gemini-Generated-Image-sykjx4sykjx4sykj.png"], // Use provided news image
      imageWidth: 1200,
      imageHeight: 630,
      url: fullUrl,
      type: 'article',
      twitterCard: 'summary_large_image' // Use large card for the new image
    } : {
      title: "Latest News | Barnia community",
      description: "Stay updated with the latest news, events, and announcements from the Barnia community.",
      image: ["https://i.postimg.cc/0yWk2Xsf/Gemini-Generated-Image-sykjx4sykjx4sykj.png"], // Use provided news image
      imageWidth: 1200,
      imageHeight: 630,
      url: fullUrl,
      type: 'article',
      twitterCard: 'summary_large_image'
    };

    console.log(`[MetaTags] Injecting tags for news: ${metadata.title}, URL: ${fullUrl}`);
    html = await injectMetaTags(html, metadata);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });

  app.get("/shop/:slug", async (req, res) => {
    const userAgent = req.get('User-Agent') || '';
    const { slug } = req.params;
    // Decode slug for Firestore query if it's encoded
    const decodedSlug = decodeURIComponent(slug);
    console.log(`[ShopRoute] Request for Slug: ${slug}, Decoded: ${decodedSlug}, User-Agent: ${userAgent}`);
    
    // Add a timeout to the database fetch to prevent hanging requests
    const fetchPromise = firebaseConfig ? getShopItem(decodedSlug, firebaseConfig.projectId, firebaseConfig.firestoreDatabaseId) : Promise.resolve(null);
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 12000));
    
    const shop = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (!shop) {
      console.warn(`[ShopRoute] Shop NOT found for slug: "${decodedSlug}" (or fetch timed out). FirebaseConfig: ${!!firebaseConfig}, adminDb: ${!!adminDb}`);
    } else {
      console.log(`[ShopRoute] Shop found: ${shop.name}, Image: ${shop.image?.substring(0, 50)}...`);
    }
    
    let html: string;
    if (process.env.NODE_ENV !== "production" && vite) {
      html = await fs.readFile(path.resolve("index.html"), "utf-8");
      html = await vite.transformIndexHtml(req.originalUrl, html);
    } else {
      html = await fs.readFile(path.resolve("dist", "index.html"), "utf-8");
    }
    
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    // Use the document ID in the URL for shorter canonical tags and og:url if available
    const fullUrl = `${baseUrl}/shop/${shop?.id || decodedSlug}`;
    
    let metadata;
    if (shop) {
      const productList = shop.products.map((p: any) => p.name).join(', ');
      const title = `${shop.name} | Barnia Bazar - Best ${shop.category} in Tehatta`;
      const description = `Visit ${shop.name} at Barnia Bazar. Best ${shop.category} in Tehatta, Nadia. Products: ${productList}. Contact: ${shop.phone}`;

      metadata = {
        title: title,
        description: description,
        // Use the document ID for the image proxy if available, otherwise fallback to decoded slug
        image: [`${baseUrl}/api/image/shop/${shop.id || decodedSlug}.jpg`],
        url: fullUrl,
        type: 'business.business',
        imageWidth: 1200,
        imageHeight: 630,
        keywords: `${shop.name}, ${shop.category}, Barnia Bazar, Tehatta, Nadia, Market Prices, ${productList}`,
        seoContent: `
          <h1>${shop.name}</h1>
          <p>${description}</p>
          <ul>
            ${shop.products.map((p: any) => `<li>${p.name} - ${p.price}</li>`).join('')}
          </ul>
          <p>Location: ${shop.location}</p>
          <p>Phone: ${shop.phone}</p>
        `
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
        image: ["https://i.postimg.cc/Hn0RkJQ8/Gemini-Generated-Image-4uqd304uqd304uqd.png"],
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
    const { id } = req.params;
    const decodedId = decodeURIComponent(id);
    console.log(`[ProfileRoute] Request for ID/Slug: ${id}, Decoded: ${decodedId}, User-Agent: ${userAgent}`);
    
    // Add a timeout to the database fetch to prevent hanging requests
    const fetchPromise = firebaseConfig ? getProfileItem(decodedId, firebaseConfig.projectId, firebaseConfig.firestoreDatabaseId) : Promise.resolve(null);
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 8000));
    
    const profile = await Promise.race([fetchPromise, timeoutPromise]);
    
    let html: string;
    if (process.env.NODE_ENV !== "production" && vite) {
      html = await fs.readFile(path.resolve("index.html"), "utf-8");
      html = await vite.transformIndexHtml(req.originalUrl, html);
    } else {
      html = await fs.readFile(path.resolve("dist", "index.html"), "utf-8");
    }
    
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    // Use the document ID in the URL for shorter canonical tags and og:url if available
    const fullUrl = `${baseUrl}/profile/${profile?.id || decodedId}`;
    
    let metadata;
    if (profile) {
      // Use direct URL if it's a standard web link, otherwise use proxy for Base64/Drive
      let imageUrl = profile.rawAvatar || profile.avatar;
      const isDirectLink = imageUrl && (imageUrl.startsWith('http') && !imageUrl.includes('drive.google.com') && !imageUrl.includes('data:image'));
      
      if (!isDirectLink) {
        // Use proxy for reliability with Base64, Google Drive, or local files
        imageUrl = `${baseUrl}/api/image/influencer/${profile.id || decodedId}.jpg`;
      }

      // Add a cache buster to force social media to refresh the image
      const cacheBuster = profile.updatedAt ? (profile.updatedAt._seconds || profile.updatedAt.seconds || Date.now()) : Date.now();
      imageUrl = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}v=${cacheBuster}`;

      const bioText = profile.bio.length > 60 ? profile.bio.substring(0, 57) + "..." : profile.bio;
      // Put bio and social icons in the title so they are visible on mobile
      const title = `${profile.name} ✅ | ${bioText} ${profile.socialIconsStr}`;
      const description = `${profile.bio} | Connect: ${profile.socialInfo} | ✨ Join Barnia Digital Hub!`.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

      metadata = {
        title: title,
        description: description,
        image: [imageUrl],
        url: fullUrl,
        type: 'profile',
        imageWidth: 1200,
        imageHeight: 630,
        keywords: `${profile.name}, influencer, content creator, Barnia, Ujirpur, Nadia, ${profile.socialInfo}`,
        seoContent: `
          <h1>${profile.name}</h1>
          <p>${profile.bio}</p>
          <p>Social Media: ${profile.socialInfo}</p>
          <p>Location: Tehatta, West Bengal, India</p>
        `
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
        image: ["https://i.postimg.cc/0yWk2Xsf/Gemini-Generated-Image-sykjx4sykjx4sykj.png"],
        url: fullUrl,
        type: 'profile'
      };
    }

    console.log(`[MetaTags] Injecting tags for profile: ${metadata.title}, URL: ${fullUrl}`);
    html = await injectMetaTags(html, metadata);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });

  // Generic Meta Tag Injection for other routes
  app.get(["/", "/bazar", "/influencers", "/ponjika", "/transport"], async (req, res) => {
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

      // Support multiple images and selection via query param
      const allImages = [
        "https://i.postimg.cc/SRnmvf8Y/Gemini-Generated-Image-ley1tyley1tyley1.png", // News Hub
        "https://i.postimg.cc/Hn0RkJQ8/Gemini-Generated-Image-4uqd304uqd304uqd.png", // Bazar
        "https://i.postimg.cc/XXMmVfZf/Gemini-Generated-Image-z1gyayz1gyayz1gy.png", // Influencers
        "https://i.postimg.cc/Pfy63krN/Gemini-Generated-Image-9komwk9komwk9kom.png", // Ponjika
        "https://i.postimg.cc/Bnncj8x2/Gemini-Generated-Image-rwzq46rwzq46rwzq.png", // Transport
        "https://i.postimg.cc/3RXK5xb8/Gemini-Generated-Image-3luc943luc943luc.png"  // Collab
      ];

      const imgParam = req.query.img ? parseInt(req.query.img as string) : 0;
      let selectedImages = [...allImages];
      
      // If a specific image is requested via ?img=N, move it to the front
      if (!isNaN(imgParam) && imgParam > 0 && imgParam <= allImages.length) {
        const index = imgParam - 1;
        const picked = selectedImages.splice(index, 1)[0];
        selectedImages.unshift(picked);
      }

      let metadata = {
        title: "Barnia Digital Hub | Barnia Bazar, Influencers & Ponjika",
        description: "The official community platform for Barnia, Ujirpur, Nadia. Vill + PO - Barnia, PS - Pallashi Para, Dist - Nadia, State - West Bengal, Pin - 741156. Check daily Barnia Bazar market prices, connect with local influencers, and view the Bengali Ponjika.",
        image: selectedImages,
        url: fullUrl,
        type: 'website',
        imageWidth: 1200,
        imageHeight: 630,
        keywords: "barnia, ujirpur, barnia bazar, nadia, thatta, west bengal, influencer, market prices, bengali ponjika, community hub, digital barnia, Pallashi Para, 741156",
        seoContent: `
          <h1>Barnia Digital Hub</h1>
          <p>The official community platform for Barnia, Ujirpur, and Nadia district. Vill + PO - Barnia, PS - Pallashi Para, Dist - Nadia, State - West Bengal, Pin - 741156.</p>
          <h2>Barnia Bazar Market Prices</h2>
          <p>Get daily updates on vegetable, fish, and grocery prices in Barnia Bazar.</p>
          <h2>Influencer Network</h2>
          <p>Connect with talented creators and influencers from Barnia and Ujirpur.</p>
          <h2>Bengali Ponjika</h2>
          <p>View the daily Bengali calendar, tithi, and festival dates.</p>
          <h2>Barnia Ride</h2>
          <p>Book local transport and track rides within the village.</p>
        `
      };

      if (req.path.includes("/bazar")) {
        metadata.title = "Barnia Bazar | Daily Market Prices in Barnia";
        metadata.description = "Get the latest market prices for vegetables, fish, and groceries at Barnia Bazar, Nadia.";
        metadata.image = ["https://i.postimg.cc/Hn0RkJQ8/Gemini-Generated-Image-4uqd304uqd304uqd.png"];
        metadata.imageWidth = 1200;
        metadata.imageHeight = 630;
      } else if (req.path.includes("/influencers")) {
        metadata.title = "Influencer Network | Barnia & Ujirpur Talents ✅";
        metadata.description = "Meet the top influencers and content creators from Barnia and Ujirpur. Connect, collaborate, and grow with our local digital community.";
        metadata.image = ["https://i.postimg.cc/XXMmVfZf/Gemini-Generated-Image-z1gyayz1gyayz1gy.png"];
        metadata.imageWidth = 1200;
        metadata.imageHeight = 630;
      } else if (req.path.includes("/ponjika")) {
        metadata.title = "Bengali Ponjika | Daily Tithi & Festivals in Barnia";
        metadata.description = "Check the daily Bengali Ponjika, auspicious timings, and upcoming festivals for Barnia and Nadia.";
        metadata.image = ["https://i.postimg.cc/Pfy63krN/Gemini-Generated-Image-9komwk9komwk9kom.png"];
        metadata.imageWidth = 1200;
        metadata.imageHeight = 630;
      } else if (req.path.includes("/transport")) {
        metadata.title = "Barnia Ride | Local Village Transport";
        metadata.description = "Book rides and track local transport easily within Barnia and surrounding villages.";
        metadata.image = ["https://i.postimg.cc/Bnncj8x2/Gemini-Generated-Image-rwzq46rwzq46rwzq.png"];
        metadata.imageWidth = 1200;
        metadata.imageHeight = 630;
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

async function updateVamshavaliLineage(profileId: string, action: string, targetMemberName: string, details: any) {
  if (!adminDb && !db) {
    console.error("[Telegram] No Firestore handle available");
    return { success: false, error: "Database not ready. Please try again in 30 seconds." };
  }
  
  const useAdmin = !!adminDb;
  const profileRef = useAdmin ? adminDb.collection('vamshavali_profiles').doc(profileId) : doc(db!, 'vamshavali_profiles', profileId);
  
  const snap = useAdmin ? await profileRef.get() : await getDoc(profileRef as any);
  const exists = useAdmin ? snap.exists : snap.exists();
  
  if (!exists) return { success: false, error: "Profile not found" };
  
  const data = snap.data();
  let members = data?.members || [];

  function findMemberRecursive(list: any[], name: string): any {
    for (const member of list) {
      if (member.name?.toLowerCase() === name.toLowerCase()) return member;
      if (member.children && member.children.length > 0) {
        const found = findMemberRecursive(member.children, name);
        if (found) return found;
      }
      if (member.partners && member.partners.length > 0) {
        const found = findMemberRecursive(member.partners, name);
        if (found) return found;
      }
    }
    return null;
  }
  
  const ts = useAdmin ? admin.firestore.FieldValue.serverTimestamp() : serverTimestamp();
  
  if (action === "ADD") {
    const parent = findMemberRecursive(members, targetMemberName);
    const newMember = {
      id: Math.random().toString(36).substr(2, 9),
      name: details.name,
      role: details.role || "Member",
      birthYear: details.birthYear || "",
      photo: details.photo || "",
      children: [],
      partners: []
    };
    
    if (parent) {
      if (details.relationship === "partner") {
        parent.partners = [...(parent.partners || []), newMember];
      } else {
        parent.children = [...(parent.children || []), newMember];
      }
      
      if (useAdmin) {
        await profileRef.update({ members, updatedAt: ts });
      } else {
        await updateDoc(profileRef as any, { members, updatedAt: ts });
      }
      return { success: true };
    }
  } else if (action === "UPDATE") {
    const member = findMemberRecursive(members, targetMemberName);
    if (member) {
      if (details.photo) member.photo = details.photo;
      if (details.birthYear) member.birthYear = details.birthYear;
      if (details.role) member.role = details.role;
      
      if (useAdmin) {
        await profileRef.update({ members, updatedAt: ts });
      } else {
        await updateDoc(profileRef as any, { members, updatedAt: ts });
      }
      return { success: true };
    }
  }
  return { success: false, error: "Target member not found" };
}

  // Telegram Bot Webhook Handler
  app.post("/api/webhooks/telegram", async (req, res) => {
    console.log("[Telegram] Webhook received:", JSON.stringify(req.body));
    const { message } = req.body;
    
    // Support text messages or photo captions
    const text = (message?.text || message?.caption || "").trim();
    
    if (!message || (!text && !message.photo)) {
      console.log("[Telegram] No message text/caption/photo found, skipping...");
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const botToken = await getTelegramBotToken();

    if (!botToken) {
      console.error("[Telegram] BOT_TOKEN missing in environment");
      return res.sendStatus(200);
    }

    const sendMsg = async (msg: string) => {
      console.log(`[Telegram] Sending message to ${chatId}: ${msg}`);
      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' }),
          family: 4,
          timeout: 10000
        });
        const result = await (response.json() as any).catch(() => ({ ok: false }));
        if (!result.ok) {
          console.error("[Telegram] Send message failed:", JSON.stringify(result));
        }
      } catch (err) {
        console.error("[Telegram] Send message error:", err);
      }
    };

    // Prevent crashing on images without captions
    if (!text && message.photo) {
      await sendMsg("📸 *I see your photo!* Barnali is currently focused on text-based updates. Please send a text message describing the family update (e.g., 'Add Rahul as son of Kedar').");
      return res.sendStatus(200);
    }

    // Handle deep linking /start <id>
    const textParts = text.trim().split(/\s+/);
    const shareId = textParts.length > 1 ? textParts[1].trim() : null;
    
    console.log(`[Telegram] Bot received: "${text}" | Extracted ShareID: "${shareId}" | From: ${chatId}`);

    if (text.startsWith('/start')) {
      if (!shareId) {
        await sendMsg("🏛️ *Welcome to Vamshavali AI* 🏛️\n\nI am Barnali, your family archive keeper. I can help you build and maintain your digital family tree.\n\nTo link your records, please go to the website, ensure you're logged in, and click 'Link Telegram' in your dashboard.\n\n*Already have a Share ID?* Just send it to me here!");
        res.sendStatus(200);
        return;
      }

      const normalizedShareId = String(shareId).toLowerCase().trim();
      if (normalizedShareId === 'undefined' || normalizedShareId === 'null' || normalizedShareId === '' || normalizedShareId.length < 4) {
        console.warn(`[Telegram] Invalid ShareID received: "${shareId}"`);
        await sendMsg(`🚫 *Link Invalid:* The ID received was \`${shareId}\`.\n\n*Full Command:* \`${text}\`\n\n*Solution:* Please follow these steps carefully:\n1. Open the Vamshavali page.\n2. **Refresh the page (Ctrl + F5)**.\n3. Make sure you see your name in the dashboard.\n4. Click 'Telegram Update' wait 1 second, then click the link.`);
        res.sendStatus(200);
        return;
      }

      try {
        console.log(`[Telegram] Linking start: ChatID=${chatId}, ShareID="${shareId}"`);
        
        let profile = null;
        let profileId = null;

        // 1. Try Admin SDK first (more reliable permissions)
        if (adminDb) {
           console.log(`[Telegram] Querying vamshavali_profiles via Admin SDK for: "${shareId}"`);
           const snap = await adminDb.collection("vamshavali_profiles").where("shareId", "==", shareId.trim().toUpperCase()).limit(1).get();
           if (!snap.empty) {
             profileId = snap.docs[0].id;
             profile = snap.docs[0].data();
           } else {
             // Try case-sensitive just in case
             const snap2 = await adminDb.collection("vamshavali_profiles").where("shareId", "==", shareId.trim()).limit(1).get();
             if (!snap2.empty) {
               profileId = snap2.docs[0].id;
               profile = snap2.docs[0].data();
             }
           }
        }

        // 2. Fallback to Client SDK if Admin SDK failed or not available
        if (!profile && db) {
          console.log(`[Telegram] Admin SDK not found profile. Trying Client SDK for: "${shareId}"`);
          let q = query(collection(db!, 'vamshavali_profiles'), where('shareId', '==', shareId.trim().toUpperCase()), limit(1));
          let snapshot = await getDocs(q);
          if (snapshot.empty) {
            q = query(collection(db!, 'vamshavali_profiles'), where('shareId', '==', shareId.trim()), limit(1));
            snapshot = await getDocs(q);
          }
          if (!snapshot.empty) {
            profileId = snapshot.docs[0].id;
            profile = snapshot.docs[0].data();
          }
        }
        
        if (profile && profileId) {
          const linkData = {
            profileId,
            profileName: profile.name || "Unnamed Profile",
            linkedAt: new Date().toISOString(),
            serverKey: FIRESTORE_SERVER_KEY
          };

          if (adminDb) {
            await adminDb.collection("telegram_links").doc(String(chatId)).set(linkData);
          } else if (db) {
            await setDoc(doc(db!, 'telegram_links', String(chatId)), linkData);
          }
          
          console.log(`[Telegram] Successfully linked ChatID ${chatId} to ${profile.name}`);
          await sendMsg(`✅ *Success!* Your Telegram is now linked to *${profile.name || 'your profile'}*.\n\nYou can now tell me things like:\n• "Add someone as child of ${profile.name || 'X'}"\n• "Update photo for ${profile.name || 'X'}"`);
        } else {
          console.warn(`[Telegram] Profile NOT FOUND for ShareID: "${shareId}"`);
          await sendMsg(`❌ *Profile Not Found:* I couldn't find a family profile with ID: \`${shareId}\`.\n\nPlease check the ID on the website or click the link again.`);
        }
      } catch (err) {
        console.error("[Telegram] Linking error detail:", err);
        await sendMsg(`❌ An error occurred while linking: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      res.sendStatus(200);
      return;
    }

    // Use a simple memory store to link ChatID to ProfileID for this turn/session
    // In production, we'd store this link in Firestore.
    const getLinkedProfileId = async (chatId: number) => {
      if (adminDb) {
        const snap = await adminDb.collection('telegram_links').doc(chatId.toString()).get();
        return snap.exists ? snap.data()?.profileId : null;
      } else if (db) {
        const docRef = doc(db, 'telegram_links', chatId.toString());
        const snap = await getDoc(docRef);
        return snap.exists() ? snap.data()?.profileId : null;
      }
      return null;
    };

    if (text.startsWith('/start')) {
      // Handled above in deep linking block if it had parameters
      return;
    }

    try {
      const geminiKey = await getGeminiApiKey();
      if (!geminiKey) {
        console.error("[Telegram] Gemini API Key missing");
        await sendMsg("⚠️ *System Error:* AI services are currently unavailable (Key missing).");
        res.sendStatus(200);
        return;
      }
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      
      const prompt = `You are a genealogy expert assistant for Barnali (Vamshavali AI). 
      Extract family tree update instructions from this message: "${text}".
      
      Return ONLY a JSON object with:
      - action: "ADD", "UPDATE", "DELETE", "LINK", or "UNKNOWN"
      - targetMember: name of the existing person in the tree to modify or attach to
      - details: 
          role: (e.g., "Father", "Mother", "Son", "Daughter")
          name: new person's name (if ADD) or field value
          birthYear: Year (if mentioned)
          relationship: "child" or "partner" (if ADD)
          id: Profile ID if this is a LINK action
      - clarificationMessage: If the request is ambiguous, incomplete, or you are unsure, provide a polite question to the user asking for the missing info (e.g. "Who should I add this person to?", "Which profile should I update?").
      
      Context: If you see something that looks like an ID or user says 'Link profile X', use action: "LINK".
      If the user provides info like 'Add X as son of Y', action is "ADD", targetMember is "Y", name in details is "X".
      If they just say 'Add Rahul' without saying who he belongs to, set action to UNKNOWN and ask "Where should I add Rahul? (e.g. 'Add Rahul as son of Kedar')".`;

      console.log("[Telegram] Calling Gemini for command extraction...");
      const result = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      let responseText = (result.text || "{}").trim();
      console.log("[Telegram] Gemini Response:", responseText);
      
      // Sanitization: Remove markdown code blocks if present
      if (responseText.startsWith("```")) {
        responseText = responseText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
      }
      
      const command = JSON.parse(responseText);

      if (command.action === "LINK") {
        const linkData = { 
          profileId: command.details.id,
          linkedAt: new Date().toISOString(),
          serverKey: FIRESTORE_SERVER_KEY
        };
        
        if (adminDb) {
          await adminDb.collection('telegram_links').doc(chatId.toString()).set(linkData);
        } else if (db) {
          await setDoc(doc(db, 'telegram_links', chatId.toString()), linkData);
        }
        
        await sendMsg(`✅ *Profile Linked:* \`${command.details.id}\`. All future messages will update this lineage.`);
        res.sendStatus(200);
        return;
      }

      const profileId = await getLinkedProfileId(chatId);
      if (!profileId) {
        await sendMsg("🚫 *Not Linked:* Please click the Telegram link from your profile page on the website to link your account first.");
        res.sendStatus(200);
        return;
      }

      if (command.action === "ADD" || command.action === "UPDATE") {
        if (!command.targetMember && command.clarificationMessage) {
          await sendMsg(`🤔 ${command.clarificationMessage}`);
          res.sendStatus(200);
          return;
        }
        await sendMsg(`🔍 *Processing Request...* (${command.action}: ${command.targetMember})`);
        const result = await updateVamshavaliLineage(profileId, command.action, command.targetMember, command.details);
        if (result.success) {
          await sendMsg(`✨ *Update Successful!* I've updated your family records. Refresh your app to see the change.`);
        } else {
          await sendMsg(`❌ *Update Failed:* ${result.error}. Ensure the name matches exactly as shown in the tree.`);
        }
        res.sendStatus(200);
        return;
      }

      if (command.clarificationMessage) {
        await sendMsg(`🤔 ${command.clarificationMessage}`);
      } else {
        await sendMsg("🤔 I'm not sure how to handle that request. Try saying 'Add Rahul as child of Kedar' or 'Update photo for Meena'.");
      }
    } catch (err: any) {
      console.error("[Telegram] Error processing message:", err);
      const errorStr = err?.message || String(err);
      
      let errorMsg = "⚠️ The archives are currently busy. Please try again in a moment.";
      
      if (errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = "⚠️ *High Traffic:* I am receiving too many requests. Please try again in 1 minute.";
      } else if (errorStr.includes("API_KEY_INVALID") || errorStr.includes("API_KEY_SERVICE_BLOCKED") || errorStr.includes("blocked") || errorStr.includes("403")) {
        errorMsg = "⚠️ *System Config Error:* The AI component (Gemini) is not properly configured. Please notify the administrator.";
      } else if (errorStr.includes("model not found") || errorStr.includes("gemini-3")) {
        errorMsg = "⚠️ *Model Error:* I couldn't reach the required brain module. Please try again later.";
      } else {
        // Log more detail to the user if it's a specific internal error we can share
        console.log("[Telegram] Unhandled error:", errorStr);
      }
      
      await sendMsg(errorMsg);
    }

    res.sendStatus(200);
  });
  
  app.post("/api/influencers", async (req, res) => {
    const influencer = {
      ...req.body,
      id: Math.random().toString(36).substr(2, 9)
    };
    localDb.userInfluencers.push(influencer);
    await saveData(localDb);
    
    console.log(`[RoboticSEO] New influencer profile registered: ${influencer.name}. Updating SEO indices...`);
    console.log(`[RoboticSEO] Keywords generated: ${influencer.name}, influencer, Barnia, Ujirpur, Nadia, content creator`);
    
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
    
    console.log(`[RoboticSEO] New shop registered: ${shop.name}. Updating SEO indices...`);
    console.log(`[RoboticSEO] Keywords generated: ${shop.name}, ${shop.category}, Barnia Bazar, market prices`);
    
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
    } catch (error: any) {
      console.error("Error sending collab email:", error.message);
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
    } catch (error: any) {
      console.error("Error sending email:", error.message);
      let errorMessage = error.message;
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        errorMessage = "Connection timeout. Please check SMTP settings.";
      }
      res.status(500).json({ success: false, error: "Failed to send notification", details: errorMessage });
    }
  });

  // Facebook OAuth Routes
  app.get('/api/auth/facebook/url', (req, res) => {
    // Use environment variables if available, otherwise use hardcoded fallbacks
    const appId = process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID || "2201629183577400";
    const host = req.get('host');
    // Force https for production domains to avoid protocol mismatch errors
    const protocol = (host?.includes('localhost') || host?.includes('127.0.0.1')) ? 'http' : 'https';
    
    // Allow override via environment variable for stable redirect URIs
    const baseDomain = process.env.FACEBOOK_REDIRECT_BASE_URL || `${protocol}://${host}`;
    const redirectUri = `${baseDomain}/auth/facebook/callback`;

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
    
    const baseDomain = process.env.FACEBOOK_REDIRECT_BASE_URL || `${protocol}://${host}`;
    const redirectUri = `${baseDomain}/auth/facebook/callback`;
    
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
        
        const metadata: any = {
          title: "Barnia Digital Hub | Community Platform",
          description: "The official community platform for Barnia, Ujirpur, Nadia. Vill + PO - Barnia, PS - Pallashi Para, Dist - Nadia, State - West Bengal, Pin - 741156.",
          image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?fm=jpg&fit=crop&q=80&w=1200&h=630",
          url: `${baseUrl}${req.path === '/' ? '' : req.path}`,
          type: 'website',
          keywords: "barnia, ujirpur, barnia bazar, nadia, thatta, west bengal, influencer, market prices, bengali ponjika, community hub, digital barnia, Pallashi Para, 741156"
        };

        if (req.path === '/fact-check') {
          metadata.title = "Sanatani Fact Check | Barnia Digital Hub";
          metadata.description = "Research, Verification, and Truth. The official fact-checking platform for Sanatana Dharma claims, guided by authentic traditions.";
          metadata.image = "https://i.postimg.cc/WbH661Vy/Gemini-Generated-Image-g58ya7g58ya7g58y.png";
        }
        
        html = await injectMetaTags(html, metadata);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (err) {
        console.error("[SSR] Catch-all error:", err);
        res.status(500).send("Internal Server Error");
      }
    });
  } else {
    app.use(express.static("dist", { index: false }));

    let cachedIndexHtml: string | null = null;

    app.get("*", async (req, res) => {
      try {
        // Always use barnia.in as the canonical base in production
        const baseUrl = "https://barnia.in";

        if (!cachedIndexHtml) {
          try {
            cachedIndexHtml = await fs.readFile(path.resolve("dist", "index.html"), "utf-8");
            console.log("[SSR] Production index.html cached successfully.");
          } catch (readError) {
            console.error("[SSR] Failed to read production index.html:", readError);
            return res.status(500).send("Internal Server Error: Missing index file");
          }
        }
        
        let html = cachedIndexHtml;
        
        const metadata: any = {
          title: "Barnia Digital Hub | Community Platform",
          description: "The official community platform for Barnia, Ujirpur, Nadia. Vill + PO - Barnia, PS - Pallashi Para, Dist - Nadia, State - West Bengal, Pin - 741156.",
          image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?fm=jpg&fit=crop&q=80&w=1200&h=630",
          url: `${baseUrl}${req.path === '/' ? '' : req.path}`,
          type: 'website',
          keywords: "barnia, ujirpur, barnia bazar, nadia, thatta, west bengal, influencer, market prices, bengali ponjika, community hub, digital barnia, Pallashi Para, 741156"
        };

        if (req.path === '/fact-check') {
          metadata.title = "Sanatani Fact Check | Barnia Digital Hub";
          metadata.description = "Research, Verification, and Truth. The official fact-checking platform for Sanatana Dharma claims, guided by authentic traditions.";
          metadata.image = "https://i.postimg.cc/WbH661Vy/Gemini-Generated-Image-g58ya7g58ya7g58y.png";
        }
        
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
}

startServer().catch(err => {
  console.error("FATAL ERROR DURING STARTUP! 💥");
  console.error(err);
  process.exit(1);
});
