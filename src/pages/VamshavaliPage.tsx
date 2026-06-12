import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Mail, ArrowRight, ShieldCheck, Save, Share2, 
  Download, Copy, Plus, Trash2, ChevronDown, ChevronRight,
  User, Home, Landmark, BookOpen, MapPin, Edit3, LogOut, FileText, Globe,
  CheckCircle2, AlertCircle, Loader2, X, Heart, Settings, Edit2, Sparkles,
  Maximize, Minimize2, ScreenShare, Facebook, MessageCircle, Fingerprint
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import * as htmlToImage from 'html-to-image';
import Markdown from 'react-markdown';
import { useFirebase } from '../FirebaseContext';
import { useLanguage } from '../LanguageContext';
import { Language } from '../i18n';
import { useTracking } from '../TrackingContext';
import { db, onSnapshot, doc } from '../firebase';

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  photo?: string;
  birthYear?: string;
  gender?: 'male' | 'female';
  partner?: {
    name: string;
    photo?: string;
    birthYear?: string;
    gender?: 'male' | 'female';
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
    gender: 'male' as 'male' | 'female',
    photo: '',
    partnerName: '',
    partnerBirthYear: '',
    partnerPhoto: '',
    partnerGender: 'female' as 'male' | 'female',
    hasPartner: false
  });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        birthYear: member.birthYear || '',
        role: member.role || '',
        gender: member.gender || (member.role?.toLowerCase().includes('daughter') || member.role?.toLowerCase().includes('mother') || member.role?.toLowerCase().includes('matriarch') ? 'female' : 'male'),
        photo: member.photo || '',
        partnerName: member.partner?.name || '',
        partnerBirthYear: member.partner?.birthYear || '',
        partnerPhoto: member.partner?.photo || '',
        partnerGender: member.partner?.gender || 'female',
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
                  onChange={(e) => {
                    const val = e.target.value;
                    const caps = val.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    setFormData({...formData, name: caps});
                  }}
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

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest ml-1">Vedas / Relationship Role</label>
                <input 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-6 py-4 bg-[#fafafa] border-2 border-[#f4f4f5] rounded-2xl font-bold focus:border-[#d4af37] outline-none transition-all text-[#18181b]"
                  placeholder="e.g. patriarch, mother, daughter, son"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest ml-1">Gender Identification</label>
                <div className="flex gap-4">
                  {['male', 'female'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormData({...formData, gender: g as any})}
                      className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 transition-all ${formData.gender === g ? 'bg-[#064e3b] text-white border-[#064e3b]' : 'bg-white text-zinc-600 border-zinc-200 hover:border-[#d4af37]/30'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
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
                    onChange={(e) => {
                      const val = e.target.value;
                      const caps = val.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                      setFormData({...formData, partnerName: caps});
                    }}
                    className="w-full px-6 py-4 bg-[#fafafa] border-2 border-[#f4f4f5] rounded-2xl font-bold focus:border-[#d4af37] outline-none transition-all text-[#18181b]"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest ml-1">Period Details</label>
                  <input 
                    value={formData.partnerBirthYear}
                    onChange={(e) => setFormData({...formData, partnerBirthYear: e.target.value})}
                    className="w-full px-6 py-4 bg-[#fafafa] border-2 border-[#f4f4f5] rounded-2xl font-bold focus:border-[#d4af37] outline-none transition-all text-[#18181b]"
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest ml-1">Partner Gender Identification</label>
                  <div className="flex gap-4">
                    {['male', 'female'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormData({...formData, partnerGender: g as any})}
                        className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 transition-all ${formData.partnerGender === g ? 'bg-[#064e3b] text-white border-[#064e3b]' : 'bg-white text-zinc-600 border-zinc-200 hover:border-[#d4af37]/30'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
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

const GoldenFrame = ({ photo, name, pulse = false, size = "md", gender = "male" }: { photo?: string; name: string; pulse?: boolean; size?: "sm" | "md"; gender?: "male" | "female" }) => {
  const sizeClasses = size === "sm" ? "w-16 h-16 md:w-20 md:h-20" : "w-20 h-20 md:w-28 md:h-28";
  const frameRingColor = gender === "female"
    ? "from-[#be185d] via-[#f43f5e] to-[#fecdd3]"
    : "from-[#8a6821] via-[#d4af37] to-[#f4e4bc]";
  
  return (
    <div className={`relative p-1 rounded-full bg-gradient-to-tr ${frameRingColor} shadow-[0_10px_25px_rgba(0,0,0,0.15)] ${pulse ? 'animate-pulse' : ''} group-hover:scale-105 transition-all duration-500 ease-out z-10 flex-shrink-0`}>
      {/* Decorative concentric gap ring inside */}
      <div className="absolute inset-[2px] rounded-full bg-white z-10 pointer-events-none" />
      {/* Ornate inner frame ring */}
      <div className="absolute inset-[4px] rounded-full bg-gradient-to-b from-transparent to-[#8a6821]/20 z-10 pointer-events-none border border-[#8a6821]/35" />
      
      <div className={`relative ${sizeClasses} rounded-full overflow-hidden bg-[#0a2f1d] z-20 flex items-center justify-center`}>
        {photo ? (
          <img 
            src={getSafeImageUrl(photo)} 
            alt={name} 
            className="w-full h-full object-cover transition-all duration-[1000ms] group-hover:scale-115"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d3c26] text-[#d4af37]/65">
            <User size={size === "sm" ? 22 : 32} strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

const getSafeImageUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.includes("telegram.org")) {
    return `/api/telegram-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
};

const DeityFrame = ({ photo, name, isKuldevta }: { photo?: string; name: string; isKuldevta?: boolean }) => {
  const safeUrl = getSafeImageUrl(photo);
  return (
    <div className="relative group mb-4 flex flex-col items-center">
      {/* Divine Aura / Energy Field */}
      <div className="absolute inset-0 bg-[#d4af37]/10 rounded-full blur-[80px] animate-pulse pointer-events-none" />
      
      {/* Floating Sparkles Decorating the Aura */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.7, 0], 
              scale: [0.5, 1.1, 0.7],
              y: [0, -60 - (Math.random() * 60)],
              x: [(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 120]
            }}
            transition={{ 
              duration: 4 + Math.random() * 3, 
              repeat: Infinity, 
              delay: i * 0.9,
              ease: "easeOut"
            }}
            className="absolute top-1/2 left-1/2 text-[#d4af37]/40"
          >
            <Sparkles size={6 + Math.random() * 6} />
          </motion.div>
        ))}
      </div>

      {/* The Ornate Frame */}
      <motion.div 
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative p-1.5 rounded-[2rem] bg-gradient-to-b from-[#f59e0b] via-[#d4af37] to-[#8a6821] shadow-[0_30px_70px_rgba(182,141,64,0.35)] border-2 border-[#fffbeb] z-25"
      >
        <div className="absolute inset-0 border-[10px] border-[#064e3b]/5 pointer-events-none rounded-[1.8rem]" />
        
        {/* Sacred Content */}
        <div className="relative w-40 h-56 md:w-56 md:h-76 rounded-[1.6rem] overflow-hidden bg-[#064e3b] shadow-inner border border-[#b68d40]/50">
          {safeUrl ? (
            <img src={safeUrl} alt={name} className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#d4af37]/35 p-6 text-center space-y-4">
              <Landmark size={56} strokeWidth={0.5} />
              <p className="text-[8px] font-black uppercase tracking-[0.25em] leading-relaxed">Sacred Presence of<br/>The Divine {isKuldevta ? "Lord" : "Mother"}</p>
            </div>
          )}
          
          {/* Spiritual Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#064e3b] via-[#064e3b]/10 to-transparent opacity-85 pointer-events-none" />
          
          {/* Light Rays */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent skew-x-[-20deg] origin-top opacity-20 pointer-events-none" />
          
          <div className="absolute bottom-5 left-0 right-0 text-center px-3">
            <h5 className="text-[#d4af37] font-serif font-black text-lg md:text-xl italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight">
              {name || (isKuldevta ? "Deva" : "Mata")}
            </h5>
            <p className="text-[7px] md:text-[8px] font-black text-white/50 uppercase tracking-[0.35em] mt-1.5">Protector of {name || (isKuldevta ? "Lord Shiva" : "Mata Rani")} Lineage</p>
          </div>
        </div>

        {/* Sacred Mantra Label */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#d4af37] text-[#064e3b] px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.25em] shadow-[0_5px_10px_rgba(0,0,0,0.15)] border border-white whitespace-nowrap">
          {isKuldevta ? "Om Deva Namah" : "Om Devi Namah"}
        </div>
      </motion.div>
      
      {/* Traditional Ornaments side decorations */}
      <div className="absolute -left-12 top-1/2 -translate-y-1/2 text-[#d4af37]/15 hidden lg:block">
        <div className="flex flex-col gap-4 items-end">
           <div className="w-8 h-px bg-current" />
           <div className="w-16 h-px bg-current opacity-50" />
           <div className="w-12 h-px bg-current" />
        </div>
      </div>
      <div className="absolute -right-12 top-1/2 -translate-y-1/2 text-[#d4af37]/15 hidden lg:block rotate-180">
        <div className="flex flex-col gap-4 items-end">
           <div className="w-8 h-px bg-current" />
           <div className="w-16 h-px bg-current opacity-50" />
           <div className="w-12 h-px bg-current" />
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
  kuldevtaPhoto?: string;
  nativePlace: string;
  additionalNotes: string;
  members: FamilyMember[];
}

let hasDraggedGlobal = false;

export const VamshavaliPage = ({ isPublic = false }: { isPublic?: boolean }) => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<'login' | 'otp' | 'dashboard'>('login');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<VamshavaliProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [numerologyReading, setNumerologyReading] = useState<{name: string, reading: string} | null>(null);
  const [isCalculatingNumerology, setIsCalculatingNumerology] = useState(false);
  const [treeScale, setTreeScale] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeLightboxMember, setActiveLightboxMember] = useState<any>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const lastLayoutWidth = useRef<number>(0);
  const lastLayoutHeight = useRef<number>(0);

  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPointerActive, setIsPointerActive] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffsetStart = useRef({ x: 0, y: 0 });
  const activePointers = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef<number>(1);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('input') || 
      target.closest('textarea') || 
      target.closest('select')
    ) {
      return;
    }

    setIsPointerActive(true);
    hasDraggedGlobal = false;
    activePointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    if (activePointers.current.size === 1) {
      dragStart.current = { x: e.clientX, y: e.clientY };
      dragOffsetStart.current = { ...panOffset };
    } else if (activePointers.current.size === 2) {
      setIsDragging(false);
      const pointers = Array.from(activePointers.current.values());
      const dist = Math.hypot(
        pointers[0].clientX - pointers[1].clientX,
        pointers[0].clientY - pointers[1].clientY
      );
      initialDistance.current = dist;
      initialScale.current = treeScale;
    }

    if (treeRef.current) {
      try {
        treeRef.current.setPointerCapture(e.pointerId);
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;

    activePointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const dragDistance = Math.hypot(dx, dy);

    if (dragDistance > 6) {
      hasDraggedGlobal = true;
    }

    if (activePointers.current.size === 1) {
      if (isDragging) {
        setPanOffset({
          x: dragOffsetStart.current.x + dx,
          y: dragOffsetStart.current.y + dy
        });
      } else if (dragDistance > 10) {
        // Exceeded the touch stabilization threshold, start actual dragging
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        dragOffsetStart.current = { ...panOffset };
      }
    } else if (activePointers.current.size === 2 && initialDistance.current !== null) {
      const pointers = Array.from(activePointers.current.values());
      const dist = Math.hypot(
        pointers[0].clientX - pointers[1].clientX,
        pointers[0].clientY - pointers[1].clientY
      );
      const factor = dist / initialDistance.current;
      const newScale = Math.min(Math.max(initialScale.current * factor, 0.15), 2.2);
      setTreeScale(newScale);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);

    if (activePointers.current.size < 2) {
      initialDistance.current = null;
    }

    if (activePointers.current.size === 0) {
      setIsDragging(false);
      setIsPointerActive(false);
    } else if (activePointers.current.size === 1) {
      const remainingPointerId = Array.from(activePointers.current.keys())[0];
      const remainingPointer = activePointers.current.get(remainingPointerId)!;
      setIsDragging(false);
      dragStart.current = { x: remainingPointer.clientX, y: remainingPointer.clientY };
      dragOffsetStart.current = { ...panOffset };
    }

    if (treeRef.current) {
      try {
        treeRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe check
      }
    }
  };

  useEffect(() => {
    if (step === 'dashboard' && profile && treeRef.current) {
      const container = treeRef.current;
      const scrollContent = container.querySelector('.inline-block');
      if (!container || !scrollContent) return;

      const runAutoFit = (force = false) => {
        const unscaledWidth = (scrollContent as HTMLElement).offsetWidth || 1;
        const unscaledHeight = (scrollContent as HTMLElement).offsetHeight || 1;

        // Container dimensions with a snug responsive margin
        const isMobile = window.innerWidth < 768;
        const marginOffset = isMobile ? 12 : (isFullScreen ? 60 : 40);
        const containerWidth = container.clientWidth - marginOffset;
        const containerHeight = container.clientHeight - marginOffset;

        if (unscaledWidth > 1 && unscaledHeight > 1 && containerWidth > 0 && containerHeight > 0) {
          // If unscaled layout has not changed and we aren't forcing, skip resetting scale to protect manual zooms
          if (!force && 
              unscaledWidth === lastLayoutWidth.current && 
              unscaledHeight === lastLayoutHeight.current) {
            return;
          }

          // If content size changed (meaning they added members/partners/etc.), reset pan to center!
          const didContentSizeChange = lastLayoutWidth.current > 0 && 
            (unscaledWidth !== lastLayoutWidth.current || unscaledHeight !== lastLayoutHeight.current);

          lastLayoutWidth.current = unscaledWidth;
          lastLayoutHeight.current = unscaledHeight;

          const scaleX = containerWidth / unscaledWidth;
          const scaleY = containerHeight / unscaledHeight;
          const idealScale = Math.min(scaleX, scaleY);
          
          // Fit the tree snugly in the layout. Allow it to scale down further if needed for large trees.
          const finalScale = Math.min(Math.max(idealScale, 0.08), 1.05);
          
          setTreeScale(finalScale);

          if (didContentSizeChange) {
            setPanOffset({ x: 0, y: 0 });
            toast.success("Perspective refocused to center new family members");
          }
        }
      };

      // Create resize observer to handle viewport frame changes and content changes automatically
      const resizeObserver = new ResizeObserver((entries) => {
        let shouldFit = false;
        for (const entry of entries) {
          if (entry.target === container) {
            shouldFit = true;
          } else if (entry.target === scrollContent) {
            const currentW = (scrollContent as HTMLElement).offsetWidth;
            const currentH = (scrollContent as HTMLElement).offsetHeight;
            if (currentW !== lastLayoutWidth.current || currentH !== lastLayoutHeight.current) {
              shouldFit = true;
            }
          }
        }
        if (shouldFit) {
          runAutoFit(true);
        }
      });

      resizeObserver.observe(container);
      resizeObserver.observe(scrollContent);

      // Trigger initial layout checks with staggered delays to ensure complete image/font rendering
      const t1 = setTimeout(() => runAutoFit(true), 50);
      const t2 = setTimeout(() => runAutoFit(true), 300);
      const t3 = setTimeout(() => runAutoFit(true), 800);

      return () => {
        resizeObserver.disconnect();
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [step, profile?.id, isFullScreen, profile?.members]);

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
  };

  const autoFitTree = () => {
    if (!treeRef.current) return;
    const container = treeRef.current;
    const scrollContent = container.querySelector('.inline-block');
    if (!scrollContent) return;

    const unscaledWidth = (scrollContent as HTMLElement).offsetWidth || 1;
    const unscaledHeight = (scrollContent as HTMLElement).offsetHeight || 1;

    lastLayoutWidth.current = unscaledWidth;
    lastLayoutHeight.current = unscaledHeight;

    const isMobile = window.innerWidth < 768;
    const marginOffset = isMobile ? 12 : (isFullScreen ? 60 : 40);
    const containerWidth = container.clientWidth - marginOffset;
    const containerHeight = container.clientHeight - marginOffset;

    const scaleX = containerWidth / unscaledWidth;
    const scaleY = containerHeight / unscaledHeight;
    const idealScale = Math.min(scaleX, scaleY);

    const finalScale = Math.min(Math.max(idealScale, 0.08), 1.05);
    setTreeScale(finalScale);
    setPanOffset({ x: 0, y: 0 });
    toast.success("Perspective adjusted to fit your screen");
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
      let data: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        console.warn("[VamshavaliPage] Numerology response is not JSON:", textResponse.slice(0, 300));
      }
      if (!response.ok) {
        throw new Error(data?.error || `Request failed with status ${response.status}`);
      }
      if (!data || !data.reading) {
        throw new Error("Invalid or empty reading returned.");
      }
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
  const { logEvent } = useTracking();

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
              logEvent('vamshavali_social_login', { email: user.email, profileId: data.id });
              toast.success("Welcome to your Vamshavali Dashboard");
            } else {
              // Profile doesn't exist yet, auto-create a basic one for social users
              setEmail(user.email);
              const basicProfile = {
                id: `v_${user.uid}`,
                email: user.email,
                name: user.displayName || user.email.split('@')[0],
                ownerName: user.displayName || user.email.split('@')[0],
                shareId: Math.random().toString(36).substring(2, 10).toUpperCase(),
                members: [],
                metadata: {
                  history: "",
                  description: "Family heritage chronicle created via Social Login",
                  traditions: []
                },
                updatedAt: new Date().toISOString()
              };
              
              // We'll save it to state so they can use it immediately
              setProfile(basicProfile as any);
              setStep('dashboard');
              toast.success("Created a new chronicle for you!");
              
              // Also try to persist it if they save later
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

  // Real-time synchronization listener
  useEffect(() => {
    if (profile?.id && db) {
      console.log(`[Vamshavali] Activating real-time sync for profile: ${profile.id}`);
      try {
        const profileRef = doc(db, 'vamshavali_profiles', profile.id);
        const unsubscribe = onSnapshot(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            const newData = snapshot.data() as any;
            // We update state only if it differs from the current profile and we're NOT in a local edit mode
            // (To prevent overwriting local changes if someone happened to be editing)
            if (!isEditing) {
              console.log(`[Vamshavali] Remote update detected for ${profile.id}. Syncing...`);
              setProfile(prev => {
                // Deep compare simple check to avoid unnecessary state updates
                if (JSON.stringify(prev) !== JSON.stringify(newData)) {
                  return { ...newData, id: snapshot.id };
                }
                return prev;
              });
            }
          }
        }, (error) => {
          console.error("[Vamshavali] Sync listener error:", error.message);
        });
        return () => {
          console.log(`[Vamshavali] Deactivating real-time sync for ${profile.id}`);
          unsubscribe();
        };
      } catch (err: any) {
        console.error("[Vamshavali] Snapshot attachment failed:", err.message);
      }
    }
  }, [profile?.id, isEditing]);

  const handleSocialSignIn = async (provider: 'google' | 'facebook') => {
    try {
      if (provider === 'google') {
        const isIframe = window.self !== window.top;
        if (isIframe) {
          toast.warning("Google login is restricted inside preview iframes by browser security policies. Opening in a new tab for you...", {
            duration: 6000
          });
          setTimeout(() => {
            window.open(window.location.href, '_blank');
          }, 1500);
          return;
        }
        await signIn();
      } else {
        await signInWithFacebook();
      }
    } catch (error: any) {
      console.error("Social sign-in error:", error);
      const errorCode = error?.code || 'unknown';
      const errorMessage = error?.message || 'Authentication failed';
      
      if (errorCode === 'auth/popup-blocked') {
        toast.error("Sign-in popup was blocked by your browser. Please allow popups for this site or open in a new tab.", {
          duration: 8000,
          action: {
            label: "Open in Tab",
            onClick: () => window.open(window.location.href, '_blank')
          }
        });
      } else if (errorCode === 'auth/unauthorized-domain' || errorMessage.includes('unauthorized-domain')) {
        const hostname = window.location.hostname;
        toast.error(`Unauthorized Domain: ${hostname} is not registered in Firebase. Please add this domain under Firebase Console > Auth > Settings > Authorized Domains, or sign in using email OTP.`, {
          duration: 10000
        });
      } else if (errorCode === 'auth/web-storage-unsupported') {
        toast.error("Third-party cookies/storage are blocked by your browser. Please allow cookies or open the app in a new tab.", {
          duration: 8000,
          action: {
            label: "Open in Tab",
            onClick: () => window.open(window.location.href, '_blank')
          }
        });
      } else {
        toast.error(`Google Sign-In failed: ${errorMessage} (${errorCode}). Try opening inside a new tab or use the Email OTP.`, {
          duration: 8000,
          action: {
            label: "Open in Tab",
            onClick: () => window.open(window.location.href, '_blank')
          }
        });
      }
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

      const dataUrl = await htmlToImage.toPng(manualElement, {
        backgroundColor: 'white',
        pixelRatio: 1.5,
        cacheBust: true
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = dataUrl;
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
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
      const data = await res.json();
      if (res.ok) {
        setStep('otp');
        if (data.debugOtp) {
          setDebugOtp(data.debugOtp);
        }
        toast.success("OTP sent to your email");
      } else {
        if (data.diagnostic) {
          console.error("Vamshavali OTP Diagnostic Report:", data.diagnostic);
        }
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
        logEvent('vamshavali_otp_login', { email, profileId: data.profile.id });
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

  const handleSyncProfile = async (targetProfile: any) => {
    try {
      console.log("[Vamshavali] Force syncing profile with server...", targetProfile.shareId);
      const res = await fetch('/api/vamshavali/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetProfile)
      });
      if (!res.ok) throw new Error("Sync rejected by server");
      const data = await res.json();
      return data.shareId || targetProfile.shareId;
    } catch (e) {
      console.error("[Vamshavali] Sync error:", e);
      return null;
    }
  };

  const validateShareIdForLink = (id: any): string => {
    let sid = String(id || '').trim();
    const invalid = !sid || 
                   sid.toLowerCase() === 'undefined' || 
                   sid.toLowerCase() === 'null' || 
                   sid.length < 4;
    
    if (invalid) {
      const newsid = 'V' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
      console.log("[Vamshavali] ID was invalid, generated:", newsid);
      return newsid;
    }
    return sid.toUpperCase();
  };

  const handleLinkTelegram = async () => {
    if (!profile) {
      toast.error("Please create a profile first.");
      return;
    }
    
    // 1. Get/Generate a strictly valid ID
    let finalShareId = validateShareIdForLink((profile as any).shareId || (profile as any).share_id);
    
    // Double check - we should NEVER have "undefined" string here
    if (finalShareId.toLowerCase().includes('undefined')) {
       finalShareId = 'V' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    const updatedProfile = { ...profile, shareId: finalShareId };
    setIsLoading(true);

    try {
      // 2. Synchronize with DB first
      const serverShareId = await handleSyncProfile(updatedProfile);
      
      if (!serverShareId || String(serverShareId).toLowerCase().includes('undefined')) {
        throw new Error("Server returned an invalid ID after sync");
      }

      const verifiedProfile = { ...updatedProfile, shareId: serverShareId };
      setProfile(verifiedProfile as any);
      
      // 3. Setup webhook before opening link and add small propagation delay
      try {
        await fetch('/api/webhooks/telegram/setup');
      } catch (e) {
        console.warn("[Telegram] Webhook setup background call failed:", e);
      }
      await new Promise(r => setTimeout(r, 1000));

      // 4. Final verification BEFORE building URL
      const safeId = String(serverShareId).trim().toUpperCase();
      if (safeId === 'UNDEFINED' || safeId === 'NULL' || safeId === '' || safeId.length < 4) {
        throw new Error(`Critical Error: ShareID is still invalid after sync ("${safeId}")`);
      }

      let botUsername = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '').trim().replace('@', '');
      if (!botUsername || botUsername.toLowerCase() === 'undefined' || botUsername.toLowerCase() === 'null') {
        botUsername = 'Vamshavali_bot';
      }
      const telegramUrl = `https://t.me/${botUsername}?start=${safeId}`;
      
      console.log("[Vamshavali] Linking Launch ->", telegramUrl);
      
      // Last-second check for "undefined" in the string itself
      if (telegramUrl.toLowerCase().includes('undefined')) {
        throw new Error(`URL contains 'undefined' string: ${telegramUrl}`);
      }

      window.open(telegramUrl, '_blank');
      toast.success(language === 'bn' ? 'টেলিগ্রাম খোলা হচ্ছে...' : "Opening Telegram...");
    } catch (error) {
      console.error("[Vamshavali] Link aborted:", error);
      toast.error(`System Error: ${error instanceof Error ? error.message : "Could not generate link properly"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportImage = async () => {
    if (!profile) return;
    setIsLoading(true);
    const toastId = toast.loading("Forging Royal Portrait...");
    
    try {
      const element = document.getElementById('genealogy_container');
      if (!element) throw new Error("Genealogy container not found");
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // DEEP SANITIZATION: We clone the element and force-reset every style that could break the capture
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = (element.scrollWidth) + 'px'; // Use scrollWidth to capture everything
      clone.style.height = 'auto';
      clone.style.overflow = 'visible';
      clone.style.backgroundColor = '#fcf8f1';
      clone.style.transform = 'none'; // Force 1:1 for capture
      document.body.appendChild(clone);

      try {
        // Hide UI elements in clone
        const controls = clone.querySelector('#tree-controls');
        if (controls) (controls as HTMLElement).style.display = 'none';
        
        const noPrints = clone.querySelectorAll('.no-print');
        noPrints.forEach((el: any) => el.style.display = 'none');

        // Color Conversion & Shadow Removal Layer
        const allNodes = clone.querySelectorAll('*');
        allNodes.forEach((node: any) => {
          try {
            const style = window.getComputedStyle(node);
            
            // 1. Force convert colors to absolute HEX/RGB to prevent oklab failures
            // Most capture libraries fail on modern CSS color functions like oklab(), display-p3, etc.
            const colorProps = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke', 'background'];
            colorProps.forEach(p => {
              const val = style[p as any];
              if (val && (val.includes('okl') || val.includes('var(') || val.includes('color('))) {
                let hex = '#064e3b'; // Default Forest Green
                if (val.includes('255, 255, 255') || val.includes('white')) hex = '#ffffff';
                if (val.includes('d4af37') || val.includes('gold')) hex = '#d4af37'; // Heritage Gold
                if (val.includes('fcf8f1') || val.includes('parchment')) hex = '#fcf8f1';
                
                node.style.setProperty(p === 'backgroundColor' ? 'background-color' : (p === 'borderColor' ? 'border-color' : p), hex, 'important');
                if (p === 'background') node.style.backgroundImage = 'none';
              }
            });

            // 2. Clear problematic filters and shadows
            node.style.boxShadow = 'none';
            node.style.textShadow = 'none';
            node.style.backdropFilter = 'none';
            node.style.filter = 'none';
            node.style.transition = 'none';
            node.style.animation = 'none';
            
            // 3. Ensure visibility
            node.style.opacity = '1';
            node.style.visibility = 'visible';
          } catch (e) {}
        });

        // Use toPng for maximum fidelity if Jpeg fails
        const dataUrl = await htmlToImage.toJpeg(clone, {
          backgroundColor: '#fcf8f1',
          quality: 0.9,
          pixelRatio: isMobile ? 1.0 : 1.5, // High resolution
          skipFonts: false
        });
        
        if (!dataUrl) throw new Error("Processing timed out");

        const link = document.createElement('a');
        link.download = `Heritage_Scroll_${profile.name.replace(/\s+/g, '_')}.jpg`;
        link.href = dataUrl;
        link.click();
        
        toast.dismiss(toastId);
        toast.success("Golden Portrait Saved");
      } finally {
        document.body.removeChild(clone);
      }
    } catch (error: any) {
      console.error("Export Error Detail:", error);
      toast.dismiss(toastId);
      toast.error("Export failed. The tree might be too vast for this device. Please use 'Export Scroll' (PDF).");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = () => {
    // Native print is now styled specifically in index.css to produce a high-quality PDF scroll
    const toastId = toast.loading("Engraving digital scroll...");
    setTimeout(() => {
      window.print();
      toast.dismiss(toastId);
    }, 400);
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
            role: formData.role,
            gender: formData.gender,
            photo: formData.photo,
          };
          
          if (formData.hasPartner) {
            updated.partner = {
              name: formData.partnerName,
              birthYear: formData.partnerBirthYear,
              photo: formData.partnerPhoto,
              gender: formData.partnerGender
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
              : 'w-full max-w-none px-4 sm:px-6 md:px-8 pb-20') 
          : 'max-w-4xl px-6 pb-20'
      }`}>
        <AnimatePresence mode="wait">
          {step === 'dashboard' && !isPublic && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-white rounded-3xl shadow-xl border-2 border-[#d4af37]/20"
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
                      <h3 className="text-4xl font-serif font-black text-zinc-900 tracking-tight">Digital Vamshavali</h3>
                      <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                        Preserve your family's heritage, traditions, and lineage in a secure digital chronicle. Sign in with your email or social account.
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

                {debugOtp && (
                  <div className="p-5 bg-amber-50/80 border border-amber-200/50 text-amber-900 rounded-[24px] text-left flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-amber-700 shrink-0" />
                      <span className="font-extrabold text-[11px] uppercase tracking-wider text-amber-800">
                        Sandbox OTP Helper
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed font-semibold text-amber-800">
                      Since email SMTP delivery might be restricted in cloud-run containers, your current OTP is:{' '}
                      <strong className="font-mono text-sm bg-white/90 border border-amber-200/50 px-2 py-0.5 rounded-lg text-amber-950 font-black">
                        {debugOtp}
                      </strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => setOtp(debugOtp)}
                      className="w-full py-2.5 bg-amber-750 hover:bg-amber-800 active:scale-[0.97] bg-emerald-700 hover:bg-emerald-800 transition-all text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-sm focus:outline-none"
                    >
                      Auto-fill OTP Code
                    </button>
                  </div>
                )}

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
              <div className="max-w-7xl mx-auto bg-white p-4 sm:p-6 md:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] md:rounded-[3rem] border-2 sm:border-4 border-white shadow-2xl relative overflow-hidden">
                <div className="space-y-8 md:space-y-12">
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
                           <button 
                             onClick={downloadPDF} 
                             disabled={isLoading}
                             className="px-6 py-2.5 bg-[#d4af37] text-[#064e3b] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50"
                           >
                               {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
                               {vt.exportScroll}
                           </button>
                           <button 
                             onClick={exportImage} 
                             disabled={isLoading}
                             className="px-6 py-2.5 bg-[#064e3b] text-white border border-[#d4af37]/30 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50"
                           >
                               <Heart size={16} className="text-[#d4af37]" />
                               Export Image
                           </button>
                           <button 
                             onClick={downloadManual} 
                             className="px-6 py-2.5 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[rgba(255,255,255,0.2)] transition-colors flex items-center gap-2"
                           >
                               <FileText size={16} /> {vt.manual}
                           </button>

                           <div className="flex flex-col gap-2">
                             <button 
                               onClick={handleLinkTelegram}
                               className="px-6 py-2.5 bg-[#0088cc] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                             >
                                <MessageCircle size={16} /> Telegram Update (v2.2)
                             </button>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                    {/* Full Width Lineage Details Panel */}
                    <div className="p-8 bg-white rounded-[2.5rem] border border-[#f4f4f5] shadow-xl space-y-8">
                      <div className="pb-4 border-b border-[#f4f4f5] flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <Landmark size={20} className="text-[#d4af37]" />
                           <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#064e3b]">{vt.lineageDetails}</h4>
                         </div>
                         <div className="text-[10px] uppercase font-black tracking-widest text-[#d4af37] bg-[#064e3b]/5 px-3 py-1 rounded-full border border-[#d4af37]/10">Sacred Credentials</div>
                      </div>
                      
                      {/* Row/Grid of 4 Core Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                          { icon: <Users size={16}/>, label: "Parents", value: profile.parents, key: 'parents' },
                          { icon: <Landmark size={16}/>, label: "Gotra", value: profile.gotra, key: 'gotra' },
                          { icon: <Home size={16}/>, label: "Kuldevi Name", value: profile.kuldevi, key: 'kuldevi' },
                          { icon: <MapPin size={16}/>, label: "Native Origin", value: profile.nativePlace, key: 'nativePlace' },
                        ].map((item, i) => (
                          <div key={i} className="p-5 bg-[#fafafa]/50 rounded-2xl border border-zinc-100 hover:border-[#d4af37]/20 transition-all space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest">
                              {item.icon} {item.label}
                            </label>
                            {isEditing ? (
                              <div className="space-y-3">
                                <input 
                                  value={item.value}
                                  onChange={(e) => setProfile({...profile, [item.key]: e.target.value})}
                                  className="w-full px-4 py-3 bg-white border border-[#f4f4f5] rounded-xl font-bold text-xs tracking-tight text-[#18181b]"
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
                      </div>

                      {/* Chronicles & Numerology row */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-[#f4f4f5]">
                        {/* Chronicles Card */}
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest">
                             Chronicles
                          </label>
                          {isEditing ? (
                            <textarea 
                              value={profile.additionalNotes}
                              onChange={(e) => setProfile({...profile, additionalNotes: e.target.value})}
                              className="w-full px-4 py-3 bg-[#fafafa] border border-[#f4f4f5] rounded-xl font-bold text-xs min-h-[120px]"
                            />
                          ) : (
                            <p className="text-[#52525b] font-medium text-xs leading-relaxed italic bg-[#fafafa]/30 p-4 rounded-2xl border border-zinc-100 h-full">"{profile.additionalNotes || "Records empty."}"</p>
                          )}
                        </div>

                        {/* Vedic Numerology Card */}
                        <div className="space-y-4">
                           <div className="flex items-center gap-2">
                              <BookOpen size={18} className="text-[#d4af37]" />
                              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#064e3b]">Vedic Numerology</h4>
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center p-4 bg-[#fdfbf7] rounded-2xl border border-[#fef3c7]">
                              <p className="text-[9px] text-[#71717a] font-medium leading-relaxed italic sm:col-span-1">
                                Ancient Sankhya Shastra reveals the spiritual path through the vibrations of names and dates.
                              </p>
                              <div className="space-y-2 sm:col-span-2">
                                <input 
                                  id="manual_numerology_name"
                                  placeholder="Enter Name..."
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const caps = val.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                    if (val !== caps) e.target.value = caps;
                                  }}
                                  className="w-full px-4 py-2 bg-white border border-[#f4f4f5] rounded-xl text-xs font-bold outline-none focus:border-[#d4af37]"
                                />
                                <button 
                                  onClick={() => {
                                    const nameInput = document.getElementById('manual_numerology_name') as HTMLInputElement;
                                    if (nameInput?.value) {
                                      const currentYear = new Date().getFullYear().toString();
                                      getVedicNumerology({ name: nameInput.value.trim(), birthYear: currentYear, role: 'Descendant', children: [], id: 'manual' });
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
                    </div>

                  </div>
                </div>
              </div>

              {/* Genealogy Map Container (Full Page Width) */}
              <div className="w-full space-y-8 mt-12">
                 <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-4 sm:px-6 md:px-0">
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

                       <div className="relative group/canvas h-full flex flex-col w-full">
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
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            className={`bg-[#fcf8f1] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.25)] overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/old-map.png')] bg-repeat flex items-center justify-center transition-all duration-700 ease-in-out w-full ${
                              isFullScreen 
                                ? 'h-screen w-screen rounded-none border-0 p-4 md:p-12' 
                                : 'rounded-[0.5rem] sm:rounded-[1.5rem] md:rounded-[3rem] border-y-[3px] md:border-[10px] md:border-x-[10px] border-[#d4af37] h-[650px] lg:h-[800px] p-2 sm:p-4 md:p-12'
                            }`}
                            style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                          >
                            <div className="absolute inset-2 sm:inset-4 border border-[#d4af37]/20 pointer-events-none rounded-[0.4rem] sm:rounded-[2.3rem]" />
                            <div className="absolute inset-3 sm:inset-6 border-2 border-[#d4af37]/10 pointer-events-none rounded-[0.2rem] sm:rounded-[1.8rem]" />
                            
                            {/* Decorative Corner Ornaments */}
                            <div className="absolute top-10 left-10 p-2 text-[#d4af37]/20 -rotate-12"><Landmark size={48} /></div>
                            <div className="absolute top-10 right-10 p-2 text-[#d4af37]/20 rotate-12"><Landmark size={48} /></div>
                            <div className="absolute bottom-10 left-10 p-2 text-[#d4af37]/20 rotate-12"><Landmark size={48} /></div>
                            <div className="absolute bottom-10 right-10 p-2 text-[#d4af37]/20 -rotate-12"><Landmark size={48} /></div>
                            
                            <div 
                              className={`relative inline-block min-w-max w-max flex flex-col items-center text-center z-10 pt-4 pb-12 sm:pt-12 sm:pb-32 origin-center flex-shrink-0 select-none ${isDragging || isPointerActive ? '' : 'transition-transform duration-300 ease-out'}`}
                              style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${treeScale})` }}
                            >
                               <div className="mb-6 md:mb-10 flex flex-col items-center flex-shrink-0">
                                  {/* Deities Rendered Side-by-Side in a row on tablet/desktop, stacked with custom snug gap on mobile */}
                                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 md:gap-16 mb-4 md:mb-8">
                                    {(profile.kuldevi || profile.kuldeviPhoto) && (
                                      <DeityFrame photo={profile.kuldeviPhoto} name={profile.kuldevi} />
                                    )}
                                    {(profile.kuldevta || profile.kuldevtaPhoto) && (
                                      <DeityFrame photo={profile.kuldevtaPhoto} name={profile.kuldevta} isKuldevta />
                                    )}
                                  </div>
                                  
                                  {/* Sacred Blessing Beam connecting the Divine to the scroll */}
                                  <div className="flex flex-col items-center relative mb-4 md:mb-8">
                                    <motion.div 
                                      animate={{ scaleY: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                                      transition={{ duration: 3, repeat: Infinity }}
                                      className="w-0.5 h-8 md:h-16 bg-gradient-to-b from-[#d4af37] via-[#d4af37]/50 to-transparent rounded-full shadow-[0_0_8px_#d4af37]" 
                                    />
                                    {[...Array(3)].map((_, i) => (
                                      <motion.div
                                        key={i}
                                        initial={{ y: -10, opacity: 0 }}
                                        animate={{ 
                                          y: [0, 60], 
                                          opacity: [0, 0.8, 0],
                                          scale: [0.6, 1, 0.6]
                                        }}
                                        transition={{ 
                                          duration: 2.5 + Math.random(), 
                                          repeat: Infinity, 
                                          delay: i * 0.7,
                                          ease: "easeInOut"
                                        }}
                                        className="absolute top-0 text-[#d4af37]"
                                      >
                                        <div className="w-1 h-1 rounded-full bg-current shadow-[0_0_4px_currentColor]" />
                                      </motion.div>
                                    ))}
                                  </div>

                                  <VintageScroll title={`${vt.eternalLineage} ${profile.name || 'family'}`} />
                                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4af37]/60 mb-4 flex items-center gap-2">
                                     <Fingerprint size={12} /> ID: {profile.shareId || profile.id}
                                  </div>
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
                                  onViewDetail={(node: any) => setActiveLightboxMember(node)}
                                  onRemove={removeMember}
                                  onAddChild={addMember}
                                  onGetNumerology={getVedicNumerology}
                                 />
                               </div>
                               
                               <div className="mt-12 md:mt-24 opacity-30 italic text-[#8a6821] text-xs font-serif">
                                  Records maintained by {profile.name} via {vt.archives}
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

      {/* Lightbox / High-definition zoom viewer modal */}
      <AnimatePresence>
        {activeLightboxMember && (
          <div 
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out"
            onClick={() => setActiveLightboxMember(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative max-w-lg w-full bg-[#18181b] rounded-[3rem] border-4 border-[#d4af37] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden cursor-default text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-6 right-6 z-10">
                <button 
                  onClick={() => setActiveLightboxMember(null)}
                  className="p-3 bg-zinc-900/80 hover:bg-zinc-800 rounded-full transition-colors text-[#d4af37]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Header Image Frame (Big Picture Zoom) */}
              <div className="relative aspect-[4/5] w-full bg-zinc-950 flex items-center justify-center overflow-hidden group">
                {activeLightboxMember.photo ? (
                  <img 
                    src={activeLightboxMember.photo} 
                    alt={activeLightboxMember.name} 
                    className="w-full h-full object-cover select-none scale-100 transition-all duration-700 hover:scale-110" 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#d4af37]/20">
                    <User size={120} strokeWidth={0.5} />
                    <p className="text-[10px] font-black uppercase tracking-widest mt-4">Portrait Archive Empty</p>
                  </div>
                )}
                {/* Decorative overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-[#18181b]/25 to-transparent pointer-events-none" />
              </div>

              {/* Bio Detail Content */}
              <div className="p-8 relative">
                {/* Spiritual pattern */}
                <div className="absolute right-8 top-8 opacity-10 text-[#d4af37] pointer-events-none">
                  <Landmark size={80} strokeWidth={1} />
                </div>

                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#d4af37]/10 rounded-full border border-[#d4af37]/30">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#d4af37]">{activeLightboxMember.role || "Generation Node"}</span>
                  </div>

                  <h3 className="text-3xl font-serif font-black tracking-tight italic text-[#f4e4bc]">{activeLightboxMember.name}</h3>
                  <p className="text-sm font-bold text-zinc-400 font-mono">Historical Record: {activeLightboxMember.birthYear || "N/A"}</p>
                  <p className="text-xs text-zinc-300 leading-relaxed font-serif italic pt-2">
                    "A distinguished figure in the {profile ? profile.name : 'Vamshavali'} registry. May their virtue inspire generations to come."
                  </p>

                  <div className="pt-6 border-t border-zinc-800/80 flex items-center justify-between">
                    <div className="text-[10px] uppercase font-bold tracking-widest text-[#d4af37]">Sankhya Shastra Reading</div>
                    <button 
                      onClick={() => {
                        setActiveLightboxMember(null);
                        getVedicNumerology(activeLightboxMember);
                      }}
                      className="px-5 py-2 bg-[#d4af37] text-[#064e3b] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#b68d40] transition-all flex items-center gap-2"
                    >
                      <Sparkles size={12} /> Divine Insight
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

const TreeStructure = ({ members, isEditing, onEdit, onViewDetail, onRemove, onAddChild, onGetNumerology }: any) => {
  return (
    <div className="flex justify-center gap-6 sm:gap-10 md:gap-24 px-2 sm:px-4 md:px-8">
      {members.map((member: FamilyMember, index: number) => (
        <div key={member.id} className="relative flex flex-col items-center">
          {/* Node Wrapper */}
          <div className="flex flex-col items-center group relative z-20">
            {/* Elegant Royal Card Wrapper */}
            <div className={`relative flex items-center justify-center p-3.5 sm:p-5 md:p-6 rounded-[1.6rem] sm:rounded-[2.2rem] md:rounded-[2.5rem] bg-gradient-to-b from-[#fffefb] to-[#fdfaf2] border-2 sm:border-[3px] border-[#d4af37] shadow-[0_10px_20px_rgba(182,141,64,0.08)] md:shadow-[0_15px_30px_rgba(182,141,64,0.12)] ring-4 sm:ring-8 ring-white/60 transition-all duration-300 md:hover:shadow-[0_25px_60px_rgba(182,141,64,0.25)] md:hover:-translate-y-1 z-20 interactive-node ${member.partner ? 'gap-3 sm:gap-6 md:gap-8 min-w-[260px] sm:min-w-[340px] md:min-w-[440px]' : 'min-w-[110px] sm:min-w-[170px] md:min-w-[210px]'}`}>
              
              {/* Member */}
              <div className="flex flex-col items-center text-center">
                <div 
                  className="relative transition-all duration-300 ease-out cursor-pointer md:hover:scale-105 active:scale-95"
                  onClick={() => {
                    if (hasDraggedGlobal) return;
                    if (isEditing) {
                      onEdit(member);
                    } else if (onViewDetail) {
                      onViewDetail(member);
                    }
                  }}
                >
                  <GoldenFrame photo={member.photo} name={member.name} gender={member.gender || (member.role?.toLowerCase().includes('daughter') || member.role?.toLowerCase().includes('mother') || member.role?.toLowerCase().includes('matriarch') ? 'female' : 'male')} />
                  {isEditing && (
                    <div className="absolute -top-1 -right-1 w-8 h-8 bg-[#059669] text-white rounded-full flex items-center justify-center shadow-md z-30 border-2 border-white animate-bounce-slow">
                      <Edit2 size={12} />
                    </div>
                  )}
                </div>
                
                <div className="mt-3 sm:mt-4 flex flex-col items-center">
                  <h4 className="font-serif font-black text-[#58441c] text-xs sm:text-sm md:text-base uppercase tracking-tight leading-tight whitespace-nowrap drop-shadow-sm">
                    {member.name}
                  </h4>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                    <div className="h-px w-1.5 sm:w-2 bg-[#d4af37]/45" />
                    <p className="text-[9px] sm:text-[10px] md:text-xs text-[#ea580c] font-bold italic font-mono">{member.birthYear || "—"}</p>
                    <div className="h-px w-1.5 sm:w-2 bg-[#d4af37]/45" />
                  </div>
                  <div className="px-2 sm:px-3 py-0.5 sm:py-1 bg-[#064e3b] text-[#d4af37] text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] mt-2 rounded-full shadow-sm">
                    {member.role || "Member"}
                  </div>
                </div>
              </div>

              {/* Partner Section */}
              {member.partner && (
                <>
                  {/* Union Symbol */}
                  <div className="flex flex-col items-center relative py-4 sm:py-6 shrink-0 select-none">
                     <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 rounded-full bg-[#fdfbf7] border border-[#d4af37]/35 flex items-center justify-center shadow-sm">
                        <Heart size={10} className="text-[#fb7185] sm:hidden" fill="currentColor" />
                        <Heart size={14} className="text-[#fb7185] hidden sm:block" fill="currentColor" />
                     </div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 sm:w-16 md:w-24 h-[1.5px] bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent pointer-events-none" />
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div 
                      className="relative transition-all duration-350 ease-out cursor-pointer md:hover:scale-105 active:scale-95"
                      onClick={() => {
                        if (hasDraggedGlobal) return;
                        if (isEditing) {
                          onEdit(member);
                        } else if (onViewDetail) {
                          onViewDetail({
                            ...member.partner,
                            role: "Union Partner",
                            gender: (member.partner as any).gender || "female"
                          });
                        }
                      }}
                    >
                      <GoldenFrame photo={member.partner.photo} name={member.partner.name} size="sm" gender={(member.partner as any).gender || 'female'} />
                    </div>
                    
                    <div className="mt-3 sm:mt-4 flex flex-col items-center">
                      <h4 className="font-serif font-black text-[#58441c] text-xs sm:text-sm md:text-base uppercase tracking-tight leading-tight whitespace-nowrap drop-shadow-sm">
                        {member.partner.name}
                      </h4>
                      <p className="text-[9px] sm:text-[10px] md:text-xs text-[#ea580c] font-bold italic mt-1.5">{member.partner.birthYear || "—"}</p>
                      <p className="text-[#b68d40] text-[6px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-widest mt-2 px-1.5 py-0.5 bg-white rounded-md border border-[#8a6821]/20">Partner</p>
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
                className="flex gap-2.5 mt-6 p-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#d4af37]/25 z-30 pointer-events-auto interactive-node"
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); onAddChild(member.id); }}
                  className="w-10 h-10 bg-[#064e3b] text-[#d4af37] rounded-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-md animate-fade-in"
                  title="Add Generation"
                >
                  <Plus size={20}/>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(member.id); }}
                  className="w-10 h-10 bg-white text-red-600 rounded-xl border-2 border-red-50 hover:bg-red-50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-sm"
                  title="Remove Lineage"
                >
                  <Trash2 size={20}/>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(member); }}
                  className="w-10 h-10 bg-white text-[#064e3b] rounded-xl border-2 border-zinc-100 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-sm"
                  title="Registry Editor"
                >
                  <Settings size={18}/>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onGetNumerology(member); }}
                  className="w-10 h-10 bg-[#fdfbf7] text-[#d4af37] rounded-xl border-2 border-[#fef3c7] hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-sm"
                  title="Vedic Insight"
                >
                  <BookOpen size={18}/>
                </button>
              </motion.div>
            )}
            
            {/* View Numerology Reading Button */}
            {!isEditing && (
              <div className="mt-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 z-30 interactive-node">
                <button 
                  onClick={() => { if (hasDraggedGlobal) return; onGetNumerology(member); }}
                  className="px-5 py-2 bg-gradient-to-r from-[#064e3b] to-[#065f46] text-[#d4af37] rounded-full text-[9px] font-black uppercase tracking-[0.25em] shadow-lg md:hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-[#d4af37]/30"
                >
                  <Sparkles size={12} /> Reveal Divine Path
                </button>
              </div>
            )}
          </div>

          {/* Children / Recursive Section */}
          {member.children.length > 0 && (
            <div className="pt-10 md:pt-12 relative w-full">
              {/* Connector from parent DOWN to the sibling line level */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center h-6 w-full">
                 <div className="w-1 bg-[#d4af37] h-full shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
                 {/* Connection Point Ornament */}
                 <div className="w-4 h-4 rounded-full bg-[#064e3b] border-2 border-[#d4af37] -mt-2 shadow-md z-20 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-[#d4af37] shadow-[0_0_5px_gold]" />
                 </div>
              </div>
              
              <div className="flex justify-center gap-12 md:gap-24 relative mt-6 overflow-visible">
                {member.children.map((child, index) => (
                  <div key={child.id} className="relative">
                    {/* Horizontal Line Segment to connect siblings */}
                    {member.children.length > 1 && (
                      <div 
                        className="absolute -top-6 h-1 bg-[#d4af37]"
                        style={{
                          left: index === 0 ? '50%' : '0',
                          right: index === member.children.length - 1 ? '50%' : '0',
                          boxShadow: '0 0 6px rgba(212,175,55,0.2)'
                        }}
                      />
                    )}
                    {/* Vertical line from sibling bar DOWN to child */}
                    {member.children.length > 1 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-1 h-6 bg-[#d4af37]" style={{ boxShadow: '0 0 6px rgba(212,175,55,0.2)' }} />
                    )}
                    {/* If single child, direct line down */}
                    {member.children.length === 1 && (
                       <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-1 h-6 bg-[#d4af37]" style={{ boxShadow: '0 0 6px rgba(212,175,55,0.2)' }} />
                    )}
                    
                    <TreeStructure 
                      members={[child]} 
                      isEditing={isEditing} 
                      onEdit={onEdit}
                      onViewDetail={onViewDetail}
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
