import React, { useState, useEffect } from 'react';
import { Store, Plus, Search, Tag, Phone, MapPin, X, ShoppingBag, Share2, Camera, LogIn, CheckCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { useTracking } from '../TrackingContext';
import { shareContent } from '../utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '../FirebaseContext';

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

export const BarniaBazar = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { logEvent } = useTracking();
  const { user, signIn, isAdmin, setAuthModalOpen } = useFirebase();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [showAddShop, setShowAddShop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const [newShop, setNewShop] = useState({
    name: '',
    owner: '',
    category: 'Grocery',
    location: '',
    phone: '',
    imageUrl: '',
    products: [{ name: '', price: '' }]
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  if (error) throw error;

  const myShop = user ? shops.find(s => s.uid === user.uid) : null;

  useEffect(() => {
    if (showAddShop && user) {
      if (myShop && !editingId) {
        setEditingId(myShop.id);
        setNewShop({
          name: myShop.name,
          owner: myShop.owner,
          category: myShop.category,
          location: myShop.location,
          phone: myShop.phone,
          imageUrl: myShop.image,
          products: myShop.products.length > 0 ? myShop.products : [{ name: '', price: '' }]
        });
      } else if (!newShop.name && !editingId) {
        setNewShop(prev => ({ ...prev, owner: user.displayName || '' }));
      }
    } else if (!showAddShop) {
      setEditingId(null);
      setNewShop({
        name: '',
        owner: '',
        category: 'Grocery',
        location: '',
        phone: '',
        imageUrl: '',
        products: [{ name: '', price: '' }]
      });
    }
  }, [showAddShop, user, myShop]);

  useEffect(() => {
    if (shops.length > 0) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      const structuredData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": shops.map((shop, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "LocalBusiness",
            "name": shop.name,
            "image": shop.image,
            "telephone": shop.phone,
            "address": {
              "@type": "PostalAddress",
              "addressLocality": shop.location,
              "addressRegion": "West Bengal",
              "addressCountry": "IN"
            }
          }
        }))
      };
      script.text = JSON.stringify(structuredData);
      document.head.appendChild(script);
      return () => {
        const existingScript = document.querySelector('script[type="application/ld+json"]');
        if (existingScript && existingScript.textContent?.includes('LocalBusiness')) {
          document.head.removeChild(existingScript);
        }
      };
    }
  }, [shops]);

  useEffect(() => {
    logEvent('view_bazar');
    const q = query(collection(db, 'shops'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Shop[];
      setShops(items);
      setLoading(false);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'shops');
      } catch (e) {
        setError(e as Error);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDeleteShop = async (shopId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(shopId);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'shops', confirmDelete));
      setConfirmDelete(null);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `shops/${confirmDelete}`);
      } catch (e) {
        setError(e as Error);
      }
    }
  };

  const handleAddProduct = () => {
    setNewShop({
      ...newShop,
      products: [...newShop.products, { name: '', price: '' }]
    });
  };

  const handleProductChange = (index: number, field: 'name' | 'price', value: string) => {
    const updatedProducts = [...newShop.products];
    updatedProducts[index][field] = value;
    setNewShop({ ...newShop, products: updatedProducts });
  };

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const filteredProducts = newShop.products.filter(p => p.name.trim() !== '' && p.price.trim() !== '');
    
    const shopData: any = {
      name: newShop.name,
      owner: newShop.owner,
      category: newShop.category,
      location: newShop.location,
      phone: newShop.phone,
      image: newShop.imageUrl || `https://picsum.photos/seed/${Math.random()}/400/300`,
      products: filteredProducts,
      uid: user.uid
    };

    try {
      if (editingId) {
        const { updateDoc, doc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'shops', editingId), {
          ...shopData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'shops'), {
          ...shopData,
          createdAt: serverTimestamp()
        });
      }
      setIsRegistered(true);
      
      setTimeout(() => {
        setIsRegistered(false);
        setShowAddShop(false);
        setEditingId(null);
        setNewShop({
          name: '',
          owner: '',
          category: 'Grocery',
          location: '',
          phone: '',
          imageUrl: '',
          products: [{ name: '', price: '' }]
        });
      }, 3000);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, 'shops');
      } catch (e) {
        setError(e as Error);
      }
    }
  };

  const filteredShops = Array.from(new Map<string, Shop>(shops.map(shop => [shop.id, shop])).values()).filter(shop => 
    shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.products.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="relative">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-10">
        <div className="max-w-2xl">
          <p className="text-zinc-500 text-lg leading-relaxed max-w-xl">
            {t.bazar.subtitle}
          </p>
        </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative group flex-1 sm:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-600 transition-colors" size={20} />
              <input
                type="text"
                placeholder={t.bazar.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-6 py-4 rounded-2xl bg-white border border-zinc-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none w-full sm:w-80 transition-all shadow-sm"
              />
            </div>
            <button
              onClick={() => {
                if (!user) {
                  setAuthModalOpen(true);
                } else {
                  setShowAddShop(!showAddShop);
                }
              }}
              className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-600 hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-xl shadow-zinc-900/10 group"
            >
              {user ? (myShop ? <Store size={20} className="group-hover:scale-110 transition-transform" /> : <Plus size={20} className="group-hover:rotate-90 transition-transform" />) : <LogIn size={20} />}
              {user ? (myShop ? (language === 'bn' ? 'দোকান এডিট করুন' : 'Edit My Shop') : t.bazar.register) : (language === 'bn' ? 'লগইন করুন' : 'Login to Register')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-brand-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-brand-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-zinc-400 font-black uppercase tracking-widest text-xs animate-pulse">
              {language === 'bn' ? 'দোকান লোড হচ্ছে...' : 'Loading shops...'}
            </p>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-zinc-100 shadow-sm">
            <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <ShoppingBag className="text-zinc-300" size={48} />
            </div>
            <h3 className="text-3xl font-black text-zinc-900 mb-4 tracking-tight">
              {language === 'bn' ? 'কোন দোকান পাওয়া যায়নি' : 'No shops found'}
            </h3>
            <p className="text-zinc-500 max-w-md mx-auto">
              {searchQuery ? (language === 'bn' ? 'আপনার অনুসন্ধানের সাথে মেলে এমন কিছু পাওয়া যায়নি' : 'Try adjusting your search query') : (language === 'bn' ? 'প্রথম দোকানটি নথিভুক্ত করুন!' : 'Be the first to register a shop!')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredShops.map((shop) => (
              <motion.div
                layoutId={shop.id}
                key={shop.id}
                whileHover={{ y: -10 }}
                className="group bg-white rounded-[2.5rem] border-4 border-zinc-100 shadow-sm hover:shadow-2xl hover:shadow-brand-500/10 transition-all overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] overflow-hidden relative cursor-pointer" onClick={() => {
                  setSelectedShop(shop);
                  logEvent('view_shop', { shopId: shop.id, shopName: shop.name });
                }}>
                  <img
                    src={shop.image}
                    alt={shop.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="absolute top-6 left-6 flex gap-2">
                    <span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-brand-600 uppercase tracking-widest shadow-xl">
                      {shop.category}
                    </span>
                  </div>
                  
                  {(isAdmin || (user && shop.uid === user.uid)) && (
                    <button
                      onClick={(e) => handleDeleteShop(shop.id, e)}
                      className="absolute top-6 right-6 p-3 bg-red-500/90 backdrop-blur-md text-white rounded-2xl hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-xl"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                
                <div className="p-10 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-3xl font-black text-zinc-900 cursor-pointer group-hover:text-brand-600 transition-colors tracking-tight leading-tight" onClick={() => setSelectedShop(shop)}>
                      {shop.name}
                    </h3>
                    <button 
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/shop/${shop.id}`;
                        shareContent(shop.name, `${shop.category} at Barnia Bazar. Location: ${shop.location}`, shareUrl);
                      }}
                      className="p-3 text-zinc-400 hover:text-brand-600 hover:bg-brand-50 rounded-2xl transition-all"
                    >
                      <Share2 size={20} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 text-zinc-500 text-sm mb-6 font-medium">
                    <div className="w-8 h-8 rounded-xl bg-zinc-50 flex items-center justify-center text-brand-600">
                      <MapPin size={16} />
                    </div>
                    <span>{shop.location}</span>
                  </div>

                  <button 
                    onClick={() => {
                      navigate(`/shop/${shop.id}`);
                      logEvent('view_shop_profile', { shopId: shop.id, shopName: shop.name });
                    }}
                    className="w-full py-3 mb-6 bg-zinc-100 text-zinc-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={14} />
                    {language === 'bn' ? 'দোকান দেখুন' : 'View Shop'}
                  </button>
                  
                  <div className="space-y-4 mt-auto">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t.bazar.prices}</p>
                      <div className="h-px flex-1 bg-zinc-50 mx-4"></div>
                    </div>
                    {shop.products.slice(0, 2).map((p, i) => (
                      <div key={`shop-${shop.id}-p-${i}`} className="flex justify-between items-center p-4 rounded-2xl bg-zinc-50/50 border border-zinc-100/50 group-hover:bg-white group-hover:border-brand-100 transition-all">
                        <span className="text-zinc-600 font-bold text-sm">{p.name}</span>
                        <span className="font-black text-brand-600">{p.price}</span>
                      </div>
                    ))}
                    
                    {shop.products.length > 2 && (
                      <button 
                        onClick={() => setSelectedShop(shop)}
                        className="w-full py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-brand-600 transition-colors"
                      >
                        + {shop.products.length - 2} More Products
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {confirmDelete && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X size={32} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">
                  {language === 'bn' ? 'দোকানটি মুছে ফেলবেন?' : 'Delete Shop?'}
                </h3>
                <p className="text-zinc-500 mb-8">
                  {language === 'bn' ? 'আপনি কি নিশ্চিত যে আপনি এই দোকানটি মুছে ফেলতে চান? এই কাজটি আর ফেরানো যাবে না।' : 'Are you sure you want to delete this shop? This action cannot be undone.'}
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-all"
                  >
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    onClick={confirmDeleteAction}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                  >
                    {language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showAddShop && user && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddShop(false)}
                className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-y-auto max-h-[90vh] custom-scrollbar border-4 border-brand-500"
              >
                <div className="p-8">
                  {isRegistered ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle size={32} />
                      </div>
                      <h3 className="text-2xl font-bold text-zinc-900 mb-2">{t.bazar.success}</h3>
                      <p className="text-zinc-500">Your shop has been added to Barnia Bazar!</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold">Register Your Shop</h3>
                        <button onClick={() => setShowAddShop(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                          <X size={24} />
                        </button>
                      </div>

                      <form onSubmit={handleAddShop} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Shop Name</label>
                            <input
                              required
                              type="text"
                              value={newShop.name}
                              onChange={(e) => setNewShop({ ...newShop, name: e.target.value })}
                              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Owner Name</label>
                            <input
                              required
                              type="text"
                              value={newShop.owner}
                              onChange={(e) => setNewShop({ ...newShop, owner: e.target.value })}
                              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Category</label>
                            <select
                              value={newShop.category}
                              onChange={(e) => setNewShop({ ...newShop, category: e.target.value })}
                              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none"
                            >
                              <option>Grocery</option>
                              <option>Stationery</option>
                              <option>Medicine</option>
                              <option>Electronics</option>
                              <option>Clothing</option>
                              <option>Other</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Phone Number</label>
                            <input
                              required
                              type="tel"
                              value={newShop.phone}
                              onChange={(e) => setNewShop({ ...newShop, phone: e.target.value })}
                              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-500 uppercase">Location</label>
                          <input
                            required
                            type="text"
                            value={newShop.location}
                            onChange={(e) => setNewShop({ ...newShop, location: e.target.value })}
                            className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="e.g. Near Barnia Station"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-500 uppercase">{t.bazar.imageLabel}</label>
                          <div className="flex gap-4 items-center">
                            <div className="w-16 h-12 rounded-lg bg-zinc-100 flex-shrink-0 overflow-hidden border border-zinc-200">
                              {newShop.imageUrl ? (
                                <img 
                                  src={newShop.imageUrl} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => (e.currentTarget.src = 'https://picsum.photos/200')}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                  <Camera size={20} />
                                </div>
                              )}
                            </div>
                            <input
                              type="text"
                              value={newShop.imageUrl}
                              onChange={(e) => setNewShop({ ...newShop, imageUrl: e.target.value })}
                              className="flex-1 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none"
                              placeholder={t.bazar.imagePlaceholder}
                            />
                          </div>
                        </div>

                        <div className="bg-zinc-50 p-4 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-zinc-500 uppercase">{t.bazar.productLabel}</p>
                            <button 
                              type="button"
                              onClick={handleAddProduct}
                              className="text-brand-600 hover:text-brand-700 p-1 rounded-lg hover:bg-brand-50 transition-all"
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {newShop.products.map((product, index) => (
                              <div key={`new-p-${index}`} className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  placeholder={t.bazar.productNamePlaceholder}
                                  value={product.name}
                                  onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                                  className="w-full p-2 text-sm rounded-lg border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                                />
                                <input
                                  type="text"
                                  placeholder={t.bazar.productPricePlaceholder}
                                  value={product.price}
                                  onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                                  className="w-full p-2 text-sm rounded-lg border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                                />
                              </div>
                            ))}
                          </div>
                          <button 
                            type="button"
                            onClick={handleAddProduct}
                            className="w-full py-2 border-2 border-dashed border-zinc-200 rounded-xl text-xs font-bold text-zinc-400 hover:border-brand-200 hover:text-brand-600 transition-all flex items-center justify-center gap-2"
                          >
                            <Plus size={14} />
                            {t.bazar.addProduct}
                          </button>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-brand-600 text-white py-4 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-200"
                        >
                          {editingId ? (language === 'bn' ? 'আপডেট করুন' : 'Update Shop') : (language === 'bn' ? 'দোকান প্রকাশ করুন' : 'Register Shop')}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Shop Details Modal */}
        <AnimatePresence>
          {selectedShop && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedShop(null)}
                className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
              />
              <motion.div
                layoutId={selectedShop.id}
                className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-y-auto max-h-[90vh] custom-scrollbar border-4 border-zinc-900"
              >
                <div className="h-48 relative">
                  <img
                    src={selectedShop.image}
                    alt={selectedShop.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    onClick={() => setSelectedShop(null)}
                    className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">{selectedShop.category}</span>
                      <h3 className="text-3xl font-bold text-zinc-900">{selectedShop.name}</h3>
                      <p className="text-zinc-500">Owner: {selectedShop.owner}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-zinc-600 mb-1">
                        <Phone size={16} className="text-brand-600" />
                        <span className="font-bold">{selectedShop.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500 text-sm">
                        <MapPin size={16} className="text-brand-600" />
                        <span>{selectedShop.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <Tag size={20} className="text-brand-600" />
                      Product Price List
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedShop.products.map((p, i) => (
                        <div key={`sel-${selectedShop.id}-p-${i}`} className="flex justify-between items-center p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <span className="font-medium text-zinc-700">{p.name}</span>
                          <span className="text-lg font-bold text-brand-600">{p.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4 mt-8">
                    <a 
                      href={`tel:${selectedShop.phone}`}
                      onClick={() => logEvent('call_shop', { shopId: selectedShop.id, shopName: selectedShop.name })}
                      className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                    >
                      <Phone size={20} />
                      {language === 'bn' ? 'কল করুন' : 'Call Owner'}
                    </a>
                    <button 
                      onClick={() => navigate(`/shop/${selectedShop.id}`)}
                      className="flex-1 bg-brand-600 text-white py-4 rounded-2xl font-bold hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink size={20} />
                      {language === 'bn' ? 'প্রোফাইল' : 'Full Profile'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </div>
  );
};
