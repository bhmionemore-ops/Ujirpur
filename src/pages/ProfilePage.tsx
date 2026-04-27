import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { 
  Instagram, Twitter, Facebook, Youtube, Linkedin, Github, Globe, 
  ChevronLeft, Share2, MessageSquare, Send, CheckCircle, Zap, Edit, Trash2, Plus, X, Save, RefreshCw, Music
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';
import { useFirebase } from '../FirebaseContext';
import { shareContent, slugify } from '../utils';
import { toast } from 'sonner';

interface Influencer {
  id: string;
  slug: string;
  name: string;
  bio: string;
  socials: string[];
  avatar: string;
  cover?: string;
  uid?: string;
  isVerified?: boolean;
  videos?: { title: string; url: string }[];
}

const getSocialIcon = (url: string) => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('instagram.com')) return <Instagram size={24} className="text-[#E4405F]" />;
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return <Twitter size={24} className="text-[#1DA1F2]" />;
  if (lowerUrl.includes('facebook.com')) return <Facebook size={24} className="text-[#1877F2]" />;
  if (lowerUrl.includes('youtube.com')) return <Youtube size={24} className="text-[#FF0000]" />;
  if (lowerUrl.includes('linkedin.com')) return <Linkedin size={24} className="text-[#0077B5]" />;
  if (lowerUrl.includes('github.com')) return <Github size={24} className="text-[#181717]" />;
  if (lowerUrl.includes('tiktok.com')) return <Music size={24} className="text-[#000000]" />;
  return <Globe size={24} className="text-zinc-400" />;
};

