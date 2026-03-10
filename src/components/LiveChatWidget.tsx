import React, { useState } from 'react';
import { MessageCircle, X, Send, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';

export const LiveChatWidget = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [messages, setMessages] = useState<{ text: string; isBot: boolean }[]>([
    { text: t.data.chat.welcome, isBot: true }
  ]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setMessage('');

    // Check for contact keywords
    const contactKeywords = ['contact', 'email', 'details', 'reach', 'phone', 'address', 'info', 'যোগাযোগ', 'ইমেইল'];
    const needsContact = contactKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));

    try {
      // Send notification to backend
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          data: { sender: 'Website Visitor', message: userMessage }
        })
      });

      if (needsContact) {
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            text: t.data.chat.contactInfo, 
            isBot: true 
          }]);
        }, 1000);
      } else {
        setSent(true);
        setTimeout(() => setSent(false), 3000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
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
            <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
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

            <div className="flex-1 p-4 overflow-y-auto bg-zinc-50 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl text-xs shadow-sm border ${
                    msg.isBot 
                      ? 'bg-white text-zinc-600 border-zinc-100 rounded-tl-none' 
                      : 'bg-emerald-600 text-white border-emerald-500 rounded-tr-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {sent && (
                <div className="text-center py-2">
                  <p className="text-[10px] text-emerald-600 font-bold">{t.data.chat.delivered}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-zinc-100 flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t.collab.placeholder}
                  className="flex-1 text-xs p-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button type="submit" className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors">
                  <Send size={16} />
                </button>
              </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center hover:scale-110 active:scale-95"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
};
