import React, { useEffect, useState } from 'react';
import { generateLocalNews, NewsItem } from '../services/gemini';
import { Calendar, Tag, ChevronRight, RefreshCw, Share2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { shareContent } from '../utils';

export const NewsFeed = () => {
  const { language, t } = useLanguage();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const fetchNews = async () => {
    setRefreshing(true);
    const items = await generateLocalNews("Ujirpur Barnia Nadia, WB, India", language);
    setNews(items);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchNews();
  }, [language]);

  const isUsingFallback = news.some(item => item.isFallback);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        <p className="text-zinc-500 font-medium animate-pulse text-sm">Searching for real local news...</p>
      </div>
    );
  }

  return (
    <section id="news" className="py-16 px-4 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`flex h-2 w-2 rounded-full ${isUsingFallback ? 'bg-amber-500' : 'bg-orange-500 animate-ping'}`}></span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isUsingFallback ? 'text-amber-600' : 'text-orange-600'}`}>
              {isUsingFallback ? (language === 'bn' ? 'আর্কাইভ' : 'ARCHIVE') : t.news.live}
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 border-l-4 border-orange-500 pl-4">
            {t.news.title}
          </h2>
          {isUsingFallback && (
            <p className="text-xs text-amber-600 mt-2 italic">
              {language === 'bn' 
                ? '* উচ্চ ট্র্যাফিকের কারণে বর্তমানে আর্কাইভ করা খবর দেখানো হচ্ছে।' 
                : '* Currently showing archived news due to high traffic.'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-400 font-mono">
            {t.news.lastChecked}: {new Date().toLocaleTimeString()}
          </span>
          <button 
            onClick={fetchNews}
            disabled={refreshing}
            className={`p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-all text-zinc-600 ${refreshing ? 'animate-spin' : ''}`}
            title="Refresh News"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {news.map((item, index) => (
          <motion.article
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group bg-white rounded-2xl overflow-hidden border border-zinc-100 shadow-sm hover:shadow-xl transition-all duration-300"
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={item.imageUrl || `https://picsum.photos/seed/${item.title.length}/800/600`}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Tag size={12} />
                  {item.category}
                </span>
                {item.isFallback && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider w-fit">
                    {language === 'bn' ? 'আর্কাইভ' : 'ARCHIVE'}
                  </span>
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-3">
                <Calendar size={14} />
                {item.date}
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3 group-hover:text-orange-600 transition-colors">
                {item.title}
              </h3>
              <p className="text-zinc-600 text-sm leading-relaxed mb-6 line-clamp-3">
                {item.content}
              </p>
              <div className="flex items-center justify-between mt-6">
                <button 
                  onClick={() => setSelectedNews(item)}
                  className="flex items-center gap-1 text-orange-600 font-semibold text-sm group-hover:gap-2 transition-all"
                >
                  {t.news.readMore} <ChevronRight size={16} />
                </button>
                <button 
                  onClick={() => shareContent(item.title, item.content, window.location.href)}
                  className="p-2 text-zinc-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      {/* News Detail Modal */}
      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
                  onClick={() => setSelectedNews(null)}
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
                
                <div className="mt-10 pt-6 border-t border-zinc-100 flex items-center justify-between">
                  <button 
                    onClick={() => shareContent(selectedNews.title, selectedNews.content, window.location.href)}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
                  >
                    <Share2 size={18} />
                    {t.news.share}
                  </button>
                  <button 
                    onClick={() => setSelectedNews(null)}
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
