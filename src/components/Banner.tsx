import React from 'react';
import { useLanguage } from '../LanguageContext';
import { motion } from 'motion/react';
import { Zap, Users, ShoppingBag } from 'lucide-react';

export const Banner = () => {
  const { t } = useLanguage();
  
  return (
    <div className="relative h-[550px] w-full overflow-hidden bg-[#1a2e1a]">
      {/* Background Image - Thematic farming scene */}
      <img
        src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1920"
        alt="Farming in Nadia"
        className="h-full w-full object-cover opacity-60 brightness-75"
        referrerPolicy="no-referrer"
      />
      
      {/* Overlay Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        
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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mb-12"
        >
          <h1 className="text-5xl md:text-8xl font-black tracking-tight text-[#2563eb] drop-shadow-[6px_6px_0px_white] px-8 py-4">
            উজিরপুর, বার্নিয়া, নদীয়া
          </h1>
          {/* Lens Flares */}
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-24 h-24 bg-white/30 blur-[40px] rounded-full animate-pulse" />
          <div className="absolute -right-12 top-1/2 -translate-y-1/2 w-24 h-24 bg-white/30 blur-[40px] rounded-full animate-pulse" />
        </motion.div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          <motion.a 
            whileHover={{ scale: 1.1, rotate: -2 }}
            whileTap={{ scale: 0.9 }}
            href="#news" 
            className="group relative bg-red-600 text-white px-8 py-3 rounded-xl font-black text-xl shadow-[4px_4px_0px_white] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2"
          >
            <Zap className="fill-current" size={20} />
            {t.banner.news}
          </motion.a>
          
          <motion.a 
            whileHover={{ scale: 1.1, rotate: 2 }}
            whileTap={{ scale: 0.9 }}
            href="#influencers" 
            className="group relative bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-xl shadow-[4px_4px_0px_white] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2"
          >
            <Users size={20} />
            {t.banner.influencer}
          </motion.a>
          
          <motion.a 
            whileHover={{ scale: 1.1, rotate: -2 }}
            whileTap={{ scale: 0.9 }}
            href="#bazar" 
            className="group relative bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-xl shadow-[4px_4px_0px_white] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2"
          >
            <ShoppingBag size={20} />
            {t.banner.bazar}
          </motion.a>
        </div>
      </div>
    </div>
  );
};
