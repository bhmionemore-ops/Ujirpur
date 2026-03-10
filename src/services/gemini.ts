import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  category: string;
  imageUrl: string;
}

export async function generateLocalNews(location: string): Promise<NewsItem[]> {
  const prompt = `Generate 3 realistic local news articles for the area: ${location}. 
  The news should be relevant to a small village/town in West Bengal, India.
  Include a title, a short summary (2-3 sentences), a category (e.g., Agriculture, Education, Local Event), and a placeholder image description.
  Return the result as a JSON array of objects with properties: title, content, category, date (today's date in YYYY-MM-DD format).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return [];

    const rawNews = JSON.parse(text);
    return rawNews.map((item: any, index: number) => ({
      ...item,
      id: `news-${Date.now()}-${index}`,
      imageUrl: `https://picsum.photos/seed/${item.category}-${index}/800/400`,
    }));
  } catch (error) {
    console.error("Error generating news:", error);
    return [];
  }
}
