import React from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { FileText, UserCheck, AlertCircle, Scale } from 'lucide-react';

export const TermsOfServicePage = () => {
  const { language } = useLanguage();

  const content = {
    en: {
      title: "Terms of Service",
      lastUpdated: "Last Updated: March 27, 2026",
      introduction: "Welcome to Barnia Digital Hub. By accessing or using our website, you agree to be bound by these Terms of Service. Please read them carefully.",
      sections: [
        {
          title: "Acceptance of Terms",
          icon: <Scale className="text-brand-600" size={24} />,
          content: "By using our platform, you agree to comply with and be bound by these terms. If you do not agree, please do not use our services."
        },
        {
          title: "User Responsibilities",
          icon: <UserCheck className="text-brand-600" size={24} />,
          content: "You are responsible for maintaining the confidentiality of your account and password. You agree to provide accurate and complete information when registering."
        },
        {
          title: "Prohibited Conduct",
          icon: <AlertCircle className="text-brand-600" size={24} />,
          content: "You agree not to use the platform for any unlawful purpose or in any way that could damage, disable, or impair the website's performance."
        },
        {
          title: "Intellectual Property",
          icon: <FileText className="text-brand-600" size={24} />,
          content: "All content on this website, including text, graphics, and logos, is the property of Barnia Digital Hub and is protected by copyright laws."
        }
      ]
    },
    bn: {
      title: "পরিষেবার শর্তাবলী",
      lastUpdated: "সর্বশেষ আপডেট: ২৭ মার্চ, ২০২৬",
      introduction: "বার্নিয়া ডিজিটাল হাবে আপনাকে স্বাগতম। আমাদের ওয়েবসাইট ব্যবহার করে, আপনি এই পরিষেবার শর্তাবলী দ্বারা আবদ্ধ হতে সম্মত হন। দয়া করে সেগুলি মনোযোগ সহকারে পড়ুন।",
      sections: [
        {
          title: "শর্তাবলীর স্বীকৃতি",
          icon: <Scale className="text-brand-600" size={24} />,
          content: "আমাদের প্ল্যাটফর্ম ব্যবহার করে, আপনি এই শর্তাবলী মেনে চলতে এবং আবদ্ধ হতে সম্মত হন। আপনি যদি সম্মত না হন, তবে দয়া করে আমাদের পরিষেবাগুলি ব্যবহার করবেন না।"
        },
        {
          title: "ব্যবহারকারীর দায়িত্ব",
          icon: <UserCheck className="text-brand-600" size={24} />,
          content: "আপনি আপনার অ্যাকাউন্ট এবং পাসওয়ার্ডের গোপনীয়তা বজায় রাখার জন্য দায়ী। আপনি নিবন্ধনের সময় সঠিক এবং সম্পূর্ণ তথ্য প্রদান করতে সম্মত হন।"
        },
        {
          title: "নিষিদ্ধ আচরণ",
          icon: <AlertCircle className="text-brand-600" size={24} />,
          content: "আপনি প্ল্যাটফর্মটি কোনো বেআইনি উদ্দেশ্যে বা ওয়েবসাইটের কার্যকারিতা ক্ষতিগ্রস্ত করতে পারে এমন কোনো উপায়ে ব্যবহার না করতে সম্মত হন।"
        },
        {
          title: "মেধা সম্পত্তি",
          icon: <FileText className="text-brand-600" size={24} />,
          content: "এই ওয়েবসাইটের সমস্ত বিষয়বস্তু, যার মধ্যে টেক্সট, গ্রাফিক্স এবং লোগো অন্তর্ভুক্ত রয়েছে, বার্নিয়া ডিজিটাল হাবের সম্পত্তি এবং কপিরাইট আইন দ্বারা সুরক্ষিত।"
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
                ? "এই পরিষেবার শর্তাবলী সম্পর্কে আপনার যদি কোনো প্রশ্ন থাকে, তাহলে আমাদের সাথে যোগাযোগ করুন: info@barnia.in"
                : "If you have any questions about these Terms of Service, please contact us at: info@barnia.in"}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
