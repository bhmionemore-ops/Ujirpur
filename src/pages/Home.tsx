import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Users, Store, ChevronRight } from 'lucide-react';
import { LiveNews } from '../components/LiveNews';
import { Banner } from '../components/Banner';
import { useLanguage } from '../LanguageContext';

export const Home = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="space-y-12 pb-20">
      <Banner />
      
      <div className="max-w-7xl mx-auto px-4">
        <LiveNews />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 mb-20">
          {/* Influencer Box */}
          <motion.div
            whileHover={{ y: -10 }}
            onClick={() => navigate('/influencers')}
            className="group cursor-pointer relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-600 to-brand-500 p-10 text-white shadow-2xl shadow-brand-500/20 border-4 border-brand-400/50"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Users size={120} />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 border border-white/20">
                <Users size={32} />
              </div>
              <h3 className="text-3xl font-black mb-4 tracking-tight">
                {t.banner.joinInfluencer}
              </h3>
              <p className="text-white/80 font-medium mb-8 max-w-xs leading-relaxed">
                {t.banner.influencerDesc}
              </p>
              <div className="flex items-center gap-2 font-black text-sm uppercase tracking-widest">
                {t.banner.getStarted}
                <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </motion.div>

          {/* Shop Box */}
          <motion.div
            whileHover={{ y: -10 }}
            onClick={() => navigate('/bazar')}
            className="group cursor-pointer relative overflow-hidden rounded-[2.5rem] bg-zinc-900 p-10 text-white shadow-2xl shadow-zinc-900/20 border-4 border-zinc-800"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Store size={120} />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center mb-6 shadow-lg shadow-brand-500/20">
                <Store size={32} />
              </div>
              <h3 className="text-3xl font-black mb-4 tracking-tight">
                {t.banner.addShop}
              </h3>
              <p className="text-zinc-400 font-medium mb-8 max-w-xs leading-relaxed">
                {t.banner.shopDesc}
              </p>
              <div className="flex items-center gap-2 font-black text-sm uppercase tracking-widest text-brand-500">
                {t.banner.openShop}
                <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
