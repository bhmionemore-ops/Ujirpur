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
  Firestore,
  initializeFirestore,
  getDocFromServer
} from "firebase/firestore";

dotenv.config();

let db: Firestore | null = null;
let adminDb: any = null;
let clientAuth: any = null;

let currentUpdatePromise: Promise<boolean | void> | null = null;



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

  // Trust proxy for correct protocol/host detection behind Render/AI Studio proxies
  app.set('trust proxy', true);

  // Domain Redirect Middleware
  app.use((req, res, next) => {
    const host = req.get('host');
    if (host && host.includes('barnia.onrender.com')) {
      return res.redirect(301, `https://barnia.in${req.originalUrl}`);
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
      res.status(200).set("Content-Type", "application/javascript").send(data);
    } catch (e) {
      res.status(404).send("Not found");
    }
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      const protocol = 'https';
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

  // Self-pinging mechanism to keep the server awake
  const APP_URL = process.env.APP_URL || "https://barnia.in";
  setInterval(() => {
    fetch(`${APP_URL}/api/ping`)
      .then(() => console.log(`[Keep-Alive] Self-ping successful at ${new Date().toISOString()}`))
      .catch(err => console.error("[Keep-Alive] Self-ping failed:", err));
  }, 10 * 60 * 1000); // Every 10 minutes

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
    const protocol = req.protocol;
    const currentUrl = `${protocol}://${host}`;
    const redirectUri = `${currentUrl}/auth/facebook/callback`;

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      // Simplified scope to avoid "Advanced Access" blocks for basic login
      // Add back 'instagram_basic', etc. only after your app is approved by Facebook
      scope: 'email,public_profile',
      response_type: 'code',
      auth_type: 'rerequest', // Prompt user again if they denied permissions
      display: 'popup'
    });

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    console.log(`[FacebookAuth] Generated Auth URL: ${authUrl}`);
    res.json({ url: authUrl });
  });

  // Facebook OAuth Callback
  app.get('/auth/facebook/callback', async (req, res) => {
    const { code, error } = req.query;
    const host = req.get('host');
    const protocol = req.protocol;
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
      const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
      const tokenResponse = await fetch(tokenUrl);
      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error(`[FacebookAuth] Token exchange failed:`, tokens.error);
        throw new Error(tokens.error.message);
      }

      console.log(`[FacebookAuth] Token received. Fetching user profile...`);
      // 2. Fetch user profile data
      const userResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${tokens.access_token}`);
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
        if (!isProd && vite) {
          html = await vite.transformIndexHtml(req.originalUrl, html);
        }
        
        const protocol = (req.headers['x-forwarded-proto'] as string) || (req.hostname === 'localhost' ? 'http' : 'https');
        const host = req.headers.host;
        const baseUrl = process.env.APP_URL || (host ? `${protocol}://${host}` : "https://barnia.in");
        
        const metadata = {
          title: "Barnia Digital Hub | Community Platform",
          description: "The official community platform for Barnia, Ujirpur, Nadia.",
          image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?fm=jpg&fit=crop&q=80&w=1200&h=630",
          url: `${baseUrl}${req.path}`,
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
        const protocol = (req.headers['x-forwarded-proto'] as string) || (req.hostname === 'localhost' ? 'http' : 'https');
        const host = req.headers.host;
        const baseUrl = process.env.APP_URL || (host ? `${protocol}://${host}` : "https://barnia.in");

        let html = await fs.readFile(path.resolve("dist", "index.html"), "utf-8");
        
        const metadata = {
          title: "Barnia Digital Hub | Community Platform",
          description: "The official community platform for Barnia, Ujirpur, Nadia.",
          image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?fm=jpg&fit=crop&q=80&w=1200&h=630",
          url: `${baseUrl}${req.path}`,
          type: 'website',
          keywords: "barnia, ujirpur, barnia bazar, nadia, thatta, west bengal, influencer, market prices, bengali ponjika, community hub, digital barnia"
        };
        
        html = await injectMetaTags(html, metadata);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
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
