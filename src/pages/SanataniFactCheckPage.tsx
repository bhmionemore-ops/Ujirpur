import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShieldCheck, AlertCircle, CheckCircle2, XCircle, Info, Share2, Filter, MessageSquare, ArrowRight, Loader2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { SanataniBot } from '../components/SanataniBot';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface FactCheck {
  id: string;
  claim: string;
  status: 'verified' | 'false' | 'misleading';
  explanation: string;
  source?: string;
  category: string;
  date: string;
}

const MOCK_FACTS: FactCheck[] = [
  {
    id: '1',
    claim: 'The concept of Zero was only invented for mathematical use in India.',
    status: 'misleading',
    explanation: 'While Zero was revolutionized in India for mathematics (Shunya), the philosophical concept of "Emptiness" or Shunya existed in Vedic and Buddhist philosophy long before its mathematical notation. It was a bridge between spirituality and science.',
    source: 'Ancient Indian Mathematical Manuscripts',
    category: 'History',
    date: '2026-04-18'
  },
  {
    id: '2',
    claim: 'Sanskrit is the most computer-compatible language according to NASA.',
    status: 'verified',
    explanation: 'NASA researcher Rick Briggs published a paper in 1985 in AI Magazine stating that Sanskrit\'s grammar is highly structured and unambiguous, making it ideal for natural language processing in Artificial Intelligence.',
    source: 'AI Magazine Vol. 6 No. 1 (1985)',
    category: 'Science',
    date: '2026-04-15'
  },
  {
    id: '3',
    claim: 'The Kumbh Mela is the only human gathering visible from space.',
    status: 'false',
    explanation: 'While the Kumbh Mela is an incredibly massive gathering, individual humans are not visible from space. Large crowds can be seen as colorful patches from low earth orbit satellites, but this applies to many large cities and gatherings, not just Kumbh.',
    source: 'ISRO / NASA Satellite Imagery Data',
    category: 'General',
    date: '2026-04-10'
  }
];

