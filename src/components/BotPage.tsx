import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Loader2, ChevronLeft, Sparkles, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const BotPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'System Initialized. I am Nexus, your autonomous sales intelligence. How may I assist you with our hardware catalog today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Prepare history for context
      const history = messages.map(m => ({
        role: m.role,
        content: m.content
      })).slice(-10); // Last 10 messages for context

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: currentInput,
          history: history 
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'System Error: Unable to process request.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Connection interrupted. Please verify your network and retry initialization.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex flex-col font-sans text-zinc-300">
      {/* Header */}
      <header className="bg-zinc-950 border-b border-indigo-500/20 px-4 py-4 sticky top-0 z-10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-indigo-400 border border-indigo-500/10"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-indigo-400/30">
                <Bot size={26} className="animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight leading-tight uppercase font-mono">Nexus <span className="text-indigo-500">v2.0</span></h1>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                  <span className="text-[10px] font-black text-indigo-400/80 uppercase tracking-[0.2em]">Online • Intelligent Mode</span>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <Sparkles size={14} className="text-indigo-400" />
            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Neural Link Active</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed">
        <div className="max-w-3xl mx-auto space-y-8">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-4 max-w-[90%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg transition-transform hover:scale-110 ${
                    message.role === 'user' 
                      ? 'bg-zinc-800 text-indigo-400 border border-zinc-700' 
                      : 'bg-indigo-950 border border-indigo-500/30 text-indigo-400'
                  }`}>
                    {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                  </div>
                  <div className={`relative px-5 py-4 rounded-3xl shadow-xl text-sm leading-relaxed backdrop-blur-sm ${
                    message.role === 'user' 
                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-tr-none border border-indigo-400/20 shadow-indigo-500/10' 
                      : 'bg-zinc-900/80 border border-indigo-500/10 text-zinc-200 rounded-tl-none shadow-black/50'
                  }`}>
                    <div className="markdown-body prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                    <span className={`text-[10px] mt-3 block opacity-40 font-black uppercase tracking-tighter ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {message.role === 'user' ? 'USER_ID_SECURE' : 'SYSTEM_GEN_001'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-start"
            >
              <div className="flex gap-4 items-center bg-zinc-900/90 px-5 py-3 rounded-2xl border border-indigo-500/20 shadow-2xl">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                </div>
                <span className="text-[10px] font-black text-indigo-400/80 uppercase tracking-widest">Processing Data...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-zinc-950 border-t border-indigo-500/20 p-4 md:p-8 sticky bottom-0 z-10 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-x-0 -bottom-1 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Inject command or query catalog..."
              disabled={isLoading}
              className="w-full bg-zinc-900 border-2 border-indigo-500/10 text-white rounded-3xl pl-14 pr-16 py-5 focus:outline-none focus:border-indigo-500/40 focus:bg-zinc-900 transition-all font-mono text-sm disabled:opacity-50 shadow-inner"
            />
            <MessageSquare className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500/50 group-focus-within:text-indigo-400 transition-colors" size={22} />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl flex items-center justify-center hover:from-indigo-500 hover:to-indigo-700 disabled:from-zinc-800 disabled:to-zinc-900 disabled:text-zinc-600 transition-all active:scale-95 shadow-lg shadow-indigo-500/20 group/btn"
            >
              {isLoading ? (
                <Loader2 size={24} className="animate-spin text-indigo-300" />
              ) : (
                <Send size={24} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
              )}
            </button>
          </form>
          <div className="flex justify-center mt-4">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Hardware Intelligence Matrix • v2.0.42</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
