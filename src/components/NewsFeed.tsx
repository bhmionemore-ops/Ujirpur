import React, { useEffect, useState } from 'react';
import { generateLocalNews, generateTrendingNews, NewsItem, FALLBACK_NEWS } from '../services/gemini';
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
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newsLimit, setNewsLimit] = useState(11);
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

    const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'), limit(newsLimit));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      clearTimeout(timeout);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NewsItem[];
      
      if (items.length === 0) {
        setNews(FALLBACK_NEWS[language]);
      } else {
        setNews(items);
      }
      if (items.length > 0 && items[0].createdAt) {
        const timestamp = (items[0] as any).createdAt;
        if (timestamp && typeof timestamp.toDate === 'function') {
          setLastUpdated(timestamp.toDate());
        }
      }
      setLoading(false);
    }, (error) => {
      clearTimeout(timeout);
      console.error("Firestore news error:", error);
      setNews(FALLBACK_NEWS[language]);
      setLoading(false);
      // We still report it for the system to catch if it's a permission issue
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
    const fetchTrending = async () => {
      setTrendingLoading(true);
      try {
        const items = await generateTrendingNews(language);
        setTrending(items);
      } catch (error) {
        console.error("Error fetching trending news:", error);
      } finally {
        setTrendingLoading(false);
      }
    };
    fetchTrending();
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
      const items = await generateLocalNews("Ujirpur Barnia Nadia, WB, India", language);
      
      const batch = writeBatch(db);
      items.forEach((item) => {
        const newDocRef = doc(collection(db, 'news'));
        batch.set(newDocRef, {
          ...item,
          createdAt: serverTimestamp(),
          isFallback: false
        });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error generating/saving news:", error);
    } finally {
      setRefreshing(false);
    }
  };

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
            <span className={`flex h-2 w-2 rounded-full ${news.length === 0 ? 'bg-amber-500' : 'bg-orange-500 animate-ping'}`}></span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${news.length === 0 ? 'text-amber-600' : 'text-orange-600'}`}>
              {news.length === 0 ? (language === 'bn' ? 'কোন খবর নেই' : 'NO NEWS') : t.news.live}
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
              {lastUpdated ? getRelativeTime(lastUpdated) : new Date().toLocaleTimeString()}
            </span>
          </div>
          {isAdmin && (
            <button 
              onClick={fetchAndSaveNews}
              disabled={refreshing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-orange-500 bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all font-bold text-sm shadow-sm ${refreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
              title="Generate Live News"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? (language === 'bn' ? 'খবর তৈরি হচ্ছে...' : 'Generating...') : (language === 'bn' ? 'নতুন খবর আনুন' : 'Refresh News')}
            </button>
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
                    <div className="flex items-center gap-2 text-zinc-400 text-[10px] mb-2">
                      <Calendar size={12} />
                      {item.date}
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
                  <p className="text-zinc-500 text-sm italic">No trending news found.</p>
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
                        <h4 className="text-sm font-bold text-zinc-100 group-hover:text-white leading-snug">
                          {item.title}
                        </h4>
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

                {selectedNews.sourceName && (
                  <div className="mt-6 flex items-center gap-2 text-zinc-500 text-sm italic">
                    <span>Source:</span>
                    <span className="font-bold text-orange-600">{selectedNews.sourceName}</span>
                  </div>
                )}
                
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
