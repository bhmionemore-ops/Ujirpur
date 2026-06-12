import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, ChevronLeft, Sun, Moon, Star, Info, 
  Sunrise, Sunset, Clock, Sparkles, AlertTriangle, 
  Compass, MapPin, Share2, Download, Heart
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { useTracking } from '../TrackingContext';
import { Banner } from '../components/Banner';
import { toast } from 'sonner';
import { shareContent } from '../utils';
import { getBengaliDate, toBengaliNumber, getAlmanacData, getAuspiciousMarriageDates } from '../utils/bengaliDate';
import { TiltCard } from '../components/TiltCard';
import { ScrollSlideSection } from '../components/ScrollSlideShowWrapper';

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

const AlponaMandala = ({ size = 200, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={`animate-spin-slow text-brand-500/10 pointer-events-none select-none ${className}`}
    style={{ animationDuration: '60s' }}
  >
    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3,3" />
    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path d="M50 5 L50 95 M5 50 L95 50" stroke="currentColor" strokeWidth="0.3" />
    {/* Concentric Petals */}
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => (
      <g key={angle} transform={`rotate(${angle} 50 50)`}>
        <path d="M50 10 C53 25, 47 25, 50 10" fill="currentColor" opacity="0.4" />
        <path d="M50 20 C55 35, 45 35, 50 20" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <circle cx="50" cy="15" r="1" fill="currentColor" />
        <path d="M50 50 L50 32 M48 39 L50 32 L52 39" stroke="currentColor" strokeWidth="0.5" fill="none" />
      </g>
    ))}
    <circle cx="50" cy="50" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="2" fill="currentColor" />
  </svg>
);

const MoonOrb = ({ tithiVal }: { tithiVal: number }) => {
  // tithiVal is 0 to 29
  // 14 is Full Moon, 29 is New Moon (Amavasya)
  const litPercent = tithiVal <= 14 
    ? (tithiVal / 14) * 100 
    : ((29 - tithiVal) / 15) * 100;

  const isWaxing = tithiVal < 15;

  return (
    <div className="relative w-28 h-28 flex flex-col items-center justify-center rounded-3xl bg-zinc-950/70 border border-white/10 shadow-[inset_0_2px_12px_rgba(255,255,255,0.03),0_5px_15px_rgba(0,0,0,0.4)] overflow-hidden group">
      {/* Halo Glow */}
      <div className={`absolute inset-0 rounded-full transition-all duration-1000 ${
        isWaxing ? 'bg-amber-400/5 animate-pulse' : 'bg-sky-400/5'
      }`} />
      
      {/* The Moon Spherical Body */}
      <div className="w-14 h-14 rounded-full relative bg-zinc-900 border border-white/5 overflow-hidden shadow-inner">
        {/* Shadow side background */}
        <div className="absolute inset-0 bg-zinc-950" />
        
        {/* Illuminated side */}
        <div 
          className="absolute inset-y-0 bg-gradient-to-r from-amber-100 to-amber-200"
          style={{
            left: isWaxing ? 0 : 'auto',
            right: !isWaxing ? 0 : 'auto',
            width: `${litPercent}%`,
            borderRadius: litPercent > 50 ? '50%' : '0 99px 99px 0',
            boxShadow: '0 0 12px rgba(251, 191, 36, 0.45)'
          }}
        />
        
        {/* Crater Texture details */}
        <div className="absolute inset-0 opacity-15 pointer-events-none mix-blend-overlay" 
             style={{ 
               backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.6) 1.5px, transparent 1.5px), radial-gradient(circle, rgba(0,0,0,0.4) 1px, transparent 1.5px)',
               backgroundSize: '10px 10px',
               backgroundPosition: '3px 4px'
             }} 
        />
      </div>
      
      <div className="absolute bottom-2 text-[8px] uppercase tracking-widest font-black text-amber-400 font-mono">
        {isWaxing ? 'Waxing' : 'Waning'}
      </div>
    </div>
  );
};

