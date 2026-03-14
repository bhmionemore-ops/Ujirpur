import React from 'react';
import { useLanguage } from '../LanguageContext';
import { motion } from 'motion/react';
import { UserPlus, Store, Users, ArrowRight } from 'lucide-react';

export const WhyJoin = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: <UserPlus className="text-orange-600" size={32} />,
      title: t.whyJoin.influencers.title,
      description: t.whyJoin.influencers.description,
      link: "#influencers"
    },
    {
      icon: <Store className="text-orange-600" size={32} />,
      title: t.whyJoin.shops.title,
      description: t.whyJoin.shops.description,
      link: "#bazar"
    },
    {
      icon: <Users className="text-orange-600" size={32} />,
      title: t.whyJoin.community.title,
      description: t.whyJoin.community.description,
      link: "#news"
    }
  ];

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-zinc-900 mb-4"
          >
            {t.whyJoin.title}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-zinc-500 max-w-2xl mx-auto"
          >
            {t.whyJoin.subtitle}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-8 rounded-3xl bg-zinc-50 border border-zinc-100 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-4">{feature.title}</h3>
              <p className="text-zinc-500 leading-relaxed mb-6">
                {feature.description}
              </p>
              <a 
                href={feature.link}
                className="inline-flex items-center gap-2 text-orange-600 font-bold text-sm hover:gap-3 transition-all"
              >
                Learn More <ArrowRight size={16} />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