export const SanataniFactCheckPage = () => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'verified' | 'false' | 'misleading'>('all');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [claimText, setClaimText] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleShare = (fact: FactCheck) => {
    const text = `Fact Check: "${fact.claim}"\nVerdict: ${fact.status.toUpperCase()}\nVerified by Sanatani Fact Check.`;
    if (navigator.share) {
      navigator.share({
        title: 'Sanatani Fact Check',
        text: text,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      alert('Link copied to clipboard!');
    }
  };

  const handleDeepDive = (claim: string) => {
    // Scroll to the Bot section and dispatch event
    const botSection = document.getElementById('sanatani-bot-section');
    if (botSection) {
      botSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Small delay for scroll to start
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sanatani-bot-search', { 
          detail: { claim } 
        }));
      }, 500);
    }
  };

  const handleSubmitClaim = async () => {
    if (!claimText.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'fact_check_submissions'), {
        claim: claimText,
        evidence: evidenceText,
        status: 'pending',
        createdAt: serverTimestamp(),
        userUid: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || 'anonymous'
      });
      setSubmitSuccess(true);
      setClaimText('');
      setEvidenceText('');
      setTimeout(() => {
        setShowSubmitModal(false);
        setSubmitSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFacts = MOCK_FACTS.filter(fact => {
    const matchesSearch = fact.claim.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         fact.explanation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || fact.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'false': return 'text-red-600 bg-red-50 border-red-100';
      case 'misleading': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-zinc-600 bg-culture-bg border-zinc-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle2 size={18} />;
      case 'false': return <XCircle size={18} />;
      case 'misleading': return <AlertCircle size={18} />;
      default: return <Info size={18} />;
    }
  };

  return (
    <div className="min-h-screen bg-culture-bg pt-20 pb-24 relative">
      {/* Full Visibility Header Image */}
      <div className="w-full bg-zinc-950 flex flex-col items-center justify-center pt-24 pb-32 px-6 relative overflow-hidden">
        {/* Blurred background effect to fill space gracefully */}
        <div className="absolute inset-0 opacity-30 blur-3xl scale-110">
          <img 
            src="https://i.postimg.cc/y8q4KSB0/1776652299529-afaixtx-A-0-(1).png" 
            alt="" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="relative z-20 max-w-4xl w-full"
        >
          <img 
            src="https://i.postimg.cc/y8q4KSB0/1776652299529-afaixtx-A-0-(1).png" 
            alt="Sanatani Fact Check Banner" 
            className="w-full h-auto rounded-[2rem] shadow-2xl border-4 border-white/10"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        <div className="relative z-20 mt-12 text-center">
           <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
             <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">
              Sanatani <br />
              <span className="text-brand-500">Fact Check</span>
            </h1>
            <p className="text-white/60 max-w-xl mx-auto text-sm md:text-base font-bold uppercase tracking-widest leading-relaxed">
              Research • Verification • Truth
            </p>
          </motion.div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-culture-bg to-transparent z-10" />
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-12 relative z-30">
        <div id="sanatani-bot-section" className="mb-20">
          <SanataniBot />
        </div>

        {/* Header Section (Badges only) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-xl border border-zinc-100 text-brand-600 text-xs font-black uppercase tracking-widest">
            <ShieldCheck size={14} />
            Truth Explorer Hub
          </div>
        </motion.div>

        {/* Search and Filters */}
        <div className="sticky top-24 z-30 bg-culture-bg/80 backdrop-blur-md py-6 mb-12">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-600 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder={language === 'bn' ? 'দাবি খুঁজুন...' : 'Search claims...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-16 pr-6 py-5 bg-white border-4 border-zinc-100 rounded-3xl focus:border-brand-500 outline-none transition-all font-bold placeholder:text-zinc-300 shadow-sm focus:shadow-xl"
              />
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar w-full md:w-auto">
              {(['all', 'verified', 'false', 'misleading'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                    activeFilter === filter 
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-lg' 
                    : 'bg-white text-zinc-500 border-zinc-100 hover:border-zinc-300'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Facts List */}
        <div className="grid grid-cols-1 gap-8 mb-20">
          <AnimatePresence mode="popLayout">
            {filteredFacts.map((fact, index) => (
              <motion.div
                layout
                key={fact.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="bg-white rounded-[3rem] border-4 border-zinc-100 overflow-hidden shadow-sm hover:shadow-2xl hover:border-brand-100 transition-all group"
              >
                <div className="p-8 md:p-12">
                  <div className="flex flex-wrap items-center gap-4 mb-8">
                    <span className="px-5 py-2 bg-zinc-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      {fact.category}
                    </span>
                    <div className={`flex items-center gap-2 px-5 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest ${getStatusColor(fact.status)}`}>
                      {getStatusIcon(fact.status)}
                      {fact.status}
                    </div>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-black text-zinc-900 mb-6 leading-tight group-hover:text-brand-600 transition-colors">
                    {fact.claim}
                  </h2>

                  <div className="bg-culture-bg rounded-[2rem] p-8 border border-zinc-100 mb-8">
                    <p className="text-zinc-600 font-medium leading-relaxed text-lg italic">
                      "{fact.explanation}"
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-6 pt-8 border-t border-zinc-100">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Info size={16} className="text-zinc-400" />
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Source: {fact.source}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleShare(fact)}
                        className="p-4 rounded-2xl bg-zinc-100 text-zinc-600 hover:bg-brand-50 hover:text-brand-600 transition-all"
                        title="Share Fact"
                      >
                        <Share2 size={20} />
                      </button>
                      <button 
                        onClick={() => handleDeepDive(fact.claim)}
                        className="flex items-center gap-3 px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        Deep Dive <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredFacts.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-zinc-200">
              <Search size={48} className="text-zinc-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-zinc-400">No results found for your search</h3>
              <p className="text-zinc-300 text-sm mt-2 font-medium">Try different keywords or check all categories</p>
            </div>
          )}
        </div>

        {/* Submit Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-brand-600 rounded-[4rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-brand-500/30"
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
          </div>
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto backdrop-blur-md">
              <MessageSquare size={36} />
            </div>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
              Spotted a Claim?
            </h2>
            <p className="text-brand-100 font-medium text-lg leading-relaxed">
              Found something on social media and want us to check it? Submit the claim and our research team will verify it with authentic sources.
            </p>
            <button 
              onClick={() => setShowSubmitModal(true)}
              className="px-12 py-5 bg-white text-brand-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              Submit for Check
            </button>
          </div>
        </motion.div>
      </div>

      {/* Basic Modal Implementation */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xl bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowSubmitModal(false)}
                className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-zinc-100 transition-colors"
              >
                <XCircle size={24} className="text-zinc-400" />
              </button>
              
              <h3 className="text-3xl font-black text-zinc-900 mb-4 uppercase tracking-tight">
                {submitSuccess ? 'Submitted!' : 'Submit Claim'}
              </h3>
              <p className="text-zinc-500 font-medium mb-10 text-sm">
                {submitSuccess 
                  ? 'Thank you! Our researchers will look into this shortly.' 
                  : 'Our team will research and publish the results within 48 hours.'}
              </p>
              
              {!submitSuccess && (
                <div className="space-y-6 text-left">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 block">The Claim</label>
                    <textarea 
                      value={claimText}
                      onChange={(e) => setClaimText(e.target.value)}
                      placeholder="Enter the myth or fact you want checked..."
                      className="w-full p-6 bg-culture-bg border-2 border-zinc-100 rounded-2xl focus:border-brand-500 outline-none transition-all font-bold placeholder:text-zinc-300 min-h-[150px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 block">Evidence/Link (Optional)</label>
                    <input 
                      type="text"
                      value={evidenceText}
                      onChange={(e) => setEvidenceText(e.target.value)}
                      placeholder="Where did you see this?"
                      className="w-full p-6 bg-culture-bg border-2 border-zinc-100 rounded-2xl focus:border-brand-500 outline-none transition-all font-bold placeholder:text-zinc-300"
                    />
                  </div>
                  <button 
                    disabled={isSubmitting || !claimText.trim()}
                    onClick={handleSubmitClaim}
                    className="w-full py-6 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
                    {isSubmitting ? 'Submitting...' : 'Submit for Review'}
                  </button>
                </div>
              )}

              {submitSuccess && (
                <div className="py-20 flex flex-col items-center justify-center space-y-6">
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 animate-bounce">
                    <CheckCircle2 size={48} />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
