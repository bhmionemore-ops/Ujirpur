import { collection, getDocs } from "firebase/firestore";
import fetch from "node-fetch";

export async function generateSitemapXml(baseUrl: string, db: any, adminDb: any, firebaseConfig: any) {
  let urls = [
    { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${baseUrl}/bazar`, changefreq: 'daily', priority: '0.9' },
    { loc: `${baseUrl}/influencers`, changefreq: 'daily', priority: '0.9' },
    { loc: `${baseUrl}/ponjika`, changefreq: 'weekly', priority: '0.7' },
    { loc: `${baseUrl}/chat`, changefreq: 'always', priority: '0.5' },
  ];

  const fetchCollection = async (collectionName: string) => {
    let docs: any[] = [];
    if (adminDb) {
      try {
        const snap = await adminDb.collection(collectionName).get();
        snap.forEach((doc: any) => docs.push({ id: doc.id, ...doc.data() }));
        return docs;
      } catch (e) {
        console.warn(`[Sitemap] Admin SDK failed for ${collectionName}`);
      }
    }
    if (db) {
      try {
        const snap = await getDocs(collection(db, collectionName));
        snap.forEach((docSnap) => docs.push({ id: docSnap.id, ...docSnap.data() }));
        return docs;
      } catch (e) {
        console.warn(`[Sitemap] Client SDK failed for ${collectionName}`);
      }
    }
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
                  const val = fields[key];
                  if (val.stringValue !== undefined) data[key] = val.stringValue;
                  else if (val.integerValue !== undefined) data[key] = val.integerValue;
                  else if (val.booleanValue !== undefined) data[key] = val.booleanValue;
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

  const shops = await fetchCollection("shops");
  shops.forEach(shop => {
    const slug = shop.slug || shop.id;
    urls.push({ loc: `${baseUrl}/shop/${slug}`, changefreq: 'weekly', priority: '0.8' });
  });

  const influencers = await fetchCollection("influencers");
  influencers.forEach(influencer => {
    const slug = influencer.slug || influencer.id;
    urls.push({ loc: `${baseUrl}/profile/${slug}`, changefreq: 'weekly', priority: '0.8' });
  });

  const news = await fetchCollection("news");
  news.sort((a, b) => b.id.localeCompare(a.id));
  news.slice(0, 10).forEach(doc => {
    const date = doc.id;
    ['top', 'local', 'sports'].forEach(tab => {
      if (doc[tab] && Array.isArray(doc[tab])) {
        doc[tab].forEach((_: any, index: number) => {
          if (index < 3) {
            urls.push({ loc: `${baseUrl}/news/${date}/${tab}/${index}`, changefreq: 'monthly', priority: '0.6' });
          }
        });
      }
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(url => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('')}
</urlset>`;
}
