import { GoogleGenAI } from "@google/genai";
import path from "path";
import fs from "fs/promises";

export async function callGeminiWithRetry(apiKey: string, options: any, maxRetries = 3) {
  if (!apiKey) throw new Error("Gemini API Key is missing");
  
  // Use the modern @google/genai SDK
  const ai = new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  let lastError: any;
  
  const fallbackModels = [
    "gemini-3-flash-preview",
    "gemini-flash-latest",
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash",
    "gemini-1.5-pro"
  ];
  
  const modelsToTry = Array.from(new Set([
    options.model || "gemini-3-flash-preview",
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

      if (i < maxRetries) {
        const baseDelay = isQuotaExceeded ? 5000 : (isUnavailable ? 2000 : (isNotFoundError ? 0 : 1000));
        const delay = isNotFoundError ? 0 : ((Math.pow(2, i) * baseDelay) + Math.random() * 1000);
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
