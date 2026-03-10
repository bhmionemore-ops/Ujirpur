import React, { useState } from 'react';
import { UserPlus, Globe, MessageSquare, Layout, Share2 } from 'lucide-react';
import { motion } from 'motion/react';

interface Influencer {
  id: string;
  name: string;
  bio: string;
  socials: string[];
  avatar: string;
}

export const InfluencerSection = () => {
  const [influencers, setInfluencers] = useState<Influencer[]>([
    {
      id: '1',
      name: 'Arjun Das',
      bio: 'Travel blogger exploring the hidden gems of Nadia.',
      socials: ['instagram.com/arjun', 'youtube.com/arjun', 'facebook.com/arjun'],
      avatar: 'https://picsum.photos/seed/influencer1/200/200'
    },
    {
      id: '2',
      name: 'Priya Sen',
      bio: 'Foodie and local culture enthusiast.',
      socials: ['instagram.com/priya', 'twitter.com/priya', 'tiktok.com/priya'],
      avatar: 'https://picsum.photos/seed/influencer2/200/200'
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [newInfluencer, setNewInfluencer] = useState({
    name: '',
    bio: '',
    social1: '',
    social2: '',
    social3: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Math.random().toString(36).substr(2, 9);
    const influencer: Influencer = {
      id,
      name: newInfluencer.name,
      bio: newInfluencer.bio,
      socials: [newInfluencer.social1, newInfluencer.social2, newInfluencer.social3],
      avatar: `https://picsum.photos/seed/${id}/200/200`
    };
    setInfluencers([...influencers, influencer]);
    setShowForm(false);
    setNewInfluencer({ name: '', bio: '', social1: '', social2: '', social3: '' });
  };

  return (
    <section className="py-16 bg-zinc-50 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
              Influencer Network
            </h2>
            <p className="text-zinc-500 mt-2">Connect and collaborate with local creators.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2 w-fit"
          >
            <UserPlus size={20} />
            Join the Network
          </button>
        </div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
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
                <label className="text-sm font-semibold text-zinc-700">Social Media Pages (Up to 3)</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    required
                    type="text"
                    value={newInfluencer.social1}
                    onChange={(e) => setNewInfluencer({ ...newInfluencer, social1: e.target.value })}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Page 1 URL"
                  />
                  <input
                    required
                    type="text"
                    value={newInfluencer.social2}
                    onChange={(e) => setNewInfluencer({ ...newInfluencer, social2: e.target.value })}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Page 2 URL"
                  />
                  <input
                    required
                    type="text"
                    value={newInfluencer.social3}
                    onChange={(e) => setNewInfluencer({ ...newInfluencer, social3: e.target.value })}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Page 3 URL"
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {influencers.map((inf) => (
            <div key={inf.id} className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-all">
              <img
                src={inf.avatar}
                alt={inf.name}
                className="w-20 h-20 rounded-full mb-4 object-cover border-2 border-emerald-100"
                referrerPolicy="no-referrer"
              />
              <h4 className="text-lg font-bold text-zinc-900">{inf.name}</h4>
              <p className="text-zinc-500 text-sm mb-4 line-clamp-2">{inf.bio}</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {inf.socials.map((social, i) => (
                  <a
                    key={i}
                    href={`https://${social}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-zinc-50 rounded-lg hover:bg-emerald-50 text-zinc-400 hover:text-emerald-600 transition-colors"
                  >
                    <Globe size={16} />
                  </a>
                ))}
              </div>
              <button className="w-full py-2 bg-zinc-50 text-zinc-900 rounded-xl text-sm font-semibold hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-center gap-2">
                <MessageSquare size={16} />
                Collaborate
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
