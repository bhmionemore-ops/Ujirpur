import { GoogleGenAI } from "@google/genai";

/**
 * Mock news data as a last resort fallback
 */
function getMockNews(language: 'bn' | 'en', date: string) {
  const isBn = language === 'bn';
  return {
    local: [
      {
        title: isBn ? "বার্নিয়া এবং নদীয়া জেলায় নতুন উন্নয়ন প্রকল্প" : "New Development Projects in Barnia and Nadia District",
        content: isBn 
          ? "বার্নিয়া এবং নদীয়া জেলার বিভিন্ন স্থানে নতুন উন্নয়নমূলক কাজ শুরু হয়েছে। স্থানীয় প্রশাসন রাস্তাঘাট সংস্কার এবং পানীয় জলের সুব্যবস্থার ওপর জোর দিচ্ছে। এই প্রকল্পগুলো সম্পন্ন হলে এলাকার মানুষের জীবনযাত্রার মান উন্নত হবে বলে আশা করা হচ্ছে।"
          : "New developmental works have started in various parts of Barnia and Nadia districts. The local administration is emphasizing on road repairs and better drinking water facilities. It is expected that once these projects are completed, the standard of living of the local people will improve.",
        source: "Barnia News Desk",
        date: date
      },
      {
        title: isBn ? "স্থানীয় বাজারে কৃষিপণ্যের ভালো ফলন" : "Good Harvest of Agricultural Products in Local Markets",
        content: isBn
          ? "এই মৌসুমে নদীয়া জেলার কৃষকরা ভালো ফলন পেয়েছেন। স্থানীয় বাজারে টাটকা শাকসবজি এবং ফলের সরবরাহ বৃদ্ধি পেয়েছে। কৃষকরা তাদের পণ্যের ন্যায্য মূল্য পাচ্ছেন বলে জানিয়েছেন, যা গ্রামীণ অর্থনীতিতে ইতিবাচক প্রভাব ফেলছে।"
          : "Farmers in Nadia district have had a good harvest this season. The supply of fresh vegetables and fruits in local markets has increased. Farmers have reported getting fair prices for their products, which is having a positive impact on the rural economy.",
        source: "Krishi Samachar",
        date: date
      },
      {
        title: isBn ? "বার্নিয়া স্কুলে সাংস্কৃতিক অনুষ্ঠানের আয়োজন" : "Cultural Program Organized at Barnia School",
        content: isBn
          ? "বার্নিয়ার একটি স্থানীয় স্কুলে বার্ষিক সাংস্কৃতিক অনুষ্ঠান অত্যন্ত ধুমধাম করে পালিত হয়েছে। ছাত্রছাত্রীরা নাচ, গান এবং নাটকের মাধ্যমে তাদের প্রতিভা প্রদর্শন করেছে। অনুষ্ঠানে এলাকার বিশিষ্ট ব্যক্তিবর্গ উপস্থিত ছিলেন এবং বিজয়ীদের পুরস্কৃত করা হয়েছে।"
          : "The annual cultural program at a local school in Barnia was celebrated with great pomp. Students showcased their talent through dance, song, and drama. Eminent personalities of the area were present at the event and winners were rewarded.",
        source: "Local Education News",
        date: date
      }
    ],
    fbTrends: [
      {
        title: "Top 1 (WB): #BarniaVibes",
        content: "Viral Strategy: Share photos of local scenic beauty. Hook Idea: 'Did you know Barnia looks this beautiful at sunset?' Creation Tips: Use warm filters and local folk music. Viral Secret: Tag local community groups. Engagement Booster: Ask followers to share their favorite local spot.",
        source: "Social Trends India",
        date: date
      }
    ],
    igTrends: [
      {
        title: "Top 1 (WB): Local Food Reels",
        content: "Viral Strategy: Showcasing street food of Nadia. Hook Idea: 'Best Jhalmuri in Nadia?' Creation Tips: Fast cuts, close-ups of food preparation. Viral Secret: Use trending Bengali audio tracks. Engagement Booster: Poll about favorite street food. Monetization Tip: Partner with local eateries.",
        source: "Insta Insights",
        date: date
      }
    ],
    isMock: true,
    date: date
  };
}

export async function fetchLiveNews(language: 'bn' | 'en' = 'en', targetDate?: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing in the frontend environment.");
    // Fallback to mock data immediately if no API key
    return getMockNews(language, targetDate || new Date().toISOString().split('T')[0]);
  }

  const ai = new GoogleGenAI({ apiKey });
  const langName = language === 'bn' ? 'Bengali' : 'English';
  const displayDate = targetDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const prompt = `Find the latest news and trends for the date: ${displayDate} for the following categories:
  
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
  Return exactly 5 items per category. Ensure the news is relevant to ${displayDate}.`;

  const models = [
    { name: "gemini-3-flash-preview", useTools: true },
    { name: "gemini-2.0-flash", useTools: true },
    { name: "gemini-3.1-pro-preview", useTools: true },
    { name: "gemini-1.5-flash", useTools: true }
  ];

  for (let i = 0; i < models.length; i++) {
    const modelInfo = models[i];
    console.log(`[NewsService] Attempt ${i + 1}: Using model ${modelInfo.name}`);
    
    try {
      const config: any = {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      };
      
      if (modelInfo.useTools) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: modelInfo.name,
        contents: prompt,
        config: config,
      });

      if (!response || !response.text) {
        throw new Error(`Empty response from ${modelInfo.name}`);
      }

      const text = response.text || "{}";
      // Robustly clean JSON: remove markdown and escape literal control characters in strings
      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
      }
      
      const sanitized = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/gs, (m) => 
        m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
      );

      const parsed = JSON.parse(sanitized);
      
      console.log(`[NewsService] Successfully generated news with ${modelInfo.name}`);
      
      const result = {
        local: parsed.local || [],
        fbTrends: parsed.fbTrends || [],
        igTrends: parsed.igTrends || [],
        updatedAt: new Date().toISOString(),
        modelUsed: modelInfo.name,
        date: targetDate || new Date().toISOString().split('T')[0]
      };

      // Try to save to backend cache (fire and forget)
      saveNewsToCache(result, language).catch(err => console.error("[NewsService] Failed to cache news:", err));

      return result;
    } catch (error: any) {
      console.warn(`[NewsService] Attempt ${i + 1} (${modelInfo.name}) failed:`, error.message);
      
      if (i < models.length - 1) {
        const isQuotaError = error.message?.includes("429") || error.message?.toLowerCase().includes("quota");
        const delay = isQuotaError ? 3000 : 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If all models failed, return mock data
  console.error("[NewsService] All Gemini models failed. Returning mock news data.");
  return getMockNews(language, targetDate || new Date().toISOString().split('T')[0]);
}

async function saveNewsToCache(newsData: any, lang: string) {
  try {
    await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: newsData.date,
        lang: lang,
        newsData: newsData
      })
    });
  } catch (error) {
    console.error("[NewsService] Error saving news to cache:", error);
  }
}
