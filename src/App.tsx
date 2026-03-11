import React from 'react';
import { Banner } from './components/Banner';
import { NewsFeed } from './components/NewsFeed';
import { InfluencerSection } from './components/InfluencerSection';
import { CollaborationTools } from './components/CollaborationTools';
import { BarniaBazar } from './components/BarniaBazar';
import { LiveChatWidget } from './components/LiveChatWidget';
import { useLanguage } from './LanguageContext';
import { MapPin, Mail, Phone, Facebook, Instagram, Languages } from 'lucide-react';

export default function App() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="https://picsum.photos/seed/ujirpur-logo/200/200" 
              alt="Logo" 
              className="w-10 h-10 rounded-lg object-cover border-2 border-emerald-600"
              referrerPolicy="no-referrer"
            />
            <span className="font-bold tracking-tight text-lg hidden sm:block">Ujirpur Barnia Nadia</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
              <a href="#news" className="hover:text-emerald-600 transition-colors">{t.nav.news}</a>
              <a href="#bazar" className="hover:text-emerald-600 transition-colors">{t.nav.bazar}</a>
              <a href="#influencers" className="hover:text-emerald-600 transition-colors">{t.nav.influencers}</a>
              <a href="#collab" className="hover:text-emerald-600 transition-colors">{t.nav.collab}</a>
            </div>
            <button 
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors text-xs font-bold"
            >
              <Languages size={14} />
              {language === 'bn' ? 'English' : 'বাংলা'}
            </button>
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
              <a href="https://www.facebook.com/share/r/1HbN6N3EBa/" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-800 rounded-lg hover:bg-emerald-600 transition-all"><Facebook size={20} /></a>
              <a href="https://www.instagram.com/ujirpur_barnia_nadia?igsh=Z2tqc3RvNTc1aHV5" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-800 rounded-lg hover:bg-emerald-600 transition-all"><Instagram size={20} /></a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-zinc-500">{t.footer.contact}</h4>
            <ul className="space-y-4 text-sm text-zinc-400">
              <li className="flex items-center gap-3">
                <MapPin size={18} className="text-emerald-500" />
                Ujirpur Barnia, Nadia, WB, India
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-emerald-500" />
                ujirpur.barnia6@gmail.com
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-emerald-500" />
                +91 12345 67890
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-zinc-500">{t.footer.links}</h4>
            <ul className="space-y-4 text-sm text-zinc-400">
              <li><a href="#" className="hover:text-white transition-colors">{t.nav.news}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t.nav.bazar}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t.nav.influencers}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t.nav.collab}</a></li>
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
