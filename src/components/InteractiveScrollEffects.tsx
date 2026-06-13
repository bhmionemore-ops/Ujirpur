import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useSpring, useTransform, useVelocity, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowDown, ArrowUp, ShoppingBag, Car, BookOpen, User, Flame, Compass } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { useLocation } from 'react-router-dom';

export const InteractiveScrollEffects = () => {
  const { language } = useLanguage();
  const location = useLocation();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'down' | 'up' | 'none'>('none');
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const { scrollY, scrollYProgress } = useScroll();
  
  // Spring physics for smooth scroll progression
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 18,
    restDelta: 0.001
  });

  // Calculate live scrolling velocity
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { stiffness: 90, damping: 22 });
  
  // Parallax multipliers & dynamic transforms
  const itemSpin = useTransform(scrollY, (y) => `rotate(${y * 0.15}deg)`);
  const emojiFloatMultiplier = useTransform(smoothVelocity, [-2000, 2000], [45, -45]);
  const totoDriveX = useTransform(smoothProgress, [0, 1], ['5%', '85%']);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      const percentage = Math.min(Math.round(latest * 100), 100);
      setScrollProgress(percentage);
      
      const currentY = scrollY.get();
      if (currentY > lastScrollY.current) {
        setScrollDirection('down');
      } else if (currentY < lastScrollY.current) {
        setScrollDirection('up');
      }
      lastScrollY.current = currentY;

      setIsVisible(true);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        setIsVisible(false);
        setScrollDirection('none');
      }, 2000);
    });

    return () => {
      unsubscribe();
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [scrollY, scrollYProgress]);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  // 1. CHOOSE DESIGN MOOD, METRIC LABEL & GRADIENTS BASED ON THE CURRENT ROUTE
  const getPageConfig = () => {
    const path = location.pathname;
    
    if (path === '/bazar') {
      return {
        gradient: "from-emerald-500 via-amber-500 to-brand-500",
        shadowColor: "rgba(16,185,129,0.4)",
        label: language === 'bn' ? 'বাজার লেনদেন' : 'bazar index',
        metric: 'Bazar Volume',
        badgeIcon: <ShoppingBag size={12} className="text-emerald-500" />,
        particles: [
          { char: '🛒', duration: 14, scale: 1.1, weight: 'font-normal' },
          { char: '🛍️', duration: 16, scale: 0.9, weight: 'font-normal' },
          { char: '₹', duration: 12, scale: 1.3, weight: 'font-black text-brand-500/20' },
          { char: '🍌', duration: 18, scale: 1.0, weight: 'font-normal' },
          { char: '🌾', duration: 15, scale: 1.2, weight: 'font-normal' },
          { char: '🥛', duration: 13, scale: 0.85, weight: 'font-normal' },
        ]
      };
    }
    
    if (path === '/transport') {
      return {
        gradient: "from-sky-500 via-blue-600 to-emerald-500",
        shadowColor: "rgba(14,165,233,0.4)",
        label: language === 'bn' ? 'টোটো গতি' : 'toto track',
        metric: 'Speed 16km/h',
        badgeIcon: <Car size={12} className="text-sky-500 animate-bounce" />,
        particles: [
          { char: '⚡', duration: 10, scale: 1.2, weight: 'font-bold' },
          { char: '☁️', duration: 22, scale: 1.5, weight: 'font-normal' },
          { char: '🎈', duration: 15, scale: 1.0, weight: 'font-normal' },
          { char: '✨', duration: 11, scale: 0.9, weight: 'font-normal' },
          { char: '🌴', duration: 19, scale: 1.3, weight: 'font-normal' },
        ]
      };
    }
    
    if (path === '/ponjika') {
      return {
        gradient: "from-amber-600 via-rose-500 to-yellow-500",
        shadowColor: "rgba(245,158,11,0.45)",
        label: language === 'bn' ? 'তিথি দশা' : 'tithi phase',
        metric: 'Ponjika Moon',
        badgeIcon: <Compass size={12} className="text-amber-500 animate-spin-slow" />,
        particles: [
          { char: '🪷', duration: 16, scale: 1.3, weight: 'font-normal' },
          { char: '🐚', duration: 18, scale: 1.1, weight: 'font-normal font-sans' },
          { char: '🔔', duration: 14, scale: 0.95, weight: 'font-normal' },
          { char: '🌸', duration: 12, scale: 1.0, weight: 'font-normal' },
          { char: '🌞', duration: 20, scale: 1.4, weight: 'font-semibold' },
        ]
      };
    }
    
    if (path === '/ai-router') {
      return {
        gradient: "from-indigo-600 via-fuchsia-500 to-cyan-500",
        shadowColor: "rgba(99,102,241,0.45)",
        label: language === 'bn' ? 'রাউটার লেটেন্সি' : 'ai latency',
        metric: '75ms Router',
        badgeIcon: <Flame size={12} className="text-indigo-500 animate-pulse" />,
        particles: [
          { char: 'AI', duration: 12, scale: 1.4, weight: 'font-black text-indigo-500/15 font-mono' },
          { char: '⚡', duration: 9, scale: 1.1, weight: 'font-normal' },
          { char: '{ }', duration: 15, scale: 1.0, weight: 'font-bold text-fuchsia-500/15 font-mono' },
          { char: '01', duration: 13, scale: 1.25, weight: 'font-medium text-cyan-500/15 font-mono' },
          { char: '🧠', duration: 17, scale: 1.15, weight: 'font-normal' },
        ]
      };
    }
    
    if (path === '/influencers') {
      return {
        gradient: "from-rose-500 via-pink-500 to-purple-600",
        shadowColor: "rgba(244,63,94,0.4)",
        label: language === 'bn' ? 'ভাইরাল ম্যাজিক' : 'creator reach',
        metric: '99k Reach',
        badgeIcon: <User size={12} className="text-rose-500" />,
        particles: [
          { char: '✨', duration: 11, scale: 1.1, weight: 'font-normal' },
          { char: '📸', duration: 15, scale: 1.2, weight: 'font-normal' },
          { char: '💖', duration: 13, scale: 1.0, weight: 'font-normal' },
          { char: '🔥', duration: 12, scale: 1.3, weight: 'font-normal' },
          { char: '👑', duration: 18, scale: 1.15, weight: 'font-normal' },
        ]
      };
    }

    if (path === '/vamshavali') {
      return {
        gradient: "from-amber-800 via-yellow-600 to-orange-500",
        shadowColor: "rgba(146,64,14,0.4)",
        label: language === 'bn' ? 'বংশ লতিকা' : 'heritage track',
        metric: '6 Generations',
        badgeIcon: <BookOpen size={12} className="text-amber-800" />,
        particles: [
          { char: '🍂', duration: 15, scale: 1.2, weight: 'font-normal' },
          { char: '🍃', duration: 13, scale: 1.0, weight: 'font-normal' },
          { char: '🌳', duration: 22, scale: 1.4, weight: 'font-normal' },
          { char: '📜', duration: 19, scale: 1.1, weight: 'font-normal' },
        ]
      };
    }

    // Default general vibe (Warm traditional Bengali Clay Lamp / Diya ambiance)
    return {
      gradient: "from-brand-500 via-orange-500 to-rose-500",
      shadowColor: "rgba(245,142,39,0.45)",
      label: language === 'bn' ? 'স্ক্রোল গভীরতা' : 'scroll depth',
      metric: 'Digital Barnia',
      badgeIcon: <Sparkles size={11} className="text-brand-500" />,
      particles: [
        { char: '🪔', duration: 16, scale: 1.3, weight: 'font-normal' },
        { char: '🎈', duration: 18, scale: 1.0, weight: 'font-normal' },
        { char: '✨', duration: 12, scale: 1.2, weight: 'font-normal' },
        { char: '🌞', duration: 20, scale: 1.35, weight: 'font-normal' },
        { char: '🌾', duration: 17, scale: 1.1, weight: 'font-normal' },
      ]
    };
  };

  const config = getPageConfig();

  // Create deterministic left offsets for particle drifting
  const leftOffsets = ['9%', '24%', '42%', '60%', '76%', '89%'];

  return (
    <>
      {/* 1. TOP NEON GRADIENT GLOW SCROLL PROGRESS BAR */}
      <div className="fixed top-0 left-0 w-full h-[6px] z-[100] bg-zinc-100/30 overflow-hidden pointer-events-none">
        <motion.div 
          className={`h-full bg-gradient-to-r ${config.gradient}`}
          style={{ 
            scaleX: smoothProgress,
            boxShadow: `0 3px 14px ${config.shadowColor}`
          }}
        />
      </div>

      {/* 2. DYNAMIC PAGE-SPECIFIC DRIFTING PARTICLES */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
        {config.particles.map((p, idx) => {
          const leftOffset = leftOffsets[idx % leftOffsets.length];
          const delay = idx * 0.95;
          return (
            <motion.div
              key={idx}
              className={`absolute select-none pointer-events-none text-zinc-800/10 dark:text-zinc-500/5 ${p.weight} hidden md:block`}
              style={{
                left: leftOffset,
                fontSize: `${Math.round(28 * p.scale)}px`,
                y: emojiFloatMultiplier,
                rotate: itemSpin,
                bottom: '-60px'
              }}
              animate={{
                y: ['108vh', '-10vh'],
                x: [0, idx % 2 === 0 ? 35 : -35, 0],
              }}
              transition={{
                y: {
                  duration: p.duration,
                  repeat: Infinity,
                  ease: 'linear',
                  delay: delay,
                },
                x: {
                  duration: p.duration / 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
              }}
            >
              {p.char}
            </motion.div>
          );
        })}
      </div>

      {/* 3. EXPLICIT TOTO/TAXICAB SCROLL TRACKER - VISIBLE ON VILLAGE TRANSPORT PAGE ONLY */}
      {location.pathname === '/transport' && (
        <div className="fixed bottom-0 left-0 w-full h-12 z-[40] bg-white/70 backdrop-blur-md border-t border-zinc-200/50 flex items-center overflow-hidden pointer-events-none select-none">
          {/* Transparent road with double yellow lines */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] border-t border-dashed border-zinc-300 w-full" />
          <div className="absolute left-[3%] text-[9px] font-black text-zinc-400 tracking-widest uppercase">
            {language === 'bn' ? 'বার্নিয়া রোডওয়েজ' : 'Barnia Roadways Track'}
          </div>
          
          <motion.div 
            className="absolute flex items-center gap-1 bg-gradient-to-r from-sky-500 to-sky-600 text-white text-[10px] font-black px-3.5 py-1.5 rounded-full shadow-lg shadow-sky-500/20"
            style={{ x: totoDriveX }}
          >
            <span className="text-xs animate-bounce" style={{ display: 'inline-block' }}>🛺</span>
            <span className="font-mono tracking-tighter uppercase">{scrollProgress}%</span>
          </motion.div>

          <div className="absolute right-[3%] text-[9px] font-black text-emerald-500 tracking-widest uppercase flex items-center gap-2 animate-pulse">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            {language === 'bn' ? 'গন্তব্য সন্নিকটে' : 'Destination Approaching'}
          </div>
        </div>
      )}

      {/* 4. MODERN HUD SIDE TRACKER DOCK (Removed on user request) */}

      {/* 5. HIGH INTERACTION CORNER GREETING WATERMARK */}
      <AnimatePresence>
        {scrollProgress > 85 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.8 }}
            className="fixed left-6 bottom-16 z-[45] hidden lg:flex items-center gap-3.5 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 rounded-[2rem] border border-white/10 shadow-2xl shadow-black/25 text-white pr-6"
          >
            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 animate-pulse">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black tracking-[0.25em] text-brand-500 uppercase leading-none mb-1">
                {language === 'bn' ? 'ডিজিটাল বার্নিয়া' : 'Digital Barnia'}
              </p>
              <h5 className="font-bold text-xs text-zinc-200">
                {language === 'bn' ? 'ধন্যবাদ আপনার ভ্রমণের জন্য!' : 'Thank you for exploring!'}
              </h5>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
