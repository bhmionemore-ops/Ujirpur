import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  fullContent?: string;
  date: string;
  category: string;
  imageUrl: string;
  sourceUrl?: string;
  isFallback?: boolean;
  createdAt?: any;
}

export const FALLBACK_NEWS: Record<'bn' | 'en', NewsItem[]> = {
  bn: [
    {
      id: 'fallback-1',
      title: 'বার্নিয়া বাজারে নতুন কৃষি বিপণন কেন্দ্র উদ্বোধন',
      content: 'স্থানীয় কৃষকদের সুবিধার্থে বার্নিয়া বাজারে একটি নতুন বিপণন কেন্দ্র খোলা হয়েছে। এর ফলে কৃষকরা সরাসরি তাদের পণ্য বিক্রি করতে পারবেন।',
      fullContent: 'স্থানীয় কৃষকদের সুবিধার্থে বার্নিয়া বাজারে একটি নতুন বিপণন কেন্দ্র খোলা হয়েছে। এর ফলে কৃষকরা সরাসরি তাদের পণ্য বিক্রি করতে পারবেন। এই কেন্দ্রটি আধুনিক সুযোগ-সুবিধা সম্পন্ন এবং এখানে কৃষকদের জন্য বিশেষ প্রশিক্ষণ শিবিরেরও ব্যবস্থা করা হবে। জেলা প্রশাসনের পক্ষ থেকে জানানো হয়েছে যে, এর ফলে মধ্যস্বত্বভোগীদের দাপট কমবে এবং কৃষকরা তাদের পণ্যের সঠিক দাম পাবেন।',
      date: new Date().toISOString().split('T')[0],
      category: 'কৃষি',
      imageUrl: 'https://picsum.photos/seed/agriculture-nadia/800/400',
      sourceUrl: '#',
      isFallback: true
    },
    {
      id: 'fallback-2',
      title: 'নদীয়া জেলায় প্লাস্টিক বর্জন অভিযান জোরদার',
      content: 'পরিবেশ রক্ষায় নদীয়া জেলা প্রশাসনের পক্ষ থেকে প্লাস্টিক বর্জন অভিযান শুরু হয়েছে। স্থানীয় ব্যবসায়ীদের সচেতন করা হচ্ছে।',
      fullContent: 'পরিবেশ রক্ষায় নদীয়া জেলা প্রশাসনের পক্ষ থেকে প্লাস্টিক বর্জন অভিযান শুরু হয়েছে। স্থানীয় ব্যবসায়ীদের সচেতন করা হচ্ছে। প্রশাসনের পক্ষ থেকে জানানো হয়েছে যে, ৭৫ মাইক্রনের নিচে প্লাস্টিক ব্যবহার করলে জরিমানা করা হবে। বিভিন্ন বাজার এলাকায় মাইকিং করে প্রচার চালানো হচ্ছে এবং বিকল্প হিসেবে চটের ব্যাগ বা কাগজের ব্যাগ ব্যবহারের পরামর্শ দেওয়া হচ্ছে।',
      date: new Date().toISOString().split('T')[0],
      category: 'পরিবেশ',
      imageUrl: 'https://picsum.photos/seed/environment-nadia/800/400',
      sourceUrl: '#',
      isFallback: true
    }
  ],
  en: [
    {
      id: 'fallback-1',
      title: 'New Agricultural Marketing Hub Opens in Barnia',
      content: 'A new marketing hub has been inaugurated in Barnia Bazar to help local farmers sell their produce directly to consumers.',
      fullContent: 'A new marketing hub has been inaugurated in Barnia Bazar to help local farmers sell their produce directly to consumers. This center is equipped with modern facilities and will also organize special training sessions for farmers. The district administration stated that this will reduce the influence of middlemen and ensure farmers get the right price for their products.',
      date: new Date().toISOString().split('T')[0],
      category: 'Agriculture',
      imageUrl: 'https://picsum.photos/seed/agriculture-nadia/800/400',
      sourceUrl: '#',
      isFallback: true
    },
    {
      id: 'fallback-2',
      title: 'Anti-Plastic Drive Intensifies in Nadia District',
      content: 'District administration has launched a major awareness campaign to eliminate single-use plastics from local markets.',
      fullContent: 'District administration has launched a major awareness campaign to eliminate single-use plastics from local markets. Authorities have announced that using plastic below 75 microns will result in fines. Campaigns are being conducted in various market areas via loudspeakers, and the use of jute or paper bags is being encouraged as an alternative.',
      date: new Date().toISOString().split('T')[0],
      category: 'Environment',
      imageUrl: 'https://picsum.photos/seed/environment-nadia/800/400',
      sourceUrl: '#',
      isFallback: true
    }
  ]
};

const NEWS_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The headline of the news." },
      content: { type: Type.STRING, description: "A 2-3 sentence summary." },
      fullContent: { type: Type.STRING, description: "A detailed full story (150-200 words)." },
      category: { type: Type.STRING, description: "Category like Agriculture, Education, etc." },
      date: { type: Type.STRING, description: "Date in YYYY-MM-DD format." },
      sourceUrl: { type: Type.STRING, description: "URL to the original news source." },
    },
    required: ["title", "content", "fullContent", "category", "date"],
  },
};

