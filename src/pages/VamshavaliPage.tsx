import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Mail, ArrowRight, ShieldCheck, Save, Share2, 
  Download, Copy, Plus, Trash2, ChevronDown, ChevronRight,
  User, Home, Landmark, BookOpen, MapPin, Edit3, LogOut,
  CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  photo?: string; // Base64 or URL
  birthYear?: string;
  partner?: {
    name: string;
    photo?: string;
    birthYear?: string;
  };
  children: FamilyMember[];
}

const GoldenFrame = ({ photo, name, pulse = false }: { photo?: string; name: string; pulse?: boolean }) => (
  <div className={`relative p-1 rounded-[45%] bg-gradient-to-b from-[#e7c062] via-[#b68c2f] to-[#e7c062] shadow-[0_10px_30px_rgba(0,0,0,0.4)] border-2 border-[#8a6821] ${pulse ? 'animate-pulse' : ''} group-hover:scale-105 transition-transform duration-500`}>
    <div className="absolute inset-0 rounded-[45%] border border-[rgba(255,255,255,0.2)] pointer-events-none" />
    <div className="relative aspect-[4/5] w-20 md:w-28 rounded-[43%] overflow-hidden bg-[#2a2a2a]">
      {photo ? (
        <img src={photo} alt={name} className="w-full h-full object-cover grayscale-[0.2] sepia-[0.1] hover:grayscale-0 transition-all duration-700" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a1a] text-[#8a6821]">
          <User size={32} strokeWidth={1} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.8)] via-transparent to-transparent opacity-60" />
    </div>
  </div>
);

