import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Newspaper, MapPin, Globe, Clock, RefreshCw, ChevronRight, X, Share2, Facebook, Twitter, MessageCircle, Link, Check, Instagram, Plus, ShieldCheck, Zap, Moon, Lightbulb, Sparkles, Key, TrendingUp, Coins, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useLanguage } from '../LanguageContext';
import { useTracking } from '../TrackingContext';
import { useFirebase } from '../FirebaseContext';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { fetchLiveNews } from '../services/newsService';

const SLIDESHOW_IMAGES = [
  "https://i.postimg.cc/SRnmvf8Y/Gemini-Generated-Image-ley1tyley1tyley1.png",
  "https://i.postimg.cc/Bnncj8x2/Gemini-Generated-Image-rwzq46rwzq46rwzq.png",
  "https://i.postimg.cc/Hn0RkJQ8/Gemini-Generated-Image-4uqd304uqd304uqd.png",
  "https://i.postimg.cc/XXMmVfZf/Gemini-Generated-Image-z1gyayz1gyayz1gy.png",
  "https://i.postimg.cc/3RXK5xb8/Gemini-Generated-Image-3luc943luc943luc.png",
  "https://i.postimg.cc/Pfy63krN/Gemini-Generated-Image-9komwk9komwk9kom.png"
];

const ensureArray = (val: any): any[] => {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') {
    return Object.values(val);
  }
  return [];
};

const parseTrendContent = (content: string) => {
  const keys = [
    'Viral Strategy', 'Hook Idea', 'Creation Tips', 'Viral Secret', 'Engagement Booster', 'Monetization Tip', 'Hashtags',
    'ভাইরাল কৌশল', 'হুক আইডিয়া', 'তৈরির টিপস', 'ভাইরাল সিক্রেট', 'এনগেজমেন্ট বুস্টার', 'মনিটাইজেশন টিপ', 'হ্যাশট্যাগ'
  ];
  
  // Build a regex to split the text by any of these keys followed by colon (and optional spaces)
  const pattern = new RegExp(`(${keys.join('|')})\\s*:`, 'gi');
  
  const matches = [...content.matchAll(pattern)];
  if (matches.length === 0) {
    return null;
  }
  
  const sections: { key: string; value: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const key = currentMatch[1];
    const startIndex = currentMatch.index! + currentMatch[0].length;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const value = content.substring(startIndex, endIndex).trim();
    sections.push({ key, value });
  }
  return sections;
};

const getTrendSectionConfig = (key: string, lang: string) => {
  const normalized = key.toLowerCase().trim();
  
  if (normalized.includes('strategy') || normalized.includes('কৌশল')) {
    return {
      title: lang === 'bn' ? 'ভাইরাল কৌশল' : 'Viral Strategy',
      bg: 'bg-blue-50/80 border border-blue-100 text-blue-950',
      iconBg: 'bg-blue-600 shadow-md shadow-blue-500/20',
      icon: <Zap size={14} className="text-white" />
    };
  }
  if (normalized.includes('hook') || normalized.includes('হুক')) {
    return {
      title: lang === 'bn' ? 'হুক আইডিয়া' : 'Hook Idea',
      bg: 'bg-amber-50/80 border border-amber-100 text-amber-950',
      iconBg: 'bg-amber-600 shadow-md shadow-amber-500/20',
      icon: <Lightbulb size={14} className="text-white" />
    };
  }
  if (normalized.includes('tips') || normalized.includes('টিপস')) {
    return {
      title: lang === 'bn' ? 'তৈরির টিপস' : 'Creation Tips',
      bg: 'bg-purple-50/80 border border-purple-100 text-purple-950',
      iconBg: 'bg-purple-600 shadow-md shadow-purple-500/20',
      icon: <Sparkles size={14} className="text-white" />
    };
  }
  if (normalized.includes('secret') || normalized.includes('সিক্রেট')) {
    return {
      title: lang === 'bn' ? 'ভাইরাল সিক্রেট' : 'Viral Secret',
      bg: 'bg-rose-50/80 border border-rose-100 text-rose-950',
      iconBg: 'bg-rose-600 shadow-md shadow-rose-500/20',
      icon: <Key size={14} className="text-white" />
    };
  }
  if (normalized.includes('booster') || normalized.includes('বুস্টার')) {
    return {
      title: lang === 'bn' ? 'এনগেজমেন্ট বুস্টার' : 'Engagement Booster',
      bg: 'bg-emerald-50/80 border border-emerald-100 text-emerald-950',
      iconBg: 'bg-emerald-600 shadow-md shadow-emerald-500/20',
      icon: <TrendingUp size={14} className="text-white" />
    };
  }
  if (normalized.includes('monetization') || normalized.includes('মনিটাইজেশন')) {
    return {
      title: lang === 'bn' ? 'মনিটাইজেশন টিপ' : 'Monetization Tip',
      bg: 'bg-yellow-50/80 border border-yellow-200 text-amber-950',
      iconBg: 'bg-amber-600 shadow-md shadow-amber-500/20',
      icon: <Coins size={14} className="text-white" />
    };
  }
  if (normalized.includes('hashtag') || normalized.includes('হ্যাশট্যাগ')) {
    return {
      title: lang === 'bn' ? 'হ্যাশট্যাগ' : 'Hashtags',
      bg: 'bg-zinc-50/90 border border-zinc-200 text-zinc-950',
      iconBg: 'bg-zinc-600 shadow-md shadow-zinc-600/20',
      icon: <Globe size={14} className="text-white" />
    };
  }
  return {
    title: key,
    bg: 'bg-zinc-50/80 border border-zinc-150 text-zinc-950 w-full',
    iconBg: 'bg-brand-500',
    icon: <Zap size={14} className="text-white" />
  };
};

