import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Lock, User, Chrome, Facebook, ArrowRight, AlertCircle, Loader2, MessageCircle,
  ChevronLeft, ChevronRight, BookOpen, Sparkles, Code, Laptop, CheckCircle2, Award, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from '../FirebaseContext';
import { useLanguage } from '../LanguageContext';
import { MobileAuthModal } from './MobileAuthModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signInWithFacebook, signInWithEmail, signUpWithEmail, sendPasswordReset, sendOTP, verifyOTP } = useFirebase();
  const { language, setLanguage } = useLanguage();
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  
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

  // Book 3D Navigation State
  const [activeSheet, setActiveSheet] = useState(0);
  const [bookScale, setBookScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [mobilePage, setMobilePage] = useState(0);
  const [isCoverHovered, setIsCoverHovered] = useState(false);

  // Reset page position when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveSheet(0);
      setMobilePage(0);
      setIsCoverHovered(false);
      setError('');
      setSuccess('');
      setShowRedirectHelp(false);
    }
  }, [isOpen]);

  // Handle dynamic sizing of the book to fit mobile perfectly
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      if (width < 380) {
        setBookScale(0.42);
      } else if (width < 480) {
        setBookScale(0.48);
      } else if (width < 640) {
        setBookScale(0.58);
      } else if (width < 768) {
        setBookScale(0.7);
      } else if (width < 1024) {
        setBookScale(0.85);
      } else {
        setBookScale(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        text: `[Book Contact Form] Name: ${nameTrimmed}\nEmail: ${emailTrimmed}\nMessage: ${msgTrimmed}`,
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
      console.error("Error submitting contact form:", err);
      const errMsg = language === 'bn' ? 'যোগাযোগের বার্তা পাঠানো ব্যর্থ হয়েছে।' : 'Failed to send contact message.';
      setContactError(errMsg);
      setError(errMsg);
    } finally {
      setContactSubmitting(false);
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
    };

    window.addEventListener('auth-error', handleAuthError);
    window.addEventListener('auth-warning', handleAuthWarning);
    return () => {
      window.removeEventListener('auth-error', handleAuthError);
      window.removeEventListener('auth-warning', handleAuthWarning);
    };
  }, []);

  if (!isOpen) return null;

  if (isMobile) {
    return <MobileAuthModal isOpen={isOpen} onClose={onClose} />;
  }

  // Determine book translation to center active view
  const bookTransform = activeSheet === 0 
    ? (isCoverHovered 
        ? 'translateX(-140px) rotateY(-25deg) rotateX(5deg) scale(1.02)' 
        : 'translateX(-190px) rotateY(-12deg) rotateX(3deg)')
    : activeSheet === 4 
      ? 'translateX(190px) rotateY(12deg) rotateX(3deg)' 
      : 'translateX(0px) rotateY(0deg) rotateX(0deg)';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/65 backdrop-blur-md overflow-hidden select-none">
      <style>{`
        /* Custom 3D Book Layout */
        .book-container-3d {
          position: relative;
          width: 760px;
          height: 520px;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 2000px;
          transform-style: preserve-3d;
        }

        .book-wrapper {
          position: relative;
          width: 380px;
          height: 520px;
          transform-style: preserve-3d;
          transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .book-spine-3d {
          position: absolute;
          top: 0;
          left: 0;
          width: 16px;
          height: 100%;
          background: linear-gradient(to right, #05261c, #0b5a43, #05261c);
          transform: rotateY(-90deg) translateZ(8px);
          transform-origin: left center;
          border-radius: 4px 0 0 4px;
          box-shadow: 2px 0 5px rgba(0,0,0,0.3);
          z-index: 50;
        }

        .book-back-cover-left {
          position: absolute;
          top: -4px;
          left: -6px;
          width: 388px;
          height: 528px;
          background: linear-gradient(135deg, #05261c 0%, #073829 100%);
          border-radius: 12px 0 0 12px;
          box-shadow: -15px 15px 35px rgba(0,0,0,0.4);
          transform: translateZ(-10px);
          border-right: 10px solid #05261c;
          border: 2px solid #8e734a;
        }

        .book-back-cover-right {
          position: absolute;
          top: -4px;
          left: -2px;
          width: 388px;
          height: 528px;
          background: linear-gradient(135deg, #073829 0%, #05261c 100%);
          border-radius: 0 12px 12px 0;
          box-shadow: 15px 15px 35px rgba(0,0,0,0.4);
          transform: translateZ(-10px);
          border-left: 10px solid #05261c;
          border: 2px solid #8e734a;
        }

        .book-sheet-3d {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          transform-origin: left center;
          transform-style: preserve-3d;
          transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .book-page-front, .book-page-back {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          box-shadow: inset 4px 0 25px rgba(0,0,0,0.06), 1px 1px 2px rgba(0,0,0,0.05);
          border-radius: 0 16px 16px 0;
          overflow: hidden;
          background: #fdfbf7;
          border: 1px solid #e2ded5;
        }

        .book-page-back {
          transform: rotateY(180deg);
          border-radius: 16px 0 0 16px;
          box-shadow: inset -4px 0 25px rgba(0,0,0,0.06), -1px 1px 2px rgba(0,0,0,0.05);
        }

        .book-cover-front-design {
          background: linear-gradient(135deg, #0b5a43 0%, #05261c 100%) !important;
          color: #f7f3eb;
          border: 6px double #cfa86b !important;
          box-shadow: inset 0 0 50px rgba(0,0,0,0.5) !important;
          border-radius: 0 12px 12px 0;
        }

        .book-cover-back-design {
          background: linear-gradient(135deg, #05261c 0%, #031b14 100%) !important;
          border: 6px double #cfa86b !important;
          box-shadow: inset 0 0 50px rgba(0,0,0,0.5) !important;
          border-radius: 12px 0 0 12px;
        }

        .gutter-shading-left {
          position: absolute;
          top: 0;
          right: 0;
          width: 30px;
          height: 100%;
          background: linear-gradient(to left, rgba(0,0,0,0.07) 0%, rgba(0,0,0,0) 100%);
          pointer-events: none;
          z-index: 10;
        }

        .gutter-shading-right {
          position: absolute;
          top: 0;
          left: 0;
          width: 30px;
          height: 100%;
          background: linear-gradient(to right, rgba(0,0,0,0.07) 0%, rgba(0,0,0,0) 100%);
          pointer-events: none;
          z-index: 10;
        }

        .custom-book-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .custom-book-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-book-scroll::-webkit-scrollbar-thumb {
          background: #e2ded5;
          border-radius: 2px;
        }
        .custom-book-scroll::-webkit-scrollbar-thumb:hover {
          background: #c5a880;
        }
      `}</style>

      {/* Language Switcher */}
      <div className="fixed top-6 left-6 flex items-center gap-1.5 p-1 bg-zinc-900/60 border border-white/10 rounded-full z-[110] shadow-lg">
        <button
          onClick={() => setLanguage('bn')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider transition-all duration-300 cursor-pointer ${
            language === 'bn'
              ? 'bg-gradient-to-r from-[#d4af37] to-[#aa771c] text-zinc-950 shadow-md scale-105'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          বাংলা
        </button>
        <button
          onClick={() => setLanguage('en')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider transition-all duration-300 cursor-pointer ${
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
        className="fixed top-6 right-6 p-3 bg-zinc-900/60 hover:bg-zinc-800/80 hover:scale-105 active:scale-95 text-white rounded-full transition-all duration-200 z-[110] shadow-lg border border-white/10"
        title={language === 'bn' ? 'বন্ধ করুন' : 'Close Portal'}
      >
        <X size={24} />
      </button>

      {/* 3D Book Container */}
      <div 
        className="book-container-3d" 
        style={{ transform: `scale(${bookScale})` }}
      >
        {/* Book Spine (Behind Pages when Open) */}
        {activeSheet > 0 && activeSheet < 4 && (
          <div className="absolute left-[374px] w-3 h-[524px] bg-zinc-800/20 backdrop-blur-sm z-30 pointer-events-none" style={{ transform: 'translateZ(-2px)' }} />
        )}

        {/* Outer Left Book Cover (Visible when Open) */}
        {activeSheet > 0 && (
          <div className="book-back-cover-left" />
        )}

        {/* Outer Right Book Cover (Visible when Open/Closed) */}
        {activeSheet < 4 && (
          <div className="book-back-cover-right" />
        )}

        {/* Spine Side Wall */}
        <div className="book-spine-3d" />

        <div 
          className="book-wrapper"
          style={{ transform: bookTransform }}
          onMouseEnter={() => { if (activeSheet === 0) setIsCoverHovered(true); }}
          onMouseLeave={() => setIsCoverHovered(false)}
        >
          {/* SHEET 0 (Front Cover / Welcome Preface) */}
          <div 
            className="book-sheet-3d"
            style={{ 
              transform: activeSheet > 0 ? 'rotateY(-180deg)' : (isCoverHovered ? 'rotateY(-80deg)' : 'rotateY(0deg)'),
              zIndex: activeSheet > 0 ? 10 : 40,
              pointerEvents: activeSheet === 0 || activeSheet === 1 ? 'auto' : 'none'
            }}
          >
            {/* Sheet 0 FRONT: Outer Cover */}
            <div className="book-page-front book-cover-front-design flex flex-col justify-between p-8 text-center relative">
              <div className="absolute inset-4 border border-[#cfa86b]/40 rounded-lg pointer-events-none" />
              
              {/* Cover Top Header */}
              <div className="mt-4">
                <span className="text-xs font-semibold tracking-[0.25em] text-[#cfa86b] uppercase block mb-1">
                  {language === 'bn' ? 'ডিজিটাল পোর্টাল' : 'Digital Hub'}
                </span>
                <div className="w-8 h-[1px] bg-[#cfa86b] mx-auto" />
              </div>

              {/* Cover Title */}
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

              {/* Cover Footer */}
              <div className="mb-4 flex flex-col items-center gap-3">
                <button
                  onClick={() => setActiveSheet(1)}
                  className="w-48 flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#e5be49] hover:to-[#bd8728] text-zinc-950 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-lg active:scale-95 animate-pulse cursor-pointer"
                >
                  <BookOpen size={14} />
                  {language === 'bn' ? 'খুলুন 📖' : 'Open Book 📖'}
                </button>
                <button
                  onClick={() => {
                    setMode('login');
                    setActiveSheet(2);
                  }}
                  className="w-48 flex items-center justify-center gap-2 px-6 py-2.5 border border-[#cfa86b]/60 hover:border-[#cfa86b] bg-white/5 hover:bg-white/10 text-[#cfa86b] hover:text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-md active:scale-95 cursor-pointer"
                >
                  <ArrowRight size={14} className="animate-bounce-horizontal" />
                  {language === 'bn' ? 'সরাসরি লগইন ➔' : 'Direct Login ➔'}
                </button>
              </div>
            </div>

            {/* Sheet 0 BACK: Welcome / Preface */}
            <div className="book-page-back p-8 flex flex-col justify-between text-zinc-800 relative">
              <div className="gutter-shading-left" />
              
              {/* Header */}
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

              {/* Content body */}
              <div className="my-auto space-y-4">
                <p className="text-zinc-600 text-xs leading-relaxed">
                  {language === 'bn' 
                    ? 'বর্নিয়া ডিজিটাল হাবে আপনাকে স্বাগতম। এটি আমাদের ইন্টারঅ্যাক্টিভ হেরিটেজ পোর্টাল যেখানে প্রযুক্তি এবং ঐতিহ্য একসাথে মিলিত হয়েছে।' 
                    : 'welcome to Barnia Degital Hub. This interactive portal bridges our ancestry records with powerful SaaS and AI features.'}
                </p>
                <p className="text-zinc-600 text-xs leading-relaxed">
                  {language === 'bn'
                    ? 'আমাদের প্রাচীন পারিবারিক বংশলতিকা (বংশাবলী) অন্বেষণ করতে, বর্নিয়া বাজারের ব্যবসায়িক ফিচার ব্যবহার করতে এবং কৃত্রিম বুদ্ধিমত্তার সাথে চ্যাট করতে আজই লগইন করুন।'
                    : 'Sign in to access secure features including high-res lineage exports, member messaging, custom templates, and direct interactions with Barnali AI.'}
                </p>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Page 1</span>
                <button
                  onClick={() => {
                    setMode('login');
                    setActiveSheet(2);
                  }}
                  className="px-4 py-2 bg-[#0b5a43] hover:bg-[#073829] text-white text-[11px] font-black tracking-wider uppercase rounded-lg transition-colors shadow-md active:scale-95"
                >
                  {language === 'bn' ? 'লগইন' : 'login'}
                </button>
              </div>
            </div>
          </div>

          {/* SHEET 1 (Technical Skills / What I Do) */}
          <div 
            className="book-sheet-3d"
            style={{ 
              transform: activeSheet > 1 ? 'rotateY(-180deg)' : 'rotateY(0deg)',
              zIndex: activeSheet > 1 ? 20 : 30,
              pointerEvents: activeSheet === 1 || activeSheet === 2 ? 'auto' : 'none'
            }}
          >
            {/* Sheet 1 FRONT: Technical Skills */}
            <div className="book-page-front p-8 flex flex-col justify-between text-zinc-800 relative">
              <div className="gutter-shading-right" />
              
              {/* Title */}
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

              {/* Skills Area */}
              <div className="my-auto space-y-4">
                <div className="space-y-3">
                  {/* HTML & CSS */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-zinc-800 mb-1">
                      <span>HTML & CSS</span>
                      <span className="text-[#0b5a43]">95%</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                      <div 
                        className="h-full bg-gradient-to-r from-[#0b5a43] to-emerald-500 rounded-full" 
                        style={{ width: activeSheet >= 1 ? '95%' : '0%', transition: 'width 1.2s ease-out' }} 
                      />
                    </div>
                  </div>

                  {/* JavaScript & React */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-zinc-800 mb-1">
                      <span>JavaScript & React</span>
                      <span className="text-[#0b5a43]">80%</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                      <div 
                        className="h-full bg-gradient-to-r from-[#0b5a43] to-emerald-500 rounded-full" 
                        style={{ width: activeSheet >= 1 ? '80%' : '0%', transition: 'width 1.2s ease-out' }} 
                      />
                    </div>
                  </div>

                  {/* UI/UX Design (Figma) */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-zinc-800 mb-1">
                      <span>UI/UX Design (Figma)</span>
                      <span className="text-[#0b5a43]">90%</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                      <div 
                        className="h-full bg-gradient-to-r from-[#0b5a43] to-emerald-500 rounded-full" 
                        style={{ width: activeSheet >= 1 ? '90%' : '0%', transition: 'width 1.2s ease-out' }} 
                      />
                    </div>
                  </div>

                  {/* 3D Animation */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-zinc-800 mb-1">
                      <span>3D Animation</span>
                      <span className="text-[#0b5a43]">65%</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                      <div 
                        className="h-full bg-gradient-to-r from-[#0b5a43] to-emerald-500 rounded-full" 
                        style={{ width: activeSheet >= 1 ? '65%' : '0%', transition: 'width 1.2s ease-out' }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Page Number */}
              <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Page 2</span>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{language === 'bn' ? 'চলমান' : 'Next Page ➔'}</span>
              </div>
            </div>

            {/* Sheet 1 BACK: What I Do */}
            <div className="book-page-back p-8 flex flex-col justify-between text-zinc-800 relative">
              <div className="gutter-shading-left" />
              
              {/* Title */}
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

              {/* Service Cards */}
              <div className="my-auto space-y-4">
                {/* Card 1 */}
                <div className="p-4 bg-[#f9fbf9] border border-zinc-200 rounded-xl shadow-sm hover:border-[#0b5a43] hover:-translate-y-0.5 transition-all duration-200">
                  <h4 className="text-xs font-black text-[#0b5a43] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#0b5a43] rounded-full inline-block" />
                    Web Development
                  </h4>
                  <p className="text-zinc-600 text-[11px] leading-relaxed">
                    Building responsive, fast, and accessible websites using modern frameworks.
                  </p>
                </div>

                {/* Card 2 */}
                <div className="p-4 bg-[#f9fbf9] border border-zinc-200 rounded-xl shadow-sm hover:border-[#0b5a43] hover:-translate-y-0.5 transition-all duration-200">
                  <h4 className="text-xs font-black text-[#0b5a43] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#0b5a43] rounded-full inline-block" />
                    Interface Design
                  </h4>
                  <p className="text-zinc-600 text-[11px] leading-relaxed">
                    Crafting intuitive layouts and visually stunning interfaces for web and mobile.
                  </p>
                </div>
              </div>

              {/* Page Number */}
              <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Page 3</span>
                <button 
                  onClick={() => setActiveSheet(2)}
                  className="text-[10px] text-[#0b5a43] hover:text-[#073829] font-black uppercase tracking-widest flex items-center gap-1"
                >
                  {language === 'bn' ? 'লগইন করুন' : 'Sign In'} <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* SHEET 2 (The Real Authentication Forms / Get In Touch Form) */}
          <div 
            className="book-sheet-3d"
            style={{ 
              transform: activeSheet > 2 ? 'rotateY(-180deg)' : 'rotateY(0deg)',
              zIndex: activeSheet > 2 ? 30 : 20,
              pointerEvents: activeSheet === 2 || activeSheet === 3 ? 'auto' : 'none'
            }}
          >
            {/* Sheet 2 FRONT: Real Auth Portal Form */}
            <div className="book-page-front p-6 flex flex-col justify-between text-zinc-800 relative">
              <div className="gutter-shading-right" />
              
              {/* Header */}
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-lg font-black text-zinc-950 flex items-center gap-2">
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

              {/* Form Content area (scrollable if needed) */}
              <div className="flex-1 overflow-y-auto custom-book-scroll pr-1 py-4 space-y-4 max-h-[350px]">
                
                {/* Firebase Authentication Forms */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  
                  {mode === 'signup' && (
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#0b5a43] transition-colors" size={14} />
                      <input
                        type="text"
                        placeholder={language === 'bn' ? 'আপনার নাম' : 'Full Name'}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full pl-10 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0b5a43]/10 focus:border-[#0b5a43] transition-all text-xs font-medium"
                      />
                    </div>
                  )}

                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#0b5a43] transition-colors" size={14} />
                    <input
                      type="email"
                      placeholder={language === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isOtpSent && mode === 'otp'}
                      className="w-full pl-10 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0b5a43]/10 focus:border-[#0b5a43] transition-all text-xs font-medium disabled:opacity-50"
                    />
                  </div>

                  {mode === 'otp' && isOtpSent && (
                    <div className="space-y-2">
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#0b5a43] transition-colors" size={14} />
                        <input
                          type="text"
                          placeholder="Code"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                          required
                          maxLength={6}
                          className="w-full pl-10 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0b5a43]/10 focus:border-[#0b5a43] text-center font-bold tracking-[0.3em] text-sm text-[#0b5a43]"
                        />
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] text-zinc-400 uppercase font-bold">Enter 6-digit OTP</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOtpSent(false);
                            setOtp('');
                          }}
                          className="text-[9px] text-[#0b5a43] hover:underline font-bold uppercase"
                        >
                          {language === 'bn' ? 'ইমেইল বদলান' : 'Change Email'}
                        </button>
                      </div>
                    </div>
                  )}

                  {mode !== 'forgot' && mode !== 'otp' && (
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#0b5a43] transition-colors" size={14} />
                      <input
                        type="password"
                        placeholder={language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-10 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0b5a43]/10 focus:border-[#0b5a43] transition-all text-xs font-medium"
                      />
                      {mode === 'login' && (
                        <div className="flex justify-end mt-1.5">
                          <button
                            type="button"
                            onClick={() => setMode('forgot')}
                            className="text-[9px] text-[#0b5a43] hover:underline font-bold uppercase tracking-wider"
                          >
                            {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error & Success alerts */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-[11px] leading-relaxed animate-fade-in">
                      <AlertCircle className="shrink-0 mt-0.5" size={13} />
                      <div className="flex-1">
                        <span>{error}</span>
                        {(showRedirectHelp || isIframe) && (
                          <button 
                            type="button" 
                            onClick={() => window.open(window.location.href, '_blank')}
                            className="block mt-2 bg-[#0b5a43] text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-[#073829] transition-colors cursor-pointer text-center w-full shadow-sm"
                          >
                            {language === 'bn' ? 'নতুন ট্যাবে অ্যাপ খুলুন ↗' : 'Open in New Tab ↗'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 text-emerald-600 text-[11px] bg-emerald-50 p-3 rounded-xl border border-emerald-100 font-medium">
                      <CheckCircle2 size={13} className="shrink-0" />
                      <span>{success}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-[#0b5a43] hover:bg-[#073829] active:scale-[0.98] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-70"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <>
                        {mode === 'login' 
                          ? (language === 'bn' ? 'লগইন করুন' : 'Sign In') 
                          : mode === 'signup' 
                            ? (language === 'bn' ? 'সাইন আপ' : 'Sign Up')
                            : mode === 'otp'
                              ? (isOtpSent ? (language === 'bn' ? 'যাচাই করুন' : 'Verify') : (language === 'bn' ? 'ওটিপি পাঠান' : 'Send OTP'))
                              : (language === 'bn' ? 'লিঙ্ক পাঠান' : 'Send Reset Link')}
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </form>

                {/* Social Login and Switch Forms */}
                {mode !== 'forgot' && (
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <div className="flex gap-2">
                      <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all text-[11px] font-bold text-zinc-700 shadow-sm"
                      >
                        <Chrome size={12} className="text-[#0b5a43]" />
                        Google
                      </button>

                      <button
                        onClick={handleFacebookSignIn}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#1877F2] hover:bg-[#166fe5] rounded-xl transition-all text-[11px] font-bold text-white shadow-sm"
                      >
                        <Facebook size={12} fill="currentColor" />
                        Facebook
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={`https://t.me/${(typeof import.meta.env.VITE_TELEGRAM_BOT_USERNAME === 'string' && import.meta.env.VITE_TELEGRAM_BOT_USERNAME.trim() !== '' && import.meta.env.VITE_TELEGRAM_BOT_USERNAME !== 'undefined') ? import.meta.env.VITE_TELEGRAM_BOT_USERNAME.replace('@', '').trim() : 'Vamshavali_bot'}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#0088cc] hover:bg-[#0077b5] rounded-xl transition-all text-[11px] font-bold text-white shadow-sm"
                      >
                        <MessageCircle size={12} />
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
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-900 hover:bg-black rounded-xl transition-all text-[11px] font-bold text-white shadow-sm"
                      >
                        <Mail size={12} />
                        {mode === 'otp' ? 'Password' : 'OTP Login'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Toggle Link */}
                <div className="text-center pt-2">
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
                    className="text-[11px] font-bold text-zinc-500 hover:text-[#0b5a43] transition-colors"
                  >
                    {mode === 'login' || mode === 'otp'
                      ? (language === 'bn' ? 'অ্যাকাউন্ট নেই? সাইন আপ করুন' : "Don't have an account? Sign up")
                      : mode === 'signup'
                        ? (language === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'Already have an account? Sign in')
                        : (language === 'bn' ? 'লগইন পেজে ফিরে যান' : 'Back to Login')}
                  </button>
                </div>

              </div>

              {/* Page Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Page 4</span>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{language === 'bn' ? 'চলমান' : 'Next ➔'}</span>
              </div>
            </div>

            {/* Sheet 2 BACK: Get In Touch (Functional Message Submission) */}
            <div className="book-page-back p-6 flex flex-col justify-between text-zinc-800 relative">
              <div className="gutter-shading-left" />
              
              {/* Title */}
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

              {/* Contact Form or Success Screen */}
              <div className="my-auto flex-1 flex flex-col justify-center min-h-[220px]">
                {contactSuccess ? (
                  <div className="space-y-3">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center space-y-3 py-4"
                    >
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
                    </motion.div>

                    {/* Explanatory notice card on success */}
                    <div className="p-2.5 bg-zinc-50 border border-zinc-200/60 rounded-xl text-[9.5px] text-zinc-500 font-medium space-y-1">
                      <div className="flex items-center gap-1 text-[#0b5a43] font-bold uppercase tracking-wider text-[9px]">
                        <MessageCircle size={10} />
                        {language === 'bn' ? 'বার্তা কোথায় জমা হলো?' : 'Where did the message go?'}
                      </div>
                      <p className="leading-normal">
                        {language === 'bn'
                          ? 'আপনার পাঠানো বার্তাটি সরাসরি ফায়ারবেস ডেটাবেজের "support_messages" কালেকশনে জমা হয়েছে। সাইটের অ্যাডমিন বা লাইভ চ্যাট উইজেট থেকে এটি সরাসরি অ্যাক্সেস ও রিপ্লাই দেওয়া যাবে।'
                          : 'The message was sent securely to your Firebase Firestore database ("support_messages" collection). You can view and reply directly from the Live Support Chat widget!'}
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
                    <div className="p-2.5 bg-zinc-100/80 border border-zinc-200/50 rounded-xl text-[9.5px] text-zinc-500 font-medium space-y-1">
                      <div className="flex items-center gap-1 text-[#0b5a43] font-bold uppercase tracking-wider text-[9px]">
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

              {/* Page Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Page 5</span>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{language === 'bn' ? 'চলমান' : 'Next ➔'}</span>
              </div>
            </div>
          </div>

          {/* SHEET 3 (Hub Credits / Rear Cover Sheet) */}
          <div 
            className="book-sheet-3d"
            style={{ 
              transform: activeSheet > 3 ? 'rotateY(-180deg)' : 'rotateY(0deg)',
              zIndex: activeSheet > 3 ? 40 : 10,
              pointerEvents: activeSheet === 3 || activeSheet === 4 ? 'auto' : 'none'
            }}
          >
            {/* Sheet 3 FRONT: Hub Summary & Quick Actions */}
            <div className="book-page-front p-8 flex flex-col justify-between text-zinc-800 relative">
              <div className="gutter-shading-right" />
              
              {/* Title */}
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

              {/* Description */}
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

              {/* Page Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Page 6</span>
                <button
                  onClick={() => setActiveSheet(0)}
                  className="text-[10px] text-[#0b5a43] hover:text-[#073829] font-black uppercase tracking-widest flex items-center gap-1"
                >
                  {language === 'bn' ? 'শুরুতে ফিরে যান' : 'Cover Page'} <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* Sheet 3 BACK: Rear Cover */}
            <div className="book-page-back book-cover-back-design flex flex-col justify-center items-center p-8 text-center relative">
              <div className="absolute inset-4 border border-[#cfa86b]/40 rounded-lg pointer-events-none" />
              
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
              </div>
            </div>
          </div>

        </div>

        {/* 3D Book Left / Right Navigation Arrow Buttons */}
        {activeSheet > 0 && (
          <button
            onClick={() => setActiveSheet(prev => Math.max(0, prev - 1))}
            className="absolute left-[-60px] top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 active:scale-90 text-white rounded-full transition-all duration-200 shadow-lg border border-white/20 hover:scale-105"
            title={language === 'bn' ? 'আগের পাতা' : 'Previous Sheet'}
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {activeSheet < 4 && (
          <button
            onClick={() => setActiveSheet(prev => Math.min(4, prev + 1))}
            className="absolute right-[-60px] top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 active:scale-90 text-white rounded-full transition-all duration-200 shadow-lg border border-white/20 hover:scale-105"
            title={language === 'bn' ? 'পরের পাতা' : 'Next Sheet'}
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </div>
  );
};
