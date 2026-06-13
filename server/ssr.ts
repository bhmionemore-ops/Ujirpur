import path from "path";
import fs from "fs/promises";
import { injectMetaTags, getNewsItem, getShopItem, getProfileItem, getVamshavaliItem } from "./meta";

export function setupSSR(app: any, vite: any) {
  app.get("*", async (req: any, res: any) => {
    try {
      const isProd = process.env.NODE_ENV === "production";
      const indexPath = isProd ? path.resolve("dist", "index.html") : path.resolve("index.html");
      
      let html = await fs.readFile(indexPath, "utf-8");
      if (vite && !isProd) {
        html = await vite.transformIndexHtml(req.originalUrl, html);
      }
      
      const baseUrl = isProd ? "https://barnia.in" : `http://${req.headers.host}`;
      
      const metadata: any = {
        title: "Barnia Digital Hub | Community Platform",
        description: "Official community platform for Barnia, Ujirpur, Nadia.",
        image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?fm=jpg&fit=crop&q=80&w=1200&h=630",
        url: `${baseUrl}${req.path}`,
        type: 'website'
      };

      if (req.path === '/fact-check') {
        metadata.title = "Sanatani Fact Check | Barnia Digital Hub";
      }

      // 1. News Item Check: /news/:date/:tab/:index
      const newsMatch = req.path.match(/^\/news\/([^\/]+)\/([^\/]+)\/([0-9]+)/i);
      if (newsMatch) {
        const [_, date, tab, index] = newsMatch;
        console.log(`[SSR] News route matched for Date: ${date}, Tab: ${tab}, Index: ${index}`);
        try {
          const newsData = await getNewsItem(date, decodeURIComponent(tab), index, "", "");
          if (newsData) {
            console.log(`[SSR] News item metadata successfully resolved: "${newsData.title}"`);
            metadata.title = `${newsData.title} | Barnia Daily News 🌸`;
            metadata.description = newsData.content.substring(0, 160) + (newsData.content.length > 160 ? "..." : "");
            if (newsData.image) {
              metadata.image = newsData.image;
            } else {
              metadata.image = "https://i.postimg.cc/0yWk2Xsf/Gemini-Generated-Image-sykjx4sykjx4sykj.png";
            }
          } else {
            console.warn(`[SSR] News item for ${date}/${tab}/${index} not found in database. Using default news banner.`);
            metadata.title = "Barnia Daily News | Community Updates 🌸";
            metadata.description = "Get the latest, real-time local updates, Facebook and Instagram trends, and community reports directly on Barnia Digital Hub.";
            metadata.image = "https://i.postimg.cc/0yWk2Xsf/Gemini-Generated-Image-sykjx4sykjx4sykj.png";
          }
        } catch (e) {
          console.error("[SSR] Error getting news metadata:", e);
        }
      }

      // 2. Shop Profile Check: /shop/:slug
      const shopMatch = req.path.match(/^\/shop\/([^\/]+)/i);
      if (shopMatch) {
        const [_, slug] = shopMatch;
        try {
          const shopData = await getShopItem(slug, "", "");
          if (shopData) {
            metadata.title = `${shopData.name} | Barnia Bazar 🛍️`;
            metadata.description = `${shopData.category || "Shop"} - ${shopData.description || ""}`;
            if (shopData.image) {
              metadata.image = shopData.image;
            }
          }
        } catch (e) {
          console.error("[SSR] Error getting shop metadata:", e);
        }
      }

      // 3. User/Influencer Profile Check: /profile/:slug
      const profileMatch = req.path.match(/^\/profile\/([^\/]+)/i);
      if (profileMatch) {
        const [_, slug] = profileMatch;
        try {
          const profileData = await getProfileItem(slug, "", "");
          if (profileData) {
            metadata.title = `${profileData.name} | Barnia Digital Hub 🧑‍💻`;
            metadata.description = profileData.bio || `Explore the community profile of ${profileData.name} on Barnia Digital Hub.`;
            if (profileData.avatar) {
              metadata.image = profileData.avatar;
            }
          }
        } catch (e) {
          console.error("[SSR] Error getting profile metadata:", e);
        }
      }

      // 4. Family tree Check: /vamshavali/v/:shareId
      const vamshavaliMatch = req.path.match(/^\/vamshavali\/v\/([^\/]+)/i);
      if (vamshavaliMatch) {
        const [_, shareId] = vamshavaliMatch;
        try {
          const familyData = await getVamshavaliItem(shareId);
          if (familyData) {
            metadata.title = `${familyData.name} | Barnia Vamshavali 🌳`;
            metadata.description = familyData.description;
            if (familyData.image) {
              metadata.image = familyData.image;
            }
          }
        } catch (e) {
          console.error("[SSR] Error getting family metadata:", e);
        }
      }
      
      html = await injectMetaTags(html, metadata);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (err) {
      console.error("[SSR] Error:", err);
      res.status(500).send("Internal Server Error");
    }
  });
}
