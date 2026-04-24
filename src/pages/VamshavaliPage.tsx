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
  children: FamilyMember[];
}

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
        toast.error("Failed to save data");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!treeRef.current) return;
    setIsLoading(true);
    try {
      const canvas = await html2canvas(treeRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Vamshavali_${profile?.name || 'Shared'}.pdf`);
      toast.success("PDF Downloaded");
    } catch (error) {
      toast.error("Failed to generate PDF");
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

  // Tree management helpers
  const addMember = (parentId: string | null) => {
    if (!profile) return;
    const newMember: FamilyMember = {
      id: Math.random().toString(36).substring(7),
      name: "New Member",
      role: "Member",
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

  const removeMember = (id: string) => {
    if (!profile) return;
    const filterRecursive = (members: FamilyMember[]): FamilyMember[] => {
      return members
        .filter(m => m.id !== id)
        .map(m => ({ ...m, children: filterRecursive(m.children) }));
    };
    setProfile({ ...profile, members: filterRecursive(profile.members) });
  };

  const updateMember = (id: string, name: string, role: string) => {
    if (!profile) return;
    const updateRecursive = (members: FamilyMember[]): FamilyMember[] => {
      return members.map(m => {
        if (m.id === id) return { ...m, name, role };
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-zinc-100 text-center space-y-8">
                <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto text-brand-600 shadow-inner">
                  <Mail size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Login / Sign Up</h2>
                  <p className="text-zinc-500 font-medium">Enter your email to access your personal family tree dashboard.</p>
                </div>
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      className="w-full pl-14 pr-6 py-5 bg-zinc-50 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-2xl font-bold transition-all outline-none"
                    />
                  </div>
                  <button 
                    disabled={isLoading}
                    className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Next <ArrowRight size={18} /></>}
                  </button>
                </form>
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
              <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-zinc-100 text-center space-y-8">
                <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Verify OTP</h2>
                  <p className="text-zinc-500 font-medium">
                    We've sent a code to: <br />
                    <span className="font-bold text-zinc-900">{email}</span>
                  </p>
                </div>
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <input 
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    required
                    className="w-full px-6 py-5 bg-zinc-50 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-2xl font-black text-3xl text-center tracking-[0.5em] transition-all outline-none"
                  />
                  <button 
                    disabled={isLoading}
                    className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Verify & Login"}
                  </button>
                </form>
                <button 
                  onClick={() => setStep('login')}
                  className="text-zinc-400 text-xs font-bold uppercase tracking-widest hover:text-brand-600 transition-colors"
                >
                  Change Email
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
                  className="bg-white p-12 rounded-[3.5rem] border-4 border-white shadow-2xl overflow-x-auto min-h-[400px]"
                >
                  <div className="inline-block min-w-full">
                     <TreeStructure 
                      members={profile.members} 
                      isEditing={isEditing} 
                      onUpdate={updateMember}
                      onRemove={removeMember}
                      onAddChild={addMember}
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

const TreeStructure = ({ members, isEditing, onUpdate, onRemove, onAddChild }: any) => {
  return (
    <div className="flex flex-col gap-8">
      {members.map((member: FamilyMember) => (
        <div key={member.id} className="relative">
          <div className="flex items-center gap-4">
            <div className={`p-6 rounded-[2rem] shadow-xl border-4 transition-all ${isEditing ? 'bg-zinc-50 border-zinc-100' : 'bg-brand-50 border-brand-500/20'} min-w-[200px]`}>
              {isEditing ? (
                <div className="space-y-3">
                  <input 
                    value={member.name}
                    onChange={(e) => onUpdate(member.id, e.target.value, member.role)}
                    className="w-full bg-transparent font-black text-zinc-900 text-lg outline-none"
                  />
                  <input 
                    value={member.role}
                    onChange={(e) => onUpdate(member.id, member.name, e.target.value)}
                    className="w-full bg-transparent font-bold text-zinc-400 text-[10px] uppercase tracking-widest outline-none"
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                    <button onClick={() => onRemove(member.id)} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={16}/>
                    </button>
                    <button onClick={() => onAddChild(member.id)} className="text-brand-400 hover:text-brand-600 transition-colors">
                      <Plus size={16}/>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-black text-zinc-900 text-xl tracking-tight">{member.name}</p>
                  <p className="text-brand-600 text-[10px] font-black uppercase tracking-widest mt-1">{member.role}</p>
                </>
              )}
            </div>

            {member.children.length > 0 && (
              <div className="pl-12 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-0.5 bg-zinc-200" />
                <TreeStructure 
                  members={member.children} 
                  isEditing={isEditing} 
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  onAddChild={onAddChild}
                />
              </div>
            )}
            {isEditing && member.children.length === 0 && (
               <div className="w-12 h-12 flex items-center justify-center text-zinc-200">
                  <ChevronRight size={24}/>
               </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
