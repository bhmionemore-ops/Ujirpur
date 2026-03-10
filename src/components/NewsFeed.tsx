import React, { useEffect, useState } from 'react';
import { generateLocalNews, NewsItem } from '../services/gemini';
import { Calendar, Tag, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export const NewsFeed = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      const items = await generateLocalNews("Ujirpur Barnia Nadia, WB, India");
      setNews(items);
      setLoading(false);
    };
    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 border-l-4 border-emerald-500 pl-4">
          Local News Daily
        </h2>
        <span className="text-sm text-zinc-500 font-mono">
          Updated: {new Date().toLocaleDateString()}
        </span>
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
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4">
                <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Tag size={12} />
                  {item.category}
                </span>
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
              <button className="flex items-center gap-1 text-emerald-600 font-semibold text-sm group-hover:gap-2 transition-all">
                Read Full Story <ChevronRight size={16} />
              </button>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
};
