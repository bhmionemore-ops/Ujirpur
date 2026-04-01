import { GoogleGenAI } from "@google/genai";

export async function fetchLiveNews(language: 'bn' | 'en' = 'en'): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing in the frontend environment.");
    throw new Error("Gemini API key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });
  const langName = language === 'bn' ? 'Bengali' : 'English';
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const prompt = `Find the latest news and trends for today (${today}) for the following categories:
  
  1. Local News: 5 latest news items from Barnia, Nadia, West Bengal.
  2. Facebook Trends: 5 latest VIRAL trends for Facebook in India and West Bengal. Provide a "Viral Content Blueprint" for influencers.
  3. Instagram Trends: 5 latest VIRAL trends for Instagram in India and West Bengal. Provide a "Viral Content Blueprint" for influencers.
  
  For News items, provide: Title, Content (150-200 words), Source, Date.
  For Trends, provide: Title (e.g., "Top 1 (WB): ..."), Content (Viral Strategy: Why it's trending, Hook Idea, Creation Tips, Viral Secret, Engagement Booster, Monetization Tip, Hashtags), Source, Date.
  
  Return the data in exactly this JSON format:
  {
    "local": [{"title": "...", "content": "...", "source": "...", "date": "..."}],
    "fbTrends": [{"title": "...", "content": "...", "source": "...", "date": "..."}],
    "igTrends": [{"title": "...", "content": "...", "source": "...", "date": "..."}]
  }
  
  IMPORTANT: All text must be in ${langName}.
  Return exactly 5 items per category.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });

    const text = response.text || "{}";
    const cleanedText = text.trim().replace(/```json/g, "").replace(/```/g, "");
    const parsed = JSON.parse(cleanedText);
    
    return {
      local: parsed.local || [],
      fbTrends: parsed.fbTrends || [],
      igTrends: parsed.igTrends || [],
      updatedAt: new Date().toISOString()
    };
  } catch (error: any) {
    console.error("News generation failed on frontend:", error);
    throw error;
  }
}
