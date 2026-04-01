import React from 'react';
import { motion } from 'motion/react';
import { Facebook, CheckCircle, Shield, Globe, ArrowRight, ExternalLink, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';

export const FacebookVerificationPage = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-50 pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border-4 border-zinc-200 hover:border-brand-500 hover:text-brand-600 transition-all text-xs font-bold text-zinc-600 mb-12 shadow-sm hover:shadow-md"
        >
          <ChevronLeft size={16} />
          {language === 'bn' ? 'ফিরে যান' : 'Go Back'}
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] border-4 border-brand-600 shadow-2xl overflow-hidden p-12"
        >
          <div className="flex items-center gap-6 mb-12">
            <div className="w-20 h-20 rounded-3xl bg-brand-50 flex items-center justify-center shadow-inner">
              <Facebook size={40} className="text-brand-600" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-2 uppercase">
                {language === 'bn' ? 'ফেসবুক ভেরিফিকেশন গাইড' : 'Facebook Verification Guide'}
              </h1>
              <p className="text-zinc-500 font-medium">Step-by-step process to verify your domain and account.</p>
            </div>
          </div>

          <div className="space-y-12">
            {/* Step 1: Domain Verification */}
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-sm">01</div>
                <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Domain Verification</h2>
              </div>
              <div className="bg-zinc-50 p-8 rounded-[2rem] border border-zinc-100 space-y-4">
                <p className="text-zinc-600 font-medium leading-relaxed">
                  To verify your domain with Meta Business Suite, you need to add a meta tag to your website's head section. 
                  We have already included the placeholder for you in the code.
                </p>
                <div className="bg-zinc-900 p-6 rounded-2xl font-mono text-xs text-brand-500 overflow-x-auto">
                  {`<meta name="facebook-domain-verification" content="YOUR_VERIFICATION_CODE" />`}
                </div>
                <div className="flex items-center gap-4 pt-4">
                  <a 
                    href="https://business.facebook.com/settings/owned-domains" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-brand-600 font-bold hover:underline text-sm"
                  >
                    Open Meta Business Settings <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </section>

            {/* Step 2: App Verification */}
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-sm">02</div>
                <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">App Review & Permissions</h2>
              </div>
              <div className="bg-zinc-50 p-8 rounded-[2rem] border border-zinc-100 space-y-6">
                <p className="text-zinc-600 font-medium leading-relaxed">
                  For advanced features like fetching user profile data or posting on behalf of users, your app needs to go through App Review.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                    <Shield size={24} className="text-brand-600 mb-4" />
                    <h4 className="font-black text-zinc-900 mb-2 uppercase text-xs tracking-widest">Public Profile</h4>
                    <p className="text-[11px] text-zinc-500 font-medium">Required for basic login and identity verification.</p>
                  </div>
                  <div className="p-6 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                    <Globe size={24} className="text-brand-600 mb-4" />
                    <h4 className="font-black text-zinc-900 mb-2 uppercase text-xs tracking-widest">Email Access</h4>
                    <p className="text-[11px] text-zinc-500 font-medium">Required to sync account details and notifications.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Step 3: Influencer Verification */}
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-sm">03</div>
                <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Influencer Badge</h2>
              </div>
              <div className="bg-zinc-50 p-8 rounded-[2rem] border border-zinc-100 space-y-4">
                <p className="text-zinc-600 font-medium leading-relaxed">
                  Once your domain is verified and your app is live, influencers can link their Facebook accounts to get the 
                  <span className="inline-flex items-center gap-1 text-blue-600 font-bold mx-1">
                    <CheckCircle size={14} /> Verified Badge
                  </span>.
                </p>
                <div className="p-6 bg-white rounded-2xl border border-zinc-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-sm font-bold text-zinc-500">Ready for Integration</p>
                  </div>
                  <button 
                    onClick={() => navigate('/influencers')}
                    className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-600 transition-all"
                  >
                    Go to Influencers <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-16 pt-12 border-t border-zinc-100 text-center">
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-[0.2em] mb-8">Need Help with Meta Business Suite?</p>
            <div className="flex flex-wrap justify-center gap-6">
              <a href="https://developers.facebook.com/docs/development/release/domain-verification" target="_blank" rel="noopener noreferrer" className="text-brand-600 font-black text-sm hover:underline flex items-center gap-2">
                Documentation <ExternalLink size={14} />
              </a>
              <a href="https://developers.facebook.com/support/" target="_blank" rel="noopener noreferrer" className="text-brand-600 font-black text-sm hover:underline flex items-center gap-2">
                Meta Support <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
