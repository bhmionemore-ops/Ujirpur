import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Mail, ArrowRight, ShieldCheck, Save, Share2, 
  Download, Copy, Plus, Trash2, ChevronDown, ChevronRight,
  User, Home, Landmark, BookOpen, MapPin, Edit3, LogOut, FileText, Globe,
  CheckCircle2, AlertCircle, Loader2, X, Heart, Settings, Edit2, Sparkles,
  Maximize, Minimize2, ScreenShare, Facebook
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Markdown from 'react-markdown';
import { useFirebase } from '../FirebaseContext';
import { useLanguage } from '../LanguageContext';
import { Language } from '../i18n';

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  photo?: string;
  birthYear?: string;
  partner?: {
    name: string;
    photo?: string;
    birthYear?: string;
  };
  children: FamilyMember[];
}

const EditMemberModal = ({ 
  isOpen, 
  onClose, 
  member, 
  onSave, 
  handlePhotoUpload 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  member: any; 
  onSave: (updates: any) => void;
  handlePhotoUpload: any;
}) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    birthYear: '', 
    role: '', 
    photo: '',
    partnerName: '',
    partnerBirthYear: '',
    partnerPhoto: '',
    hasPartner: false
  });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        birthYear: member.birthYear || '',
        role: member.role || '',
        photo: member.photo || '',
        partnerName: member.partner?.name || '',
        partnerBirthYear: member.partner?.birthYear || '',
        partnerPhoto: member.partner?.photo || '',
        hasPartner: !!member.partner
      });
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#064e3b]/40 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[3rem] w-full max-w-3xl overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.4)] border-4 border-[#d4af37] relative"
      >
        {/* Background Texture */}
        <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/old-map.png')] pointer-events-none" />

        <div className="p-10 border-b border-zinc-100 flex justify-between items-center bg-[#fdfbf7] relative">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-[#064e3b] rounded-2xl text-[#d4af37] shadow-xl">
               <Edit3 size={32} />
            </div>
            <div>
              <h3 className="text-3xl font-serif font-black text-[#064e3b] tracking-tight italic">Registry Editor</h3>
              <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-[0.4em] mt-1">Preserving Eternal Records</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-[#f4f4f5] rounded-full transition-colors text-[#a1a1aa]">
            <X size={28} />
          </button>
        </div>

        <div className="p-10 max-h-[70vh] overflow-y-auto space-y-12 relative z-10">
          {/* Primary Member */}
          <div className="space-y-8">
            <div className="flex items-center gap-4 text-[#064e3b]">
              <div className="w-8 h-px bg-[rgba(6,78,59,0.2)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Individual Identity</span>
              <div className="w-8 h-px bg-[rgba(6,78,59,0.2)]" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest ml-1">Full Legal Name</label>
                <input 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-6 py-4 bg-[#fafafa] border-2 border-[#f4f4f5] rounded-2xl font-bold focus:border-[#d4af37] outline-none transition-all text-[#18181b]"
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest ml-1">Historical Period / Birth</label>
                <input 
                  value={formData.birthYear}
                  onChange={(e) => setFormData({...formData, birthYear: e.target.value})}
                  className="w-full px-6 py-4 bg-[#fafafa] border-2 border-[#f4f4f5] rounded-2xl font-bold focus:border-[#d4af37] outline-none transition-all text-[#18181b]"
                  placeholder="e.g. 1920 - 2005"
                />
              </div>
            </div>

            <div className="flex items-center gap-8 p-6 bg-[#fdfbf7] rounded-3xl border-2 border-[rgba(212,175,55,0.1)] shadow-inner">
              <div className="relative group">
                <div className="w-24 h-24 rounded-[45%] bg-gradient-to-tr from-[#d4af37] to-[#f4e4bc] p-1 shadow-lg">
                  <div className="w-full h-full rounded-[43%] bg-[#064e3b] overflow-hidden flex items-center justify-center">
                    {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <User className="text-[rgba(212,175,55,0.3)]" size={32} />}
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest">Portrait Archives</p>
                <div className="flex items-center gap-4">
                  <label className="px-6 py-2.5 bg-[#064e3b] text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-[#065f46] transition-colors">
                    Upload Portrait
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, (base64: string) => setFormData({...formData, photo: base64}))}
                      className="hidden"
                    />
                  </label>
                  {formData.photo && <button onClick={() => setFormData({...formData, photo: ''})} className="text-[#ef4444] text-[10px] font-black uppercase">Remove</button>}
                </div>
              </div>
            </div>
          </div>

          {/* Union Section */}
          <div className="pt-8 border-t border-[#f4f4f5]">
            <button 
              onClick={() => setFormData({...formData, hasPartner: !formData.hasPartner})}
              className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all ${formData.hasPartner ? 'bg-[#d4af37] text-[#064e3b] shadow-xl' : 'bg-[#f4f4f5] text-[#71717a] hover:bg-[#e4e4e7]'}`}
            >
              <Heart size={18} fill={formData.hasPartner ? 'currentColor' : 'none'} />
              {formData.hasPartner ? 'Formal Union Recorded' : 'Establish Union Partner'}
            </button>
          </div>

          {formData.hasPartner && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="space-y-8 pt-4 overflow-hidden"
            >
               <div className="flex items-center gap-4 text-[#8a6821]">
                <div className="w-8 h-px bg-[rgba(138,104,33,0.2)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Partner Archive</span>
                <div className="w-8 h-px bg-[rgba(138,104,33,0.2)]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest ml-1">Partner Full Name</label>
                  <input 
                    value={formData.partnerName}
                    onChange={(e) => setFormData({...formData, partnerName: e.target.value})}
                    className="w-full px-6 py-4 bg-[#fafafa] border-2 border-[#f4f4f5] rounded-2xl font-bold focus:border-[#d4af37] outline-none transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest ml-1">Period Details</label>
                  <input 
                    value={formData.partnerBirthYear}
                    onChange={(e) => setFormData({...formData, partnerBirthYear: e.target.value})}
                    className="w-full px-6 py-4 bg-[#fafafa] border-2 border-[#f4f4f5] rounded-2xl font-bold focus:border-[#d4af37] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 p-6 bg-[#fdfbf7] rounded-3xl border border-[rgba(212,175,55,0.2)] shadow-sm">
                <div className="w-16 h-16 rounded-[45%] bg-gradient-to-tr from-[rgba(212,175,55,0.4)] to-[#f4e4bc] p-0.5">
                  <div className="w-full h-full rounded-[43%] bg-white overflow-hidden flex items-center justify-center">
                    {formData.partnerPhoto ? <img src={formData.partnerPhoto} className="w-full h-full object-cover" /> : <User className="text-[rgba(212,175,55,0.2)]" size={20} />}
                  </div>
                </div>
                <label className="px-6 py-2 bg-white border-2 border-[#f4f4f5] text-[#71717a] rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer hover:border-[#d4af37] transition-all">
                  Change Photo
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, (base64: string) => setFormData({...formData, partnerPhoto: base64}))}
                    className="hidden"
                  />
                </label>
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-10 bg-[#fdfbf7] border-t border-zinc-100 flex gap-6 relative z-10">
          <button 
            onClick={() => onSave(formData)}
            className="flex-1 py-5 bg-[#064e3b] text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-emerald-900 transition-all shadow-[0_20px_40px_rgba(6,78,59,0.2)] active:scale-95"
          >
            Update Chronicle
          </button>
          <button onClick={onClose} className="px-10 py-5 bg-white text-[#a1a1aa] rounded-[2rem] font-black text-xs uppercase tracking-widest border-2 border-[#f4f4f5] hover:bg-[#fafafa] transition-all">
            Refuse
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const GoldenFrame = ({ photo, name, pulse = false, size = "md" }: { photo?: string; name: string; pulse?: boolean; size?: "sm" | "md" }) => {
  const sizeClasses = size === "sm" ? "w-20 md:w-24" : "w-24 md:w-36";
  return (
    <div className={`relative p-1 rounded-[45%] bg-gradient-to-tr from-[#8a6821] via-[#d4af37] to-[#f4e4bc] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-[#8a6821] ${pulse ? 'animate-pulse' : ''} group-hover:scale-110 transition-all duration-700 ease-out z-10`}>
      <div className="absolute inset-0 rounded-[45%] border-2 border-white/10 pointer-events-none" />
      {/* Ornate inner border */}
      <div className="absolute inset-1 rounded-[45%] border border-[#8a6821]/40 pointer-events-none" />
      
      <div className={`relative aspect-[4/5] ${sizeClasses} rounded-[43%] overflow-hidden bg-[#0f172a] ring-4 ring-[#0f172a]`}>
        {photo ? (
          <img src={photo} alt={name} className="w-full h-full object-cover transition-all duration-[1500ms] group-hover:scale-125" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#1e293b] text-[#d4af37]/40">
            <User size={size === "sm" ? 32 : 48} strokeWidth={1} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-transparent to-transparent" />
      </div>
    </div>
  );
};

const DeityFrame = ({ photo, name }: { photo?: string; name: string }) => {
  return (
    <div className="relative group mb-12 flex flex-col items-center">
      {/* Divine Aura / Energy Field */}
      <div className="absolute inset-0 bg-[#d4af37]/15 rounded-full blur-[120px] animate-pulse" />
      
      {/* Floating Sparkles Decorating the Aura */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.8, 0], 
              scale: [0.5, 1.2, 0.8],
              y: [0, -100 - (Math.random() * 100)],
              x: [(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 200]
            }}
            transition={{ 
              duration: 4 + Math.random() * 4, 
              repeat: Infinity, 
              delay: i * 0.8,
              ease: "easeOut"
            }}
            className="absolute top-1/2 left-1/2 text-[#d4af37]/40"
          >
            <Sparkles size={8 + Math.random() * 8} />
          </motion.div>
        ))}
      </div>

      {/* The Ornate Frame */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative p-2 rounded-[2.5rem] bg-gradient-to-b from-[#f59e0b] via-[#d4af37] to-[#8a6821] shadow-[0_50px_120px_rgba(182,141,64,0.5)] border-4 border-[#fffbeb] z-20"
      >
        <div className="absolute inset-0 border-[14px] border-[#064e3b]/5 pointer-events-none rounded-[2.3rem]" />
        
        {/* Sacred Content */}
        <div className="relative w-52 h-72 md:w-72 md:h-96 rounded-[2rem] overflow-hidden bg-[#064e3b] shadow-inner border-2 border-[#b68d40]/50">
          {photo ? (
            <img src={photo} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#d4af37]/30 p-12 text-center space-y-6">
              <Landmark size={80} strokeWidth={0.5} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] leading-loose">Sacred Presence of<br/>The Divine Mother</p>
            </div>
          )}
          
          {/* Spiritual Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#064e3b] via-[#064e3b]/20 to-transparent opacity-80" />
          
          {/* Light Rays */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent skew-x-[-20deg] origin-top opacity-30" />
          
          <div className="absolute bottom-8 left-0 right-0 text-center px-4">
            <h5 className="text-[#d4af37] font-serif font-black text-2xl italic drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
              {name || "Mata"}
            </h5>
            <p className="text-[9px] font-black text-white/60 uppercase tracking-[0.5em] mt-2">Protector of {name || 'Family'} Lineage</p>
          </div>
        </div>

        {/* Sacred Mantra Label */}
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#d4af37] text-[#064e3b] px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_10px_20px_rgba(0,0,0,0.2)] border-2 border-white whitespace-nowrap">
          Om Devi Namah
        </div>
      </motion.div>

      {/* Energy Flowing Downward to the Tree */}
      <div className="mt-8 flex flex-col items-center gap-2 relative">
        <motion.div 
          animate={{ scaleY: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-1 h-32 bg-gradient-to-b from-[#d4af37] via-[#d4af37]/50 to-transparent rounded-full shadow-[0_0_15px_#d4af37]" 
        />
        
        {/* Descending Light Particles (Blessings) */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -40, opacity: 0 }}
            animate={{ 
              y: [0, 120], 
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 2.5 + Math.random(), 
              repeat: Infinity, 
              delay: i * 0.5,
              ease: "easeInOut"
            }}
            className="absolute top-0 text-[#d4af37]"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
          </motion.div>
        ))}
      </div>
      
      {/* Traditional Ornaments side decorations */}
      <div className="absolute -left-20 top-1/2 -translate-y-1/2 text-[#d4af37]/20 hidden xl:block">
        <div className="flex flex-col gap-8 items-end">
           <div className="w-16 h-px bg-current" />
           <div className="w-32 h-px bg-current opacity-50" />
           <div className="w-24 h-px bg-current" />
        </div>
      </div>
      <div className="absolute -right-20 top-1/2 -translate-y-1/2 text-[#d4af37]/20 hidden xl:block rotate-180">
        <div className="flex flex-col gap-8 items-end">
           <div className="w-16 h-px bg-current" />
           <div className="w-32 h-px bg-current opacity-50" />
           <div className="w-24 h-px bg-current" />
        </div>
      </div>
    </div>
  );
};

