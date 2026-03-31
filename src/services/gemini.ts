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
  
  const generateCategoryNews = async (category: string, location: string, isTrend: boolean = false) => {
    const prompt = isTrend 
      ? `Find the latest 5 VIRAL trends for ${category} in India and West Bengal for today (${today}).
      The goal is to provide a "Viral Content Blueprint" for influencers to get more reach and engagement.
      
      For each viral topic, provide:
      - Title (Must start with "Top 1 (WB):", "Top 2 (WB):", "Top 1 (India):", etc., followed by the viral topic name)
      - Content (Detailed Viral Strategy: 
          1. Why it's trending: Explain the cultural or social reason.
          2. Viral Hook Idea: A specific opening line or visual to grab attention.
          3. Content Creation Tips: Step-by-step advice on how to film/edit the reel or post.
          4. Viral Secret: A pro-tip to help the post go viral (e.g., specific music, transition, or timing).
          5. Engagement Booster: A question or call-to-action to get comments.
          6. Monetization Tip: How to potentially earn from this trend.
          7. Hashtags: A set of high-reach #hashtags).
      - Source (The platform or source of the trend).
      - Date (The date of the trend).
      
      Return exactly 5 items in this JSON format:
      {
        "items": [{"title": "...", "content": "...", "source": "...", "date": "..."}]
      }
      
      Keep each "content" section under 250 words to ensure the data fits.
      IMPORTANT: All text must be in ${langName}.`
      : `Find the latest 5 news items for: ${category} from ${location}. 
      Focus on recent events from the last 24 hours. Today's date is ${today}.
      
      For each news item, provide:
      - Title
      - Content (Detailed summary, around 150-200 words. Be descriptive and thorough).
      - Source (Name of the news source).
      - Date (Actual date of the news).
      
      Return the data in the following JSON format:
      {
        "items": [{"title": "...", "content": "...", "source": "...", "date": "..."}]
      }
      
      IMPORTANT: All text must be in ${langName}.`;

    const maxRetries = 3;
    let retryCount = 0;

    const callGemini = async (): Promise<any> => {
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

        const text = response.text || "{\"items\": []}";
        const cleanedText = text.trim().replace(/```json/g, "").replace(/```/g, "");
        const parsed = JSON.parse(cleanedText);
        return parsed.items || [];
      } catch (error: any) {
        const isRateLimit = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED';
        
        if (isRateLimit && retryCount < maxRetries) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
          console.warn(`Rate limit hit for ${category}. Retrying in ${Math.round(delay)}ms... (Attempt ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return callGemini();
        }
        
        console.error(`Failed to fetch ${category} news:`, error);
        throw error;
      }
    };

    return callGemini();
  };

  try {
    // Stagger the calls to avoid hitting rate limits by making 3 heavy calls simultaneously
    const local = await generateCategoryNews("Local News", "Barnia, Nadia, West Bengal");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    const fbTrends = await generateCategoryNews("Facebook", "India and West Bengal", true);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    const igTrends = await generateCategoryNews("Instagram", "India and West Bengal", true);

    return {
      local,
      fbTrends,
      igTrends
    };
  } catch (error) {
    console.error("News generation failed:", error);
    throw error;
  }
}

