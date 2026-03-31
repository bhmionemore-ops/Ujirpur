import React, { useEffect } from 'react';
import { InfluencerSection } from '../components/InfluencerSection';
import { motion } from 'motion/react';
import { Users, ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { Banner } from '../components/Banner';
import { CollaborationTools } from '../components/CollaborationTools';

export const InfluencerPage = () => {
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
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border-4 border-zinc-200 hover:border-brand-500 hover:text-brand-600 transition-all text-xs font-bold text-zinc-600 mb-12 shadow-sm hover:shadow-md"
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
            <Users size={16} />
            {t.banner.influencer}
          </motion.div>
          <h1 className="text-5xl font-black text-zinc-900 mb-6 tracking-tight">
            {t.influencers.title}
          </h1>
          <p className="text-zinc-500 max-w-2xl text-lg font-medium leading-relaxed">
            {t.influencers.subtitle}
          </p>
        </div>

        <div className="space-y-20">
          <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-brand-500/5 border-4 border-brand-600">
            <InfluencerSection />
          </div>

          <CollaborationTools />
        </div>

        {/* Hidden SEO Section for Google Indexing */}
        <div className="sr-only" aria-hidden="true">
          <h2>Local Influencers in Barnia, Nadia - West Bengal</h2>
          <p>
            Connect with the top social media influencers from Barnia and Nadia. 
            Our platform helps local creators collaborate and grow their audience on Facebook and Instagram.
          </p>
          <ul>
            <li>Barnia Influencers Directory</li>
            <li>Nadia Social Media Creators</li>
            <li>West Bengal Influencer Marketing</li>
            <li>Facebook Viral Trends Barnia</li>
            <li>Instagram Content Strategy Nadia</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