export const LiveNews = () => {
  const { t, language } = useLanguage();
  const { logEvent } = useTracking();
  const { isAdmin } = useFirebase();
  const [news, setNews] = useState<any>({ local: [], fbTrends: [], igTrends: [], dates: [] });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'local' | 'fbTrends' | 'igTrends'>('local');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [currentDayOffset, setCurrentDayOffset] = useState({
    local: 0,
    fbTrends: 0,
    igTrends: 0
  });
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);
    const toastId = toast.loading('Saving changes...');

    try {
      const docId = `${editingItem.date}-${language}`;
      const docRef = doc(db, 'news', docId);
      
      let existingData: any = {};
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          existingData = docSnap.data();
        }
      } catch (e) {
        console.warn('[LiveNews Edit] Could not fetch existing doc, doing clean set instead.');
      }

      const localList = ensureArray(existingData.local || news.local);
      const fbList = ensureArray(existingData.fbTrends || news.fbTrends);
      const igList = ensureArray(existingData.igTrends || news.igTrends);

      const targetList = editingItem.tab === 'local' ? localList 
                     : editingItem.tab === 'fbTrends' ? fbList 
                     : igList;

      targetList[editingItem.index] = {
        ...targetList[editingItem.index],
        title: editingItem.title,
        content: editingItem.content,
        image: editingItem.image,
        source: editingItem.source || targetList[editingItem.index]?.source || "Official News"
      };

      const finalDoc = {
        ...existingData,
        local: localList,
        fbTrends: fbList,
        igTrends: igList,
        date: editingItem.date,
        updatedAt: new Date().toISOString()
      };

      try {
        await setDoc(docRef, finalDoc);
      } catch (firestoreErr: any) {
        handleFirestoreError(firestoreErr, OperationType.WRITE, `news/${docId}`);
      }

      setNews((prev: any) => ({
        ...prev,
        local: editingItem.tab === 'local' ? targetList : prev.local,
        fbTrends: editingItem.tab === 'fbTrends' ? targetList : prev.fbTrends,
        igTrends: editingItem.tab === 'igTrends' ? targetList : prev.igTrends,
        updatedAt: finalDoc.updatedAt
      }));

      if (selectedItem && selectedItem.date === editingItem.date && activeTab === editingItem.tab && selectedItem.index === editingItem.index) {
        setSelectedItem({
          ...selectedItem,
          title: editingItem.title,
          content: editingItem.content,
          image: editingItem.image,
          source: editingItem.source || selectedItem.source
        });
      }

      toast.success(language === 'bn' ? 'সংবাদ সফলভাবে আপডেট করা হয়েছে!' : 'News updated successfully!', { id: toastId });
      setEditingItem(null);
    } catch (err: any) {
      console.error('[LiveNews Edit] Save failed:', err);
      toast.error(`Save failed: ${err.message}`, { id: toastId });
    } finally {
      setSavingEdit(false);
    }
  };

  const { date: deepDate, tab: deepTab, index: deepIndex } = useParams();

  // Calculate "News Date" based on 6 AM IST refresh
  const getNewsDate = (offset: number = 0) => {
    const now = new Date();
    // Use Intl to get IST parts accurately
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const dateParts: { [key: string]: string } = {};
    parts.forEach(p => dateParts[p.type] = p.value);
    
    let year = parseInt(dateParts.year);
    let month = parseInt(dateParts.month);
    let day = parseInt(dateParts.day);
    let hour = parseInt(dateParts.hour);
    
    // If before 6 AM IST, we are still in the previous "news day"
    if (hour < 6) {
      const d = new Date(year, month - 1, day);
      d.setDate(d.getDate() - 1);
      year = d.getFullYear();
      month = d.getMonth() + 1;
      day = d.getDate();
    }

    // Apply offset for previous days
    if (offset > 0) {
      const d = new Date(year, month - 1, day);
      d.setDate(d.getDate() - offset);
      year = d.getFullYear();
      month = d.getMonth() + 1;
      day = d.getDate();
    }
    
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const fetchDayNews = async (offset: number, retries = 3): Promise<any> => {
    const date = getNewsDate(offset);
    setGenerating(true);
    try {
      // 1. Try to fetch from backend cache first
      let response;
      try {
        response = await fetch(`/api/news?date=${date}&lang=${language}`);
      } catch (fetchErr: any) {
        if (retries > 0) {
          console.warn(`[LiveNews] Network error fetching news for ${date}, retrying... (${retries})`, fetchErr.message);
          await new Promise(resolve => setTimeout(resolve, 3000));
          return fetchDayNews(offset, retries - 1);
        }
        // If it's a persistent network error, we can try to generate it locally as a fallback
        // If it's a persistent network error, we can try to generate it locally as a fallback
        // instead of giving up, assuming it's a backend connectivity issue
        console.warn(`[LiveNews] Persistent network error for ${date}. Attempting local generation fallback...`);
        const generatedData = await fetchLiveNews(language as 'bn' | 'en', date);
        setGenerating(false);
        return { 
          local: ensureArray(generatedData.local).map((item: any) => ({ ...item, date })),
          fbTrends: ensureArray(generatedData.fbTrends).map((item: any) => ({ ...item, date })),
          igTrends: ensureArray(generatedData.igTrends).map((item: any) => ({ ...item, date })),
          updatedAt: generatedData.updatedAt || new Date().toISOString(),
          isMock: generatedData.isMock,
          date 
        };
      }
      
      if (response.ok) {
        const data = await response.json();
        
        // Handle "generating" status
        if (response.status === 202 && data.status === "generating") {
          console.log(`[LiveNews] News is being generated elsewhere for ${date}. Waiting...`);
          // Wait 5 seconds and retry
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            return fetchDayNews(offset, retries - 1);
          }
        }

        setGenerating(false);
        
        // Add date to each item for consistency
        const processedData = {
          local: ensureArray(data.local).map((item: any) => ({ ...item, date })),
          fbTrends: ensureArray(data.fbTrends).map((item: any) => ({ ...item, date })),
          igTrends: ensureArray(data.igTrends).map((item: any) => ({ ...item, date })),
          updatedAt: data.updatedAt || new Date().toISOString()
        };
        
        return { ...processedData, date };
      }
      
      // 2. If not in cache (404), try to acquire lock and generate
      if (response.status === 404) {
        console.log(`[LiveNews] News not found in cache for ${date}. Attempting to generate on server...`);
        
        try {
          const genRes = await fetch('/api/news/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, lang: language })
          });

          if (genRes.status === 202) {
            console.log(`[LiveNews] Server is already generating news for ${date}. Retrying...`);
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 5000));
              return fetchDayNews(offset, retries - 1);
            }
          }

          if (genRes.ok) {
            const generatedData = await genRes.json();
            setGenerating(false);
            
            const processedData = {
              local: ensureArray(generatedData.local).map((item: any) => ({ ...item, date })),
              fbTrends: ensureArray(generatedData.fbTrends).map((item: any) => ({ ...item, date })),
              igTrends: ensureArray(generatedData.igTrends).map((item: any) => ({ ...item, date })),
              updatedAt: generatedData.updatedAt || new Date().toISOString(),
              isMock: generatedData.isMock
            };
            
            if (generatedData.isMock) {
              toast.info(language === 'bn' ? "লাইভ নিউজ সার্ভার ব্যস্ত, ডেমো নিউজ দেখানো হচ্ছে।" : "News server busy, showing demo news.");
            }
            
            return { ...processedData, date };
          }
          
          throw new Error(`Server generation failed: ${genRes.status}`);
        } catch (genErr: any) {
          console.warn(`[LiveNews] Server generation failed for ${date}, trying frontend fallback...`, genErr.message);
          // Fallback to frontend generation if server generation fails
          const frontendGenData = await fetchLiveNews(language as 'bn' | 'en', date);
          setGenerating(false);
          return {
            local: ensureArray(frontendGenData.local).map((item: any) => ({ ...item, date })),
            fbTrends: ensureArray(frontendGenData.fbTrends).map((item: any) => ({ ...item, date })),
            igTrends: ensureArray(frontendGenData.igTrends).map((item: any) => ({ ...item, date })),
            updatedAt: frontendGenData.updatedAt || new Date().toISOString(),
            isMock: frontendGenData.isMock,
            date
          };
        }
      }

      throw new Error(`Server returned ${response.status}`);
    } catch (err: any) {
      setGenerating(false);
      console.error(`Error fetching/generating news for ${date}:`, err);
      // Last resort: If absolutely everything fails, return mock data directly to keep UI alive
      console.warn(`[LiveNews] Complete failure for ${date}. Using emergency mock data.`);
      return {
        local: [],
        fbTrends: [],
        igTrends: [],
        date,
        isError: true,
        errorMessage: err.message
      };
    }
  };

  useEffect(() => {
    const initNews = async () => {
      setLoading(true);
      setError(null);
      try {
        const todayNews = await fetchDayNews(0);
        if (todayNews) {
          setNews({
            local: todayNews.local || [],
            fbTrends: todayNews.fbTrends || [],
            igTrends: todayNews.igTrends || [],
            dates: [todayNews.date],
            updatedAt: todayNews.updatedAt || new Date().toISOString()
          });
        }
      } catch (err: any) {
        setError(err.message || "Failed to load news");
      } finally {
        setLoading(false);
      }
    };

    initNews();
  }, [language]);

  // Handle Deep Links
  useEffect(() => {
    if (deepDate && deepTab && deepIndex) {
      const loadDeepLink = async () => {
        try {
          // Check if we already have the news for this date
          const items = news[deepTab as keyof typeof news];
          const itemsList = ensureArray(items);
          const foundItem = itemsList.length > 0 ? itemsList.find((item: any) => item.date === deepDate && itemsList.indexOf(item) % 5 === parseInt(deepIndex)) : null;

          if (foundItem) {
            setSelectedItem({ ...foundItem, index: parseInt(deepIndex) });
            setActiveTab(deepTab as any);
          } else {
            // Fetch the specific date
            const response = await fetch(`/api/news?date=${deepDate}&lang=${language}`);
            if (response.ok) {
              const data = await response.json();
              if (data && !data.isError) {
                const tabItems = data[deepTab as keyof typeof data];
                const tabItemsList = ensureArray(tabItems);
                if (tabItemsList.length > 0) {
                  const item = tabItemsList[parseInt(deepIndex)];
                  if (item) {
                    const itemsWithDate = tabItemsList.map((it: any) => ({ ...it, date: deepDate }));
                    setNews((prev: any) => ({
                      ...prev,
                      [deepTab as string]: [...(prev[deepTab as keyof typeof prev] as any[] || []), ...itemsWithDate],
                      dates: [...prev.dates, deepDate]
                    }));
                    setSelectedItem({ ...item, date: deepDate, index: parseInt(deepIndex) });
                    setActiveTab(deepTab as any);
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("Deep link error:", e);
        }
      };
      loadDeepLink();
    }
  }, [deepDate, deepTab, deepIndex, language, news.dates.length]);

  const handleSeeMore = async () => {
    const nextOffset = currentDayOffset[activeTab] + 1;
    if (nextOffset > 2) return; // Limit to 3 days (0, 1, 2)

    setLoading(true);
    try {
      const prevNews = await fetchDayNews(nextOffset);
      if (prevNews) {
        setNews((prev: any) => ({
          ...prev,
          [activeTab]: [...prev[activeTab], ...(prevNews[activeTab] || [])],
          dates: [...prev.dates, prevNews.date]
        }));
        setCurrentDayOffset(prev => ({
          ...prev,
          [activeTab]: nextOffset
        }));
      } else {
        // If yesterday's news doesn't exist, we can't show more
        // But we can mark it as "no more" by setting offset to 2
        setCurrentDayOffset(prev => ({
          ...prev,
          [activeTab]: 2
        }));
      }
    } catch (err: any) {
      console.error("Error loading more news:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && news.dates.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-zinc-500 bg-culture-bg">
        <RefreshCw className="animate-spin mb-4" size={32} />
        <p>{generating ? t.news.generating : t.news.loading}</p>
      </div>
    );
  }

  if (error && news.dates.length === 0) {
    const isQuotaExceeded = error.includes('429') || error.includes('RESOURCE_EXHAUSTED');
    const isBlocked = error.includes('API_KEY_SERVICE_BLOCKED') || error.includes('blocked') || error.includes('403');
    
    return (
      <div className="py-20 flex flex-col items-center justify-center text-red-500 bg-culture-bg px-4 text-center">
        <RefreshCw className="mb-4" size={32} />
        <p className="font-bold mb-2">
          {isQuotaExceeded 
            ? (language === 'bn' ? 'দুঃখিত, আমাদের সংবাদ সার্ভার এখন ব্যস্ত। অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন।' : 'Sorry, our news server is busy right now. Please try again in a few minutes.')
            : (isBlocked 
                ? (language === 'bn' ? 'API কী ব্লক করা হয়েছে' : 'API Key Blocked')
                : (language === 'bn' ? 'খবর লোড করতে সমস্যা হয়েছে' : 'Error loading news'))}
        </p>
        <div className="text-xs opacity-70 mb-6 max-w-md space-y-2">
          {isQuotaExceeded ? (
            <p>{language === 'bn' ? 'আমরা প্রতিদিনের সংবাদের কোটা অতিক্রম করেছি। আমরা শীঘ্রই এটি ঠিক করার চেষ্টা করছি।' : 'We have exceeded our daily news quota. We are working to fix this soon.'}</p>
          ) : isBlocked ? (
            <>
              <p>{language === 'bn' ? 'আপনার API কী এই পরিষেবার জন্য ব্লক করা হয়েছে। অনুগ্রহ করে Google Cloud Console-এ কী-এর সীমাবদ্ধতা পরীক্ষা করুন।' : 'Your API key is blocked for this service. This usually means the API key is restricted and doesn\'t allow the Generative Language API.'}</p>
              <p className="font-bold">{language === 'bn' ? 'সমাধান:' : 'Solution:'}</p>
              <div className="bg-white p-4 rounded-xl border-2 border-red-100 text-left space-y-3">
                <p className="font-bold text-red-600 underline">
                  {language === 'bn' 
                    ? 'গুরুত্বপূর্ণ: আপনার বর্তমান API কী (AIzaSyCW6a3r6p...) ব্লক করা হয়েছে।' 
                    : 'CRITICAL: Your current API key (AIzaSyCW6a3r6p...) is BLOCKED.'}
                </p>
                <p>
                  {language === 'bn'
                    ? 'এটি সাধারণত ঘটে কারণ কী-টি শুধুমাত্র ফায়ারবেসের জন্য সীমাবদ্ধ। এটি ঠিক করতে:'
                    : 'This happens because the key is restricted to only Firebase services. To fix this:'}
                </p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>{language === 'bn' ? 'Google Cloud Console-এ যান (প্রজেক্ট: 35806183265)' : 'Go to Google Cloud Console (Project: 35806183265)'}</li>
                  <li>{language === 'bn' ? 'API & Services > Credentials-এ যান' : 'Go to API & Services > Credentials'}</li>
                  <li>{language === 'bn' ? '"Browser key (auto created by Firebase)" এ ক্লিক করুন' : 'Click on "Browser key (auto created by Firebase)"'}</li>
                  <li>{language === 'bn' ? '"API restrictions" এর নিচে "Don\'t restrict key" নির্বাচন করুন' : 'Under "API restrictions", select "Don\'t restrict key"'}</li>
                  <li>{language === 'bn' ? '"Save" এ ক্লিক করুন এবং ১০ মিনিট অপেক্ষা করুন' : 'Click "Save" and wait 10 minutes for changes to apply.'}</li>
                </ol>
                <div className="pt-2 border-t border-zinc-100">
                  <p className="font-bold text-zinc-900">
                    {language === 'bn' ? 'বিকল্প সমাধান (অধিক নিরাপদ):' : 'Alternative Solution (Recommended):'}
                  </p>
                  <p>
                    {language === 'bn'
                      ? '১. aistudio.google.com থেকে একটি নতুন API কী তৈরি করুন।'
                      : '1. Create a NEW API key at aistudio.google.com.'}
                  </p>
                  <p>
                    {language === 'bn'
                      ? '২. এই অ্যাপের "Settings > Secrets" মেনুতে যান এবং GEMINI_API_KEY হিসেবে সেটি যোগ করুন।'
                      : '2. Add it as GEMINI_API_KEY in the "Settings > Secrets" menu of this app.'}
                  </p>
                </div>
              </div>
              <a 
                href="https://console.cloud.google.com/apis/credentials?project=35806183265" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block mt-4 text-brand-600 underline font-bold"
              >
                {language === 'bn' ? 'Google Cloud Console খুলুন' : 'Open Google Cloud Console'}
              </a>
            </>
          ) : (
            <p>{error}</p>
          )}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-brand-500 text-white rounded-xl font-bold text-sm"
        >
          {language === 'bn' ? 'আবার চেষ্টা করুন' : 'Try Again'}
        </button>
      </div>
    );
  }

  if (!news || !news[activeTab]) return null;

  const currentNews = news[activeTab];
  const hasMore = currentDayOffset[activeTab] < 2;

  const copyToClipboard = (url: string, item: any) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    logEvent('share_news', { title: item.title, method: 'copy_link' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="news" className="py-20 px-4 bg-culture-bg">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-100 text-brand-600 font-black text-xs mb-6 uppercase tracking-[0.2em] shadow-sm border border-brand-200"
          >
            <Newspaper size={16} className="animate-pulse" />
            {t.banner.news}
          </motion.div>
          <div className="relative inline-block">
            <h2 className="text-5xl sm:text-6xl font-black text-zinc-900 mb-6 tracking-tighter flex items-center justify-center gap-4">
              <motion.span
                animate={{ rotate: [0, 15, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="text-brand-500"
              >
                <Moon size={48} fill="currentColor" />
              </motion.span>
              {t.news.title}
            </h2>
            <motion.div 
              animate={{ 
                rotate: [0, 10, 0, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute -top-8 -right-12 text-brand-500/20 opacity-50 hidden sm:block"
            >
              <Zap size={64} strokeWidth={1} />
            </motion.div>
            <motion.div 
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -top-12 -left-16 text-brand-400/20 opacity-40 hidden sm:block"
            >
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <div className="w-16 h-16 rounded-full border-4 border-current border-r-transparent -rotate-45" />
              </motion.div>
            </motion.div>
          </div>
          <p className="text-zinc-500 max-w-2xl mx-auto text-lg font-medium leading-relaxed">{t.news.subtitle}</p>
          
          {/* Refresh Button Container */}
          <div className="absolute top-0 right-0 flex gap-2">
            {isAdmin && (
              <button 
                onClick={async () => {
                  const toastId = toast.loading('Testing Gemini API...');
                  try {
                    const res = await fetch('/api/admin/test-gemini');
                    const data = await res.json();
                    if (data.status === 'success') {
                      toast.success(`Gemini is working!`, {
                        id: toastId,
                        description: `Model: ${data.modelUsed}\nResponse: ${data.text.substring(0, 50)}...`,
                        duration: 5000
                      });
                    } else {
                      toast.error(`Gemini Test Failed`, {
                        id: toastId,
                        description: `${data.message}\nCode: ${data.code}`,
                        duration: 10000
                      });
                    }
                  } catch (e: any) {
                    toast.error(`Error: ${e.message}`, { id: toastId });
                  }
                }}
                className="p-3 rounded-2xl bg-white border border-zinc-100 text-zinc-400 hover:text-green-500 hover:border-green-200 transition-all shadow-sm group"
                title="Test Gemini API"
              >
                <ShieldCheck size={20} className="group-hover:scale-110 transition-transform duration-500" />
              </button>
            )}
            {isAdmin && (
              <button 
                onClick={async () => {
                  setLoading(true);
                  setGenerating(true);
                  setError(null);
                  try {
                    const newsData = await fetchDayNews(0);
                    setNews({
                      local: newsData.local || [],
                      fbTrends: newsData.fbTrends || [],
                      igTrends: newsData.igTrends || [],
                      dates: [newsData.date],
                      updatedAt: newsData.updatedAt
                    });
                    setCurrentDayOffset({ local: 0, fbTrends: 0, igTrends: 0 });
                  } catch (e: any) {
                    console.error(e);
                    setError(e.message || "Failed to refresh news");
                  } finally {
                    setLoading(false);
                    setGenerating(false);
                  }
                }}
                className="p-3 rounded-2xl bg-white border border-zinc-100 text-zinc-400 hover:text-brand-500 hover:border-brand-200 transition-all shadow-sm group"
                title={language === 'bn' ? 'সংবাদ রিফ্রেশ করুন' : 'Refresh News'}
              >
                <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-16">
          {[
            { id: 'local', label: t.news.local, icon: <MapPin size={18} />, color: 'from-brand-600 to-brand-500', inactiveColor: 'bg-brand-50 text-brand-600 border-brand-200' },
            { id: 'fbTrends', label: t.news.fbTrends, icon: <Facebook size={18} />, color: 'from-[#1877F2] to-[#0D65D9]', inactiveColor: 'bg-blue-50 text-[#1877F2] border-blue-200' },
            { id: 'igTrends', label: t.news.igTrends, icon: <div className="relative"><Instagram size={18} /><motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="absolute -top-1 -right-1 text-[8px]">✨</motion.div></div>, color: 'from-[#E4405F] to-[#D62976]', inactiveColor: 'bg-pink-50 text-[#E4405F] border-pink-200' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative group p-[2px] rounded-2xl transition-all duration-500 ${
                activeTab === tab.id ? 'scale-110' : 'hover:scale-105'
              }`}
            >
              {/* Animated Light Circle (Glow Ring) - The "Moon" Glow */}
              <div className={`absolute inset-0 rounded-2xl overflow-hidden transition-opacity duration-500 ${activeTab === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}>
                <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0%,transparent_30%,white_50%,transparent_70%,transparent_100%)] animate-spin-fast opacity-80 blur-[3px]" />
              </div>
              
              <div className={`relative flex items-center gap-3 px-6 sm:px-10 py-3 sm:py-5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all duration-500 border-2 ${
                activeTab === tab.id 
                  ? `bg-gradient-to-br ${tab.color} text-white border-transparent shadow-[0_15px_50px_rgba(0,0,0,0.3)]` 
                  : `${tab.inactiveColor} hover:shadow-xl`
              }`}>
                <span className={`${activeTab === tab.id ? 'animate-bounce' : 'group-hover:scale-125 transition-transform duration-300'}`}>
                  {tab.icon}
                </span>
                {tab.label}
                
                {/* Decorative Moon Glow Dot */}
                <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full blur-[1px] transition-all duration-500 ${
                  activeTab === tab.id ? 'bg-white animate-pulse shadow-[0_0_10px_white]' : 'bg-current opacity-30'
                }`} />
              </div>
            </button>
          ))}
        </div>

        {/* News Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <AnimatePresence mode="popLayout">
            {currentNews.map((item: any, i: number) => {
              const shareUrl = `${window.location.origin}/news/${item.date}/${activeTab}/${i % 5}`;
              return (
                <motion.div
                  key={`${activeTab}-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: (i % 6) * 0.1 }}
                  whileHover={{ scale: 1.01, y: -5 }}
                  onClick={() => {
                    setSelectedItem({...item, index: i % 5});
                    logEvent('view_news_item', { title: item.title });
                    window.history.pushState({}, '', shareUrl);
                  }}
                  className="bg-white rounded-[2.5rem] p-10 border border-zinc-100 hover:border-brand-200 cursor-pointer transition-all group shadow-sm hover:shadow-2xl hover:shadow-brand-500/5 flex flex-col relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-2 h-full bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  {/* News Image */}
                  <div className="relative h-48 -mx-10 -mt-10 mb-8 overflow-hidden rounded-t-[2.5rem]">
                    <img 
                      src={item.image || "https://i.postimg.cc/0yWk2Xsf/Gemini-Generated-Image-sykjx4sykjx4sykj.png"} 
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-[10px] font-black text-brand-600 uppercase tracking-widest">
                        <Clock size={12} />
                        {item.date}
                      </div>
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem({
                              ...item,
                              index: i,
                              tab: activeTab,
                              date: item.date || getNewsDate()
                            });
                          }}
                          className="px-2.5 py-1 rounded-full bg-red-50 hover:bg-red-600 hover:text-white text-[10px] font-black text-red-600 uppercase tracking-widest transition-all flex items-center gap-1.5 border border-red-100"
                          title="Edit Post"
                        >
                          <Edit3 size={10} />
                          {language === 'bn' ? 'এডিট' : 'Edit'}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all md:translate-x-4 md:group-hover:translate-x-0">
                      <a 
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          logEvent('share_news', { title: item.title, method: 'facebook' });
                        }}
                        className="p-2 rounded-xl bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all"
                        title={t.news.shareOnFacebook}
                      >
                        <Facebook size={14} />
                      </a>
                      <a 
                        href={`https://wa.me/?text=${encodeURIComponent(item.title + ' ' + shareUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          logEvent('share_news', { title: item.title, method: 'whatsapp' });
                        }}
                        className="p-2 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all"
                        title={t.news.shareOnWhatsApp}
                      >
                        <MessageCircle size={14} />
                      </a>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(shareUrl, item);
                        }}
                        className="p-2 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-800 hover:text-white transition-all"
                        title={t.news.copyLink}
                      >
                        {copied ? <Check size={14} className="text-green-600" /> : <Link size={14} />}
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-black text-zinc-900 mb-4 group-hover:text-brand-600 transition-colors leading-tight tracking-tight">
                    {item.title || item.Title || item.news || item.headline || "Latest Update"}
                  </h3>
                  
                  <div className="text-zinc-500 text-sm leading-relaxed mb-8 flex-1 overflow-hidden">
                    <p className="line-clamp-[6]">{item.content || item.description || item.Content || item.summary || "Reading news details..."}</p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-8 border-t border-zinc-50 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t.news.source}</span>
                      <span className="text-xs font-bold text-zinc-600">{item.source || "Official News"}</span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedItem({...item, index: i % 5});
                        logEvent('view_news_item', { title: item.title });
                        window.history.pushState({}, '', shareUrl);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white font-bold text-xs hover:bg-brand-500 transition-all"
                    >
                      {t.news.readMore} <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* See More Button */}
        <div className="flex flex-col items-center justify-center gap-6">
          {hasMore ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSeeMore}
              className="flex items-center gap-3 px-10 py-5 rounded-3xl bg-brand-500 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all"
            >
              {t.news.seeMore}
              <ChevronRight size={18} />
            </motion.button>
          ) : (
            <div className="flex flex-col items-center gap-3 text-zinc-400">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center">
                <Clock size={24} />
              </div>
              <p className="font-bold text-sm uppercase tracking-widest">{t.news.noMoreNews}</p>
            </div>
          )}
        </div>

        {/* Modal for full news */}
        <AnimatePresence>
          {selectedItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setSelectedItem(null);
                  window.history.pushState({}, '', '/');
                }}
                className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-culture-bg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-brand-600 uppercase tracking-widest">
                      <Clock size={12} />
                      {selectedItem.date}
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/news/${selectedItem.date}/${activeTab}/${selectedItem.index}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1877F2]/10 text-[#1877F2] text-[10px] font-bold hover:bg-[#1877F2] hover:text-white transition-all"
                      >
                        <Facebook size={12} />
                        Facebook
                      </a>
                      <a 
                        href={`https://wa.me/?text=${encodeURIComponent(selectedItem.title + ' ' + `${window.location.origin}/news/${selectedItem.date}/${activeTab}/${selectedItem.index}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366]/10 text-[#25D366] text-[10px] font-bold hover:bg-[#25D366] hover:text-white transition-all"
                      >
                        <MessageCircle size={12} />
                        WhatsApp
                      </a>
                      <button 
                        onClick={() => copyToClipboard(`${window.location.origin}/news/${selectedItem.date}/${activeTab}/${selectedItem.index}`, selectedItem)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E4405F]/10 text-[#E4405F] text-[10px] font-bold hover:bg-[#E4405F] hover:text-white transition-all"
                      >
                        <Instagram size={12} />
                        Instagram
                      </button>
                      <button 
                        onClick={() => copyToClipboard(`${window.location.origin}/news/${selectedItem.date}/${activeTab}/${selectedItem.index}`, selectedItem)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold hover:bg-zinc-800 hover:text-white transition-all"
                      >
                        {copied ? <Check size={12} className="text-green-600" /> : <Link size={12} />}
                        {copied ? t.news.copied : t.news.copyLink}
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedItem(null);
                      window.history.pushState({}, '', '/');
                    }}
                    className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar">
                  {/* Modal Image */}
                  <div className="relative h-64 -mx-8 -mt-8 mb-8 overflow-hidden">
                    <img 
                      src={selectedItem.image || "https://i.postimg.cc/0yWk2Xsf/Gemini-Generated-Image-sykjx4sykjx4sykj.png"} 
                      alt={selectedItem.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  </div>
                  <h3 className="text-3xl font-bold text-zinc-900 mb-6 leading-tight">
                    {selectedItem.title || selectedItem.Title || selectedItem.news || "News Detail"}
                  </h3>
                  <div className="text-zinc-600 leading-relaxed text-lg pb-4">
                    {(() => {
                      const isTrend = activeTab === 'fbTrends' || activeTab === 'igTrends';
                      const contentStr = (selectedItem.content || selectedItem.Content || selectedItem.description || selectedItem.summary || '') as string;
                      
                      if (isTrend) {
                        const parsedSections = parseTrendContent(contentStr);
                        if (parsedSections && parsedSections.length > 0) {
                          return (
                            <div className="grid grid-cols-1 gap-5 mt-2">
                              {parsedSections.map((section, idx) => {
                                const config = getTrendSectionConfig(section.key, language);
                                return (
                                  <div 
                                    key={idx} 
                                    className={`p-6 rounded-[1.5rem] border ${config.bg} transition-all duration-300 hover:scale-[1.01] hover:shadow-md flex flex-col sm:flex-row sm:items-start gap-4`}
                                  >
                                    <div className={`p-2.5 rounded-2xl ${config.iconBg} self-start shrink-0 flex items-center justify-center`}>
                                      {config.icon}
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        {config.title}
                                      </h4>
                                      <p className="text-zinc-800 text-sm font-semibold leading-relaxed">
                                        {section.value}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                      }
                      
                      // Default paragraph rendering
                      return (
                        <div className="space-y-4">
                          {contentStr.split('\n').map((para: string, idx: number) => (
                            <p key={idx}>{para}</p>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="mt-12 pt-8 border-t border-zinc-100 flex items-center justify-between text-sm text-zinc-400">
                    <div>
                      <span className="font-bold uppercase mr-2">{t.news.source}:</span>
                      {selectedItem.source || "Official News"}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Admin Edit Modal */}
        <AnimatePresence>
          {editingItem && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingItem(null)}
                className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-4 border-brand-500/20"
              >
                {/* Header */}
                <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                  <div>
                    <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">
                      {language === 'bn' ? "পোস্ট এডিট ও স্টাইল" : "Edit & Style Post"}
                    </h3>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
                      {editingItem.tab} • Index {editingItem.index} • {editingItem.date}
                    </p>
                  </div>
                  <button 
                    onClick={() => setEditingItem(null)}
                    type="button"
                    className="p-3 hover:bg-zinc-200 rounded-2xl transition-colors text-zinc-400 hover:text-zinc-700"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-400 uppercase tracking-wider block">
                      {language === 'bn' ? "শিরোনাম" : "Title / Headline"}
                    </label>
                    <input
                      type="text"
                      value={editingItem.title}
                      onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                      className="w-full px-5 py-4 rounded-xl border border-zinc-200 text-zinc-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Enter title..."
                    />
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-400 uppercase tracking-wider block">
                      {language === 'bn' ? "বিষয়বস্তু" : "Content / Description"}
                    </label>
                    <textarea
                      rows={5}
                      value={editingItem.content}
                      onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                      className="w-full px-5 py-4 rounded-xl border border-zinc-200 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm leading-relaxed"
                      placeholder="Enter content details..."
                    />
                  </div>

                  {/* Source input */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-400 uppercase tracking-wider block">
                      {language === 'bn' ? "উৎস" : "Source"}
                    </label>
                    <input
                      type="text"
                      value={editingItem.source || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, source: e.target.value })}
                      className="w-full px-5 py-4 rounded-xl border border-zinc-200 text-zinc-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Enter news source..."
                    />
                  </div>

                  {/* Image Slideshow Selector */}
                  <div className="space-y-4">
                    <label className="text-xs font-black text-zinc-400 uppercase tracking-wider block mb-2">
                      {language === 'bn' ? "স্লাইডশো থেকে একটি ছবি নির্বাচন করুন" : "Select an Image from Slideshow"}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {SLIDESHOW_IMAGES.map((imgUrl, idx) => {
                        const isSelected = editingItem.image === imgUrl;
                        const slideLabels = [
                          "News Hub", "Transport", "Barnia Bazar", "Influencers", "Collab Hub", "Bengali Ponjika"
                        ];

                        return (
                          <div
                            key={idx}
                            onClick={() => setEditingItem({ ...editingItem, image: imgUrl })}
                            className={`relative cursor-pointer group rounded-2xl overflow-hidden border-4 transition-all ${
                              isSelected 
                                ? 'border-brand-500 scale-[1.03] shadow-lg shadow-brand-500/20' 
                                : 'border-zinc-100 hover:border-zinc-300'
                            }`}
                          >
                            <img 
                              src={imgUrl} 
                              alt={`Slide option ${idx + 1}`}
                              className="h-24 w-full object-cover group-hover:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-end p-2 justify-center">
                              <span className="text-[10px] font-black text-white text-center tracking-tight leading-tight uppercase bg-zinc-950/60 px-2 py-1 rounded-md">
                                {slideLabels[idx]}
                              </span>
                            </div>
                            {isSelected && (
                              <div className="absolute top-2 right-2 p-1.5 bg-brand-500 text-white rounded-full">
                                <Check size={10} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Custom URL Option */}
                    <div className="pt-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">
                        {language === 'bn' ? "অথবা কাস্টম চিত্র ইউআরএল" : "Or Custom Image URL"}
                      </label>
                      <input
                        type="text"
                        value={editingItem.image || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-zinc-600 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="https://example.com/image.png"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-zinc-100 flex justify-end gap-4 bg-zinc-50">
                  <button
                    onClick={() => setEditingItem(null)}
                    type="button"
                    className="px-6 py-3 border border-zinc-200 rounded-xl font-bold text-sm text-zinc-500 hover:bg-zinc-100 transition-all"
                  >
                    {language === 'bn' ? "বাতিল" : "Cancel"}
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    type="button"
                    className="px-8 py-3 bg-brand-600 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-all shadow-md shadow-brand-500/10 flex items-center gap-2"
                  >
                    {savingEdit ? 'Saving...' : (language === 'bn' ? "সংরক্ষণ করুন" : "Save Changes")}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Last Updated */}
        <div className="mt-12 text-center text-[10px] text-zinc-400 flex items-center justify-center gap-2">
          <RefreshCw size={12} />
          {t.news.lastUpdated}: {news.updatedAt ? new Date(news.updatedAt).toLocaleString() : t.news.justNow}
        </div>

        {/* See More Button */}
        {hasMore && (
          <div className="flex justify-center">
            <button
              onClick={handleSeeMore}
              disabled={loading}
              className="group relative flex items-center gap-3 px-10 py-5 rounded-[2rem] bg-white border-2 border-zinc-100 text-zinc-900 font-black text-sm uppercase tracking-widest hover:border-brand-500 hover:text-brand-600 transition-all shadow-sm hover:shadow-xl disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <Plus size={18} className="group-hover:rotate-90 transition-transform" />
              )}
              {loading ? t.news.loading : t.news.seeMore}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
