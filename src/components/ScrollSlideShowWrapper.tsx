import React from 'react';
import { motion, Variants } from 'motion/react';

interface ScrollSlideSectionProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down' | 'scale' | 'alternate';
  delay?: number;
  className?: string;
  id?: string;
  index?: number;
}

export const ScrollSlideSection = ({
  children,
  direction = 'alternate',
  delay = 0,
  className = "",
  id,
  index = 0
}: ScrollSlideSectionProps) => {
  // Determine direction if 'alternate' is chosen
  const actualDirection = direction === 'alternate' 
    ? (index % 2 === 0 ? 'left' : 'right') 
    : direction;

  const getVariants = (): Variants => {
    switch (actualDirection) {
      case 'left':
        return {
          hidden: { opacity: 0, x: -120, scale: 0.94, rotate: -3 },
          visible: { 
            opacity: 1, 
            x: 0, 
            scale: 1, 
            rotate: 0,
            transition: { 
              type: 'spring', 
              stiffness: 60, 
              damping: 14, 
              delay,
              mass: 0.8
            } 
          }
        };
      case 'right':
        return {
          hidden: { opacity: 0, x: 120, scale: 0.94, rotate: 3 },
          visible: { 
            opacity: 1, 
            x: 0, 
            scale: 1, 
            rotate: 0,
            transition: { 
              type: 'spring', 
              stiffness: 60, 
              damping: 14, 
              delay,
              mass: 0.8
            } 
          }
        };
      case 'down':
        return {
          hidden: { opacity: 0, y: -100, scale: 0.96 },
          visible: { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: { 
              type: 'spring', 
              stiffness: 65, 
              damping: 15, 
              delay 
            } 
          }
        };
      case 'scale':
        return {
          hidden: { opacity: 0, scale: 0.8, rotate: 2 },
          visible: { 
            opacity: 1, 
            scale: 1, 
            rotate: 0,
            transition: { 
              type: 'spring', 
              stiffness: 55, 
              damping: 12, 
              delay 
            } 
          }
        };
      case 'up':
      default:
        return {
          hidden: { opacity: 0, y: 120, scale: 0.95 },
          visible: { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: { 
              type: 'spring', 
              stiffness: 60, 
              damping: 14, 
              delay 
            } 
          }
        };
    }
  };

  return (
    <motion.div
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, margin: "-100px" }}
      variants={getVariants()}
      className={`will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
};
