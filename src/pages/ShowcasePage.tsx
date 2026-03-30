import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Users, Instagram, Facebook, Play, X, Heart, MessageCircle, Share2, ExternalLink } from 'lucide-react';
import { ShopDemo } from '../components/Showcase/ShopDemo';
import { InfluencerDemo } from '../components/Showcase/InfluencerDemo';

export const ShowcasePage = () => {
  const [activeDemo, setActiveDemo] = useState<'shop' | 'influencer' | null>(null);

  return (
    <div className="min-h-screen bg-luxury-cream pt-20 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <span className="text-luxury-gold font-mono text-sm tracking-[0.3em] uppercase mb-4 block">
            The Future of Digital Presence
          </span>
          <h1 className="text-6xl md:text-8xl font-serif mb-6 leading-tight">
            Elevate Your <br />
            <span className="italic">Digital Identity</span>
          </h1>
          <p className="text-zinc-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Experience our high-end demo modules designed for modern shops and digital creators. 
            Immersive, beautiful, and fully integrated.
          </p>
        </motion.div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
          {/* Shop Demo Card */}
          <motion.div 
            whileHover={{ y: -10 }}
            className="group relative h-[600px] rounded-[40px] overflow-hidden cursor-pointer shadow-2xl"
            onClick={() => setActiveDemo('shop')}
          >
            <img 
              src="https://picsum.photos/seed/fashion-shop/1200/1600" 
              alt="Shop Demo" 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-12 left-12 right-12">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-luxury-gold flex items-center justify-center">
                  <ShoppingBag className="text-white" size={24} />
                </div>
                <span className="text-white font-mono text-xs tracking-widest uppercase">Model Shop Module</span>
              </div>
              <h2 className="text-4xl text-white font-serif mb-4">The Curated Boutique</h2>
              <p className="text-zinc-300 text-sm max-w-sm mb-6">
                Showcase your products with cinematic video previews and high-resolution imagery.
              </p>
              <button className="px-8 py-3 bg-white text-luxury-black rounded-full font-bold text-sm hover:bg-luxury-gold hover:text-white transition-all">
                Launch Demo
              </button>
            </div>
          </motion.div>

          {/* Influencer Demo Card */}
          <motion.div 
            whileHover={{ y: -10 }}
            className="group relative h-[600px] rounded-[40px] overflow-hidden cursor-pointer shadow-2xl"
            onClick={() => setActiveDemo('influencer')}
          >
            <img 
              src="https://picsum.photos/seed/influencer-demo/1200/1600" 
              alt="Influencer Demo" 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-12 left-12 right-12">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-luxury-gold flex items-center justify-center">
                  <Users className="text-white" size={24} />
                </div>
                <span className="text-white font-mono text-xs tracking-widest uppercase">Influencer Module</span>
              </div>
              <h2 className="text-4xl text-white font-serif mb-4">The Creator Hub</h2>
              <p className="text-zinc-300 text-sm max-w-sm mb-6">
                A seamless integration of your social life and professional portfolio.
              </p>
              <button className="px-8 py-3 bg-white text-luxury-black rounded-full font-bold text-sm hover:bg-luxury-gold hover:text-white transition-all">
                Launch Demo
              </button>
            </div>
          </motion.div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="p-8 rounded-3xl bg-white border border-zinc-100">
            <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center mb-6">
              <Instagram className="text-luxury-gold" size={24} />
            </div>
            <h3 className="text-xl font-serif mb-4">Social Sync</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Directly import your latest content from Facebook and Instagram to keep your profile fresh and engaging.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-white border border-zinc-100">
            <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center mb-6">
              <Play className="text-luxury-gold" size={24} />
            </div>
            <h3 className="text-xl font-serif mb-4">Cinematic Video</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Full-screen video backgrounds and product reels that capture attention and drive conversions.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-white border border-zinc-100">
            <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center mb-6">
              <ExternalLink className="text-luxury-gold" size={24} />
            </div>
            <h3 className="text-xl font-serif mb-4">One-Click Shop</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Integrated shopping experience that allows your followers to purchase directly from your showcase.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeDemo === 'shop' && (
          <ShopDemo onClose={() => setActiveDemo(null)} />
        )}
        {activeDemo === 'influencer' && (
          <InfluencerDemo onClose={() => setActiveDemo(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};
