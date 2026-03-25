import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateChatReply(message: string, history: { text: string; isBot: boolean }[], language: 'bn' | 'en' = 'en'): Promise<string> {
  const langName = language === 'bn' ? 'Bengali' : 'English';
  
  const systemInstruction = `You are the AI assistant for the "Ujirpur Barnia Digital Hub" website.
  Website Info:
  - Location: Ujirpur Barnia, Nadia, West Bengal, India.
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
      ? `Find the latest VIRAL trends for ${category} in India and West Bengal for today (${today}) and yesterday.
      The goal is to provide a "Viral Content Blueprint" for influencers to get more reach and engagement.
      For each set (Today and Yesterday), provide:
      - Top 3 West Bengal viral topics
      - Top 3 India viral topics
      
      For each viral topic, provide:
      - Title (Must start with "Top 1 (WB):", "Top 2 (WB):", "Top 1 (India):", etc., followed by the viral topic name)
      - Content (Detailed Viral Strategy: 
          1. Why it's trending.
          2. Viral Hook Idea: A specific opening line or visual to grab attention.
          3. Content Creation Tips: Step-by-step advice on how to film/edit the reel or post.
          4. Viral Secret: A pro-tip to help the post go viral (e.g., specific music, transition, or timing).
          5. Hashtags: A set of high-reach #hashtags).
      - Source (The platform or source of the trend).
      - Date (The date of the trend).
      
      Return exactly 12 items (6 for today, 6 for yesterday) in this JSON format:
      {
        "items": [{"title": "...", "content": "...", "source": "...", "date": "..."}]
      }
      
      IMPORTANT: All text must be in ${langName}.`
      : `Find the latest 5 news items for: ${category} from ${location}. 
      Focus on recent events from the last 24-48 hours. Today's date is ${today}.
      
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        maxOutputTokens: 4096,
      },
    });

    try {
      const parsed = JSON.parse(response.text || "{\"items\": []}");
      return parsed.items || [];
    } catch (e) {
      console.error(`Failed to parse ${category} news:`, e);
      return [];
    }
  };

  try {
    const [local, fbTrends, igTrends] = await Promise.all([
      generateCategoryNews("Local News", "Ujirpur Barnia, Nadia, West Bengal"),
      generateCategoryNews("Facebook", "India and West Bengal", true),
      generateCategoryNews("Instagram", "India and West Bengal", true)
    ]);

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

