import React, { useState } from 'react';
import { X, Mail, Lock, User, Chrome, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from '../FirebaseContext';
import { useLanguage } from '../LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signInWithEmail, signUpWithEmail } = useFirebase();
  const { language } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        if (password.length < 6) {
          throw new Error(language === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters');
        }
        await signUpWithEmail(email, password, name);
      }
      onClose();
    } catch (err: any) {
      console.error("Auth error:", err);
      const errorCode = err.code || 'unknown';
      const errorMessage = err.message || 'Authentication failed';
      
      if (err.code === 'auth/unauthorized-domain') {
        const hostname = window.location.hostname;
        setError(language === 'bn' 
          ? `এই ডোমেইনটি (${hostname}) অনুমোদিত নয়। অনুগ্রহ করে এটি আপনার ফায়ারবেস কনসোলে (Authentication > Settings > Authorized Domains) যোগ করুন।` 
          : `This domain (${hostname}) is not authorized. Please add it to your Firebase Console (Authentication > Settings > Authorized Domains).`);
      } else if (err.code === 'auth/popup-blocked') {
        setError(language === 'bn'
          ? 'পপআপ ব্লক করা হয়েছে। অনুগ্রহ করে আপনার ব্রাউজারে পপআপ অনুমতি দিন বা নতুন ট্যাবে অ্যাপটি খুলুন।'
          : 'Popup blocked. Please allow popups for this site or open the app in a new tab.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError(language === 'bn'
          ? 'ইমেইল/পাসওয়ার্ড লগইন সক্রিয় করা নেই। অনুগ্রহ করে ফায়ারবেস কনসোলে (Authentication > Sign-in method) এটি সক্রিয় করুন।'
          : 'Email/Password sign-in is not enabled. Please enable it in your Firebase Console (Authentication > Sign-in method).');
      } else if (err.code === 'auth/email-already-in-use') {
        setError(language === 'bn'
          ? 'এই ইমেইলটি ইতিমধ্যে ব্যবহার করা হয়েছে। অনুগ্রহ করে লগইন করুন।'
          : 'This email is already in use. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError(language === 'bn'
          ? 'পাসওয়ার্ডটি খুব দুর্বল। কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড ব্যবহার করুন।'
          : 'The password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(language === 'bn'
          ? 'ভুল ইমেইল বা পাসওয়ার্ড।'
          : 'Invalid email or password.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError(language === 'bn'
          ? 'লগইন উইন্ডোটি বন্ধ করা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন এবং উইন্ডোটি খোলা রাখুন।'
          : 'The sign-in window was closed before completion. Please try again and keep the window open.');
      } else if (err.code === 'auth/network-request-failed') {
        setError(language === 'bn'
          ? 'নেটওয়ার্ক সমস্যা। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।'
          : 'Network error. Please check your internet connection.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError(language === 'bn'
          ? 'লগইন উইন্ডোটি বন্ধ করা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন এবং উইন্ডোটি খোলা রাখুন।'
          : 'The sign-in window was closed before completion. Please try again and keep the window open.');
      } else if (errorMessage.includes('missing initial state')) {
        setError(language === 'bn'
          ? 'লগইন সেশন পাওয়া যাচ্ছে না। অনুগ্রহ করে অ্যাপটি নতুন ট্যাবে খুলুন অথবা ইনকগনিটো মোড বন্ধ করুন।'
          : 'Login session lost. Please open the app in a new tab or disable Incognito/Private mode.');
      } else {
        setError(`${errorMessage} (${errorCode})`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signIn();
      onClose();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      const errorCode = err.code || 'unknown';
      const errorMessage = err.message || 'Google sign-in failed';

      if (err.code === 'auth/unauthorized-domain') {
        const hostname = window.location.hostname;
        setError(language === 'bn' 
          ? `এই ডোমেইনটি (${hostname}) অনুমোদিত নয়। অনুগ্রহ করে এটি আপনার ফায়ারবেস কনসোলে (Authentication > Settings > Authorized Domains) যোগ করুন।` 
          : `This domain (${hostname}) is not authorized. Please add it to your Firebase Console (Authentication > Settings > Authorized Domains).`);
      } else if (err.code === 'auth/popup-blocked') {
        setError(language === 'bn'
          ? 'পপআপ ব্লক করা হয়েছে। অনুগ্রহ করে আপনার ব্রাউজারে পপআপ অনুমতি দিন বা নতুন ট্যাবে অ্যাপটি খুলুন।'
          : 'Popup blocked. Please allow popups for this site or open the app in a new tab.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError(language === 'bn'
          ? 'গুগল লগইন সক্রিয় করা নেই। অনুগ্রহ করে ফায়ারবেস কনসোলে (Authentication > Sign-in method) এটি সক্রিয় করুন।'
          : 'Google sign-in is not enabled. Please enable it in your Firebase Console (Authentication > Sign-in method).');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError(language === 'bn'
          ? 'লগইন উইন্ডোটি বন্ধ করা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন এবং উইন্ডোটি খোলা রাখুন।'
          : 'The sign-in window was closed before completion. Please try again and keep the window open.');
      } else if (errorMessage.includes('missing initial state')) {
        setError(language === 'bn'
          ? 'লগইন সেশন পাওয়া যাচ্ছে না। অনুগ্রহ করে অ্যাপটি নতুন ট্যাবে খুলুন অথবা ইনকগনিটো মোড বন্ধ করুন।'
          : 'Login session lost. Please open the app in a new tab or disable Incognito/Private mode.');
      } else {
        setError(`${errorMessage} (${errorCode})`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30, filter: 'blur(10px)' }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 0.9, y: 30, filter: 'blur(10px)' }}
        className="bg-white/90 backdrop-blur-2xl w-full max-w-md rounded-[40px] shadow-[0_30px_100px_rgba(0,0,0,0.2)] relative border-4 border-brand-500 overflow-y-auto max-h-[90vh] custom-scrollbar"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2.5 bg-zinc-100 hover:bg-zinc-200 rounded-2xl transition-all active:scale-90 z-20 shadow-sm"
        >
          <X size={20} className="text-zinc-600" />
        </button>

        <div className="p-10 pt-16">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-600 to-brand-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-500/20 border border-white/20">
              <span className="text-white font-black text-2xl tracking-tighter">UB</span>
            </div>
            <h2 className="text-3xl font-black text-zinc-900 tracking-tight">
              {mode === 'login' 
                ? (language === 'bn' ? 'স্বাগতম' : 'Welcome Back') 
                : (language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account')}
            </h2>
            <p className="text-zinc-500 text-sm mt-3 font-medium">
              {mode === 'login'
                ? (language === 'bn' ? 'আপনার অ্যাকাউন্টে লগইন করুন' : 'Sign in to your account to continue')
                : (language === 'bn' ? 'বর্নিয়া বাজার কমিউনিটিতে যোগ দিন' : 'Join the Barnia Bazar community today')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'আপনার নাম' : 'Full Name'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-zinc-50/50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium"
                />
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-500 transition-colors" size={18} />
              <input
                type="email"
                placeholder={language === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-zinc-50/50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-500 transition-colors" size={18} />
              <input
                type="password"
                placeholder={language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-zinc-50/50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium"
              />
              {mode === 'signup' && (
                <p className="text-[10px] text-zinc-400 mt-2 ml-2 font-medium">
                  {language === 'bn' ? 'এই সাইটের জন্য একটি নতুন পাসওয়ার্ড তৈরি করুন' : 'Create a new password for this site'}
                </p>
              )}
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 text-red-500 text-xs bg-red-50 p-4 rounded-2xl border border-red-100"
              >
                <AlertCircle size={16} />
                <span className="font-medium leading-tight">{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white py-4 rounded-2xl font-black text-sm hover:shadow-xl hover:shadow-brand-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 mt-6"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {mode === 'login' ? (language === 'bn' ? 'লগইন' : 'Sign In') : (language === 'bn' ? 'সাইন আপ' : 'Sign Up')}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-black">
              <span className="bg-white/0 backdrop-blur-xl px-4 text-zinc-400">
                {language === 'bn' ? 'অথবা' : 'Or continue with'}
              </span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 border border-zinc-200 rounded-2xl hover:bg-zinc-50 hover:border-zinc-300 transition-all text-sm font-bold text-zinc-700 active:scale-[0.98]"
          >
            <Chrome size={20} className="text-brand-600" />
            {language === 'bn' ? 'গুগল দিয়ে লগইন করুন' : 'Sign in with Google'}
          </button>

          <div className="mt-10 text-center space-y-4">
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm font-bold text-zinc-500 hover:text-brand-600 transition-colors block w-full"
            >
              {mode === 'login'
                ? (language === 'bn' ? 'অ্যাকাউন্ট নেই? সাইন আপ করুন' : "Don't have an account? Sign up")
                : (language === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'Already have an account? Sign in')}
            </button>
            
            <p className="text-[10px] text-zinc-400 font-medium italic">
              {language === 'bn' 
                ? 'লগইন করতে সমস্যা হচ্ছে? অ্যাপটি নতুন ট্যাবে খোলার চেষ্টা করুন।' 
                : 'Having trouble logging in? Try opening the app in a new tab.'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
