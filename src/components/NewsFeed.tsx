import React, { useEffect, useState } from 'react';
import { generateLocalNews, NewsItem } from '../services/gemini';
import { Calendar, Tag, ChevronRight, RefreshCw, Radio, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { shareContent } from '../utils';

export const NewsFeed = () => {
  const { language, t } = useLanguage();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        <p className="text-zinc-500 font-medium animate-pulse text-sm">Searching for real local news...</p>
      </div>
    );
  }

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`flex h-2 w-2 rounded-full ${isUsingFallback ? 'bg-amber-500' : 'bg-emerald-500 animate-ping'}`}></span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isUsingFallback ? 'text-amber-600' : 'text-emerald-600'}`}>
              {isUsingFallback ? (language === 'bn' ? 'আর্কাইভ' : 'ARCHIVE') : t.news.live}
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 border-l-4 border-emerald-500 pl-4">
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
                <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
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
              <h3 className="text-xl font-bold text-zinc-900 mb-3 group-hover:text-emerald-600 transition-colors">
                {item.title}
              </h3>
              <p className="text-zinc-600 text-sm leading-relaxed mb-6">
                {item.content}
              </p>
              <div className="flex items-center justify-between mt-6">
                <a 
                  href={item.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-600 font-semibold text-sm group-hover:gap-2 transition-all"
                >
                  {t.news.readMore} <ChevronRight size={16} />
                </a>
                <button 
                  onClick={() => shareContent(item.title, item.content, item.sourceUrl)}
                  className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
};
