import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { InfluencerPage } from './pages/InfluencerPage';
import { SanataniFactCheckPage } from './pages/SanataniFactCheckPage';
import { BarniaBazarPage } from './pages/BarniaBazarPage';
import { VillageTransportPage } from './pages/VillageTransportPage';
import { PonjikaPage } from './pages/PonjikaPage';
import { ProfilePage } from './pages/ProfilePage';
import { ShopProfilePage } from './pages/ShopProfilePage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { AdminAnalytics } from './pages/AdminAnalytics';
import { AdminUserManagement } from './pages/AdminUserManagement';
import { VamshavaliPage } from './pages/VamshavaliPage';
import { AiRouterPage } from './pages/AiRouterPage';
import { AuthModal } from './components/AuthModal';
import { LiveChatWidget } from './components/LiveChatWidget';
import { VisitorCounter } from './components/VisitorCounter';
import { InstallPrompt } from './components/InstallPrompt';
import { useLanguage } from './LanguageContext';
import { useFirebase } from './FirebaseContext';
import { MapPin, Mail, Phone, Facebook, Instagram, Languages, LogIn, User as UserIcon, LogOut, Menu, X, Calendar, Activity, Car, Users } from 'lucide-react';

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

import { Toaster } from 'sonner';
import { TrackingProvider, useTracking } from './TrackingContext';
import { RideProvider, useRide } from './RideContext';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { InteractiveScrollEffects } from './components/InteractiveScrollEffects';
import { FlyingLettersScrollEffect } from './components/FlyingLettersScrollEffect';