const RoyalOrnament = () => (
  <div className="flex items-center gap-4 text-[#d4af37]/40 my-8">
    <div className="h-px w-24 bg-gradient-to-r from-transparent to-current" />
    <Landmark size={24} className="animate-pulse" />
    <div className="h-px w-24 bg-gradient-to-l from-transparent to-current" />
  </div>
);

const VintageScroll = ({ title }: { title: string }) => (
  <div className="relative inline-block px-16 py-4 pt-8">
    {/* Grand Parchment */}
    <div className="absolute inset-0 bg-[#fdfbf7] border-y-4 border-[#b68d40] rounded-sm shadow-xl" />
    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-20 bg-[#8a6821] rounded-r-lg shadow-2xl" />
    <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-20 bg-[#8a6821] rounded-l-lg shadow-2xl" />
    <span className="relative z-10 font-serif font-black text-[#58441c] uppercase tracking-[0.4em] text-xs md:text-lg italic whitespace-nowrap drop-shadow-sm">
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
  kuldeviPhoto?: string;
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
  const [editingNode, setEditingNode] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [numerologyReading, setNumerologyReading] = useState<{name: string, reading: string} | null>(null);
  const [isCalculatingNumerology, setIsCalculatingNumerology] = useState(false);
  const [treeScale, setTreeScale] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const treeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isFullScreen]);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    // When entering full screen, we might want to auto-fit
    if (!isFullScreen) {
      toast.info("Entering Zen View: Immersive Lineage Experience");
    }
  };

  const autoFitTree = () => {
    if (!treeRef.current) return;
    const container = treeRef.current;
    const scrollContent = container.querySelector('.inline-block');
    if (!scrollContent) return;

    const containerWidth = container.clientWidth - 100;
    const contentWidth = scrollContent.scrollWidth;
    const newScale = Math.min(Math.max(containerWidth / contentWidth, 0.4), 1);
    setTreeScale(newScale);
    toast.success("Perspective adjusted for optimal view");
  };

  const getVedicNumerology = async (member: FamilyMember) => {
    setIsCalculatingNumerology(true);
    setNumerologyReading(null);
    try {
      const response = await fetch('/api/ai/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: member.name,
          birthYear: member.birthYear,
          relationship: member.role,
          profileContext: profile?.name
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setNumerologyReading({ name: member.name, reading: data.reading });
      toast.success("Divine insights revealed.");
    } catch (error: any) {
      toast.error("The stars are clouded right now. Try again later.");
      console.error(error);
    } finally {
      setIsCalculatingNumerology(false);
    }
  };
  const { language, setLanguage, t: globalT } = useLanguage();
  const { user, signIn, signInWithFacebook, setAuthModalOpen } = useFirebase();

  useEffect(() => {
    // If the authenticated user changes, and we are in login step, we can try to fetch their profile
    const syncProfile = async () => {
      if (user && step === 'login' && user.email) {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/vamshavali/profile/${encodeURIComponent(user.email)}`);
          if (res.ok) {
            const data = await res.json();
            setProfile(data);
            setStep('dashboard');
            toast.success("Welcome to your Vamshavali Dashboard");
          } else {
            // Profile doesn't exist yet, we can stay on login or auto-create in server
            // For now, let's just use the email and move to dashboard
            setEmail(user.email);
            // The verify-otp endpoint normally creates it, but socially we might need a direct create/fetch
            setStep('dashboard');
          }
        } catch (error) {
          console.error("Error fetching social profile:", error);
          setEmail(user.email);
          setStep('dashboard');
        } finally {
          setIsLoading(false);
        }
      }
    };
    syncProfile();
  }, [user]);

  const handleSocialSignIn = async (provider: 'google' | 'facebook') => {
    try {
      if (provider === 'google') {
        await signIn();
      } else {
        await signInWithFacebook();
      }
    } catch (error) {
      console.error("Social sign-in error:", error);
    }
  };

  useEffect(() => {
    // Force English as default for this page specifically as per user request
    if (language !== 'en') {
      setLanguage('en');
    }
  }, []);
  const vt = globalT.vamshavali;

  const downloadManual = async () => {
    const toastId = toast.loading(vt.downloadManual + "...");
    try {
      // For Hindi/Bangla, we use a hidden HTML element and html2canvas to ensure font rendering
      const manualElement = document.createElement('div');
      manualElement.style.padding = '80px';
      manualElement.style.width = '800px';
      manualElement.style.backgroundColor = 'white';
      manualElement.style.position = 'fixed';
      manualElement.style.left = '-9999px';
      manualElement.style.top = '-9999px';
      manualElement.className = 'font-sans';
      
      manualElement.innerHTML = `
        <div style="color: #064e3b; font-size: 32px; font-weight: 900; margin-bottom: 30px; font-family: serif; border-bottom: 2px solid #d4af37; padding-bottom: 15px;">${vt.manualPdfTitle}</div>
        <div style="margin-bottom: 30px;">
          <h3 style="color: #d4af37; font-size: 20px; font-weight: 800; border-bottom: 1px solid #fef3c7; padding-bottom: 5px;">${vt.manualIntro}</h3>
          <p style="color: #52525b; line-height: 1.6; margin-top: 10px;">${vt.manualIntroDesc}</p>
          <p style="color: #52525b; line-height: 1.6;">${vt.manualIntroDesch2}</p>
        </div>
        <div style="margin-bottom: 30px;">
          <h3 style="color: #d4af37; font-size: 20px; font-weight: 800; border-bottom: 1px solid #fef3c7; padding-bottom: 5px;">${vt.manualTree}</h3>
          <div style="color: #52525b; white-space: pre-line; margin-top: 10px; line-height: 1.6;">${vt.manualTreeList.join('\n')}</div>
        </div>
        <div style="margin-bottom: 30px;">
          <h3 style="color: #d4af37; font-size: 20px; font-weight: 800; border-bottom: 1px solid #fef3c7; padding-bottom: 5px;">${vt.manualEdit}</h3>
          <div style="color: #52525b; white-space: pre-line; margin-top: 10px; line-height: 1.6;">${vt.manualEditList.join('\n')}</div>
        </div>
        <div style="margin-bottom: 30px;">
          <h3 style="color: #d4af37; font-size: 20px; font-weight: 800; border-bottom: 1px solid #fef3c7; padding-bottom: 5px;">${vt.manualExport}</h3>
          <div style="color: #52525b; white-space: pre-line; margin-top: 10px; line-height: 1.6;">${vt.manualExportList.join('\n')}</div>
        </div>
        <div style="margin-bottom: 30px;">
          <h3 style="color: #d4af37; font-size: 20px; font-weight: 800; border-bottom: 1px solid #fef3c7; padding-bottom: 5px;">${vt.manualSecurity}</h3>
          <div style="color: #52525b; white-space: pre-line; margin-top: 10px; line-height: 1.6;">${vt.manualSecurityList.join('\n')}</div>
        </div>
        <div style="color: #a1a1aa; font-size: 12px; margin-top: 50px; text-align: center; border-top: 1px solid #f4f4f5; padding-top: 20px;">
          ${vt.manualFooter}
        </div>
      `;
      document.body.appendChild(manualElement);

      const canvas = await html2canvas(manualElement, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: 'white'
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Vamshavali_Manual_${language.toUpperCase()}.pdf`);
      
      document.body.removeChild(manualElement);
      toast.dismiss(toastId);
      toast.success(vt.manual + " downloaded!");
    } catch (error) {
      console.error("Manual Download Error:", error);
      toast.dismiss(toastId);
      toast.error("Failed to generate manual.");
    }
  };

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
    if (!profile) return;
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
        onclone: (clonedDoc) => {
          const treeWrapper = clonedDoc.querySelector('.transition-transform.origin-top');
          if (treeWrapper) (treeWrapper as HTMLElement).style.transform = 'scale(1)';
          
          const elements = clonedDoc.querySelectorAll('*');
          elements.forEach((el) => {
            const style = window.getComputedStyle(el);
            const props = ['color', 'backgroundColor', 'borderColor', 'outlineColor'];
            
            props.forEach(prop => {
              const value = (el as HTMLElement).style.getPropertyValue(prop) || style.getPropertyValue(prop);
              if (value && (value.includes('oklch') || value.includes('var('))) {
                // Approximate conversion for core identity colors
                if (prop === 'backgroundColor') {
                  if (value.includes('0.06')) (el as HTMLElement).style.backgroundColor = '#064e3b';
                  else if (value.includes('0.96')) (el as HTMLElement).style.backgroundColor = '#f4f4f5';
                }
                if (prop === 'color' && value.includes('d4af37')) {
                   (el as HTMLElement).style.color = '#d4af37';
                }
              }
            });
          });
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF(canvas.width > canvas.height ? 'l' : 'p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`family_Vamshavali_History.pdf`);
      
      toast.dismiss(toastId);
      toast.success("Family History Saved");
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast.dismiss(toastId);
      toast.error("Generation failed. Please try on desktop browser.");
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
  const updateMemberFromModal = (formData: any) => {
    if (!editingNode || !profile) return;
    
    const updateRecursive = (members: FamilyMember[]): FamilyMember[] => {
      return members.map(m => {
        if (m.id === editingNode.id) {
          const updated: FamilyMember = {
            ...m,
            name: formData.name,
            birthYear: formData.birthYear,
            photo: formData.photo,
          };
          
          if (formData.hasPartner) {
            updated.partner = {
              name: formData.partnerName,
              birthYear: formData.partnerBirthYear,
              photo: formData.partnerPhoto
            };
          } else {
            delete updated.partner;
          }
          
          return updated;
        }
        return { ...m, children: updateRecursive(m.children) };
      });
    };

    setProfile({ ...profile, members: updateRecursive(profile.members) });
    setIsEditModalOpen(false);
    setEditingNode(null);
  };

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
             <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-[#f4f4f5] bg-[#064e3b] flex items-center justify-center">
                <Users className="text-[#d4af37]" size={24} />
             </div>
             <div className="flex flex-col">
                <h1 className="font-black text-lg tracking-tight leading-none text-zinc-900">{vt.title}</h1>
                <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest mt-1">{vt.subtitle}</span>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="hidden md:flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200">
              {(['en', 'hi', 'bn'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    language === lang ? 'bg-white text-[#064e3b] shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  {lang === 'en' ? 'ENG' : lang === 'hi' ? 'HIN' : 'BEN'}
                </button>
              ))}
            </div>

            <button 
              onClick={downloadManual}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#d4af37] text-[#064e3b] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all shadow-sm"
            >
              <FileText size={16} /> 
              <span className="hidden sm:inline">{vt.manual}</span>
            </button>

            {step === 'dashboard' && !isPublic && (
              <button onClick={logout} className="p-3 rounded-xl bg-zinc-50 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all">
                <LogOut size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={`mx-auto pt-12 transition-all duration-700 ease-in-out ${
        step === 'dashboard' && profile 
          ? (isFullScreen 
              ? 'max-w-none px-0 pt-0 fixed inset-0 z-[100] bg-[#fdfbf7] overflow-hidden' 
              : 'max-w-7xl px-6 pb-20') 
          : 'max-w-4xl px-6 pb-20'
      }`}>
        <AnimatePresence mode="wait">
          {step === 'dashboard' && !isPublic && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-white rounded-3xl shadow-xl border-2 border-[#d4af37]/20"
            >
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${isEditing ? 'bg-[#064e3b] text-white' : 'bg-[#fff7ed] text-[#ea580c]'} shadow-lg transition-all`}>
                  <Settings size={24} className={isEditing ? 'animate-spin-slow' : ''} />
                </div>
                <div>
                  <h3 className="font-serif font-black text-[#064e3b] text-xl">Chronicle Controls</h3>
                  <p className="text-[#a1a1aa] text-[10px] font-bold uppercase tracking-widest">Manage your family heritage</p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex-1 md:flex-none px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 ${isEditing ? 'bg-[#18181b] text-white hover:bg-black' : 'bg-[#ea580c] text-white hover:bg-[#c2410c]'}`}
                >
                  {isEditing ? <><Save size={18} /> {vt.finishEditing}</> : <><Edit3 size={18} /> {vt.modifyLineage}</>}
                </button>
                <button 
                  onClick={downloadPDF}
                  className="flex-1 md:flex-none px-8 py-3 bg-[#064e3b] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-[#065f46] transition-all flex items-center justify-center gap-2"
                >
                  <Download size={18} /> {vt.saveScroll}
                </button>
              </div>
            </motion.div>
          )}

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
                        {vt.loginTitle}
                      </h2>
                      <p className="text-emerald-100 text-lg leading-relaxed max-w-sm">
                        {vt.loginSubtitle}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-4">
                      <button 
                        onClick={downloadManual}
                        className="flex items-center gap-2 px-6 py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[rgba(255,255,255,0.2)] transition-all"
                      >
                        <FileText size={18} /> {vt.manual}
                      </button>
                      
                      {/* Mobile Language Selector */}
                      <div className="flex md:hidden items-center bg-[rgba(255,255,255,0.1)] p-1 rounded-2xl border border-[rgba(255,255,255,0.2)]">
                        {(['en', 'hi', 'bn'] as Language[]).map((lang) => (
                          <button
                            key={lang}
                            onClick={() => setLanguage(lang)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              language === lang ? 'bg-[#d4af37] text-[#064e3b]' : 'text-emerald-100'
                            }`}
                          >
                            {lang === 'en' ? 'EN' : lang === 'hi' ? 'HI' : 'BN'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 pt-8">
                      {[
                        { icon: <Landmark size={20}/>, title: "Historical Identity", desc: "Secure your Gotra and Kuldevta records forever." },
                        { icon: <Users size={20}/>, title: "Lineage Mapping", desc: "Connect generations across time and geography." },
                        { icon: <CheckCircle2 size={20}/>, title: "Future Legacy", desc: "Leave a clear, verified history for those who come after you." }
                      ].map((item, i) => (
                        <div key={i} className="flex gap-4 p-4 rounded-2xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                          <div className="text-[#fb923c] shrink-0">{item.icon}</div>
                          <div>
                            <h4 className="font-bold text-sm tracking-wide">{item.title}</h4>
                            <p className="text-[rgba(167,243,208,0.8)] text-xs mt-1 leading-normal font-medium">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative z-10 pt-12 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#065f46] flex items-center justify-center border border-[#064e3b]">
                      <Users size={16} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6ee7b7]">
                      Join thousands of lineages being preserved online
                    </p>
                  </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="hidden md:block w-px bg-[#e5e1d8]" />
                <div className="flex-1 p-12 flex flex-col justify-center bg-white">
                  <div className="max-w-sm mx-auto w-full space-y-10">
                    <div className="text-center md:text-left space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ecfdf5] text-[#047857] rounded-full text-[10px] font-black uppercase tracking-widest border border-[#d1fae5]">
                        <ShieldCheck size={12} /> Secure Access
                      </div>
                      <h3 className="text-4xl font-serif font-black text-zinc-900 tracking-tight">Access Dashboard</h3>
                      <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                        Sign in with your email to view your personal family tree or start a new lineage profile.
                      </p>
                    </div>

                    <form onSubmit={handleSendOTP} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest ml-4">Email Address</label>
                        <div className="relative group">
                          <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-[#a1a1aa] group-focus-within:text-[#059669] transition-colors" size={18} />
                          <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. name@family.com"
                            required
                            className="w-full pl-14 pr-6 py-5 bg-[#fdfbf7] border-2 border-[#e5e1d8] focus:border-[#F58E27] focus:bg-white rounded-2xl font-bold transition-all outline-none"
                          />
                        </div>
                      </div>

                      <button 
                        disabled={isLoading}
                        className="w-full py-5 bg-[#064e3b] text-[#fff7ed] rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-[#18181b] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#064e3b]/10 flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Generate Access Code <ArrowRight size={18} /></>}
                      </button>
                    </form>

                    <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-100"></div>
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-black">
                        <span className="bg-white px-4 text-zinc-400">Or continue with social</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => handleSocialSignIn('google')}
                        className="flex items-center justify-center gap-3 py-4 bg-white border-2 border-zinc-100 rounded-2xl hover:bg-zinc-50 hover:border-brand-500/30 transition-all text-xs font-bold text-zinc-700 active:scale-[0.98] shadow-sm"
                      >
                        <Globe size={18} className="text-brand-600" />
                        Google
                      </button>
                      <button 
                        onClick={() => handleSocialSignIn('facebook')}
                        className="flex items-center justify-center gap-3 py-4 bg-[#1877F2] hover:bg-[#166fe5] rounded-2xl transition-all text-xs font-bold text-white active:scale-[0.98] shadow-lg shadow-[#1877F2]/20"
                      >
                        <Facebook size={18} fill="currentColor" />
                        Facebook
                      </button>
                    </div>

                    <div className="pt-8 border-t border-zinc-100 flex flex-col items-center gap-4">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">New to Digital Lineage?</p>
                      <button 
                        onClick={() => setAuthModalOpen(true)}
                        className="w-full py-4 bg-white border-2 border-brand-200 text-brand-700 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-brand-50 hover:border-brand-300 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Plus size={16} /> Create your own Account
                      </button>
                    </div>

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
                <div className="absolute top-0 left-0 w-full h-2 bg-[#059669]" />
                
                <div className="w-24 h-24 bg-[#ecfdf5] rounded-full flex items-center justify-center mx-auto text-[#059669] shadow-inner border-2 border-[#d1fae5]">
                  <ShieldCheck size={40} />
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-3xl font-serif font-black text-[#18181b] tracking-tight italic">Confirm Identity</h2>
                  <p className="text-[#71717a] text-sm font-medium leading-relaxed">
                    Check your inbox for a 6-digit code sent to <br />
                    <span className="font-bold text-[#047857] bg-[#ecfdf5] px-2 py-0.5 rounded-md mt-1 inline-block">{email}</span>
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
                    className="w-full px-6 py-6 bg-white border-2 border-[#e5e1d8] focus:border-[#059669] focus:bg-white rounded-2xl font-black text-4xl text-center tracking-[0.25em] transition-all outline-none text-[#064e3b] shadow-inner"
                  />
                  <button 
                    disabled={isLoading}
                    className="w-full py-5 bg-[#064e3b] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-[#065f46] transition-all shadow-xl shadow-[#064e3b]/10 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Verify Identity"}
                  </button>
                </form>

                <button 
                  onClick={() => setStep('login')}
                  className="text-[#a1a1aa] text-[10px] font-black uppercase tracking-[0.2em] hover:text-[#047857] transition-colors flex items-center justify-center gap-2 mx-auto"
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
                <div className="space-y-12">
                  {/* Grand Header Panel */}
                  <div className="bg-[#064e3b] rounded-[3.5rem] p-8 md:p-16 text-white shadow-2xl relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')]">
                    {/* Decorative Background Pattern */}
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]" />
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-[rgba(212,175,55,0.1)] rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[rgba(52,211,153,0.05)] rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                      <div className="relative">
                        <div className="w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] bg-gradient-to-tr from-[#d4af37] via-[#f4e4bc] to-[#d4af37] p-1 shadow-2xl rotate-3">
                          <div className="w-full h-full rounded-[2.3rem] bg-[#064e3b] flex items-center justify-center -rotate-3 overflow-hidden">
                            {profile.members[0]?.photo ? (
                               <img src={profile.members[0].photo} className="w-full h-full object-cover opacity-80 mix-blend-luminosity" />
                            ) : (
                               <Landmark size={64} className="text-[#d4af37]/40" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 text-center md:text-left space-y-4">
                        <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-[rgba(212,175,55,0.1)] rounded-full border border-[rgba(212,175,55,0.3)]">
                          <div className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d4af37]">Royal Heritage Registry</span>
                        </div>
                        
                        {isEditing ? (
                          <input 
                            value={profile.name}
                            onChange={(e) => setProfile({...profile, name: e.target.value})}
                            className="text-4xl md:text-6xl font-serif font-black bg-white/5 border-b-2 border-[#d4af37]/30 outline-none w-full py-2 tracking-tight italic"
                          />
                        ) : (
                          <h2 className="text-5xl md:text-7xl font-serif font-black tracking-tight italic leading-tight">
                            {profile.name || vt.houseOf + " family"}
                          </h2>
                        )}
                        
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
                           {!isPublic && (
                             <div className="px-5 py-2.5 bg-[rgba(255,255,255,0.05)] rounded-2xl border border-[rgba(255,255,255,0.1)] flex items-center gap-3 backdrop-blur-sm">
                                <Share2 size={16} className="text-[#d4af37]" />
                                <span className="text-[10px] font-mono opacity-60">
                                  {window.location.host}/...{profile.shareId?.slice(-6)}
                                </span>
                                <button onClick={copyLink} className="p-1.5 hover:text-[#d4af37] transition-colors">
                                   <Copy size={16} />
                                </button>
                             </div>
                           )}
                           <button onClick={downloadPDF} className="px-6 py-2.5 bg-[#d4af37] text-[#064e3b] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-transform">
                               {vt.exportScroll}
                           </button>
                           <button onClick={downloadManual} className="px-6 py-2.5 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[rgba(255,255,255,0.2)] transition-colors flex items-center gap-2">
                               <FileText size={16} /> {vt.manual}
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Lateral Details */}
                    <div className="lg:col-span-1 space-y-6">
                      <div className="p-8 bg-white rounded-[2.5rem] border border-[#f4f4f5] shadow-xl space-y-8 h-full">
                        <div className="pb-4 border-b border-[#f4f4f5] flex items-center justify-between">
                           <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#064e3b]">{vt.lineageDetails}</h4>
                           <Landmark size={18} className="text-[#d4af37]" />
                        </div>
                        
                        {[
                          { icon: <Users size={16}/>, label: "Parents", value: profile.parents, key: 'parents' },
                          { icon: <Landmark size={16}/>, label: "Gotra", value: profile.gotra, key: 'gotra' },
                          { icon: <Home size={16}/>, label: "Kuldevi Name", value: profile.kuldevi, key: 'kuldevi' },
                          { icon: <MapPin size={16}/>, label: "Native Origin", value: profile.nativePlace, key: 'nativePlace' },
                        ].map((item, i) => (
                          <div key={i} className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest">
                              {item.icon} {item.label}
                            </label>
                            {isEditing ? (
                              <div className="space-y-3">
                                <input 
                                  value={item.value}
                                  onChange={(e) => setProfile({...profile, [item.key]: e.target.value})}
                                  className="w-full px-4 py-3 bg-[#fafafa] border border-[#f4f4f5] rounded-xl font-bold text-xs tracking-tight text-[#18181b]"
                                />
                                {item.key === 'kuldevi' && (
                                  <div className="pt-2">
                                    <p className="text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest mb-2 ml-1">Kuldevi Portrait</p>
                                    <div className="flex items-center gap-3">
                                      <div className="w-12 h-16 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center">
                                        {profile.kuldeviPhoto ? (
                                          <img src={profile.kuldeviPhoto} alt="Kuldevi" className="w-full h-full object-cover" />
                                        ) : (
                                          <Landmark size={20} className="text-zinc-300" />
                                        )}
                                      </div>
                                      <label className="flex-1 px-4 py-2 bg-[#d4af37] text-[#064e3b] rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-[#b68d40] transition-colors text-center">
                                        Upload Sacred Picture
                                        <input 
                                          type="file" 
                                          accept="image/*"
                                          onChange={(e) => handlePhotoUpload(e, (base64: string) => setProfile({...profile, kuldeviPhoto: base64}))}
                                          className="hidden"
                                        />
                                      </label>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="font-bold text-[#18181b] tracking-tight text-sm">{item.value || "—"}</p>
                            )}
                          </div>
                        ))}

                        <div className="pt-4 border-t border-[#f4f4f5]">
                          <label className="flex items-center gap-2 text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest mb-2">
                             Chronicles
                          </label>
                          {isEditing ? (
                            <textarea 
                              value={profile.additionalNotes}
                              onChange={(e) => setProfile({...profile, additionalNotes: e.target.value})}
                              className="w-full px-4 py-3 bg-[#fafafa] border border-[#f4f4f5] rounded-xl font-bold text-xs min-h-[120px]"
                            />
                          ) : (
                            <p className="text-[#52525b] font-medium text-xs leading-relaxed italic">"{profile.additionalNotes || "Records empty."}"</p>
                          )}
                        </div>

                        {/* Manual Vedic Numerology Box */}
                        <div className="pt-8 border-t border-[#f4f4f5] space-y-4">
                           <div className="flex items-center gap-2">
                              <BookOpen size={18} className="text-[#d4af37]" />
                              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#064e3b]">Vedic Numerology</h4>
                           </div>
                           <p className="text-[9px] text-[#71717a] font-medium leading-relaxed italic">
                             Ancient Sankhya Shastra reveals the spiritual path through the vibrations of names and dates.
                           </p>
                           <div className="space-y-3 p-4 bg-[#fdfbf7] rounded-2xl border border-[#fef3c7]">
                              <input 
                                id="manual_numerology_name"
                                placeholder="Enter Name..."
                                className="w-full px-4 py-2 bg-white border border-[#f4f4f5] rounded-xl text-xs font-bold outline-none focus:border-[#d4af37]"
                              />
                              <button 
                                onClick={() => {
                                  const nameInput = document.getElementById('manual_numerology_name') as HTMLInputElement;
                                  if (nameInput?.value) {
                                    getVedicNumerology({ name: nameInput.value, birthYear: 'Present', role: 'Descendant', children: [], id: 'manual' });
                                  } else {
                                    toast.error("Please provide a name for the reading.");
                                  }
                                }}
                                className="w-full py-2 bg-[#064e3b] text-[#d4af37] rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-emerald-900 transition-all"
                              >
                                Reveal Divine Path
                              </button>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Genealogy Map Container */}
                    <div className="lg:col-span-3 space-y-8">
                       <div className="flex items-center justify-between px-4">
                          <div className="flex items-center gap-4">
                             <div className="w-8 h-1 bg-[#d4af37] rounded-full" />
                                 <h3 className="text-xl font-serif font-black text-[#064e3b] italic">{vt.generationMapping}</h3>
                          </div>
                          {isEditing && (
                             <div className="flex gap-4">
                                <button onClick={() => addMember(null)} className="px-6 py-2.5 bg-white border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-[#d4af37] transition-all flex items-center gap-2 text-zinc-600">
                                   <Plus size={14}/> Add Root
                                </button>
                                <button 
                                   onClick={handleUpdateProfile}
                                   className="px-6 py-2.5 bg-[#064e3b] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2"
                                >
                                   {isLoading ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> {vt.preserve}</>}
                                </button>
                             </div>
                          )}
                       </div>

                       <div className="relative group/canvas h-full flex flex-col">
                          {/* Tree Controls */}
                          <div id="tree-controls" className={`absolute z-30 flex gap-3 transition-all duration-500 ${isFullScreen ? 'top-10 left-1/2 -translate-x-1/2 flex-row bg-white/40 p-2 rounded-3xl backdrop-blur-md border border-white/20 shadow-2xl' : 'top-10 right-10 flex-col'}`}>
                             <button 
                              type="button"
                              onClick={() => setTreeScale(prev => Math.min(prev + 0.1, 2))}
                              className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center text-[#064e3b] hover:bg-[#d4af37] hover:text-white transition-all border-2 border-[#d4af37]/20"
                              title="Zoom In"
                             >
                               <Plus size={24} />
                             </button>
                             <button 
                              type="button"
                              onClick={() => setTreeScale(prev => Math.max(prev - 0.1, 0.4))}
                              className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center text-[#064e3b] hover:bg-[#d4af37] hover:text-white transition-all border-2 border-[#d4af37]/20"
                              title="Zoom Out"
                             >
                               <ChevronDown size={24} className="rotate-180" />
                             </button>
                             <button 
                              type="button"
                              onClick={autoFitTree}
                              className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center text-[#064e3b] hover:bg-[#d4af37] hover:text-white transition-all border-2 border-[#d4af37]/20"
                              title="Auto Fit"
                             >
                               <Maximize size={22} />
                             </button>
                             <button 
                              type="button"
                              onClick={toggleFullScreen}
                              className={`w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center transition-all border-2 ${isFullScreen ? 'bg-[#18181b] text-[#d4af37] border-white/20' : 'bg-white/90 text-[#064e3b] border-[#d4af37]/20 hover:bg-[#064e3b] hover:text-white'}`}
                              title={isFullScreen ? "Exit Full Screen" : "Full Screen View"}
                             >
                               {isFullScreen ? <Minimize2 size={24} /> : <ScreenShare size={24} />}
                             </button>
                          </div>

                          {/* Tree Stage */}
                          <div 
                            ref={treeRef}
                            id="genealogy_container"
                            className={`bg-[#fcf8f1] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] overflow-x-auto overflow-y-auto relative bg-[url('https://www.transparenttextures.com/patterns/old-map.png')] bg-repeat transition-all duration-500 ease-in-out ${
                              isFullScreen 
                                ? 'h-screen w-screen rounded-none border-0 p-32 pt-48' 
                                : 'rounded-[3.5rem] border-[10px] border-[#d4af37] min-h-[800px] p-24 md:p-32'
                            }`}
                          >
                            <div className="absolute inset-4 border border-[#d4af37]/20 pointer-events-none rounded-[2.8rem]" />
                            <div className="absolute inset-6 border-2 border-[#d4af37]/10 pointer-events-none rounded-[2.3rem]" />
                            
                            {/* Decorative Corner Ornaments */}
                            <div className="absolute top-10 left-10 p-2 text-[#d4af37]/20 -rotate-12"><Landmark size={48} /></div>
                            <div className="absolute top-10 right-10 p-2 text-[#d4af37]/20 rotate-12"><Landmark size={48} /></div>
                            <div className="absolute bottom-10 left-10 p-2 text-[#d4af37]/20 rotate-12"><Landmark size={48} /></div>
                            <div className="absolute bottom-10 right-10 p-2 text-[#d4af37]/20 -rotate-12"><Landmark size={48} /></div>
                            
                            <div 
                              className="inline-block min-w-max text-center relative z-10 pt-12 pb-32 transition-transform duration-300 ease-out origin-top"
                              style={{ transform: `scale(${treeScale})` }}
                            >
                               <div className="mb-24 flex flex-col items-center">
                                  {(profile.kuldevi || profile.kuldeviPhoto) && (
                                    <div className="mb-16">
                                      <DeityFrame photo={profile.kuldeviPhoto} name={profile.kuldevi} />
                                    </div>
                                  )}
                                  <VintageScroll title={`${vt.eternalLineage} ${profile.name || 'family'}`} />
                                  <RoyalOrnament />
                               </div>
                               <div className="flex justify-center">
                                 <TreeStructure 
                                  members={profile.members} 
                                  isEditing={isEditing} 
                                  onEdit={(node: any) => {
                                    setEditingNode(node);
                                    setIsEditModalOpen(true);
                                  }}
                                  onRemove={removeMember}
                                  onAddChild={addMember}
                                  onGetNumerology={getVedicNumerology}
                                 />
                               </div>
                               
                               <div className="mt-48 opacity-30 italic text-[#8a6821] text-xs font-serif">
                                  Records maintained by {profile.name} via {vt.archives}
                               </div>
                            </div>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <EditMemberModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        member={editingNode}
        onSave={updateMemberFromModal}
        handlePhotoUpload={handlePhotoUpload}
      />

      {/* Numerology Insights Modal */}
      <AnimatePresence>
        {(numerologyReading || isCalculatingNumerology) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#064e3b]/30 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white rounded-[3.5rem] w-full max-w-2xl overflow-hidden shadow-[0_50px_150px_rgba(0,0,0,0.4)] border-4 border-[#d4af37] relative"
            >
              {/* Sacred Design Elements */}
              <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-r from-[#d4af37] via-white to-[#d4af37]" />
              <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[#d4af37]/20 pointer-events-none">
                 <Landmark size={120} strokeWidth={0.5} />
              </div>

              <div className="p-10 relative z-10">
                <div className="flex justify-between items-start mb-12">
                  <div className="space-y-2">
                    <h3 className="text-4xl font-serif font-black text-[#064e3b] italic tracking-tight">Vedic Numerology</h3>
                    <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-[0.4em]">Sankhya Shastra • Spiritual Insights</p>
                  </div>
                  <button 
                    onClick={() => setNumerologyReading(null)}
                    className="p-3 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {isCalculatingNumerology ? (
                  <div className="py-24 text-center space-y-8">
                     <div className="relative inline-block">
                        <div className="absolute inset-0 bg-[#d4af37]/20 blur-2xl rounded-full animate-pulse" />
                        <Loader2 className="animate-spin text-[#d4af37] relative" size={64} strokeWidth={1} />
                     </div>
                     <p className="text-[#b68d40] text-sm font-serif italic animate-pulse">Consulting the celestial patterns for {editingNode?.name || 'the lineage'}...</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="p-8 bg-[#fdfbf7] rounded-[2.5rem] border border-[#fef3c7] shadow-inner">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-[#064e3b] rounded-2xl flex items-center justify-center text-[#d4af37] shadow-lg">
                           <Sparkles size={20} />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-[#18181b] tracking-tight">{numerologyReading?.name}</h4>
                          <p className="text-[9px] font-black text-[#d4af37] uppercase tracking-[0.2em]">Sacred Reading</p>
                        </div>
                      </div>

                      <div className="prose prose-sm prose-zinc max-h-[400px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-[#d4af37]/20 font-medium leading-relaxed text-[#52525b]">
                         <Markdown>{numerologyReading?.reading || ''}</Markdown>
                      </div>
                    </div>

                    <div className="flex items-center justify-center pt-4">
                       <RoyalOrnament />
                    </div>
                  </div>
                )}

                <div className="mt-8 p-6 bg-[#064e3b]/5 rounded-2xl border border-[rgba(212,175,55,0.1)]">
                   <p className="text-[#8a6821] text-[10px] font-medium leading-relaxed text-center italic">
                     "Numbers are the cosmic vibrations that define the rhythm of the soul. In the Vedic tradition, each digit is a portal to the divine energy of the cosmos."
                   </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TreeStructure = ({ members, isEditing, onEdit, onRemove, onAddChild, onGetNumerology }: any) => {
  return (
    <div className="flex justify-center gap-16 md:gap-32 px-10">
      {members.map((member: FamilyMember, index: number) => (
        <div key={member.id} className="relative flex flex-col items-center">
          {/* Node Wrapper */}
          <div className="flex flex-col items-center group relative z-20">
            {/* Couple/Individual Container */}
            <div className={`relative flex items-center gap-4 md:gap-8 p-3 md:p-6 rounded-[2rem] md:rounded-[4rem] transition-all duration-700 ${member.partner ? 'bg-white/40 backdrop-blur-sm border-2 border-[#d4af37]/30 shadow-[0_30px_60px_-15px_rgba(182,141,64,0.2)]' : 'bg-transparent'}`}>
              
              {/* Member */}
              <div className="flex flex-col items-center text-center">
                <div 
                  className={`relative transition-all duration-500 ease-out ${isEditing ? 'cursor-pointer hover:scale-110 active:scale-95' : ''}`}
                  onClick={() => isEditing && onEdit(member)}
                >
                  <GoldenFrame photo={member.photo} name={member.name} />
                  {isEditing && (
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-[#059669] text-white rounded-full flex items-center justify-center shadow-2xl z-30 border-2 border-white animate-bounce-slow">
                      <Edit2 size={16} />
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex flex-col items-center">
                  <h4 className="font-serif font-black text-[#58441c] text-base md:text-xl uppercase tracking-tight leading-none whitespace-nowrap drop-shadow-sm">
                    {member.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-px w-3 bg-[#d4af37]/40" />
                    <p className="text-[10px] md:text-xs text-[#71717a] font-bold italic">{member.birthYear}</p>
                    <div className="h-px w-3 bg-[#d4af37]/40" />
                  </div>
                  <div className="px-3 py-1 bg-[#064e3b] text-[#d4af37] text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-3 rounded-full shadow-md">
                    {member.role}
                  </div>
                </div>
              </div>

              {/* Partner Section */}
              {member.partner && (
                <>
                  {/* Union Symbol */}
                  <div className="flex flex-col items-center relative py-10">
                     <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-[#fdfbf7] border-2 border-[#d4af37]/20 flex items-center justify-center shadow-lg transform rotate-45 group-hover:rotate-[225deg] transition-transform duration-1000">
                        <Heart size={20} className="text-[#fb7185] -rotate-45" fill="currentColor" />
                     </div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent pointer-events-none" />
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div 
                      className={`relative transition-all duration-500 ease-out ${isEditing ? 'cursor-pointer hover:scale-110 active:scale-95' : ''}`}
                      onClick={() => isEditing && onEdit(member)}
                    >
                      <GoldenFrame photo={member.partner.photo} name={member.partner.name} size="sm" />
                    </div>
                    
                    <div className="mt-6 flex flex-col items-center">
                      <h4 className="font-serif font-black text-[#58441c] text-sm md:text-lg uppercase tracking-tight leading-none whitespace-nowrap drop-shadow-sm">
                        {member.partner.name}
                      </h4>
                      <p className="text-[10px] md:text-xs text-[#71717a] font-bold italic mt-2">{member.partner.birthYear}</p>
                      <p className="text-[#b68d40]/60 text-[8px] md:text-[10px] font-black uppercase tracking-widest mt-2 px-2 py-0.5 bg-white rounded-md border border-[#f4f4f5]">Partner</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons for Editing */}
            {isEditing && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 mt-10 p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl border border-[#d4af37]/20 opacity-0 group-hover:opacity-100 transition-all duration-300"
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); onAddChild(member.id); }}
                  className="w-12 h-12 bg-[#064e3b] text-[#d4af37] rounded-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-lg"
                  title="Add Generation"
                >
                  <Plus size={24}/>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(member.id); }}
                  className="w-12 h-12 bg-white text-red-600 rounded-xl border-2 border-red-50 hover:bg-red-50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-md"
                  title="Remove Lineage"
                >
                  <Trash2 size={24}/>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(member); }}
                  className="w-12 h-12 bg-white text-[#064e3b] rounded-xl border-2 border-zinc-100 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-md"
                  title="Registry Editor"
                >
                  <Settings size={22}/>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onGetNumerology(member); }}
                  className="w-12 h-12 bg-[#fdfbf7] text-[#d4af37] rounded-xl border-2 border-[#fef3c7] hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-md"
                  title="Vedic Insight"
                >
                  <BookOpen size={22}/>
                </button>
              </motion.div>
            )}
            
            {/* View Numerology Reading Button */}
            {!isEditing && (
              <div className="mt-8 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                <button 
                  onClick={() => onGetNumerology(member)}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#064e3b] to-[#065f46] text-[#d4af37] rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-[#d4af37]/30"
                >
                  <Sparkles size={14} /> Reveal Divine Path
                </button>
              </div>
            )}
          </div>

          {/* Children / Recursive Section */}
          {member.children.length > 0 && (
            <div className="pt-24 relative w-full">
              {/* Connector from parent DOWN to the sibling line level */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center h-12 w-full">
                 <div className="w-1 bg-gradient-to-b from-[#d4af37] to-[#d4af37]/40 h-full shadow-[0_0_10px_rgba(212,175,55,0.2)]" />
                 {/* Connection Point Ornament */}
                 <div className="w-5 h-5 rounded-full bg-[#064e3b] border-2 border-[#d4af37] -mt-2.5 shadow-xl z-20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37] shadow-[0_0_8px_gold]" />
                 </div>
              </div>
              
              <div className="flex justify-center gap-16 md:gap-32 relative mt-12">
                {member.children.map((child, index) => (
                  <div key={child.id} className="relative">
                    {/* Horizontal Line Segment to connect siblings */}
                    {member.children.length > 1 && (
                      <div 
                        className="absolute -top-12 h-1 bg-[#d4af37]/40"
                        style={{
                          left: index === 0 ? '50%' : '0',
                          right: index === member.children.length - 1 ? '50%' : '0',
                        }}
                      />
                    )}
                    {/* Vertical line from sibling bar DOWN to child */}
                    {member.children.length > 1 && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-1 h-12 bg-[#d4af37]/40" />
                    )}
                    {/* If single child, direct line down */}
                    {member.children.length === 1 && (
                       <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-1 h-12 bg-[#d4af37]/40" />
                    )}
                    
                    <TreeStructure 
                      members={[child]} 
                      isEditing={isEditing} 
                      onEdit={onEdit}
                      onRemove={onRemove}
                      onAddChild={onAddChild}
                      onGetNumerology={onGetNumerology}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default VamshavaliPage;
