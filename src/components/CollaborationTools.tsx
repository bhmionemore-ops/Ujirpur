import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Calendar, Layout, Plus, Send, User, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '../FirebaseContext';

export const CollaborationTools = () => {
  const { t, language } = useLanguage();
  const { user, signIn, setAuthModalOpen } = useFirebase();
  const [activeTab, setActiveTab] = useState<'messages' | 'planning' | 'projects'>('messages');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (error) throw error;

  useEffect(() => {
    if (activeTab === 'messages' && user) {
      const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'), limit(50));
      const unsub = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(items);
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      }, (error) => setError(handleFirestoreError(error, OperationType.LIST, 'messages')));
      return () => unsub();
    } else if (activeTab === 'messages' && !user) {
      setMessages([]);
    }
  }, [activeTab, user]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageText = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, 'messages'), {
        text: messageText,
        senderId: user.uid,
        senderName: user.displayName || 'User',
        createdAt: serverTimestamp()
      });

      // Automated reply logic
      const contactKeywords = [
        'contact', 'email', 'details', 'reach', 'phone', 'address', 'info', 'social', 'facebook', 'instagram', 'important', 'help',
        'যোগাযোগ', 'ইমেইল', 'ফোন', 'ঠিকানা', 'সোশ্যাল', 'ফেসবুক', 'ইনস্টাগ্রাম', 'গুরুত্বপূর্ণ', 'সাহায্য'
      ];
      const needsContact = contactKeywords.some(keyword => messageText.toLowerCase().includes(keyword));

      if (needsContact) {
        setTimeout(async () => {
          await addDoc(collection(db, 'messages'), {
            text: t.data.chat.contactInfo,
            senderId: 'system',
            senderName: 'Assistant',
            createdAt: serverTimestamp()
          });
        }, 1500);
      }
    } catch (err) {
      setError(handleFirestoreError(err, OperationType.CREATE, 'messages'));
    }
  };

  return (
    <section className="py-32 px-4 max-w-7xl mx-auto relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-brand-200/20 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[10%] left-[-5%] w-[30%] h-[30%] bg-zinc-200/30 blur-[100px] rounded-full"></div>
      </div>

      <div className="relative z-10 mb-20">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-block px-4 py-1.5 bg-brand-100 text-brand-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-6"
        >
          {language === 'bn' ? 'সহযোগিতা' : 'Collaboration'}
        </motion.span>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-5xl md:text-7xl font-black tracking-tighter text-zinc-900 leading-[0.9]"
        >
          {t.collab.title}
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-zinc-500 mt-6 text-lg font-medium max-w-lg"
        >
          {t.collab.subtitle}
        </motion.p>
      </div>

      <div className="bg-white rounded-[3rem] border border-zinc-100 shadow-2xl overflow-hidden min-h-[700px] flex flex-col md:flex-row relative">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-80 bg-zinc-50/50 backdrop-blur-md border-r border-zinc-100 p-10 flex flex-row md:flex-col gap-4 relative z-20">
          <div className="hidden md:block mb-10">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 px-4">Menu</h3>
          </div>
          {[
            { id: 'messages', icon: MessageSquare, label: t.collab.messages },
            { id: 'planning', icon: Calendar, label: t.collab.planning },
            { id: 'projects', icon: Layout, label: t.collab.projects }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all group ${
                activeTab === tab.id 
                  ? 'bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 scale-[1.02]' 
                  : 'text-zinc-500 hover:bg-white hover:text-zinc-900 hover:shadow-lg hover:shadow-zinc-900/5'
              }`}
            >
              <tab.icon size={20} className={`${activeTab === tab.id ? 'text-brand-500' : 'group-hover:text-brand-500'} transition-colors`} />
              {tab.label}
            </button>
          ))}
          
          <div className="hidden md:block mt-auto p-6 bg-brand-600 rounded-[2rem] text-white shadow-xl shadow-brand-600/20">
            <h4 className="font-black text-sm mb-2 uppercase tracking-widest">Digital Hub</h4>
            <p className="text-[10px] font-medium opacity-80 leading-relaxed">Connect with the community and build together.</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-12 bg-white relative">
          <AnimatePresence mode="wait">
            {activeTab === 'messages' && (
              <motion.div
                key="messages"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-10 border-b border-zinc-50 pb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 shadow-inner">
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-zinc-900 tracking-tight">{t.collab.chat}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">{t.data.collab.online}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div 
                  ref={scrollRef}
                  className="flex-1 space-y-6 mb-8 overflow-y-auto max-h-[450px] pr-4 custom-scrollbar"
                >
                  {!user ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-8 py-20">
                      <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center">
                        <LogIn size={48} className="text-zinc-200" />
                      </div>
                      <div className="text-center max-w-xs">
                        <h5 className="text-xl font-black text-zinc-900 mb-2 tracking-tight">
                          {language === 'bn' ? 'লগইন প্রয়োজন' : 'Login Required'}
                        </h5>
                        <p className="text-sm font-medium text-zinc-500 leading-relaxed">
                          {language === 'bn' ? 'চ্যাটে অংশ নিতে অনুগ্রহ করে লগইন করুন' : 'Please login to participate in the community chat'}
                        </p>
                      </div>
                      <button 
                        onClick={() => setAuthModalOpen(true)}
                        className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-600 hover:scale-105 transition-all shadow-xl shadow-zinc-900/10"
                      >
                        {language === 'bn' ? 'লগইন করুন' : 'Login Now'}
                      </button>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-4 py-20">
                      <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center">
                        <MessageSquare size={32} className="text-zinc-200" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest">{language === 'bn' ? 'এখনই চ্যাট শুরু করুন!' : 'Start the conversation!'}</p>
                    </div>
                  ) : (
                    messages.map((msg: any, i: number) => {
                      const isMe = user && msg.senderId === user.uid;
                      const isSystem = msg.senderId === 'system';
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          key={msg.id || `msg-${i}`} 
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                            {!isMe && !isSystem && (
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4 mb-2">
                                {msg.senderName}
                              </span>
                            )}
                            <div className={`${
                              isMe ? 'bg-zinc-900 text-white rounded-3xl rounded-tr-none shadow-xl shadow-zinc-900/10' : 
                              isSystem ? 'bg-brand-600 text-white rounded-3xl rounded-tl-none shadow-xl shadow-brand-600/10' : 
                              'bg-zinc-50 text-zinc-800 rounded-3xl rounded-tl-none border border-zinc-100'
                            } p-5 text-sm font-medium leading-relaxed`}>
                              {msg.text}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
                
                {user ? (
                  <form onSubmit={handleSendMessage} className="flex gap-4 p-2 bg-zinc-50 rounded-[2rem] border border-zinc-100">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={t.collab.placeholder}
                      className="flex-1 bg-transparent px-6 py-4 rounded-2xl outline-none font-bold text-zinc-900 placeholder:text-zinc-400"
                    />
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="bg-brand-600 text-white p-4 rounded-2xl hover:bg-brand-700 hover:scale-105 transition-all disabled:opacity-50 shadow-lg shadow-brand-600/20"
                    >
                      <Send size={24} />
                    </button>
                  </form>
                ) : (
                  <div className="bg-zinc-50 p-10 rounded-[2.5rem] text-center border border-zinc-100">
                    <p className="text-zinc-500 font-medium mb-6 leading-relaxed">
                      {language === 'bn' ? 'চ্যাট করতে লগইন করুন' : 'Please login to join the conversation and connect with others'}
                    </p>
                    <button 
                      onClick={signIn}
                      className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-600 hover:scale-105 transition-all flex items-center gap-3 mx-auto shadow-xl shadow-zinc-900/10"
                    >
                      <LogIn size={20} />
                      {language === 'bn' ? 'লগইন করুন' : 'Login'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'planning' && (
              <motion.div
                key="planning"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <div className="flex items-center justify-between mb-12 border-b border-zinc-50 pb-8">
                  <div>
                    <h4 className="text-3xl font-black text-zinc-900 tracking-tight">{t.collab.planning}</h4>
                    <p className="text-zinc-400 text-sm font-medium mt-1">Upcoming community events and campaigns</p>
                  </div>
                  <button className="flex items-center gap-3 bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-600 hover:scale-105 transition-all shadow-xl shadow-zinc-900/10">
                    <Plus size={20} /> {t.collab.planning}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  {t.data.collab.campaigns.map((campaign: any, i: number) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={`camp-${i}`} 
                      className="p-8 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 flex items-center justify-between hover:bg-white hover:shadow-2xl hover:shadow-brand-500/5 transition-all group"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-zinc-400 group-hover:text-brand-600 transition-colors shadow-sm">
                          <Calendar size={28} />
                        </div>
                        <div>
                          <h5 className="text-xl font-black text-zinc-900 mb-1 group-hover:text-brand-600 transition-colors">{campaign.title}</h5>
                          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">{campaign.date}</p>
                        </div>
                      </div>
                      <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                        campaign.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-100 text-brand-600'
                      }`}>
                        {campaign.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'projects' && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <div className="flex items-center justify-between mb-12 border-b border-zinc-50 pb-8">
                  <div>
                    <h4 className="text-3xl font-black text-zinc-900 tracking-tight">{t.collab.projects}</h4>
                    <p className="text-zinc-400 text-sm font-medium mt-1">Ongoing community development initiatives</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {t.data.collab.projects.map((project: any, i: number) => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      key={`proj-${i}`} 
                      className="p-10 bg-zinc-50 rounded-[3rem] border border-zinc-100 hover:bg-white hover:shadow-2xl hover:shadow-brand-500/5 transition-all group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-zinc-400 group-hover:text-brand-600 transition-colors shadow-sm mb-8">
                        <Layout size={24} />
                      </div>
                      <h5 className="text-2xl font-black text-zinc-900 mb-3 group-hover:text-brand-600 transition-colors tracking-tight">{project.title}</h5>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-8 leading-relaxed">
                        Partners: <span className="text-zinc-600">{project.partners.join(', ')}</span>
                      </p>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Progress</span>
                          <span className="text-lg font-black text-brand-600">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-zinc-200 h-3 rounded-full overflow-hidden p-0.5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${project.progress}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="bg-brand-600 h-full rounded-full shadow-lg shadow-brand-600/20"
                          ></motion.div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
