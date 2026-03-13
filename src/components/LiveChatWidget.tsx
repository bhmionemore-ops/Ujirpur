import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { generateChatReply } from '../services/gemini';

// Simple session ID for visitors
const SESSION_ID = localStorage.getItem('chat_session_id') || Math.random().toString(36).substring(7);
localStorage.setItem('chat_session_id', SESSION_ID);

export const LiveChatWidget = () => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<{ text: string; isBot: boolean; id?: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const q = query(
        collection(db, 'support_messages'), 
        where('sessionId', '==', SESSION_ID),
        orderBy('createdAt', 'asc'), 
        limit(50)
      );
      
      const unsub = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        
        if (items.length === 0) {
          setMessages([{ text: t.data.chat.welcome, isBot: true }]);
        } else {
          setMessages(items);
        }

        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'support_messages'));
      
      return () => unsub();
    }
  }, [isOpen, t.data.chat.welcome]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');

    try {
      await addDoc(collection(db, 'support_messages'), {
        text: userMessage,
        sessionId: SESSION_ID,
        isBot: false,
        createdAt: serverTimestamp()
      });

      setIsTyping(true);
      
      // Get reply from Gemini
      const history = messages.map(m => ({ text: m.text, isBot: m.isBot }));
      const reply = await generateChatReply(userMessage, history, language);

      await addDoc(collection(db, 'support_messages'), {
        text: reply,
        sessionId: SESSION_ID,
        isBot: true,
        createdAt: serverTimestamp()
      });
      
      setIsTyping(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'support_messages');
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="bg-white w-80 h-96 rounded-2xl shadow-2xl border border-zinc-200 flex flex-col mb-4 overflow-hidden"
          >
            <div className="bg-orange-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <User size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold">{t.data.chat.support}</h4>
                  <p className="text-[10px] opacity-80">{t.data.chat.assistant}</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 p-4 overflow-y-auto bg-zinc-50 space-y-4 custom-scrollbar"
            >
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl text-xs shadow-sm border ${
                    msg.isBot 
                      ? 'bg-white text-zinc-600 border-zinc-100 rounded-tl-none' 
                      : 'bg-orange-600 text-white border-orange-500 rounded-tr-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white text-zinc-400 p-3 rounded-xl rounded-tl-none text-[10px] shadow-sm border border-zinc-100 flex gap-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce [animation-delay:0.2s]">.</span>
                    <span className="animate-bounce [animation-delay:0.4s]">.</span>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-zinc-100 flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t.collab.placeholder}
                  className="flex-1 text-xs p-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <button type="submit" className="bg-orange-600 text-white p-2 rounded-lg hover:bg-orange-700 transition-colors">
                  <Send size={16} />
                </button>
              </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-orange-600 text-white rounded-full shadow-lg hover:bg-orange-700 transition-all flex items-center justify-center hover:scale-110 active:scale-95"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
};
