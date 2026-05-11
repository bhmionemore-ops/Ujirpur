import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Star, ShieldCheck, Zap, Rocket, CheckCircle2, ArrowRight, MessageSquare, Phone, Mail, User } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { toast } from 'sonner';

export default function UpgradeLeadPage() {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    interest: 'premium_hub',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // We'll use the influencer endpoint or a dedicated lead endpoint
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           ...formData,
           source: 'Web Form'
        })
      });

      if (response.ok) {
        toast.success(language === 'bn' ? 'আপনার আবেদন জমা হয়েছে! আমরা শীঘ্রই যোগাযোগ করব।' : 'Interest registered! We will contact you soon.');
        setFormData({ name: '', email: '', phone: '', interest: 'premium_hub', message: '' });
      } else {
        throw new Error('Failed to submit');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again or contact support@barnia.in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        
        {/* Left Side: Marketing/Value Prop */}
        <div className="space-y-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-black uppercase tracking-widest">
              <Star size={14} className="fill-current" />
              Premium Access
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-zinc-900 tracking-tight leading-[1.1]">
              Elevate Your <span className="text-brand-600">Archive</span> <br />
              to the Next Level
            </h1>
            <p className="text-xl text-zinc-500 font-medium max-w-lg leading-relaxed">
              Unlock the full power of Barnali AI. High-performance models, exclusive heritage tools, and priority support for your family's digital legacy.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { 
                icon: Rocket, 
                title: 'High Speed AI', 
                desc: 'No more congestion. Access the most powerful Gemini & GPT models instantly.',
                color: 'bg-emerald-500'
              },
              { 
                icon: ShieldCheck, 
                title: 'Heritage Vault', 
                desc: 'Advanced privacy and unlimited storage for your Vamshavali members.',
                color: 'bg-brand-500'
              },
              { 
                icon: Zap, 
                title: 'Premium Hub', 
                desc: 'Generate unlimited high-quality images and video animations of your ancestors.',
                color: 'bg-purple-500'
              },
              { 
                icon: CheckCircle2, 
                title: 'Expert Support', 
                desc: 'Dedicated 1-on-1 assistance to help you map complex family lineages.',
                color: 'bg-blue-500'
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="group p-6 rounded-3xl bg-white border border-zinc-100 hover:shadow-xl hover:shadow-zinc-200/50 transition-all"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-current/20`}>
                  <feature.icon size={24} />
                </div>
                <h3 className="font-bold text-lg mb-2 text-zinc-900">{feature.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Side: The Form */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-2xl border border-zinc-100 sticky top-32"
        >
          <div className="mb-10">
            <h2 className="text-3xl font-black text-zinc-900 mb-2">Register Interest</h2>
            <p className="text-zinc-500 font-medium">Fill in your details and our team will get back to you within 24 hours.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Your Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="E.g. Rahul Sharma"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-zinc-50 border-none focus:ring-2 focus:ring-brand-500 transition-all font-bold text-zinc-900"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="+91 00000 00000"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-zinc-50 border-none focus:ring-2 focus:ring-brand-500 transition-all font-bold text-zinc-900"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="name@example.com"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-zinc-50 border-none focus:ring-2 focus:ring-brand-500 transition-all font-bold text-zinc-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Interested In</label>
              <select 
                value={formData.interest}
                onChange={e => setFormData({...formData, interest: e.target.value})}
                className="w-full px-4 py-4 rounded-2xl bg-zinc-50 border-none focus:ring-2 focus:ring-brand-500 transition-all font-bold text-zinc-900 appearance-none"
              >
                <option value="premium_hub">AI Router Premium (Unlimited Hub)</option>
                <option value="family_tree">Advanced Family Tree (Vamshavali)</option>
                <option value="heritage_digitization">Heritage Digitization Support</option>
                <option value="other">General Support</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Your Comment (Optional)</label>
              <textarea 
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                rows={3}
                placeholder="Tell us what you need help with..."
                className="w-full px-4 py-4 rounded-2xl bg-zinc-50 border-none focus:ring-2 focus:ring-brand-500 transition-all font-bold text-zinc-900 resize-none"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:shadow-2xl hover:shadow-brand-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Submit Request
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              By submitting, you agree to being contacted regarding premium services.
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
