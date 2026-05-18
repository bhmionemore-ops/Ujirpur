import express from "express";
import { getGeminiApiKey, callGeminiWithRetry } from "./gemini";

export function setupNumerologyRoutes(app: express.Application) {
  app.get("/api/numerology", async (req, res) => {
    const { dob } = req.query;
    if (!dob) return res.status(400).json({ error: "Date of Birth is required" });

    try {
      const apiKey = await getGeminiApiKey();
      const prompt = `Perform a Vedic Numerology reading for DOB: ${dob}.`;
      const response = await callGeminiWithRetry(apiKey, {
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      res.json({ reading: response.text });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
