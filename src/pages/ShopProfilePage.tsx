import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Store, MapPin, Phone, ShoppingBag, Tag, ChevronLeft, Share2, 
  MessageSquare, CheckCircle, Zap, ExternalLink
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';
import { useFirebase } from '../FirebaseContext';
import { shareContent } from '../utils';

interface Product {
  name: string;
  price: string;
}

interface Shop {
  id: string;
  name: string;
  owner: string;
  category: string;
  location: string;
  phone: string;
  products: Product[];
  image: string;
  uid?: string;
}

export const ShopProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useFirebase();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchShop = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'shops', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setShop({ id: docSnap.id, ...docSnap.data() } as Shop);
        } else {
          setError(new Error('Shop not found'));
        }
      } catch (err) {
        setError(handleFirestoreError(err, OperationType.GET, `shops/${id}`));
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-8">
          <Zap size={48} />
        </div>
        <h1 className="text-3xl font-black text-zinc-900 mb-4 tracking-tight">
          {language === 'bn' ? 'দোকান পাওয়া যায়নি' : 'Shop Not Found'}
        </h1>
        <p className="text-zinc-500 mb-10 font-medium text-center max-w-md">
          {language === 'bn' 
            ? 'দুঃখিত, আপনি যে দোকানটি খুঁজছেন তা খুঁজে পাওয়া যায়নি বা মুছে ফেলা হয়েছে।' 
            : 'Sorry, the shop you are looking for could not be found or has been removed.'}
        </p>
        <button 
          onClick={() => navigate('/bazar')}
          className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-600 transition-all flex items-center gap-3 shadow-xl"
        >
          <ChevronLeft size={20} />
          {language === 'bn' ? 'ফিরে যান' : 'Go Back'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-200/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-200/30 blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-12 relative z-10">
        <button 
          onClick={() => navigate('/bazar')}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border-4 border-zinc-200 hover:border-brand-500 hover:text-brand-600 transition-all text-xs font-bold text-zinc-600 mb-12 shadow-sm hover:shadow-md"
        >
          <ChevronLeft size={16} />
          {language === 'bn' ? 'সব দোকান' : 'All Shops'}
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] border-4 border-zinc-900 shadow-2xl overflow-hidden"
        >
          {/* Header/Cover Area */}
          <div className="h-64 relative">
            <img 
              src={shop.image} 
              alt={shop.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
              <div>
                <span className="inline-block px-4 py-1.5 bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-4 shadow-xl">
                  {shop.category}
                </span>
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">
                  {shop.name}
                </h1>
              </div>
              <button 
                onClick={() => {
                  const shareUrl = window.location.href;
                  shareContent(shop.name, `${shop.category} at Barnia Bazar. Location: ${shop.location}`, shareUrl);
                }}
                className="p-4 bg-white/20 backdrop-blur-md text-white rounded-2xl hover:bg-white/40 transition-all shadow-xl"
              >
                <Share2 size={24} />
              </button>
            </div>
          </div>

          <div className="p-8 md:p-16 relative">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-6 bg-zinc-50 rounded-3xl border-4 border-zinc-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-brand-600 shadow-sm">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Location</p>
                      <p className="text-sm font-bold text-zinc-900">{shop.location}</p>
                    </div>
                  </div>
                  <div className="p-6 bg-zinc-50 rounded-3xl border-4 border-zinc-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-brand-600 shadow-sm">
                      <Phone size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Contact</p>
                      <p className="text-sm font-bold text-zinc-900">{shop.phone}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Tag size={16} className="text-brand-600" />
                    Product Price List
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {shop.products.map((p, i) => (
                      <div 
                        key={`product-${i}`}
                        className="flex justify-between items-center p-6 bg-white rounded-3xl border-4 border-zinc-100 hover:border-brand-500 transition-all group"
                      >
                        <span className="font-bold text-zinc-700 group-hover:text-zinc-900 transition-colors">{p.name}</span>
                        <span className="text-2xl font-black text-brand-600">{p.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="p-8 bg-brand-600 rounded-[2.5rem] text-white shadow-2xl shadow-brand-600/20 relative overflow-hidden border-4 border-brand-500">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <ShoppingBag size={80} />
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-2xl font-black mb-4 tracking-tight">Visit Shop</h4>
                    <p className="text-white/80 text-sm font-medium mb-8 leading-relaxed">
                      Owner: <span className="text-white font-bold">{shop.owner}</span>
                    </p>
                    <a 
                      href={`tel:${shop.phone}`}
                      className="w-full py-4 bg-white text-brand-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center justify-center gap-3 shadow-xl"
                    >
                      <Phone size={20} />
                      Call Now
                    </a>
                  </div>
                </div>

                <div className="p-8 bg-zinc-900 rounded-[2.5rem] border-4 border-zinc-800 shadow-sm text-white">
                  <h4 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-6">Quick Actions</h4>
                  <div className="space-y-4">
                    <button 
                      onClick={() => {
                        const shareUrl = window.location.href;
                        shareContent(shop.name, `${shop.category} at Barnia Bazar.`, shareUrl);
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-brand-500 font-bold text-sm transition-all flex items-center gap-3"
                    >
                      <Share2 size={16} />
                      Share Shop
                    </button>
                    <button 
                      onClick={() => navigate('/')}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-brand-500 font-bold text-sm transition-all flex items-center gap-3"
                    >
                      <ExternalLink size={16} />
                      Main Website
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
