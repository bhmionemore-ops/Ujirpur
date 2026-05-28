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
  Play,
  Info
} from 'lucide-react';
import { doc, onSnapshot, collection, query, where, orderBy, limit, addDoc, updateDoc } from 'firebase/firestore';
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
  const [selectedModel, setSelectedModel] = useState<string>('default');

  const getModelsForType = (currentType: 'auto' | 'text' | 'image' | 'video' | 'image_to_image' | 'image_to_video') => {
    if (currentType === 'image' || currentType === 'image_to_image') {
      return [
        { id: 'flux-schnell', name: 'Flux Schnell (OpenRouter)', cost: 10, description: 'Default budget image model, fast and beautiful.' },
        { id: 'image-01', name: 'MiniMax image-01', cost: 15, description: 'Super premium highly artistic detail image model.' },
      ];
    }
    if (currentType === 'video' || currentType === 'image_to_video') {
      return [
        { id: 'minimax-video-01', name: 'MiniMax Video-01 (OpenRouter)', cost: 65, description: 'Standard high-definition video generation model.' },
        { id: 'minimax-hailuo-02-6s', name: 'MiniMax-Hailuo-02 6s', cost: 65, description: 'Next-generation hyper-realistic motion video (6s, 512P).' },
        { id: 'minimax-hailuo-02-10s', name: 'MiniMax-Hailuo-02 10s', cost: 85, description: 'Next-generation hyper-realistic motion video (10s, 512P).' },
      ];
    }
    return [];
  };

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

  // Billing & Payment States
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<{ id: string; name: string; credits: number; price: string } | null>(null);
  const [paymentStep, setPaymentStep] = useState<'details' | 'processing' | 'success'>('details');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardName, setCardName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [paymentProcessingMsg, setPaymentProcessingMsg] = useState('Initiating secure payment gateway...');

  const handleOpenCheckout = (pkg: { id: string; name: string; credits: number; price: string }) => {
    setSelectedPackage(pkg);
    setPaymentStep('details');
    setCardNumber('');
    setCardExpiry('');
    setCardCVC('');
    setCardName('');
    setBillingEmail(user?.email || '');
    setBillingModalOpen(true);
  };

  const handleSimulatePayment = async () => {
    if (!selectedPackage || !user) return;
    const cleanCard = cardNumber.replace(/\s+/g, '');
    if (!cardNumber || cleanCard.length < 16) {
      toast.error('Please enter a valid 16-digit card number.');
      return;
    }
    if (cleanCard !== '4242424242424242') {
      toast.error('Sandbox Authorization Denied: For security and compliance, you must use the official Stripe Test Card "4242 4242 4242 4242" to complete this simulation.');
      return;
    }
    if (!cardExpiry || !cardExpiry.includes('/')) {
      toast.error('Please enter a valid card expiry date (MM/YY).');
      return;
    }
    if (!cardCVC || cardCVC.length < 3) {
      toast.error('Please enter a valid CVC/CVV.');
      return;
    }
    if (!cardName.trim()) {
      toast.error('Please enter the name on the card.');
      return;
    }

    setPaymentStep('processing');
    
    const pipeline = [
      'Establishing TLS tunnel with payment acquirer...',
      'Encrypting card parameters using AES-256-GCM...',
      'Querying secure 3D-Secure level-2 authorization servers...',
      'Authorizing credit disbursement to local sandbox ledger...',
      'Generating receipt and writing token ledger...'
    ];

    for (let i = 0; i < pipeline.length; i++) {
      setPaymentProcessingMsg(pipeline[i]);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    try {
      setPaymentStep('success');
      toast.success(`Sandbox checkout simulated successfully! (No actual credits added in demo mode)`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Simulation failed: ${err.message}`);
      setPaymentStep('details');
    }
  };

  useEffect(() => {
    if (!user || !db) return;
    const userDocId = user.email ? user.email.toLowerCase().trim() : user.uid;
    const keyRef = doc(db, 'api_keys', userDocId);
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
      const userDocId = user.email ? user.email.toLowerCase().trim() : user.uid;
      const res = await fetch('/api/ai/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userDocId })
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
    const userDocId = user.email ? user.email.toLowerCase().trim() : user.uid;
    const userRef = doc(db, 'users', userDocId);
    const unsubCredits = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const cVal = doc.data().credits;
        setCredits(cVal !== undefined ? cVal : 0);
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
      where('userId', '==', userDocId), 
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
    if (type === 'image' || type === 'image_to_image') {
      if (selectedModel === 'image-01' || selectedModel.includes('minimax')) {
        return 15;
      }
      return 10;
    }
    if (type === 'video' || type === 'image_to_video') {
      if (selectedModel === 'minimax-hailuo-02-10s') {
        return 85;
      }
      return 65;
    }
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
    // No cost restrictions in this version

    setLoading(true);
    setResult(null);
    setApprovalRequest(null);
    setShowNoCredits(false);

    try {
      const userDocId = user.email ? user.email.toLowerCase().trim() : user.uid;
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userDocId,
          task,
          type,
          inputImage,
          approved: isApproved,
          model: selectedModel
        })
      });

      let data: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        console.warn("[AIRouterPage] Response is not JSON:", textResponse.slice(0, 300));
      }

      if (!response.ok) {
        throw new Error(data?.error || `Request failed with status ${response.status}`);
      }

      if (!data) {
        throw new Error("Invalid response description received from AI Router.");
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
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-zinc-900 uppercase tracking-tighter leading-none">
            Intelligent <br /> <span className="text-brand-600">Assistant</span>
          </h1>
          <p className="text-zinc-500 font-bold max-w-xl">
            Access world-class AI models. High-performance models are available for free to all verified community members.
          </p>
        </div>

        <div className="bg-zinc-950 p-8 rounded-[2.5rem] border-2 border-zinc-900 shadow-[8px_8px_0px_rgba(24,24,27,1)] flex flex-col sm:flex-row items-center gap-8 min-w-[320px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/15 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
          <div className="relative z-10 w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-brand-500/30">
            <CreditCard size={32} className="text-brand-400 animate-pulse" />
          </div>
          <div className="relative z-10 flex-1 text-center sm:text-left">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-2">Available Credits</p>
            <div className="flex items-baseline justify-center sm:justify-start gap-2">
              <span className="text-4xl font-black text-white tracking-tighter uppercase font-mono">{credits} CR</span>
            </div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1.5 flex items-center justify-center sm:justify-start gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Real-time Sync
            </p>
          </div>
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
                  onClick={() => {
                    const newType = t.id as any;
                    setType(newType);
                    const models = getModelsForType(newType);
                    if (models.length > 0) {
                      setSelectedModel(models[0].id);
                    } else {
                      setSelectedModel('default');
                    }
                  }}
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

            {/* Model Selection Option Grid */}
            {getModelsForType(type).length > 0 && (
              <div className="mb-8 border border-zinc-150 rounded-[2.5rem] p-6 bg-zinc-50/50">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Target Generation Model</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {getModelsForType(type).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={`flex flex-col text-left p-5 rounded-3xl border-2 transition-all cursor-pointer ${
                        selectedModel === m.id
                          ? 'border-brand-500 bg-white shadow-lg shadow-brand-500/5'
                          : 'border-transparent bg-white/70 hover:bg-white hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5 gap-2">
                        <span className="font-extrabold text-xs text-zinc-900">{m.name}</span>
                        <span className={`font-mono font-black text-[8px] uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${
                          selectedModel === m.id
                            ? 'bg-brand-50 text-brand-500'
                            : 'bg-zinc-100 text-zinc-400'
                        }`}>
                          {m.cost} Cr
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-bold leading-relaxed">{m.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

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

          {/* AI Credits Billing Central */}
          <div className="bg-white rounded-[3rem] p-8 border border-zinc-200 shadow-xl shadow-zinc-200/50 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <CreditCard size={20} className="text-brand-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">AI Credits Billing</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Instant Top-Up Ledger</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { id: 'starter', name: 'Starter Pack', credits: 100, price: '₹100 ($1.20)', desc: '100 queries or 10 images' },
                { id: 'pro', name: 'Standard Booster', credits: 500, price: '₹450 ($5.40)', desc: '50 videos or 500 queries', popular: true },
                { id: 'enterprise', name: 'Power Pack', credits: 2000, price: '₹1,500 ($18.00)', desc: 'Bulk credit balance with 25% extra' },
              ].map((pkg) => (
                <div 
                  key={pkg.id} 
                  className={`p-4 rounded-3xl border-2 transition-all relative ${
                    pkg.popular 
                    ? 'border-zinc-900 bg-zinc-50/50 hover:shadow-lg' 
                    : 'border-zinc-100 hover:border-zinc-200 hover:shadow-md bg-white'
                  }`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2.5 right-6 px-2.5 py-0.5 bg-zinc-900 text-white text-[8px] font-black uppercase tracking-widest rounded-full">
                      Most Popular
                    </span>
                  )}
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="text-xs font-black text-zinc-900 uppercase tracking-tight">{pkg.name}</p>
                      <p className="text-[10px] text-zinc-400 font-medium">{pkg.desc}</p>
                    </div>
                    <p className="text-xs font-black text-brand-600 font-mono text-right">{pkg.price}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-black text-zinc-800 bg-zinc-100 px-2.5 py-1 rounded-full">
                      +{pkg.credits} CR
                    </span>
                    <button 
                      onClick={() => handleOpenCheckout(pkg)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                        pkg.popular
                        ? 'bg-zinc-900 hover:bg-brand-600 text-white shadow-md shadow-zinc-900/10'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-950 border border-zinc-200'
                      }`}
                    >
                      Buy Package
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-center">
              <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">
                Need more custom enterprise credits or telegram bot payments?
              </p>
              <button 
                onClick={handleTopUp}
                className="mt-2 text-[10px] text-brand-600 hover:text-brand-700 font-black uppercase tracking-wider flex items-center justify-center gap-1 mx-auto"
              >
                Connect with Telegram Support <ChevronRight size={12} />
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

        {/* Secure Billing & Checkout Portal Modal */}
        <AnimatePresence>
          {billingModalOpen && selectedPackage && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setBillingModalOpen(false)}
                className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-zinc-100 flex flex-col md:flex-row"
              >
                {/* Visual Accent/Card Side Panel */}
                <div className="md:w-[45%] bg-zinc-950 p-8 text-white flex flex-col justify-between relative overflow-hidden shrink-0 border-r border-zinc-900">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 blur-[60px] -mr-24 -mt-24" />
                  
                  <div className="relative z-10 space-y-4">
                    <span className="px-3 py-1 bg-white/10 backdrop-blur text-[8px] font-black uppercase tracking-widest rounded-full text-brand-400 border border-white/5">
                      Secure Ledger
                    </span>
                    <h4 className="text-xl font-black uppercase tracking-tight leading-none">
                      Checkout <br />Portal
                    </h4>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                      Simulated secure banking terminal utilizing AES-256 ledger records.
                    </p>
                  </div>

                  {/* Virtual Dynamic Credit Card Preview */}
                  <div className="my-6 p-5 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl border border-zinc-700 shadow-xl space-y-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-300/5 blur-xl" />
                    <div className="flex justify-between items-center">
                      <div className="w-8 h-6 bg-amber-400/80 rounded-md shrink-0" />
                      <span className="text-[10px] tracking-widest font-mono text-zinc-400">Sandbox</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Card Number</p>
                      <p className="font-mono text-xs text-white font-bold tracking-widest">
                        {cardNumber ? cardNumber.replace(/(\d{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                      </p>
                    </div>
                    <div className="flex justify-between items-center border-t border-zinc-700/50 pt-2">
                      <div>
                        <p className="text-[6px] text-zinc-500 uppercase font-bold">Holder</p>
                        <p className="font-mono text-[9px] text-zinc-300 font-bold uppercase truncate max-w-[90px]">
                          {cardName || 'MEMBER NAME'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[6px] text-zinc-500 uppercase font-bold">Expiry</p>
                        <p className="font-mono text-[9px] text-zinc-300 font-bold">
                          {cardExpiry || 'MM/YY'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
                    © Barnia System Corp v1
                  </div>
                </div>

                {/* Form Elements & States */}
                <div className="flex-1 p-8 flex flex-col justify-between max-h-[500px] overflow-y-auto">
                  {paymentStep === 'details' && (
                    <div className="space-y-6">
                      <div>
                        <span className="text-[10px] font-black uppercase text-brand-600 tracking-widest">Pricing Package</span>
                        <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{selectedPackage.name}</h3>
                        <p className="text-sm font-bold text-zinc-500 font-mono mt-1">{selectedPackage.price}</p>
                      </div>

                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-2.5">
                        <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5 text-left">
                          <p className="text-[10px] font-black text-amber-800 uppercase tracking-wide">Developer Sandbox Active</p>
                          <p className="text-[9px] text-amber-700 leading-normal font-medium">
                            To simulate a successful credit ledger top-up, you must input the official Stripe Sandbox test card: <strong className="font-mono text-amber-900 bg-amber-100 px-1 rounded">4242 4242 4242 4242</strong> with any expiry date and CVC.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Name on Card</label>
                          <input 
                            type="text"
                            placeholder="John Doe"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500/15 focus:border-brand-500 transition-all font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Card Number (16 Digits)</label>
                          <input 
                            type="text"
                            maxLength={16}
                            placeholder="4111 2222 3333 4444"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500/15 focus:border-brand-500 transition-all font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Expiry Date</label>
                            <input 
                              type="text"
                              maxLength={5}
                              placeholder="MM/YY"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500/15 focus:border-brand-500 transition-all font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">CVC Code</label>
                            <input 
                              type="password"
                              maxLength={3}
                              placeholder="•••"
                              value={cardCVC}
                              onChange={(e) => setCardCVC(e.target.value.replace(/\D/g, ''))}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500/15 focus:border-brand-500 transition-all font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex border-t border-zinc-100 gap-3">
                        <button 
                          onClick={handleSimulatePayment}
                          className="flex-1 py-3.5 bg-zinc-950 hover:bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-zinc-950/10 flex items-center justify-center gap-2"
                        >
                          <CreditCard size={14} /> Pay & Authorize
                        </button>
                        <button 
                          onClick={() => setBillingModalOpen(false)}
                          className="px-5 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentStep === 'processing' && (
                    <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-4 space-y-6">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-zinc-100 border-t-zinc-900 animate-spin" />
                        <Zap size={20} className="text-zinc-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Gateway Cryptography Pipeline</p>
                        <h4 className="text-xs font-bold text-zinc-500 font-mono italic max-w-xs">{paymentProcessingMsg}</h4>
                      </div>
                    </div>
                  )}

                  {paymentStep === 'success' && (
                    <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-4 space-y-6">
                      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 text-emerald-500">
                        <CheckCircle2 size={32} className="animate-bounce" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg font-black text-zinc-900 uppercase">Checkout Simulated</h4>
                        <p className="text-xs text-zinc-400 font-medium">This sandbox flow is a visual demonstration step.</p>
                      </div>

                      <div className="p-4 bg-zinc-50 rounded-2xl w-full border border-zinc-100 space-y-2 text-left font-mono text-[9px]">
                        <div className="flex justify-between text-zinc-400 font-bold uppercase">
                          <span>Billing Mode</span>
                          <span className="text-amber-600 font-black">DEMO SANDBOX</span>
                        </div>
                        <div className="flex justify-between text-zinc-400 font-bold uppercase">
                          <span>Transaction Ref</span>
                          <span className="text-zinc-900">TXN-{Math.floor(100000 + Math.random() * 900000)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400 font-bold uppercase">
                          <span>Credits Added</span>
                          <span className="text-red-500 font-black">0 CR (Visual Only)</span>
                        </div>
                        <div className="flex justify-between text-zinc-400 font-bold uppercase">
                          <span>Status</span>
                          <span className="text-emerald-600 font-black">SIMULATION SUCCESS</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-zinc-500 font-bold leading-normal italic px-2">
                        Disclaimer: Sandbox demo checkouts secure the frontend UI flow. Actual credit allocations must be approved via official Support.
                      </div>

                      <button 
                        onClick={() => setBillingModalOpen(false)}
                        className="w-full py-4 bg-zinc-950 hover:bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Return To Hub
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
