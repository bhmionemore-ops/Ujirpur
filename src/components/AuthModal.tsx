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
          ? 'এই লগইন পদ্ধতিটি সক্রিয় করা নেই। অনুগ্রহ করে ফায়ারবেস কনসোলে (Authentication > Sign-in method) এটি সক্রিয় করুন।'
          : 'This sign-in method is not enabled. Please enable it in your Firebase Console (Authentication > Sign-in method).');
      } else if (err.code === 'auth/network-request-failed') {
        setError(language === 'bn'
          ? 'নেটওয়ার্ক সমস্যা। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।'
          : 'Network error. Please check your internet connection.');
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full transition-colors z-10"
        >
          <X size={20} className="text-zinc-400" />
        </button>

        <div className="p-8 pt-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-zinc-900">
              {mode === 'login' 
                ? (language === 'bn' ? 'স্বাগতম' : 'Welcome Back') 
                : (language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account')}
            </h2>
            <p className="text-zinc-500 text-sm mt-2">
              {mode === 'login'
                ? (language === 'bn' ? 'আপনার অ্যাকাউন্টে লগইন করুন' : 'Sign in to your account to continue')
                : (language === 'bn' ? 'বর্নিয়া বাজার কমিউনিটিতে যোগ দিন' : 'Join the Barnia Bazar community today')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'আপনার নাম' : 'Full Name'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="email"
                placeholder={language === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="password"
                placeholder={language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-xs bg-red-50 p-3 rounded-xl">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  {mode === 'login' ? (language === 'bn' ? 'লগইন' : 'Sign In') : (language === 'bn' ? 'সাইন আপ' : 'Sign Up')}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-zinc-400 font-medium">
                {language === 'bn' ? 'অথবা' : 'Or continue with'}
              </span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 border border-zinc-200 rounded-2xl hover:bg-zinc-50 transition-all text-sm font-medium text-zinc-700"
          >
            <Chrome size={18} className="text-orange-600" />
            {language === 'bn' ? 'গুগল দিয়ে লগইন করুন' : 'Sign in with Google'}
          </button>

          <div className="mt-8 text-center space-y-4">
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-zinc-500 hover:text-orange-600 transition-colors block w-full"
            >
              {mode === 'login'
                ? (language === 'bn' ? 'অ্যাকাউন্ট নেই? সাইন আপ করুন' : "Don't have an account? Sign up")
                : (language === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'Already have an account? Sign in')}
            </button>
            
            <p className="text-[10px] text-zinc-400 italic">
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
