import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, Timestamp, updateDoc, deleteDoc, doc, getDoc, where, getDocs } from 'firebase/firestore';
import { Users, Globe, Clock, Activity, MapPin, Calendar, ArrowLeft, ExternalLink, MessageSquare, User, Database, Loader2, TrendingUp, Facebook, Mail, Trash2, Eye, CheckCircle, FileText, Download, Zap, Landmark, Key, Share2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useFirebase } from '../FirebaseContext';
import { seedDatabase } from '../utils/seedData';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { useLanguage } from '../LanguageContext';

interface VisitorSession {
  id: string;
  startTime: Timestamp;
  lastSeen: Timestamp;
  country: string;
  city: string;
  ip: string;
  userAgent: string;
  referrer: string;
  events: string[];
  uid?: string;
  email?: string;
}

interface ChatMessage {
  id: string;
  text: string;
  sessionId: string;
  isBot: boolean;
  createdAt: Timestamp;
}

interface InboundEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  timestamp: Timestamp;
  raw?: string;
}

interface AIRequest {
  id: string;
  userId: string;
  userEmail: string;
  task: string;
  type: string;
  cost: number;
  status: 'pending' | 'completed' | 'denied';
  createdAt: Timestamp;
}

interface AIUsageLog {
  id: string;
  userId: string;
  task: string;
  type: string;
  cost: number;
  modelUsed: string;
  result: string;
  timestamp: Timestamp;
}

interface APIKey {
  id: string; // User ID
  apiKey: string;
  createdAt?: any;
}

interface TelegramUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  loginId: string;
  credits: number;
  updatedAt: string;
}

