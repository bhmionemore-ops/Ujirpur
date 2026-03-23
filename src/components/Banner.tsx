import React, { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Users, ShoppingBag, ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1920",
    title: "Live News Hub",
    subtitle: "Stay updated with the latest news from Ujirpur Barnia and beyond.",
    path: "/",
    icon: <Newspaper size={20} />,
    labelKey: 'news'
  },
  {
    url: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=1920",
    title: "Barnia Bazar",
    subtitle: "Explore local shops and check daily market prices online.",
    path: "/bazar",
    icon: <ShoppingBag size={20} />,
    labelKey: 'bazar'
  },
  {
    url: "https://images.unsplash.com/photo-1590005354167-6da97870c921?auto=format&fit=crop&q=80&w=1920",
    title: "Influencer Network",
    subtitle: "Connect with local talent and collaborate on creative projects.",
    path: "/influencers",
    icon: <Users size={20} />,
    labelKey: 'influencer'
  }
];

export const Banner = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setCurrent((prev) => (prev + 1) % SLIDES.length);
  const prev = () => setCurrent((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));

  return (
    <div className="relative h-[600px] w-full overflow-hidden bg-zinc-950">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img
            src={SLIDES[current].url}
            alt={SLIDES[current].title}
            className="h-full w-full object-cover opacity-50 brightness-75 transition-all duration-1000"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/30"></div>
        </motion.div>
      </AnimatePresence>
      
      {/* Overlay Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <span className="inline-block px-6 py-2 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-400 text-sm font-black uppercase tracking-[0.4em] backdrop-blur-md shadow-[0_0_20px_rgba(245,142,39,0.2)]">
            {"Welcome to our community".split("").map((letter, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                animate={{ 
                  opacity: [0, 1, 1, 0],
                  scale: [0.8, 1, 1, 0.8],
                  filter: ["blur(4px)", "blur(0px)", "blur(0px)", "blur(4px)"]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  delay: 0.5 + index * 0.05,
                  times: [0, 0.2, 0.8, 1],
                  ease: "easeInOut"
                }}
                className="inline-block"
              >
                {letter === " " ? "\u00A0" : letter}
              </motion.span>
            ))}
          </span>
        </motion.div>

        <motion.div
          key={`title-${current}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-5xl mx-auto"
        >
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-6 leading-[0.9]">
            {language === 'bn' ? (
              current === 0 ? 'লাইভ নিউজ হাব' : 
              current === 1 ? 'বার্নিয়া বাজার' : 
              'ইনফ্লুয়েন্সার নেটওয়ার্ক'
            ) : SLIDES[current].title}
          </h1>
          <p className="text-lg md:text-xl text-zinc-300 font-medium max-w-2xl mx-auto leading-relaxed">
            {language === 'bn' ? (
              current === 0 ? 'উজিরপুর বার্নিয়া এবং তার বাইরের সর্বশেষ খবরের সাথে আপডেট থাকুন।' : 
              current === 1 ? 'স্থানীয় দোকানগুলি অন্বেষণ করুন এবং অনলাইনে প্রতিদিনের বাজার দর পরীক্ষা করুন।' : 
              'স্থানীয় প্রতিভাদের সাথে সংযোগ করুন এবং সৃজনশীল প্রকল্পে সহযোগিতা করুন।'
            ) : SLIDES[current].subtitle}
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center gap-4 mt-12"
        >
          <button 
            onClick={() => navigate('/')}
            className="group relative px-8 py-4 rounded-2xl bg-brand-600 text-white font-bold text-lg shadow-xl shadow-brand-600/20 hover:bg-brand-700 hover:scale-105 transition-all flex items-center gap-3"
          >
            <Newspaper size={20} />
            {t.banner.news}
          </button>

          <button 
            onClick={() => navigate('/bazar')}
            className="group relative px-8 py-4 rounded-2xl bg-white/10 text-white font-bold text-lg backdrop-blur-md border border-white/20 hover:bg-white/20 hover:scale-105 transition-all flex items-center gap-3"
          >
            <ShoppingBag size={20} />
            {t.banner.bazar}
          </button>
          
          <button 
            onClick={() => navigate('/influencers')}
            className="group relative px-8 py-4 rounded-2xl bg-zinc-900 text-white font-bold text-lg hover:bg-black hover:scale-105 transition-all flex items-center gap-3"
          >
            <Users size={20} />
            {t.banner.influencer}
          </button>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-12 left-4 right-4 md:left-12 md:right-12 flex items-center justify-between z-20">
        <div className="flex gap-3">
          {SLIDES.map((_, i) => (
            <button
              key={`slide-dot-${i}`}
              onClick={() => setCurrent(i)}
              className={`h-1 rounded-full transition-all duration-500 ${current === i ? 'bg-brand-500 w-12' : 'bg-white/20 w-6 hover:bg-white/40'}`}
            />
          ))}
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={prev}
            className="p-3 rounded-2xl bg-white/5 text-white hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={next}
            className="p-3 rounded-2xl bg-white/5 text-white hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
