import React, { useState } from 'react';
import { Banner } from './components/Banner';
import { BarniaBazar } from './components/BarniaBazar';
import { InfluencerSection } from './components/InfluencerSection';
import { CollaborationTools } from './components/CollaborationTools';
import { LiveNews } from './components/LiveNews';
import { WhyJoin } from './components/WhyJoin';
import { VisitorCounter } from './components/VisitorCounter';
import { LiveChatWidget } from './components/LiveChatWidget';
import { AuthModal } from './components/AuthModal';
import { useLanguage } from './LanguageContext';
import { useFirebase } from './FirebaseContext';
import { MapPin, Mail, Phone, Facebook, Instagram, Languages, LogIn, User as UserIcon, LogOut } from 'lucide-react';

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut, isAuthModalOpen, setAuthModalOpen } = useFirebase();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-brand-100 selection:text-brand-900 relative overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-200/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-300/10 blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-zinc-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center shadow-[0_8px_20px_rgba(245,142,39,0.3)] border border-white/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <span className="text-white font-black text-2xl tracking-tighter">UB</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-xl leading-none bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-600">Ujirpur Barnia</span>
              <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mt-1">Digital Hub</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-8">
            <div className="hidden lg:flex items-center gap-10 text-[13px] font-bold text-zinc-500 uppercase tracking-widest">
              {[
                { href: '#news', label: t.nav.news },
                { href: '#bazar', label: t.nav.bazar },
                { href: '#influencers', label: t.nav.influencers },
                { href: '#collab', label: t.nav.collab }
              ].map((link) => (
                <a 
                  key={link.href}
                  href={link.href} 
                  className="hover:text-brand-600 transition-all relative group py-2"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-600 transition-all duration-300 group-hover:w-full"></span>
                </a>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-100/80 hover:bg-white hover:shadow-md transition-all text-xs font-bold text-zinc-700 border border-transparent hover:border-zinc-200"
              >
                <Languages size={14} className="text-brand-600" />
                <span>{language === 'bn' ? 'English' : 'বাংলা'}</span>
              </button>

              {user ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2.5 p-1.5 pr-4 rounded-2xl bg-white border border-zinc-200 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/5 transition-all"
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
                  {language === 'bn' ? 'লগইন' : 'Login'}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <Banner />
        <LiveNews />
        <WhyJoin />
        
        <div id="bazar" className="scroll-mt-20">
          <BarniaBazar />
        </div>

        <div id="influencers" className="scroll-mt-20">
          <InfluencerSection />
        </div>

        <div id="collab" className="scroll-mt-20">
          <CollaborationTools />
        </div>
      </main>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
      <LiveChatWidget />

      {/* Footer */}
      <footer className="bg-zinc-950 text-white pt-24 pb-12 px-6 relative overflow-hidden">
        {/* Footer Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
            <div className="md:col-span-5">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center shadow-lg border border-white/10">
                  <span className="text-white font-black text-2xl tracking-tighter">UB</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold tracking-tight text-xl leading-none">Ujirpur Barnia</span>
                  <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] mt-1">Digital Hub</span>
                </div>
              </div>
              <p className="text-zinc-400 max-w-md leading-relaxed text-sm font-medium">
                {t.footer.about}
              </p>
              <div className="flex gap-4 mt-10">
                <a href="https://www.facebook.com/share/r/1HbN6N3EBa/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center hover:bg-[#1877F2] hover:scale-110 hover:-rotate-6 transition-all duration-300 group">
                  <Facebook size={22} className="text-zinc-400 group-hover:text-white transition-colors" />
                </a>
                <a href="https://www.instagram.com/ujirpur_barnia_nadia?igsh=Z2tqc3RvNTc1aHV5" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center hover:bg-gradient-to-tr hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7] hover:scale-110 hover:rotate-6 transition-all duration-300 group">
                  <Instagram size={22} className="text-zinc-400 group-hover:text-white transition-colors" />
                </a>
              </div>
            </div>
            
            <div className="md:col-span-3">
              <h4 className="font-black mb-8 uppercase text-[11px] tracking-[0.2em] text-brand-500">{t.footer.contact}</h4>
              <ul className="space-y-6 text-sm">
                <li className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:border-brand-500/50 transition-colors">
                    <MapPin size={18} className="text-brand-500" />
                  </div>
                  <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors pt-1">Ujirpur Barnia, Nadia, WB, India</span>
                </li>
                <li className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:border-brand-500/50 transition-colors">
                    <Mail size={18} className="text-brand-500" />
                  </div>
                  <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors pt-1">ujirpur.barnia6@gmail.com</span>
                </li>
                <li className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:border-brand-500/50 transition-colors">
                    <Phone size={18} className="text-brand-500" />
                  </div>
                  <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors pt-1">+91 12345 67890</span>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4">
              <h4 className="font-black mb-8 uppercase text-[11px] tracking-[0.2em] text-brand-500">{t.footer.links}</h4>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { href: '#news', label: t.nav.news },
                  { href: '#bazar', label: t.nav.bazar },
                  { href: '#influencers', label: t.nav.influencers },
                  { href: '#collab', label: t.nav.collab }
                ].map((link) => (
                  <a 
                    key={link.href}
                    href={link.href} 
                    className="text-sm text-zinc-400 hover:text-brand-500 transition-all flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 group-hover:bg-brand-500 transition-colors" />
                    {link.label}
                  </a>
                ))}
              </div>
              
              <div className="mt-12 p-6 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/5">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">{t.footer.visitorCount}</p>
                <VisitorCounter />
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest">
              © {new Date().getFullYear()} Ujirpur Barnia Nadia. {t.footer.rights}
            </div>
            <div className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
