import React, { useState, useEffect } from 'react';
import { Newspaper, MapPin, Globe, Clock, RefreshCw, ChevronRight, X, Share2, Facebook, Twitter, MessageCircle, Link, Check, Instagram, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { useTracking } from '../TrackingContext';
import { useFirebase } from '../FirebaseContext';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { fetchLiveNews } from '../services/newsService';

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

  const fetchDayNews = async (offset: number) => {
    const date = getNewsDate(offset);
    setGenerating(true);
    try {
      const response = await fetch(`/api/news?date=${date}&lang=${language}`);
      
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorMessage = "Failed to fetch news";
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          const text = await response.text();
          console.error(`Non-JSON error response for ${date}:`, text.substring(0, 200));
          errorMessage = `Server error (${response.status}). Please check logs.`;
        }
        throw new Error(errorMessage);
      }

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.isError) {
          throw new Error(data.error || "Failed to generate news");
        }
        setGenerating(false);
        return { ...data, date };
      } else {
        throw new Error("Server returned non-JSON response");
      }
    } catch (err: any) {
      setGenerating(false);
      console.error(`Error fetching news for ${date}:`, err);
      throw err;
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
      <div className="py-20 flex flex-col items-center justify-center text-zinc-500 bg-zinc-50">
        <RefreshCw className="animate-spin mb-4" size={32} />
        <p>{generating ? t.news.generating : t.news.loading}</p>
      </div>
    );
  }

  if (error && news.dates.length === 0) {
    const isQuotaExceeded = error.includes('429') || error.includes('RESOURCE_EXHAUSTED');
    const isBlocked = error.includes('API_KEY_SERVICE_BLOCKED') || error.includes('blocked') || error.includes('403');
    
    return (
      <div className="py-20 flex flex-col items-center justify-center text-red-500 bg-zinc-50 px-4 text-center">
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
    <section id="news" className="py-20 px-4 bg-zinc-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-100 text-brand-600 font-bold text-sm mb-4"
          >
            <Newspaper size={16} />
            {t.banner.news}
          </motion.div>
          <h2 className="text-4xl font-bold text-zinc-900 mb-4">{t.news.title}</h2>
          <p className="text-zinc-500 max-w-2xl mx-auto">{t.news.subtitle}</p>
          
          {/* Refresh Button Container */}
          <div className="absolute top-0 right-0 flex gap-2">
            {isAdmin && (
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch('/api/admin/test-gemini');
                    const data = await res.json();
                    if (data.status === 'success') {
                      alert(`Gemini is working! Response: ${data.text}`);
                    } else {
                      alert(`Gemini Test Failed: ${data.message}\nCode: ${data.code}`);
                    }
                  } catch (e: any) {
                    alert(`Error: ${e.message}`);
                  }
                }}
                className="p-3 rounded-2xl bg-white border border-zinc-100 text-zinc-400 hover:text-green-500 hover:border-green-200 transition-all shadow-sm group"
                title="Test Gemini API"
              >
                <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
              </button>
            )}
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
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-6 mb-16">
          {[
            { id: 'local', label: t.news.local, icon: <MapPin size={18} />, color: 'from-brand-600 to-brand-500' },
            { id: 'fbTrends', label: t.news.fbTrends, icon: <Facebook size={18} />, color: 'from-[#1877F2] to-[#0D65D9]' },
            { id: 'igTrends', label: t.news.igTrends, icon: <Instagram size={18} />, color: 'from-[#E4405F] to-[#D62976]' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative group p-[2px] rounded-2xl transition-all duration-500 ${
                activeTab === tab.id ? 'scale-110' : 'hover:scale-105'
              }`}
            >
              {/* Animated Light Circle (Glow Ring) */}
              {activeTab === tab.id && (
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                  <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0%,transparent_30%,white_50%,transparent_70%,transparent_100%)] animate-spin-fast opacity-80 blur-[2px]" />
                </div>
              )}
              
              <div className={`relative flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-500 ${
                activeTab === tab.id 
                  ? `bg-gradient-to-br ${tab.color} text-white shadow-[0_10px_40px_rgba(0,0,0,0.2)]` 
                  : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-100'
              }`}>
                <span className={`${activeTab === tab.id ? 'animate-bounce' : ''}`}>
                  {tab.icon}
                </span>
                {tab.label}
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
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-[2.5rem] p-10 border border-zinc-100 hover:border-brand-200 transition-all group shadow-sm hover:shadow-2xl hover:shadow-brand-500/5 flex flex-col relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-2 h-full bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-[10px] font-black text-brand-600 uppercase tracking-widest">
                      <Clock size={12} />
                      {item.date}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <a 
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => logEvent('share_news', { title: item.title, method: 'facebook' })}
                        className="p-2 rounded-xl bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all"
                        title={t.news.shareOnFacebook}
                      >
                        <Facebook size={14} />
                      </a>
                      <a 
                        href={`https://wa.me/?text=${encodeURIComponent(item.title + ' ' + shareUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => logEvent('share_news', { title: item.title, method: 'whatsapp' })}
                        className="p-2 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all"
                        title={t.news.shareOnWhatsApp}
                      >
                        <MessageCircle size={14} />
                      </a>
                      <button 
                        onClick={() => copyToClipboard(shareUrl, item)}
                        className="p-2 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-800 hover:text-white transition-all"
                        title={t.news.copyLink}
                      >
                        {copied ? <Check size={14} className="text-green-600" /> : <Link size={14} />}
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-black text-zinc-900 mb-4 group-hover:text-brand-600 transition-colors leading-tight tracking-tight">
                    {item.title}
                  </h3>
                  
                  <div className="text-zinc-500 text-sm leading-relaxed mb-8 flex-1 overflow-hidden">
                    <p className="line-clamp-[6]">{item.content}</p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-8 border-t border-zinc-50 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t.news.source}</span>
                      <span className="text-xs font-bold text-zinc-600">{item.source}</span>
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
                <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
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
                  <h3 className="text-3xl font-bold text-zinc-900 mb-6 leading-tight">
                    {selectedItem.title}
                  </h3>
                  <div className="text-zinc-600 leading-relaxed space-y-4 text-lg">
                    {selectedItem.content.split('\n').map((para: string, idx: number) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>
                  <div className="mt-12 pt-8 border-t border-zinc-100 flex items-center justify-between text-sm text-zinc-400">
                    <div>
                      <span className="font-bold uppercase mr-2">{t.news.source}:</span>
                      {selectedItem.source}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Last Updated */}
        <div className="mt-12 text-center text-[10px] text-zinc-400 flex items-center justify-center gap-2">
          <RefreshCw size={12} />
          {t.news.lastUpdated}: {new Date(news.updatedAt).toLocaleString()}
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
