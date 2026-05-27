import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Chrome, Facebook, ArrowRight, AlertCircle, Loader2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from '../FirebaseContext';
import { useLanguage } from '../LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signInWithFacebook, signInWithEmail, signUpWithEmail, sendPasswordReset, sendOTP, verifyOTP } = useFirebase();
  const { language } = useLanguage();
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const emailTrimmed = email.toLowerCase().trim();
      if (mode === 'login') {
        await signInWithEmail(emailTrimmed, password);
        onClose();
      } else if (mode === 'signup') {
        if (password.length < 6) {
          throw new Error(language === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters');
        }
        await signUpWithEmail(emailTrimmed, password, name);
        setSuccess(language === 'bn' 
          ? 'অ্যাকাউন্ট তৈরি হয়েছে! আপনার ইমেইল যাচাই করতে একটি লিঙ্ক পাঠানো হয়েছে।' 
          : 'Account created! A verification link has been sent to your email.');
        // Don't close immediately so they can see the success message
        setTimeout(() => onClose(), 3000);
      } else if (mode === 'forgot') {
        await sendPasswordReset(emailTrimmed);
        setSuccess(language === 'bn' ? 'পাসওয়ার্ড রিসেট লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে' : 'Password reset link sent to your email');
        setTimeout(() => setMode('login'), 3000);
      } else if (mode === 'otp') {
        if (!isOtpSent) {
          const result = await sendOTP(emailTrimmed);
          if (result.success) {
            setIsOtpSent(true);
            setSuccess(language === 'bn' ? 'ওটিপি পাঠানো হয়েছে!' : 'OTP Sent successfully!');
          } else {
            setError(result.error || 'Failed to send OTP');
          }
        } else {
          await verifyOTP(emailTrimmed, otp.trim());
          onClose();
        }
      }
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
        const isEmail = mode === 'login' || mode === 'signup';
        setError(language === 'bn'
          ? (isEmail 
              ? 'ইমেইল/পাসওয়ার্ড লগইন সক্রিয় করা নেই। অনুগ্রহ করে ফায়ারবেস কনসোলে এটি সক্রিয় করুন।' 
              : 'এই লগইন পদ্ধতিটি (Google/Facebook) সক্রিয় করা নেই। অনুগ্রহ করে ফায়ারবেস কনসোলে এটি সক্রিয় করুন।')
          : (isEmail
              ? 'Email/Password sign-in is not enabled. Please enable it in your Firebase Console.'
              : 'This sign-in provider (Google/Facebook) is not enabled. Please enable it in your Firebase Console (Authentication > Sign-in method).'));
      } else if (err.code === 'auth/email-already-in-use') {
        setError(language === 'bn'
          ? 'এই ইমেইলটি ইতিমধ্যে ব্যবহার করা হয়েছে। অনুগ্রহ করে লগইন করুন।'
          : 'This email is already in use. Please sign in instead.');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError(language === 'bn'
          ? 'এই ইমেইলটি ইতিমধ্যে অন্য একটি লগইন পদ্ধতির (যেমন গুগল) সাথে যুক্ত। অনুগ্রহ করে আপনার আগের পদ্ধতিটি ব্যবহার করুন।'
          : 'This email is already linked to another sign-in method (like Google). Please use your original login method.');
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
      } else if (err.code === 'auth/internal-error') {
        setError(language === 'bn'
          ? 'একটি ইন্টারনাল এরর হয়েছে। অনুগ্রহ করে অ্যাপটি নতুন ট্যাবে খুলুন অথবা আপনার ব্রাউজারের কুকিজ এবং ক্যাশ পরিষ্কার করে আবার চেষ্টা করুন।'
          : 'An internal error occurred. Please try opening the app in a new tab or clear your browser cookies and cache and try again.');
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
      } else if (err.code === 'auth/internal-error') {
        setError(language === 'bn'
          ? 'একটি ইন্টারনাল এরর হয়েছে। অনুগ্রহ করে অ্যাপটি নতুন ট্যাবে খুলুন অথবা আপনার ব্রাউজারের কুকিজ এবং ক্যাশ পরিষ্কার করে আবার চেষ্টা করুন।'
          : 'An internal error occurred. Please try opening the app in a new tab or clear your browser cookies and cache and try again.');
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

  useEffect(() => {
    const handleAuthError = (e: any) => {
      const msg = e.detail || 'Authentication failed';
      setError(msg);
      setLoading(false);
    };
    
    const handleAuthWarning = (e: any) => {
      const msg = e.detail;
      setError(msg);
      // We don't set loading to false here because the process might still be finishing
    };

    window.addEventListener('auth-error', handleAuthError);
    window.addEventListener('auth-warning', handleAuthWarning);
    return () => {
      window.removeEventListener('auth-error', handleAuthError);
      window.removeEventListener('auth-warning', handleAuthWarning);
    };
  }, []);

  const handleFacebookSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithFacebook();
      // The modal will stay open until the message listener in FirebaseContext handles the success
      // Or we can close it if we assume the popup will handle the rest
      // For now, let's keep it open to show loading state if needed, 
      // but the message listener will handle the actual user state change.
    } catch (err: any) {
      console.error("Facebook Auth error:", err);
      setError(err.message || 'Facebook sign-in failed');
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
                : mode === 'signup' 
                  ? (language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account')
                  : mode === 'otp'
                    ? (language === 'bn' ? 'ওটিপি লগইন' : 'OTP Login')
                    : (language === 'bn' ? 'পাসওয়ার্ড রিসেট' : 'Reset Password')}
            </h2>
            <p className="text-zinc-500 text-sm mt-3 font-medium">
              {mode === 'login'
                ? (language === 'bn' ? 'আপনার অ্যাকাউন্টে লগইন করুন' : 'Sign in to your account to continue')
                : mode === 'signup'
                  ? (language === 'bn' ? 'বর্নিয়া বাজার কমিউনিটিতে যোগ দিন' : 'Join the Barnia Bazar community today')
                  : mode === 'otp'
                    ? (isOtpSent 
                        ? (language === 'bn' ? 'ওটিপি কোডটি দিন' : 'Enter the code sent to your email')
                        : (language === 'bn' ? 'আপনার ইমেইল দিন ওটিপি-র জন্য' : 'Enter your email to receive an OTP'))
                    : (language === 'bn' ? 'আপনার ইমেইল দিন রিসেট লিঙ্কের জন্য' : 'Enter your email to receive a reset link')}
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
                disabled={isOtpSent && mode === 'otp'}
                className="w-full pl-12 pr-4 py-4 bg-zinc-50/50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium disabled:opacity-50"
              />
            </div>

            {mode === 'otp' && isOtpSent && (
              <div className="space-y-6">
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="0 0 0 0 0 0"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                    maxLength={6}
                    className="w-full pl-12 pr-4 py-6 bg-zinc-50 border-2 border-zinc-200 rounded-3xl focus:outline-none focus:border-brand-500 transition-all text-4xl text-center font-black tracking-[0.2em] text-brand-600 shadow-inner"
                  />
                </div>
                <div className="flex justify-between items-center px-2">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Enter 6-digit code</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpSent(false);
                      setOtp('');
                    }}
                    className="text-[10px] text-brand-600 hover:text-brand-700 font-bold uppercase tracking-wider"
                  >
                    {language === 'bn' ? 'ইমেইল পরিবর্তন করুন' : 'Change Email'}
                  </button>
                </div>
              </div>
            )}

            {mode !== 'forgot' && mode !== 'otp' && (
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
                {mode === 'login' && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[10px] text-brand-600 hover:text-brand-700 font-bold uppercase tracking-wider"
                    >
                      {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
              >
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <div className="flex-1">
                  <span className="text-xs text-red-600 font-medium leading-tight block">{error}</span>
                  {(error.includes('identitytoolkit.googleapis.com') || error.includes('Identity Toolkit API')) && (
                    <a 
                      href="https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-[10px] font-bold text-red-700 underline hover:text-red-800"
                    >
                      Enable API in GCP Console →
                    </a>
                  )}
                  {isIframe && (error.includes('closed') || error.includes('popup') || error.includes('cancelled') || error.includes('cancel')) && (
                    <div className="mt-3 p-3 bg-zinc-900 text-white rounded-xl text-[10px] font-medium leading-normal space-y-1.5 shadow-md">
                      <p className="font-bold text-brand-400">⚡ AI Studio Preview Notice:</p>
                      <p>Sign-in popups can fail inside the embedded preview frame.</p>
                      <p>Please open the app in a new tab to complete login securely:</p>
                      <button 
                        type="button" 
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="inline-flex items-center gap-1.5 mt-1 bg-brand-500 text-white px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider hover:bg-brand-650 active:scale-95 transition-all"
                      >
                        Open in New Tab ↗
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 text-emerald-600 text-xs bg-emerald-50 p-4 rounded-2xl border border-emerald-100"
              >
                <AlertCircle size={16} />
                <span className="font-medium leading-tight">{success}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${mode === 'signup' ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' : 'bg-gradient-to-r from-brand-600 to-brand-500'} text-white py-4 rounded-2xl font-black text-sm hover:shadow-xl ${mode === 'signup' ? 'hover:shadow-emerald-500/30' : 'hover:shadow-brand-500/30'} transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 mt-6`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {mode === 'login' 
                    ? (language === 'bn' ? 'লগইন' : 'Sign In') 
                    : mode === 'signup' 
                      ? (language === 'bn' ? 'সাইন আপ' : 'Sign Up')
                      : mode === 'otp'
                        ? (isOtpSent ? (language === 'bn' ? 'ফিনিশ' : 'Verify & Login') : (language === 'bn' ? 'ওটিপি পাঠান' : 'Send OTP'))
                        : (language === 'bn' ? 'রিসেট লিঙ্ক পাঠান' : 'Send Reset Link')}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {mode !== 'forgot' && (
            <>
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

              <div className="space-y-3">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-zinc-100 rounded-2xl hover:bg-zinc-50 hover:border-brand-500/30 transition-all text-sm font-bold text-zinc-700 active:scale-[0.98] shadow-sm"
                >
                  <div className="bg-white p-1 rounded-lg shadow-sm border border-zinc-100">
                    <Chrome size={18} className="text-brand-600" />
                  </div>
                  {language === 'bn' ? 'গুগল দিয়ে লগইন করুন' : 'Sign in with Google'}
                </button>

                <button
                  onClick={handleFacebookSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-[#1877F2] hover:bg-[#166fe5] rounded-2xl transition-all text-sm font-bold text-white active:scale-[0.98] shadow-lg shadow-[#1877F2]/20"
                >
                  <Facebook size={20} fill="currentColor" />
                  {language === 'bn' ? 'ফেসবুক দিয়ে লগইন করুন' : 'Sign in with Facebook'}
                </button>

                <a
                  href={`https://t.me/${(typeof import.meta.env.VITE_TELEGRAM_BOT_USERNAME === 'string' && import.meta.env.VITE_TELEGRAM_BOT_USERNAME.trim() !== '' && import.meta.env.VITE_TELEGRAM_BOT_USERNAME !== 'undefined') ? import.meta.env.VITE_TELEGRAM_BOT_USERNAME.replace('@', '').trim() : 'Vamshavali_bot'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 py-4 bg-[#0088cc] hover:bg-[#0077b5] rounded-2xl transition-all text-sm font-bold text-white active:scale-[0.98] shadow-lg shadow-[#0088cc]/20"
                >
                  <MessageCircle size={20} />
                  {language === 'bn' ? 'টেলিগ্রাম বটের সাথে কথা বলুন' : 'Chat with Telegram Bot'}
                </a>
                
                <button
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setIsOtpSent(false);
                    setMode(mode === 'otp' ? 'login' : 'otp');
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-zinc-900 hover:bg-black rounded-2xl transition-all text-sm font-bold text-white active:scale-[0.98] shadow-lg shadow-zinc-900/20"
                >
                  <Mail size={20} />
                  {mode === 'otp' 
                    ? (language === 'bn' ? 'পাসওয়ার্ড দিয়ে লগইন করুন' : 'Sign in with Password')
                    : (language === 'bn' ? 'ওটিপি দিয়ে লগইন করুন' : 'Sign in with OTP')}
                </button>

                <p className="text-[10px] text-zinc-400 font-medium text-center px-4">
                  {language === 'bn' 
                    ? 'ফেসবুক লগইন বর্তমানে মেটা (ফেসবুক) দ্বারা রিভিউ করা হচ্ছে। এটি কাজ না করলে অনুগ্রহ করে গুগল বা ইমেইল ব্যবহার করুন।' 
                    : 'Facebook login is currently being reviewed by Meta. Please use Google or Email if it is not working for you yet.'}
                </p>
              </div>
            </>
          )}

          <div className="mt-10 text-center space-y-4">
            <button
              onClick={() => {
                setError('');
                setSuccess('');
                setIsOtpSent(false);
                setOtp('');
                if (mode === 'forgot') {
                  setMode('login');
                } else {
                  setMode(mode === 'login' ? 'signup' : 'login');
                }
              }}
              className="text-sm font-bold text-zinc-500 hover:text-brand-600 transition-colors block w-full"
            >
              {mode === 'login' || mode === 'otp'
                ? (language === 'bn' ? 'অ্যাকাউন্ট নেই? সাইন আপ করুন' : "Don't have an account? Sign up")
                : mode === 'signup'
                  ? (language === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'Already have an account? Sign in')
                  : (language === 'bn' ? 'লগইন পেজে ফিরে যান' : 'Back to Login')}
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