export async function generateLocalNews(location: string, language: 'bn' | 'en' = 'bn'): Promise<NewsItem[]> {
  const today = new Date().toISOString().split('T')[0];
  const langName = language === 'bn' ? 'Bengali' : 'English';
  
  const locationsToTry = [
    location, // Specific: Ujirpur Barnia Nadia
    "Nadia district, West Bengal, India", // Broader: Nadia District
    "West Bengal, India" // Broadest: West Bengal
  ];

  let retryCount = 0;
  const maxRetries = 2;

  async function attemptFetch(locIndex: number, useSearch: boolean = true): Promise<NewsItem[]> {
    const currentLocation = locationsToTry[locIndex];
    
    const prompt = `Find the top 10 most recent LIVE local news for ${currentLocation} specifically for today (${today}) or the last 24 hours. 
    Focus on actual events, local developments, government announcements, or community news.
    
    IMPORTANT: Return all text content (title, content, category, fullContent) in ${langName}.
    Return exactly 10 news items in the specified JSON format.
    
    If you cannot find news for the specific village, find news for the Nadia district or West Bengal that would be relevant to residents of ${location}.`;

    try {
      const config: any = {
        responseMimeType: "application/json",
        responseSchema: NEWS_SCHEMA,
      };
      
      if (useSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt + (useSearch ? "" : "\nNote: Search tool is unavailable. Use your internal knowledge to provide the most likely real recent news for this region."),
        config,
      });

      const text = response.text;
      if (!text) throw new Error("Empty response");

      const rawNews = JSON.parse(text);
      
      if (!Array.isArray(rawNews) || rawNews.length === 0) {
        if (locIndex < locationsToTry.length - 1) {
          console.warn(`No news found for ${currentLocation}, trying broader location...`);
          return attemptFetch(locIndex + 1, useSearch);
        }
        return FALLBACK_NEWS[language];
      }
      
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      
      return rawNews.map((item: any, index: number) => ({
        ...item,
        id: `news-${Date.now()}-${index}`,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(item.title)}-${index}/800/400`,
        sourceUrl: item.sourceUrl || (groundingChunks?.[index]?.web?.uri) || '#',
        isFallback: false
      }));

    } catch (error: any) {
      const errorMessage = error?.message || "";
      
      // Handle search tool failures or transient errors
      if (useSearch && (errorMessage.includes('Rpc failed') || errorMessage.includes('xhr error') || errorMessage.includes('UNKNOWN'))) {
        console.warn("Search tool failed, attempting without search...");
        return attemptFetch(locIndex, false);
      }

      if (retryCount < maxRetries) {
        retryCount++;
        await new Promise(r => setTimeout(r, 1000 * retryCount));
        return attemptFetch(locIndex, useSearch);
      }

      console.error("News generation failed:", error);
      return FALLBACK_NEWS[language];
    }
  }

  return attemptFetch(0, true);
}

export async function generateChatReply(message: string, history: { text: string; isBot: boolean }[], language: 'bn' | 'en' = 'en'): Promise<string> {
  const langName = language === 'bn' ? 'Bengali' : 'English';
  
  const systemInstruction = `You are the AI assistant for the "Ujirpur Barnia Digital Hub" website.
  Website Info:
  - Location: Ujirpur Barnia, Nadia, West Bengal, India.
  - Features: Live local news, Barnia Bazar (market prices), Influencer Network, and Collaboration Hub.
  - Contact Email: ujirpur.barnia6@gmail.com
  - Facebook: https://www.facebook.com/share/r/1HbN6N3EBa/
  - Instagram: https://www.instagram.com/ujirpur_barnia_nadia?igsh=Z2tqc3RvNTc1aHV5
  
  Your goal is to help users with information about the website and the local area.
  If someone asks for contact details, ALWAYS provide the email and Facebook link.
  
  IMPORTANT: Reply in ${langName}.
  Keep replies concise and helpful.`;

  const chatHistory = history.map(msg => ({
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

export async function generateTrendingNews(language: 'bn' | 'en' = 'en'): Promise<NewsItem[]> {
  const langName = language === 'bn' ? 'Bengali' : 'English';
  const prompt = `Find the top 10 trending news headlines in India right now. 
  Focus on national importance, sports, entertainment, or major current events.
  
  IMPORTANT: Return all text content (title, content, category, fullContent) in ${langName}.
  Return the results in the specified JSON format.`;

  let retryCount = 0;
  const maxRetries = 2;

  async function attemptFetch(useSearch: boolean = true): Promise<NewsItem[]> {
    try {
      const config: any = {
        responseMimeType: "application/json",
        responseSchema: NEWS_SCHEMA,
      };
      
      if (useSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt + (useSearch ? "" : "\nNote: Search tool is unavailable. Use your internal knowledge to provide the most likely real trending news in India."),
        config,
      });

      const text = response.text;
      if (!text) throw new Error("Empty response");

      const rawNews = JSON.parse(text);
      
      if (!Array.isArray(rawNews) || rawNews.length === 0) {
        throw new Error("No news found in response");
      }
      
      return rawNews.map((item: any, index: number) => ({
        ...item,
        id: `trending-${Date.now()}-${index}`,
        imageUrl: `https://picsum.photos/seed/trending-${index}/800/400`,
        isFallback: false
      }));
    } catch (error: any) {
      const errorMessage = error?.message || "";
      
      if (useSearch && (errorMessage.includes('Rpc failed') || errorMessage.includes('xhr error') || errorMessage.includes('UNKNOWN'))) {
        console.warn("Trending search tool failed, attempting without search...");
        return attemptFetch(false);
      }

      if (retryCount < maxRetries) {
        retryCount++;
        await new Promise(r => setTimeout(r, 1000 * retryCount));
        return attemptFetch(useSearch);
      }

      console.error("Trending news generation failed:", error);
      return [];
    }
  }

  return attemptFetch(true);
}

