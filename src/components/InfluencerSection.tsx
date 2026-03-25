import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, Globe, MessageSquare, Share2, Send, Inbox, CheckCircle,
  Instagram, Twitter, Facebook, Youtube, Linkedin, Github, LogIn, Zap, ExternalLink, User, RefreshCw,
  Trash2, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { shareContent } from '../utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, where, deleteDoc, doc } from 'firebase/firestore';
import { useFirebase } from '../FirebaseContext';

const getSocialIcon = (url: string) => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('instagram.com')) return <Instagram size={20} className="text-[#E4405F]" />;
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return <Twitter size={20} className="text-[#1DA1F2]" />;
  if (lowerUrl.includes('facebook.com')) return <Facebook size={20} className="text-[#1877F2]" />;
  if (lowerUrl.includes('youtube.com')) return <Youtube size={20} className="text-[#FF0000]" />;
  if (lowerUrl.includes('linkedin.com')) return <Linkedin size={20} className="text-[#0077B5]" />;
  if (lowerUrl.includes('github.com')) return <Github size={20} className="text-[#181717]" />;
  return <Globe size={20} className="text-zinc-400" />;
};

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

export const InfluencerSection = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [newInfluencer, setNewInfluencer] = useState({
    name: '',
    bio: '',
    avatarUrl: '',
    social1: '',
    social2: '',
    social3: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  if (error) throw error;

  const myProfile = user ? userInfluencers.find(inf => inf.uid === user.uid) : null;

  useEffect(() => {
    if (showForm && user) {
      if (myProfile && !editingId) {
        // Pre-fill with existing profile if editing
        setEditingId(myProfile.id);
        setNewInfluencer({
          name: myProfile.name,
          bio: myProfile.bio,
          avatarUrl: myProfile.avatar,
          social1: myProfile.socials[0] || '',
          social2: myProfile.socials[1] || '',
          social3: myProfile.socials[2] || ''
        });
      } else if (!newInfluencer.name && !editingId) {
        // Pre-fill with user info for new profile
        setNewInfluencer(prev => ({
          ...prev,
          name: user.displayName || '',
          avatarUrl: user.photoURL || ''
        }));
      }
    } else if (!showForm) {
      setEditingId(null);
      setNewInfluencer({ name: '', bio: '', avatarUrl: '', social1: '', social2: '', social3: '' });
    }
  }, [showForm, user, myProfile]);

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
    const getUsername = (u: string, domain: string) => {
      try {
        // Handle standard URLs
        const urlObj = new URL(u.startsWith('http') ? u : `https://${u}`);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        
        if (domain === 'facebook.com') {
          // Handle profile.php?id=...
          const idParam = urlObj.searchParams.get('id');
          if (idParam) return idParam;
          // Handle facebook.com/username
          if (pathParts.length > 0) return pathParts[0];
        }
        
        if (pathParts.length > 0) {
          return pathParts[0];
        }
      } catch (e) {}
      return null;
    };

    if (url.includes('facebook.com/')) {
      const username = getUsername(url, 'facebook.com');
      if (username) avatarUrl = `https://unavatar.io/facebook/${username}`;
    } else if (url.includes('instagram.com/')) {
      const username = getUsername(url, 'instagram.com');
      if (username) avatarUrl = `https://unavatar.io/instagram/${username}`;
    } else if (url.includes('twitter.com/')) {
      const username = getUsername(url, 'twitter.com');
      if (username) avatarUrl = `https://unavatar.io/twitter/${username}`;
    } else if (url.includes('x.com/')) {
      const username = getUsername(url, 'x.com');
      if (username) avatarUrl = `https://unavatar.io/twitter/${username}`;
    } else if (url.includes('github.com/')) {
      const username = getUsername(url, 'github.com');
      if (username) avatarUrl = `https://unavatar.io/github/${username}`;
    }

    if (avatarUrl) {
      setNewInfluencer(prev => ({ ...prev, avatarUrl }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(language === 'bn' ? 'ছবিটি ২ মেগাবাইটের কম হতে হবে' : 'Image must be less than 2MB');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.7 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setNewInfluencer(prev => ({ ...prev, avatarUrl: dataUrl }));
        setUploading(false);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const influencerData: any = {
      name: newInfluencer.name,
      bio: newInfluencer.bio,
      socials: [newInfluencer.social1, newInfluencer.social2, newInfluencer.social3].filter(s => s.trim() !== ''),
      avatar: newInfluencer.avatarUrl || `https://picsum.photos/seed/${Math.random()}/200/200`,
      uid: user.uid,
      category: 'Influencer'
    };

    try {
      if (editingId) {
        // Update existing profile
        const { updateDoc, doc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'influencers', editingId), {
          ...influencerData,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new profile
        await addDoc(collection(db, 'influencers'), {
          ...influencerData,
          createdAt: serverTimestamp()
        });
      }
      setShowForm(false);
      setEditingId(null);
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

  const handleDeleteInfluencer = (id: string) => {
    setConfirmDelete(id);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, 'influencers', confirmDelete));
      setConfirmDelete(null);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `influencers/${confirmDelete}`);
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
    <div className="relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
        <div className="max-w-2xl">
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-zinc-500 text-lg font-medium max-w-lg"
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
              {user ? (myProfile ? <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" /> : <UserPlus size={20} className="group-hover:rotate-12 transition-transform" />) : <LogIn size={20} />}
              {user ? (myProfile ? (language === 'bn' ? 'প্রোফাইল এডিট করুন' : 'Edit My Profile') : t.influencers.join) : (language === 'bn' ? 'লগইন করুন' : 'Login to Join')}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showRequests && user && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-white p-10 rounded-[3rem] border-4 border-brand-600 shadow-2xl mb-16 relative overflow-y-auto max-h-[90vh] custom-scrollbar"
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
              className="bg-white p-12 rounded-[3rem] border-4 border-zinc-900 shadow-2xl mb-16 relative overflow-y-auto max-h-[90vh] custom-scrollbar"
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
                  <div className="flex flex-col md:flex-row gap-6 items-center p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100">
                    <div className="w-24 h-24 rounded-full bg-white flex-shrink-0 overflow-hidden border-4 border-white shadow-xl relative group/avatar">
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
                          <User size={32} />
                        </div>
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <RefreshCw size={20} className="text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 w-full space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                          <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                            {language === 'bn' ? 'ছবির লিঙ্ক' : 'Image URL'}
                          </label>
                          <input
                            type="text"
                            value={newInfluencer.avatarUrl.startsWith('data:') ? '' : newInfluencer.avatarUrl}
                            onChange={(e) => setNewInfluencer({ ...newInfluencer, avatarUrl: e.target.value })}
                            className="w-full p-4 rounded-2xl bg-white border border-zinc-100 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-sm"
                            placeholder={t.influencers.avatarPlaceholder}
                          />
                        </div>
                        <div className="sm:w-1/3">
                          <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                            {language === 'bn' ? 'আপলোড করুন' : 'Upload File'}
                          </label>
                          <label className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl bg-brand-50 border border-brand-100 text-brand-600 font-bold text-sm cursor-pointer hover:bg-brand-100 transition-all">
                            <Globe size={16} />
                            {language === 'bn' ? 'ফাইল' : 'File'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap gap-2">
                          {user?.photoURL && (
                            <button
                              type="button"
                              onClick={() => setNewInfluencer(prev => ({ ...prev, avatarUrl: user.photoURL || '' }))}
                              className="text-[10px] font-black text-brand-600 hover:text-brand-700 uppercase tracking-widest flex items-center gap-2 bg-brand-50 px-3 py-1.5 rounded-full"
                            >
                              <LogIn size={12} />
                              {language === 'bn' ? 'গুগল প্রোফাইল' : 'Google Photo'}
                            </button>
                          )}
                          <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest flex items-center gap-2 bg-brand-50 px-3 py-1.5 rounded-full">
                            <Zap size={12} />
                            {language === 'bn' ? 'টিপ: লিঙ্ক দিলে ছবি অটো আসবে!' : 'Tip: Links auto-fetch photo!'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Social Media Pages (Up to 3)</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((num) => (
                      <div key={`social-container-${num}`} className="relative group/social">
                        <input
                          required={num === 1}
                          type="text"
                          value={(newInfluencer as any)[`social${num}`]}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewInfluencer(prev => ({ ...prev, [`social${num}`]: val }));
                            // Overwrite if empty or if it's the default Google photo
                            if (!newInfluencer.avatarUrl || newInfluencer.avatarUrl === user?.photoURL) {
                              autoFetchAvatar(val);
                            }
                          }}
                          className="w-full p-4 pr-12 rounded-2xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold"
                          placeholder={t.influencers.socialPlaceholder}
                        />
                        {(newInfluencer as any)[`social${num}`] && (
                          <button
                            type="button"
                            onClick={() => autoFetchAvatar((newInfluencer as any)[`social${num}`])}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-brand-600 transition-colors"
                            title="Sync profile picture from this link"
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}
                      </div>
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
                    {editingId ? (language === 'bn' ? 'আপডেট করুন' : 'Update Profile') : 'Publish Profile'}
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
              className="group bg-white p-8 rounded-[2.5rem] border-4 border-zinc-100 shadow-sm hover:shadow-2xl hover:shadow-brand-500/10 transition-all flex flex-col relative overflow-hidden"
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

              <div className="mb-6 cursor-pointer" onClick={() => navigate(`/profile/${inf.id}`)}>
                <h4 className="text-2xl font-black text-zinc-900 group-hover:text-brand-600 transition-colors tracking-tight leading-tight mb-2 flex items-center gap-2">
                  {inf.name}
                  <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </h4>
                <p className="text-zinc-500 text-sm font-medium leading-relaxed">{inf.bio}</p>
              </div>

              <div className="flex flex-wrap gap-3 mb-8">
                {inf.socials.map((social, i) => (
                  <a
                    key={`${inf.id}-social-${i}`}
                    href={social.startsWith('http') ? social : `https://${social}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-zinc-50 rounded-2xl hover:bg-brand-50 transition-all hover:scale-110 shadow-sm border border-zinc-100"
                    title={social}
                  >
                    {getSocialIcon(social)}
                  </a>
                ))}
              </div>
              
              <div className="mt-auto space-y-3">
                <button 
                  onClick={() => navigate(`/profile/${inf.id}`)}
                  className="w-full py-4 bg-white text-zinc-900 border-4 border-zinc-100 rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:border-brand-600 hover:text-brand-600 transition-all flex items-center justify-center gap-3 shadow-sm"
                >
                  <User size={18} />
                  {language === 'bn' ? 'প্রোফাইল দেখুন' : 'View Profile'}
                </button>

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

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {confirmDelete && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">
                  {language === 'bn' ? 'প্রোফাইল মুছে ফেলবেন?' : 'Delete Profile?'}
                </h3>
                <p className="text-zinc-500 mb-8">
                  {language === 'bn' ? 'আপনি কি নিশ্চিত যে আপনি এই প্রোফাইলটি মুছে ফেলতে চান? এই কাজটি আর ফেরানো যাবে না।' : 'Are you sure you want to delete this profile? This action cannot be undone.'}
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-all"
                  >
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    onClick={confirmDeleteAction}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                  >
                    {language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };
