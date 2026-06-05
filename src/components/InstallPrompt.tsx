import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, Share, PlusSquare } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export const InstallPrompt = () => {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // 1. Detect if running inside the native platform/APK (Capacitor/Cordova) or already installed PWA
    const isNativeApp = typeof window !== 'undefined' && (
      (window as any).Capacitor?.isNative ||
      (window as any)._cordovaNative !== undefined ||
      (window as any).Capacitor?.platform !== undefined ||
      /; wv\)/.test(navigator.userAgent) || // Standard Android WebView indicator under Cordova/Capacitor
      window.matchMedia('(display-mode: standalone)').matches
    );

    if (isNativeApp) {
      setIsInstalled(true);
      return;
    }

    // 2. Identify iOS devices for tailored Safari PWA installation
    const iosCheck = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(iosCheck);

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent standard browser direct install banner prompt
      e.preventDefault();
      // Save event for triggering later
      setDeferredPrompt(e);
      
      const hasSeenPrompt = localStorage.getItem('hasSeenInstallPrompt_v2');
      if (!hasSeenPrompt) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If it is iOS Safari, show the prompt manually since beforeinstallprompt is not supported
    const isSafari = /Safari/i.test(navigator.userAgent) && !/CriOS/i.test(navigator.userAgent) && !/FxiOS/i.test(navigator.userAgent);
    if (iosCheck && isSafari) {
      const hasSeenPrompt = localStorage.getItem('hasSeenInstallPrompt_v2');
      if (!hasSeenPrompt) {
        setTimeout(() => setShowPrompt(true), 4000);
      }
    }

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
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    // Trigger Chrome PWA Prompt
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to PWA prompt: ${outcome}`);

    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem('hasSeenInstallPrompt_v2', 'true');
  };

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem('hasSeenInstallPrompt_v2', 'true');
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
            {/* Decorative background circle */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 opacity-50" />
            
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors z-10"
            >
              <X size={16} />
            </button>

            {!showIOSInstructions ? (
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center shadow-lg shrink-0">
                  <img 
                    src="https://i.postimg.cc/McBQ2pVg/barnia-logo-120x120.png" 
                    alt="Barnia Logo" 
                    className="w-12 h-12 rounded-xl"
                    referrerPolicy="no-referrer"
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
            ) : (
              <div className="relative z-10 animate-fade-in p-1">
                <h3 className="font-black text-zinc-900 leading-tight mb-3">
                  {language === 'bn' ? 'আইফোনে ইনস্টল করার নিয়ম' : 'Install on iPhone / iOS'}
                </h3>
                <ol className="text-xs text-zinc-600 space-y-3 font-semibold">
                  <li className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold">1</span>
                    <span>
                      {language === 'bn' 
                        ? 'নীচের শেয়ার বোতামে ' 
                        : 'Tap the Share button '
                      }
                      <Share size={14} className="inline mx-1 text-blue-500" />
                      {language === 'bn' ? 'ক্লিক করুন।' : 'at the bottom.'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold">2</span>
                    <span>
                      {language === 'bn'
                        ? 'একটু নিচে গিয়ে '
                        : 'Scroll down and select '
                      }
                      <span className="text-zinc-900 font-bold">"Add to Home Screen"</span>
                      <PlusSquare size={14} className="inline mx-1 text-zinc-700" />
                      {language === 'bn' ? 'যোগ করুন।' : 'option.'}
                    </span>
                  </li>
                </ol>
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="mt-4 w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold py-2 px-3 rounded-xl transition-all"
                >
                  {language === 'bn' ? 'ফিরে যান' : 'Go Back'}
                </button>
              </div>
            )}

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
