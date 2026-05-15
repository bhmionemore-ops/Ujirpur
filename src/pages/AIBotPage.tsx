import React from 'react';
import { motion } from 'motion/react';
import { Bot, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AIBotPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-50 pt-10 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-xl bg-white shadow-sm border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-brand-600 hover:border-brand-200 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                <Bot size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight leading-none">Barnali AI</h1>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Smart Assistant</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 border border-zinc-100 overflow-hidden"
        >
          <iframe 
            src="https://ais-pre-en23aqmhkphchfq6zcqora-72308382255.europe-west2.run.app/bot" 
            style={{ width: '100%', height: '800px', border: 'none' }}
            title="Barnali AI Bot"
            allow="clipboard-write"
          />
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-8"
        >
          Powered by Barnia Digital Hub AI Engine
        </motion.p>
      </div>
    </div>
  );
};
