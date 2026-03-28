import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { Users, Globe, Clock, Activity, MapPin, Calendar, ArrowLeft, ExternalLink, MessageSquare, User } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useFirebase } from '../FirebaseContext';

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

export const AdminAnalytics = () => {
  const { isAdmin } = useFirebase();
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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

    return () => {
      unsubSessions();
      unsubChats();
    };
  }, [isAdmin]);

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
    return Date.now() - s.lastSeen.toMillis() < 60000;
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
    chatSessions[sid].sort((a, b) => a.createdAt?.toMillis() - b.createdAt?.toMillis());
  });

  return (
    <div className="min-h-screen bg-zinc-50 pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-2 uppercase">Visitor Analytics</h1>
            <p className="text-zinc-500 font-medium">Real-time monitoring of website traffic and user behavior.</p>
          </div>
          <div className="flex items-center gap-4">
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
                            {session.events.slice(-3).map((e, i) => (
                              <span key={i} className="px-2 py-0.5 bg-zinc-100 text-[9px] font-black text-zinc-500 rounded-full uppercase tracking-wider">
                                {e}
                              </span>
                            ))}
                            {session.events.length > 3 && (
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
        <div className="space-y-6">
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
                            {m.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      </div>
    </div>
  );
};
