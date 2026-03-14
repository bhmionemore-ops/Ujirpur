import React, { useState } from 'react';
import { Banner } from './components/Banner';
import { NewsFeed } from './components/NewsFeed';
import { BarniaBazar } from './components/BarniaBazar';
import { InfluencerSection } from './components/InfluencerSection';
import { CollaborationTools } from './components/CollaborationTools';
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
    <div className="min-h-screen bg-[#FFF9F0] font-sans text-zinc-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#FFF9F0]/80 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="https://picsum.photos/seed/ujirpur-logo/200/200" 
              alt="Logo" 
              className="w-10 h-10 rounded-lg object-cover border-2 border-orange-600"
              referrerPolicy="no-referrer"
            />
            <span className="font-bold tracking-tight text-lg hidden sm:block">Ujirpur Barnia Nadia</span>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-zinc-600">
              <a href="#bazar" className="hover:text-orange-600 transition-colors">{t.nav.bazar}</a>
              <a href="#news" className="hover:text-orange-600 transition-colors">{t.nav.news}</a>
              <a href="#influencers" className="hover:text-orange-600 transition-colors">{t.nav.influencers}</a>
              <a href="#collab" className="hover:text-orange-600 transition-colors">{t.nav.collab}</a>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 hover:bg-orange-200 transition-colors text-xs font-bold text-orange-800"
              >
                <Languages size={14} />
                <span className="hidden xs:inline">{language === 'bn' ? 'English' : 'বাংলা'}</span>
              </button>

              {user ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1 pr-3 rounded-full bg-white border border-orange-200 hover:border-orange-400 transition-all"
                  >
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="" 
                        className="w-8 h-8 rounded-full" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = "w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-[10px] font-bold";
                            fallback.innerText = user.displayName ? user.displayName[0].toUpperCase() : 'U';
                            parent.prepend(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white">
                        <UserIcon size={16} />
                      </div>
                    )}
                    <span className="text-xs font-bold hidden sm:block max-w-[100px] truncate">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-zinc-100 py-2 z-50 overflow-hidden">
                      <div className="px-4 py-2 border-b border-zinc-50 mb-1">
                        <p className="text-xs font-bold text-zinc-900 truncate">{user.displayName || 'User'}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                      </div>
                      <button 
                        onClick={() => {
                          signOut();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={14} />
                        {language === 'bn' ? 'লগআউট' : 'Sign Out'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-600 hover:bg-orange-700 transition-all text-xs font-bold text-white shadow-lg shadow-orange-600/20"
                >
                  <LogIn size={14} />
                  {language === 'bn' ? 'লগইন' : 'Login'}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main>
        <Banner />
        
        <div id="news">
          <NewsFeed />
        </div>

        <div id="bazar">
          <BarniaBazar />
        </div>

        <div id="influencers">
          <InfluencerSection />
        </div>

        <div id="collab">
          <CollaborationTools />
        </div>
      </main>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
      <LiveChatWidget />

      {/* Footer */}
      <footer className="bg-zinc-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold mb-6">Ujirpur Barnia Nadia</h3>
            <p className="text-zinc-400 max-w-md leading-relaxed">
              {t.footer.about}
            </p>
            <div className="flex gap-4 mt-8">
              <a href="https://www.facebook.com/share/r/1HbN6N3EBa/" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-800 rounded-lg hover:bg-orange-600 transition-all"><Facebook size={20} /></a>
              <a href="https://www.instagram.com/ujirpur_barnia_nadia?igsh=Z2tqc3RvNTc1aHV5" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-800 rounded-lg hover:bg-orange-600 transition-all"><Instagram size={20} /></a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-zinc-500">{t.footer.contact}</h4>
            <ul className="space-y-4 text-sm text-zinc-400">
              <li className="flex items-center gap-3">
                <MapPin size={18} className="text-orange-500" />
                Ujirpur Barnia, Nadia, WB, India
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-orange-500" />
                ujirpur.barnia6@gmail.com
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-orange-500" />
                +91 12345 67890
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-zinc-500">{t.footer.links}</h4>
            <ul className="space-y-4 text-sm text-zinc-400">
              <li><a href="#bazar" className="hover:text-white transition-colors">{t.nav.bazar}</a></li>
              <li><a href="#news" className="hover:text-white transition-colors">{t.nav.news}</a></li>
              <li><a href="#influencers" className="hover:text-white transition-colors">{t.nav.influencers}</a></li>
              <li><a href="#collab" className="hover:text-white transition-colors">{t.nav.collab}</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-zinc-800 text-center text-zinc-500 text-xs">
          © {new Date().getFullYear()} Ujirpur Barnia Nadia. {t.footer.rights}
        </div>
      </footer>
    </div>
  );
}
