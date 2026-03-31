import React, { useEffect } from 'react';
import { BarniaBazar } from '../components/BarniaBazar';
import { motion } from 'motion/react';
import { Store, ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { Banner } from '../components/Banner';

export const BarniaBazarPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();

  useEffect(() => {
    if (location.state?.scrollToContent) {
      const element = document.getElementById('content');
      if (element) {
        const offset = 80;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <Banner />
      
      <div className="max-w-7xl mx-auto px-4 mt-12">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-zinc-200 hover:border-brand-500 hover:text-brand-600 transition-all text-xs font-bold text-zinc-600 mb-12 shadow-sm hover:shadow-md"
        >
          <ChevronLeft size={16} />
          {language === 'bn' ? 'হোম পেজে ফিরে যান' : 'Back to Home'}
        </button>

        <div id="content" className="mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-100 text-brand-600 font-bold text-sm mb-4"
          >
            <Store size={16} />
            {t.banner.bazar}
          </motion.div>
          <h1 className="text-5xl font-black text-zinc-900 mb-6 tracking-tight">
            {t.bazar.title}
          </h1>
          <p className="text-zinc-500 max-w-2xl text-lg font-medium leading-relaxed">
            {t.bazar.subtitle}
          </p>
        </div>

        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-brand-500/5 border border-zinc-100">
          <BarniaBazar />
        </div>

        {/* Hidden SEO Section for Google Indexing */}
        <div className="sr-only" aria-hidden="true">
          <h2>Barnia Bazar Today Market Price - Nadia, West Bengal</h2>
          <p>
            Get the latest market prices for vegetables, fruits, and other commodities at Barnia Bazar, Nadia. 
            Our platform provides real-time updates on Barnia Bazar today market price to help local farmers and consumers.
          </p>
          <ul>
            <li>Barnia Bazar Vegetable Price Today</li>
            <li>Barnia Bazar Fruit Price Today</li>
            <li>Nadia Market Price Updates</li>
            <li>West Bengal Local Market Rates</li>
            <li>Barnia Bazar Business Directory</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