const VideoPlayer: React.FC<{ url: string, title: string }> = ({ url, title }) => {
  const getEmbedUrl = (url: string) => {
    if (!url || url.trim() === '') return '';
    
    // Prevent embedding the site itself
    const currentHost = window.location.host;
    const origin = window.location.origin;
    if (url.includes(currentHost) || url.startsWith(origin) || url === '/' || url.startsWith('./') || url.startsWith('../')) {
      return '';
    }

    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes('youtube.com/shorts/')) {
      const id = url.split('/shorts/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes('drive.google.com/file/d/')) {
      const id = url.split('/d/')[1]?.split('/')[0];
      return `https://drive.google.com/file/d/${id}/preview`;
    }
    if (url.includes('facebook.com')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=500`;
    }
    if (url.includes('instagram.com')) {
      const cleanUrl = url.split('?')[0].replace(/\/$/, '');
      return `${cleanUrl}/embed`;
    }
    if (url.includes('tiktok.com')) {
      // TikTok doesn't have a simple iframe embed like others without their SDK, 
      // but we can try their oEmbed or just link it.
      // For now, let's just use the URL if it's already an embed URL or return empty to show link.
      if (url.includes('/embed/')) return url;
      return '';
    }
    return url;
  };

  const embedUrl = getEmbedUrl(url);
  const isVertical = url.includes('instagram.com') || 
                     url.includes('facebook.com/reels') || 
                     url.includes('facebook.com/reel') ||
                     url.includes('youtube.com/shorts') ||
                     url.includes('tiktok.com');

  if (!embedUrl) {
    return (
      <div className="space-y-4">
        <div className="rounded-[2rem] overflow-hidden bg-zinc-100 border-4 border-dashed border-zinc-200 aspect-video flex flex-col items-center justify-center p-8 text-center">
          {url.includes('facebook.com') ? <Facebook size={48} className="text-zinc-300 mb-4" /> : <Youtube size={48} className="text-zinc-300 mb-4" />}
          <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest">Video Player</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4 px-6 py-2 bg-zinc-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-600 transition-all">
            Watch Video
          </a>
        </div>
        <p className="text-sm font-black text-zinc-900 px-4 uppercase tracking-widest text-center">{title}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-[2rem] overflow-hidden bg-zinc-900 border-4 border-zinc-100 shadow-xl transition-all duration-500 ${isVertical ? 'aspect-[9/16] max-w-[350px] mx-auto' : 'aspect-video w-full'}`}>
        <iframe
          src={embedUrl}
          title={title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      </div>
      <p className="text-sm font-black text-zinc-900 px-4 uppercase tracking-widest text-center">{title}</p>
    </div>
  );
};

export const ProfilePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useFirebase();
  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    avatar: '',
    cover: '',
    socials: ['', '', ''],
    videos: [] as { title: string; url: string }[]
  });
  const [newVideo, setNewVideo] = useState({ title: '', url: '' });
  const [collabForm, setCollabForm] = useState({
    fromName: '',
    message: ''
  });

  useEffect(() => {
    const fetchInfluencer = async () => {
      if (!slug) return;
      try {
        // Try fetching by slug first
        const q = query(collection(db, 'influencers'), where('slug', '==', slug));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const data = docSnap.data();
          const avatar = data.avatar || data.imageUrl || '';
          const socials = data.socials || data.socialLinks || [];
          
          const influencerData = { 
            id: docSnap.id, 
            ...data,
            avatar,
            socials
          } as any;
          
          setInfluencer(influencerData);
          setEditForm({
            name: data.name || '',
            bio: data.bio || '',
            avatar: avatar,
            cover: data.cover || data.coverImage || '',
            socials: [...(socials || []), '', '', ''].slice(0, 3),
            videos: data.videos || []
          });
        } else {
          // Fallback to ID for backward compatibility
          const docRef = doc(db, 'influencers', slug);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const avatar = data.avatar || data.imageUrl || '';
            const socials = data.socials || data.socialLinks || [];
            
            const influencerData = { 
              id: docSnap.id, 
              ...data,
              avatar,
              socials
            } as any;
            
            setInfluencer(influencerData);
            setEditForm({
              name: data.name || '',
              bio: data.bio || '',
              avatar: avatar,
              cover: data.cover || data.coverImage || '',
              socials: [...(socials || []), '', '', ''].slice(0, 3),
              videos: data.videos || []
            });
          } else {
            setError(new Error('Influencer not found'));
          }
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.GET, `influencers/${slug}`);
        } catch (e) {
          setError(e as Error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInfluencer();
  }, [slug]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!influencer || !user) return;

    setUpdating(true);
    try {
      const updatedData = {
        name: editForm.name,
        bio: editForm.bio,
        avatar: editForm.avatar,
        imageUrl: editForm.avatar, // Save to both for compatibility
        cover: editForm.cover,
        socials: editForm.socials.filter(s => s.trim() !== ''),
        videos: editForm.videos,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'influencers', influencer.id), updatedData);
      
      setInfluencer(prev => prev ? { ...prev, ...updatedData } : null);
      setIsEditingProfile(false);
      setIsAddingVideo(false);
      toast.success(language === 'bn' ? 'প্রোফাইল আপডেট করা হয়েছে!' : 'Profile updated successfully!');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `influencers/${influencer.id}`);
      } catch (e: any) {
        toast.error(language === 'bn' ? 'আপডেট করতে সমস্যা হয়েছে' : 'Failed to update profile');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleCollabRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!influencer) return;

    if (!user) {
      setError(new Error('Please login to send a collaboration request'));
      return;
    }

    try {
      await addDoc(collection(db, 'collab_requests'), {
        fromName: collabForm.fromName,
        toInfluencerId: influencer.id,
        toInfluencerName: influencer.name,
        message: collabForm.message,
        timestamp: serverTimestamp(),
        toUid: influencer.uid || null,
        fromUid: user?.uid || null
      });
      
      setRequestSent(true);
      setCollabForm({ fromName: '', message: '' });
      setIsRequesting(false);
      setTimeout(() => setRequestSent(false), 5000);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, 'collab_requests');
      } catch (e) {
        setError(e as Error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !influencer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-8">
          <Zap size={48} />
        </div>
        <h1 className="text-3xl font-black text-zinc-900 mb-4 tracking-tight">
          {language === 'bn' ? 'প্রোফাইল পাওয়া যায়নি' : 'Profile Not Found'}
        </h1>
        <p className="text-zinc-500 mb-10 font-medium text-center max-w-md">
          {language === 'bn' 
            ? 'দুঃখিত, আপনি যে প্রোফাইলটি খুঁজছেন তা খুঁজে পাওয়া যায়নি বা মুছে ফেলা হয়েছে।' 
            : 'Sorry, the profile you are looking for could not be found or has been removed.'}
        </p>
        <button 
          onClick={() => navigate('/influencers')}
          className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-600 transition-all flex items-center gap-3 shadow-xl"
        >
          <ChevronLeft size={20} />
          {language === 'bn' ? 'ফিরে যান' : 'Go Back'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-culture-bg pb-24 relative overflow-hidden">
      <Helmet>
        <title>{`${influencer.name} | Barnia Influencer Network - Best Creator in Tehatta`}</title>
        <meta name="description" content={`${influencer.name} is a top influencer in Tehatta, Nadia. Bio: ${influencer.bio}. Connect with ${influencer.name} on Barnia Influencer Network.`} />
        <meta name="keywords" content={`${influencer.name}, Influencer, Barnia, Tehatta, Nadia, West Bengal, Content Creator, Social Media, ${(influencer.socials || []).join(', ')}`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={`${influencer.name} | Barnia Influencer Network`} />
        <meta property="og:description" content={`Check out ${influencer.name} on Barnia Influencer Network. Top creator in Tehatta, Nadia.`} />
        <meta property="og:image" content={influencer.avatar} />
        <meta property="og:url" content={window.location.href} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={`${influencer.name} | Barnia Influencer Network`} />
        <meta property="twitter:description" content={`Check out ${influencer.name} on Barnia Influencer Network. Top creator in Tehatta, Nadia.`} />
        <meta property="twitter:image" content={influencer.avatar} />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            "name": influencer.name,
            "description": influencer.bio,
            "image": influencer.avatar,
            "url": window.location.href,
            "sameAs": influencer.socials,
            "jobTitle": "Content Creator",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Tehatta",
              "addressRegion": "West Bengal",
              "addressCountry": "IN"
            }
          })}
        </script>
      </Helmet>

      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-200/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-200/30 blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-12 relative z-10">
        <button 
          onClick={() => navigate('/influencers')}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border-4 border-zinc-200 hover:border-brand-500 hover:text-brand-600 transition-all text-xs font-bold text-zinc-600 mb-12 shadow-sm hover:shadow-md"
        >
          <ChevronLeft size={16} />
          {t.common.allInfluencers}
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] border-4 border-brand-600 shadow-2xl overflow-hidden"
        >
          {/* Header/Cover Area */}
          <div className="h-48 md:h-64 bg-zinc-100 relative overflow-hidden">
            {influencer.cover ? (
              <img 
                src={influencer.cover} 
                alt="Cover" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-brand-600 to-brand-400 relative">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              </div>
            )}
          </div>

          <div className="px-8 md:px-16 pb-16 -mt-24 relative">
            {isEditingProfile ? (
              <form onSubmit={handleUpdateProfile} className="pt-32 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Full Name</label>
                    <input
                      required
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Avatar URL</label>
                    <input
                      required
                      type="text"
                      value={editForm.avatar}
                      onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Cover URL</label>
                    <input
                      type="text"
                      value={editForm.cover}
                      onChange={(e) => setEditForm({ ...editForm, cover: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Bio</label>
                  <textarea
                    required
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold h-32 resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Social Media Links</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {editForm.socials.map((social, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={social}
                        placeholder={`Social Link ${idx + 1}`}
                        onChange={(e) => {
                          const newSocials = [...editForm.socials];
                          newSocials[idx] = e.target.value;
                          setEditForm({ ...editForm, socials: newSocials });
                        }}
                        className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-sm"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-600/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {updating ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : isAddingVideo ? (
              <form onSubmit={handleUpdateProfile} className="pt-32 space-y-8">
                <div className="space-y-6 p-8 bg-zinc-50 rounded-[2.5rem] border border-zinc-100">
                  <h4 className="text-lg font-black text-zinc-900 tracking-tight">Add New Video</h4>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4">
                      <input
                        type="text"
                        placeholder="Video Title"
                        value={newVideo.title}
                        onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                        className="w-full p-4 rounded-2xl bg-white border border-zinc-100 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-sm"
                      />
                    </div>
                    <div className="md:col-span-6">
                      <input
                        type="text"
                        placeholder="Video URL (YouTube, FB, IG)"
                        value={newVideo.url}
                        onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                        className="w-full p-4 rounded-2xl bg-white border border-zinc-100 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (newVideo.title && newVideo.url) {
                            setEditForm({ ...editForm, videos: [...editForm.videos, newVideo] });
                            setNewVideo({ title: '', url: '' });
                            toast.success('Video added to list! Save changes to publish.');
                          }
                        }}
                        className="w-full h-full bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-600 transition-all flex items-center justify-center gap-2 py-4 md:py-0"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mt-6">
                    {editForm.videos.map((vid, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                            <Youtube size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-zinc-900 truncate">{vid.title}</p>
                            <p className="text-[10px] font-bold text-zinc-400 truncate">{vid.url}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newVideos = [...editForm.videos];
                            newVideos.splice(idx, 1);
                            setEditForm({ ...editForm, videos: newVideos });
                          }}
                          className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setIsAddingVideo(false)}
                    className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-600/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {updating ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div className="relative">
                <div className="absolute inset-0 bg-brand-600 blur-3xl opacity-20 rounded-full"></div>
                <img 
                  src={influencer.avatar} 
                  alt={influencer.name} 
                  className="w-48 h-48 rounded-[3rem] object-cover border-8 border-white shadow-2xl relative z-10"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(influencer.name)}&background=random&color=fff`;
                  }}
                />
                {influencer.isVerified && (
                  <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-2xl z-20 border-4 border-zinc-50">
                    <CheckCircle size={32} className="text-blue-500 fill-blue-50" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tighter mb-4 leading-none">
                  {influencer.name}
                </h1>
                
                {/* Bio for mobile - visible only on small screens */}
                <div className="block lg:hidden mb-6">
                  <p className="text-lg font-medium text-zinc-600 leading-relaxed italic">
                    "{influencer.bio}"
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  {user?.uid === influencer.uid && (
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-600/20"
                    >
                      <Edit size={16} />
                      {language === 'bn' ? 'প্রোফাইল এডিট করুন' : 'Edit Profile'}
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      const shareUrl = window.location.href;
                      const socialIcons: { [key: string]: string } = {
                        'instagram.com': '📸',
                        'facebook.com': '🟦',
                        'twitter.com': '🐦',
                        'x.com': '🐦',
                        'youtube.com': '🟥',
                        'linkedin.com': '💼',
                        'github.com': '💻',
                        'tiktok.com': '🎵'
                      };
                      const platforms = (influencer.socials || [])
                        .map(url => {
                          const match = Object.keys(socialIcons).find(key => url.toLowerCase().includes(key));
                          return match ? socialIcons[match] : '🌐';
                        })
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .join(' ');
                      
                      const shareText = `${influencer.bio}\n\nConnect: ${platforms}\n\nCheck out ${influencer.name} on Barnia Influencer Network!`;
                      shareContent(`${influencer.name} ✅`, shareText, shareUrl);
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-100 text-zinc-600 hover:bg-brand-50 hover:text-brand-600 transition-all text-xs font-black uppercase tracking-widest"
                  >
                    <Share2 size={16} />
                    {language === 'bn' ? 'শেয়ার করুন' : 'Share Profile'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-12">
                <div>
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-6">About Me</h3>
                  <p className="text-xl font-medium text-zinc-600 leading-relaxed">
                    {influencer.bio}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-6">Social Media Presence</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(influencer.socials || []).map((social, i) => (
                      <a
                        key={`social-${i}`}
                        href={social.startsWith('http') ? social : `https://${social}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-6 bg-zinc-50 rounded-3xl border-4 border-zinc-100 hover:border-brand-500 hover:bg-white transition-all group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          {getSocialIcon(social)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">
                            {social.includes('facebook') ? 'Facebook' : 
                             social.includes('instagram') ? 'Instagram' : 
                             social.includes('twitter') || social.includes('x.com') ? 'Twitter / X' : 
                             social.includes('youtube') ? 'YouTube' : 'Social Link'}
                          </p>
                          <p className="text-sm font-bold text-zinc-900 truncate">
                            {social.replace('https://', '').replace('http://', '').replace('www.', '')}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">Popular Videos</h3>
                    {user?.uid === influencer.uid && (
                      <button 
                        onClick={() => setIsAddingVideo(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white hover:bg-brand-600 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-zinc-900/10"
                      >
                        <Plus size={14} />
                        {language === 'bn' ? 'ভিডিও যোগ করুন' : 'Add Video'}
                      </button>
                    )}
                  </div>
                  
                  {influencer.videos && influencer.videos.length > 0 ? (
                    <div className="grid grid-cols-1 gap-12">
                      {influencer.videos.map((vid: { title: string; url: string }, i: number) => (
                        <VideoPlayer key={`video-${i}`} url={vid.url} title={vid.title} />
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-zinc-50 rounded-[2rem] border-2 border-dashed border-zinc-200">
                      <p className="text-zinc-400 font-medium text-sm">
                        {language === 'bn' ? 'এখনও কোন ভিডিও যোগ করা হয়নি' : 'No videos added yet'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <div className="p-8 bg-zinc-900 rounded-[2.5rem] text-white shadow-2xl shadow-zinc-900/20 relative overflow-hidden border-4 border-zinc-800">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <MessageSquare size={80} />
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-2xl font-black mb-4 tracking-tight">Work with Me</h4>
                    <p className="text-zinc-400 text-sm font-medium mb-8 leading-relaxed">
                      Interested in a collaboration? Send me a direct message through the platform.
                    </p>
                    
                    {requestSent ? (
                      <div className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                        <CheckCircle size={18} />
                        Request Sent!
                      </div>
                    ) : isRequesting ? (
                      <form onSubmit={handleCollabRequest} className="space-y-4">
                        <input
                          required
                          type="text"
                          placeholder="Your Name"
                          value={collabForm.fromName}
                          onChange={(e) => setCollabForm({ ...collabForm, fromName: e.target.value })}
                          className="w-full p-4 rounded-2xl bg-zinc-800 border border-zinc-700 text-white outline-none focus:border-brand-500 transition-all font-bold text-sm"
                        />
                        <textarea
                          required
                          placeholder="Your Message..."
                          value={collabForm.message}
                          onChange={(e) => setCollabForm({ ...collabForm, message: e.target.value })}
                          className="w-full p-4 rounded-2xl bg-zinc-800 border border-zinc-700 text-white outline-none focus:border-brand-500 transition-all font-bold text-sm h-32 resize-none"
                        />
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => setIsRequesting(false)}
                            className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="flex-1 py-4 bg-brand-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2"
                          >
                            <Send size={16} />
                            Send
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button 
                        onClick={() => setIsRequesting(true)}
                        className="w-full py-4 bg-brand-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-600/20"
                      >
                        <MessageSquare size={18} />
                        Collaborate
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-8 bg-white rounded-[2.5rem] border-4 border-zinc-100 shadow-sm">
                  <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-6">Quick Links</h4>
                  <div className="space-y-4">
                    <button 
                      onClick={() => navigate('/')}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-50 text-zinc-500 hover:text-brand-600 font-bold text-sm transition-all flex items-center gap-3"
                    >
                      <Globe size={16} />
                      Main Website
                    </button>
                    <button 
                      onClick={() => navigate('/bazar')}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-50 text-zinc-500 hover:text-brand-600 font-bold text-sm transition-all flex items-center gap-3"
                    >
                      <Zap size={16} />
                      Barnia Bazar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