export const PonjikaPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const { logEvent } = useTracking();
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    logEvent('view_ponjika');
    const timer = setTimeout(() => setLoading(false), 1200);
    
    // Update date every minute to handle day change
    const dateTimer = setInterval(() => {
      const now = new Date();
      if (now.getDate() !== currentDate.getDate()) {
        setCurrentDate(now);
      }
    }, 60000);

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
    return () => {
      clearTimeout(timer);
      clearInterval(dateTimer);
    };
  }, [location, currentDate]);

  const handleShare = () => {
    shareContent(
      t.ponjika?.title || 'Bengali Ponjika',
      t.ponjika?.subtitle || 'Daily Bengali Almanac',
      window.location.href
    );
    logEvent('share_ponjika');
  };

  const bDate = getBengaliDate(currentDate);
  const almanac = getAlmanacData(currentDate, language as 'bn' | 'en');
  const marriageInfo = getAuspiciousMarriageDates(bDate.monthIndex, language as 'bn' | 'en');
  
  const timestamp = currentDate.getTime();
  const epochDays = Math.floor(timestamp / (1000 * 60 * 60 * 24));
  const tithiVal = epochDays % 30;

  // Comprehensive Mock data for Ponjika
  const ponjikaData = {
    date: language === 'bn' ? `${toBengaliNumber(bDate.day)} ${bDate.month}, ${toBengaliNumber(bDate.year)}` : `${bDate.day} ${bDate.monthEn}, ${bDate.year}`,
    englishDate: currentDate.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
    day: language === 'bn' ? bDate.dayName : bDate.dayNameEn,
    month: language === 'bn' ? bDate.month : bDate.monthEn,
    year: language === 'bn' ? toBengaliNumber(bDate.year) : bDate.year.toString(),
    tithi: language === 'bn' ? almanac.tithi : almanac.tithiEn,
    nakshatra: language === 'bn' ? almanac.nakshatra : almanac.nakshatraEn,
    yoga: language === 'bn' ? almanac.yoga : almanac.yogaEn,
    karana: language === 'bn' ? almanac.karana : almanac.karanaEn,
    rashi: language === 'bn' ? almanac.rashi : almanac.rashiEn,
    paksha: language === 'bn' ? almanac.paksha : almanac.pakshaEn,
    ritu: language === 'bn' ? almanac.ritu : almanac.rituEn,
    rituVal: language === 'bn' ? almanac.ritu : almanac.rituEn,
    dayLord: language === 'bn' ? almanac.dayLord : almanac.dayLordEn,
    bengaliEra: language === 'bn' ? almanac.bengaliEra : almanac.bengaliEraEn,
    tithiVal,
    sunrise: almanac.sunrise,
    sunset: almanac.sunset,
    moonrise: almanac.moonrise,
    moonset: almanac.moonset,
    brahmaMuhurta: almanac.brahmaMuhurta,
    abhijitMuhurta: almanac.abhijitMuhurta,
    amritaYoga: almanac.amritaYoga,
    mahendraYoga: almanac.mahendraYoga,
    rahuKaal: almanac.rahuKaal,
    barabela: almanac.barabela,
    kalabela: almanac.kalabela,
    kalratri: almanac.kalratri,
    festivals: almanac.festivals,
    monthlyHighlights: almanac.monthlyHighlights,
    zodiacPredictions: (language === 'bn' ? [
      { sign: 'মেষ', text: 'আজ আপনার জন্য শুভ দিন। নতুন কাজে হাত দিতে পারেন।' },
      { sign: 'বৃষ', text: 'আর্থিক লেনদেনে সতর্ক থাকুন। পরিবারের সাথে সময় কাটান।' },
      { sign: 'মিথুন', text: 'ব্যবসায় উন্নতির যোগ রয়েছে। স্বাস্থ্যের প্রতি নজর দিন।' },
      { sign: 'কর্কট', text: 'মানসিক শান্তি বজায় থাকবে। প্রিয়জনের কাছ থেকে উপহার পেতে পারেন।' },
      { sign: 'সিংহ', text: 'কর্মক্ষেত্রে সাফল্যের যোগ। সামাজিক কাজে সম্মান বৃদ্ধি পাবে।' },
      { sign: 'কন্যা', text: 'ভ্রমণের পরিকল্পনা হতে পারে। বন্ধুদের সাহায্য পাবেন।' },
      { sign: 'তুলা', text: 'বিদ্যার্থীদের জন্য শুভ সময়। সৃজনশীল কাজে সাফল্য।' },
      { sign: 'বৃশ্চিক', text: 'শরীরের প্রতি যত্ন নিন। অযথা বিতর্কে জড়াবেন না।' },
      { sign: 'ধনু', text: 'পুরানো বন্ধুর সাথে দেখা হতে পারে। মনে আনন্দ থাকবে।' },
      { sign: 'মকর', text: 'কাজে একাগ্রতা বাড়বে। বড়দের আশীর্বাদ পাবেন।' },
      { sign: 'কুম্ভ', text: 'অপ্রত্যাশিত লাভ হতে পারে। নতুন সুযোগ আসবে।' },
      { sign: 'মীন', text: 'ধৈর্য ধরুন, সাফল্য আসবেই। ধর্মীয় কাজে মন দিন।' },
    ] : [
      { sign: 'Aries', text: 'A good day for you. You can start new projects.' },
      { sign: 'Taurus', text: 'Be careful with financial transactions. Spend time with family.' },
      { sign: 'Gemini', text: 'Possibility of business growth. Pay attention to health.' },
      { sign: 'Cancer', text: 'Mental peace will prevail. You may receive a gift from a loved one.' },
      { sign: 'Leo', text: 'Success in the workplace. Respect will increase in social work.' },
      { sign: 'Virgo', text: 'Travel plans may be made. You will get help from friends.' },
      { sign: 'Libra', text: 'A good time for students. Success in creative work.' },
      { sign: 'Scorpio', text: 'Take care of your health. Do not get involved in unnecessary disputes.' },
      { sign: 'Sagittarius', text: 'You may meet an old friend. There will be joy in your mind.' },
      { sign: 'Capricorn', text: 'Concentration in work will increase. You will get blessings from elders.' },
      { sign: 'Aquarius', text: 'Unexpected gain may occur. New opportunities will come.' },
      { sign: 'Pisces', text: 'Be patient, success will come. Focus on religious work.' },
    ]).map((pred, i) => {
      // Deterministic shuffle/variation based on date
      const seed = currentDate.getDate() + currentDate.getMonth() + i;
      const variations = language === 'bn' ? [
        'আজ আপনার জন্য শুভ দিন।',
        'আর্থিক লেনদেনে সতর্ক থাকুন।',
        'ব্যবসায় উন্নতির যোগ রয়েছে।',
        'মানসিক শান্তি বজায় থাকবে।',
        'কর্মক্ষেত্রে সাফল্যের যোগ।',
        'ভ্রমণের পরিকল্পনা হতে পারে।',
        'বিদ্যার্থীদের জন্য শুভ সময়।',
        'শরীরের প্রতি যত্ন নিন।',
        'পুরানো বন্ধুর সাথে দেখা হতে পারে।',
        'কাজে একাগ্রতা বাড়বে।',
        'অপ্রত্যাশিত লাভ হতে পারে।',
        'ধৈর্য ধরুন, সাফল্য আসবেই।'
      ] : [
        'A good day for you.',
        'Be careful with financial transactions.',
        'Possibility of business growth.',
        'Mental peace will prevail.',
        'Success in the workplace.',
        'Travel plans may be made.',
        'A good time for students.',
        'Take care of your health.',
        'You may meet an old friend.',
        'Concentration in work will increase.',
        'Unexpected gain may occur.',
        'Be patient, success will come.'
      ];
      return { ...pred, text: variations[seed % variations.length] };
    })
  };

  const CalendarComponent = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = endOfMonth.getDate();
    const startDay = startOfMonth.getDay();
    
    // Get Bengali month for the header
    const firstDayBengali = getBengaliDate(startOfMonth);
    const lastDayBengali = getBengaliDate(endOfMonth);
    
    const bengaliMonthHeader = firstDayBengali.month === lastDayBengali.month 
      ? firstDayBengali.month 
      : `${firstDayBengali.month}/${lastDayBengali.month}`;

    const bengaliMonthHeaderEn = firstDayBengali.monthEn === lastDayBengali.monthEn 
      ? firstDayBengali.monthEn 
      : `${firstDayBengali.monthEn}/${lastDayBengali.monthEn}`;

    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-14 md:h-20" />);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const bDate = getBengaliDate(date);
      const isToday = i === currentDate.getDate();
      
      days.push(
        <motion.div 
          key={i} 
          whileHover={{ scale: 1.05, y: -5 }}
          onClick={() => {
            const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
            setCurrentDate(newDate);
            logEvent('view_ponjika_date', { date: newDate.toISOString() });
          }}
          className={`h-14 md:h-20 flex flex-col items-center justify-center rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
            isToday 
              ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white border-brand-400 shadow-[0_10px_20px_rgba(242,125,38,0.3)] z-10' 
              : 'bg-white border-zinc-100 hover:border-brand-300 hover:shadow-xl shadow-sm'
          }`}
        >
          {isToday && (
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-white/20 rounded-full blur-lg" />
          )}
          <span className="text-sm md:text-lg font-black leading-none mb-1">
            {language === 'bn' ? toBengaliNumber(i) : i}
          </span>
          <span className={`text-[9px] md:text-[11px] font-bold ${isToday ? 'text-white/90' : 'text-brand-500/70'}`}>
            {language === 'bn' ? toBengaliNumber(bDate.day) : bDate.day}
          </span>
          {!isToday && (
            <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-zinc-100" />
          )}
        </motion.div>
      );
    }

    const weekDays = language === 'bn' 
      ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white rounded-[4rem] p-8 md:p-12 border-4 border-zinc-900 shadow-[20px_20px_0px_0px_rgba(242,125,38,0.1)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-400 via-brand-500 to-emerald-500" />
        
        <div className="flex flex-col gap-4 mb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center border-2 border-brand-100 relative overflow-hidden">
                <div className="absolute inset-0 border border-brand-500/10 rounded-full animate-spin-slow scale-150" style={{ borderStyle: 'dashed' }} />
                <Swastika size={20} className="text-brand-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-zinc-900 tracking-tighter">
                  {currentDate.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-sm font-bold text-brand-600 tracking-tight">
                  {language === 'bn' 
                    ? `${bengaliMonthHeader} ${toBengaliNumber(firstDayBengali.year)}` 
                    : `${bengaliMonthHeaderEn} ${firstDayBengali.year}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
                  setCurrentDate(newDate);
                }}
                className="p-2 rounded-xl border-2 border-zinc-100 hover:border-brand-500 hover:text-brand-600 transition-all bg-white shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => {
                  const newDate = new Date();
                  setCurrentDate(newDate);
                }}
                className="px-3 py-2 rounded-xl border-2 border-zinc-100 hover:border-brand-500 hover:text-brand-600 transition-all bg-white shadow-sm text-[10px] font-black uppercase tracking-widest"
              >
                {language === 'bn' ? 'আজ' : 'Today'}
              </button>
              <button 
                onClick={() => {
                  const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                  setCurrentDate(newDate);
                }}
                className="p-2 rounded-xl border-2 border-zinc-100 hover:border-brand-500 hover:text-brand-600 transition-all bg-white shadow-sm rotate-180"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3 md:gap-5">
          {weekDays.map((day, idx) => (
            <div key={day} className={`text-center text-[10px] font-black uppercase tracking-widest mb-4 ${idx === 0 ? 'text-rose-500' : 'text-zinc-400'}`}>
              {day}
            </div>
          ))}
          {days}
        </div>

        <div className="mt-10 pt-8 border-t-2 border-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-zinc-200" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{language === 'bn' ? 'ইংরেজি' : 'English'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-500">{language === 'bn' ? 'বাংলা' : 'Bengali'}</span>
            <div className="w-2 h-2 rounded-full bg-brand-500" />
          </div>
        </div>
      </div>
    );
  };

  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-culture-bg pb-24 font-sans selection:bg-brand-200">
      <Banner />
      
      <div className="max-w-7xl mx-auto px-4 mt-12">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <button 
            onClick={() => navigate('/')}
            className="group flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border-2 border-zinc-100 hover:border-brand-500 hover:text-brand-600 transition-all text-sm font-bold text-zinc-600 shadow-sm hover:shadow-xl active:scale-95 w-fit"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            {t.ponjika?.backToHome}
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleShare}
              className="p-3 rounded-2xl bg-white border-2 border-zinc-100 hover:border-brand-500 hover:text-brand-600 transition-all shadow-sm hover:shadow-lg active:scale-95"
              title="Share"
            >
              <Share2 size={20} />
            </button>
            <button 
              onClick={handleDownload}
              className="p-3 rounded-2xl bg-white border-2 border-zinc-100 hover:border-brand-500 hover:text-brand-600 transition-all shadow-sm hover:shadow-lg active:scale-95"
              title="Download PDF"
            >
              <Download size={20} />
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div id="content" className="mb-16 relative">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-brand-200/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
          
          <div className="relative z-10 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-brand-50 text-brand-700 font-black text-xs uppercase tracking-widest mb-8 border border-brand-100 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute inset-0 border-2 border-brand-500/10 rounded-full animate-spin-slow scale-150" style={{ borderStyle: 'dashed' }} />
              <Swastika size={18} className="text-brand-600 animate-pulse" />
              <span className="relative z-10">{t.nav.ponjika}</span>
              <Swastika size={18} className="text-brand-600 animate-pulse" />
            </motion.div>
            <h1 className="text-6xl md:text-9xl font-black text-zinc-900 mb-6 tracking-tighter leading-[0.8] uppercase">
              {t.ponjika?.title}
            </h1>
            <p className="text-zinc-500 max-w-2xl text-xl font-medium leading-relaxed mx-auto md:mx-0">
              {t.ponjika?.subtitle}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-[12px] border-brand-100 rounded-full" />
              <div className="absolute inset-0 border-[12px] border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-zinc-400 font-black uppercase tracking-[0.4em] mt-12 animate-pulse text-xs">{t.ponjika?.loading}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Today's Main Info - Bento Large */}
            <ScrollSlideSection 
              direction="left"
              index={0}
              className="lg:col-span-8"
            >
              <TiltCard 
                className="bg-white rounded-[4rem] p-10 md:p-16 border-4 border-zinc-900 relative overflow-hidden group h-full"
                glowColor="rgba(242,125,38,0.15)"
                intensity={0.7}
              >
                {/* Background Alpona Mandala */}
                <div className="absolute right-[-80px] top-[-80px] opacity-10 group-hover:opacity-15 transition-opacity duration-500 pointer-events-none">
                  <AlponaMandala size={320} />
                </div>

                {/* Background Image Overlay */}
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
                  <img 
                    src="https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&q=80&w=1000" 
                    alt="Background Pattern" 
                    className="w-full h-full object-cover grayscale"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                    <div>
                      <h2 className="text-5xl md:text-8xl font-black text-zinc-900 tracking-tighter mb-6 leading-none">
                        {ponjikaData.day}
                      </h2>
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="px-6 py-3 rounded-2xl bg-zinc-900 text-white font-black text-base tracking-tight shadow-xl shadow-zinc-900/20">
                          {ponjikaData.date}
                        </span>
                        <span className="px-6 py-3 rounded-2xl bg-zinc-100 text-zinc-600 font-bold text-base border border-zinc-200">
                          {ponjikaData.englishDate}
                        </span>
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-3">{t.ponjika?.rashi}</p>
                      <div className="flex items-center gap-3 justify-end">
                        <Compass size={24} className="text-brand-500 animate-spin-slow" style={{ animationDuration: '20s' }} />
                        <p className="text-3xl font-black text-brand-600 tracking-tight">{ponjikaData.rashi}</p>
                      </div>
                    </div>
                  </div>

                  {/* Traditional Ponjika Stats Panel */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 border-y-2 border-zinc-100 py-6">
                    <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-100 flex flex-col justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand-700/70 mb-1">{language === 'bn' ? 'বঙ্গাব্দ সাল' : 'Bengali Era'}</span>
                      <span className="text-base font-black text-brand-950 truncate">{ponjikaData.bengaliEra}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 flex flex-col justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-700/70 mb-1">{language === 'bn' ? 'বঙ্গীয় ঋতু' : 'Bengali Season'}</span>
                      <span className="text-base font-black text-amber-950 truncate">{ponjikaData.rituVal}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-700/70 mb-1">{language === 'bn' ? 'চন্দ্র পক্ষ' : 'Lunar Phase'}</span>
                      <span className="text-base font-black text-indigo-950 truncate">{ponjikaData.paksha}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex flex-col justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700/70 mb-1">{language === 'bn' ? 'বারাধিপতি' : 'Day Lord'}</span>
                      <span className="text-base font-black text-emerald-900 truncate">{ponjikaData.dayLord}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div className="space-y-12">
                      <div className="group/item">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-4 group-hover/item:text-brand-500 transition-colors">{t.ponjika?.tithi}</p>
                        <p className="text-4xl font-black text-zinc-900 tracking-tighter leading-tight">{ponjikaData.tithi}</p>
                      </div>
                      <div className="group/item">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-4 group-hover/item:text-brand-500 transition-colors">{t.ponjika?.nakshatra}</p>
                        <p className="text-3xl font-bold text-zinc-800 tracking-tight leading-tight">{ponjikaData.nakshatra}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-10">
                        <div className="group/item">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-4 group-hover/item:text-brand-500 transition-colors">{t.ponjika?.yoga}</p>
                          <p className="text-2xl font-black text-zinc-900">{ponjikaData.yoga}</p>
                        </div>
                        <div className="group/item">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-4 group-hover/item:text-brand-500 transition-colors">{t.ponjika?.karana}</p>
                          <p className="text-2xl font-black text-zinc-900">{ponjikaData.karana}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-50 rounded-[3.5rem] p-12 border-2 border-zinc-100 relative overflow-hidden shadow-inner flex flex-col justify-between">
                      <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Star size={120} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-10 flex items-center gap-4 text-zinc-400">
                          <div className="w-8 h-px bg-zinc-200" />
                          {t.ponjika?.festivals}
                        </h3>
                        <div className="space-y-8">
                          {ponjikaData.festivals.map((fest, idx) => (
                            <div key={idx} className="flex items-start gap-5 group/fest">
                              <div className="w-3 h-3 rounded-full bg-brand-500 mt-2 shrink-0 group-hover/fest:scale-150 transition-transform shadow-lg shadow-brand-500/20" />
                              <p className="text-xl font-bold text-zinc-800 leading-tight group-hover/fest:text-brand-600 transition-colors">{fest}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </ScrollSlideSection>

            {/* Calendar - Bento Grid Item */}
            <ScrollSlideSection 
              direction="right"
              index={1}
              className="lg:col-span-4"
            >
              <CalendarComponent />
            </ScrollSlideSection>

            {/* Sun & Moon - Bento Grid Item */}
            <ScrollSlideSection 
              direction="right"
              index={2}
              className="lg:col-span-4"
            >
              <TiltCard 
                className="bg-zinc-900 rounded-[4rem] p-12 text-white relative overflow-hidden h-full flex flex-col justify-between border-4 border-zinc-800"
                glowColor="rgba(251,191,36,0.18)"
                intensity={1.1}
              >
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl" />
                
                <div>
                  <div className="flex items-start justify-between gap-4 mb-12">
                    <h3 className="text-2xl font-black flex items-center gap-4 mt-2">
                      <Sunrise className="text-brand-500" />
                      {language === 'bn' ? 'সূর্য ও চন্দ্র' : 'Sun & Moon'}
                    </h3>
                    <MoonOrb tithiVal={ponjikaData.tithiVal} />
                  </div>
                  
                  <div className="space-y-10">
                    <div className="flex items-center justify-between group/time">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white/5 rounded-[1.5rem] flex items-center justify-center border border-white/10 group-hover/time:bg-brand-500/20 group-hover/time:border-brand-500/30 transition-all">
                          <Sunrise size={24} className="text-brand-400" />
                        </div>
                        <span className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em]">{t.ponjika?.sunrise}</span>
                      </div>
                      <span className="text-2xl font-black tracking-tighter">{ponjikaData.sunrise}</span>
                    </div>
                    <div className="flex items-center justify-between group/time">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white/5 rounded-[1.5rem] flex items-center justify-center border border-white/10 group-hover/time:bg-brand-500/20 group-hover/time:border-brand-500/30 transition-all">
                          <Sunset size={24} className="text-brand-400" />
                        </div>
                        <span className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em]">{t.ponjika?.sunset}</span>
                      </div>
                      <span className="text-2xl font-black tracking-tighter">{ponjikaData.sunset}</span>
                    </div>
                    <div className="h-px bg-white/10 mx-4" />
                    <div className="flex items-center justify-between group/time">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white/5 rounded-[1.5rem] flex items-center justify-center border border-white/10 group-hover/time:bg-brand-500/20 group-hover/time:border-brand-500/30 transition-all">
                          <Moon size={24} className="text-zinc-400" />
                        </div>
                        <span className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em]">{t.ponjika?.moonrise}</span>
                      </div>
                      <span className="text-2xl font-black tracking-tighter">{ponjikaData.moonrise}</span>
                    </div>
                    <div className="flex items-center justify-between group/time">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white/5 rounded-[1.5rem] flex items-center justify-center border border-white/10 group-hover/time:bg-brand-500/20 group-hover/time:border-brand-500/30 transition-all">
                          <Moon size={24} className="text-zinc-400 rotate-180" />
                        </div>
                        <span className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em]">{t.ponjika?.moonset}</span>
                      </div>
                      <span className="text-2xl font-black tracking-tighter">{ponjikaData.moonset}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-16 p-8 rounded-[2.5rem] bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3 mb-4 text-brand-400">
                    <Info size={18} />
                    <h4 className="font-black uppercase text-[10px] tracking-[0.3em]">{t.ponjika?.method}</h4>
                  </div>
                  <p className="text-zinc-400 text-xs leading-relaxed font-medium">
                    {language === 'bn' 
                      ? 'সূর্য সিদ্ধান্ত ও বিশুদ্ধ সিদ্ধান্ত পঞ্জিকার সমন্বয়ে প্রস্তুত।' 
                      : 'Prepared using a combination of Surya Siddhanta and Bishuddha Siddhanta.'}
                  </p>
                </div>
              </TiltCard>
            </ScrollSlideSection>

            {/* Monthly Highlights - Bento Grid Item */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-4"
            >
              <TiltCard 
                className="bg-white rounded-[3.5rem] p-12 border-2 border-zinc-100 h-full relative overflow-hidden group"
                glowColor="rgba(99,102,241,0.12)"
                intensity={1.1}
              >
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:rotate-12 transition-transform">
                  <Calendar size={120} />
                </div>
                <h3 className="text-xl font-black text-zinc-900 mb-10 flex items-center gap-4">
                  <Calendar className="text-brand-500" />
                  {t.ponjika?.monthlyHighlights}
                </h3>
                <div className="space-y-6">
                  {ponjikaData.monthlyHighlights.map((item) => (
                    <div key={item.id || item.date} className="flex flex-col p-4 rounded-2xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100 group/highlight">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-black text-zinc-400 group-hover/highlight:text-brand-500 transition-colors">{item.date}</span>
                        <span className="text-base font-bold text-zinc-800">{item.event}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </TiltCard>
            </motion.div>

            {/* Auspicious Times - Bento Grid Item */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-8"
            >
              <TiltCard 
                className="bg-emerald-50 rounded-[4rem] p-12 md:p-16 border-2 border-emerald-100 relative overflow-hidden group h-full"
                glowColor="rgba(16,185,129,0.15)"
                intensity={0.9}
              >
                <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform">
                  <Sparkles size={150} className="text-emerald-600" />
                </div>
                <h3 className="text-2xl font-black text-emerald-900 mb-12 flex items-center gap-4">
                  <Clock className="text-emerald-600" />
                  {t.ponjika?.auspicious}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-10">
                    <div className="group/time">
                      <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.4em] mb-3">{t.ponjika?.brahmaMuhurta}</p>
                      <p className="text-2xl font-black text-emerald-900">{ponjikaData.brahmaMuhurta}</p>
                    </div>
                    <div className="group/time">
                      <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.4em] mb-3">{t.ponjika?.abhijitMuhurta}</p>
                      <p className="text-2xl font-black text-emerald-900">{ponjikaData.abhijitMuhurta}</p>
                    </div>
                  </div>
                  <div className="space-y-10">
                    <div className="group/time">
                      <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.4em] mb-3">{t.ponjika?.amritaYoga}</p>
                      <p className="text-2xl font-black text-emerald-900 leading-tight">{ponjikaData.amritaYoga}</p>
                    </div>
                    <div className="group/time">
                      <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.4em] mb-3">{t.ponjika?.mahendraYoga}</p>
                      <p className="text-2xl font-black text-emerald-900">{ponjikaData.mahendraYoga}</p>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </motion.div>

            {/* Auspicious Marriage Dates & Lagna - Bento Grid Item */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="lg:col-span-12"
            >
              <TiltCard 
                className="bg-gradient-to-br from-rose-50 to-pink-50/50 rounded-[4rem] p-12 md:p-16 border-2 border-rose-100 relative overflow-hidden group"
                glowColor="rgba(244,63,94,0.15)"
                intensity={1.0}
              >
                {/* Traditional Decorative element */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform">
                  <Heart size={200} className="text-rose-500 fill-rose-500" />
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-rose-100/60 pb-8">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                        <Heart className="text-rose-600 fill-rose-600 animate-pulse" size={20} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-[0.4em] text-rose-500">{language === 'bn' ? 'বিবাহ সংযোগ' : 'Matrimonial Conjunctions'}</span>
                    </div>
                    <h3 className="text-3xl font-black text-rose-950">
                      {language === 'bn' ? `${bDate.month} মাসের শুভ বিবাহ দিন ও লগ্ন (২০২৬)` : `Auspicious Marriage Dates & Lagna for ${bDate.monthEn} (2026)`}
                    </h3>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm self-start md:self-auto px-6 py-3 rounded-2.5xl border border-rose-100 shadow-sm">
                    <span className="text-xs font-bold text-rose-700/80 uppercase tracking-wider block mb-0.5">
                      {language === 'bn' ? 'বাংলা মাস' : 'Bengali Month'}
                    </span>
                    <span className="text-lg font-black text-rose-900">
                      {language === 'bn' ? bDate.month : bDate.monthEn}
                    </span>
                  </div>
                </div>

                <p className="text-rose-900/80 font-medium text-lg leading-relaxed mb-10 max-w-3xl">
                  {marriageInfo.message}
                </p>

                {marriageInfo.isAvoided ? (
                  <div className="bg-white/60 rounded-[2.5rem] p-10 border border-rose-100 shadow-inner flex flex-col items-center text-center max-w-2xl mx-auto">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mb-6 font-sans">
                      <Info className="text-amber-600" size={28} />
                    </div>
                    <h4 className="text-xl font-black text-rose-950 mb-4">
                      {language === 'bn' ? 'শুভ বিবাহ বিহিত নয়' : 'No Solemnization Recommended'}
                    </h4>
                    <p className="text-rose-900/70 font-medium leading-relaxed mb-6">
                      {language === 'bn' 
                        ? 'স্মার্ত ও জ্যোতিষশাস্ত্র মতে এই সময়ে সূর্য সঞ্চার, মলমাস বা দেবশয়নের দরুণ বিবাহ ব্রত পালন অপশস্ত।' 
                        : 'According to Hindu Astrological Shastras, marriages are not sanctified during this transit, Malamas, or when deities are at rest.'}
                    </p>
                    <div className="w-full h-px bg-rose-100/60 my-2" />
                    <p className="text-xs font-black text-rose-500 uppercase tracking-widest mt-4">
                      {language === 'bn' ? 'পরবর্তী বিবাহ মরশুম: অগ্রহায়ণ ও মাঘ মাস' : 'Next peak wedding months: Agrahayana & Magha'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {marriageInfo.dates.map((item) => (
                      <TiltCard 
                        key={item.id}
                        className="bg-white rounded-[2.5rem] p-8 border border-rose-100/80 shadow-md shadow-rose-900/5 relative overflow-hidden flex flex-col justify-between group/item"
                        glowColor="rgba(244,63,94,0.08)"
                        intensity={1.1}
                      >
                        <div>
                          {/* Saffron accent line */}
                          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-400 to-amber-400" />
                          
                          <div className="flex items-start justify-between mb-6">
                            <span className="text-rose-500 font-extrabold text-xs uppercase tracking-widest bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100/50">
                              {item.bengaliDateString}
                            </span>
                            <div className="w-8 h-8 rounded-full bg-rose-55 flex items-center justify-center text-rose-500 group-hover/item:scale-110 transition-transform">
                              <Heart size={14} className="fill-rose-500" />
                            </div>
                          </div>

                          <h4 className="text-xl font-black text-zinc-800 mb-2 leading-tight">
                            {item.gregorianDate}
                          </h4>
                          
                          <div className="h-px bg-zinc-100 my-4" />

                          <div className="space-y-4">
                            <div>
                              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                                {language === 'bn' ? 'বিবাহ লগ্ন ও সময়' : 'Auspicious Lagna Time'}
                              </p>
                              <p className="text-base font-bold text-zinc-900 leading-snug">
                                {item.lagnaTime}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-2">
                              <div>
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                                  {language === 'bn' ? 'নক্ষত্র' : 'Nakshatra'}
                                </p>
                                <p className="text-sm font-bold text-rose-700">
                                  {item.nakshatra}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                                  {language === 'bn' ? 'তিথি' : 'Tithi'}
                                </p>
                                <p className="text-sm font-bold text-amber-600">
                                  {item.tithi}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Subtle interactive footer decoration inside card */}
                        <div className="mt-6 pt-4 border-t border-zinc-50 flex items-center justify-between text-[10px] font-black tracking-widest text-emerald-600 uppercase">
                          <span>{language === 'bn' ? '● পরম শুভ যোগ' : '● Superb Yoga'}</span>
                        </div>
                      </TiltCard>
                    ))}
                  </div>
                )}
              </TiltCard>
            </motion.div>

            {/* Zodiac Predictions - Bento Grid Item */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-12 bg-white rounded-[4rem] p-12 md:p-16 border-4 border-zinc-900 shadow-2xl shadow-brand-900/10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                <MapPin size={300} />
              </div>
              <h3 className="text-3xl font-black text-zinc-900 mb-12 flex items-center gap-4">
                <Star className="text-brand-500 animate-spin-slow" />
                {t.ponjika?.horoscope}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {ponjikaData.zodiacPredictions.map((pred, idx) => (
                  <TiltCard 
                    key={idx} 
                    className="p-8 rounded-[2.5rem] bg-zinc-50 border-2 border-zinc-100 hover:border-brand-500 hover:bg-white transition-all group/pred"
                    glowColor="rgba(242,125,38,0.08)"
                    intensity={1.3}
                  >
                    <p className="text-2xl font-black text-brand-600 mb-4 group-hover/pred:scale-110 transition-transform origin-left">{pred.sign}</p>
                    <p className="text-zinc-600 font-medium leading-relaxed">{pred.text}</p>
                  </TiltCard>
                ))}
              </div>
            </motion.div>

            {/* Inauspicious Times - Bento Grid Item */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-12 bg-rose-50 rounded-[4rem] p-12 md:p-16 border-2 border-rose-100 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform">
                <AlertTriangle size={200} className="text-rose-600" />
              </div>
              <h3 className="text-2xl font-black text-rose-900 mb-12 flex items-center gap-4">
                <AlertTriangle className="text-rose-600" />
                {t.ponjika?.inauspicious}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                <div className="group/time">
                  <p className="text-[10px] font-black text-rose-600/60 uppercase tracking-[0.4em] mb-3">Rahu Kaal</p>
                  <p className="text-2xl font-black text-rose-900">{ponjikaData.rahuKaal}</p>
                </div>
                <div className="group/time">
                  <p className="text-[10px] font-black text-rose-600/60 uppercase tracking-[0.4em] mb-3">{t.ponjika?.barabela}</p>
                  <p className="text-2xl font-black text-rose-900">{ponjikaData.barabela}</p>
                </div>
                <div className="group/time">
                  <p className="text-[10px] font-black text-rose-600/60 uppercase tracking-[0.4em] mb-3">{t.ponjika?.kalabela}</p>
                  <p className="text-2xl font-black text-rose-900">{ponjikaData.kalabela}</p>
                </div>
                <div className="group/time">
                  <p className="text-[10px] font-black text-rose-600/60 uppercase tracking-[0.4em] mb-3">{t.ponjika?.kalratri}</p>
                  <p className="text-2xl font-black text-rose-900">{ponjikaData.kalratri}</p>
                </div>
              </div>
            </motion.div>

          </div>
        )}

        {/* Traditional Footer Motif */}
        <div className="mt-48 flex flex-col items-center opacity-30">
          <div className="flex gap-6 mb-6">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="w-10 h-10 rounded-full border-4 border-brand-500 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
          <p className="text-zinc-400 font-black uppercase tracking-[0.8em] text-xs">Barnia Digital Ponjika</p>
          <p className="text-zinc-300 font-bold text-[10px] mt-4">© 2026 Barnia Digital Hub. All Rights Reserved.</p>
        </div>

        {/* Hidden SEO Section for Google Indexing */}
        <div className="sr-only" aria-hidden="true">
          <h2>Daily Bengali Ponjika and Calendar - Nadia, West Bengal</h2>
          <p>
            Stay updated with the daily Bengali Ponjika, almanac, and calendar for Barnia and Nadia. 
            Get accurate information on Tithi, Nakshatra, Yoga, Karana, and auspicious timings for today.
          </p>
          <ul>
            <li>Bengali Calendar Today Nadia</li>
            <li>Daily Bengali Almanac Barnia</li>
            <li>Auspicious Timings Today West Bengal</li>
            <li>Bengali Festival Calendar 2026</li>
            <li>Tithi and Nakshatra Today Bengali</li>
          </ul>
        </div>
      </div>

      {/* Custom Styles for Print */}
      <style>{`
        @media print {
          .no-print, button, .banner-container { display: none !important; }
          body { background: white !important; }
          .max-w-7xl { max-width: 100% !important; margin: 0 !important; padding: 20px !important; }
          .grid { display: block !important; }
          .lg\\:col-span-8, .lg\\:col-span-4, .lg\\:col-span-6, .lg\\:col-span-12 { width: 100% !important; margin-bottom: 20px !important; }
          .rounded-[4rem], .rounded-[3.5rem] { border-radius: 20px !important; }
          .shadow-2xl, .shadow-xl { shadow: none !important; }
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

