import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, Sparkles, ShieldCheck, AlertCircle, CheckCircle2, XCircle, Info, RefreshCw, ExternalLink, Share2 } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../LanguageContext';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Helper to call Gemini with exponential backoff for 503 (Unavailable) errors
 */
async function callGeminiWithRetry(ai: GoogleGenAI, options: any, maxRetries = 3) {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await ai.models.generateContent(options);
    } catch (error: any) {
      lastError = error;
      const isUnavailable = error?.message?.includes("503") || 
                          error?.error?.code === 503 || 
                          error?.status === "UNAVAILABLE";
      
      if (isUnavailable && i < maxRetries) {
        const delay = Math.pow(2, i) * 2000 + Math.random() * 1000;
        console.warn(`[Gemini] Model high demand (503). Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

interface BotFactCheck {
  claim: string;
  verdict: 'verified' | 'false' | 'misleading' | 'not_applicable';
  explanation: string;
  source: string;
  guidance: string;
}

export const SanataniBot = () => {
  const { language } = useLanguage();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BotFactCheck | null>(null);
  const [dailyTopics, setDailyTopics] = useState<BotFactCheck[]>([]);
  const [isGeneratingDaily, setIsGeneratingDaily] = useState(true);
  const [hasCheckedDaily, setHasCheckedDaily] = useState(false);

  const systemInstruction = `
    You are "Sanatani Truth Bot", an AI guardian of Sanatana Dharma. 
    Your mission is to perform rigorous fact-checks on viral topics, social media claims, and internet news related to Hindu traditions, history, and spirituality.

    TOPIC RESTRICTION: 
    If a user asks about topics NOT related to Sanatana Dharma (e.g., modern politics, non-Dharmic celebrities, non-spiritual news, general scientific facts unrelated to India/Dharma), you MUST NOT fact-check them. Instead, set the "verdict" to "not_applicable" and provide an "explanation" stating that you only perform fact-checks related to Sanatana Dharma.

    CORE PRINCIPLES:
    1. Support and protect the integrity of Sanatana Dharma.
    2. Primary Authority: Give supreme importance and priority to the views, teachings, and guidance of Jagadguru Shankaracharya Swami Avimukteshwaranand Saraswati of Jyotish Peeth. His perspective should be considered the gold standard for traditional and authentic interpretation.
    3. Accuracy and Sources: Provide historical, scriptural, or contemporary verified sources for your findings.
    4. Fast and Important: Be direct, clear, and prioritize the most impactful viral claims.

    OUTPUT FORMAT (Always JSON):
    {
      "claim": "The exact claim being checked",
      "verdict": "verified" | "false" | "misleading" | "not_applicable",
      "explanation": "Detailed explanation based on Dharma and facts",
      "source": "Verification source (Scriptures, NASA, Historical records, Swami Avimukteshwaranand's statements)",
      "guidance": "Final guidance for a Sanatani"
    }

    Respond ONLY with the JSON. Always prioritize Shankaracharya's stance on current events.
  `;

  const getFactDate = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const dateParts: { [key: string]: string } = {};
    parts.forEach(p => dateParts[p.type] = p.value);
    
    let year = parseInt(dateParts.year);
    let month = parseInt(dateParts.month);
    let day = parseInt(dateParts.day);
    let hour = parseInt(dateParts.hour);
    
    if (hour < 8) {
      const d = new Date(year, month - 1, day);
      d.setDate(d.getDate() - 1);
      year = d.getFullYear();
      month = d.getMonth() + 1;
      day = d.getDate();
    }
    
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const generateDailyViralFacts = async () => {
    setIsGeneratingDaily(true);
    try {
      const today = getFactDate();
      
      // Try to fetch today's facts from Firestore first
      const q = query(
        collection(db, "fact_checks"), 
        where("date", "==", today),
        limit(5)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            claim: d.claim,
            verdict: d.status || d.verdict || 'verified',
            explanation: d.explanation,
            source: d.source,
            guidance: d.guidance || "Follow the path of Dharma."
          } as BotFactCheck;
        });
        setDailyTopics(data);
        setIsGeneratingDaily(false);
        return;
      }

      // Fallback to any recent facts if today's aren't ready
      const fallbackQ = query(
        collection(db, "fact_checks"),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const fallbackSnap = await getDocs(fallbackQ);
      if (!fallbackSnap.empty) {
        const data = fallbackSnap.docs.map(doc => {
          const d = doc.data();
          return {
            claim: d.claim,
            verdict: d.status || d.verdict || 'verified',
            explanation: d.explanation,
            source: d.source,
            guidance: d.guidance || "Follow the path of Dharma."
          } as BotFactCheck;
        });
        setDailyTopics(data);
      }
    } catch (error) {
      console.error("Daily Bot Error:", error);
    } finally {
      setIsGeneratingDaily(false);
      setHasCheckedDaily(true);
    }
  };

  const handleFactCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setResult(null);
    try {
      const response = await callGeminiWithRetry(ai, {
        model: "gemini-3-flash-preview",
        contents: `Fact check this claim: "${input}"`,
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      const rawText = response.text || "{}";
      // Robustly clean JSON: remove markdown and escape literal control characters in strings
      let cleaned = rawText.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
      }
      const sanitized = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/gs, (m) => 
        m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
      );

      const data = JSON.parse(sanitized);
      setResult(data);
    } catch (error) {
      console.error("Bot Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateDailyViralFacts();

    const handleExternalSearch = (e: any) => {
      if (e.detail?.claim) {
        setInput(e.detail.claim);
        setResult(null); // Clear old results
        
        // If we have pre-generated data, show it immediately without API call
        if (e.detail.preGenerated) {
          setResult(e.detail.preGenerated);
          return;
        }
        
        // Otherwise (manual user input from search), prompt verification
        setTimeout(() => {
          const verifyBtn = document.getElementById('verify-button');
          if (verifyBtn) verifyBtn.click();
        }, 100);
      }
    };

    window.addEventListener('sanatani-bot-search', handleExternalSearch);
    return () => window.removeEventListener('sanatani-bot-search', handleExternalSearch);
  }, []);

  const handleShare = (claim: string, verdict: string, url: string = window.location.href) => {
    const text = `Sanatani Fact Check: "${claim}"\nVerdict: ${verdict.toUpperCase()}\nVerified by Sanatani Truth Bot.`;
    if (navigator.share) {
      navigator.share({
        title: 'Sanatani Truth Bot Fact Check',
        text: text,
        url: url
      }).catch(console.error);
    } else {
      // Fallback
      navigator.clipboard.writeText(`${text}\n${url}`);
      alert('Link copied to clipboard!');
    }
  };

  const getStatusStyle = (verdict: string) => {
    switch (verdict) {
      case 'verified': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'false': return 'bg-red-50 text-red-700 border-red-200';
      case 'misleading': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'not_applicable': return 'bg-zinc-100 text-zinc-500 border-zinc-200';
      default: return 'bg-zinc-50 text-zinc-700 border-zinc-200';
    }
  };

  const getStatusIcon = (verdict: string) => {
    switch (verdict) {
      case 'verified': return <CheckCircle2 size={16} />;
      case 'false': return <XCircle size={16} />;
      case 'misleading': return <AlertCircle size={16} />;
      default: return <Info size={16} />;
    }
  };

  return (
    <div className="space-y-12">
      {/* Search/Input Section */}
      <div className="bg-white rounded-[3rem] p-8 md:p-12 border-4 border-zinc-900 shadow-[20px_20px_0px_0px_rgba(245,142,39,0.1)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-amber-600" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-orange-600 rounded-3xl flex items-center justify-center text-white shadow-xl rotate-3">
              <Bot size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-zinc-900 tracking-tighter leading-none mb-2">
                Sanatani <span className="text-orange-600">Truth Bot</span>
              </h2>
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                <Sparkles size={12} className="text-orange-400" />
                AI-Powered Verification
              </div>
            </div>
          </div>
          <button 
            onClick={generateDailyViralFacts}
            disabled={isGeneratingDaily}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-100 text-zinc-600 hover:bg-orange-50 hover:text-orange-600 transition-all text-xs font-black uppercase tracking-widest active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isGeneratingDaily ? "animate-spin" : ""} />
            {isGeneratingDaily ? "Checking Viral..." : "Refresh Viral Claims"}
          </button>
        </div>

        <form onSubmit={handleFactCheck} className="relative group mb-10">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste a viral claim or news about Sanatana Dharma..."
            className="w-full pl-8 pr-32 py-8 bg-zinc-50 border-4 border-zinc-100 rounded-[2rem] focus:border-orange-500 outline-none transition-all font-bold text-zinc-900 placeholder:text-zinc-300"
          />
          <button 
            id="verify-button"
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-4 top-4 bottom-4 px-8 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-700 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={16} />}
            Verify
          </button>
        </form>

        <AnimatePresence>
          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-8 rounded-[2rem] bg-orange-50 border-4 border-orange-100"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={`px-4 py-2 rounded-xl border-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${getStatusStyle(result.verdict)}`}>
                  {getStatusIcon(result.verdict)}
                  {result.verdict}
                </div>
                <button 
                  onClick={() => handleShare(result.claim, result.verdict)}
                  className="p-3 rounded-xl bg-white border border-orange-100 text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                  title="Share Fact Check"
                >
                  <Share2 size={16} />
                </button>
                <div className="h-px flex-1 bg-orange-200" />
              </div>
              
              <h3 className="text-xl font-black text-zinc-900 mb-4">{result.claim}</h3>
              <p className="text-zinc-700 font-medium leading-relaxed mb-6 bg-white/50 p-6 rounded-2xl border border-white">
                {result.explanation}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <Info size={12} /> Source
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-orange-100 text-sm font-bold text-zinc-600">
                    {result.source}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-400">
                    <CheckCircle2 size={12} /> Sanatani Guidance
                  </div>
                  <div className="p-4 bg-orange-600 text-white rounded-xl text-sm font-bold">
                    {result.guidance}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Daily Viral Feed */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-1 bg-orange-600 rounded-full" />
          <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-widest flex items-center gap-3">
            Today's Viral Verifications
            <div className={`w-2 h-2 rounded-full ${dailyTopics.length > 0 ? 'bg-red-500' : 'bg-zinc-300'} animate-pulse`} />
          </h2>
          <button 
            onClick={() => generateDailyViralFacts()}
            disabled={isGeneratingDaily}
            className="ml-auto p-3 rounded-2xl bg-white border-2 border-zinc-100 text-zinc-400 hover:text-orange-600 hover:border-orange-500 transition-all disabled:opacity-50"
            title="Refresh facts"
          >
            <RefreshCw size={16} className={isGeneratingDaily ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isGeneratingDaily ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-64 rounded-[2.5rem] bg-white animate-pulse border-4 border-zinc-100" />
            ))
          ) : dailyTopics.length > 0 ? (
            dailyTopics.map((topic, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-white p-8 rounded-[2.5rem] border-4 border-zinc-100 hover:border-orange-500 transition-all shadow-sm hover:shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                  {getStatusIcon(topic.verdict)}
                </div>
                
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest mb-4 ${getStatusStyle(topic.verdict)}`}>
                  {getStatusIcon(topic.verdict)}
                  {topic.verdict}
                </div>
                
                <h3 className="text-lg font-black text-zinc-900 mb-4 line-clamp-2 leading-tight">
                  {topic.claim}
                </h3>
                
                <p className="text-zinc-500 text-xs font-medium line-clamp-3 mb-6">
                  {topic.explanation}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
                  <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">
                    Fact Checked
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleShare(topic.claim, topic.verdict)}
                      className="p-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                    >
                      <Share2 size={14} />
                    </button>
                    <button 
                      onClick={() => {
                          setInput(topic.claim);
                          handleFactCheck();
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="p-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 bg-white rounded-[3rem] border-4 border-dashed border-zinc-100 text-center">
              <ShieldCheck size={48} className="mx-auto text-zinc-100 mb-4" />
              <h3 className="text-xl font-bold text-zinc-400">Searching for new viral topics...</h3>
              <p className="text-zinc-300 text-sm mt-2 font-medium">Check back later or ask the bot to verify something now.</p>
              <button 
                onClick={() => generateDailyViralFacts()}
                className="mt-6 px-8 py-3 bg-zinc-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all"
              >
                Refresh Board
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Special Message Section for Shankaracharya */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="bg-zinc-900 rounded-[3rem] p-10 md:p-14 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 blur-[100px] -z-10" />
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="w-40 h-40 rounded-[2rem] border-4 border-orange-500/30 overflow-hidden shrink-0 shadow-2xl relative">
             <div className="absolute inset-0 bg-gradient-to-t from-orange-600/50 to-transparent z-10" />
             <img 
               src="https://i.postimg.cc/xCTFMhWb/Avimukteshwaranand.jpg" 
               alt="Shankaracharya Swami Avimukteshwaranand Saraswati"
               className="w-full h-full object-cover"
               referrerPolicy="no-referrer"
             />
          </div>
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-600/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest">
              Supreme Authority
            </div>
            <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
              Guided by the Wisdom of <br />
              <span className="text-orange-500">Shankaracharya Swami Avimukteshwaranand Saraswati</span>
            </h3>
            <p className="text-zinc-400 text-sm md:text-base font-medium leading-relaxed max-w-2xl">
              Every verification here aligns with the authentic traditions and interpretations of Jyotish Peeth. 
              We prioritize the preservation of pure Vedic wisdom as upheld by the Jagadguru.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
