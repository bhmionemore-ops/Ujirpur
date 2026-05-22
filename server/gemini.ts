import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import path from "path";
import fs from "fs/promises";
import express from "express";

export async function callGeminiWithRetry(apiKey: string, options: any, maxRetries = 3) {
  if (!apiKey) throw new Error("Gemini API Key is missing");
  
  // Use the modern @google/genai SDK
  const ai = new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  let lastError: any;
  
  // Recommended model aliases from the gemini-api skill
  const fallbackModels = [
    "gemini-2.0-flash-exp",     // Experimental fallback (Higher quota usually)
    "gemini-2.0-flash",         // Newer stable if available
    "gemini-1.5-flash",         // Solid 15RPM fallback
    "gemini-1.5-flash-8b",      // High throughput
    "gemini-3.1-flash-lite",    // Lightweight fallback
    "gemini-flash-latest",      // Alias
    "gemini-3-flash-preview",   // Low quota (20/day) - move to end
    "gemini-exp-1206",          // Experimental fallback
  ];
  
  const requestedModel = options.model || "gemini-3-flash-preview";
  const modelsToTry = Array.from(new Set([
    requestedModel,
    ...fallbackModels
  ]));
  
  // Try models in rotation up to (maxRetries + 1) cycles or until exhausted
  const totalAttempts = modelsToTry.length * (maxRetries + 1);
  const backoffDelays = [1000, 2000, 4000, 8000];
  
  for (let i = 0; i < totalAttempts; i++) {
    const currentModel = modelsToTry[i % modelsToTry.length];
    const cycle = Math.floor(i / modelsToTry.length);
    
    try {
      console.log(`[Gemini] Requesting ${currentModel}... (Attempt ${i+1}/${totalAttempts}, Cycle ${cycle+1})`);
      
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: currentModel,
        contents: options.contents,
        config: options.config || options.generationConfig || {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        },
      });
      
      const textValue = response.text;
      
      if (textValue) {
        console.log(`[Gemini] Success with ${currentModel}`);
        return { text: textValue, modelUsed: currentModel };
      }
      
      console.warn(`[Gemini] ${currentModel} returned empty response.`);
    } catch (error: any) {
      lastError = error;
      const errorStr = (error?.message || String(error)).toLowerCase();
      console.error(`[Gemini] Error with ${currentModel}:`, errorStr);

      const isQuotaExceeded = errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("resource_exhausted");
      const isUnavailable = errorStr.includes("503") || errorStr.includes("overloaded") || errorStr.includes("unavailable");
      const isNotFoundError = errorStr.includes("404") || errorStr.includes("not found");

      if (i < totalAttempts - 1) {
        let delay = 0;
        if (isQuotaExceeded) {
          // Check for retryDelay in the error details if available
          let retryAfter = 0;
          try {
            // Some versions of the SDK or direct API responses include structured error data
            const match = errorStr.match(/retrydelay["\s:]+["'](\d+)s/);
            if (match && match[1]) {
              retryAfter = parseInt(match[1]) * 1000;
              console.log(`[Gemini] Detected retrydelay of ${retryAfter}ms from error message.`);
            }
          } catch (e) {}

          // Robust backoff for quota
          // If we have a retryAfter, we use it, otherwise use cycle-based backoff
          const cycleDelay = cycle === 0 ? 500 : backoffDelays[Math.min(cycle - 1, backoffDelays.length - 1)];
          delay = Math.max(cycleDelay, retryAfter > 0 && retryAfter < 10000 ? retryAfter : 0);
          
          if (delay > 0) {
            console.log(`[Gemini] Quota exceeded. Waiting ${delay}ms before trying ${modelsToTry[(i + 1) % modelsToTry.length]}.`);
          }
        } else if (isUnavailable || isNotFoundError) {
          delay = isNotFoundError ? 0 : 1000;
        } else {
          delay = 1000;
        }

        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        continue;
      }
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
