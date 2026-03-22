import React from 'react';
import { useLanguage } from '../LanguageContext';
import { motion } from 'motion/react';
import { UserPlus, Store, Users, ArrowRight } from 'lucide-react';

export const WhyJoin = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: <UserPlus className="text-brand-600" size={32} />,
      title: t.whyJoin.influencers.title,
      description: t.whyJoin.influencers.description,
      link: "#influencers"
    },
    {
      icon: <Store className="text-brand-600" size={32} />,
      title: t.whyJoin.shops.title,
      description: t.whyJoin.shops.description,
      link: "#bazar"
    },
    {
      icon: <Users className="text-brand-600" size={32} />,
      title: t.whyJoin.community.title,
      description: t.whyJoin.community.description,
      link: "#bazar"
    }
  ];

  return (
    <section className="py-32 px-4 bg-white relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-100/50 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50/50 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-brand-100 text-brand-600 text-[10px] font-black uppercase tracking-widest mb-6"
          >
            Why Choose Us
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-6xl font-black text-zinc-900 mb-6 tracking-tighter"
          >
            {t.whyJoin.title}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-zinc-500 max-w-2xl mx-auto text-lg leading-relaxed"
          >
            {t.whyJoin.subtitle}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={`feature-${index}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="p-10 rounded-[2.5rem] bg-zinc-50 border border-zinc-100 hover:border-brand-200 hover:shadow-2xl hover:shadow-brand-500/10 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-500/5 to-transparent rounded-bl-[5rem] transition-all group-hover:scale-110"></div>
              
              <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center mb-8 shadow-xl shadow-zinc-200/50 group-hover:bg-brand-600 group-hover:text-white transition-all duration-500">
                {React.cloneElement(feature.icon as React.ReactElement, { 
                  className: "group-hover:text-white transition-colors duration-500",
                  size: 40
                })}
              </div>
              
              <h3 className="text-2xl font-black text-zinc-900 mb-4 tracking-tight">{feature.title}</h3>
              <p className="text-zinc-500 leading-relaxed mb-8 text-sm">
                {feature.description}
              </p>
              
              <a 
                href={feature.link}
                className="inline-flex items-center gap-3 text-brand-600 font-black text-xs uppercase tracking-widest hover:gap-5 transition-all"
              >
                Learn More <ArrowRight size={18} />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