const GlobalBookingAlert = () => {
  const { activeIncomingRequest, acceptRide, declineRide } = useRide();
  const { language, t } = useLanguage();

  useEffect(() => {
    if (activeIncomingRequest) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1357/1357-preview.mp3');
      audio.loop = true;
      audio.play().catch(e => console.log('Audio play blocked'));
      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [activeIncomingRequest]);

  if (!activeIncomingRequest) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-brand-600/90 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl text-center space-y-8 border-4 border-white"
      >
        <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <Car size={48} className="text-brand-600" />
        </div>
        
        <div>
          <h2 className="text-3xl font-black text-zinc-900 uppercase tracking-tight mb-2">
            {t.transport.newBooking}
          </h2>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
            {t.transport.incomingRideRequest}
          </p>
        </div>

        <div className="space-y-6 text-left bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <div className="w-2 h-2 rounded-full bg-current" />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t.transport.from}</p>
              <p className="font-bold text-zinc-900 line-clamp-2">{activeIncomingRequest.from}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <MapPin size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t.transport.to}</p>
              <p className="font-bold text-zinc-900 line-clamp-2">{activeIncomingRequest.to}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-200 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estimated Fare</p>
              <p className="text-2xl font-black text-emerald-600">₹{activeIncomingRequest.fare}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Rider</p>
              <p className="font-bold text-zinc-900">{activeIncomingRequest.riderName}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => declineRide(activeIncomingRequest.id)}
            className="py-5 bg-zinc-100 text-zinc-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-200 transition-all"
          >
            {language === 'bn' ? 'বাতিল' : 'Decline'}
          </button>
          <button
            onClick={() => acceptRide(activeIncomingRequest.id)}
            className="py-5 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
          >
            {language === 'bn' ? 'গ্রহণ করুন' : 'Accept'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

function AppContent() {
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut, isAuthModalOpen, setAuthModalOpen, isAdmin } = useFirebase();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isVamshavali = location.pathname.startsWith('/vamshavali');

  return (
    <div className="min-h-screen bg-culture-bg font-sans text-zinc-900 selection:bg-brand-100 selection:text-brand-900 relative overflow-x-hidden scroll-snap-container">
      <ScrollToTop />
      <InteractiveScrollEffects />
      {/* Background Decorative Elements with Glowing Platinum Saffron Theme */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Deep Glowing Saffron Centerpieces */}
        <div className="absolute top-[-5%] left-[-5%] w-[60%] h-[60%] bg-[#F58E27]/20 blur-[140px] rounded-full animate-saffron-pulse" />
        <div className="absolute top-[30%] right-[-10%] w-[50%] h-[50%] bg-[#E05608]/15 blur-[150px] rounded-full animate-saffron-pulse-delayed" />
        <div className="absolute bottom-[-10%] left-[10%] w-[55%] h-[55%] bg-[#FFA43A]/20 blur-[165px] rounded-full animate-saffron-pulse" />
        
        {/* Shimmering Premium Platinum-Silver Layers */}
        <div className="absolute top-[15%] right-[20%] w-[40%] h-[40%] bg-slate-100/35 blur-[130px] rounded-full animate-platinum-pulse" />
        <div className="absolute bottom-[20%] right-[-5%] w-[45%] h-[45%] bg-slate-200/25 blur-[140px] rounded-full animate-platinum-pulse-delayed" />
        <div className="absolute top-[50%] left-[-10%] w-[35%] h-[35%] bg-zinc-100/30 blur-[120px] rounded-full animate-platinum-pulse" />

        {/* Dynamic Overlays for Liquid Gold & Metallic Platinum Finish */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(245,142,39,0.14),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.4),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(250,240,230,0.15),transparent_80%)]" />
        <FlyingLettersScrollEffect />
      </div>

      {/* Navigation */}
      {!isVamshavali && (
        <nav className="sticky top-0 z-50 bg-[#FFF5EC]/45 dark:bg-[#1C0D02]/45 backdrop-blur-3xl border-b border-orange-500/25 shadow-[0_10px_40px_rgba(245,142,39,0.15)]">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 group cursor-pointer" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-[0_8px_20px_rgba(245,142,39,0.4)] border border-orange-400/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <img 
                src="https://i.postimg.cc/McBQ2pVg/barnia-logo-120x120.png" 
                alt="Barnia Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-xl leading-none bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 via-brand-900 to-zinc-900">Barnia</span>
              <span className="text-[10px] font-black text-brand-700 uppercase tracking-[0.2em] mt-1">Digital Hub</span>
            </div>
          </Link>
          
          <div className="flex items-center gap-4 md:gap-8">
            <div className="hidden lg:flex items-center gap-10 text-[13px] font-bold text-zinc-500 uppercase tracking-widest">
                {[
                  { to: '/', label: t.nav.news, sectionId: 'news' },
                  { to: '/bazar', label: t.nav.bazar },
                  { to: '/transport', label: t.nav.transport },
                  { to: '/vamshavali', label: t.nav.vamshavali },
                  { to: '/influencers', label: t.nav.influencers },
                  { to: '/fact-check', label: t.nav.factCheck },
                  { to: '/ai-router', label: t.nav.aiRouter },
                  { to: '/ponjika', label: t.nav.ponjika, isPonjika: true },
                ].map((link) => (
                  <Link 
                    key={link.to}
                    to={link.to} 
                    onClick={(e) => {
                      if (location.pathname === link.to && link.sectionId) {
                        e.preventDefault();
                        const element = document.getElementById(link.sectionId);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth' });
                        }
                      }
                    }}
                    className={`hover:text-brand-600 transition-all relative group py-2 flex items-center gap-2 ${location.pathname === link.to ? 'text-brand-600' : ''}`}
                  >
                  {link.isPonjika && (
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 border border-brand-500/30 rounded-full animate-spin-slow scale-150" style={{ borderStyle: 'dashed' }} />
                      <Swastika size={14} className="text-brand-600" />
                    </div>
                  )}
                  {link.label}
                  <span className={`absolute bottom-0 left-0 h-0.5 bg-brand-600 transition-all duration-300 ${location.pathname === link.to ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                </Link>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-2xl bg-white/45 backdrop-blur-md hover:bg-white hover:shadow-lg transition-all text-xs font-bold text-zinc-900 border border-orange-400/20"
              >
                <Languages size={14} className="text-[#FF5E00]" />
                <div className="flex items-center gap-1">
                  <span className={language === 'en' ? 'text-[#FF5E00] font-black' : 'text-zinc-500'}>EN</span>
                  <span className="text-zinc-400">/</span>
                  <span className={language === 'bn' ? 'text-[#FF5E00] font-black' : 'text-zinc-500'}>BN</span>
                </div>
              </button>

              {user ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2.5 p-1.5 pr-4 rounded-2xl bg-white/45 backdrop-blur-md border border-orange-400/25 hover:border-brand-500 hover:shadow-lg hover:bg-white transition-all animate-slow-pulse"
                  >
                    <div className="relative">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt="" 
                          className="w-8 h-8 rounded-xl object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center text-white shadow-inner">
                          <UserIcon size={16} />
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    <span className="text-xs font-bold hidden sm:block max-w-[100px] truncate text-zinc-700">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 mt-3 w-56 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-100 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-zinc-50 mb-1 bg-zinc-50/50">
                        <p className="text-xs font-bold text-zinc-900 truncate">{user.displayName || 'User'}</p>
                        <p className="text-[10px] text-zinc-500 truncate font-medium">{user.email}</p>
                      </div>
                      {isAdmin && (
                        <>
                          <Link 
                            to="/admin/analytics"
                            onClick={() => setShowUserMenu(false)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors"
                          >
                            <Activity size={16} className="text-brand-600" />
                            Analytics
                          </Link>
                          <Link 
                            to="/admin/users"
                            onClick={() => setShowUserMenu(false)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors"
                          >
                            <Users size={16} className="text-brand-600" />
                            Manage Users
                          </Link>
                        </>
                      )}
                      <button 
                        onClick={() => {
                          signOut();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} />
                        {language === 'bn' ? 'লগআউট' : 'Sign Out'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 transition-all text-xs font-bold text-white shadow-[0_8px_20px_rgba(245,142,39,0.3)] hover:shadow-[0_12px_25px_rgba(245,142,39,0.4)] active:scale-95"
                >
                  <LogIn size={14} />
                  <span className="hidden sm:inline">{language === 'bn' ? 'লগইন' : 'Login'}</span>
                </button>
              )}

              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2.5 rounded-2xl bg-white/45 text-zinc-800 hover:bg-white hover:shadow-md transition-all border border-orange-400/20"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-gradient-to-b from-[#FFF5EC]/95 to-[#FFE9D3]/95 backdrop-blur-3xl border-b border-orange-500/20 py-6 px-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            {[
              { to: '/', label: t.nav.news, sectionId: 'news' },
              { to: '/bazar', label: t.nav.bazar },
              { to: '/transport', label: t.nav.transport },
              { to: '/vamshavali', label: t.nav.vamshavali },
              { to: '/influencers', label: t.nav.influencers },
              { to: '/fact-check', label: t.nav.factCheck },
              { to: '/ai-router', label: t.nav.aiRouter },
              { to: '/ponjika', label: t.nav.ponjika, isPonjika: true },
            ].map((link) => (
              <Link 
                key={link.to}
                to={link.to} 
                onClick={(e) => {
                  if (location.pathname === link.to && link.sectionId) {
                    e.preventDefault();
                    const element = document.getElementById(link.sectionId);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth' });
                    }
                  }
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                  location.pathname === link.to ? 'bg-brand-50 text-brand-600' : 'text-zinc-500 hover:bg-zinc-50'
                }`}
              >
                {link.isPonjika && (
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center relative">
                    <div className="absolute inset-0 border border-brand-500/30 rounded-full animate-spin-slow" style={{ borderStyle: 'dashed' }} />
                    <Swastika size={14} className="text-brand-600" />
                  </div>
                )}
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
      )}

      <main className="relative z-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/influencers" element={<InfluencerPage />} />
          <Route path="/fact-check" element={<SanataniFactCheckPage />} />
          <Route path="/bazar" element={<BarniaBazarPage />} />
          <Route path="/transport" element={<VillageTransportPage />} />
          <Route path="/profile/:slug" element={<ProfilePage />} />
          <Route path="/shop/:slug" element={<ShopProfilePage />} />
          <Route path="/ponjika" element={<PonjikaPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/users" element={<AdminUserManagement />} />
          {/* Deep linking for news handled within components or via routes if needed */}
          <Route path="/news/:date/:tab/:index" element={<Home />} />
          <Route path="/vamshavali" element={<VamshavaliPage />} />
          <Route path="/vamshavali/v/:shareId" element={<VamshavaliPage isPublic />} />
          <Route path="/ai-router" element={<AiRouterPage />} />
        </Routes>
      </main>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
      {!isVamshavali && <LiveChatWidget />}
      <InstallPrompt />
      <GlobalBookingAlert />
      <Toaster position="top-center" richColors />

      {/* Footer */}
      {!isVamshavali && (
        <footer className="bg-gradient-to-b from-orange-950/40 via-zinc-950/90 to-black backdrop-blur-xl border-t border-orange-500/20 text-white pt-24 pb-12 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #FFA000 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
            <div className="md:col-span-5">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg border border-orange-400/20">
                  <img 
                    src="https://i.postimg.cc/McBQ2pVg/barnia-logo-120x120.png" 
                    alt="Barnia Logo" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold tracking-tight text-xl leading-none bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-200">Barnia</span>
                  <span className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] mt-1">Digital Hub</span>
                </div>
              </div>
              <p className="text-zinc-300 max-w-md leading-relaxed text-sm font-medium">
                {t.footer.about}
              </p>
              <div className="flex gap-4 mt-10">
                <a href="https://www.facebook.com/share/r/1HbN6N3EBa/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 hover:bg-[#1877F2]/80 border border-white/10 rounded-2xl flex items-center justify-center hover:scale-110 hover:-rotate-6 transition-all duration-300 group">
                  <Facebook size={22} className="text-zinc-300 group-hover:text-white transition-colors" />
                </a>
                <a href="https://www.instagram.com/ujirpur_barnia_nadia?igsh=Z2tqc3RvNTc1aHV5" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 hover:bg-gradient-to-tr hover:from-[#f9ce34]/80 hover:via-[#ee2a7b]/80 hover:to-[#6228d7]/80 border border-white/10 rounded-2xl flex items-center justify-center hover:scale-110 hover:rotate-6 transition-all duration-300 group">
                  <Instagram size={22} className="text-zinc-300 group-hover:text-white transition-colors" />
                </a>
              </div>
            </div>
            
            <div className="md:col-span-3">
              <h4 className="font-black mb-8 uppercase text-[11px] tracking-[0.2em] text-brand-400">{t.footer.contact}</h4>
              <ul className="space-y-6 text-sm">
                <li className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center group-hover:border-brand-400/55 transition-colors">
                    <MapPin size={18} className="text-brand-400" />
                  </div>
                  <span className="text-zinc-300 group-hover:text-zinc-100 transition-colors pt-1">Vill + PO - Barnia, PS - Pallashi Para, Dist - Nadia, State - West Bengal, Pin - 741156</span>
                </li>
                <li className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center group-hover:border-brand-400/55 transition-colors">
                    <Mail size={18} className="text-[#FFA000]" />
                  </div>
                  <span className="text-zinc-300 group-hover:text-zinc-100 transition-colors pt-1">info@barnia.in</span>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4">
              <h4 className="font-black mb-8 uppercase text-[11px] tracking-[0.2em] text-brand-400">{t.footer.links}</h4>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { to: '/', label: t.nav.news },
                  { to: '/bazar', label: t.nav.bazar },
                  { to: '/transport', label: t.nav.transport },
                  { to: '/vamshavali', label: t.nav.vamshavali },
                  { to: '/influencers', label: t.nav.influencers },
                  { to: '/fact-check', label: t.nav.factCheck },
                  { to: '/ai-router', label: t.nav.aiRouter },
                  { to: '/ponjika', label: t.nav.ponjika },
                ].map((link) => (
                  <Link 
                    key={link.to}
                    to={link.to} 
                    className="text-sm text-zinc-300 hover:text-brand-400 transition-all flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-brand-400 transition-colors" />
                    {link.label}
                  </Link>
                ))}
              </div>
              
              <div className="mt-12 p-6 rounded-3xl bg-gradient-to-br from-white/10 to-transparent border border-white/20 backdrop-blur-md">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">{t.footer.visitorCount}</p>
                <VisitorCounter />
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest">
              © {new Date().getFullYear()} Barnia Nadia. {t.footer.rights}
            </div>
            <div className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <TrackingProvider>
        <RideProvider>
          <AppContent />
        </RideProvider>
      </TrackingProvider>
    </Router>
  );
}
