import React from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { Shield, Lock, Eye, FileText } from 'lucide-react';

export const PrivacyPolicyPage = () => {
  const { language } = useLanguage();

  const content = {
    en: {
      title: "Privacy Policy",
      lastUpdated: "Last Updated: March 27, 2026",
      introduction: "At Barnia Digital Hub, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website.",
      sections: [
        {
          title: "Information We Collect",
          icon: <Eye className="text-brand-600" size={24} />,
          content: "We collect information that you provide directly to us, such as when you create an account, register as an influencer, or contact us for support. This may include your name, email address, and social media profiles."
        },
        {
          title: "How We Use Your Information",
          icon: <Lock className="text-brand-600" size={24} />,
          content: "We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to personalize your experience on our platform."
        },
        {
          title: "Data Security",
          icon: <Shield className="text-brand-600" size={24} />,
          content: "We implement a variety of security measures to maintain the safety of your personal information. Your data is stored securely using Firebase's industry-standard encryption."
        },
        {
          title: "Your Choices",
          icon: <FileText className="text-brand-600" size={24} />,
          content: "You can update your account information at any time by logging into your profile. You may also contact us to request the deletion of your data."
        }
      ]
    },
    bn: {
      title: "গোপনীয়তা নীতি",
      lastUpdated: "সর্বশেষ আপডেট: ২৭ মার্চ, ২০২৬",
      introduction: "বার্নিয়া ডিজিটাল হাবে, আমরা আপনার গোপনীয়তা রক্ষায় প্রতিশ্রুতিবদ্ধ। এই গোপনীয়তা নীতি ব্যাখ্যা করে যে আপনি যখন আমাদের ওয়েবসাইট পরিদর্শন করেন তখন আমরা কীভাবে আপনার তথ্য সংগ্রহ করি, ব্যবহার করি এবং সুরক্ষিত রাখি।",
      sections: [
        {
          title: "আমরা যে তথ্য সংগ্রহ করি",
          icon: <Eye className="text-brand-600" size={24} />,
          content: "আপনি যখন আমাদের কাছে সরাসরি তথ্য প্রদান করেন, যেমন আপনি যখন একটি অ্যাকাউন্ট তৈরি করেন, একজন ইনফ্লুয়েন্সার হিসেবে নিবন্ধন করেন বা সহায়তার জন্য আমাদের সাথে যোগাযোগ করেন, তখন আমরা সেই তথ্য সংগ্রহ করি। এর মধ্যে আপনার নাম, ইমেল ঠিকানা এবং সোশ্যাল মিডিয়া প্রোফাইল অন্তর্ভুক্ত থাকতে পারে।"
        },
        {
          title: "আমরা কীভাবে আপনার তথ্য ব্যবহার করি",
          icon: <Lock className="text-brand-600" size={24} />,
          content: "আমরা আমাদের পরিষেবাগুলি প্রদান, রক্ষণাবেক্ষণ এবং উন্নত করতে, আপনার সাথে যোগাযোগ করতে এবং আমাদের প্ল্যাটফর্মে আপনার অভিজ্ঞতা ব্যক্তিগতকৃত করতে সংগৃহীত তথ্য ব্যবহার করি।"
        },
        {
          title: "তথ্য নিরাপত্তা",
          icon: <Shield className="text-brand-600" size={24} />,
          content: "আমরা আপনার ব্যক্তিগত তথ্যের নিরাপত্তা বজায় রাখতে বিভিন্ন নিরাপত্তা ব্যবস্থা বাস্তবায়ন করি। আপনার তথ্য ফায়ারবেসের শিল্প-মান এনক্রিপশন ব্যবহার করে সুরক্ষিতভাবে সংরক্ষণ করা হয়।"
        },
        {
          title: "আপনার পছন্দ",
          icon: <FileText className="text-brand-600" size={24} />,
          content: "আপনি আপনার প্রোফাইলে লগ ইন করে যেকোনো সময় আপনার অ্যাকাউন্টের তথ্য আপডেট করতে পারেন। আপনি আপনার তথ্য মুছে ফেলার অনুরোধ করতে আমাদের সাথে যোগাযোগ করতে পারেন।"
        }
      ]
    }
  };

  const activeContent = language === 'bn' ? content.bn : content.en;

  return (
    <div className="min-h-screen bg-zinc-50 pt-32 pb-24">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] p-12 md:p-16 border-4 border-zinc-100 shadow-xl"
        >
          <h1 className="text-4xl md:text-5xl font-black text-zinc-900 mb-4 tracking-tight">
            {activeContent.title}
          </h1>
          <p className="text-zinc-400 font-bold text-sm uppercase tracking-widest mb-12">
            {activeContent.lastUpdated}
          </p>

          <p className="text-xl text-zinc-600 leading-relaxed mb-16 font-medium">
            {activeContent.introduction}
          </p>

          <div className="space-y-16">
            {activeContent.sections.map((section, index) => (
              <div key={index} className="flex gap-8">
                <div className="w-16 h-16 rounded-3xl bg-brand-50 flex items-center justify-center shrink-0">
                  {section.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-zinc-900 mb-4 tracking-tight">
                    {section.title}
                  </h2>
                  <p className="text-zinc-600 leading-relaxed font-medium">
                    {section.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20 pt-12 border-t border-zinc-100">
            <p className="text-zinc-500 font-medium">
              {language === 'bn' 
                ? "এই গোপনীয়তা নীতি সম্পর্কে আপনার যদি কোনো প্রশ্ন থাকে, তাহলে আমাদের সাথে যোগাযোগ করুন: info@barnia.in"
                : "If you have any questions about this Privacy Policy, please contact us at: info@barnia.in"}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
