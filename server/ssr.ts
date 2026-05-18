import path from "path";
import fs from "fs/promises";
import { injectMetaTags } from "./meta";

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
      
      html = await injectMetaTags(html, metadata);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (err) {
      console.error("[SSR] Error:", err);
      res.status(500).send("Internal Server Error");
    }
  });
}
