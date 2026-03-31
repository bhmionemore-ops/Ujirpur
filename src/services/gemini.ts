import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateChatReply(message: string, history: { text: string; isBot: boolean }[], language: 'bn' | 'en' = 'en'): Promise<string> {
  const langName = language === 'bn' ? 'Bengali' : 'English';
  
  const systemInstruction = `You are the AI assistant for the "Barnia Digital Hub" website.
  Website Info:
  - Location: Barnia, Nadia, West Bengal, India.
  - Features: Barnia Bazar (market prices), Influencer Network, and Collaboration Hub.
  - Contact Email: ujirpur.barnia6@gmail.com
  - Facebook: https://www.facebook.com/share/r/1HbN6N3EBa/
  - Instagram: https://www.instagram.com/ujirpur_barnia_nadia?igsh=Z2tqc3RvNTc1aHV5
  
  Your goal is to help users with information about the website and the local area.
  If someone asks for contact details, ALWAYS provide the email and Facebook link.
  
  IMPORTANT: Reply in ${langName}.
  Keep replies concise and helpful.`;

  const chatHistory = history.slice(-10).map(msg => ({
    role: msg.isBot ? 'model' : 'user' as const,
    parts: [{ text: msg.text }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...chatHistory,
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction,
      },
    });

    return response.text || (language === 'bn' ? 'দুঃখিত, আমি এখন উত্তর দিতে পারছি না।' : 'Sorry, I cannot reply right now.');
  } catch (error) {
    console.error("Chat generation failed:", error);
    return language === 'bn' ? 'দুঃখিত, একটি ত্রুটি ঘটেছে।' : 'Sorry, an error occurred.';
  }
}

export async function fetchLiveNews(language: 'bn' | 'en' = 'en'): Promise<any> {
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
      igTrends: parsed.igTrends || []
    };
  } catch (error: any) {
    console.error("News generation failed:", error);
    throw error;
  }
}

