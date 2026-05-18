import { GoogleGenAI } from "@google/genai";
import path from "path";
import fs from "fs/promises";
import express from "express";

export async function callGeminiWithRetry(apiKey: string, options: any, maxRetries = 3) {
  if (!apiKey) throw new Error("Gemini API Key is missing");
  
  // Use the modern @google/genai SDK as per the gemini-api skill
  const ai = new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  let lastError: any;
  
  // Recommended model aliases from the gemini-api skill
  const fallbackModels = [
    "gemini-3-flash-preview",
    "gemini-flash-latest",
    "gemini-1.5-flash-8b",
    "gemini-3.1-flash-lite",
    "gemini-1.5-pro-latest",
    "gemini-3.1-pro-preview"
  ];
  
  const requestedModel = options.model || "gemini-3-flash-preview";
  const modelsToTry = Array.from(new Set([
    requestedModel,
    ...fallbackModels
  ]));
  
  const totalAttempts = Math.max(modelsToTry.length, maxRetries + 1);
  
  for (let i = 0; i < totalAttempts; i++) {
    const currentModel = modelsToTry[i % modelsToTry.length];
    
    try {
      console.log(`[Gemini] Requesting ${currentModel}... (Attempt ${i+1}/${maxRetries+1})`);
      
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: options.contents,
        config: options.config || options.generationConfig || { 
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        }
      });
      
      const textValue = response.text;
      
      if (textValue) {
        console.log(`[Gemini] Success with ${currentModel}`);
        return { text: textValue, modelUsed: currentModel };
      }
      
      console.warn(`[Gemini] ${currentModel} returned empty response.`);
      continue;
    } catch (error: any) {
      lastError = error;
      const errorStr = (error?.message || String(error)).toLowerCase();
      console.error(`[Gemini] Error with ${currentModel}:`, errorStr);

      const isQuotaExceeded = errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("resource_exhausted");
      const isUnavailable = errorStr.includes("503") || errorStr.includes("overloaded") || errorStr.includes("unavailable");
      const isNotFoundError = errorStr.includes("404") || errorStr.includes("not found");

      // For 429 errors with gemini-3 series, we might need a longer backoff or to switch models immediately
      if (i < maxRetries || (isQuotaExceeded && i < totalAttempts)) {
        const baseDelay = isQuotaExceeded ? 5000 : (isUnavailable ? 2000 : (isNotFoundError ? 0 : 1000));
        const delay = isNotFoundError ? 0 : ((Math.pow(2, i % 3) * baseDelay) + Math.random() * 1000);
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export function setupGeminiRoute(app: express.Application) {
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const apiKey = await getGeminiApiKey();
      const { model, contents, config } = req.body;
      const result = await callGeminiWithRetry(apiKey, { model, contents, config });
      res.json(result);
    } catch (e: any) {
      console.error("[GeminiAPI] Error:", e);
      res.status(500).json({ error: e.message || "Failed to generate content" });
    }
  });
}

export async function getGeminiApiKey(firebaseConfig?: any): Promise<string> {
  const keyNames = [
    'GOOGLE_API_KEY',
    'GEMINI_API_KEY',
    'NEXT_PUBLIC_GEMINI_API_KEY',
    'API_KEY',
    'VITE_GEMINI_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY'
  ];

  let apiKey: string | undefined;

  for (const name of keyNames) {
    const val = process.env[name];
    if (val && 
        val !== "MY_GEMINI_API_KEY" && 
        val !== "" && 
        val !== "undefined" && 
        val !== "null" &&
        val !== "AI Studio Free Tier"
    ) {
      apiKey = val;
      break;
    }
  }

  if (!apiKey) {
    const aizaKeyName = Object.keys(process.env).find(k => {
      const val = process.env[k];
      return val && typeof val === 'string' && val.startsWith('AIza') && val.length > 10;
    });
    if (aizaKeyName) {
      apiKey = process.env[aizaKeyName];
    }
  }

  if (!apiKey) {
    try {
      const configPath = path.resolve("firebase-applet-config.json");
      const configData = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(configData);
      if (config.apiKey && !config.apiKey.includes("TODO") && config.apiKey.length > 10) {
        apiKey = config.apiKey;
      }
    } catch (e: any) {}
  }
  
  if (!apiKey) {
    throw new Error("Gemini API key is missing.");
  }

  return apiKey;
}
