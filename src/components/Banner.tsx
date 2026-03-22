import React, { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Users, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1920",
    title: "উজিরপুর, বার্নিয়া, নদীয়া",
    subtitle: "স্বাগতম আমাদের গ্রামে"
  },
  {
    url: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=1920",
    title: "আমাদের বাজার",
    subtitle: "তাজা সবজি এবং হস্তশিল্প"
  },
  {
    url: "https://images.unsplash.com/photo-1590005354167-6da97870c921?auto=format&fit=crop&q=80&w=1920",
    title: "ইনফ্লুয়েন্সার হাব",
    subtitle: "প্রতিভা এবং সৃজনশীলতা"
  }
];

export const Banner = () => {
  const { t } = useLanguage();
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
    <div className="relative h-[600px] w-full overflow-hidden bg-zinc-900">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <img
            src={SLIDES[current].url}
            alt={SLIDES[current].title}
            className="h-full w-full object-cover opacity-60 brightness-75"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </AnimatePresence>
      
      {/* Overlay Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
        
        {/* "WELCOME TO" - Rainbow Gradient */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2"
        >
          <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter drop-shadow-[4px_4px_0px_rgba(0,0,0,0.8)] bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-blue-500 to-purple-500">
            WELCOME TO
          </h2>
        </motion.div>

        {/* Main Title - 3D Blue Text */}
        <motion.div
          key={`title-${current}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mb-12"
        >
          <h1 className="text-5xl md:text-8xl font-black tracking-tight text-white drop-shadow-[6px_6px_0px_#FF9933] px-8 py-4">
            {SLIDES[current].title}
          </h1>
          <p className="text-xl md:text-2xl text-orange-200 font-bold mt-4 drop-shadow-md">
            {SLIDES[current].subtitle}
          </p>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          <motion.a 
            whileHover={{ scale: 1.1, rotate: -2 }}
            whileTap={{ scale: 0.9 }}
            href="#bazar" 
            className="group relative bg-[#FF9933] text-white px-8 py-3 rounded-xl font-black text-xl shadow-[4px_4px_0px_#800000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2"
          >
            <ShoppingBag size={20} />
            {t.banner.bazar}
          </motion.a>
          
          <motion.a 
            whileHover={{ scale: 1.1, rotate: 2 }}
            whileTap={{ scale: 0.9 }}
            href="#influencers" 
            className="group relative bg-[#800000] text-white px-8 py-3 rounded-xl font-black text-xl shadow-[4px_4px_0px_#FF9933] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2"
          >
            <Users size={20} />
            {t.banner.influencer}
          </motion.a>
        </div>
      </div>

      {/* Controls */}
      <button 
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
      >
        <ChevronLeft size={32} />
      </button>
      <button 
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
      >
        <ChevronRight size={32} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={`slide-dot-${i}`}
            onClick={() => setCurrent(i)}
            className={`w-3 h-3 rounded-full transition-all ${current === i ? 'bg-[#FF9933] w-8' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
};
