import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, CheckCircle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export const InstallPrompt = () => {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the custom prompt after a short delay
      const hasSeenPrompt = localStorage.getItem('hasSeenInstallPrompt');
      if (!hasSeenPrompt) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem('hasSeenInstallPrompt', 'true');
  };

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem('hasSeenInstallPrompt', 'true');
  };

  if (isInstalled) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[60]"
        >
          <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border-4 border-brand-100 relative overflow-hidden">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 opacity-50" />
            
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors z-10"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center shadow-lg shrink-0">
                <img 
                  src="https://i.postimg.cc/McBQ2pVg/barnia-logo-120x120.png" 
                  alt="Barnia Logo" 
                  className="w-12 h-12 rounded-xl"
                />
              </div>
              
              <div className="flex-1">
                <h3 className="font-black text-zinc-900 leading-tight mb-1">
                  {language === 'bn' ? 'বার্নিয়া অ্যাপ পান' : 'Get Barnia App'}
                </h3>
                <p className="text-xs text-zinc-500 font-medium leading-relaxed mb-4">
                  {language === 'bn' 
                    ? 'সহজ অ্যাক্সেসের জন্য আপনার মোবাইলে সেভ করুন।' 
                    : 'Save to your mobile for faster access and updates.'}
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleInstallClick}
                    className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black py-3 px-4 rounded-xl transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                  >
                    <Download size={14} />
                    {language === 'bn' ? 'ইনস্টল করুন' : 'Install Now'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-50 flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              <Smartphone size={12} />
              {language === 'bn' ? 'হোম স্ক্রিনে যোগ করুন' : 'Add to Home Screen'}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
