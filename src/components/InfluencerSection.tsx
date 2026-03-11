import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Globe, MessageSquare, Share2, Send, Inbox, CheckCircle,
  Instagram, Twitter, Facebook, Youtube, Linkedin, Github
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { shareContent } from '../utils';

interface Influencer {
  id: string;
  name: string;
  bio: string;
  socials: string[];
  avatar: string;
}

interface CollabRequest {
  id: string;
  fromName: string;
  toInfluencerId: string;
  toInfluencerName: string;
  message: string;
  timestamp: string;
}

const getSocialIcon = (url: string) => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('instagram.com')) return <Instagram size={16} />;
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return <Twitter size={16} />;
  if (lowerUrl.includes('facebook.com')) return <Facebook size={16} />;
  if (lowerUrl.includes('youtube.com')) return <Youtube size={16} />;
  if (lowerUrl.includes('linkedin.com')) return <Linkedin size={16} />;
  if (lowerUrl.includes('github.com')) return <Github size={16} />;
  return <Globe size={16} />;
};

export const InfluencerSection = () => {
  const { t } = useLanguage();
  const [userInfluencers, setUserInfluencers] = useState<Influencer[]>([]);
  const influencers = [...t.data.influencers, ...userInfluencers];

  const [showForm, setShowForm] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [requests, setRequests] = useState<CollabRequest[]>([]);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestSentId, setRequestSentId] = useState<string | null>(null);

  const [newInfluencer, setNewInfluencer] = useState({
    name: '',
    bio: '',
    avatarUrl: '',
    social1: '',
    social2: '',
    social3: ''
  });

  const [collabForm, setCollabForm] = useState({
    fromName: '',
    message: ''
  });

  useEffect(() => {
    fetchRequests();
    fetchInfluencers();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/collab-requests');
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  };

  const fetchInfluencers = async () => {
    try {
      const res = await fetch('/api/influencers');
      const data = await res.json();
      setUserInfluencers(data);
    } catch (err) {
      console.error('Failed to fetch influencers:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const influencerData = {
      name: newInfluencer.name,
      bio: newInfluencer.bio,
      socials: [newInfluencer.social1, newInfluencer.social2, newInfluencer.social3].filter(s => s.trim() !== ''),
      avatar: newInfluencer.avatarUrl || `https://picsum.photos/seed/${Math.random()}/200/200`
    };

    try {
      const res = await fetch('/api/influencers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(influencerData)
      });
      const data = await res.json();
      
      if (data.success) {
        setUserInfluencers([...userInfluencers, data.influencer]);
        
        // Send notification to backend
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'influencer', data: data.influencer })
        }).catch(err => console.error('Failed to send notification:', err));

        setShowForm(false);
        setNewInfluencer({ name: '', bio: '', avatarUrl: '', social1: '', social2: '', social3: '' });
      }
    } catch (err) {
      console.error('Failed to save influencer:', err);
    }
  };

  const handleCollabRequest = async (e: React.FormEvent, influencer: Influencer) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/collab-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromName: collabForm.fromName,
          toInfluencerId: influencer.id,
          toInfluencerName: influencer.name,
          message: collabForm.message
        })
      });
      
      if (res.ok) {
        setRequestSentId(influencer.id);
        setCollabForm({ fromName: '', message: '' });
        setRequestingId(null);
        fetchRequests();
        setTimeout(() => setRequestSentId(null), 3000);
      }
    } catch (err) {
      console.error('Failed to send collab request:', err);
    }
  };

  return (
    <section className="py-16 bg-zinc-50 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
              {t.influencers.title}
            </h2>
            <p className="text-zinc-500 mt-2">{t.influencers.subtitle}</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowRequests(!showRequests)}
              className="bg-white text-zinc-900 border border-zinc-200 px-6 py-3 rounded-xl font-medium hover:bg-zinc-50 transition-colors flex items-center gap-2 w-fit relative"
            >
              <Inbox size={20} />
              {t.influencers.requests}
              {requests.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {requests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2 w-fit"
            >
              <UserPlus size={20} />
              {t.influencers.join}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showRequests && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-lg mb-12"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{t.influencers.requests}</h3>
                <button onClick={() => setShowRequests(false)} className="text-zinc-400 hover:text-zinc-900">
                  <Inbox size={20} />
                </button>
              </div>
              
              {requests.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">{t.influencers.noRequests}</p>
              ) : (
                <div className="space-y-4">
                  {requests.map((req) => (
                    <div key={req.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-emerald-600">{req.fromName}</h4>
                        <span className="text-[10px] text-zinc-400">{new Date(req.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-zinc-600 mb-2">
                        <span className="font-semibold text-zinc-900">To:</span> {req.toInfluencerName}
                      </p>
                      <p className="text-sm text-zinc-500 italic">"{req.message}"</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-lg mb-12 overflow-hidden"
            >
              <h3 className="text-xl font-bold mb-6">Create Your Profile</h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Full Name</label>
                  <input
                    required
                    type="text"
                    value={newInfluencer.name}
                    onChange={(e) => setNewInfluencer({ ...newInfluencer, name: e.target.value })}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Your Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Short Bio</label>
                  <input
                    required
                    type="text"
                    value={newInfluencer.bio}
                    onChange={(e) => setNewInfluencer({ ...newInfluencer, bio: e.target.value })}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="What do you do?"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-zinc-700">{t.influencers.avatarLabel}</label>
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-100 flex-shrink-0 overflow-hidden border-2 border-emerald-100">
                      {newInfluencer.avatarUrl ? (
                        <img 
                          src={newInfluencer.avatarUrl} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => (e.currentTarget.src = 'https://picsum.photos/200')}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300">
                          <UserPlus size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={newInfluencer.avatarUrl}
                        onChange={(e) => setNewInfluencer({ ...newInfluencer, avatarUrl: e.target.value })}
                        className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder={t.influencers.avatarPlaceholder}
                      />
                      <p className="text-[10px] text-zinc-400 px-1">
                        Tip: Right-click your social media profile picture and select "Copy image address" to get the link.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-zinc-700">Social Media Pages (Up to 3)</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      required
                      type="text"
                      value={newInfluencer.social1}
                      onChange={(e) => setNewInfluencer({ ...newInfluencer, social1: e.target.value })}
                      className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder={t.influencers.socialPlaceholder}
                    />
                    <input
                      type="text"
                      value={newInfluencer.social2}
                      onChange={(e) => setNewInfluencer({ ...newInfluencer, social2: e.target.value })}
                      className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder={t.influencers.socialPlaceholder}
                    />
                    <input
                      type="text"
                      value={newInfluencer.social3}
                      onChange={(e) => setNewInfluencer({ ...newInfluencer, social3: e.target.value })}
                      className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder={t.influencers.socialPlaceholder}
                    />
                  </div>
                </div>
                <div className="md:col-span-2 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 rounded-xl font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Publish Profile
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {influencers.map((inf) => (
            <div key={inf.id} className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <img
                  src={inf.avatar}
                  alt={inf.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-emerald-100"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => shareContent(inf.name, `Check out ${inf.name} on Ujirpur Barnia Influencer Network: ${inf.bio}`)}
                  className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                >
                  <Share2 size={18} />
                </button>
              </div>
              <h4 className="text-lg font-bold text-zinc-900">{inf.name}</h4>
              <p className="text-zinc-500 text-sm mb-4 line-clamp-2">{inf.bio}</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {inf.socials.map((social, i) => (
                  <a
                    key={i}
                    href={social.startsWith('http') ? social : `https://${social}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-zinc-50 rounded-lg hover:bg-emerald-50 text-zinc-400 hover:text-emerald-600 transition-colors"
                    title={social}
                  >
                    {getSocialIcon(social)}
                  </a>
                ))}
              </div>
              
              <div className="mt-auto space-y-2">
                {requestSentId === inf.id ? (
                  <div className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <CheckCircle size={16} />
                    {t.influencers.requestSent}
                  </div>
                ) : requestingId === inf.id ? (
                  <motion.form 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={(e) => handleCollabRequest(e, inf)}
                    className="space-y-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200"
                  >
                    <input
                      required
                      type="text"
                      placeholder="Your Name"
                      value={collabForm.fromName}
                      onChange={(e) => setCollabForm({ ...collabForm, fromName: e.target.value })}
                      className="w-full p-2 text-xs rounded-lg border border-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <textarea
                      required
                      placeholder="Message..."
                      value={collabForm.message}
                      onChange={(e) => setCollabForm({ ...collabForm, message: e.target.value })}
                      className="w-full p-2 text-xs rounded-lg border border-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500 h-16 resize-none"
                    />
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setRequestingId(null)}
                        className="flex-1 py-1.5 text-[10px] font-bold text-zinc-500 hover:bg-zinc-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <Send size={12} />
                        Send
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  <button 
                    onClick={() => setRequestingId(inf.id)}
                    className="w-full py-2 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={16} />
                    {t.influencers.requestCollab}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
