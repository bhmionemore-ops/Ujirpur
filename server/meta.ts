import { collection, query, where, limit, getDocs, doc, getDocFromServer } from "firebase/firestore";
import fetch from "node-fetch";
import { db, adminDb, firebaseConfig } from "./db";
import { CACHE_TTL } from "./constants";
import { slugify, escapeHtml } from "./utils";

export const metadataCache = new Map<string, { data: any, timestamp: number }>();

export async function getShopItem(idOrSlug: string, projectId: string, databaseId: string) {
  const cacheKey = `shop:${idOrSlug}`;
  const cached = metadataCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    let data: any = null;
    const decodedId = decodeURIComponent(idOrSlug);
    
    if (adminDb) {
      try {
        let shopsBySlug = await adminDb.collection("shops").where("slug", "==", idOrSlug).limit(1).get();
        if (shopsBySlug.empty) shopsBySlug = await adminDb.collection("shops").where("slug", "==", decodedId).limit(1).get();
        if (shopsBySlug.empty) {
          const serverSlug = slugify(decodedId);
          if (serverSlug !== decodedId) {
            shopsBySlug = await adminDb.collection("shops").where("slug", "==", serverSlug).limit(1).get();
          }
        }

        if (!shopsBySlug.empty) {
          const doc = shopsBySlug.docs[0];
          data = doc.data();
          data.id = doc.id;
        } else {
          const shopById = await adminDb.collection("shops").doc(idOrSlug).get();
          if (shopById.exists) {
            data = shopById.data();
            data.id = shopById.id;
          }
        }
      } catch (e) {}
    }

    if (!data && db) {
      try {
        let q = query(collection(db, "shops"), where("slug", "==", idOrSlug), limit(1));
        let shopsBySlug = await getDocs(q);
        if (shopsBySlug.empty) {
          const qDecoded = query(collection(db, "shops"), where("slug", "==", decodedId), limit(1));
          shopsBySlug = await getDocs(qDecoded);
        }
        if (!shopsBySlug.empty) {
          const docSnap = shopsBySlug.docs[0];
          data = docSnap.data();
          data.id = docSnap.id;
        } else {
          const shopById = await getDocFromServer(doc(db, "shops", idOrSlug));
          if (shopById.exists()) {
            data = shopById.data();
            data.id = shopById.id;
          }
        }
      } catch (e) {}
    }

    if (!data) return null;

    const result = {
      id: data.id || idOrSlug,
      name: data.name || "Barnia Bazar Shop",
      description: data.description || "Check out this local shop in Barnia Bazar.",
      category: data.category || "Retail",
      image: data.image || data.logo || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?fm=jpg&fit=crop&q=80&w=1200&h=630"
    };

    metadataCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    return null;
  }
}

export async function getProfileItem(idOrSlug: string, projectId: string, databaseId: string) {
  const cacheKey = `profile:${idOrSlug}`;
  const cached = metadataCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    let data: any = null;
    const decodedId = decodeURIComponent(idOrSlug);

    if (adminDb) {
      try {
        let influencersBySlug = await adminDb.collection("influencers").where("slug", "==", idOrSlug).limit(1).get();
        if (influencersBySlug.empty) influencersBySlug = await adminDb.collection("influencers").where("slug", "==", decodedId).limit(1).get();
        if (influencersBySlug.empty) {
          const serverSlug = slugify(decodedId);
          if (serverSlug !== decodedId) {
            influencersBySlug = await adminDb.collection("influencers").where("slug", "==", serverSlug).limit(1).get();
          }
        }

        if (!influencersBySlug.empty) {
          const doc = influencersBySlug.docs[0];
          data = doc.data();
          data.id = doc.id;
        } else {
          const influencerById = await adminDb.collection("influencers").doc(idOrSlug).get();
          if (influencerById.exists) {
            data = influencerById.data();
            data.id = influencerById.id;
          }
        }
      } catch (e) {}
    }

    if (!data && db) {
      try {
        let q = query(collection(db, "influencers"), where("slug", "==", idOrSlug), limit(1));
        let influencersBySlug = await getDocs(q);
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
      } catch (e) {}
    }

    if (!data) return null;

    const avatar = data.avatar || data.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=random&color=fff&size=512`;

    const result = {
      id: data.id || idOrSlug,
      name: data.name || "Barnia Profile",
      bio: data.bio || "Explore professional influencer profiles and collaboration opportunities in our community network.",
      avatar: avatar,
      socials: data.socials || data.socialLinks || []
    };

    metadataCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    return null;
  }
}

export async function getNewsItem(date: string, tab: string, index: string, projectId: string, databaseId: string) {
  const cacheKey = `news:${date}:${tab}:${index}`;
  const cached = metadataCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    let data: any = null;
    const docIdsToTry = [date, `${date}-en`, `${date}-bn`];
    
    if (adminDb) {
      for (const docId of docIdsToTry) {
        const docSnap = await adminDb.collection("news").doc(docId).get();
        if (docSnap.exists) {
          data = docSnap.data();
          break;
        }
      }
    }

    if (!data && db) {
      for (const docId of docIdsToTry) {
        const docRef = doc(db, "news", docId);
        const docSnap = await getDocFromServer(docRef);
        if (docSnap.exists()) {
          data = docSnap.data();
          break;
        }
      }
    }

    if (!data) return null;
    
    const tabKey = Object.keys(data).find(k => k.toLowerCase() === tab.toLowerCase());
    const tabData = tabKey ? data[tabKey] : null;
    if (!tabData) return null;
    
    const idx = parseInt(index);
    const item = tabData[idx];
    if (!item) return null;
    
    const result = {
      title: item.title || "Barnia News",
      content: item.content || "Latest news from our community.",
      image: item.image || ""
    };

    metadataCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    return null;
  }
}

export async function injectMetaTags(html: string, metadata: any) {
  const safeUrl = metadata.url || '';
  const images = Array.isArray(metadata.image) ? metadata.image : [metadata.image].filter(Boolean);
  const primaryImage = images[0] || '';
  
  const escapedTitle = escapeHtml(metadata.title);
  const escapedDescription = escapeHtml(metadata.description);
  const escapedUrl = escapeHtml(safeUrl);
  
  let keywords = metadata.keywords || "barnia, community";
  const escapedKeywords = escapeHtml(keywords);

  const type = metadata.type || 'website';
  const updatedTime = new Date().toISOString();

  let imageTags = '';
  images.forEach((img: string) => {
    const escapedImg = escapeHtml(img);
    imageTags += `
    <meta property="og:image" content="${escapedImg}" />
    <meta property="og:image:secure_url" content="${escapedImg}" />
    `;
  });

  const metaTags = `
    <title>${escapedTitle}</title>
    <meta name="description" content="${escapedDescription}" />
    <meta name="keywords" content="${escapedKeywords}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:url" content="${escapedUrl}" />
    <meta property="og:type" content="${type}" />
    ${imageTags}
    <meta name="twitter:card" content="${metadata.twitterCard || (primaryImage ? 'summary_large_image' : 'summary')}" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    <link rel="canonical" href="${escapedUrl}" />
  `;

  let modifiedHtml = html.replace(/<title>.*?<\/title>/gi, "");
  // Simple replacement for head
  modifiedHtml = modifiedHtml.replace(/(<head[^>]*>)/i, `$1${metaTags}`);

  return modifiedHtml;
}