const VintageScroll = ({ title }: { title: string }) => (
  <div className="relative inline-block px-10 py-1 pt-3 mb-6">
    <div className="absolute inset-0 bg-[#f4e4bc] border-y-2 border-[#b68d40] rounded-sm transform -skew-x-6" />
    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-8 bg-[#b68d40] rounded-r-full -ml-1.5 shadow-lg" />
    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-8 bg-[#b68d40] rounded-l-full -mr-1.5 shadow-lg" />
    <span className="relative z-10 font-serif font-black text-[#58441c] uppercase tracking-[0.2em] text-[8px] md:text-xs italic whitespace-nowrap">
      {title}
    </span>
  </div>
);

interface VamshavaliProfile {
  id: string;
  email: string;
  shareId: string;
  name: string;
  parents: string;
  grandparents: string;
  gotra: string;
  kuldevi: string;
  kuldevta: string;
  nativePlace: string;
  additionalNotes: string;
  members: FamilyMember[];
}

export const VamshavaliPage = ({ isPublic = false }: { isPublic?: boolean }) => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<'login' | 'otp' | 'dashboard'>('login');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<VamshavaliProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const treeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPublic && shareId) {
      fetchPublicProfile();
    }
  }, [isPublic, shareId]);

  const fetchPublicProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/vamshavali/p/${shareId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setStep('dashboard');
      } else {
        toast.error("Profile not found");
      }
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/vamshavali/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setStep('otp');
        toast.success("OTP sent to your email");
      } else {
        const data = await res.json();
        toast.error(data.details || data.error || "Failed to send OTP");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/vamshavali/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setStep('dashboard');
        toast.success("Welcome to your Vamshavali Dashboard");
      } else {
        toast.error(data.error || "Invalid OTP");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profile) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/vamshavali/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        toast.success("Data saved successfully");
        setIsEditing(false);
      } else {
        const data = await res.json();
        toast.error(data.details || "Failed to save data");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!treeRef.current || !profile) return;
    setIsLoading(true);
    const toastId = toast.loading("Generating high-quality PDF...");
    
    try {
      const element = document.getElementById('genealogy_container');
      if (!element) return;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fcf8f1',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgProps = canvas;
      
      // Landscape for wide trees
      const orientation = imgProps.width > imgProps.height ? 'l' : 'p';
      const pdf = new jsPDF(orientation, 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`Barnia_Vamshavali_Grand_History.pdf`);
      
      toast.dismiss(toastId);
      toast.success("Family History Saved");
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast.dismiss(toastId);
      toast.error("Failed to generate PDF. Please try again or use a desktop browser.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    if (!profile) return;
    const link = `${window.location.origin}/vamshavali/v/${profile.shareId}`;
    navigator.clipboard.writeText(link);
    toast.success("Shareable link copied!");
  };

  const logout = () => {
    setStep('login');
    setProfile(null);
    setEmail('');
    setOtp('');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 200 * 1024) { // 200KB limit for base64 storage efficiency
      toast.error("Image too large. Please use an image under 200KB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Tree management helpers
  const addMember = (parentId: string | null) => {
    if (!profile) return;
    const newMember: FamilyMember = {
      id: Math.random().toString(36).substring(7),
      name: "Full Name",
      role: "Generation Node",
      birthYear: "b. 1900",
      children: []
    };

    const updateRecursive = (members: FamilyMember[]): FamilyMember[] => {
      if (parentId === null) return [...members, newMember];
      return members.map(m => {
        if (m.id === parentId) {
          return { ...m, children: [...m.children, newMember] };
        }
        return { ...m, children: updateRecursive(m.children) };
      });
    };

    setProfile({ ...profile, members: updateRecursive(profile.members) });
  };

  const addPartner = (id: string) => {
    if (!profile) return;
    const updateRecursive = (members: FamilyMember[]): FamilyMember[] => {
      return members.map(m => {
        if (m.id === id) {
          return { ...m, partner: { name: "Partner Name", birthYear: "b. 1900" } };
        }
        return { ...m, children: updateRecursive(m.children) };
      });
    };
    setProfile({ ...profile, members: updateRecursive(profile.members) });
  };

  const removeMember = (id: string) => {
    if (!profile) return;
    const filterRecursive = (members: FamilyMember[]): FamilyMember[] => {
      return members
        .filter(m => m.id !== id)
        .map(m => ({ ...m, children: filterRecursive(m.children) }));
    };
    setProfile({ ...profile, members: filterRecursive(profile.members) });
  };

  const updateMember = (id: string, updates: Partial<FamilyMember>) => {
    if (!profile) return;
    const updateRecursive = (members: FamilyMember[]): FamilyMember[] => {
      return members.map(m => {
        if (m.id === id) return { ...m, ...updates };
        return { ...m, children: updateRecursive(m.children) };
      });
    };
    setProfile({ ...profile, members: updateRecursive(profile.members) });
  };

  const updatePartner = (id: string, updates: any) => {
    if (!profile) return;
    const updateRecursive = (members: FamilyMember[]): FamilyMember[] => {
      return members.map(m => {
        if (m.id === id && m.partner) return { ...m, partner: { ...m.partner, ...updates } };
        return { ...m, children: updateRecursive(m.children) };
      });
    };
    setProfile({ ...profile, members: updateRecursive(profile.members) });
  };

  if (isLoading && step === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans selection:bg-brand-100 selection:text-brand-900 pb-20">
      {/* Mini Header */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-zinc-100">
                <img src="https://i.postimg.cc/McBQ2pVg/barnia-logo-120x120.png" alt="" className="w-full h-full object-cover" />
             </div>
             <div className="flex flex-col">
                <h1 className="font-black text-lg tracking-tight leading-none text-zinc-900">Vamshavali</h1>
                <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest mt-1">Digital Family Tree</span>
             </div>
          </div>
          {step === 'dashboard' && !isPublic && (
            <button onClick={logout} className="p-3 rounded-xl bg-zinc-50 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        <AnimatePresence mode="wait">
          {step === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-5xl mx-auto"
            >
              <div className="bg-[#fdfbf7] rounded-[3rem] shadow-2xl border border-[#e5e1d8] overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                {/* Left Side: Storytelling & Visual */}
                <div className="flex-1 p-12 bg-[#064e3b] text-white flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mr-20 -mt-20 opacity-10 pointer-events-none">
                    <Users size={400} />
                  </div>
                  
                  <div className="relative z-10 space-y-8">
                    <div className="w-16 h-1 bg-brand-400 rounded-full" />
                    <div className="space-y-4">
                      <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight italic">
                        Preserve Your Roots, <br />
                        Grow Your Legacy.
                      </h2>
                      <p className="text-emerald-100 text-lg leading-relaxed max-w-sm">
                        A digital Vamshavali is more than a list of names—it is the living heart of your family's history and spiritual identity.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 pt-8">
                      {[
                        { icon: <Landmark size={20}/>, title: "Historical Identity", desc: "Secure your Gotra and Kuldevta records forever." },
                        { icon: <Users size={20}/>, title: "Lineage Mapping", desc: "Connect generations across time and geography." },
                        { icon: <CheckCircle2 size={20}/>, title: "Future Legacy", desc: "Leave a clear, verified history for those who come after you." }
                      ].map((item, i) => (
                        <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                          <div className="text-brand-400 shrink-0">{item.icon}</div>
                          <div>
                            <h4 className="font-bold text-sm tracking-wide">{item.title}</h4>
                            <p className="text-emerald-200/80 text-xs mt-1 leading-normal font-medium">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative z-10 pt-12 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-800 flex items-center justify-center border border-emerald-700">
                      <Users size={16} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                      Join thousands of lineages being preserved online
                    </p>
                  </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="hidden md:block w-px bg-[#e5e1d8]" />
                <div className="flex-1 p-12 flex flex-col justify-center bg-white">
                  <div className="max-w-sm mx-auto w-full space-y-10">
                    <div className="text-center md:text-left space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                        <ShieldCheck size={12} /> Secure Access
                      </div>
                      <h3 className="text-4xl font-serif font-black text-zinc-900 tracking-tight">Access Dashboard</h3>
                      <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                        Sign in with your email to view your personal family tree or start a new lineage profile.
                      </p>
                    </div>

                    <form onSubmit={handleSendOTP} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Email Address</label>
                        <div className="relative group">
                          <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                          <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. name@family.com"
                            required
                            className="w-full pl-14 pr-6 py-5 bg-[#fdfbf7] border-2 border-[#e5e1d8] focus:border-brand-500 focus:bg-white rounded-2xl font-bold transition-all outline-none"
                          />
                        </div>
                      </div>

                      <button 
                        disabled={isLoading}
                        className="w-full py-5 bg-[#064e3b] text-brand-50 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-900 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-900/10 flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Generate Access Code <ArrowRight size={18} /></>}
                      </button>
                    </form>

                    <div className="pt-6 border-t border-zinc-100 flex items-center justify-center">
                      <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest text-center px-8 leading-relaxed">
                        Privacy First: Your data is only visible to those you share your private link with.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-[#fdfbf7] p-12 rounded-[3.5rem] shadow-2xl border border-[#e5e1d8] text-center space-y-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600" />
                
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner border-2 border-emerald-100">
                  <ShieldCheck size={40} />
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-3xl font-serif font-black text-zinc-900 tracking-tight italic">Confirm Identity</h2>
                  <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                    Check your inbox for a 6-digit code sent to <br />
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 inline-block">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <input 
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0 0 0 0 0 0"
                    maxLength={6}
                    required
                    className="w-full px-6 py-6 bg-white border-2 border-[#e5e1d8] focus:border-emerald-500 focus:bg-white rounded-2xl font-black text-4xl text-center tracking-[0.25em] transition-all outline-none text-emerald-900 shadow-inner"
                  />
                  <button 
                    disabled={isLoading}
                    className="w-full py-5 bg-[#064e3b] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-800 transition-all shadow-xl shadow-emerald-900/10 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Verify Identity"}
                  </button>
                </form>

                <button 
                  onClick={() => setStep('login')}
                  className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-emerald-700 transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <ArrowRight size={14} className="rotate-180" /> Back to Login
                </button>
              </div>
            </motion.div>
          )}

          {step === 'dashboard' && profile && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              {/* Profile Card */}
              <div className="bg-white p-10 rounded-[3rem] border-4 border-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 flex gap-3">
                  {!isPublic && (
                    <>
                      <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className={`p-4 rounded-2xl transition-all ${isEditing ? 'bg-zinc-900 text-white' : 'bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white'}`}
                      >
                        {isEditing ? <Save size={20} /> : <Edit3 size={20} />}
                      </button>
                    </>
                  )}
                  <button onClick={downloadPDF} className="p-4 rounded-2xl bg-zinc-50 text-zinc-600 hover:bg-zinc-900 hover:text-white transition-all">
                    <Download size={20} />
                  </button>
                </div>

                <div className="flex flex-col gap-8">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-brand-600 to-brand-500 rounded-3xl flex items-center justify-center text-white shadow-xl">
                      <User size={40} />
                    </div>
                    <div>
                      {isEditing ? (
                        <input 
                          value={profile.name}
                          onChange={(e) => setProfile({...profile, name: e.target.value})}
                          placeholder="Your Full Name"
                          className="text-3xl font-black text-zinc-900 bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-200 w-full"
                        />
                      ) : (
                        <h2 className="text-4xl font-black text-zinc-900 tracking-tight">{profile.name || "My Vamshavali"}</h2>
                      )}
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mt-1">Digital Lineage Profile</p>
                    </div>
                  </div>

                  {!isPublic && (
                     <div className="bg-zinc-50/50 p-6 rounded-[2rem] border border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-white rounded-xl shadow-sm text-brand-600">
                              <Share2 size={20} />
                           </div>
                           <div>
                              <p className="text-zinc-900 font-black text-sm">Private Share Link</p>
                              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Share this with your family members</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                           <div className="flex-1 px-4 py-3 bg-white border border-zinc-200 rounded-xl text-xs font-mono text-zinc-500 truncate max-w-[200px]">
                              {window.location.origin}/vamshavali/v/{profile.shareId}
                           </div>
                           <button onClick={copyLink} className="p-3.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all shadow-md">
                              <Copy size={18} />
                           </button>
                        </div>
                     </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { icon: <Users size={18}/>, label: "Parents", value: profile.parents, key: 'parents' },
                      { icon: <Landmark size={18}/>, label: "Grandparents", value: profile.grandparents, key: 'grandparents' },
                      { icon: <Landmark size={18}/>, label: "Gotra", value: profile.gotra, key: 'gotra' },
                      { icon: <Home size={18}/>, label: "Kuldevi / Kuldevta", value: profile.kuldevi, key: 'kuldevi' },
                      { icon: <MapPin size={18}/>, label: "Native Place", value: profile.nativePlace, key: 'nativePlace' },
                      { icon: <BookOpen size={18}/>, label: "Kuldevta", value: profile.kuldevta, key: 'kuldevta' },
                    ].map((item, i) => (
                      <div key={i} className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          {item.icon} {item.label}
                        </label>
                        {isEditing ? (
                          <input 
                            value={item.value}
                            onChange={(e) => setProfile({...profile, [item.key]: e.target.value})}
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-sm tracking-tight"
                          />
                        ) : (
                          <p className="font-bold text-zinc-900 tracking-tight">{item.value || "—"}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      <Edit3 size={18}/> Additional Notes
                    </label>
                    {isEditing ? (
                      <textarea 
                        value={profile.additionalNotes}
                        onChange={(e) => setProfile({...profile, additionalNotes: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-sm min-h-[100px]"
                      />
                    ) : (
                      <p className="text-zinc-600 font-medium text-sm leading-relaxed whitespace-pre-wrap">{profile.additionalNotes || "No additional notes provided."}</p>
                    )}
                  </div>

                  {isEditing && (
                    <button 
                      onClick={handleUpdateProfile}
                      disabled={isLoading}
                      className="w-full py-5 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
                    >
                      {isLoading ? <Loader2 className="animate-spin"/> : <><CheckCircle2 size={18}/> Save Lineage Data</>}
                    </button>
                  )}
                </div>
              </div>

              {/* Family Tree Section */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-1 bg-brand-600 rounded-full" />
                      <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-widest">Genealogy Tree</h2>
                   </div>
                   {isEditing && (
                      <button onClick={() => addMember(null)} className="px-6 py-3 bg-white border-2 border-zinc-100 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-brand-500 hover:text-brand-600 transition-all flex items-center gap-2">
                        <Plus size={16}/> Add Root
                      </button>
                   )}
                </div>

                  <div 
                    ref={treeRef}
                    id="genealogy_container"
                    className="bg-[#fcf8f1] rounded-[3.5rem] border-[8px] border-[#d4af37] shadow-2xl overflow-x-auto min-h-[600px] p-16 relative"
                    style={{
                      backgroundImage: `url('https://www.transparenttextures.com/patterns/old-map.png')`,
                      backgroundBlendMode: 'multiply'
                    }}
                  >
                    {/* Decorative Borders - Using explicit rgba to avoid oklch issues in html2canvas */}
                    <div className="absolute top-4 left-4 right-4 bottom-4 border-2 border-[rgba(182,141,64,0.2)] pointer-events-none rounded-[2.5rem]" />
                    <div className="absolute top-2 left-2 right-2 bottom-2 border border-[rgba(182,141,64,0.3)] pointer-events-none rounded-[3rem]" />

                    <div className="inline-block min-w-full text-center relative z-10">
                       <div className="mb-20">
                          <VintageScroll title="The Eternal Lineage of Barnia" />
                          <h3 className="mt-4 font-serif text-[#b68d40] text-3xl italic font-bold">Vamshavali Genealogy</h3>
                       </div>
                       <TreeStructure 
                        members={profile.members} 
                        isEditing={isEditing} 
                        onUpdate={updateMember}
                        onRemove={removeMember}
                        onAddChild={addMember}
                        onAddPartner={addPartner}
                        onUpdatePartner={updatePartner}
                        handlePhotoUpload={handlePhotoUpload}
                       />
                    </div>
                  </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const TreeStructure = ({ members, isEditing, onUpdate, onRemove, onAddChild, onAddPartner, onUpdatePartner, handlePhotoUpload }: any) => {
  return (
    <div className="flex flex-col items-center gap-24">
      {members.map((member: FamilyMember) => (
        <div key={member.id} className="relative flex flex-col items-center">
          {/* Node Wrapper */}
          <div className="flex flex-col items-center">
            {/* The Couple / Individual */}
            <div className="flex items-center gap-4 relative">
              {/* Member */}
              <div className="flex flex-col items-center group">
                <div className="relative">
                  <GoldenFrame photo={member.photo} name={member.name} />
                  {isEditing && (
                    <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                      <Plus size={14} />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handlePhotoUpload(e, (base64) => onUpdate(member.id, { photo: base64 }))} 
                      />
                    </label>
                  )}
                </div>
                
                <div className="mt-4 flex flex-col items-center">
                  {isEditing ? (
                    <div className="flex flex-col items-center gap-1">
                      <input 
                        value={member.name}
                        onChange={(e) => onUpdate(member.id, { name: e.target.value })}
                        className="bg-transparent font-serif font-black text-[#58441c] text-center text-sm md:text-lg border-b border-[#b68d40]/30 outline-none w-28 md:w-40"
                      />
                      <input 
                        value={member.birthYear}
                        onChange={(e) => onUpdate(member.id, { birthYear: e.target.value })}
                        placeholder="Birth date"
                        className="bg-transparent text-[10px] text-zinc-500 text-center italic border-none outline-none"
                      />
                    </div>
                  ) : (
                    <>
                      <h4 className="font-serif font-black text-[#58441c] text-sm md:text-lg uppercase tracking-tight">{member.name}</h4>
                      <p className="text-[10px] text-zinc-500 font-bold italic">{member.birthYear}</p>
                    </>
                  )}
                  <p className="text-[#b68d40] text-[9px] font-black uppercase tracking-[0.2em] mt-1">{member.role}</p>
                </div>
              </div>

              {/* Partner Section */}
              {member.partner ? (
                <>
                  {/* Connector Rings */}
                  <div className="w-8 flex items-center justify-center relative">
                    <div className="absolute top-1/2 -translate-y-1/2 w-8 h-20 border-t-2 border-b-2 border-dashed border-[rgba(182,141,64,0.3)] rounded-full" />
                    <div className="text-[#b68d40] bg-[#fcf8f1] p-1 rounded-full border border-[rgba(182,141,64,0.2)]">
                      <Users size={12} />
                    </div>
                  </div>

                  <div className="flex flex-col items-center group">
                    <div className="relative">
                      <GoldenFrame photo={member.partner.photo} name={member.partner.name} />
                      {isEditing && (
                        <label className="absolute -bottom-2 -left-2 w-8 h-8 bg-brand-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                          <Plus size={14} />
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={(e) => handlePhotoUpload(e, (base64) => onUpdatePartner(member.id, { photo: base64 }))} 
                          />
                        </label>
                      )}
                    </div>
                    
                    <div className="mt-4 flex flex-col items-center">
                      {isEditing ? (
                        <div className="flex flex-col items-center gap-1">
                          <input 
                            value={member.partner.name}
                            onChange={(e) => onUpdatePartner(member.id, { name: e.target.value })}
                            className="bg-transparent font-serif font-black text-[#58441c] text-center text-sm md:text-lg border-b border-[#b68d40]/30 outline-none w-28 md:w-40"
                          />
                          <input 
                            value={member.partner.birthYear}
                            onChange={(e) => onUpdatePartner(member.id, { birthYear: e.target.value })}
                            placeholder="Birth date"
                            className="bg-transparent text-[10px] text-zinc-500 text-center italic border-none outline-none"
                          />
                        </div>
                      ) : (
                        <>
                          <h4 className="font-serif font-black text-[#58441c] text-sm md:text-lg uppercase tracking-tight">{member.partner.name}</h4>
                          <p className="text-[10px] text-zinc-500 font-bold italic">{member.partner.birthYear}</p>
                        </>
                      )}
                      <p className="text-[#b68d40] text-[9px] font-black uppercase tracking-[0.2em] mt-1">Partner</p>
                    </div>
                  </div>
                </>
              ) : isEditing && (
                <button 
                  onClick={() => onAddPartner(member.id)}
                  className="w-20 md:w-28 aspect-[4/5] rounded-[43%] border-2 border-dashed border-[rgba(182,141,64,0.4)] flex flex-col items-center justify-center text-[#b68d40] hover:bg-[rgba(255,255,255,0.5)] transition-all gap-2"
                >
                  <Plus size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Partner</span>
                </button>
              )}
            </div>

            {/* Action Buttons for Editing */}
            {isEditing && (
              <div className="flex gap-4 mt-6">
                <button 
                  onClick={() => onAddChild(member.id)}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-2"
                >
                  <Plus size={14}/> Add Child
                </button>
                <button 
                  onClick={() => onRemove(member.id)}
                  className="px-4 py-2 bg-red-50 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={14}/> Node
                </button>
              </div>
            )}
          </div>

          {/* Children / Recursive Section */}
          {member.children.length > 0 && (
            <div className="pt-24 relative w-full flex justify-center">
              {/* Vertical Line from parent */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-24 bg-gradient-to-b from-[#b68d40] to-[rgba(182,141,64,0.1)]" />
              
              {/* Horizontal line for multiple children */}
              {member.children.length > 1 && (
                <div className="absolute top-24 left-0 right-0 h-0.5 bg-[rgba(182,141,64,0.2)]" />
              )}

              <div className="flex gap-16 relative">
                <TreeStructure 
                  members={member.children} 
                  isEditing={isEditing} 
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  onAddChild={onAddChild}
                  onAddPartner={onAddPartner}
                  onUpdatePartner={onUpdatePartner}
                  handlePhotoUpload={handlePhotoUpload}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
