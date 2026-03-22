import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Globe, MessageSquare, Share2, Send, Inbox, CheckCircle,
  Instagram, Twitter, Facebook, Youtube, Linkedin, Github, LogIn, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { shareContent } from '../utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, where, deleteDoc, doc } from 'firebase/firestore';
import { useFirebase } from '../FirebaseContext';
import { Trash2, XCircle } from 'lucide-react';

interface Influencer {
  id: string;
  name: string;
  bio: string;
  socials: string[];
  avatar: string;
  uid?: string;
}

interface CollabRequest {
  id: string;
  fromName: string;
  toInfluencerId: string;
  toInfluencerName: string;
  message: string;
  timestamp: any;
  toUid?: string;
}

const getSocialIcon = (url: string) => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('instagram.com')) return <Instagram size={16} className="text-[#E4405F]" />;
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return <Twitter size={16} className="text-[#1DA1F2]" />;
  if (lowerUrl.includes('facebook.com')) return <Facebook size={16} className="text-[#1877F2]" />;
  if (lowerUrl.includes('youtube.com')) return <Youtube size={16} className="text-[#FF0000]" />;
  if (lowerUrl.includes('linkedin.com')) return <Linkedin size={16} className="text-[#0077B5]" />;
  if (lowerUrl.includes('github.com')) return <Github size={16} className="text-[#181717]" />;
  return <Globe size={16} className="text-zinc-400" />;
};