export const AdminAnalytics = () => {
  const { isAdmin, user, isSessionAuth } = useFirebase();
  const { language, t: globalT } = useLanguage();
  const vt = globalT.vamshavali;
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inboundEmails, setInboundEmails] = useState<InboundEmail[]>([]);
  const [aiRequests, setAiRequests] = useState<AIRequest[]>([]);
  const [aiUsage, setAiUsage] = useState<AIUsageLog[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [telegramUsers, setTelegramUsers] = useState<TelegramUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [diagData, setDiagData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'comms' | 'ai' | 'telegram' | 'tools'>('overview');
  
  // Email Signature State
  const [adminName, setAdminName] = useState(user?.displayName || 'Your Name Here');
  const [adminTitle, setAdminTitle] = useState('Community Administrator');

  // User Management Logic Integration
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userLoading, setUserLoading] = useState(false);

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      const { deleteField, updateDoc, getDocs, where } = await import('firebase/firestore');
      const newFacebookId = currentStatus ? deleteField() : `manual_${Date.now()}`;
      const newIsVerified = !currentStatus;

      await updateDoc(userRef, { facebookId: newFacebookId });
      const q = query(collection(db, 'influencers'), where('uid', '==', userId));
      const influencerSnaps = await getDocs(q);
      
      if (!influencerSnaps.empty) {
        for (const influencerDoc of influencerSnaps.docs) {
          await updateDoc(doc(db, 'influencers', influencerDoc.id), {
            facebookId: newFacebookId,
            isVerified: newIsVerified
          });
        }
      }
      toast.success(currentStatus ? 'Verification removed' : 'User verified successfully');
    } catch (err) {
      toast.error('Operation failed');
    }
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    if (userId === user?.uid) {
      toast.error('You cannot change your own role');
      return;
    }
    try {
      const { updateDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', userId);
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await updateDoc(userRef, { role: newRole });
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      toast.error('Operation failed');
    }
  };

  const addCredits = async (userId: string, currentCredits: number = 0) => {
    const amount = window.prompt('Enter amount of credits to add:', '50');
    if (!amount || isNaN(parseInt(amount))) return;
    try {
      const { updateDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { credits: (currentCredits || 0) + parseInt(amount) });
      toast.success(`Added ${amount} credits to user.`);
    } catch (err) {
      toast.error('Failed to add credits.');
    }
  };

  useEffect(() => {
    if (user?.displayName && adminName === 'Your Name Here') {
      setAdminName(user.displayName);
    }
  }, [user]);

  const handleSeed = async () => {
    if (!confirm("Are you sure you want to seed the database with 30 influencers and 17 shops? This will only run if seed data doesn't exist yet.")) return;
    setSeeding(true);
    try {
      const result = await seedDatabase();
      if (result?.alreadySeeded) {
        toast.info("Database is already seeded with initial data.");
      } else {
        toast.success("Database seeded successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error seeding database.");
    } finally {
      setSeeding(false);
    }
  };

  const handleApproveAI = async (requestId: string) => {
    if (!user?.uid) return;
    setApproving(requestId);
    try {
      const res = await fetch('/api/admin/approve-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, adminId: user.uid })
      });
      if (res.ok) {
        toast.success("AI Task approved and executed successfully!");
      } else {
        const data = await res.json();
        toast.error(`Approval failed: ${data.error}`);
      }
    } catch (err) {
      toast.error("Network error during approval.");
    } finally {
      setApproving(null);
    }
  };

  const handleDenyAI = async (requestId: string) => {
    if (!user?.uid) return;
    if (!confirm("Are you sure you want to deny this premium AI request?")) return;
    try {
      const res = await fetch('/api/admin/deny-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, adminId: user.uid })
      });
      if (res.ok) {
        toast.success("AI Task denied.");
      } else {
        toast.error("Failed to deny task.");
      }
    } catch (err) {
      toast.error("Network error.");
    }
  };

  const downloadVamshavaliManual = () => {
    const toastId = toast.loading(vt.downloadManual + "...");
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const margin = 20;
      let y = 20;

      const addTitle = (text: string) => {
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(6, 78, 59);
        doc.text(text, margin, y);
        y += 15;
      };

      const addSection = (title: string, content: string | string[]) => {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(212, 175, 55);
        doc.text(title, margin, y);
        y += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(63, 63, 70);
        
        const contentLines = Array.isArray(content) ? content : [content];
        
        contentLines.forEach(line => {
          const lines = doc.splitTextToSize(line, 170);
          if (y + (lines.length * 7) > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(lines, margin, y);
          y += (lines.length * 7);
        });
        y += 5;
      };

      addTitle(vt.manualPdfTitle);
      addSection(vt.manualIntro, [vt.manualIntroDesc, vt.manualIntroDesch2]);
      addSection(vt.manualTree, vt.manualTreeList);
      addSection(vt.manualEdit, vt.manualEditList);
      addSection(vt.manualExport, vt.manualExportList);
      addSection(vt.manualSecurity, vt.manualSecurityList);
      
      doc.setFontSize(10);
      doc.setTextColor(161, 161, 170);
      doc.text(vt.manualFooter, margin, 285);
      doc.save(`Vamshavali_Manual_${language.toUpperCase()}.pdf`);
      toast.dismiss(toastId);
      toast.success(vt.manual + " downloaded!");
    } catch (error) {
      console.error("Manual Download Error:", error);
      toast.dismiss(toastId);
      toast.error("Failed to generate manual.");
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    const fetchCol = async (name: string) => {
      try {
        const res = await fetch(`/api/admin/data/${name}`);
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        return null;
      }
    };

    const loadAllData = async () => {
      setLoading(true);
      const [emailData, aiReqData, usageData, sessionData, chatData, userData, keyData, tgData] = await Promise.all([
        fetchCol('inbound_emails'),
        fetchCol('pending_ai_requests'),
        fetchCol('usage'),
        fetchCol('visitor_sessions'),
        fetchCol('support_messages'),
        fetchCol('users'),
        fetchCol('api_keys'),
        fetchCol('telegram_users')
      ]);

      if (emailData) setInboundEmails(emailData);
      if (aiReqData) setAiRequests(aiReqData);
      if (usageData) setAiUsage(usageData);
      if (sessionData) setSessions(sessionData);
      if (chatData) setChatMessages(chatData);
      if (userData) setUsers(userData);
      if (keyData) setApiKeys(keyData);
      if (tgData) setTelegramUsers(tgData);
      
      setLoading(false);
    };

    // If we are in session auth, ONLY use API (Firestore will definitely fail)
    if (isSessionAuth) {
      console.log("[AdminAnalytics] Session-only mode detected. Fetching via API proxy.");
      loadAllData();
    } else {
      // Standard flow: try Firestore first, but attach error handlers that fallback to API
      
      // Visitor sessions
      const qSessions = query(collection(db, 'visitor_sessions'), orderBy('lastSeen', 'desc'), limit(100));
      const unsubSessions = onSnapshot(qSessions, (snapshot) => {
        setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitorSession)));
        setLoading(false);
      }, async (err) => {
        console.warn("Firestore sessions fail, retrying via API:", err.message);
        const data = await fetchCol('visitor_sessions');
        if (data) setSessions(data);
        setLoading(false);
      });

      // Chat Messages
      const qChats = query(collection(db, 'support_messages'), orderBy('createdAt', 'desc'), limit(500));
      const unsubChats = onSnapshot(qChats, (snapshot) => {
        setChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
      }, async () => {
        const data = await fetchCol('support_messages');
        if (data) setChatMessages(data);
      });

      // Emails
      const qEmails = query(collection(db, 'inbound_emails'), orderBy('timestamp', 'desc'), limit(100));
      const unsubEmails = onSnapshot(qEmails, (snapshot) => {
        setInboundEmails(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InboundEmail)));
      }, async () => {
        const data = await fetchCol('inbound_emails');
        if (data) setInboundEmails(data);
      });

      // AI Requests
      const qAi = query(collection(db, 'pending_ai_requests'), orderBy('createdAt', 'desc'), limit(50));
      const unsubAi = onSnapshot(qAi, (snapshot) => {
        setAiRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AIRequest)));
      }, async () => {
        const data = await fetchCol('pending_ai_requests');
        if (data) setAiRequests(data);
      });

      // API Keys
      const qKeys = collection(db, 'api_keys');
      const unsubKeys = onSnapshot(qKeys, (snapshot) => {
        setApiKeys(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as APIKey)));
      }, async () => {
        const data = await fetchCol('api_keys');
        if (data) setApiKeys(data);
      });

      // Telegram Users
      const qTg = collection(db, 'telegram_users');
      const unsubTg = onSnapshot(qTg, (snapshot) => {
        setTelegramUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TelegramUser)));
      }, async () => {
        const data = await fetchCol('telegram_users');
        if (data) setTelegramUsers(data);
      });

      // AI Usage
      const qUsage = query(collection(db, 'usage'), orderBy('timestamp', 'desc'), limit(100));
      const unsubUsage = onSnapshot(qUsage, (snapshot) => {
        setAiUsage(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AIUsageLog)));
      }, async () => {
        const data = await fetchCol('usage');
        if (data) setAiUsage(data);
      });

      return () => {
        unsubSessions();
        unsubChats();
        unsubEmails();
        unsubAi();
        unsubKeys();
        unsubTg();
        unsubUsage();
      };
    }

    // Diagnostic fetch always needed
    const fetchDiag = async () => {
      try {
        const res = await fetch('/api/admin/diag');
        if (res.ok) setDiagData(await res.json());
      } catch (err) {}
    };
    fetchDiag();
  }, [isAdmin, isSessionAuth]);

  const handleDeleteEmail = async (id: string) => {
    if (!confirm("Are you sure you want to delete this email?")) return;
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'inbound_emails', id));
      toast.success("Email deleted successfully.");
    } catch (err) {
      console.error("Error deleting email:", err);
      toast.error("Failed to delete email.");
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">Access Denied</h1>
          <p className="text-zinc-500 mb-8">You do not have permission to view this page.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-brand-600 font-bold hover:underline">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const getDuration = (start: Timestamp | null, end: Timestamp | null) => {
    if (!start || !end) return '0s';
    const diff = end.toMillis() - start.toMillis();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const countries = sessions.reduce((acc, s) => {
    if (s.country) {
      acc[s.country] = (acc[s.country] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const sortedCountries = Object.entries(countries).sort((a: any, b: any) => b[1] - a[1]);

  const activeNowCount = sessions.filter(s => {
    if (!s.lastSeen) return false;
    return Date.now() - (s.lastSeen?.toMillis() || 0) < 60000;
  }).length;

  const avgDuration = sessions.length > 0 
    ? getDuration(
        Timestamp.fromMillis(sessions.reduce((acc, s) => acc + (s.startTime?.toMillis() || 0), 0) / sessions.length),
        Timestamp.fromMillis(sessions.reduce((acc, s) => acc + (s.lastSeen?.toMillis() || 0), 0) / sessions.length)
      )
    : '0s';

  // Group chat messages by session
  const chatSessions = chatMessages.reduce((acc, msg) => {
    if (!acc[msg.sessionId]) {
      acc[msg.sessionId] = [];
    }
    acc[msg.sessionId].push(msg);
    return acc;
  }, {} as Record<string, ChatMessage[]>);

  // Sort messages within each session by time (asc)
  Object.keys(chatSessions).forEach(sid => {
    chatSessions[sid].sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
  });

  // Daily Traffic Data
  const dailyTraffic = sessions.reduce((acc, s) => {
    if (!s.startTime) return acc;
    try {
      const date = format(s.startTime.toDate(), 'MMM dd');
      acc[date] = (acc[date] || 0) + 1;
    } catch (e) {
      console.warn("Error formatting date for session:", s.id, e);
    }
    return acc;
  }, {} as Record<string, number>);

  const lineageLogins = sessions.filter(s => 
    s.events?.some(e => e.includes('vamshavali_') && e.includes('login'))
  ).sort((a, b) => (b.lastSeen?.toMillis() || 0) - (a.lastSeen?.toMillis() || 0));

  const sortedChartData = Object.entries(dailyTraffic)
    .map(([date, count]) => ({ 
      date, 
      count,
      timestamp: sessions.find(s => s.startTime && format(s.startTime.toDate(), 'MMM dd') === date)?.startTime?.toMillis() || 0
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar Navigation */}
      <div className="hidden lg:flex w-72 flex-col fixed inset-y-0 bg-white border-r border-zinc-200 z-50">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-3 mb-10 group">
             <div className="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-zinc-900/20 group-hover:scale-110 transition-transform">
                <Users size={20} />
             </div>
             <span className="text-lg font-black text-zinc-900 tracking-tight uppercase">Admin Hub</span>
          </Link>
          
          <nav className="space-y-1">
            {(['overview', 'users', 'comms', 'ai', 'telegram', 'tools'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                    ? 'bg-zinc-900 text-white shadow-xl shadow-zinc-900/10' 
                    : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {tab === 'overview' && <Activity size={18} />}
                {tab === 'users' && <Users size={18} />}
                {tab === 'comms' && <Mail size={18} />}
                {tab === 'ai' && <Zap size={18} />}
                {tab === 'telegram' && <MessageSquare size={18} />}
                {tab === 'tools' && <Database size={18} />}
                <span className="capitalize">{tab}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-8 pt-0">
          <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Logged in as</p>
             <p className="text-xs font-bold text-zinc-900 truncate">{user?.email}</p>
             <Link to="/" className="mt-4 flex items-center gap-2 text-brand-600 font-bold text-[10px] uppercase tracking-widest hover:underline">
               <ArrowLeft size={14} /> Home Page
             </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 lg:ml-72 min-h-screen">
        <div className="pt-32 pb-20 px-8">
          <div className="max-w-6xl mx-auto">
            {/* Mobile Header / Tab Pills */}
            <div className="lg:hidden mb-10 overflow-x-auto no-scrollbar">
               <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-zinc-200 shadow-sm w-fit">
                  {(['overview', 'users', 'comms', 'ai', 'telegram', 'tools'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-6 py-2.5 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === tab 
                          ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/10' 
                          : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
               </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div>
                <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-2 uppercase">
                  {activeTab === 'overview' && 'Visitor Analytics'}
                  {activeTab === 'users' && 'Member Management'}
                  {activeTab === 'comms' && 'Communications'}
                  {activeTab === 'ai' && 'AI Infrastructure'}
                  {activeTab === 'telegram' && 'Telegram Memory'}
                  {activeTab === 'tools' && 'System Tools'}
                </h1>
                <p className="text-zinc-500 font-medium">
                  {activeTab === 'overview' && 'Real-time monitoring of website traffic and user behavior.'}
                  {activeTab === 'users' && 'Manage verified profiles, credits, and community permissions.'}
                  {activeTab === 'comms' && 'Inbox management for system webhooks and live chat logs.'}
                  {activeTab === 'ai' && 'Monitor premium routing, approvals, and API cost protection.'}
                  {activeTab === 'telegram' && 'Stored user details, credits, and AI memory from Barnali bot.'}
                  {activeTab === 'tools' && 'Export records, seed database, and configure system assets.'}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {activeTab === 'overview' && diagData && (
                  <div className="flex items-center gap-4">
                    {diagData.identityToolkitStatus === 'disabled' && (
                      <div className="px-6 py-3 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-3 animate-pulse">
                        <AlertCircle className="text-red-500" size={20} />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">CRITICAL ERROR</span>
                          <span className="text-xs font-bold text-red-700">Identity Toolkit API is Disabled</span>
                          <a 
                            href="https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[9px] text-red-800 underline uppercase font-black mt-0.5"
                          >
                            Enable API in GCP Console →
                          </a>
                        </div>
                      </div>
                    )}
                    <div className="px-6 py-3 bg-white rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${diagData.emailPassConfigured ? 'bg-green-50' : 'bg-amber-50'}`}>
                        <Mail size={20} className={diagData.emailPassConfigured ? 'text-green-600' : 'text-amber-600'} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email Status</p>
                        <p className="text-xl font-bold text-zinc-900">{diagData.emailPassConfigured ? 'Active' : 'Pending'}</p>
                      </div>
                    </div>
                    <div className="px-6 py-3 bg-white rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-50`}>
                        <Activity size={20} className="text-zinc-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active Now</p>
                        <p className="text-xl font-bold text-zinc-900">{activeNowCount}</p>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'tools' && (
                  <button
                    onClick={handleSeed}
                    disabled={seeding}
                    className="px-6 py-3 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-600 transition-all flex items-center gap-3 shadow-xl shadow-zinc-900/10 disabled:opacity-50"
                  >
                    {seeding ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
                    {seeding ? 'Seeding...' : 'Seed Data'}
                  </button>
                )}
                {activeTab === 'tools' && (
                   <Link
                    to="/facebook-verification"
                    className="px-6 py-3 bg-white border border-zinc-200 text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center gap-3 shadow-sm"
                  >
                    <Facebook size={18} className="text-brand-600" />
                    Verification Guide
                  </Link>
                )}
              </div>
            </div>

            {/* --- TAB CONTENT --- */}
            
            {activeTab === 'overview' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Metrics Slides Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Visitors - Dark Bento */}
                  <div className="p-8 bg-zinc-900 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Users size={24} className="text-white" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Total Visitors</p>
                      <h3 className="text-4xl font-black">{users?.length || 0}</h3>
                      <div className="flex items-center gap-2 mt-4 text-green-400">
                        <TrendingUp size={14} />
                        <span className="text-[10px] font-bold">+12% vs last month</span>
                      </div>
                    </div>
                    <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full blur-3xl opacity-50" />
                  </div>

                  {/* Active Now - Clean Card */}
                  <div className="p-8 bg-white border border-zinc-200 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mb-6">
                      <Activity size={24} className="text-brand-600" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Users Online</p>
                    <h3 className="text-4xl font-black text-zinc-900">{activeNowCount}</h3>
                    <p className="text-[10px] font-medium text-zinc-500 mt-4 leading-relaxed">Live WebSocket sessions</p>
                  </div>

                  {/* Support Inquiries */}
                  <div className="p-8 bg-zinc-50 rounded-[2.5rem] border border-zinc-200 shadow-sm relative group overflow-hidden">
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform">
                        <MessageSquare size={24} className="text-zinc-600" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Total Inquiries</p>
                      <h3 className="text-4xl font-black text-zinc-900">{chatMessages?.length || 0}</h3>
                      <p className="text-[10px] font-medium text-zinc-500 mt-4">Growth rate: <span className="text-brand-600 font-bold">Stable</span></p>
                    </div>
                  </div>

                  {/* Regional Reach */}
                  <div className="p-8 bg-brand-600 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
                        <Globe size={24} className="text-white" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-200 mb-1">Regional Scope</p>
                      <h3 className="text-4xl font-black">{Object.keys(countries).length}</h3>
                      <p className="text-[10px] font-bold mt-4 opacity-80">Countries interacting</p>
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl" />
                  </div>
                </div>

                {/* Traffic Chart */}
                <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sortedChartData}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF6321" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#FF6321" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#a1a1aa' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#a1a1aa' }} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                      <Area type="monotone" dataKey="count" stroke="#FF6321" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" name="Visitors" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
                      <Activity size={20} className="text-brand-600" />
                      Recent Visitors
                    </h2>
                    <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-100">
                              <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Visitor</th>
                              <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Location</th>
                              <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Duration</th>
                              <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Events</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-50">
                            {sessions.map((session) => (
                              <tr key={session.id} className="hover:bg-zinc-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-zinc-900 truncate max-w-[150px] flex items-center gap-2">
                                      {session.email || `Guest (${session.id.substring(0, 6)})`}
                                    </span>
                                    <span className="text-[10px] text-zinc-400 font-mono">{session.ip}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <MapPin size={12} className="text-zinc-400" />
                                    <span className="text-xs font-medium text-zinc-600">{session.city}, {session.country}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-zinc-900">{getDuration(session.startTime, session.lastSeen)}</td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-1">
                                    {session.events?.slice(-2).map((e, i) => (
                                      <span key={i} className="px-2 py-0.5 bg-zinc-100 text-[9px] font-black text-zinc-500 rounded-full uppercase tracking-wider">{e}</span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
                      <Globe size={20} className="text-brand-600" />
                      Country Reach
                    </h2>
                    <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-4">
                      {sortedCountries.slice(0, 5).map(([country, count]) => (
                        <div key={country} className="space-y-2">
                          <div className="flex justify-between text-xs font-bold"><span>{country}</span><span className="text-brand-600">{count}</span></div>
                          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-brand-500 transition-all duration-500" style={{ width: `${(count / sessions.length) * 100}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Paid AI Usage Activity (Consolidated) */}
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
                      <Activity size={20} className="text-brand-600" />
                      Paid AI Usage Audit
                    </h2>
                    <div className="px-4 py-2 bg-brand-50 rounded-xl border border-brand-100">
                      <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">
                        {aiUsage.reduce((acc, curr) => acc + (curr.cost || 0), 0)} Total Credits
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-100">
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">User</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Model</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cost</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {aiUsage.slice(0, 10).map((log) => (
                            <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                              <td className="px-6 py-4 text-xs font-bold text-zinc-900">{log.userId.includes('@') ? log.userId : `ID: ${log.userId.substring(0, 8)}`}</td>
                              <td className="px-6 py-4 text-[10px] font-black text-brand-600 uppercase">{log.modelUsed || "Router"}</td>
                              <td className="px-6 py-4 text-[10px] font-black">{log.cost} CR</td>
                              <td className="px-6 py-4 text-right text-[10px] font-medium text-zinc-500">{log.timestamp?.toDate()?.toLocaleTimeString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Family Tree Portal Activity - NEW */}
                <div className="space-y-6 mb-12">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
                      <Landmark size={20} className="text-[#064e3b]" />
                      Family Tree Portal Logs (Lineage System)
                    </h2>
                    <div className="px-4 py-2 bg-[#fdfbf7] rounded-xl border border-[#d4af37]/20">
                      <p className="text-[10px] font-black text-[#064e3b] uppercase tracking-widest">
                        {lineageLogins.length} Active Generations
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#fdfbf7] border-b border-[#d4af37]/10">
                            <th className="px-6 py-4 text-[10px] font-black text-[#064e3b] uppercase tracking-widest">Archivist (User)</th>
                            <th className="px-6 py-4 text-[10px] font-black text-[#064e3b] uppercase tracking-widest">Login Type</th>
                            <th className="px-6 py-4 text-[10px] font-black text-[#064e3b] uppercase tracking-widest">Profile ID</th>
                            <th className="px-6 py-4 text-[10px] font-black text-[#064e3b] uppercase tracking-widest">Last Activity</th>
                            <th className="px-6 py-4 text-[10px] font-black text-[#064e3b] uppercase tracking-widest text-right">Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {lineageLogins.map((req) => {
                            const loginEvent = req.events?.find(e => e.includes('vamshavali_') && e.includes('login')) || '';
                            const isSocial = loginEvent.includes('social');
                            let profileId = 'Pending';
                            try {
                              if (loginEvent.includes('{')) {
                                const jsonStr = loginEvent.split(': ')[1];
                                const data = JSON.parse(jsonStr);
                                profileId = data.profileId || profileId;
                              }
                            } catch(e) {}

                            return (
                              <tr key={req.id} className="hover:bg-[#fdfbf7]/40 transition-colors group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#064e3b] flex items-center justify-center text-[#d4af37]">
                                      <User size={14} />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-zinc-900">{req.email || 'Anonymous Keeper'}</p>
                                      <p className="text-[10px] text-zinc-400 font-medium">Session: {req.id.substring(0, 8)}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                    isSocial ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                                  }`}>
                                    {isSocial ? 'Social OAuth' : 'OTP Verified'}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                   <code className="text-[10px] bg-zinc-100 px-2 py-1 rounded font-mono text-zinc-600">
                                     {profileId}
                                   </code>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-[10px] font-bold text-zinc-500">
                                    {req.lastSeen?.toDate()?.toLocaleString() || 'Live'}
                                  </p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2 text-zinc-500 font-bold text-[10px]">
                                     <MapPin size={10} />
                                     {req.city}, {req.country}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {lineageLogins.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-6 py-20 text-center">
                                <Landmark size={48} className="text-zinc-100 mx-auto mb-4" />
                                <p className="text-zinc-400 font-medium text-sm">No lineage archives accessed recently.</p>
                                <p className="text-[10px] text-zinc-300 mt-1 uppercase tracking-widest">Barnali Registry is waiting for genealogists.</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6 mb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
                <Users size={20} className="text-brand-600" />
                Community Members
              </h2>
              <div className="relative w-full md:w-72">
                <input 
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-2xl px-10 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm"
                />
                <Activity size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-zinc-50 border-b border-zinc-100">
                       <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Member</th>
                       <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Credits</th>
                       <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Role</th>
                       <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                       <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-50">
                     {users.filter(u => 
                       u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                     ).map((u) => (
                       <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 overflow-hidden font-black text-xs">
                               {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" /> : u.displayName?.charAt(0)}
                             </div>
                             <div>
                               <p className="text-xs font-bold text-zinc-900">{u.displayName || 'Unnamed'}</p>
                               <p className="text-[10px] text-zinc-400 font-medium">{u.email}</p>
                             </div>
                           </div>
                         </td>
                         <td className="px-6 py-4">
                            <button 
                              onClick={() => addCredits(u.id, u.credits)}
                              className="px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-brand-100 transition-all"
                            >
                              {u.credits || 0} CR +
                            </button>
                         </td>
                         <td className="px-6 py-4">
                           <button 
                             onClick={() => toggleRole(u.id, u.role || 'user')}
                             className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
                               u.role === 'admin' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'
                             }`}
                           >
                             {u.role || 'user'}
                           </button>
                         </td>
                         <td className="px-6 py-4">
                            <span className={`w-2.5 h-2.5 rounded-full inline-block ${u.facebookId ? 'bg-brand-600' : 'bg-zinc-200'}`} title={u.facebookId ? 'Verified' : 'Unverified'} />
                         </td>
                         <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => toggleVerification(u.id, !!u.facebookId)}
                              className={`p-2 rounded-xl transition-all ${u.facebookId ? 'text-brand-600 bg-brand-50' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}
                              title="Toggle Verification"
                            >
                              <CheckCircle size={16} />
                            </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* App Inbox (Inbound Emails) - MOVED TO TOP */}
        {activeTab === 'comms' && (
          <div className="space-y-6 mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
              <Mail size={20} className="text-brand-600" />
              App Inbox (@barnia.in)
            </h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={async () => {
                  try {
                    toast.loading("Verifying SMTP connection...", { id: 'verify-smtp' });
                    const response = await fetch('/api/admin/verify-smtp');
                    const data = await response.json();
                    if (response.ok) {
                      toast.success("SMTP Connection Verified!", { id: 'verify-smtp' });
                    } else {
                      toast.error(`Verification Failed: ${data.error}`, { 
                        id: 'verify-smtp',
                        description: `Code: ${data.code || 'N/A'}`
                      });
                    }
                  } catch (err: any) {
                    toast.error(`Error: ${err.message}`, { id: 'verify-smtp' });
                  }
                }}
                className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center gap-2"
              >
                <CheckCircle size={14} />
                Verify SMTP
              </button>
              <button 
                onClick={async () => {
                  if (!user?.email) {
                    toast.error("You must have an email associated with your account.");
                    return;
                  }
                  try {
                    toast.loading("Sending test welcome email...", { id: 'test-email' });
                    const response = await fetch(`/api/admin/test-email-detailed?email=${user.email}`);
                    const data = await response.json();
                    
                    if (response.ok) {
                      toast.success(`Email sent! (Took ${data.info.timeMs}ms)`, { id: 'test-email' });
                    } else {
                      console.error("Test email failed:", data);
                      const detail = data.details ? `: ${data.details}` : '';
                      const errorMsg = data.error || 'Unknown error';
                      toast.error(`Failed: ${errorMsg}${detail}`, { 
                        id: 'test-email',
                        duration: 10000,
                        description: "Check console for full stack trace."
                      });
                    }
                  } catch (err: any) {
                    console.error("Error sending test email:", err);
                    toast.error(`Error: ${err.message}`, { id: 'test-email' });
                  }
                }}
                className="px-4 py-2 bg-blue-100 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-200 transition-all flex items-center gap-2"
              >
                <Mail size={14} />
                Test Welcome Email
              </button>
              <button 
                onClick={async () => {
                  try {
                    const response = await fetch('/api/webhooks/email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        from: 'test@example.com',
                        to: 'info@barnia.in',
                        subject: 'Test Webhook Message',
                        body: 'This is a test message to verify the webhook is working correctly.',
                        timestamp: new Date().toISOString()
                      })
                    });
                    if (response.ok) {
                      toast.success("Test email sent to webhook!");
                    } else {
                      toast.error("Failed to send test email.");
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error("Error sending test email.");
                  }
                }}
                className="px-4 py-2 bg-green-100 text-green-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-200 transition-all flex items-center gap-2"
              >
                <Activity size={14} />
                Test Webhook
              </button>
              <button 
                onClick={() => setShowSetupGuide(true)}
                className="px-4 py-2 bg-brand-100 text-brand-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-200 transition-all flex items-center gap-2"
              >
                <Database size={14} />
                Setup Guide
              </button>
              <button 
                onClick={() => {
                  const url = `${window.location.origin}/api/webhooks/email`;
                  navigator.clipboard.writeText(url);
                  toast.success("Webhook URL copied to clipboard!");
                }}
                className="px-4 py-2 bg-zinc-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-600 transition-all flex items-center gap-2 shadow-lg shadow-zinc-900/10"
              >
                <ExternalLink size={14} />
                Copy Webhook URL
              </button>
              <div className="px-4 py-2 bg-brand-50 rounded-xl border border-brand-100">
                <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Webhook Active</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">From</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Subject</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Time</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {inboundEmails.map((email) => (
                    <tr key={email.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-zinc-900">{email.from}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">To: {email.to}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-medium text-zinc-600 line-clamp-1">{email.subject}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[10px] font-bold text-zinc-500">
                          {email.timestamp?.toDate()?.toLocaleString() || 'Just now'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedEmail(email)}
                            className="p-2 text-zinc-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                            title="View Content"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteEmail(email.id)}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {inboundEmails.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <Mail size={48} className="text-zinc-100 mx-auto mb-4" />
                        <p className="text-zinc-400 font-medium text-sm">No emails received yet.</p>
                        <p className="text-[10px] text-zinc-300 mt-1 uppercase tracking-widest">Waiting for webhook data...</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6 mb-20">
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
              <MessageSquare size={20} className="text-brand-600" />
              Web Live Chat Activity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(Object.entries(chatSessions) as [string, ChatMessage[]][]).map(([sid, msgs]) => {
                const session = sessions.find(s => s.id === sid);
                return (
                  <div key={sid} className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
                    <div className="p-5 bg-zinc-50/50 border-b border-zinc-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-400">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-900">
                            {session?.email || `Guest (${sid.substring(0, 6)})`}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-medium">
                            {session?.city || 'Unknown'}, {session?.country || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-zinc-100">
                        {msgs.length} MSG
                      </span>
                    </div>
                    <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-zinc-50/20">
                      {msgs.map((m) => (
                        <div key={m.id} className={`flex ${m.isBot ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[85%] p-4 rounded-3xl text-xs leading-relaxed shadow-sm ${
                            m.isBot 
                              ? 'bg-white text-zinc-700 border border-zinc-100 rounded-tl-none' 
                              : 'bg-zinc-900 text-white rounded-tr-none font-medium'
                          }`}>
                            {m.text}
                            <p className={`text-[8px] mt-2 opacity-50 ${m.isBot ? 'text-zinc-400' : 'text-white'}`}>
                              {m.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Just now'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.keys(chatSessions).length === 0 && (
                <div className="md:col-span-2 bg-white p-12 rounded-[2.5rem] border border-zinc-200 border-dashed text-center">
                  <MessageSquare size={48} className="text-zinc-200 mx-auto mb-4" />
                  <p className="text-zinc-500 font-bold">No active chat sessions.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Pending AI Approvals - NEW */}
        {activeTab === 'ai' && (
          <div className="space-y-12">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
                  <Zap size={20} className="text-brand-600" />
                  Pending AI Approvals (Developer Protection)
                </h2>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                      {aiRequests.filter(r => r.status === 'pending').length} Requests Waiting
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Customer</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Task Details</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pricing</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Time</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Protection Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {aiRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-zinc-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-zinc-900">{req.userEmail}</p>
                            <p className="text-[10px] text-zinc-400 font-medium">Type: {req.type.toUpperCase()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-medium text-zinc-600 line-clamp-1 italic">"{req.task || 'Media Animation'}"</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black px-2 py-0.5 bg-brand-50 text-brand-600 rounded-full">
                                 {req.cost} CREDITS
                               </span>
                               {req.cost >= 20 && (
                                 <span className="text-[8px] font-black px-2 py-0.5 bg-red-50 text-red-600 rounded-full animate-pulse">
                                    HIGH VALUE
                                 </span>
                               )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[10px] font-bold text-zinc-500">
                              {req.createdAt?.toDate()?.toLocaleString() || 'Just now'}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {req.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleApproveAI(req.id)}
                                  disabled={approving === req.id}
                                  className="px-4 py-2 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                  {approving === req.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleDenyAI(req.id)}
                                  className="px-4 py-2 border border-red-200 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-2"
                                >
                                  <Trash2 size={12} />
                                  Deny
                                </button>
                              </div>
                            ) : (
                              <span className={`text-[10px] font-black uppercase tracking-widest ${
                                req.status === 'completed' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {req.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {aiRequests.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-20 text-center">
                            <Zap size={48} className="text-zinc-100 mx-auto mb-4" />
                            <p className="text-zinc-400 font-medium text-sm">No premium AI tasks waiting for approval.</p>
                            <p className="text-[10px] text-zinc-300 mt-1 uppercase tracking-widest">Router Protection system is active.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* API Key Management - NEW */}
            <div className="space-y-6 mb-12">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
                  <Key size={20} className="text-brand-600" />
                  Active API Keys ({apiKeys.length})
                </h2>
              </div>
              
              <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {apiKeys.map((k) => (
                    <div key={k.id} className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 group hover:border-brand-500/30 transition-all">
                      <div className="flex items-center gap-3 mb-4">
                         <div className="w-10 h-10 bg-brand-50 rounded-2xl flex items-center justify-center">
                           <User size={20} className="text-brand-600" />
                         </div>
                         <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">User ID</p>
                            <p className="text-xs font-bold text-zinc-900 truncate" title={k.id}>{k.id}</p>
                         </div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-zinc-100 mb-3">
                         <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Key Fragment</p>
                         <code className="text-[10px] font-mono font-black text-brand-600">
                            {k.apiKey.substring(0, 8)}••••••••{k.apiKey.substring(k.apiKey.length - 4)}
                         </code>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active</span>
                         {k.createdAt && (
                            <span className="text-[10px] text-zinc-400 font-medium tracking-tight">
                               Issued: {k.createdAt.toDate().toLocaleDateString()}
                            </span>
                         )}
                      </div>
                    </div>
                  ))}
                  {apiKeys.length === 0 && (
                    <div className="col-span-full text-center py-12">
                       <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest">No API keys have been issued yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Telegram Management Tab */}
        {activeTab === 'telegram' && (
          <div className="space-y-6 mb-12">
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
              <MessageSquare size={20} className="text-brand-600" />
              Telegram AI Memory (Barnali Bot)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {telegramUsers.map((tg) => (
                 <motion.div 
                   key={tg.id}
                   whileHover={{ y: -5 }}
                   className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm hover:border-brand-500/20 transition-all group"
                 >
                    <div className="flex items-center gap-4 mb-6">
                       <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-lg">
                          <User size={20} />
                       </div>
                       <div>
                          <p className="text-xs font-bold text-zinc-900 truncate max-w-[150px]">{tg.name || tg.id}</p>
                          <p className="text-[10px] text-zinc-400 font-medium">Chat ID: {tg.id}</p>
                       </div>
                       <div className="ml-auto">
                          <span className="px-2.5 py-1 bg-brand-50 text-brand-600 rounded-full text-[9px] font-black uppercase">
                             {tg.credits || 0} CR
                          </span>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-400 font-bold uppercase">Email</span>
                          <span className="text-zinc-700 font-medium">{tg.email || '—'}</span>
                       </div>
                       <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-400 font-bold uppercase">Phone</span>
                          <span className="text-zinc-700 font-medium">{tg.phone || '—'}</span>
                       </div>
                       <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-400 font-bold uppercase">Profile Link</span>
                          <span className="text-zinc-700 font-bold text-brand-600">{tg.loginId || '—'}</span>
                       </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-50 flex items-center justify-between">
                       <p className="text-[8px] text-zinc-300 font-medium uppercase">Last Synced: {new Date(tg.updatedAt).toLocaleDateString()}</p>
                       <button className="text-zinc-400 hover:text-brand-600 transition-colors">
                          <ExternalLink size={14} />
                       </button>
                    </div>
                 </motion.div>
               ))}
               {telegramUsers.length === 0 && (
                 <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-zinc-200 border-dashed">
                    <MessageSquare size={48} className="text-zinc-100 mx-auto mb-4" />
                    <p className="text-zinc-400 font-medium">No Telegram users in memory yet.</p>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Project Assets & Resources */}
        {activeTab === 'tools' && (
          <div className="animate-in fade-in duration-500">
            <div className="space-y-6 mb-12">
          <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
            <Database size={20} className="text-brand-600" />
            Project Assets & Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center">
                  <FileText size={24} className="text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">Vamshavali Manual</p>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">PDF Operating Guide</p>
                </div>
              </div>
              <button 
                onClick={downloadVamshavaliManual}
                className="p-3 bg-zinc-900 text-white rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-zinc-900/10"
                title="Download PDF"
              >
                <Download size={18} />
              </button>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Database size={24} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">School Project Documentation</p>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">LaTeX (.TeX) Source Code</p>
                </div>
              </div>
              <a 
                href="/api/admin/download-docs"
                download
                className="p-3 bg-zinc-900 text-white rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-zinc-900/10"
                title="Download .TeX File"
              >
                <Download size={18} />
              </a>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center">
                  <Zap size={24} className="text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">AI Router Hub</p>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">SaaS Router Dashboard</p>
                </div>
              </div>
              <Link 
                to="/ai-router"
                className="p-3 bg-zinc-900 text-white rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-zinc-900/10"
                title="Open AI Router"
              >
                <ExternalLink size={18} />
              </Link>
            </div>
            </div>

            {/* Email Signature Section */}
            <div className="space-y-6 mb-20">
            <p className="text-xs text-zinc-500 font-medium mb-6">
              Copy this signature and paste it into your Gmail settings (Settings {'>'} See all settings {'>'} Signature). 
              Once saved, it will appear **automatically** on every email you send.
            </p>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Configuration */}
              <div className="space-y-6">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Customize Signature</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Job Title</label>
                    <input 
                      type="text" 
                      value={adminTitle}
                      onChange={(e) => setAdminTitle(e.target.value)}
                      placeholder="Enter your title"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    />
                  </div>
                </div>
                <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100">
                  <p className="text-[10px] text-brand-700 font-medium leading-relaxed">
                    <strong>Tip:</strong> The signature below updates in real-time. Once you're happy with it, click "Copy HTML Code" and paste it into Gmail.
                  </p>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Live Preview</p>
                <div className="border border-zinc-100 rounded-3xl p-6 bg-zinc-50/30">
                  <div style={{ fontFamily: "'Inter', Helvetica, Arial, sans-serif", color: "#18181b", maxWidth: "500px", border: "1px solid #f4f4f5", borderRadius: "24px", overflow: "hidden", backgroundColor: "#ffffff", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
                    <div style={{ backgroundColor: "#FF6321", padding: "20px", textAlign: "center" }}>
                      <h1 style={{ margin: 0, color: "#ffffff", fontSize: "20px", fontWeight: 900, letterSpacing: "-0.5px", textTransform: "uppercase" }}>Barnia Digital Hub</h1>
                      <a href="https://barnia.in" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: "12px", fontWeight: "bold" }}>www.barnia.in</a>
                    </div>
                    <div style={{ padding: "24px" }}>
                      <div style={{ marginBottom: "20px" }}>
                        <p style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#18181b" }}>{adminName}</p>
                        <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#71717a", fontWeight: 500 }}>{adminTitle}</p>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
                        <a href="https://www.facebook.com/ujirpur.barnia" style={{ display: "inline-block", backgroundColor: "#1877F2", color: "white", padding: "6px 12px", borderRadius: "8px", textDecoration: "none", fontSize: "10px", fontWeight: "bold", marginRight: "4px", marginBottom: "4px" }}>Facebook</a>
                        <a href="https://www.instagram.com/ujirpurbarnia/" style={{ display: "inline-block", backgroundColor: "#E4405F", color: "white", padding: "6px 12px", borderRadius: "8px", textDecoration: "none", fontSize: "10px", fontWeight: "bold", marginRight: "4px", marginBottom: "4px" }}>Instagram</a>
                        <a href="https://www.threads.com/@ujirpurbarnia" style={{ display: "inline-block", backgroundColor: "#000000", color: "white", padding: "6px 12px", borderRadius: "8px", textDecoration: "none", fontSize: "10px", fontWeight: "bold", marginRight: "4px", marginBottom: "4px" }}>Threads</a>
                        <a href="https://www.youtube.com/channel/UCOPZsznZz3wMXd3v1K9gTtQ" style={{ display: "inline-block", backgroundColor: "#FF0000", color: "white", padding: "6px 12px", borderRadius: "8px", textDecoration: "none", fontSize: "10px", fontWeight: "bold", marginBottom: "4px" }}>YouTube</a>
                      </div>
                      <div style={{ marginTop: "20px", paddingTop: "15px", borderTop: "1px solid #f4f4f5" }}>
                        <p style={{ margin: 0, fontSize: "10px", color: "#a1a1aa", lineHeight: 1.5 }}>
                          Connecting Barnia, Ujirpur, and Nadia to the digital world.<br />
                          Stay updated with market prices, news, and community events.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Code */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">HTML Template Code</p>
                  <button 
                    onClick={() => {
                      const code = `<div style="font-family: 'Inter', Helvetica, Arial, sans-serif; color: #18181b; max-width: 500px; border: 1px solid #f4f4f5; border-radius: 24px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
  <div style="background-color: #FF6321; padding: 20px; text-align: center;">
    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">Barnia Digital Hub</h1>
    <a href="https://barnia.in" style="color: rgba(255,255,255,0.8); text-decoration: none; font-size: 12px; font-weight: bold;">www.barnia.in</a>
  </div>
  <div style="padding: 24px;">
    <div style="margin-bottom: 20px;">
      <p style="margin: 0; font-size: 16px; font-weight: 800; color: #18181b;">${adminName}</p>
      <p style="margin: 2px 0 0 0; font-size: 12px; color: #71717a; font-weight: 500;">${adminTitle}</p>
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px;">
      <a href="https://www.facebook.com/ujirpur.barnia" style="display: inline-block; background-color: #1877F2; color: white; padding: 6px 12px; border-radius: 8px; text-decoration: none; font-size: 10px; font-weight: bold; margin-right: 4px; margin-bottom: 4px;">Facebook</a>
      <a href="https://www.instagram.com/ujirpurbarnia/" style="display: inline-block; background-color: #E4405F; color: white; padding: 6px 12px; border-radius: 8px; text-decoration: none; font-size: 10px; font-weight: bold; margin-right: 4px; margin-bottom: 4px;">Instagram</a>
      <a href="https://www.threads.com/@ujirpurbarnia" style="display: inline-block; background-color: #000000; color: white; padding: 6px 12px; border-radius: 8px; text-decoration: none; font-size: 10px; font-weight: bold; margin-right: 4px; margin-bottom: 4px;">Threads</a>
      <a href="https://www.youtube.com/channel/UCOPZsznZz3wMXd3v1K9gTtQ" style="display: inline-block; background-color: #FF0000; color: white; padding: 6px 12px; border-radius: 8px; text-decoration: none; font-size: 10px; font-weight: bold; margin-bottom: 4px;">YouTube</a>
    </div>
    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #f4f4f5;">
      <p style="margin: 0; font-size: 10px; color: #a1a1aa; line-height: 1.5;">
        Connecting Barnia, Ujirpur, and Nadia to the digital world.<br>
        Stay updated with market prices, news, and community events.
      </p>
    </div>
  </div>
</div>`;
                      navigator.clipboard.writeText(code);
                      toast.success("Signature code copied!");
                    }}
                    className="flex items-center gap-2 text-brand-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                  >
                    <ExternalLink size={12} />
                    Copy HTML Code
                  </button>
                </div>
                <div className="bg-zinc-900 p-6 rounded-3xl overflow-x-auto">
                  <pre className="text-[10px] font-mono text-zinc-400 leading-relaxed">
                    {`<div style="font-family: 'Inter', ...">
  <div style="background-color: #FF6321; ...">
    <h1 style="...">Barnia Digital Hub</h1>
    ...
  </div>
  ...
</div>`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
        )}

        {/* Email Modal */}
        <AnimatePresence>
          {selectedEmail && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedEmail(null)}
                className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-1">{selectedEmail.subject}</h3>
                    <p className="text-xs text-zinc-500 font-medium">From: {selectedEmail.from}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedEmail(null)}
                    className="p-3 hover:bg-white rounded-2xl transition-all text-zinc-400 hover:text-zinc-900 shadow-sm"
                  >
                    <ArrowLeft size={20} />
                  </button>
                </div>
                <div className="p-8 max-h-[60vh] overflow-y-auto">
                  {selectedEmail.html ? (
                    <div 
                      className="bg-white p-6 rounded-3xl border border-zinc-100 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                    />
                  ) : (
                    <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                      <pre className="text-xs font-mono text-zinc-700 whitespace-pre-wrap break-words leading-relaxed">
                        {selectedEmail.body}
                      </pre>
                    </div>
                  )}
                  {selectedEmail.raw && (
                    <details className="mt-6">
                      <summary className="text-[10px] font-black text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-zinc-600 transition-colors">
                        View Raw Webhook Data
                      </summary>
                      <pre className="mt-4 p-4 bg-zinc-900 text-zinc-400 text-[10px] rounded-2xl overflow-x-auto">
                        {JSON.stringify(JSON.parse(selectedEmail.raw), null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <div className="p-8 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between gap-4">
                  <a 
                    href={`mailto:${selectedEmail.from}?subject=Re: ${selectedEmail.subject}`}
                    className="px-8 py-3 bg-brand-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-600/20 flex items-center gap-2"
                  >
                    <Mail size={14} />
                    Reply
                  </a>
                  <button 
                    onClick={() => setSelectedEmail(null)}
                    className="px-8 py-3 bg-zinc-200 text-zinc-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-300 transition-all"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Setup Guide Modal */}
        <AnimatePresence>
          {showSetupGuide && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSetupGuide(false)}
                className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-1">Free Email Setup Guide</h3>
                    <p className="text-xs text-zinc-500 font-medium tracking-wide">Best options for lifetime free domain email (@barnia.in)</p>
                  </div>
                  <button 
                    onClick={() => setShowSetupGuide(false)}
                    className="p-3 hover:bg-white rounded-2xl transition-all text-zinc-400 hover:text-zinc-900 shadow-sm"
                  >
                    <ArrowLeft size={20} />
                  </button>
                </div>
                
                <div className="p-8 max-h-[70vh] overflow-y-auto space-y-8">
                  {/* Recommendation */}
                  <div className="p-6 bg-brand-50 rounded-3xl border-2 border-brand-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center text-white shadow-lg">
                        <TrendingUp size={20} />
                      </div>
                      <h4 className="text-sm font-black text-brand-900 uppercase tracking-tight">Top Recommendation: Cloudflare</h4>
                    </div>
                    <p className="text-xs text-brand-800 font-medium leading-relaxed mb-4">
                      Cloudflare is the **best for lifetime free use**. Since you own your domain, moving your DNS to Cloudflare (free) gives you professional-grade email routing that will likely stay free forever.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-brand-700">
                        <CheckCircle size={12} /> Unlimited Emails
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-brand-700">
                        <CheckCircle size={12} /> Enterprise Reliability
                      </div>
                    </div>
                  </div>

                  {/* Step by Step */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Setup Steps (Cloudflare)</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-2 block">Step 1</span>
                        <p className="text-xs font-bold text-zinc-900 mb-1">Add Domain</p>
                        <p className="text-[10px] text-zinc-500 font-medium">Add barnia.in to Cloudflare and update your nameservers.</p>
                      </div>
                      <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-2 block">Step 2</span>
                        <p className="text-xs font-bold text-zinc-900 mb-1">Enable Routing</p>
                        <p className="text-[10px] text-zinc-500 font-medium">Go to Email {" > "} Email Routing and click "Enable".</p>
                      </div>
                      <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-2 block">Step 3</span>
                        <p className="text-xs font-bold text-zinc-900 mb-1">Create Alias</p>
                        <p className="text-[10px] text-zinc-500 font-medium">Create an address like info@barnia.in.</p>
                      </div>
                      <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-2 block">Step 4</span>
                        <p className="text-xs font-bold text-zinc-900 mb-1">Set Destination</p>
                        <p className="text-[10px] text-zinc-500 font-medium">Set the destination to "Worker" and paste the Webhook URL.</p>
                      </div>
                    </div>
                  </div>

                  {/* Alternative */}
                  <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <h4 className="text-xs font-black text-zinc-900 uppercase tracking-tight mb-4">Alternative: ImprovMX</h4>
                    <p className="text-[11px] text-zinc-500 font-medium leading-relaxed mb-4">
                      If you don't want to use Cloudflare, ImprovMX is the easiest to set up. Just enter your domain and your personal email on their homepage.
                    </p>
                    <a 
                      href="https://improvmx.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-brand-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                    >
                      Visit ImprovMX <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                <div className="p-8 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                  <button 
                    onClick={() => setShowSetupGuide(false)}
                    className="px-8 py-3 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl shadow-zinc-900/10"
                  >
                    Got it!
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>
</div>
  );
};

export default AdminAnalytics;
