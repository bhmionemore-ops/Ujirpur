import express from "express";
import fetch from "node-fetch";
import { getTelegramBotToken } from "./telegram-bot";
import { getGeminiApiKey, callGeminiWithRetry } from "./gemini";
import { generateSitemapXml } from "./sitemap";
import { robustSendMail, getSmtpLogs } from "./email";
import { FIRESTORE_SERVER_KEY } from "./constants";
import { parseGeminiJson } from "./utils";
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, query, where, limit, getDocs, getDocFromServer, updateDoc, deleteDoc } from "firebase/firestore";
import path from "path";
import fs from "fs/promises";
import * as DB from "./db";

export function setupRoutes(app: express.Application, _db: any, _adminDb: any, firebaseConfig: any, newsLocks: Map<string, number>) {
  // Health
  app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
  app.get("/api/ping", (req, res) => res.send("pong"));

  // Sitemap
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = "https://barnia.in";
      const sitemap = await generateSitemapXml(baseUrl, DB.state.db, DB.state.adminDb, firebaseConfig);
      res.status(200).set("Content-Type", "application/xml").send(sitemap);
    } catch (error) {
      console.error("[SEO] Error generating sitemap.xml:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Proxy
  app.get("/api/telegram-proxy", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl || !imageUrl.includes("telegram.org")) return res.status(403).send("Forbidden");
    try {
      const response = await fetch(imageUrl, { family: 4 });
      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      const buffer = await response.buffer();
      res.send(buffer);
    } catch (error) {
      res.status(500).send("Proxy error");
    }
  });

  // Inbound Email
  app.post("/api/webhooks/email", async (req, res) => {
    const { from, to, subject, text, html } = req.body;
    try {
      if (DB.state.adminDb) {
        await DB.state.adminDb.collection("inbound_emails").add({
          from: from || "unknown",
          to: to || "system",
          subject: subject || "No Subject",
          body: text || html || "",
          timestamp: new Date()
        });
      }
      res.json({ status: "success" });
    } catch (e) {
      res.status(500).send("Email processing error");
    }
  });

  // ... other routes (I will add them as I progress)
}
