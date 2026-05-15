import React, { useState, useEffect } from 'react';
import { useFirebase } from '../FirebaseContext';
import { useLanguage } from '../LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  MessageSquare, 
  Image as ImageIcon, 
  Video, 
  Clock,
  Send, 
  Loader2, 
  History, 
  CreditCard,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Upload,
  X,
  Plus,
  Play
} from 'lucide-react';
import { doc, onSnapshot, collection, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

interface AIResult {
  success: boolean;
  type: 'text' | 'image' | 'video' | 'image_to_image' | 'image_to_video';
  result: string;
  modelUsed: string;
  cost: number;
  remainingCredits: number;
  needsApproval?: boolean;
  message?: string;
}

interface UsageLog {
  id: string;
  task: string;
  type: string;
  cost: number;
  modelUsed: string;
  timestamp: any;
  result?: string;
}

export const AiRouterPage = () => {
  const { user } = useFirebase();
  const { t, language } = useLanguage();
  const [task, setTask] = useState('');
  const [type, setType] = useState<'auto' | 'text' | 'image' | 'video' | 'image_to_image' | 'image_to_video'>('auto');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [approvalRequest, setApprovalRequest] = useState<any>(null);
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [showApiDocs, setShowApiDocs] = useState(false);

  const [showNoCredits, setShowNoCredits] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState(0);

  useEffect(() => {
    if (!user || !db) return;
    const keyRef = doc(db, 'api_keys', user.uid);
    const unsubKey = onSnapshot(keyRef, (snap) => {
      if (snap.exists()) setApiKey(snap.data().apiKey);
    }, (err) => {
      console.warn("[Firebase] API Key read error:", err.message);
    });
    return () => unsubKey();
  }, [user]);

  const generateApiKey = async () => {
    if (!user) return;
    setIsGeneratingKey(true);
    try {
      const res = await fetch('/api/ai/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey);
        toast.success("API Key generated successfully!");
      }
    } catch (err) {
      toast.error("Failed to generate API key.");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  useEffect(() => {
    if (!pendingRequestId || !db) return;

    const reqRef = doc(db, 'pending_ai_requests', pendingRequestId);
    const unsubReq = onSnapshot(reqRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.status === 'completed') {
          setResult({
            success: true,
            type: data.type,
            result: data.result,
            modelUsed: data.modelUsed,
            cost: data.cost,
            remainingCredits: credits - data.cost
          });
          setLoading(false);
          setPendingRequestId(null);
          toast.success("Admin approved! Task completed.");
        } else if (data.status === 'denied') {
          setLoading(false);
          setPendingRequestId(null);
          toast.error("Admin denied the premium request.");
        }
      }
    });

    return () => unsubReq();
  }, [pendingRequestId, credits]);

  useEffect(() => {
    if (!user || !db) return;

    // Real-time credits listener - Check both 'users' and possibly a dedicated 'ai_credits' if exists
    // The previous implementation used 'users' collection
    const userRef = doc(db, 'users', user.uid);
    const unsubCredits = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setCredits(doc.data().credits || 0);
      } else {
        console.log("[Firebase] User profile not found for credits, defaulting to 0");
        setCredits(0);
      }
    }, (err) => {
      console.error("[Firebase] Credits read permission error:", err.message);
    });

    // Recent usage logs listener
    const usageRef = collection(db, 'usage');
    const q = query(
      usageRef, 
      where('userId', '==', user.uid), 
      orderBy('timestamp', 'desc'), 
      limit(10)
    );
    const unsubLogs = onSnapshot(q, (snapshot) => {
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UsageLog[];
      setLogs(newLogs);
    }, (err) => {
       console.warn("[Firebase] Usage logs read error:", err.message);
       if (err.message.toLowerCase().includes("permission") || err.message.toLowerCase().includes("index")) {
         console.log("[Firebase] Attempting fallback simple query for logs...");
         const simpleQ = query(usageRef, where('userId', '==', user.uid), limit(10));
         onSnapshot(simpleQ, (snap) => {
            setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })) as UsageLog[]);
         }, (err2) => {
            console.error("[Firebase] Fallback query failed:", err2.message);
         });
       }
    });

    return () => {
      unsubCredits();
      unsubLogs();
    };
  }, [user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setInputImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const calculateCost = () => {
    if (type === 'text') return 1;
    if (type === 'image') return 15;
    if (type === 'image_to_image') return 20;
    if (type === 'video') return 50;
    if (type === 'image_to_video') return 45;
    return 1; // Default
  };

  const handleTopUp = () => {
    let botUser = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '').trim().replace('@', '');
    
    // Safety fallback
    if (!botUser || botUser.toLowerCase() === 'undefined' || botUser.toLowerCase() === 'null' || botUser === '') {
      botUser = 'Vamshavali_bot';
    }
    
    console.log(`[TopUp] Redirecting to bot: ${botUser}`);
    const url = `https://t.me/${botUser}`;
    
    // Use an anchor tag for better reliability in some browsers
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (isApproved = false) => {
    if (!user) {
      toast.error('Please login to use AI Router');
      return;
    }
    if (!task.trim() && type !== 'image_to_video') {
       toast.error('Please describe your task or prompt');
       return;
    }

    const estimatedCost = calculateCost();
    if (credits < estimatedCost && !isApproved) {
      setRequiredCredits(estimatedCost);
      setShowNoCredits(true);
      return;
    }

    setLoading(true);
    setResult(null);
    setApprovalRequest(null);
    setShowNoCredits(false);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          task,
          type,
          inputImage,
          approved: isApproved
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      if (data.needsApproval) {
        setApprovalRequest(data);
        toast.info(data.message);
      } else if (data.pending) {
        setPendingRequestId(data.requestId);
        toast.info("Waiting for developer approval...");
      } else {
        setResult(data);
        setTask('');
        toast.success(`Success! Deducted ${data.cost} credits.`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mb-6">
          <Zap size={40} className="text-brand-600" />
        </div>
        <h1 className="text-3xl font-black text-zinc-900 uppercase tracking-tight mb-4">
          Personal AI Hub
        </h1>
        <p className="text-zinc-500 font-bold max-w-sm mb-8">
          Unlock powerful AI tools for text, images, and video. Please login to manage your credits.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 lg:px-8">
      {/* Insufficient Credits Modal */}
      <AnimatePresence>
        {showNoCredits && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-brand-500" />
              <button 
                onClick={() => setShowNoCredits(false)}
                className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X size={20} className="text-zinc-400" />
              </button>

              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CreditCard size={40} className="text-amber-500" />
              </div>

              <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mb-4">
                Insufficient Credits
              </h3>
              
              <p className="text-zinc-500 font-bold mb-8">
                This task requires <span className="text-brand-600">{requiredCredits} credits</span>, but you only have <span className="text-zinc-900">{credits}</span>. Please top up to continue.
              </p>

              <div className="space-y-4">
                <button
                  onClick={handleTopUp}
                  className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-500/20"
                >
                  <MessageSquare size={18} />
                  Top Up via Barnali Bot
                </button>
                <button
                  onClick={() => setShowNoCredits(false)}
                  className="w-full py-4 bg-zinc-100 text-zinc-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-zinc-200 transition-all"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100">
            <div className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
            <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Router Protection Active</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-zinc-900 uppercase tracking-tighter leading-none">
            Intelligent <br /> <span className="text-brand-600">Assistant</span>
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-lg w-fit">
            <CheckCircle2 size={12} className="text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">Protecting Developer API Budget</span>
          </div>
          <p className="text-zinc-500 font-bold max-w-xl">
            Access world-class AI models. We prioritize free and economy models to save you real-world costs. Premium models require your manual approval.
          </p>
        </div>

        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border-2 border-zinc-900 shadow-[8px_8px_0px_rgba(24,24,27,1)] flex flex-col sm:flex-row items-center gap-8 min-w-[320px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
          <div className="relative z-10 w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/5">
            <Zap size={32} className="text-brand-400" />
          </div>
          <div className="relative z-10 flex-1 text-center sm:text-left">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-2">Barnali Wallet Balance</p>
            <div className="flex items-baseline justify-center sm:justify-start gap-2">
              <span className="text-5xl font-black text-white tracking-tighter">{credits}</span>
              <span className="text-sm font-black text-brand-400 uppercase tracking-widest">CR</span>
            </div>
          </div>
          <button 
            onClick={() => toast.info("Contact Barnali on Telegram to buy credits via GPay/PhonePe.")}
            className="relative z-10 px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-brand-500/20 active:scale-95 whitespace-nowrap"
          >
            Add Credits
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Interface */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[3rem] p-8 border border-zinc-200 shadow-xl shadow-zinc-200/50">
            <div className="flex flex-wrap gap-3 mb-8">
              {[
                { id: 'auto', icon: Zap, label: 'Auto Detect' },
                { id: 'text', icon: MessageSquare, label: 'Text/Chat' },
                { id: 'image', icon: ImageIcon, label: 'Flux Image' },
                { id: 'image_to_image', icon: Plus, label: 'Img 2 Img' },
                { id: 'video', icon: Video, label: 'Video Gen' },
                { id: 'image_to_video', icon: Play, label: 'Img 2 Video' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id as any)}
                  className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    type === t.id 
                    ? 'bg-zinc-900 text-white shadow-lg' 
                    : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'
                  }`}
                >
                  <t.icon size={16} />
                  {t.label}
                </button>
              ))}
            </div>

            {(type === 'image_to_image' || type === 'image_to_video') && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Base Image Resource</p>
                   {inputImage && (
                     <button 
                       onClick={() => setInputImage(null)}
                       className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-all"
                     >
                       <X size={14} />
                     </button>
                   )}
                </div>
                
                {!inputImage ? (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-200 rounded-[2rem] bg-zinc-50 cursor-pointer hover:bg-zinc-100 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-zinc-300 group-hover:text-brand-500 transition-all" />
                      <p className="mb-2 text-sm text-zinc-500 font-bold uppercase tracking-tight">Click to upload base image</p>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest">PNG, JPG or WebP (MAX. 5MB)</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                ) : (
                  <div className="relative rounded-[2rem] overflow-hidden border-2 border-brand-500/20 shadow-lg group">
                    <img src={inputImage} alt="Base" className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                       <p className="text-white font-black text-[10px] uppercase tracking-widest">Image Ready</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder={
                  type === 'image_to_video' 
                  ? "Describe motion... (optional, e.g. 'Slow cinematic zoom in')" 
                  : type === 'image_to_image'
                  ? "How should we change the image? (e.g. 'Make it a winter theme')"
                  : "Describe your task... (e.g., 'Write a poem about Barnia' or 'A futuristic city in the mountains')"
                }
                className="w-full h-48 bg-zinc-50 rounded-[2rem] p-8 text-lg font-bold text-zinc-900 placeholder:text-zinc-300 border-none focus:ring-4 focus:ring-brand-100 transition-all resize-none"
              />
              <button
                onClick={() => handleSubmit()}
                disabled={loading || (!task.trim() && type !== 'image_to_video')}
                className="absolute bottom-6 right-6 px-10 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/30 disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    Run Task
                  </>
                )}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {pendingRequestId && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 rounded-[3rem] p-12 border-2 border-amber-200 border-dashed text-center space-y-4"
              >
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                   <Clock size={32} className="text-amber-600" />
                </div>
                <h3 className="text-xl font-black text-amber-900 uppercase">Approval Pending</h3>
                <p className="text-amber-700 font-medium max-w-md mx-auto">
                  Your premium request has been sent to the developer for budget verification. 
                  Once approved, it will automatically execute.
                </p>
                <div className="flex items-center justify-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                  <Loader2 size={12} className="animate-spin" />
                  Monitoring real-time response from router
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[3rem] p-8 border-2 border-emerald-500/20 shadow-xl overflow-hidden"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Result From {result.modelUsed}</p>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Generated in {result.type} mode</p>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-zinc-50 rounded-xl font-black text-[10px] text-zinc-500 uppercase tracking-widest">
                    Cost: {result.cost} Cr
                  </div>
                </div>

                <div className="prose prose-zinc max-w-none">
                  {result.type === 'image' || result.type === 'video' || result.type === 'image_to_image' || result.type === 'image_to_video' ? (
                    <div className="rounded-[2rem] overflow-hidden border border-zinc-100 shadow-inner">
                      {(result.type === 'image' || result.type === 'image_to_image') ? (
                        <img src={result.result} alt="Generated AI Content" className="w-full h-auto" />
                      ) : (
                        <video src={result.result} controls className="w-full h-auto" />
                      )}
                    </div>
                  ) : (
                    <div className="bg-zinc-50 p-8 rounded-[2rem] text-zinc-800 font-medium leading-relaxed whitespace-pre-wrap">
                      {result.result}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={() => {
                       navigator.clipboard.writeText(result.result);
                       toast.success('Copied to clipboard!');
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-zinc-100 rounded-xl font-bold text-xs text-zinc-600 hover:bg-zinc-200 transition-all"
                  >
                    Copy Link/Text
                  </button>
                </div>
              </motion.div>
            )}

            {approvalRequest && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900 rounded-[3rem] p-10 text-center space-y-8"
              >
                <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto">
                   <AlertCircle size={40} className="text-brand-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Premium Task Detected</h3>
                  <p className="text-zinc-400 font-medium">{approvalRequest.message}</p>
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setApprovalRequest(null)}
                    className="px-10 py-4 bg-zinc-800 text-zinc-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-zinc-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmit(true)}
                    className="px-10 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20"
                  >
                    Approve & Run
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[3rem] p-8 border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <History size={18} className="text-zinc-400" />
                <h2 className="font-black text-xs uppercase tracking-widest text-zinc-900">Recent Activity</h2>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>

            <div className="space-y-6">
              {logs.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-zinc-300 font-bold text-xs uppercase tracking-widest">No activity yet</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="group relative">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        (log.type === 'image' || log.type === 'image_to_image') ? 'bg-blue-50 text-blue-600' :
                        (log.type === 'video' || log.type === 'image_to_video') ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {(log.type === 'image' || log.type === 'image_to_image') ? <ImageIcon size={18} /> : 
                         (log.type === 'video' || log.type === 'image_to_video') ? <Video size={18} /> : 
                         <MessageSquare size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-zinc-900 truncate uppercase tracking-tight">{log.task}</p>
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest flex items-center gap-2">
                          {log.modelUsed} • {log.cost} Cr
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-zinc-300 group-hover:text-zinc-900 transition-all" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-zinc-950 rounded-[3rem] p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700">
               <Zap size={120} />
            </div>
            <div className="relative z-10 space-y-6">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                 <AlertCircle size={24} className="text-brand-500" />
               </div>
               <h3 className="text-xl font-black uppercase tracking-tight">Need More Credits?</h3>
               <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                 AI Router uses pay-as-you-go credits. 1 text request costs 1 credit. Images and video cost more due to high GPU usage.
               </p>
               <button className="w-full py-4 bg-white text-zinc-950 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-500 hover:text-white transition-all">
                 View Pricing Plans
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* API Integration Section - NEW */}
      <div className="mt-20 pt-16 border-t border-zinc-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-4">
              <ExternalLink size={32} className="text-brand-600" />
              Professional API Access
            </h2>
            <p className="text-zinc-500 font-medium text-lg">Integrate Barnia AI into your own projects with a single key.</p>
          </div>
                   {!apiKey ? (
            <div className="flex items-center gap-6">
              <div className="hidden md:block text-right">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Status</p>
                <p className="text-sm font-black text-amber-500 uppercase">Inactive</p>
              </div>
              <button 
                onClick={generateApiKey}
                disabled={isGeneratingKey}
                className="px-10 py-5 bg-zinc-900 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-3 disabled:opacity-50 shadow-2xl shadow-zinc-200 active:scale-95"
              >
                {isGeneratingKey ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                Provision v1 API Key
              </button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-6">
               <div className="text-right hidden md:block">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Infrastructure</p>
                <p className="text-sm font-black text-emerald-500 uppercase">Scalable Ready</p>
              </div>
              <div className="px-8 py-5 bg-zinc-50 rounded-[2rem] border-2 border-zinc-900 flex items-center gap-6 shadow-[8px_8px_0px_rgba(24,24,27,0.05)] group">
                <div className="flex flex-col">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">X-BARNALI-KEY</p>
                  <code className="text-sm font-mono text-zinc-900 font-bold">{apiKey}</code>
                </div>
                <button 
                  onClick={() => { navigator.clipboard.writeText(apiKey); toast.success("Copied to clipboard!"); }}
                  className="p-3 bg-white border border-zinc-200 hover:bg-zinc-900 hover:text-white rounded-xl transition-all shadow-sm active:scale-90"
                >
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* n8n Documentation */}
          <div className="bg-white rounded-[3rem] p-10 border border-zinc-200 shadow-sm space-y-8">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                 <Zap size={24} className="text-amber-500" />
               </div>
               <div>
                 <h3 className="text-xl font-black text-zinc-900 uppercase">n8n Automation Guide</h3>
                 <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Connect to 1000+ apps</p>
               </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                <p className="text-sm text-zinc-600 font-medium">Add an <b>HTTP Request</b> node in your n8n workflow.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                <p className="text-sm text-zinc-600 font-medium">Set URL to: <code className="bg-zinc-50 px-2 py-1 rounded text-brand-600 uppercase text-[10px]">{window.location.origin}/api/v1/ai</code></p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                <p className="text-sm text-zinc-600 font-medium">Add Header: <code className="bg-zinc-50 px-2 py-1 rounded text-zinc-900 text-[10px]">x-api-key</code> = your key.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-black shrink-0">4</div>
                <div className="flex-1">
                  <p className="text-sm text-zinc-600 font-medium mb-3">Send Body (JSON):</p>
                  <pre className="bg-zinc-50 p-4 rounded-2xl text-[11px] font-mono text-zinc-600">
{`{
  "task": "Translate 'Hello' to Bengali",
  "type": "text"
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Code Example */}
          <div className="bg-zinc-950 rounded-[3rem] p-10 text-white space-y-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-[100px] -mr-32 -mt-32" />
             
             <div className="flex items-center gap-4 relative z-10">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                 <Play size={24} className="text-brand-500" />
               </div>
               <div>
                 <h3 className="text-xl font-black uppercase">Developer Example</h3>
                 <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Standard Curl / Python / JS</p>
               </div>
             </div>

             <div className="relative z-10 space-y-6">
               <div className="bg-zinc-900 rounded-2xl p-6 border border-white/5 font-mono text-[11px] leading-relaxed text-zinc-400 overflow-x-auto">
                 <p className="text-brand-500 mb-2"># Image Generation Request</p>
{`curl -X POST ${window.location.origin}/api/v1/ai \\
  -H "x-api-key: ${apiKey || 'YOUR_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task": "A futuristic Bengali village",
    "type": "image"
  }'`}
               </div>
               
               <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl">
                 <div className="flex gap-3">
                   <AlertCircle size={18} className="text-amber-500 shrink-0" />
                   <p className="text-[11px] text-amber-200/80 font-medium leading-relaxed">
                     <b className="text-amber-500 uppercase">Safety Net:</b> Premium requests (Flux, Kling) costing {`>= 15`} credits trigger a 
                     <code className="bg-white/10 px-1 rounded text-white mx-1 text-[10px]">pending</code> status. These must be approved 
                     by the developer to protect your credit balance from accidental spikes.
                   </p>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
