import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  category: string;
  imageUrl: string;
  sourceUrl?: string;
  isFallback?: boolean;
}

const FALLBACK_NEWS: Record<'bn' | 'en', NewsItem[]> = {
  bn: [
    {
      id: 'fallback-1',
      title: 'বার্নিয়া বাজারে নতুন কৃষি বিপণন কেন্দ্র উদ্বোধন',
      content: 'স্থানীয় কৃষকদের সুবিধার্থে বার্নিয়া বাজারে একটি নতুন বিপণন কেন্দ্র খোলা হয়েছে। এর ফলে কৃষকরা সরাসরি তাদের পণ্য বিক্রি করতে পারবেন।',
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
      date: new Date().toISOString().split('T')[0],
      category: 'Environment',
      imageUrl: 'https://picsum.photos/seed/environment-nadia/800/400',
      sourceUrl: '#',
      isFallback: true
    }
  ]
};

export async function generateLocalNews(location: string, language: 'bn' | 'en' = 'bn'): Promise<NewsItem[]> {
  const today = new Date().toISOString().split('T')[0];
  const langName = language === 'bn' ? 'Bengali' : 'English';
  
  const prompt = `Find the most recent real local news for ${location} (Ujirpur, Barnia, Nadia, West Bengal, India) specifically for today (${today}) or the last 24-48 hours. 
  Focus on actual events, local developments, government announcements, or community news in the Nadia district.
  
  IMPORTANT: Return all text content (title, content, category) in ${langName}.
  
  Return the result as a JSON array of 3 objects with properties: 
  title (the headline in ${langName}), 
  content (a 2-3 sentence summary in ${langName}), 
  category (e.g., Agriculture, Education, Local Event, Infrastructure - in ${langName}), 
  date (the actual date of the news in YYYY-MM-DD format),
  sourceUrl (the URL to the original news source if found).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) return FALLBACK_NEWS[language];

    const rawNews = JSON.parse(text);
    
    // Extract grounding metadata if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    const items = rawNews.map((item: any, index: number) => {
      // Try to find a relevant source URL from grounding if not provided in JSON
      const source = item.sourceUrl || (groundingChunks?.[index]?.web?.uri);
      
      return {
        ...item,
        id: `news-${Date.now()}-${index}`,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(item.title)}-${index}/800/400`,
        sourceUrl: source || '#',
      };
    });

    return items.length > 0 ? items : FALLBACK_NEWS[language];
  } catch (error: any) {
    // Check for quota exhaustion (429)
    if (error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('429') || error?.code === 429) {
      console.warn("Gemini API quota exhausted. Using fallback news.");
    } else {
      console.error("Error generating news:", error);
    }
    // Return fallback news instead of an empty array to ensure the UI stays functional
    return FALLBACK_NEWS[language];
  }
}
