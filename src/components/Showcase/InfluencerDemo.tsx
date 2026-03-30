import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Instagram, Facebook, Play, Heart, MessageCircle, Share2, ExternalLink, Users, Grid, Video, Music, Plus, CheckCircle } from 'lucide-react';

interface Post {
  id: string;
  type: 'image' | 'video';
  url: string;
  likes: string;
  comments: string;
  caption: string;
}

const POSTS: Post[] = [
  { id: '1', type: 'image', url: 'https://picsum.photos/seed/post1/800/1000', likes: '12.4K', comments: '450', caption: 'Golden hour in the city. #lifestyle #fashion' },
  { id: '2', type: 'video', url: 'https://picsum.photos/seed/post2/800/1000', likes: '45.2K', comments: '1.2K', caption: 'Behind the scenes at the latest shoot. #bts #model' },
  { id: '3', type: 'image', url: 'https://picsum.photos/seed/post3/800/1000', likes: '8.9K', comments: '210', caption: 'Morning routine. #morning #vibe' },
  { id: '4', type: 'image', url: 'https://picsum.photos/seed/post4/800/1000', likes: '15.6K', comments: '670', caption: 'New collection drops tomorrow! #fashion #style' },
  { id: '5', type: 'video', url: 'https://picsum.photos/seed/post5/800/1000', likes: '32.1K', comments: '890', caption: 'Travel diary: Paris. #travel #paris' },
  { id: '6', type: 'image', url: 'https://picsum.photos/seed/post6/800/1000', likes: '11.2K', comments: '340', caption: 'Weekend vibes. #weekend #relax' },
];

