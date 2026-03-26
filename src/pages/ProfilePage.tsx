import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Instagram, Twitter, Facebook, Youtube, Linkedin, Github, Globe, 
  ChevronLeft, Share2, MessageSquare, Send, CheckCircle, Zap
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';
import { useFirebase } from '../FirebaseContext';
import { shareContent } from '../utils';

interface Influencer {
  id: string;
  name: string;
  bio: string;
  socials: string[];
  avatar: string;
  uid?: string;
}

const getSocialIcon = (url: string) => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('instagram.com')) return <Instagram size={24} className="text-[#E4405F]" />;
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return <Twitter size={24} className="text-[#1DA1F2]" />;
  if (lowerUrl.includes('facebook.com')) return <Facebook size={24} className="text-[#1877F2]" />;
  if (lowerUrl.includes('youtube.com')) return <Youtube size={24} className="text-[#FF0000]" />;
  if (lowerUrl.includes('linkedin.com')) return <Linkedin size={24} className="text-[#0077B5]" />;
  if (lowerUrl.includes('github.com')) return <Github size={24} className="text-[#181717]" />;
  return <Globe size={24} className="text-zinc-400" />;
};

export const ProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useFirebase();
  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [collabForm, setCollabForm] = useState({
    fromName: '',
    message: ''
  });

  useEffect(() => {
    const fetchInfluencer = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'influencers', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setInfluencer({ id: docSnap.id, ...docSnap.data() } as Influencer);
        } else {
          setError(new Error('Influencer not found'));
        }
      } catch (err) {
        setError(handleFirestoreError(err, OperationType.GET, `influencers/${id}`));
      } finally {
        setLoading(false);
      }
    };

    fetchInfluencer();
  }, [id]);

  const handleCollabRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!influencer) return;

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
      setError(handleFirestoreError(err, OperationType.CREATE, 'collab_requests'));
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
    <div className="min-h-screen bg-zinc-50 pb-24 relative overflow-hidden">
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
          {language === 'bn' ? 'সব ইনফ্লুয়েন্সার' : 'All Influencers'}
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] border-4 border-brand-600 shadow-2xl overflow-hidden"
        >
          {/* Header/Cover Area */}
          <div className="h-48 bg-gradient-to-r from-brand-600 to-brand-400 relative">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          </div>

          <div className="px-8 md:px-16 pb-16 -mt-24 relative">
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
                      
                      const shareText = `${influencer.bio}\n\nConnect: ${platforms}\n\nCheck out ${influencer.name} on Ujirpur Barnia Influencer Network!`;
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
                    {influencer.socials.map((social, i) => (
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
          </div>
        </motion.div>
      </div>
    </div>
  );
};
