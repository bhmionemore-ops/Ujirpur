import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Users, Store, ChevronRight, Facebook, Calendar, Car, Search, Activity } from 'lucide-react';

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
import { LiveNews } from '../components/LiveNews';
import { Banner } from '../components/Banner';
import { useLanguage } from '../LanguageContext';
import { useTracking } from '../TrackingContext';

export const Home = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { logEvent } = useTracking();

  React.useEffect(() => {
    logEvent('view_home');
  }, []);

  return (
    <div className="space-y-12 pb-20">
      <Banner />

      {/* Global Search Bar */}
      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-brand-500/20 blur-3xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex items-center">
            <Search className="absolute left-8 text-zinc-400 group-focus-within:text-brand-600 transition-colors" size={28} />
            <input 
              type="text"
              placeholder={language === 'bn' ? 'দোকান, ড্রাইভার বা খবর খুঁজুন...' : 'Search shops, drivers, or news...'}
              className="w-full pl-20 pr-8 py-8 rounded-[3rem] bg-white border-4 border-zinc-100 shadow-2xl focus:border-brand-500 outline-none text-xl font-bold transition-all placeholder:text-zinc-300"
            />
            <button className="absolute right-4 px-10 py-4 bg-zinc-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl shadow-zinc-900/20">
              {language === 'bn' ? 'খুঁজুন' : 'Search'}
            </button>
          </div>
        </motion.div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4">
        <LiveNews />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12 mb-20">
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

          {/* Ponjika Box */}
          <motion.div
            whileHover={{ y: -10 }}
            onClick={() => navigate('/ponjika')}
            className="group cursor-pointer relative overflow-hidden rounded-[2.5rem] bg-white p-10 text-zinc-900 shadow-2xl shadow-brand-500/5 border-4 border-zinc-100 hover:border-brand-500 transition-all"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
              <Calendar size={120} />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 border-2 border-brand-500/20 rounded-2xl animate-spin-slow scale-125" style={{ borderStyle: 'dashed' }} />
                <Swastika size={32} className="text-brand-600" />
              </div>
              <h3 className="text-3xl font-black mb-4 tracking-tight">
                {t.nav.ponjika}
              </h3>
              <p className="text-zinc-500 font-medium mb-8 max-w-xs leading-relaxed">
                {language === 'bn' 
                  ? 'প্রতিদিনের বাংলা পঞ্জিকা, উৎসব এবং শুভ সময় জানুন।' 
                  : 'Get daily Bengali Ponjika, festivals, and auspicious timings.'}
              </p>
              <div className="flex items-center gap-2 font-black text-sm uppercase tracking-widest text-brand-600">
                {language === 'bn' ? 'পঞ্জিকা দেখুন' : 'View Ponjika'}
                <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </motion.div>

          {/* Transport Box */}
          <motion.div
            whileHover={{ y: -10 }}
            onClick={() => navigate('/transport')}
            className="group cursor-pointer relative overflow-hidden rounded-[2.5rem] bg-emerald-600 p-10 text-white shadow-2xl shadow-emerald-500/20 border-4 border-emerald-500/50"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Car size={120} />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 border border-white/20">
                <Car size={32} />
              </div>
              <h3 className="text-3xl font-black mb-4 tracking-tight">
                {t.transport.title}
              </h3>
              <p className="text-white/80 font-medium mb-8 max-w-xs leading-relaxed">
                {t.transport.subtitle}
              </p>
              <div className="flex items-center gap-2 font-black text-sm uppercase tracking-widest">
                {t.transport.findRide}
                <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Facebook Group Section */}
        <div className="mt-20 mb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-12 rounded-[3rem] bg-white border border-zinc-100 shadow-2xl shadow-zinc-200/50 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-500 via-brand-200 to-brand-500"></div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/5 blur-[100px] rounded-full"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-500/5 blur-[100px] rounded-full"></div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-brand-50 flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Facebook size={40} className="text-brand-600" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-zinc-900">
                {language === 'bn' ? 'আমাদের ফেসবুক গ্রুপে যোগ দিন' : 'Join Our Facebook Community'}
              </h2>
              <p className="text-zinc-500 font-medium mb-12 max-w-2xl mx-auto text-lg leading-relaxed">
                {language === 'bn' 
                  ? 'আমাদের ফেসবুক গ্রুপে যোগ দিয়ে সর্বশেষ আপডেট পান, আপনার মতামত শেয়ার করুন এবং সবার সাথে যুক্ত থাকুন।' 
                  : 'Get the latest updates, share your thoughts, and stay connected with everyone in our official Facebook group. Join thousands of other members!'}
              </p>
              
              <motion.a 
                href="https://www.facebook.com/groups/barniabazar/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => logEvent('click_facebook_group')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative inline-flex items-center justify-center p-[4px] overflow-hidden rounded-2xl group shadow-xl shadow-brand-500/20"
              >
                <div className="absolute inset-[-1000%] animate-spin-slow bg-[conic-gradient(from_90deg_at_50%_50%,#F58E27_0%,#F58E27_50%,#FFFFFF_100%)]" />
                <span className="relative inline-flex h-full w-full cursor-pointer items-center justify-center rounded-2xl bg-zinc-950 px-12 py-5 text-xl font-bold text-white backdrop-blur-3xl group-hover:bg-zinc-900 transition-all gap-4">
                  <Facebook size={28} className="text-brand-500" />
                  {t.banner.facebookGroup}
                </span>
              </motion.a>
            </div>
          </motion.div>
        </div>

        {/* Hidden SEO Keywords Section */}
        <div className="sr-only" aria-hidden="true">
          <h2>Barnia Digital Hub - Community Platform for Nadia</h2>
          <p>
            Welcome to the official digital hub for Barnia, Ujirpur, and the surrounding areas in Nadia, West Bengal. 
            Our platform is designed to connect the local community through Barnia Bazar market prices, 
            local influencer collaborations, and daily Bengali Ponjika updates.
          </p>
          <ul>
            <li>Barnia Bazar Daily Market Prices</li>
            <li>Ujirpur Community Updates</li>
            <li>Nadia Influencer Network</li>
            <li>Bengali Ponjika and Festivals</li>
            <li>Thatta Local News</li>
            <li>Barnia Digital Hub Official Website</li>
          </ul>
        </div>
      </div>
      {/* Hidden SEO Section for Google Indexing */}
      <div className="sr-only" aria-hidden="true">
        <h2>Barnia Digital Hub - Community Platform for Nadia, West Bengal</h2>
        <p>
          Welcome to Barnia Digital Hub, the official community platform for Barnia, Ujirpur, Nadia, and surrounding areas in West Bengal. 
          Get daily Barnia Bazar market prices, connect with local influencers, and stay updated with the latest news from Barnia and Nadia.
        </p>
        <ul>
          <li>Barnia Bazar Today Market Price</li>
          <li>Barnia News Today</li>
          <li>Nadia West Bengal Community Hub</li>
          <li>Bengali Ponjika and Calendar</li>
          <li>Local Influencers in Barnia</li>
          <li>Shops and Businesses in Barnia Bazar</li>
          <li>Ujirpur Nadia Community Updates</li>
        </ul>
      </div>
    </div>
  );
};
