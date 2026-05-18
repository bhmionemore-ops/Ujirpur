import express from "express";
import { getGeminiApiKey, callGeminiWithRetry } from "./gemini";

export function setupAdminRoutes(app: express.Application, newsLocks: Map<string, number>) {
  app.get("/api/admin/test-gemini", async (req, res) => {
    try {
      const apiKey = await getGeminiApiKey();
      const response = await callGeminiWithRetry(apiKey, { model: "gemini-3-flash-preview", contents: "Ping" });
      res.json({ status: "success", text: response.text });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/debug-news", (req, res) => {
    res.json({ message: "Debug info", locksCount: newsLocks.size });
  });
}
