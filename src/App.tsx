import React from 'react';
import { Banner } from './components/Banner';
import { NewsFeed } from './components/NewsFeed';
import { InfluencerSection } from './components/InfluencerSection';
import { CollaborationTools } from './components/CollaborationTools';
import { MapPin, Mail, Phone, Facebook, Twitter, Instagram } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">U</div>
            <span className="font-bold tracking-tight text-lg hidden sm:block">Ujirpur Barnia Nadia</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-zinc-600">
            <a href="#news" className="hover:text-emerald-600 transition-colors">News</a>
            <a href="#influencers" className="hover:text-emerald-600 transition-colors">Influencers</a>
            <a href="#collab" className="hover:text-emerald-600 transition-colors">Collaborate</a>
          </div>
        </div>
      </nav>

      <main>
        <Banner />
        
        <div id="news">
          <NewsFeed />
        </div>

        <div id="influencers">
          <InfluencerSection />
        </div>

        <div id="collab">
          <CollaborationTools />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-zinc-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold mb-6">Ujirpur Barnia Nadia</h3>
            <p className="text-zinc-400 max-w-md leading-relaxed">
              The digital heart of Ujirpur Barnia. We bring you daily local news and provide a platform for creators to connect and build the future of our community.
            </p>
            <div className="flex gap-4 mt-8">
              <a href="#" className="p-2 bg-zinc-800 rounded-lg hover:bg-emerald-600 transition-all"><Facebook size={20} /></a>
              <a href="#" className="p-2 bg-zinc-800 rounded-lg hover:bg-emerald-600 transition-all"><Twitter size={20} /></a>
              <a href="#" className="p-2 bg-zinc-800 rounded-lg hover:bg-emerald-600 transition-all"><Instagram size={20} /></a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-zinc-500">Contact Us</h4>
            <ul className="space-y-4 text-sm text-zinc-400">
              <li className="flex items-center gap-3">
                <MapPin size={18} className="text-emerald-500" />
                Ujirpur Barnia, Nadia, WB, India
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-emerald-500" />
                contact@ujirpurbarnia.in
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-emerald-500" />
                +91 12345 67890
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-zinc-500">Quick Links</h4>
            <ul className="space-y-4 text-sm text-zinc-400">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Community Guidelines</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-zinc-800 text-center text-zinc-500 text-xs">
          © {new Date().getFullYear()} Ujirpur Barnia Nadia. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