export const InfluencerSection = () => {
  const { t } = useLanguage();
  const { user, signIn, isAdmin, language, setAuthModalOpen } = useFirebase();
  const [userInfluencers, setUserInfluencers] = useState<Influencer[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const influencers = userInfluencers;

  const [showForm, setShowForm] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [requests, setRequests] = useState<CollabRequest[]>([]);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestSentId, setRequestSentId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newInfluencer, setNewInfluencer] = useState({
    name: '',
    bio: '',
    avatarUrl: '',
    social1: '',
    social2: '',
    social3: ''
  });

  if (error) throw error;

  useEffect(() => {
    if (showForm && user && !newInfluencer.name) {
      setNewInfluencer(prev => ({
        ...prev,
        name: user.displayName || '',
        avatarUrl: user.photoURL || ''
      }));
    }
  }, [showForm, user]);

  const [collabForm, setCollabForm] = useState({
    fromName: '',
    message: ''
  });

  useEffect(() => {
    // Listen to influencers
    const qInf = query(collection(db, 'influencers'), orderBy('createdAt', 'desc'));
    const unsubInf = onSnapshot(qInf, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Influencer[];
      setUserInfluencers(items);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'influencers');
      } catch (e) {
        setError(e as Error);
      }
    });

    // Listen to collab requests (only if logged in)
    let unsubReq = () => {};
    if (user) {
      const qReq = query(collection(db, 'collab_requests'), where('toUid', '==', user.uid), orderBy('timestamp', 'desc'));
      unsubReq = onSnapshot(qReq, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CollabRequest[];
        setRequests(items);
      }, (error) => {
        // Silently fail if collection doesn't exist or rules deny
        console.warn("Collab requests listener error:", error);
      });
    }

    return () => {
      unsubInf();
      unsubReq();
    };
  }, [user]);

  const autoFetchAvatar = (url: string) => {
    if (!url) return;
    
    let avatarUrl = '';
    if (url.includes('facebook.com/')) {
      const username = url.split('facebook.com/')[1]?.split('/')[0]?.split('?')[0];
      if (username) avatarUrl = `https://unavatar.io/facebook/${username}`;
    } else if (url.includes('instagram.com/')) {
      const username = url.split('instagram.com/')[1]?.split('/')[0]?.split('?')[0];
      if (username) avatarUrl = `https://unavatar.io/instagram/${username}`;
    } else if (url.includes('twitter.com/')) {
      const username = url.split('twitter.com/')[1]?.split('/')[0]?.split('?')[0];
      if (username) avatarUrl = `https://unavatar.io/twitter/${username}`;
    } else if (url.includes('github.com/')) {
      const username = url.split('github.com/')[1]?.split('/')[0]?.split('?')[0];
      if (username) avatarUrl = `https://unavatar.io/github/${username}`;
    }

    if (avatarUrl) {
      setNewInfluencer(prev => ({ ...prev, avatarUrl }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const influencerData = {
      name: newInfluencer.name,
      bio: newInfluencer.bio,
      socials: [newInfluencer.social1, newInfluencer.social2, newInfluencer.social3].filter(s => s.trim() !== ''),
      avatar: newInfluencer.avatarUrl || `https://picsum.photos/seed/${Math.random()}/200/200`,
      uid: user.uid,
      createdAt: serverTimestamp(),
      category: 'Influencer'
    };

    try {
      await addDoc(collection(db, 'influencers'), influencerData);
      setShowForm(false);
      setNewInfluencer({ name: '', bio: '', avatarUrl: '', social1: '', social2: '', social3: '' });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, 'influencers');
      } catch (e) {
        setError(e as Error);
      }
    }
  };

  const handleCollabRequest = async (e: React.FormEvent, influencer: Influencer) => {
    e.preventDefault();
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
      
      setRequestSentId(influencer.id);
      setCollabForm({ fromName: '', message: '' });
      setRequestingId(null);
      setTimeout(() => setRequestSentId(null), 3000);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, 'collab_requests');
      } catch (e) {
        setError(e as Error);
      }
    }
  };

  const handleDeleteInfluencer = async (id: string) => {
    if (!window.confirm(language === 'bn' ? 'আপনি কি নিশ্চিত যে আপনি এই প্রোফাইলটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this profile?')) return;
    try {
      await deleteDoc(doc(db, 'influencers', id));
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, 'influencers');
      } catch (e) {
        setError(e as Error);
      }
    }
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'collab_requests', id));
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, 'collab_requests');
      } catch (e) {
        setError(e as Error);
      }
    }
  };

  return (
    <section className="py-32 bg-zinc-50 relative overflow-hidden px-4">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-200/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-200/30 blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-block px-4 py-1.5 bg-brand-100 text-brand-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-6"
            >
              {language === 'bn' ? 'আমাদের নেটওয়ার্ক' : 'Our Network'}
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-5xl md:text-7xl font-black tracking-tighter text-zinc-900 leading-[0.9]"
            >
              {t.influencers.title}
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-zinc-500 mt-6 text-lg font-medium max-w-lg"
            >
              {t.influencers.subtitle}
            </motion.p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {user && (
              <button
                onClick={() => setShowRequests(!showRequests)}
                className="bg-white text-zinc-900 border border-zinc-200 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center gap-3 shadow-xl shadow-zinc-900/5 relative group"
              >
                <Inbox size={20} className="group-hover:scale-110 transition-transform" />
                {t.influencers.requests}
                {requests.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-brand-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    {requests.length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => {
                if (!user) {
                  setAuthModalOpen(true);
                } else {
                  setShowForm(!showForm);
                }
              }}
              className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-600 hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-zinc-900/10 group"
            >
              {user ? <UserPlus size={20} className="group-hover:rotate-12 transition-transform" /> : <LogIn size={20} />}
              {user ? t.influencers.join : (language === 'bn' ? 'লগইন করুন' : 'Login to Join')}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showRequests && user && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-2xl mb-16 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-2 h-full bg-brand-600"></div>
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-3xl font-black text-zinc-900 tracking-tight">{t.influencers.requests}</h3>
                  <p className="text-zinc-400 text-sm font-medium mt-1">Manage your collaboration inquiries</p>
                </div>
                <button onClick={() => setShowRequests(false)} className="p-3 bg-zinc-50 text-zinc-400 hover:text-zinc-900 rounded-2xl transition-all">
                  <XCircle size={24} />
                </button>
              </div>
              
              {requests.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Inbox size={32} className="text-zinc-200" />
                  </div>
                  <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">{t.influencers.noRequests}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {requests.map((req) => (
                    <motion.div 
                      layout
                      key={req.id} 
                      className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 flex justify-between items-start group hover:bg-white hover:shadow-xl transition-all"
                    >
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-black">
                              {req.fromName.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-black text-zinc-900">{req.fromName}</h4>
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                {req.timestamp?.toDate ? req.timestamp.toDate().toLocaleDateString() : 'Just now'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs font-black text-brand-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-brand-600"></span>
                            To: {req.toInfluencerName}
                          </p>
                          <p className="text-zinc-600 text-sm italic bg-white/50 p-4 rounded-2xl border border-zinc-100">"{req.message}"</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteRequest(req.id)}
                        className="ml-4 p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                        title="Delete Request"
                      >
                        <Trash2 size={18} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {showForm && user && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-white p-12 rounded-[3rem] border border-zinc-100 shadow-2xl mb-16 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-2 h-full bg-zinc-900"></div>
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-3xl font-black text-zinc-900 tracking-tight">Create Your Profile</h3>
                  <p className="text-zinc-400 text-sm font-medium mt-1">Join our professional community</p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-3 bg-zinc-50 text-zinc-400 hover:text-zinc-900 rounded-2xl transition-all">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={newInfluencer.name}
                    onChange={(e) => setNewInfluencer({ ...newInfluencer, name: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold"
                    placeholder="Your Name"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Short Bio</label>
                  <input
                    required
                    type="text"
                    value={newInfluencer.bio}
                    onChange={(e) => setNewInfluencer({ ...newInfluencer, bio: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold"
                    placeholder="What do you do?"
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t.influencers.avatarLabel}</label>
                    {user?.photoURL && (
                      <button
                        type="button"
                        onClick={() => setNewInfluencer(prev => ({ ...prev, avatarUrl: user.photoURL || '' }))}
                        className="text-[10px] font-black text-brand-600 hover:text-brand-700 uppercase tracking-widest flex items-center gap-2"
                      >
                        <Globe size={12} />
                        {language === 'bn' ? 'গুগল প্রোফাইল থেকে নিন' : 'Sync from Google'}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-6 items-center p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100">
                    <div className="w-24 h-24 rounded-full bg-white flex-shrink-0 overflow-hidden border-4 border-white shadow-xl">
                      {newInfluencer.avatarUrl ? (
                        <img 
                          src={newInfluencer.avatarUrl} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(newInfluencer.name || 'User')}&background=random&color=fff`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-200">
                          <UserPlus size={32} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={newInfluencer.avatarUrl}
                        onChange={(e) => setNewInfluencer({ ...newInfluencer, avatarUrl: e.target.value })}
                        className="w-full p-4 rounded-2xl bg-white border border-zinc-100 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold"
                        placeholder={t.influencers.avatarPlaceholder}
                      />
                      <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest flex items-center gap-2">
                        <Zap size={12} />
                        {language === 'bn' 
                          ? 'টিপ: সোশ্যাল মিডিয়া লিঙ্ক দিলে ছবি অটোমেটিক চলে আসবে!' 
                          : 'Tip: Add social links for auto-photo fetch!'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Social Media Pages (Up to 3)</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((num) => (
                      <input
                        key={`social-${num}`}
                        required={num === 1}
                        type="text"
                        value={(newInfluencer as any)[`social${num}`]}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewInfluencer(prev => ({ ...prev, [`social${num}`]: val }));
                          if (!newInfluencer.avatarUrl) autoFetchAvatar(val);
                        }}
                        className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold"
                        placeholder={t.influencers.socialPlaceholder}
                      />
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 hover:scale-105 transition-all shadow-xl shadow-brand-600/20"
                  >
                    Publish Profile
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {influencers.length === 0 ? (
            <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-zinc-100 shadow-sm">
              <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <UserPlus size={48} className="text-zinc-200" />
              </div>
              <h3 className="text-3xl font-black text-zinc-900 mb-4 tracking-tight">
                {language === 'bn' ? 'কোন ইনফ্লুয়েন্সার পাওয়া যায়নি' : 'No Influencers Found'}
              </h3>
              <p className="text-zinc-500 max-w-md mx-auto mb-10 font-medium">
                {language === 'bn' 
                  ? 'আমাদের নেটওয়ার্কে প্রথম ইনফ্লুয়েন্সার হিসেবে যোগ দিন এবং আপনার প্রতিভা সবার সাথে শেয়ার করুন!' 
                  : 'Be the first to join our network and share your talent with the community!'}
              </p>
              {!user ? (
                <button 
                  onClick={signIn}
                  className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-600 hover:scale-105 transition-all flex items-center gap-3 mx-auto shadow-xl shadow-zinc-900/10"
                >
                  <LogIn size={20} />
                  {language === 'bn' ? 'লগইন করে যোগ দিন' : 'Login to Join'}
                </button>
              ) : (
                <button 
                  onClick={() => setShowForm(true)}
                  className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 hover:scale-105 transition-all flex items-center gap-3 mx-auto shadow-xl shadow-brand-600/20"
                >
                  <UserPlus size={20} />
                  {t.influencers.join}
                </button>
              )}
            </div>
          ) : (
            influencers.map((inf) => (
            <motion.div 
              layout
              key={inf.id} 
              whileHover={{ y: -10 }}
              className="group bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-2xl hover:shadow-brand-500/10 transition-all flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-zinc-50 group-hover:bg-brand-600 transition-colors"></div>
              
              <div className="flex justify-between items-start mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-brand-600 blur-2xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full"></div>
                  <img
                    src={inf.avatar}
                    alt={inf.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl relative z-10 group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(inf.name)}&background=random&color=fff`;
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/profile/${inf.id}`;
                      shareContent(inf.name, `Check out ${inf.name} on Ujirpur Barnia Influencer Network: ${inf.bio}`, shareUrl);
                    }}
                    className="p-3 text-zinc-400 hover:text-brand-600 hover:bg-brand-50 rounded-2xl transition-all"
                  >
                    <Share2 size={20} />
                  </button>
                  {(isAdmin || (user && inf.uid === user.uid)) && (
                    <button 
                      onClick={() => handleDeleteInfluencer(inf.id)}
                      className="p-3 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-2xl font-black text-zinc-900 group-hover:text-brand-600 transition-colors tracking-tight leading-tight mb-2">{inf.name}</h4>
                <p className="text-zinc-500 text-sm font-medium line-clamp-2 leading-relaxed">{inf.bio}</p>
              </div>

              <div className="flex flex-wrap gap-3 mb-8">
                {inf.socials.map((social, i) => (
                  <a
                    key={`${inf.id}-social-${i}`}
                    href={social.startsWith('http') ? social : `https://${social}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-zinc-50 rounded-2xl hover:bg-brand-50 text-zinc-400 hover:text-brand-600 transition-all hover:scale-110"
                    title={social}
                  >
                    {getSocialIcon(social)}
                  </a>
                ))}
              </div>
              
              <div className="mt-auto">
                {requestSentId === inf.id ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full py-4 bg-brand-50 text-brand-600 rounded-[1.5rem] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-brand-100"
                  >
                    <CheckCircle size={18} />
                    {t.influencers.requestSent}
                  </motion.div>
                ) : requestingId === inf.id ? (
                  <motion.form 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={(e) => handleCollabRequest(e, inf)}
                    className="space-y-3 p-4 bg-zinc-50 rounded-[2rem] border border-zinc-100"
                  >
                    <input
                      required
                      type="text"
                      placeholder="Your Name"
                      value={collabForm.fromName}
                      onChange={(e) => setCollabForm({ ...collabForm, fromName: e.target.value })}
                      className="w-full p-3 text-xs rounded-xl bg-white border border-zinc-100 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-bold"
                    />
                    <textarea
                      required
                      placeholder="Message..."
                      value={collabForm.message}
                      onChange={(e) => setCollabForm({ ...collabForm, message: e.target.value })}
                      className="w-full p-3 text-xs rounded-xl bg-white border border-zinc-100 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 h-20 resize-none font-bold"
                    />
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setRequestingId(null)}
                        className="flex-1 py-2.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:bg-zinc-200 rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-2.5 bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20"
                      >
                        <Send size={14} />
                        Send
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  <button 
                    onClick={() => setRequestingId(inf.id)}
                    className="w-full py-4 bg-zinc-900 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-brand-600 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-xl shadow-zinc-900/10"
                  >
                    <MessageSquare size={18} />
                    {t.influencers.requestCollab}
                  </button>
                )}
              </div>
            </motion.div>
          )))}
        </div>
      </div>
    </section>
  );
};