export const InfluencerDemo = ({ onClose }: { onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'videos' | 'reels'>('posts');
  const [showSocialConnect, setShowSocialConnect] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost') && !event.origin.includes('barnia.in')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const platform = event.data.provider;
        if (!connectedPlatforms.includes(platform)) {
          setConnectedPlatforms(prev => [...prev, platform]);
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        console.error('OAuth Error:', event.data.error);
        alert(`Failed to connect ${event.data.provider}: ${event.data.error}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [connectedPlatforms]);

  const handleConnect = async (platform: string) => {
    if (platform === 'facebook') {
      try {
        const response = await fetch('/api/auth/facebook/url');
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to get auth URL');
        }
        const { url } = await response.json();
        
        window.open(url, 'facebook_oauth', 'width=600,height=700');
      } catch (error) {
        console.error('Error connecting to Facebook:', error);
        alert(error instanceof Error ? error.message : 'Failed to connect to Facebook. Please check if FACEBOOK_CLIENT_ID is configured.');
      }
    } else {
      // Demo logic for other platforms
      if (!connectedPlatforms.includes(platform)) {
        setConnectedPlatforms([...connectedPlatforms, platform]);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-luxury-cream overflow-y-auto"
    >
      <div className="min-h-screen">
        {/* Profile Header */}
        <div className="relative h-[400px] md:h-[500px]">
          <img 
            src="https://picsum.photos/seed/cover/1920/600" 
            alt="Cover" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-luxury-cream via-transparent to-transparent" />
          
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-all z-50"
          >
            <X size={24} />
          </button>

          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="w-40 h-40 rounded-full border-4 border-white overflow-hidden shadow-2xl mb-6">
              <img 
                src="https://picsum.photos/seed/avatar/400/400" 
                alt="Avatar" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-center">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-3xl font-serif">Elena Vance</h2>
                <CheckCircle size={20} className="text-luxury-gold fill-luxury-gold text-white" />
              </div>
              <p className="text-zinc-500 font-mono text-xs tracking-widest uppercase">@elenavance • Digital Creator</p>
            </div>
          </div>
        </div>

        {/* Stats & Bio */}
        <div className="max-w-4xl mx-auto pt-32 pb-12 px-6 text-center">
          <div className="flex justify-center gap-12 mb-12">
            <div>
              <p className="text-2xl font-serif mb-1">840K</p>
              <p className="text-zinc-500 text-[10px] font-mono tracking-widest uppercase">Followers</p>
            </div>
            <div>
              <p className="text-2xl font-serif mb-1">1.2M</p>
              <p className="text-zinc-500 text-[10px] font-mono tracking-widest uppercase">Likes</p>
            </div>
            <div>
              <p className="text-2xl font-serif mb-1">124</p>
              <p className="text-zinc-500 text-[10px] font-mono tracking-widest uppercase">Collaborations</p>
            </div>
          </div>
          <p className="text-zinc-600 leading-relaxed max-w-2xl mx-auto mb-10">
            Fashion model and digital storyteller based in Milan. Exploring the intersection of high-end aesthetic and sustainable living. 
            Welcome to my curated world of style and inspiration.
          </p>
          <div className="flex justify-center gap-4">
            <button className="px-8 py-3 bg-luxury-black text-white rounded-full font-bold text-sm hover:bg-luxury-gold transition-all">
              Follow Me
            </button>
            <button className="px-8 py-3 border border-zinc-200 rounded-full font-bold text-sm hover:bg-zinc-50 transition-all">
              Collaborate
            </button>
          </div>
        </div>

        {/* Social Integration Demo Section */}
        <div className="max-w-6xl mx-auto mb-20 px-6">
          <div className="p-10 rounded-[40px] bg-white border border-zinc-100 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-luxury-gold/5 blur-[100px] rounded-full" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">
                    <Share2 className="text-luxury-gold" size={20} />
                  </div>
                  <span className="text-luxury-gold font-mono text-[10px] tracking-widest uppercase">Social Sync Demo</span>
                </div>
                <h3 className="text-3xl font-serif mb-4">Import Your World</h3>
                <p className="text-zinc-500 text-sm leading-relaxed mb-8">
                  This demo shows how influencers can beautifully display their content directly from Facebook and Instagram. 
                  Connect your accounts to see the magic happen.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => handleConnect('facebook')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs transition-all ${
                      connectedPlatforms.includes('facebook') 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <Facebook size={16} />
                    {connectedPlatforms.includes('facebook') ? 'Facebook Connected' : 'Connect Facebook'}
                  </button>
                  <button 
                    onClick={() => handleConnect('instagram')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs transition-all ${
                      connectedPlatforms.includes('instagram') 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <Instagram size={16} />
                    {connectedPlatforms.includes('instagram') ? 'Instagram Connected' : 'Connect Instagram'}
                  </button>
                </div>
              </div>
              <div className="relative w-full md:w-1/2 aspect-video rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="https://picsum.photos/seed/social-demo/800/450" 
                  alt="Social Demo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-luxury-black/40 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                    <Play size={24} fill="white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="max-w-6xl mx-auto px-6 mb-24">
          <div className="flex justify-center gap-12 border-b border-zinc-100 mb-12">
            {[
              { id: 'posts', icon: Grid, label: 'Posts' },
              { id: 'videos', icon: Video, label: 'Videos' },
              { id: 'reels', icon: Music, label: 'Reels' },
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-6 text-xs font-mono tracking-widest uppercase transition-all relative ${
                  activeTab === tab.id ? 'text-luxury-black' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-luxury-gold"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {POSTS.map((post) => (
              <motion.div 
                key={post.id}
                whileHover={{ y: -10 }}
                className="group relative aspect-[4/5] rounded-[32px] overflow-hidden cursor-pointer shadow-lg"
              >
                <img 
                  src={post.url} 
                  alt={post.caption} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                {post.type === 'video' && (
                  <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                    <Play size={18} fill="white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-luxury-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500">
                  <div className="absolute bottom-8 left-8 right-8">
                    <p className="text-white text-sm mb-4 line-clamp-2">{post.caption}</p>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-white">
                        <Heart size={18} className="fill-white" />
                        <span className="text-xs font-bold">{post.likes}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white">
                        <MessageCircle size={18} />
                        <span className="text-xs font-bold">{post.comments}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
