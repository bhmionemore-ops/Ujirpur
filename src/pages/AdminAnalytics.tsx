import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { Users, Globe, Clock, Activity, MapPin, Calendar, ArrowLeft, ExternalLink, MessageSquare, User, Database, Loader2, TrendingUp, Facebook, Mail, Trash2, Eye, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useFirebase } from '../FirebaseContext';
import { seedDatabase } from '../utils/seedData';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';

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

export const AdminAnalytics = () => {
  const { isAdmin } = useFirebase();
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inboundEmails, setInboundEmails] = useState<InboundEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const handleSeed = async () => {
    if (!confirm("Are you sure you want to seed the database with 30 influencers and 17 shops? This will only run if seed data doesn't exist yet.")) return;
    setSeeding(true);
    try {
      await seedDatabase();
      toast.success("Database seeded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error seeding database.");
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    // Fetch visitor sessions
    const qSessions = query(collection(db, 'visitor_sessions'), orderBy('lastSeen', 'desc'), limit(100));
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitorSession));
      setSessions(docs);
      setLoading(false);
    }, (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, 'visitor_sessions');
      } catch (e) {
        setError(e as Error);
      }
      setLoading(false);
    });

    // Fetch chat messages
    const qChats = query(collection(db, 'support_messages'), orderBy('createdAt', 'desc'), limit(500));
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setChatMessages(docs);
    }, (err) => {
      console.error("Error fetching chats:", err);
    });

    // Fetch inbound emails
    const qEmails = query(collection(db, 'inbound_emails'), orderBy('timestamp', 'desc'), limit(100));
    const unsubEmails = onSnapshot(qEmails, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InboundEmail));
      setInboundEmails(docs);
    }, (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, 'inbound_emails');
      } catch (e) {
        setError(e as Error);
      }
    });

    return () => {
      unsubSessions();
      unsubChats();
      unsubEmails();
    };
  }, [isAdmin]);

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

  const sortedChartData = Object.entries(dailyTraffic)
    .map(([date, count]) => ({ 
      date, 
      count,
      timestamp: sessions.find(s => s.startTime && format(s.startTime.toDate(), 'MMM dd') === date)?.startTime?.toMillis() || 0
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="min-h-screen bg-zinc-50 pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-2 uppercase">Visitor Analytics</h1>
            <p className="text-zinc-500 font-medium">Real-time monitoring of website traffic and user behavior.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/facebook-verification"
              className="px-6 py-3 bg-white border border-zinc-200 text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center gap-3 shadow-sm"
            >
              <Facebook size={18} className="text-brand-600" />
              Verification Guide
            </Link>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-6 py-3 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-600 transition-all flex items-center gap-3 shadow-xl shadow-zinc-900/10 disabled:opacity-50"
            >
              {seeding ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
              {seeding ? 'Seeding...' : 'Seed Data'}
            </button>
            <div className="px-6 py-3 bg-white rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Activity size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active Now</p>
                <p className="text-xl font-bold text-zinc-900">{activeNowCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mb-6">
              <Users size={24} className="text-brand-600" />
            </div>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Sessions</p>
            <p className="text-3xl font-black text-zinc-900">{sessions.length}</p>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
              <Globe size={24} className="text-blue-600" />
            </div>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1">Countries</p>
            <p className="text-3xl font-black text-zinc-900">{Object.keys(countries).length}</p>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-6">
              <Clock size={24} className="text-purple-600" />
            </div>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1">Avg. Duration</p>
            <p className="text-3xl font-black text-zinc-900">{avgDuration}</p>
          </div>
        </div>

        {/* Traffic Chart */}
        <div className="mb-12 space-y-6">
          <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
            <TrendingUp size={20} className="text-brand-600" />
            Daily Traffic Report
          </h2>
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
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#a1a1aa' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#a1a1aa' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#FF6321" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  name="Visitors"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Recent Visitors */}
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
                            <span className="text-xs font-bold text-zinc-900 truncate max-w-[150px]">
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
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-zinc-400" />
                            <span className="text-xs font-bold text-zinc-900">{getDuration(session.startTime, session.lastSeen)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {session.events && session.events.slice(-3).map((e, i) => (
                              <span key={i} className="px-2 py-0.5 bg-zinc-100 text-[9px] font-black text-zinc-500 rounded-full uppercase tracking-wider">
                                {e}
                              </span>
                            ))}
                            {session.events && session.events.length > 3 && (
                              <span className="text-[9px] font-bold text-zinc-400">+{session.events.length - 3}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Country Breakdown */}
          <div className="space-y-6">
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
              <Globe size={20} className="text-brand-600" />
              By Country
            </h2>
            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <div className="space-y-6">
                {sortedCountries.map(([country, count]) => (
                  <div key={country} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-zinc-700">{country}</span>
                      <span className="text-brand-600">{count}</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((count as any) / (sessions.length as any)) * 100}%` }}
                        className="h-full bg-brand-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Chat History */}
        <div className="space-y-6 mb-20">
          <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
            <MessageSquare size={20} className="text-brand-600" />
            Live Chat History
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Object.entries(chatSessions) as [string, ChatMessage[]][]).map(([sid, msgs]) => {
              const session = sessions.find(s => s.id === sid);
              return (
                <div key={sid} className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
                  <div className="p-4 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
                        <User size={16} />
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
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      {msgs.length} Messages
                    </span>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-50/30">
                    {msgs.map((m) => (
                      <div key={m.id} className={`flex ${m.isBot ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm border ${
                          m.isBot 
                            ? 'bg-white text-zinc-700 border-zinc-200/50 rounded-tl-none' 
                            : 'bg-brand-600 text-white border-brand-400/30 rounded-tr-none font-medium'
                        }`}>
                          {m.text}
                          <p className={`text-[8px] mt-1 opacity-60 ${m.isBot ? 'text-zinc-400' : 'text-white'}`}>
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
              <div className="md:col-span-2 bg-white p-12 rounded-3xl border border-zinc-200 border-dashed text-center">
                <MessageSquare size={48} className="text-zinc-200 mx-auto mb-4" />
                <p className="text-zinc-500 font-medium">No chat history found yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* App Inbox (Inbound Emails) */}
        <div className="space-y-6 mb-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
              <Mail size={20} className="text-brand-600" />
              App Inbox (@barnia.in)
            </h2>
            <div className="flex items-center gap-3">
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
        </div>

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
                  <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                    <pre className="text-xs font-mono text-zinc-700 whitespace-pre-wrap break-words leading-relaxed">
                      {selectedEmail.body}
                    </pre>
                  </div>
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
                <div className="p-8 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                  <button 
                    onClick={() => setSelectedEmail(null)}
                    className="px-8 py-3 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl shadow-zinc-900/10"
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
  );
};
