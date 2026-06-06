import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useVelocity, useInView } from 'motion/react';
import { useLanguage } from '../LanguageContext';

interface FlyingLettersScrollEffectProps {
  interactiveBackground?: boolean;
}

export const FlyingLettersScrollEffect = ({ interactiveBackground = true }: FlyingLettersScrollEffectProps) => {
  const { language } = useLanguage();
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  
  // Create a spring physics system for scroll velocity to keep motions smooth
  const smoothVelocity = useSpring(scrollVelocity, {
    stiffness: 70,
    damping: 18,
    restDelta: 0.1
  });

  // Dynamic transforms based on scroll velocity
  const velocityRotation = useTransform(smoothVelocity, [-2000, 2000], [-180, 180]);
  const velocityOffsetY = useTransform(smoothVelocity, [-2000, 2000], [80, -80]);
  const velocityScale = useTransform(smoothVelocity, [-2000, 2000], [0.85, 1.3]);

  // Translucent Bengali and English characters representing Barnia Digital Hub
  const alphabet = [
    { char: 'B', top: '12%', left: '4%', size: 'text-7xl', weight: 'font-black', color: 'text-brand-500/10' },
    { char: 'A', top: '28%', right: '5%', size: 'text-8xl', weight: 'font-bold', color: 'text-rose-500/10' },
    { char: 'R', top: '42%', left: '6%', size: 'text-6xl', weight: 'font-extrabold', color: 'text-amber-500/10' },
    { char: 'N', top: '55%', right: '6%', size: 'text-7xl', weight: 'font-bold', color: 'text-indigo-500/8' },
    { char: 'I', top: '70%', left: '5%', size: 'text-9xl', weight: 'font-black', color: 'text-emerald-500/12' },
    { char: 'A', top: '85%', right: '8%', size: 'text-8xl', weight: 'font-extrabold', color: 'text-orange-500/10' },
    // Fully formed Bengali syllable units - NO isolated floating modifiers
    { char: 'বা', top: '18%', right: '7%', size: 'text-8xl', weight: 'font-black', color: 'text-amber-600/11' },
    { char: 'র্নি', top: '34%', left: '7%', size: 'text-7xl', weight: 'font-bold', color: 'text-brand-600/10' },
    { char: 'য়া', top: '50%', left: '8%', size: 'text-8xl', weight: 'font-black', color: 'text-red-500/9' },
    { char: 'ডি', top: '65%', right: '5%', size: 'text-8xl', weight: 'font-semibold', color: 'text-indigo-600/10' },
    { char: 'জি', top: '78%', left: '9%', size: 'text-8xl', weight: 'font-bold', color: 'text-emerald-600/12' },
    { char: 'টাল', top: '92%', right: '4%', size: 'text-9xl', weight: 'font-extrabold', color: 'text-rose-600/10' }
  ];

  if (!interactiveBackground) return null;

  return (
    <div className="absolute inset-y-0 left-0 w-full pointer-events-none overflow-hidden z-0 select-none">
      {alphabet.map((item, idx) => {
        // Individual speed multiplier for parallax depth layering
        const parallaxFactor = 0.15 + (idx % 3) * 0.12;
        
        // Offset Y based on scrolling speed & depth
        const scrollOffset = useTransform(scrollY, (y) => y * parallaxFactor);

        return (
          <motion.div
            key={idx}
            className={`absolute ${item.size} ${item.weight} ${item.color} font-sans select-none tracking-normal hidden md:block`}
            style={{
              top: item.top,
              left: item.left,
              right: item.right,
              y: scrollOffset,
              rotate: velocityRotation,
              scale: velocityScale,
            }}
            transition={{ type: 'spring', damping: 20 }}
          >
            {item.char}
          </motion.div>
        );
      })}
    </div>
  );
};

interface ScrollAssembleTextProps {
  text: string;
  className?: string;
  glow?: boolean;
}

// Scroll and view-driven letter scatter-and-assemble component with full Bengali grapheme cluster support
export const ScrollAssembleText = ({ text, className = "", glow = true }: ScrollAssembleTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, margin: "-10%" });
  
  // High fidelity segmenter that groups consonants with conjuncts and vowel modifiers dynamically
  const getGraphemes = (val: string): string[] => {
    if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
      try {
        const segmenter = new (Intl as any).Segmenter('bn', { granularity: 'grapheme' });
        return Array.from(segmenter.segment(val)).map((s: any) => s.segment);
      } catch (e) {
        // Fallback to regex
      }
    }
    // High caliber regex fallback that binds base Bengali letters with their vowel markers and virama conjuncts
    const regex = /[\u0980-\u09FF][\u09BC-\u09D7\u09CD\u09E2\u09E3]*|./gu;
    return val.match(regex) || val.split("");
  };

  const chars = getGraphemes(text);

  return (
    <div 
      ref={containerRef} 
      className={`flex flex-wrap justify-center select-none overflow-hidden py-4 ${className}`}
    >
      {chars.map((char, i) => {
        // No animation for whitespaces to preserve word bounds
        if (char === " " || char === "•" || char === "  ") {
          return <span key={i} className="mx-2 filter" style={{ display: 'inline-block' }}>{char}</span>;
        }

        // Generate highly random departure paths for each letter to fly in from
        const angle = (Math.random() - 0.5) * 360; // circular departure degrees
        const distance = 120 + Math.random() * 220; // departure offset pixels
        const radian = (angle * Math.PI) / 180;
        
        const randomX = Math.cos(radian) * distance;
        const randomY = Math.sin(radian) * distance;
        const randomRotate = (Math.random() - 0.5) * 180; // chaotic rotative spin
        const randomScale = 0.2 + Math.random() * 0.4;    // size depth scaling

        return (
          <motion.span
            key={i}
            className={`inline-block origin-center font-sans ${
              glow ? 'hover:text-brand-500' : ''
            } transition-colors duration-200 cursor-default`}
            style={{ display: 'inline-block' }}
            initial={{
              opacity: 0,
              x: randomX,
              y: randomY,
              rotate: randomRotate,
              scale: randomScale
            }}
            animate={isInView ? {
              opacity: 1,
              x: 0,
              y: 0,
              rotate: 0,
              scale: 1
            } : {
              opacity: 0,
              x: randomX,
              y: randomY,
              rotate: randomRotate,
              scale: randomScale
            }}
            transition={{
              type: 'spring',
              stiffness: 85,
              damping: 15,
              mass: 0.9,
              delay: i * 0.035 // Stagger cluster-by-cluster for typewriter wave effect
            }}
            whileHover={{ 
              scale: 1.35, 
              rotate: (Math.random() - 0.5) * 20,
              color: "#F58E27",
              transition: { duration: 0.15 } 
            }}
          >
            {char}
          </motion.span>
        );
      })}
    </div>
  );
};
