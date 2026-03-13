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
      fullContent: 'পরিবেশ রক্ষায় নদীয়া জেলা প্রশাসনের পক্ষ থেকে প্লাস্টিক বর্জন অভিযান শুরু হয়েছে। স্থানীয় ব্যবসায়ীদের সচেতন করা হচ্ছে। প্রশাসনের পক্ষ থেকে জানানো হয়েছে যে, ৭৫ মাইক্রনের নিচে প্লাস্টিক ব্যবহার করলে জরিমানা করা হবে। বিভিন্ন বাজার এলাকায মাইকিং করে প্রচার চালানো হচ্ছে এবং বিকল্প হিসেবে চটের ব্যাগ বা কাগজের ব্যাগ ব্যবহারের পরামর্শ দেওয়া হচ্ছে।',
      date: new Date().toISOString().split('T')[0],
      category: 'পরিবেশ',
      imageUrl: 'https://picsum.photos/seed/environment-nadia/800/400',
      sourceUrl: '#',
      isFallback: true
    },
    {
      id: 'fallback-3',
      title: 'উজিরপুর বার্নিয়া ডিজিটাল হাবের নতুন মোবাইল অ্যাপ চালু',
      content: 'স্থানীয় বাসিন্দাদের জন্য ডিজিটাল হাবের পক্ষ থেকে একটি নতুন মোবাইল অ্যাপ চালু করা হয়েছে।',
      date: new Date().toISOString().split('T')[0],
      category: 'প্রযুক্তি',
      imageUrl: 'https://picsum.photos/seed/tech-nadia/800/400',
      isFallback: true
    },
    {
      id: 'fallback-4',
      title: 'বার্নিয়া হাই স্কুলে বার্ষিক ক্রীড়া প্রতিযোগিতা সম্পন্ন',
      content: 'স্থানীয় বার্নিয়া হাই স্কুলে অত্যন্ত উৎসাহের সাথে বার্ষিক ক্রীড়া প্রতিযোগিতা সম্পন্ন হলো।',
      date: new Date().toISOString().split('T')[0],
      category: 'খেলাধুলা',
      imageUrl: 'https://picsum.photos/seed/sports-nadia/800/400',
      isFallback: true
    },
    {
      id: 'fallback-5',
      title: 'নদীয়ার তাঁত শিল্পীদের জন্য সরকারি অনুদান ঘোষণা',
      content: 'রাজ্য সরকারের পক্ষ থেকে নদীয়ার তাঁত শিল্পীদের জন্য বিশেষ আর্থিক অনুদানের কথা ঘোষণা করা হয়েছে।',
      date: new Date().toISOString().split('T')[0],
      category: 'শিল্প',
      imageUrl: 'https://picsum.photos/seed/art-nadia/800/400',
      isFallback: true
    },
    {
      id: 'fallback-6',
      title: 'বার্নিয়া প্রাথমিক স্বাস্থ্য কেন্দ্রে বিনামূল্যে স্বাস্থ্য শিবির',
      content: 'আগামী রবিবার বার্নিয়া প্রাথমিক স্বাস্থ্য কেন্দ্রে একটি বিনামূল্যে স্বাস্থ্য শিবিরের আয়োজন করা হয়েছে।',
      date: new Date().toISOString().split('T')[0],
      category: 'স্বাস্থ্য',
      imageUrl: 'https://picsum.photos/seed/health-nadia/800/400',
      isFallback: true
    },
    {
      id: 'fallback-7',
      title: 'স্থানীয় মেলায় হস্তশিল্পের প্রদর্শনী নজর কাড়ছে',
      content: 'বার্নিয়া বার্ষিক মেলায় স্থানীয় শিল্পীদের তৈরি হস্তশিল্পের প্রদর্শনী দর্শকদের নজর কাড়ছে।',
      date: new Date().toISOString().split('T')[0],
      category: 'সংস্কৃতি',
      imageUrl: 'https://picsum.photos/seed/culture-nadia/800/400',
      isFallback: true
    },
    {
      id: 'fallback-8',
      title: 'নদীয়ায় নতুন পর্যটন কেন্দ্র গড়ে তোলার পরিকল্পনা',
      content: 'পর্যটন শিল্পের বিকাশে নদীয়ার বিভিন্ন ঐতিহাসিক স্থানে নতুন পর্যটন কেন্দ্র গড়ে তোলার পরিকল্পনা নেওয়া হয়েছে।',
      date: new Date().toISOString().split('T')[0],
      category: 'পর্যটন',
      imageUrl: 'https://picsum.photos/seed/tourism-nadia/800/400',
      isFallback: true
    },
    {
      id: 'fallback-9',
      title: 'বার্নিয়া বাজারে অগ্নি নির্বাপক মহড়া অনুষ্ঠিত',
      content: 'অগ্নি নিরাপত্তা নিশ্চিত করতে বার্নিয়া বাজারে দমকল বাহিনীর পক্ষ থেকে একটি মহড়া অনুষ্ঠিত হলো।',
      date: new Date().toISOString().split('T')[0],
      category: 'নিরাপত্তা',
      imageUrl: 'https://picsum.photos/seed/safety-nadia/800/400',
      isFallback: true
    },
    {
      id: 'fallback-10',
      title: 'স্থানীয় যুবকদের জন্য দক্ষতা বৃদ্ধি প্রশিক্ষণ শুরু',
      content: 'বেকার যুবকদের স্বনির্ভর করতে ডিজিটাল হাবের পক্ষ থেকে দক্ষতা বৃদ্ধি প্রশিক্ষণ শুরু হয়েছে।',
      date: new Date().toISOString().split('T')[0],
      category: 'শিক্ষা',
      imageUrl: 'https://picsum.photos/seed/edu-nadia/800/400',
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
    },
    {
      id: 'fallback-3',
      title: 'Digital Hub Launches New Mobile App for Residents',
      content: 'A new mobile application has been launched by the Digital Hub for local residents to access services easily.',
      date: new Date().toISOString().split('T')[0],
      category: 'Technology',
      imageUrl: 'https://picsum.photos/seed/tech-nadia/800/400',
      isFallback: true
    },
    {
      id: 'fallback-4',
      title: 'Annual Sports Meet Concludes at Barnia High School',
      content: 'The annual sports competition was successfully held at Barnia High School with great enthusiasm.',
      date: new Date().toISOString().split('T')[0],
      category: 'Sports',
      imageUrl: 'https://picsum.photos/seed/sports-nadia/800/400',
      isFallback: true
    },
    {
      id: 'fallback-5',
      title: 'Government Grant Announced for Nadia Weavers',
      content: 'The state government has announced a special financial grant for the weavers of Nadia district.',
      date: new Date().toISOString().split('T')[0],
      category: 'Industry',
      imageUrl: 'https://picsum.photos/seed/art-nadia/800/400',
      isFallback: true
    },
    {
      id: 'fallback-6',
      title: 'Free Health Camp at Barnia Primary Health Center',
      content: 'A free health check-up camp has been organized at the Barnia Primary Health Center this Sunday.',
      date: new Date().toISOString().split('T')[0],
      category: 'Health',
      imageUrl: 'https://picsum.photos/seed/health-nadia/800/400',
      isFallback: true
    },
    {
      id: 'fallback-7',
      title: 'Handicraft Exhibition Attracts Crowds at Local Fair',
      content: 'The exhibition of handicrafts made by local artists is drawing visitors at the Barnia annual fair.',
      date: new Date().toISOString().split('T')[0],
      category: 'Culture',
      imageUrl: 'https://picsum.photos/seed/culture-nadia/800/400',
      isFallback: true
    },
    {
      id: 'fallback-8',
      title: 'Plans for New Tourism Hubs in Nadia District',
      content: 'Plans have been made to develop new tourism centers at various historical sites in Nadia to boost tourism.',
      date: new Date().toISOString().split('T')[0],
      category: 'Tourism',
      imageUrl: 'https://picsum.photos/seed/tourism-nadia/800/400',
      isFallback: true
    },
    {
      id: 'fallback-9',
      title: 'Fire Safety Drill Conducted at Barnia Bazar',
      content: 'A mock drill was conducted by the fire department at Barnia Bazar to ensure fire safety compliance.',
      date: new Date().toISOString().split('T')[0],
      category: 'Safety',
      imageUrl: 'https://picsum.photos/seed/safety-nadia/800/400',
      isFallback: true
    },
    {
      id: 'fallback-10',
      title: 'Skill Development Training Starts for Local Youth',
      content: 'Skill development training has started by the Digital Hub to make unemployed youth self-reliant.',
      date: new Date().toISOString().split('T')[0],
      category: 'Education',
      imageUrl: 'https://picsum.photos/seed/edu-nadia/800/400',
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

export const FALLBACK_TRENDING: Record<'bn' | 'en', NewsItem[]> = {
  bn: [
    { id: 't-1', title: 'ভারতে ডিজিটাল বিপ্লব: নতুন মাইলফলক স্পর্শ', content: 'ভারতের ডিজিটাল অর্থনীতি দ্রুত গতিতে বৃদ্ধি পাচ্ছে।', date: new Date().toISOString().split('T')[0], category: 'জাতীয়', imageUrl: 'https://picsum.photos/seed/india-1/800/400' },
    { id: 't-2', title: 'ভারতীয় মহাকাশ গবেষণায় নতুন দিগন্ত: ইসরোর সাফল্য', content: 'ইসরো সফলভাবে নতুন স্যাটেলাইট উৎক্ষেপণ করেছে।', date: new Date().toISOString().split('T')[0], category: 'বিজ্ঞান', imageUrl: 'https://picsum.photos/seed/india-2/800/400' },
    { id: 't-3', title: 'ক্রিকেট: ভারত বনাম অস্ট্রেলিয়া সিরিজের উত্তেজনা তুঙ্গে', content: 'আসন্ন বর্ডার-গাভাস্কার ট্রফি নিয়ে ক্রিকেট প্রেমীদের মধ্যে উন্মাদনা।', date: new Date().toISOString().split('T')[0], category: 'খেলাধুলা', imageUrl: 'https://picsum.photos/seed/india-3/800/400' },
    { id: 't-4', title: 'ভারতীয় অর্থনীতিতে জোয়ার: জিডিপি বৃদ্ধির পূর্বাভাস', content: 'বিশ্বব্যাংক ভারতের অর্থনৈতিক বৃদ্ধির প্রশংসা করেছে।', date: new Date().toISOString().split('T')[0], category: 'অর্থনীতি', imageUrl: 'https://picsum.photos/seed/india-4/800/400' },
    { id: 't-5', title: 'পরিবেশ রক্ষা: ভারতে নবায়নযোগ্য শক্তির প্রসার', content: 'সৌর শক্তি উৎপাদনে ভারত বিশ্বে প্রথম সারিতে উঠে আসছে।', date: new Date().toISOString().split('T')[0], category: 'পরিবেশ', imageUrl: 'https://picsum.photos/seed/india-5/800/400' },
    { id: 't-6', title: 'শিক্ষা ক্ষেত্রে সংস্কার: নতুন জাতীয় শিক্ষা নীতির প্রভাব', content: 'দেশজুড়ে নতুন শিক্ষা নীতি বাস্তবায়নের কাজ চলছে।', date: new Date().toISOString().split('T')[0], category: 'শিক্ষা', imageUrl: 'https://picsum.photos/seed/india-6/800/400' },
    { id: 't-7', title: 'পর্যটন: ভারতের ঐতিহাসিক স্থানগুলিতে পর্যটকদের ভিড়', content: 'তাজমহলসহ বিভিন্ন স্থানে পর্যটকদের সংখ্যা রেকর্ড ছাড়িয়েছে।', date: new Date().toISOString().split('T')[0], category: 'পর্যটন', imageUrl: 'https://picsum.photos/seed/india-7/800/400' },
    { id: 't-8', title: 'স্বাস্থ্য: আয়ুষ্মান ভারত প্রকল্পের সাফল্য', content: 'কোটি কোটি মানুষ এই প্রকল্পের মাধ্যমে বিনামূল্যে চিকিৎসা পাচ্ছেন।', date: new Date().toISOString().split('T')[0], category: 'স্বাস্থ্য', imageUrl: 'https://picsum.photos/seed/india-8/800/400' },
    { id: 't-9', title: 'প্রযুক্তি: ভারতে ৫জি পরিষেবার দ্রুত বিস্তার', content: 'গ্রামাঞ্চলেও এখন দ্রুতগতির ইন্টারনেট পৌঁছে যাচ্ছে।', date: new Date().toISOString().split('T')[0], category: 'প্রযুক্তি', imageUrl: 'https://picsum.photos/seed/india-9/800/400' },
    { id: 't-10', title: 'সংস্কৃতি: ভারতীয় চলচ্চিত্রের বিশ্বজয়', content: 'আন্তর্জাতিক মঞ্চে ভারতীয় সিনেমা এবং সংগীতের জয়জয়কার।', date: new Date().toISOString().split('T')[0], category: 'বিনোদন', imageUrl: 'https://picsum.photos/seed/india-10/800/400' }
  ],
  en: [
    { id: 't-1', title: 'Digital Revolution in India: Touching New Milestones', content: 'India\'s digital economy is growing at a rapid pace.', date: new Date().toISOString().split('T')[0], category: 'National', imageUrl: 'https://picsum.photos/seed/india-1/800/400' },
    { id: 't-2', title: 'New Horizons in Indian Space Research: ISRO\'s Success', content: 'ISRO has successfully launched a new satellite.', date: new Date().toISOString().split('T')[0], category: 'Science', imageUrl: 'https://picsum.photos/seed/india-2/800/400' },
    { id: 't-3', title: 'Cricket: Excitement Peaks for India vs Australia Series', content: 'Enthusiasm among cricket fans for the upcoming Border-Gavaskar Trophy.', date: new Date().toISOString().split('T')[0], category: 'Sports', imageUrl: 'https://picsum.photos/seed/india-3/800/400' },
    { id: 't-4', title: 'Boom in Indian Economy: GDP Growth Forecast', content: 'The World Bank has praised India\'s economic growth.', date: new Date().toISOString().split('T')[0], category: 'Economy', imageUrl: 'https://picsum.photos/seed/india-4/800/400' },
    { id: 't-5', title: 'Environmental Protection: Expansion of Renewable Energy in India', content: 'India is emerging as a global leader in solar energy production.', date: new Date().toISOString().split('T')[0], category: 'Environment', imageUrl: 'https://picsum.photos/seed/india-5/800/400' },
    { id: 't-6', title: 'Education Reforms: Impact of New National Education Policy', content: 'Implementation of the new education policy is underway across the country.', date: new Date().toISOString().split('T')[0], category: 'Education', imageUrl: 'https://picsum.photos/seed/india-6/800/400' },
    { id: 't-7', title: 'Tourism: Record Crowds at India\'s Historical Sites', content: 'Tourist numbers at the Taj Mahal and other sites have broken records.', date: new Date().toISOString().split('T')[0], category: 'Tourism', imageUrl: 'https://picsum.photos/seed/india-7/800/400' },
    { id: 't-8', title: 'Health: Success of Ayushman Bharat Project', content: 'Millions of people are receiving free treatment through this project.', date: new Date().toISOString().split('T')[0], category: 'Health', imageUrl: 'https://picsum.photos/seed/india-8/800/400' },
    { id: 't-9', title: 'Technology: Rapid Expansion of 5G Services in India', content: 'High-speed internet is now reaching rural areas as well.', date: new Date().toISOString().split('T')[0], category: 'Technology', imageUrl: 'https://picsum.photos/seed/india-9/800/400' },
    { id: 't-10', title: 'Culture: Global Triumph of Indian Cinema', content: 'Indian movies and music are winning accolades on the international stage.', date: new Date().toISOString().split('T')[0], category: 'Entertainment', imageUrl: 'https://picsum.photos/seed/india-10/800/400' }
  ]
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
      return FALLBACK_TRENDING[language];
    }
  }

  return attemptFetch(true);
}

