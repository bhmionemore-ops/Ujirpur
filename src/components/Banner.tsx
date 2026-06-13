import React, { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Users, ShoppingBag, ChevronLeft, ChevronRight, Newspaper, Facebook, Calendar, Car, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SLIDES = [
  {
    url: "https://i.postimg.cc/SRnmvf8Y/Gemini-Generated-Image-ley1tyley1tyley1.png",
    title: "Live News Hub",
    subtitle: "Stay updated with the latest news from Barnia and beyond.",
    path: "/",
    icon: <Newspaper size={20} />,
    labelKey: 'news'
  },
  {
    url: "https://i.postimg.cc/Bnncj8x2/Gemini-Generated-Image-rwzq46rwzq46rwzq.png",
    title: "Village Transport",
    subtitle: "Book rides and track local transport easily within the village.",
    path: "/transport",
    icon: <Car size={20} />,
    labelKey: 'transport'
  },
  {
    url: "https://i.postimg.cc/Hn0RkJQ8/Gemini-Generated-Image-4uqd304uqd304uqd.png",
    title: "Barnia Bazar",
    subtitle: "Explore local shops and check daily market prices online.",
    path: "/bazar",
    icon: <ShoppingBag size={20} />,
    labelKey: 'bazar'
  },
  {
    url: "https://i.postimg.cc/XXMmVfZf/Gemini-Generated-Image-z1gyayz1gyayz1gy.png",
    title: "Influencer Network",
    subtitle: "Connect with local talent and collaborate on creative projects.",
    path: "/influencers",
    icon: <Users size={20} />,
    labelKey: 'influencer'
  },
  {
    url: "https://i.postimg.cc/3RXK5xb8/Gemini-Generated-Image-3luc943luc943luc.png",
    title: "Collaboration Hub",
    subtitle: "Tools designed for seamless partnership between creators.",
    path: "/influencers",
    icon: <Zap size={20} />,
    labelKey: 'collab'
  },
  {
    url: "https://i.postimg.cc/Pfy63krN/Gemini-Generated-Image-9komwk9komwk9kom.png",
    title: "Bengali Ponjika",
    subtitle: "Check daily Tithi, Nakshatra, and special festivals in our digital Panjika.",
    path: "/ponjika",
    icon: <Calendar size={20} />,
    labelKey: 'ponjika'
  }
];

const Swastika = ({ size = 16, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 12V4h8M12 12h8v8M12 12v8H4M12 12H4V4" />
    <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="8" r="1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="16" r="1" fill="currentColor" stroke="none" />
    <circle cx="8" cy="16" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const Banner = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isDismissed) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isDismissed]);

  const next = () => setCurrent((prev) => (prev + 1) % SLIDES.length);
  const prev = () => setCurrent((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));

  const handleNavigation = (path: string, isExternal = false) => {
    // Trigger "Slide Up" animation
    setIsDismissed(true);

    // Wait for animation to finish before actually navigating or scrolling
    setTimeout(() => {
      if (isExternal) {
        window.open(path, '_blank');
        setTimeout(() => setIsDismissed(false), 1000);
        return;
      }

      if (window.location.pathname === '/' && (path === '/' || path === '#news')) {
        const newsSection = document.getElementById('news');
        if (newsSection) {
          newsSection.scrollIntoView({ behavior: 'smooth' });
          // Reset after scroll so it's visible if they scroll back up
          setTimeout(() => setIsDismissed(false), 1000);
          return;
        }
      }

      if (window.location.pathname === path) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => setIsDismissed(false), 1000);
      } else {
        navigate(path);
      }
    }, 800); // Increased to match animation duration
  };

  return (
    <motion.div 
      initial={false}
      animate={{ 
        y: isDismissed ? '-100%' : 0,
        opacity: isDismissed ? 0 : 1,
        height: isDismissed ? 0 : undefined
      }}
      transition={{ 
        duration: 0.8, 
        ease: [0.4, 0, 0.2, 1] 
      }}
      className="relative h-[600px] md:h-[700px] w-full overflow-hidden bg-gradient-to-b from-[#1C0D02]/85 via-orange-950/75 to-[#1C0D02]/90 group/banner border-b border-orange-500/20 shadow-[0_15px_50px_rgba(245,142,39,0.25)]" 
      id="main-banner"
    >
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
            className="h-full w-full object-cover opacity-85 brightness-95 transition-all duration-1000"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/45"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(245,142,39,0.2),transparent_75%)] pointer-events-none"></div>
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
          <span className="inline-block px-6 py-2 rounded-full bg-zinc-950/50 border border-orange-500/35 text-brand-400 text-base md:text-sm font-black uppercase tracking-[0.4em] backdrop-blur-md shadow-lg">
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
                className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-amber-200 font-extrabold"
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
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-400 mb-6 leading-[0.9] text-shadow-lg md:text-3d-colorful">
            {language === 'bn' ? (
              current === 0 ? 'লাইভ নিউজ হাব' : 
              current === 1 ? 'গ্রাম্য পরিবহন' : 
              current === 2 ? 'বার্নিয়া বাজার' : 
              current === 3 ? 'ইনফ্লুয়েন্সার নেটওয়ার্ক' :
              current === 4 ? 'সহযোগিতা হাব' :
              'বাংলা পঞ্জিকা'
            ) : SLIDES[current].title}
          </h1>
          <div className="max-w-2xl mx-auto px-4">
            <p className="text-xl md:text-2xl text-zinc-100 font-black leading-relaxed drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)]">
              {language === 'bn' ? (
                current === 0 ? 'উজিরপুর বার্নিয়া এবং তার বাইরের সর্বশেষ খবরের সাথে আপডেট থাকুন।' : 
                current === 1 ? 'সহজেই গ্রামের মধ্যে রাইড বুক করুন এবং স্থানীয় পরিবহন ট্র্যাক করুন।' : 
                current === 2 ? 'স্থানীয় দোকানগুলি অন্বেষণ করুন এবং অনলাইনে প্রতিদিনের বাজার দর পরীক্ষা করুন।' : 
                current === 3 ? 'স্থানীয় প্রতিভাদের সাথে সংযোগ করুন এবং সৃজনশীল প্রকল্পে সহযোগিতা করুন।' :
                current === 4 ? 'ক্রিয়েটরদের মধ্যে নিরবচ্ছিন্ন অংশীদারিত্বের জন্য ডিজাইন করা টুল।' :
                'আমাদের ডিজিটাল পঞ্জিকায় প্রতিদিনের তিথি, নক্ষत्र এবং বিশেষ উৎসবগুলি দেখুন।'
              ) : SLIDES[current].subtitle}
            </p>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center gap-4 mt-12"
        >
          <button 
            onClick={() => handleNavigation('/')}
            className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FF5E00] to-[#FFA000] text-white font-bold text-lg shadow-[0_8px_30px_rgba(255,94,0,0.45)] hover:shadow-[0_12px_40px_rgba(255,94,0,0.6)] hover:scale-105 transition-all duration-300 flex items-center gap-3 border border-orange-400/30"
          >
            <Newspaper size={20} className="group-hover:rotate-12 transition-transform duration-300" />
            {t.banner.news}
          </button>

          <button 
            onClick={() => handleNavigation('/transport')}
            className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-[#FFA000] text-white font-bold text-lg shadow-[0_8px_30px_rgba(16,185,129,0.35)] hover:shadow-[0_12px_40px_rgba(255,160,0,0.4)] hover:scale-105 transition-all duration-300 flex items-center gap-3 border border-emerald-400/30"
          >
            <Car size={20} className="group-hover:-translate-y-1 transition-transform" />
            {language === 'bn' ? 'পরিবহন' : 'Ride'}
          </button>

          <button 
            onClick={() => handleNavigation('/bazar')}
            className="group relative px-8 py-4 rounded-2xl bg-white/15 text-white font-bold text-lg backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgba(255,255,255,0.15)] hover:bg-white/25 hover:shadow-[0_12px_40px_rgba(255,255,255,0.25)] hover:scale-105 transition-all duration-300 flex items-center gap-3"
          >
            <ShoppingBag size={20} className="group-hover:scale-110 transition-transform" />
            {t.banner.bazar}
          </button>
          
          <button 
            onClick={() => handleNavigation('/influencers')}
            className="group relative px-8 py-4 rounded-2xl bg-[#1C0D02]/85 text-zinc-100 font-bold text-lg border border-orange-500/25 shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:bg-black hover:scale-105 transition-all duration-300 flex items-center gap-3"
          >
            <Users size={20} className="group-hover:translate-x-1 transition-transform" />
            {t.banner.influencer}
          </button>

          <button 
            onClick={() => handleNavigation('/ponjika')}
            className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FFF9F2] to-[#FFEBD6] text-orange-950 font-black text-lg hover:from-white hover:to-[#FFF1E0] hover:scale-105 transition-all duration-300 flex items-center gap-4 border-2 border-[#FFA000]/60 overflow-hidden shadow-xl"
          >
            <div className="relative flex items-center justify-center bg-orange-500/10 p-2 rounded-full">
              <div className="absolute inset-0 border border-orange-500/30 rounded-full animate-spin-slow scale-150" style={{ borderStyle: 'dashed' }} />
              <Swastika size={20} className="text-[#FF5E00]" />
            </div>
            {t.nav.ponjika}
          </button>

          {/* Facebook Group Button with Glowing Animation */}
          <motion.button 
            onClick={() => handleNavigation('https://www.facebook.com/groups/barniadigitalhub', true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-[3px] overflow-hidden rounded-2xl group flex items-center justify-center"
          >
            <div className="absolute inset-[-1000%] animate-spin-slow bg-[conic-gradient(from_90deg_at_50%_50%,#F58E27_0%,#F58E27_50%,#FFFFFF_100%)]" />
            <span className="relative inline-flex h-full w-full cursor-pointer items-center justify-center rounded-2xl bg-zinc-950 px-8 py-4 text-lg font-bold text-white backdrop-blur-3xl group-hover:bg-zinc-900 transition-all gap-3">
              <Facebook size={24} className="text-[#FF5E00]" />
              {t.banner.facebookGroup}
            </span>
          </motion.button>
        </motion.div>

        {/* Scroll Down Indicator */}
        <motion.button
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          onClick={() => handleNavigation('/')}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 hover:text-brand-400 transition-all group/scroll z-20"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.3em] group-hover:tracking-[0.5em] transition-all">
            {language === 'bn' ? 'নিচে দেখুন' : 'Explore'}
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-md group-hover:border-orange-500/50 group-hover:bg-orange-500/10 transition-all"
          >
            <ChevronDown size={20} />
          </motion.div>
        </motion.button>
      </div>

      {/* Navigation Arrows */}
      <button 
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-4 rounded-2xl bg-black/40 hover:bg-[#FF5E00] text-white backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover/banner:opacity-100 hidden md:block"
      >
        <ChevronLeft size={24} />
      </button>
      <button 
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-4 rounded-2xl bg-black/40 hover:bg-[#FF5E00] text-white backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover/banner:opacity-100 hidden md:block"
      >
        <ChevronRight size={24} />
      </button>

      {/* Progress Indicators */}
      <div className="absolute bottom-8 right-8 z-20 flex gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              current === i ? 'w-8 bg-gradient-to-r from-[#FF5E00] to-[#FFA000]' : 'w-2 bg-white/30 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
};
