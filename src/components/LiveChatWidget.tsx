import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User, Mic } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(language === 'bn' ? 'আপনার ব্রাউজার ভয়েস সমর্থন করে না' : 'Speech recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      
      if ((language as string) === 'bn') {
        rec.lang = 'bn-IN';
      } else if ((language as string) === 'hi' || (language as string) === 'hin') {
        rec.lang = 'hi-IN';
      } else {
        rec.lang = 'en-US';
      }

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setMessage((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${finalTranscript.trim()}` : finalTranscript.trim();
          });
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      const q = query(
        collection(db, 'support_messages'), 
        where('sessionId', '==', SESSION_ID),
        limit(50)
      );
      
      const unsub = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        
        // Sort client-side to avoid composite index requirement
        items.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeA - timeB;
        });

        if (items.length === 0) {
          setMessages([{ text: t.chat.welcome, isBot: true }]);
        } else {
          setMessages(items);
        }

        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      }, (err) => {
        console.error("Chat Error:", err);
        setError(language === 'bn' ? 'চ্যাট লোড করতে সমস্যা হচ্ছে' : 'Error loading chat');
      });
      
      return () => unsub();
    }
  }, [isOpen, t.chat.welcome, language]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');
    setError(null);

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
      const reply = await generateChatReply(userMessage, history, (language === 'bn' || language === 'en') ? language : 'en');

      await addDoc(collection(db, 'support_messages'), {
        text: reply,
        sessionId: SESSION_ID,
        isBot: true,
        createdAt: serverTimestamp()
      });
      
      setIsTyping(false);
    } catch (err) {
      console.error("Send Error:", err);
      setError(language === 'bn' ? 'বার্তা পাঠাতে সমস্যা হচ্ছে' : 'Error sending message');
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.8, y: 20, filter: 'blur(10px)' }}
            className="bg-white/80 backdrop-blur-xl w-85 h-[500px] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 flex flex-col mb-6 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-500 p-5 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                    <User size={20} className="text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-brand-500 rounded-full shadow-sm animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-tight">{t.chat.support}</h4>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    <p className="text-[10px] font-medium opacity-90 uppercase tracking-wider">{t.chat.assistant}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="hover:bg-white/20 p-2 rounded-xl transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 p-5 overflow-y-auto bg-zinc-50/50 space-y-4 custom-scrollbar"
            >
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium border border-red-100 mb-4">
                  {error}
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  key={msg.id || `chat-msg-${i}`} 
                  className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm border ${
                    msg.isBot 
                      ? 'bg-white text-zinc-700 border-zinc-200/50 rounded-tl-none' 
                      : 'bg-gradient-to-br from-brand-600 to-brand-500 text-white border-brand-400/30 rounded-tr-none font-medium'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white text-brand-500 p-3.5 rounded-2xl rounded-tl-none shadow-sm border border-zinc-200/50 flex gap-1.5 items-center">
                    <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-brand-400 rounded-full" />
                    <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-brand-400 rounded-full" />
                    <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-brand-400 rounded-full" />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-zinc-100 flex gap-2 items-center">
              <div className="flex-1 relative flex items-center bg-zinc-50 border border-zinc-200 rounded-2xl focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10 transition-all overflow-hidden">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={isListening ? (language === 'bn' ? 'শুনছি... বলুন' : 'Listening... Speak') : t.collab.placeholder}
                  className="w-full text-sm py-3 pl-4 pr-10 outline-none bg-transparent"
                  disabled={isListening}
                />
                
                {/* Microphone button inside input field */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`absolute right-2.5 p-1.5 rounded-xl transition-all cursor-pointer ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)]' 
                      : 'text-zinc-400 hover:text-brand-500 hover:bg-zinc-100'
                  }`}
                  title={isListening ? "Stop listening" : "Record Voice / Transcribe"}
                >
                  <Mic size={18} />
                </button>
              </div>
              
              <button 
                type="submit" 
                disabled={!message.trim() || isListening}
                className="bg-gradient-to-br from-brand-600 to-brand-500 text-white p-3 rounded-2xl hover:shadow-lg hover:shadow-brand-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex-shrink-0"
              >
                <Send size={20} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-gradient-to-br from-brand-600 to-brand-500 text-white rounded-[24px] shadow-[0_10px_30px_rgba(245,142,39,0.4)] flex items-center justify-center transition-all relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X size={28} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <MessageCircle size={28} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};
