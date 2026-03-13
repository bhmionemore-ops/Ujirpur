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
  const scrollRef = useRef<HTMLDivElement>(null);

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
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'messages'));
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
      handleFirestoreError(err, OperationType.CREATE, 'messages');
    }
  };

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900">{t.collab.title}</h2>
        <p className="text-zinc-500 mt-2">{t.collab.subtitle}</p>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden min-h-[600px] flex flex-col md:flex-row">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-zinc-50 border-r border-zinc-200 p-6 flex flex-row md:flex-col gap-2">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'messages' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            <MessageSquare size={18} />
            {t.collab.messages}
          </button>
          <button
            onClick={() => setActiveTab('planning')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'planning' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            <Calendar size={18} />
            {t.collab.planning}
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'projects' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            <Layout size={18} />
            {t.collab.projects}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'messages' && (
              <motion.div
                key="messages"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-8 border-b border-zinc-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                      <User size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold">{t.collab.chat}</h4>
                      <p className="text-xs text-orange-500 font-medium">{t.data.collab.online}</p>
                    </div>
                  </div>
                </div>
                <div 
                  ref={scrollRef}
                  className="flex-1 space-y-4 mb-6 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar"
                >
                  {!user ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-4">
                      <LogIn size={48} className="opacity-20" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-zinc-900 mb-1">
                          {language === 'bn' ? 'লগইন প্রয়োজন' : 'Login Required'}
                        </p>
                        <p className="text-xs">
                          {language === 'bn' ? 'চ্যাটে অংশ নিতে অনুগ্রহ করে লগইন করুন' : 'Please login to participate in the chat'}
                        </p>
                      </div>
                      <button 
                        onClick={() => setAuthModalOpen(true)}
                        className="bg-orange-600 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-orange-700 transition-all"
                      >
                        {language === 'bn' ? 'লগইন করুন' : 'Login Now'}
                      </button>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2">
                      <MessageSquare size={32} className="opacity-20" />
                      <p className="text-sm">{language === 'bn' ? 'এখনই চ্যাট শুরু করুন!' : 'Start the conversation!'}</p>
                    </div>
                  ) : (
                    messages.map((msg: any, i: number) => {
                      const isMe = user && msg.senderId === user.uid;
                      const isSystem = msg.senderId === 'system';
                      return (
                        <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className="flex flex-col max-w-[80%]">
                            {!isMe && !isSystem && <span className="text-[10px] text-zinc-400 ml-2 mb-1">{msg.senderName}</span>}
                            <div className={`${
                              isMe ? 'bg-orange-600 text-white rounded-tr-none' : 
                              isSystem ? 'bg-zinc-800 text-white rounded-tl-none' : 
                              'bg-zinc-100 text-zinc-800 rounded-tl-none'
                            } p-4 rounded-2xl text-sm shadow-sm`}>
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {user ? (
                  <form onSubmit={handleSendMessage} className="flex gap-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={t.collab.placeholder}
                      className="flex-1 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="bg-orange-600 text-white p-3 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                ) : (
                  <div className="bg-zinc-50 p-6 rounded-2xl text-center border border-zinc-100">
                    <p className="text-zinc-600 mb-4">{language === 'bn' ? 'চ্যাট করতে লগইন করুন' : 'Please login to join the conversation'}</p>
                    <button 
                      onClick={signIn}
                      className="bg-zinc-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 mx-auto"
                    >
                      <LogIn size={18} />
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
              >
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-bold">{t.collab.planning}</h4>
                  <button className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    <Plus size={16} /> {t.collab.planning}
                  </button>
                </div>
                <div className="space-y-4">
                  {t.data.collab.campaigns.map((campaign: any, i: number) => (
                    <div key={i} className="p-6 border border-zinc-100 rounded-2xl flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div>
                        <h5 className="font-bold text-zinc-900">{campaign.title}</h5>
                        <p className="text-sm text-zinc-500">{campaign.date}</p>
                      </div>
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                        {campaign.status}
                      </span>
                    </div>
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
              >
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-bold">{t.collab.projects}</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {t.data.collab.projects.map((project: any, i: number) => (
                    <div key={i} className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <h5 className="font-bold mb-2">{project.title}</h5>
                      <p className="text-xs text-zinc-500 mb-4">Partners: {project.partners.join(', ')}</p>
                      <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full" style={{ width: `${project.progress}%` }}></div>
                      </div>
                      <p className="text-right text-[10px] mt-1 font-bold text-zinc-400">{project.progress}% Complete</p>
                    </div>
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
