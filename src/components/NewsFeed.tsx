import React, { useEffect, useState } from 'react';
import { generateLocalNews, generateTrendingNews, NewsItem, FALLBACK_NEWS, FALLBACK_TRENDING } from '../services/gemini';
import { Calendar, Tag, ChevronRight, RefreshCw, Share2, X, AlertCircle, TrendingUp, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { shareContent } from '../utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { useFirebase } from '../FirebaseContext';

export const NewsFeed = () => {
  const { language, t } = useLanguage();
  const { isAdmin, user } = useFirebase();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [trending, setTrending] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastAttempt, setLastAttempt] = useState<Date | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'success' | 'error' | 'pending'>('success');
  const [newsLimit, setNewsLimit] = useState(15);
  const [error, setError] = useState<Error | null>(null);

  if (error) throw error;

  useEffect(() => {
    // Safety timeout to ensure loading doesn't get stuck
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("News loading timed out, showing fallback.");
        setNews(FALLBACK_NEWS[language]);
        setLoading(false);
      }
    }, 5000);

    // We fetch more than we need and filter by language client-side to avoid index requirements
    const q = query(collection(db, 'news'), limit(200));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      clearTimeout(timeout);
      const allItems = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as NewsItem[];
      
      // Sort by createdAt desc, handling potential nulls from serverTimestamp
      allItems.sort((a, b) => {
        const dateA = (a as any).createdAt?.toDate?.() || new Date(0); // If missing, treat as very old
        const dateB = (b as any).createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      // Filter by language
      const filteredItems = allItems.filter(item => !item.language || item.language === language).slice(0, newsLimit);
      
      if (filteredItems.length === 0) {
        // Fallback to AI if no news in DB yet
        const fetchNewsAI = async () => {
          try {
            const items = await generateLocalNews("Ujirpur Barnia Nadia, WB, India", language);
            if (items.length === 0) {
              setNews(FALLBACK_NEWS[language]);
            } else {
              setNews(items);
            }
          } catch (error) {
            console.error("Error fetching news from AI:", error);
            setNews(FALLBACK_NEWS[language]);
          }
        };
        fetchNewsAI();
      } else {
        setNews(filteredItems);
      }
      
      setLoading(false);
    }, (error) => {
      clearTimeout(timeout);
      console.error("Firestore news error:", error);
      setNews(FALLBACK_NEWS[language]);
      setLoading(false);
      if (error.message?.includes('permission')) {
        try {
          handleFirestoreError(error, OperationType.LIST, 'news');
        } catch (e) {
          setError(e as Error);
        }
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [newsLimit, language]);

  useEffect(() => {
    // Listen to system status for last update time
    const unsubscribe = onSnapshot(doc(db, 'system', 'news_status'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.lastUpdated) {
          setLastUpdated(data.lastUpdated.toDate());
        }
        if (data.lastAttempt) {
          setLastAttempt(data.lastAttempt.toDate());
        }
        if (data.status) {
          setUpdateStatus(data.status);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setTrendingLoading(true);
    
    // Fetch trending news from Firestore instead of calling AI directly
    const q = query(collection(db, 'trending_news'), orderBy('createdAt', 'desc'), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allItems = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as NewsItem[];
      
      // Filter by language
      const filteredItems = allItems.filter(item => !item.language || item.language === language).slice(0, 6);
      
      if (filteredItems.length === 0) {
        // Fallback to AI if no trending news in DB yet
        const fetchTrendingAI = async () => {
          try {
            const items = await generateTrendingNews(language);
            if (items.length === 0) {
              setTrending(FALLBACK_TRENDING[language]);
            } else {
              setTrending(items);
            }
          } catch (error) {
            console.error("Error fetching trending news from AI:", error);
            setTrending(FALLBACK_TRENDING[language]);
          } finally {
            setTrendingLoading(false);
          }
        };
        fetchTrendingAI();
      } else {
        setTrending(filteredItems);
        setTrendingLoading(false);
      }
    }, (error) => {
      console.error("Firestore trending news error:", error);
      setTrendingLoading(false);
    });

    return () => unsubscribe();
  }, [language]);

  useEffect(() => {
    // Handle deep linking for news
    const path = window.location.pathname;
    const newsIdMatch = path.match(/\/news\/([^/]+)/);
    if (newsIdMatch && newsIdMatch[1]) {
      const newsId = newsIdMatch[1];
      // If news is already loaded, find it
      if (news.length > 0) {
        const item = news.find(n => n.id === newsId);
        if (item) setSelectedNews(item);
      }
    }
  }, [news]);

  useEffect(() => {
    // Auto-refresh news for admins if it's older than 12 hours or if no news exists
    if (isAdmin && !refreshing) {
      const now = new Date();
      const twelveHoursInMs = 12 * 60 * 60 * 1000;
      
      const isStale = lastUpdated && (now.getTime() - lastUpdated.getTime() > twelveHoursInMs);
      const isEmpty = !loading && news.length === 0;

      if (isStale || isEmpty) {
        console.log(isEmpty ? "No news found, auto-generating..." : "News is stale, auto-refreshing...");
        fetchAndSaveNews();
      }
    }
  }, [isAdmin, lastUpdated, refreshing, news.length, loading]);

  const handleOpenNews = (item: NewsItem) => {
    setSelectedNews(item);
    window.history.pushState({}, '', `/news/${item.id}`);
  };

  const handleCloseNews = () => {
    setSelectedNews(null);
    window.history.pushState({}, '', '/');
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (language === 'bn') {
      if (minutes < 1) return 'এইমাত্র';
      if (minutes < 60) return `${minutes} মিনিট আগে`;
      if (hours < 24) return `${hours} ঘণ্টা আগে`;
      return `${days} দিন আগে`;
    } else {
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    }
  };

  const fetchAndSaveNews = async () => {
    if (!isAdmin) return;
    
    setRefreshing(true);
    try {
      console.log("Generating news on client...");
      // 1. Generate all news categories in parallel on the client
      const [localNewsBn, localNewsEn, trendingBn, trendingEn] = await Promise.all([
        generateLocalNews("Ujirpur Barnia Nadia, WB, India", "bn"),
        generateLocalNews("Ujirpur Barnia Nadia, WB, India", "en"),
        generateTrendingNews("bn"),
        generateTrendingNews("en")
      ]);

      if (localNewsBn.length === 0 && localNewsEn.length === 0 && trendingBn.length === 0 && trendingEn.length === 0) {
        alert(language === 'bn' 
          ? 'আজকের জন্য কোনো নতুন খবর পাওয়া যায়নি।' 
          : 'No new news was found for today.');
        return;
      }

      // 2. Send the generated news to the server to be saved in Firestore
      const response = await fetch('/api/admin/save-news', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localBn: localNewsBn,
          localEn: localNewsEn,
          trendingBn: trendingBn,
          trendingEn: trendingEn
        })
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error(`Failed to save news with status ${response.status}:`, text);
        throw new Error(`Server error (${response.status}). Please try again.`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to save news");
      }
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      // The onSnapshot will automatically pick up the new news
    } catch (error: any) {
      console.error("Error updating news:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update news.";
      alert(language === 'bn' 
        ? `খবর আপডেট করতে ব্যর্থ হয়েছে: ${errorMessage}` 
        : `Failed to update news: ${errorMessage}`);
    } finally {
      setRefreshing(false);
    }
  };

  const clearAllNews = async () => {
    if (!isAdmin) return;
    
    setRefreshing(true);
    setShowConfirmClear(false);
    try {
      const response = await fetch('/api/admin/clear-news', { method: 'POST' });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to clear news");
      }
      
      if (data.success) {
        setNews([]);
        setTrending([]);
        setClearSuccess(true);
        setTimeout(() => setClearSuccess(false), 3000);
      }
    } catch (error: any) {
      console.error("Error clearing news:", error);
      alert(language === 'bn' 
        ? `খবর মুছতে ব্যর্থ হয়েছে: ${error.message}` 
        : `Failed to clear news: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const isStale = lastUpdated && (new Date().getTime() - lastUpdated.getTime() > 2 * 60 * 60 * 1000);

  if (loading && news.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center py-20 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        <p className="text-zinc-500 font-medium animate-pulse text-sm">Loading live news...</p>
      </div>
    );
  }

  return (
    <section id="news" className="py-16 px-4 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`flex h-2 w-2 rounded-full ${news.length === 0 || isStale ? 'bg-amber-500' : 'bg-orange-500 animate-ping'}`}></span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${news.length === 0 || isStale ? 'text-amber-600' : 'text-orange-600'}`}>
              {news.length === 0 ? (language === 'bn' ? 'কোন খবর নেই' : 'NO NEWS') : (isStale ? (language === 'bn' ? 'খবর আপডেট হচ্ছে...' : 'REFRESHING LIVE NEWS...') : t.news.live)}
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 border-l-4 border-orange-500 pl-4">
            {t.news.title}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {t.news.lastChecked}
            </span>
            <span className="text-xs text-orange-600 font-mono font-bold">
              {lastUpdated ? getRelativeTime(lastUpdated) : (language === 'bn' ? 'কখনো না (আপডেট হচ্ছে...)' : 'Never (Updating...)')}
            </span>
            {isAdmin && (
              <div className="flex flex-col items-end mt-1 gap-1">
                {lastAttempt && lastAttempt.getTime() !== lastUpdated?.getTime() && (
                  <span className={`text-[9px] font-medium ${updateStatus === 'error' ? 'text-red-500' : 'text-zinc-400'}`}>
                    {language === 'bn' ? 'শেষ চেষ্টা:' : 'Last Attempt:'} {getRelativeTime(lastAttempt)}
                    {updateStatus === 'error' && (language === 'bn' ? ' (ত্রুটি)' : ' (Error)')}
                  </span>
                )}
                {updateStatus === 'no_news' && (
                  <span className="text-[9px] font-medium text-amber-500">
                    {language === 'bn' ? 'আজকের কোনো নতুন খবর পাওয়া যায়নি' : 'No new news found for today'}
                  </span>
                )}
              </div>
            )}
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <button 
                  onClick={() => setShowConfirmClear(true)}
                  disabled={refreshing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all font-bold text-sm shadow-sm ${refreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
                  title="Clear All News"
                >
                  <X size={18} />
                  {language === 'bn' ? 'সব মুছুন' : 'Clear All'}
                </button>

                <AnimatePresence>
                  {showConfirmClear && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-zinc-200 p-4 z-[100]"
                    >
                      <p className="text-sm font-bold text-zinc-900 mb-4">
                        {language === 'bn' ? 'আপনি কি নিশ্চিত যে আপনি সব খবর মুছে ফেলতে চান?' : 'Are you sure you want to clear all news?'}
                      </p>
                      <div className="flex gap-2">
                        <button 
                          onClick={clearAllNews}
                          className="flex-1 bg-red-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-colors"
                        >
                          {language === 'bn' ? 'হ্যাঁ, মুছুন' : 'Yes, Clear'}
                        </button>
                        <button 
                          onClick={() => setShowConfirmClear(false)}
                          className="flex-1 bg-zinc-100 text-zinc-600 py-2 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors"
                        >
                          {language === 'bn' ? 'না' : 'No'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {clearSuccess && (
                  <div className="absolute top-full right-0 mt-2 bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg animate-bounce whitespace-nowrap z-50">
                    {language === 'bn' ? 'সব খবর মুছে ফেলা হয়েছে!' : 'All news cleared!'}
                  </div>
                )}
              </div>
              <div className="relative">
                <button 
                  onClick={fetchAndSaveNews}
                  disabled={refreshing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-orange-500 bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all font-bold text-sm shadow-sm ${refreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
                  title="Generate Live News"
                >
                  <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? (language === 'bn' ? 'খবর তৈরি হচ্ছে...' : 'Generating...') : (language === 'bn' ? 'নতুন খবর আনুন' : 'Refresh News')}
                </button>
                
                {showSuccess && (
                  <div className="absolute top-full right-0 mt-2 bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg animate-bounce whitespace-nowrap z-50">
                    {language === 'bn' ? 'খবর সফলভাবে আপডেট হয়েছে!' : 'News updated successfully!'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main News Column */}
        <div className="lg:col-span-8 space-y-8">
          {news.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-zinc-100 shadow-sm">
              <div className="inline-flex p-4 bg-amber-50 rounded-full text-amber-500 mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">
                {language === 'bn' ? 'কোন খবর পাওয়া যায়নি' : 'No news found'}
              </h3>
              <p className="text-zinc-500 text-sm max-w-md mx-auto">
                {language === 'bn' ? 'এই মুহূর্তে কোন খবর নেই। অনুগ্রহ করে পরে আবার চেষ্টা করুন।' : 'There are no news items available at the moment. Please check back later.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {news.map((item, index) => (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white rounded-2xl overflow-hidden border border-zinc-100 shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={item.imageUrl || `https://picsum.photos/seed/${item.title.length}/800/600`}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                        <Tag size={10} />
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between text-zinc-400 text-[10px] mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} />
                        {item.date}
                      </div>
                      {item.sourceName ? (
                        <div className="flex items-center gap-1 font-medium text-orange-600/70">
                          <Tag size={10} />
                          {item.sourceName}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 font-medium text-zinc-400 italic">
                          <Tag size={10} />
                          {language === 'bn' ? 'স্থানীয় সংবাদ' : 'Local News'}
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 mb-2 group-hover:text-orange-600 transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-zinc-600 text-xs leading-relaxed mb-4 line-clamp-2">
                      {item.content}
                    </p>
                    <button 
                      onClick={() => handleOpenNews(item)}
                      className="flex items-center gap-1 text-orange-600 font-bold text-xs group-hover:gap-2 transition-all"
                    >
                      {t.news.readMore} <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {news.length >= newsLimit && (
            <div className="flex justify-center pt-8">
              <button
                onClick={() => setNewsLimit(prev => prev + 10)}
                className="flex items-center gap-2 px-8 py-3 bg-white border border-orange-200 text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all shadow-sm"
              >
                <Plus size={18} />
                {t.news.loadMore}
              </button>
            </div>
          )}
        </div>

        {/* Trending News Sidebar */}
        <div className="lg:col-span-4">
          <div className="sticky top-24">
            <div className="bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {t.news.trending}
                </h3>
              </div>

              <div className="space-y-4">
                {trendingLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="animate-pulse flex flex-col gap-2">
                      <div className="h-4 bg-zinc-800 rounded w-full"></div>
                      <div className="h-4 bg-zinc-800 rounded w-2/3"></div>
                    </div>
                  ))
                ) : trending.length === 0 ? (
                  <p className="text-zinc-500 text-sm italic">
                    {language === 'bn' ? 'কোন ট্রেন্ডিং নিউজ পাওয়া যায়নি।' : 'No trending news found.'}
                  </p>
                ) : (
                  trending.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleOpenNews(item)}
                      className="group cursor-pointer p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700 hover:bg-zinc-800 hover:border-orange-500/50 transition-all"
                    >
                      <div className="flex gap-4">
                        <span className="text-2xl font-black text-zinc-700 group-hover:text-orange-500/30 transition-colors">
                          {(index + 1).toString().padStart(2, '0')}
                        </span>
                        <div className="flex flex-col gap-1">
                          <h4 className="text-sm font-bold text-zinc-100 group-hover:text-white leading-snug">
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-zinc-500 font-medium italic">
                            {item.sourceName || (language === 'bn' ? 'সংবাদ সূত্র' : 'News Source')}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Newsletter or Ad Box */}
            <div className="mt-8 p-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl text-white shadow-xl shadow-orange-500/20">
              <h4 className="text-xl font-bold mb-2">Stay Updated!</h4>
              <p className="text-orange-100 text-sm mb-6">Get the latest news directly in your inbox.</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Email address"
                  className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm w-full outline-none focus:bg-white/20"
                />
                <button className="bg-white text-orange-600 p-2 rounded-xl hover:bg-orange-50 transition-all">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {news.length >= newsLimit && newsLimit < 50 && (
        <div className="mt-12 text-center">
          <button 
            onClick={() => setNewsLimit(prev => prev + 10)}
            className="px-8 py-3 rounded-2xl border-2 border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50 transition-all"
          >
            {language === 'bn' ? 'আরো খবর দেখুন' : 'See More News'}
          </button>
        </div>
      )}

      {/* News Detail Modal */}
      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="relative h-64 shrink-0">
                <img 
                  src={selectedNews.imageUrl} 
                  alt={selectedNews.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={handleCloseNews}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-4 left-4">
                  <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {selectedNews.category}
                  </span>
                </div>
              </div>
              
              <div className="p-8 overflow-y-auto">
                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-4">
                  <Calendar size={16} />
                  {selectedNews.date}
                </div>
                <h2 className="text-3xl font-bold text-zinc-900 mb-6 leading-tight">
                  {selectedNews.title}
                </h2>
                <div className="prose prose-orange max-w-none">
                  <p className="text-zinc-700 text-lg leading-relaxed whitespace-pre-wrap">
                    {selectedNews.fullContent || selectedNews.content}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-2 text-zinc-500 text-sm italic">
                  <span>{language === 'bn' ? 'সূত্র:' : 'Source:'}</span>
                  <span className="font-bold text-orange-600">
                    {selectedNews.sourceName || (language === 'bn' ? 'স্থানীয় সংবাদ মাধ্যম' : 'Local News Media')}
                  </span>
                </div>
                
                <div className="mt-10 pt-6 border-t border-zinc-100 flex items-center justify-between">
                  <button 
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/news/${selectedNews.id}`;
                      shareContent(selectedNews.title, selectedNews.content, shareUrl);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
                  >
                    <Share2 size={18} />
                    {t.news.share}
                  </button>
                  <button 
                    onClick={handleCloseNews}
                    className="text-zinc-500 font-medium hover:text-zinc-800 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
