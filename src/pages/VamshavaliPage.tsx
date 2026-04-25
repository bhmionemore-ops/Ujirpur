import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Mail, ArrowRight, ShieldCheck, Save, Share2, 
  Download, Copy, Plus, Trash2, ChevronDown, ChevronRight,
  User, Home, Landmark, BookOpen, MapPin, Edit3, LogOut,
  CheckCircle2, AlertCircle, Loader2, X, Heart, Settings, Edit2
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
        onclone: (clonedDoc) => {
          // Fix for html2canvas oklch error
          // html2canvas doesn't support oklch() color function yet
          const elements = clonedDoc.querySelectorAll('*');
          elements.forEach((el) => {
            const style = window.getComputedStyle(el);
            const props = ['color', 'backgroundColor', 'borderColor', 'outlineColor'];
            
            props.forEach(prop => {
              const value = (el as HTMLElement).style.getPropertyValue(prop) || style.getPropertyValue(prop);
              if (value && value.includes('oklch')) {
                // Approximate conversion or just force to a safe color
                // For now, let's try to remove the function to let it fallback or use a safe default
                // In most cases, these are semi-transparent or specific hues
                // A better approach is to use a helper to convert oklch to rgb
                try {
                  // If we can't parse it, we'll just set it to a compatible color based on the property
                  if (prop === 'backgroundColor') {
                    if (value.includes('0.96')) (el as HTMLElement).style.backgroundColor = '#f4f4f5';
                    else if (value.includes('0.06')) (el as HTMLElement).style.backgroundColor = '#064e3b';
                  }
                } catch (e) {}
              }
            });
          });
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgProps = canvas;
      
      // Landscape for wide trees
      const orientation = imgProps.width > imgProps.height ? 'l' : 'p';
      const pdf = new jsPDF(orientation, 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`family_Vamshavali_Grand_History.pdf`);
      
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
                  {isEditing ? <><Save size={18} /> Finish Editing</> : <><Edit3 size={18} /> Modify Lineage</>}
                </button>
                <button 
                  onClick={downloadPDF}
                  className="flex-1 md:flex-none px-8 py-3 bg-[#064e3b] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-[#065f46] transition-all flex items-center justify-center gap-2"
                >
                  <Download size={18} /> Save Scroll
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
                            {profile.name || "House of family"}
                          </h2>
                        )}
                        
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
                           {!isPublic && (
                             <div className="px-5 py-2.5 bg-[rgba(255,255,255,0.05)] rounded-2xl border border-[rgba(255,255,255,0.1)] flex items-center gap-3 backdrop-blur-sm">
                                <Share2 size={16} className="text-[#d4af37]" />
                                <span className="text-xs font-mono opacity-60">family.vamshavali.com/...{profile.shareId?.slice(-6)}</span>
                                <button onClick={copyLink} className="p-1.5 hover:text-[#d4af37] transition-colors">
                                   <Copy size={16} />
                                </button>
                             </div>
                           )}
                           <button onClick={downloadPDF} className="px-6 py-2.5 bg-[#d4af37] text-[#064e3b] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-transform">
                              Export Scroll
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
                           <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#064e3b]">Lineage Details</h4>
                           <Landmark size={18} className="text-[#d4af37]" />
                        </div>
                        
                        {[
                          { icon: <Users size={16}/>, label: "Parents", value: profile.parents, key: 'parents' },
                          { icon: <Landmark size={16}/>, label: "Gotra", value: profile.gotra, key: 'gotra' },
                          { icon: <Home size={16}/>, label: "Kuldevi", value: profile.kuldevi, key: 'kuldevi' },
                          { icon: <MapPin size={16}/>, label: "Native Origin", value: profile.nativePlace, key: 'nativePlace' },
                        ].map((item, i) => (
                          <div key={i} className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-[#a1a1aa] uppercase tracking-widest">
                              {item.icon} {item.label}
                            </label>
                            {isEditing ? (
                              <input 
                                value={item.value}
                                onChange={(e) => setProfile({...profile, [item.key]: e.target.value})}
                                className="w-full px-4 py-3 bg-[#fafafa] border border-[#f4f4f5] rounded-xl font-bold text-xs tracking-tight text-[#18181b]"
                              />
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
                      </div>
                    </div>

                    {/* Genealogy Map Container */}
                    <div className="lg:col-span-3 space-y-8">
                       <div className="flex items-center justify-between px-4">
                          <div className="flex items-center gap-4">
                             <div className="w-8 h-1 bg-[#d4af37] rounded-full" />
                             <h3 className="text-xl font-serif font-black text-[#064e3b] italic">Generation Mapping</h3>
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
                                   {isLoading ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Preserve</>}
                                </button>
                             </div>
                          )}
                       </div>

                       <div className="relative group/canvas">
                          {/* Tree Stage */}
                          <div 
                            ref={treeRef}
                            id="genealogy_container"
                            className="bg-[#fcf8f1] rounded-[3.5rem] border-[10px] border-[#d4af37] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] overflow-x-auto min-h-[700px] p-20 relative bg-[url('https://www.transparenttextures.com/patterns/old-map.png')] bg-repeat"
                          >
                            <div className="absolute inset-4 border border-[#d4af37]/20 pointer-events-none rounded-[2.8rem]" />
                            <div className="absolute inset-6 border-2 border-[#d4af37]/10 pointer-events-none rounded-[2.3rem]" />
                            
                            {/* Decorative Corner Ornaments */}
                            <div className="absolute top-10 left-10 p-2 text-[#d4af37]/20 -rotate-12"><Landmark size={48} /></div>
                            <div className="absolute top-10 right-10 p-2 text-[#d4af37]/20 rotate-12"><Landmark size={48} /></div>
                            <div className="absolute bottom-10 left-10 p-2 text-[#d4af37]/20 rotate-12"><Landmark size={48} /></div>
                            <div className="absolute bottom-10 right-10 p-2 text-[#d4af37]/20 -rotate-12"><Landmark size={48} /></div>

                            <div className="inline-block min-w-full text-center relative z-10 pt-12">
                               <div className="mb-24 flex flex-col items-center">
                                  <VintageScroll title="The Eternal Lineage of family" />
                                  <RoyalOrnament />
                               </div>
                               <TreeStructure 
                                members={profile.members} 
                                isEditing={isEditing} 
                                onEdit={(node: any) => {
                                  setEditingNode(node);
                                  setIsEditModalOpen(true);
                                }}
                                onRemove={removeMember}
                                onAddChild={addMember}
                               />
                               
                               <div className="mt-32 opacity-30 italic text-[#8a6821] text-xs font-serif">
                                  Records maintained by {profile.name} via family Archives
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
    </div>
  );
};

const TreeStructure = ({ members, isEditing, onEdit, onRemove, onAddChild }: any) => {
  return (
    <div className="flex flex-col items-center gap-24">
      {members.map((member: FamilyMember) => (
        <div key={member.id} className="relative flex flex-col items-center">
          {/* Node Wrapper */}
          <div className="flex flex-col items-center group">
            {/* The Couple / Individual */}
            <div className="flex items-center gap-4 relative">
              {/* Member */}
              <div className="flex flex-col items-center">
                <div 
                  className={`relative transition-transform ${isEditing ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
                  onClick={() => isEditing && onEdit(member)}
                >
                  <GoldenFrame photo={member.photo} name={member.name} />
                  {isEditing && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#059669] text-white rounded-full flex items-center justify-center shadow-lg pointer-events-none border-2 border-white">
                      <Edit2 size={12} />
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex flex-col items-center">
                  <h4 className="font-serif font-black text-[#58441c] text-sm md:text-lg uppercase tracking-tight leading-none whitespace-nowrap">
                    {member.name}
                  </h4>
                  <p className="text-[10px] text-[#71717a] font-bold italic mt-1">{member.birthYear}</p>
                  <p className="text-[#b68d40] text-[9px] font-black uppercase tracking-[0.2em] mt-1">{member.role}</p>
                </div>
              </div>

              {/* Partner Section */}
              {member.partner && (
                <>
                  {/* Connector Rings */}
                  <div className="w-12 flex items-center justify-center relative">
                    <div className="absolute top-1/2 -translate-y-1/2 w-12 h-16 border-t-2 border-b-2 border-dashed border-[rgba(182,141,64,0.2)] rounded-full" />
                    <div className="text-[#fb7185] bg-white p-1 rounded-full border border-[#ffe4e6] z-10 shadow-sm">
                      <Heart size={10} fill="currentColor" />
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div 
                      className={`relative transition-transform ${isEditing ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
                      onClick={() => isEditing && onEdit(member)}
                    >
                      <GoldenFrame photo={member.partner.photo} name={member.partner.name} size="sm" />
                    </div>
                    
                    <div className="mt-4 flex flex-col items-center">
                      <h4 className="font-serif font-black text-[#58441c] text-sm md:text-base uppercase tracking-tight leading-none whitespace-nowrap">
                        {member.partner.name}
                      </h4>
                      <p className="text-[9px] text-[#71717a] font-bold italic mt-1">{member.partner.birthYear}</p>
                      <p className="text-[#b68d40]/60 text-[8px] font-black uppercase tracking-widest mt-1">Partner</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons for Editing */}
            {isEditing && (
              <div className="flex gap-2 mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button 
                  onClick={(e) => { e.stopPropagation(); onAddChild(member.id); }}
                  className="w-10 h-10 bg-[#ecfdf5] text-[#047857] rounded-full border border-[#d1fae5] hover:bg-[#059669] hover:text-white transition-all flex items-center justify-center shadow-sm"
                  title="Add Child"
                >
                  <Plus size={18}/>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(member.id); }}
                  className="w-10 h-10 bg-[#fef2f2] text-[#b91c1c] rounded-full border border-[#fee2e2] hover:bg-[#dc2626] hover:text-white transition-all flex items-center justify-center shadow-sm"
                  title="Remove Generation"
                >
                  <Trash2 size={18}/>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(member); }}
                  className="w-10 h-10 bg-[#eff6ff] text-[#1d4ed8] rounded-full border border-[#dbeafe] hover:bg-[#2563eb] hover:text-white transition-all flex items-center justify-center shadow-sm"
                  title="Edit Details"
                >
                  <Settings size={18}/>
                </button>
              </div>
            )}
          </div>

          {/* Children / Recursive Section */}
          {member.children.length > 0 && (
            <div className="pt-24 relative w-full flex justify-center">
              {/* Vertical Line from parent */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-[#b68d40]/40 to-[#b68d40]/10" />
              
              {/* Horizontal line for multiple children */}
              {member.children.length > 1 && (
                <div className="absolute top-24 left-0 right-0 h-px bg-[rgba(182,141,64,0.15)]" />
              )}

              <div className="flex gap-24 relative">
                <TreeStructure 
                  members={member.children} 
                  isEditing={isEditing} 
                  onEdit={onEdit}
                  onRemove={onRemove}
                  onAddChild={onAddChild}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default VamshavaliPage;
