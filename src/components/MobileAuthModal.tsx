import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Lock, User, Chrome, Facebook, ArrowRight, AlertCircle, Loader2, MessageCircle,
  ChevronLeft, ChevronRight, BookOpen, Sparkles, Code, Laptop, CheckCircle2, Award, Zap
} from 'lucide-react';
import { useFirebase } from '../FirebaseContext';
import { useLanguage } from '../LanguageContext';

interface MobileAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAuthModal: React.FC<MobileAuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signInWithFacebook, signInWithEmail, signUpWithEmail, sendPasswordReset, sendOTP, verifyOTP } = useFirebase();
  const { language, setLanguage } = useLanguage();
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  
  // Mobile Pagination State
  const [mobilePage, setMobilePage] = useState(0);

  // Auth Form State
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [debugOtp, setDebugOtp] = useState('');
  const [showRedirectHelp, setShowRedirectHelp] = useState(false);

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');

  // Reset form states on open
  useEffect(() => {
    if (isOpen) {
      setMobilePage(0);
      setMode('login');
      setEmail('');
      setPassword('');
      setOtp('');
      setName('');
      setError('');
      setSuccess('');
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      setContactSuccess(false);
      setShowRedirectHelp(false);
    }
  }, [isOpen]);

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
        setTimeout(() => onClose(), 3000);
      } else if (mode === 'forgot') {
        await sendPasswordReset(emailTrimmed);
        setSuccess(language === 'bn' ? 'পাসওয়ার্ড রিসেট লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে' : 'Password reset link sent to your email');
        setTimeout(() => setMode('login'), 3000);
      } else if (mode === 'otp') {
        if (!isOtpSent) {
          const result = await sendOTP(emailTrimmed) as any;
          if (result.success) {
            setIsOtpSent(true);
            if (result.debugOtp) {
              setDebugOtp(result.debugOtp);
            }
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
          ? `এই ডোমেইনটি (${hostname}) অনুমোদিত নয়। অনুগ্রহ করে এটি আপনার ফায়ারবেস কনসোলে যোগ করুন।` 
          : `This domain (${hostname}) is not authorized. Please add it to your Firebase Console.`);
      } else if (err.code === 'auth/popup-blocked') {
        setError(language === 'bn'
          ? 'পপআপ ব্লক করা হয়েছে। অনুগ্রহ করে ব্রাউজারে পপআপ অনুমতি দিন।'
          : 'Popup blocked. Please allow popups for this site.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError(language === 'bn'
          ? 'ইমেইল/পাসওয়ার্ড লগইন সক্রিয় করা নেই।'
          : 'Email/Password sign-in is not enabled.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError(language === 'bn'
          ? 'এই ইমেইলটি ইতিমধ্যে ব্যবহার করা হয়েছে।'
          : 'This email is already in use.');
      } else if (err.code === 'auth/weak-password') {
        setError(language === 'bn'
          ? 'পাসওয়ার্ডটি খুব দুর্বল।'
          : 'The password is too weak.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(language === 'bn'
          ? 'ভুল ইমেইল বা পাসওয়ার্ড।'
          : 'Invalid email or password.');
      } else if (err.code === 'auth/network-request-failed') {
        setError(language === 'bn'
          ? 'নেটওয়ার্ক সমস্যা। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।'
          : 'Network error. Please check your internet connection.');
      } else {
        setError(`${errorMessage} (${errorCode})`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setShowRedirectHelp(false);
    setLoading(true);
    try {
      await signIn();
      onClose();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      const errCode = err.code || '';
      const errMsg = err.message || '';
      const isPopupClosed = errCode === 'auth/popup-closed-by-user' || errMsg.includes('popup-closed-by-user');
      const isPopupBlocked = errCode === 'auth/popup-blocked' || errMsg.includes('popup-blocked');
      const isIframeOrPopupIssue = isIframe || isPopupClosed || isPopupBlocked;

      if (isPopupClosed) {
        setError(language === 'bn' 
          ? 'লগইন উইন্ডোটি বন্ধ করা হয়েছে। আপনি যদি আইফ্রেম ব্যবহার করেন, তবে অনুগ্রহ করে এটি নতুন ট্যাবে ওপেন করে আবার চেষ্টা করুন।' 
          : 'The sign-in popup was closed before completion. If you are using an iframe, please open the application in a new tab and try again.');
        setShowRedirectHelp(isIframeOrPopupIssue);
      } else if (isPopupBlocked) {
        setError(language === 'bn'
          ? 'পপআপটি ব্লক করা হয়েছে। অনুগ্রহ করে আপনার ব্রাউজারে পপআপ অনুমতি দিন বা নতুন ট্যাবে অ্যাপটি খুলুন।'
          : 'The sign-in popup was blocked by your browser. Please enable popups or open the app in a new tab.');
        setShowRedirectHelp(isIframeOrPopupIssue);
      } else {
        setError(err.message || 'Google sign-in failed');
        if (isIframeOrPopupIssue) {
          setShowRedirectHelp(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setError('');
    setShowRedirectHelp(false);
    setLoading(true);
    try {
      await signInWithFacebook();
    } catch (err: any) {
      console.error("Facebook Auth error:", err);
      const errCode = err.code || '';
      const errMsg = err.message || '';
      const isPopupClosed = errCode === 'auth/popup-closed-by-user' || errMsg.includes('popup-closed-by-user');
      const isPopupBlocked = errCode === 'auth/popup-blocked' || errMsg.includes('popup-blocked');
      const isIframeOrPopupIssue = isIframe || isPopupClosed || isPopupBlocked;

      if (isPopupClosed) {
        setError(language === 'bn' 
          ? 'লগইন উইন্ডোটি বন্ধ করা হয়েছে। আপনি যদি আইফ্রেম ব্যবহার করেন, তবে অনুগ্রহ করে এটি নতুন ট্যাবে ওপেন করে আবার চেষ্টা করুন।' 
          : 'The sign-in popup was closed before completion. If you are using an iframe, please open the application in a new tab and try again.');
        setShowRedirectHelp(isIframeOrPopupIssue);
      } else if (isPopupBlocked) {
        setError(language === 'bn'
          ? 'পপআপটি ব্লক করা হয়েছে। অনুগ্রহ করে আপনার ব্রাউজারে পপআপ অনুমতি দিন বা নতুন ট্যাবে অ্যাপটি খুলুন।'
          : 'The sign-in popup was blocked by your browser. Please enable popups or open the app in a new tab.');
        setShowRedirectHelp(isIframeOrPopupIssue);
      } else {
        setError(err.message || 'Facebook sign-in failed');
        if (isIframeOrPopupIssue) {
          setShowRedirectHelp(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = contactName.trim();
    const emailTrimmed = contactEmail.trim().toLowerCase();
    const msgTrimmed = contactMessage.trim();

    if (!nameTrimmed || !emailTrimmed || !msgTrimmed) return;
    
    setContactSubmitting(true);
    setContactError('');
    setError('');

    // Email address validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setContactError(language === 'bn' 
        ? 'অনুগ্রহ করে একটি সঠিক ইমেইল আইডি লিখুন (যেমন name@example.com)।' 
        : 'Please enter a valid email address (e.g. name@example.com).');
      setContactSubmitting(false);
      return;
    }

    try {
      const { db } = await import('../firebase');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      
      const SESSION_ID = localStorage.getItem('chat_session_id') || Math.random().toString(36).substring(7);
      
      await addDoc(collection(db, 'support_messages'), {
        text: `[Book Contact Form - Mobile] Name: ${nameTrimmed}\nEmail: ${emailTrimmed}\nMessage: ${msgTrimmed}`,
        sessionId: SESSION_ID,
        isBot: false,
        createdAt: serverTimestamp()
      });
      
      setContactSuccess(true);
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      setTimeout(() => setContactSuccess(false), 5000);
    } catch (err: any) {
      console.error("Support message error:", err);
      const errMsg = language === 'bn' ? 'বার্তা পাঠানো ব্যর্থ হয়েছে।' : 'Failed to send message.';
      setContactError(errMsg);
      setError(errMsg);
    } finally {
      setContactSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] overflow-y-auto">
      {/* Language Switcher */}
      <div className="fixed top-4 left-4 flex items-center gap-1 p-0.5 bg-zinc-900/80 border border-white/10 rounded-full z-[110] shadow-lg">
        <button
          onClick={() => setLanguage('bn')}
          className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all duration-200 cursor-pointer ${
            language === 'bn'
              ? 'bg-gradient-to-r from-[#d4af37] to-[#aa771c] text-zinc-950 shadow-md scale-105'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          বাংলা
        </button>
        <button
          onClick={() => setLanguage('en')}
          className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all duration-200 cursor-pointer ${
            language === 'en'
              ? 'bg-gradient-to-r from-[#d4af37] to-[#aa771c] text-zinc-950 shadow-md scale-105'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          EN
        </button>
      </div>

      {/* Global Close Button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 p-2 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full transition-all duration-200 z-[110] shadow-lg border border-white/10"
        title={language === 'bn' ? 'বন্ধ করুন' : 'Close Portal'}
      >
        <X size={20} />
      </button>

      <div className="w-full max-w-[390px] h-[550px] relative">
        {mobilePage === 0 && (
          /* FRONT COVER */
          <div className="w-full h-full rounded-2xl flex flex-col justify-between text-center text-[#f7f3eb] relative p-6 bg-gradient-to-br from-[#0b5a43] to-[#05261c] shadow-2xl border-[6px] border-double border-[#cfa86b] select-none">
            <div className="absolute inset-2 border border-[#cfa86b]/40 rounded-lg pointer-events-none" />
            <div className="mt-4">
              <span className="text-xs font-semibold tracking-[0.25em] text-[#cfa86b] uppercase block mb-1">
                {language === 'bn' ? 'ডিজিটাল পোর্টাল' : 'Digital Hub'}
              </span>
              <div className="w-8 h-[1px] bg-[#cfa86b] mx-auto" />
            </div>

            <div className="my-auto space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#d4af37] to-[#aa771c] rounded-2xl flex items-center justify-center mx-auto shadow-xl border border-white/20 overflow-hidden">
                <img 
                  src="https://i.postimg.cc/McBQ2pVg/barnia-logo-120x120.png" 
                  alt="UB Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white font-serif mt-4">
                PORTFOLIO
              </h1>
              <p className="text-sm font-medium text-[#cfa86b] tracking-wider uppercase font-sans">
                Interactive Designer
              </p>
              <div className="w-24 h-[1px] bg-[#cfa86b]/30 mx-auto" />
            </div>

            <div className="mb-4 flex flex-col items-center gap-3 w-full">
              <button
                onClick={() => setMobilePage(1)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#e5be49] hover:to-[#bd8728] text-zinc-950 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-lg active:scale-95 animate-pulse cursor-pointer"
              >
                <BookOpen size={14} />
                {language === 'bn' ? 'খুলুন 📖' : 'Open Book 📖'}
              </button>
              <button
                onClick={() => {
                  setMode('login');
                  setMobilePage(4);
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-[#cfa86b]/60 hover:border-[#cfa86b] bg-white/5 hover:bg-white/10 text-[#cfa86b] hover:text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-md active:scale-95 cursor-pointer"
              >
                <ArrowRight size={14} className="animate-bounce-horizontal" />
                {language === 'bn' ? 'সরাসরি লগইন ➔' : 'Direct Login ➔'}
              </button>
            </div>
          </div>
        )}

        {mobilePage === 1 && (
          /* PREFACE */
          <div className="w-full h-full rounded-2xl bg-[#fdfbf7] border border-[#e2ded5] shadow-2xl p-6 flex flex-col justify-between text-zinc-800 relative">
            <div>
              <div className="flex items-center gap-2 text-[#0b5a43] mb-3">
                <Sparkles size={16} />
                <span className="text-[10px] uppercase font-black tracking-widest">{language === 'bn' ? 'স্বাগতম' : 'Preface'}</span>
              </div>
              <h2 className="text-2xl font-black text-zinc-900 leading-tight">
                Hello! 👋
              </h2>
              <div className="h-[2px] w-12 bg-[#0b5a43] mt-2" />
            </div>

            <div className="my-auto space-y-4">
              <p className="text-zinc-600 text-xs leading-relaxed">
                {language === 'bn' 
                  ? 'বর্নিয়া ডিজিটাল হাবে আপনাকে স্বাগতম। এটি আমাদের ইন্টারঅ্যাক্টিভ হেরিটেজ পোর্টাল যেখানে প্রযুক্তি এবং ঐতিহ্য একসাথে মিলিত হয়েছে।' 
                  : 'Welcome to Barnia Digital Hub. This interactive portal bridges our ancestry records with powerful SaaS and AI features.'}
              </p>
              <p className="text-zinc-600 text-xs leading-relaxed">
                {language === 'bn'
                  ? 'আমাদের প্রাচীন পারিবারিক বংশলতিকা (বংশাবলী) অন্বেষণ করতে, বর্নিয়া বাজারের ব্যবসায়িক ফিচার ব্যবহার করতে এবং কৃত্রিম বুদ্ধিমত্তার সাথে চ্যাট করতে আজই লগইন করুন।'
                  : 'Sign in to access secure features including high-res lineage exports, member messaging, custom templates, and direct interactions with Barnali AI.'}
              </p>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
              <button
                onClick={() => setMobilePage(0)}
                className="text-xs text-zinc-400 hover:text-zinc-600 font-bold uppercase flex items-center gap-1"
              >
                <ChevronLeft size={16} /> {language === 'bn' ? 'কভার' : 'Cover'}
              </button>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Page 1 of 6</span>
              <button
                onClick={() => setMobilePage(2)}
                className="text-xs text-[#0b5a43] hover:text-[#073829] font-black uppercase tracking-wider flex items-center gap-1"
              >
                {language === 'bn' ? 'পরবর্তী' : 'Next'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {mobilePage === 2 && (
          /* TECHNICAL SKILLS */
          <div className="w-full h-full rounded-2xl bg-[#fdfbf7] border border-[#e2ded5] shadow-2xl p-6 flex flex-col justify-between text-zinc-800 relative">
            <div>
              <div className="flex items-center gap-2 text-[#0b5a43] mb-3">
                <Code size={16} />
                <span className="text-[10px] uppercase font-black tracking-widest">{language === 'bn' ? 'দক্ষতা' : 'Technical Skills'}</span>
              </div>
              <h3 className="text-2xl font-black text-zinc-900 leading-tight">
                Technical Skills
              </h3>
              <div className="h-[2px] w-12 bg-[#0b5a43] mt-2" />
            </div>

            <div className="my-auto space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold text-zinc-800 mb-1">
                    <span>HTML & CSS</span>
                    <span className="text-[#0b5a43]">95%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                    <div className="h-full bg-gradient-to-r from-[#0b5a43] to-emerald-500 rounded-full" style={{ width: '95%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-zinc-800 mb-1">
                    <span>JavaScript & React</span>
                    <span className="text-[#0b5a43]">80%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                    <div className="h-full bg-gradient-to-r from-[#0b5a43] to-emerald-500 rounded-full" style={{ width: '80%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-zinc-800 mb-1">
                    <span>UI/UX Design (Figma)</span>
                    <span className="text-[#0b5a43]">90%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                    <div className="h-full bg-gradient-to-r from-[#0b5a43] to-emerald-500 rounded-full" style={{ width: '90%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-zinc-800 mb-1">
                    <span>3D Animation</span>
                    <span className="text-[#0b5a43]">65%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                    <div className="h-full bg-gradient-to-r from-[#0b5a43] to-emerald-500 rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
              <button
                onClick={() => setMobilePage(1)}
                className="text-xs text-zinc-400 hover:text-zinc-600 font-bold uppercase flex items-center gap-1"
              >
                <ChevronLeft size={16} /> {language === 'bn' ? 'পূর্ববর্তী' : 'Prev'}
              </button>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Page 2 of 6</span>
              <button
                onClick={() => setMobilePage(3)}
                className="text-xs text-[#0b5a43] hover:text-[#073829] font-black uppercase tracking-wider flex items-center gap-1"
              >
                {language === 'bn' ? 'পরবর্তী' : 'Next'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {mobilePage === 3 && (
          /* SERVICES */
          <div className="w-full h-full rounded-2xl bg-[#fdfbf7] border border-[#e2ded5] shadow-2xl p-6 flex flex-col justify-between text-zinc-800 relative">
            <div>
              <div className="flex items-center gap-2 text-[#0b5a43] mb-3">
                <Laptop size={16} />
                <span className="text-[10px] uppercase font-black tracking-widest">{language === 'bn' ? 'সেবাসমূহ' : 'Services'}</span>
              </div>
              <h3 className="text-2xl font-black text-zinc-900 leading-tight">
                What I Do
              </h3>
              <div className="h-[2px] w-12 bg-[#0b5a43] mt-2" />
            </div>

            <div className="my-auto space-y-4">
              <div className="p-4 bg-[#f9fbf9] border border-zinc-200 rounded-xl shadow-sm hover:border-[#0b5a43] transition-all duration-200">
                <h4 className="text-xs font-black text-[#0b5a43] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#0b5a43] rounded-full inline-block" />
                  Web Development
                </h4>
                <p className="text-zinc-600 text-[11px] leading-relaxed">
                  Building responsive, fast, and accessible websites using modern frameworks.
                </p>
              </div>

              <div className="p-4 bg-[#f9fbf9] border border-zinc-200 rounded-xl shadow-sm hover:border-[#0b5a43] transition-all duration-200">
                <h4 className="text-xs font-black text-[#0b5a43] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#0b5a43] rounded-full inline-block" />
                  Interface Design
                </h4>
                <p className="text-zinc-600 text-[11px] leading-relaxed">
                  Crafting intuitive layouts and visually stunning interfaces for web and mobile.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
              <button
                onClick={() => setMobilePage(2)}
                className="text-xs text-zinc-400 hover:text-zinc-600 font-bold uppercase flex items-center gap-1"
              >
                <ChevronLeft size={16} /> {language === 'bn' ? 'পূর্ববর্তী' : 'Prev'}
              </button>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Page 3 of 6</span>
              <button
                onClick={() => setMobilePage(4)}
                className="text-xs text-[#0b5a43] hover:text-[#073829] font-black uppercase tracking-wider flex items-center gap-1"
              >
                {language === 'bn' ? 'লগইন' : 'Sign In'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {mobilePage === 4 && (
          /* SECURE ACCESS / AUTHENTICATION PORTAL */
          <div className="w-full h-full rounded-2xl bg-[#fdfbf7] border border-[#e2ded5] shadow-2xl p-5 flex flex-col justify-between text-zinc-800 relative">
            <div className="border-b border-zinc-100 pb-2">
              <h3 className="text-base font-black text-zinc-950 flex items-center gap-2">
                <Lock className="text-[#0b5a43]" size={16} />
                {mode === 'login' 
                  ? (language === 'bn' ? 'লগইন পোর্টাল' : 'Sign In Portal') 
                  : mode === 'signup' 
                    ? (language === 'bn' ? 'অ্যাকাউন্ট তৈরি' : 'Join Community')
                    : mode === 'otp'
                      ? (language === 'bn' ? 'ওটিপি লগইন' : 'OTP Secure Access')
                      : (language === 'bn' ? 'পাসওয়ার্ড রিসেট' : 'Password Reset')}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto custom-book-scroll pr-1 py-2 space-y-2.5 max-h-[340px]">
              <form onSubmit={handleSubmit} className="space-y-2">
                {mode === 'signup' && (
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#0b5a43] transition-colors" size={14} />
                    <input
                      type="text"
                      placeholder={language === 'bn' ? 'আপনার নাম' : 'Full Name'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0b5a43]/10 focus:border-[#0b5a43] text-xs font-medium"
                    />
                  </div>
                )}

                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#0b5a43] transition-colors" size={14} />
                  <input
                    type="email"
                    placeholder={language === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isOtpSent && mode === 'otp'}
                    className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0b5a43]/10 focus:border-[#0b5a43] text-xs font-medium disabled:opacity-50"
                  />
                </div>

                {mode === 'otp' && isOtpSent && (
                  <div className="space-y-1">
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#0b5a43] transition-colors" size={14} />
                      <input
                        type="text"
                        placeholder="Code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        required
                        maxLength={6}
                        className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0b5a43]/10 focus:border-[#0b5a43] text-center font-bold tracking-[0.2em] text-xs text-[#0b5a43]"
                      />
                    </div>
                    {debugOtp && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-mono px-2 py-1 rounded text-center">
                        Debug OTP: {debugOtp}
                      </div>
                    )}
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[8px] text-zinc-400 uppercase font-bold">Enter 6-digit OTP</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOtpSent(false);
                          setOtp('');
                        }}
                        className="text-[8px] text-[#0b5a43] hover:underline font-bold uppercase"
                      >
                        {language === 'bn' ? 'ইমেইল বদলান' : 'Change Email'}
                      </button>
                    </div>
                  </div>
                )}

                {mode !== 'forgot' && mode !== 'otp' && (
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#0b5a43] transition-colors" size={14} />
                    <input
                      type="password"
                      placeholder={language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0b5a43]/10 focus:border-[#0b5a43] text-xs font-medium"
                    />
                    {mode === 'login' && (
                      <div className="flex justify-end mt-1">
                        <button
                          type="button"
                          onClick={() => setMode('forgot')}
                          className="text-[8px] text-[#0b5a43] hover:underline font-bold uppercase tracking-wider"
                        >
                          {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="p-2 bg-red-50 border border-red-100 rounded-xl flex items-start gap-1.5 text-red-600 text-[9px] leading-normal animate-fade-in">
                    <AlertCircle className="shrink-0 mt-0.5" size={11} />
                    <div className="flex-1">
                      <span>{error}</span>
                      {(showRedirectHelp || isIframe) && (
                        <button 
                          type="button" 
                          onClick={() => window.open(window.location.href, '_blank')}
                          className="block mt-2 bg-[#0b5a43] text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-[#073829] transition-colors cursor-pointer text-center w-full shadow-sm"
                        >
                          {language === 'bn' ? 'নতুন ট্যাবে অ্যাপ খুলুন ↗' : 'Open in New Tab ↗'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-1.5 text-emerald-600 text-[9px] bg-emerald-50 p-2 rounded-xl border border-emerald-100 font-medium">
                    <CheckCircle2 size={11} className="shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-1.5 bg-[#0b5a43] hover:bg-[#073829] active:scale-[0.98] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={12} />
                  ) : (
                    <>
                      {mode === 'login' 
                        ? (language === 'bn' ? 'লগইন করুন' : 'Sign In') 
                        : mode === 'signup' 
                          ? (language === 'bn' ? 'সাইন আপ' : 'Sign Up')
                          : mode === 'otp'
                            ? (isOtpSent ? (language === 'bn' ? 'যাচাই করুন' : 'Verify') : (language === 'bn' ? 'ওটিপি পাঠান' : 'Send OTP'))
                            : (language === 'bn' ? 'লিঙ্ক পাঠান' : 'Send Reset Link')}
                      <ArrowRight size={12} />
                    </>
                  )}
                </button>
              </form>

              {mode !== 'forgot' && (
                <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all text-[10px] font-bold text-zinc-700 shadow-sm"
                    >
                      <Chrome size={10} className="text-[#0b5a43]" />
                      Google
                    </button>

                    <button
                      onClick={handleFacebookSignIn}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#1877F2] hover:bg-[#166fe5] rounded-xl transition-all text-[10px] font-bold text-white shadow-sm"
                    >
                      <Facebook size={10} fill="currentColor" />
                      Facebook
                    </button>
                  </div>

                  <div className="flex gap-1.5">
                    <a
                      href={`https://t.me/${(typeof import.meta.env.VITE_TELEGRAM_BOT_USERNAME === 'string' && import.meta.env.VITE_TELEGRAM_BOT_USERNAME.trim() !== '' && import.meta.env.VITE_TELEGRAM_BOT_USERNAME !== 'undefined') ? import.meta.env.VITE_TELEGRAM_BOT_USERNAME.replace('@', '').trim() : 'Vamshavali_bot'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#0088cc] hover:bg-[#0077b5] rounded-xl transition-all text-[10px] font-bold text-white shadow-sm text-center"
                    >
                      <MessageCircle size={10} />
                      Telegram
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setSuccess('');
                        setIsOtpSent(false);
                        setMode(mode === 'otp' ? 'login' : 'otp');
                      }}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-zinc-900 hover:bg-black rounded-xl transition-all text-[10px] font-bold text-white shadow-sm"
                    >
                      <Mail size={10} />
                      {mode === 'otp' ? 'Password' : 'OTP Login'}
                    </button>
                  </div>
                </div>
              )}

              <div className="text-center pt-1">
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
                  className="text-[10px] font-bold text-zinc-500 hover:text-[#0b5a43] transition-colors"
                >
                  {mode === 'login' || mode === 'otp'
                    ? (language === 'bn' ? 'অ্যাকাউন্ট নেই? সাইন আপ করুন' : "Don't have an account? Sign up")
                    : mode === 'signup'
                      ? (language === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'Already have an account? Sign in')
                      : (language === 'bn' ? 'লগইন পেজে ফিরে যান' : 'Back to Login')}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
              <button
                onClick={() => setMobilePage(3)}
                className="text-xs text-zinc-400 hover:text-zinc-600 font-bold uppercase flex items-center gap-1"
              >
                <ChevronLeft size={16} /> {language === 'bn' ? 'পূর্ববর্তী' : 'Prev'}
              </button>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Page 4 of 6</span>
              <button
                onClick={() => setMobilePage(5)}
                className="text-xs text-[#0b5a43] hover:text-[#073829] font-black uppercase tracking-wider flex items-center gap-1"
              >
                {language === 'bn' ? 'যোগাযোগ' : 'Contact'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {mobilePage === 5 && (
          /* SUPPORT CONTACT FORM */
          <div className="w-full h-full rounded-2xl bg-[#fdfbf7] border border-[#e2ded5] shadow-2xl p-6 flex flex-col justify-between text-zinc-800 relative">
            <div>
              <div className="flex items-center gap-2 text-[#0b5a43] mb-2">
                <Mail size={16} />
                <span className="text-[10px] uppercase font-black tracking-widest">{language === 'bn' ? 'যোগাযোগ' : 'Get In Touch'}</span>
              </div>
              <h3 className="text-xl font-black text-zinc-900 leading-tight">
                Get In Touch
              </h3>
              <div className="h-[2px] w-12 bg-[#0b5a43] mt-1.5" />
            </div>

            <div className="my-auto flex-1 flex flex-col justify-center min-h-[220px]">
              {contactSuccess ? (
                <div className="space-y-3">
                  <div className="text-center space-y-3 py-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100 shadow-sm">
                      <CheckCircle2 size={24} />
                    </div>
                    <h4 className="text-sm font-black text-zinc-900">
                      {language === 'bn' ? 'বার্তা পাঠানো হয়েছে!' : 'Message Sent successfully!'}
                    </h4>
                    <p className="text-zinc-500 text-[11px] px-4 leading-relaxed">
                      {language === 'bn' 
                        ? 'আপনার বার্তা আমাদের সিস্টেমে সংরক্ষিত হয়েছে। আমাদের টিম খুব শীঘ্রই আপনার সাথে যোগাযোগ করবে।' 
                        : 'Your contact message has been recorded. Barnali Assistant team will review and reply soon.'}
                    </p>
                  </div>

                  {/* Explanatory notice card on success */}
                  <div className="p-2 bg-zinc-50 border border-zinc-200/60 rounded-xl text-[9px] text-zinc-500 font-medium space-y-1">
                    <div className="flex items-center gap-1 text-[#0b5a43] font-bold uppercase tracking-wider text-[8.5px]">
                      <MessageCircle size={10} />
                      {language === 'bn' ? 'বার্তা কোথায় জমা হলো?' : 'Where did the message go?'}
                    </div>
                    <p className="leading-normal">
                      {language === 'bn'
                        ? 'আপনার বার্তাটি সরাসরি ফায়ারবেস ডেটাবেজের "support_messages" কালেকশনে জমা হয়েছে। এটি সরাসরি লাইভ চ্যাট উইজেট থেকে অ্যাক্সেস করা যাবে।'
                        : 'The message was sent securely to your Firebase Firestore database ("support_messages" collection). It is accessible from your Live Support Chat widget!'}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-2.5">
                  {contactError && (
                    <div className="p-2 bg-red-50 border border-red-100 rounded-lg flex items-start gap-1.5 text-red-600 text-[10px] leading-relaxed animate-fade-in">
                      <AlertCircle className="shrink-0 mt-0.5" size={12} />
                      <span>{contactError}</span>
                    </div>
                  )}

                  <input 
                    type="text" 
                    placeholder={language === 'bn' ? 'আপনার নাম' : 'Your Name'} 
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#0b5a43] transition-colors"
                  />
                  <input 
                    type="email" 
                    placeholder={language === 'bn' ? 'আপনার ইমেইল' : 'Your Email'} 
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#0b5a43] transition-colors"
                  />
                  <textarea 
                    placeholder={language === 'bn' ? 'আপনার বার্তা...' : 'Your Message...'} 
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    required
                    rows={2.5}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#0b5a43] transition-colors resize-none"
                  />
                  <button 
                    type="submit"
                    disabled={contactSubmitting}
                    className="w-full py-2 bg-[#0b5a43] hover:bg-[#073829] text-white font-bold text-[11px] uppercase tracking-wider rounded-lg transition-colors active:scale-95 disabled:opacity-75 cursor-pointer"
                  >
                    {contactSubmitting ? (
                      <Loader2 className="animate-spin mx-auto" size={14} />
                    ) : (
                      language === 'bn' ? 'বার্তা পাঠান' : 'Send Message'
                    )}
                  </button>

                  {/* Explanatory notice card */}
                  <div className="p-2 bg-zinc-100/80 border border-zinc-200/50 rounded-xl text-[9px] text-zinc-500 font-medium space-y-1">
                    <div className="flex items-center gap-1 text-[#0b5a43] font-bold uppercase tracking-wider text-[8.5px]">
                      <MessageCircle size={10} />
                      {language === 'bn' ? 'বার্তা কোথায় যায়?' : 'Where do messages go?'}
                    </div>
                    <p className="leading-normal">
                      {language === 'bn'
                        ? 'বার্তাগুলো সরাসরি ফায়ারবেস ডেটাবেজের "support_messages" কালেকশনে জমা হয় এবং তা "Live Chat" উইজেটের মাধ্যমে খুঁজে পাবেন।'
                        : 'Messages are stored securely in Firestore ("support_messages" collection) and are instantly visible in the Live Chat dashboard.'}
                    </p>
                  </div>
                </form>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
              <button
                onClick={() => setMobilePage(4)}
                className="text-xs text-zinc-400 hover:text-zinc-600 font-bold uppercase flex items-center gap-1"
              >
                <ChevronLeft size={16} /> {language === 'bn' ? 'পূর্ববর্তী' : 'Prev'}
              </button>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Page 5 of 6</span>
              <button
                onClick={() => setMobilePage(6)}
                className="text-xs text-[#0b5a43] hover:text-[#073829] font-black uppercase tracking-wider flex items-center gap-1"
              >
                {language === 'bn' ? 'পরবর্তী' : 'Next'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {mobilePage === 6 && (
          /* DIGITAL INFO & CREDITS */
          <div className="w-full h-full rounded-2xl bg-[#fdfbf7] border border-[#e2ded5] shadow-2xl p-6 flex flex-col justify-between text-zinc-800 relative">
            <div>
              <div className="flex items-center gap-2 text-[#0b5a43] mb-3">
                <Award size={16} />
                <span className="text-[10px] uppercase font-black tracking-widest">{language === 'bn' ? 'তথ্য' : 'Digital Info'}</span>
              </div>
              <h3 className="text-2xl font-black text-zinc-900 leading-tight">
                Welcome Home 🏠
              </h3>
              <div className="h-[2px] w-12 bg-[#0b5a43] mt-2" />
            </div>

            <div className="my-auto space-y-4 text-xs text-zinc-600 leading-relaxed">
              <p>
                {language === 'bn'
                  ? 'বর্নিয়া ডিজিটাল হাব হলো কমিউনিটি সংযোগ, বংশপরম্পরা এবং ডিজিটাল কমার্সের জন্য একটি সম্মিলিত প্ল্যাটফর্ম।'
                  : 'Barnia Digital Hub is a unified portal for modern creators, designed to preserve family trees while supporting local digital commerce.'}
              </p>
              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[10px] uppercase tracking-wider">
                  <Zap size={11} /> {language === 'bn' ? 'দ্রুত তথ্য' : 'Quick facts'}
                </div>
                <ul className="list-disc list-inside space-y-1 text-[10px] text-zinc-500 font-medium">
                  <li>{language === 'bn' ? 'বংশাবলী লিনেজ এক্সপোর্ট সাপোর্ট' : 'Standalone offline HTML package output'}</li>
                  <li>{language === 'bn' ? '২৪/৭ বার্নালী কৃত্রিম বুদ্ধিমত্তা চ্যাট' : '24/7 AI Heritage Virtual Assistant'}</li>
                  <li>{language === 'bn' ? '১০০% ক্লাউড ডাটা সিকিউরিটি' : 'Secure real-time cloud data model'}</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
              <button
                onClick={() => setMobilePage(5)}
                className="text-xs text-zinc-400 hover:text-zinc-600 font-bold uppercase flex items-center gap-1"
              >
                <ChevronLeft size={16} /> {language === 'bn' ? 'পূর্ববর্তী' : 'Prev'}
              </button>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Page 6 of 6</span>
              <button
                onClick={() => setMobilePage(7)}
                className="text-xs text-[#0b5a43] hover:text-[#073829] font-black uppercase tracking-wider flex items-center gap-1"
              >
                {language === 'bn' ? 'শেষ কভার' : 'End Cover'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {mobilePage === 7 && (
          /* REAR COVER */
          <div className="w-full h-full rounded-2xl flex flex-col justify-center items-center text-center text-white relative p-6 bg-gradient-to-br from-[#05261c] to-[#031b14] shadow-2xl border-[6px] border-double border-[#cfa86b] select-none">
            <div className="absolute inset-2 border border-[#cfa86b]/40 rounded-lg pointer-events-none" />
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-full border-2 border-[#cfa86b]/60 flex items-center justify-center mx-auto text-[#cfa86b]">
                <BookOpen size={24} />
              </div>
              <div className="w-16 h-[1px] bg-[#cfa86b]/40 mx-auto" />
              <p className="text-[10px] text-[#cfa86b]/70 font-semibold uppercase tracking-[0.25em]">
                {language === 'bn' ? 'বর্নিয়া ডিজিটাল হাব' : 'BARNIA DIGITAL HUB'}
              </p>
              <p className="text-[9px] text-zinc-500 italic mt-1">
                © 2026. All Rights Reserved.
              </p>
              <button
                onClick={() => setMobilePage(0)}
                className="mt-6 px-6 py-2 bg-[#cfa86b] hover:bg-white text-zinc-950 font-black text-xs uppercase rounded-xl shadow-md tracking-wider transition-colors"
              >
                {language === 'bn' ? 'শুরুতে ফিরে যান' : 'Back to Cover'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
