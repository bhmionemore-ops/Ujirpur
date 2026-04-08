import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { 
  Store, MapPin, Phone, ShoppingBag, Tag, ChevronLeft, Share2, 
  MessageSquare, CheckCircle, Zap, ExternalLink, Plus, Trash2, 
  ShoppingCart, X, Map as MapIcon, Loader2, ClipboardList,
  Gift, Utensils, Edit2, Camera
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, query, where, getDocs, doc, getDoc, 
  addDoc, serverTimestamp, onSnapshot, orderBy, 
  deleteDoc, updateDoc 
} from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';
import { useFirebase } from '../FirebaseContext';
import { shareContent, getGoogleDriveImageUrl } from '../utils';
import { Product, Order, OrderItem, Shop } from '../types';
import { toast } from 'sonner';

export const ShopProfilePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, isAdmin } = useFirebase();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Cart State
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Management State
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [isEditingOffer, setIsEditingOffer] = useState(false);
  const [offerText, setOfferText] = useState('');
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    description: '',
    imageUrl: '',
    category: ''
  });

  const isOwner = user && shop && shop.uid === user.uid;

  useEffect(() => {
    if (shop) {
      setOfferText(shop.todayOffer || '');
    }
  }, [shop]);

  useEffect(() => {
    const fetchShop = async () => {
      if (!slug) return;
      try {
        const q = query(collection(db, 'shops'), where('slug', '==', slug));
        const querySnapshot = await getDocs(q);
        
        let shopData: Shop | null = null;
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          shopData = { id: docSnap.id, ...docSnap.data() } as Shop;
        } else {
          const docRef = doc(db, 'shops', slug);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            shopData = { id: docSnap.id, ...docSnap.data() } as Shop;
          }
        }

        if (shopData) {
          setShop(shopData);
          // Fetch products from sub-collection
          const productsRef = collection(db, 'shops', shopData.id, 'products');
          const productsQuery = query(productsRef, orderBy('createdAt', 'desc'));
          const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(items);
          }, (error) => {
            console.warn("Products listener error:", error);
          });

          // Fetch orders if owner
          if (user && (shopData.uid === user.uid || isAdmin)) {
            const ordersRef = collection(db, 'orders');
            const ordersQuery = query(ordersRef, where('shopId', '==', shopData.id), orderBy('createdAt', 'desc'));
            const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
              const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
              setOrders(items);
            }, (error) => {
              console.warn("Orders listener error:", error);
            });
            return () => {
              unsubProducts();
              unsubOrders();
            };
          }

          return () => unsubProducts();
        } else {
          setError(new Error('Shop not found'));
        }
      } catch (err) {
        setError(handleFirestoreError(err, OperationType.GET, `shops/${slug}`));
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, [slug, user, isAdmin]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: Number(product.price), quantity: 1 }];
    });
    toast.success(`${product.name} added to cart`);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleGetLocation = () => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGettingLocation(false);
        toast.success("Location captured successfully!");
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("Could not get your location. Please enable GPS.");
        setGettingLocation(false);
      }
    );
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || cart.length === 0) return;
    if (!location) {
      toast.error("Please provide your live location to place the order");
      return;
    }

    setIsOrdering(true);
    try {
      const orderData = {
        shopId: shop.id,
        shopUid: shop.uid,
        shopName: shop.name,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerLocation: location,
        items: cart,
        totalPrice,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      // Notify via server if needed
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order',
          data: {
            shopName: shop.name,
            customerName: customerInfo.name,
            customerPhone: customerInfo.phone,
            total: totalPrice
          }
        })
      });

      toast.success(t.shop.orderPlaced);
      setCart([]);
      setShowCart(false);
      setCustomerInfo({ name: '', phone: '' });
      setLocation(null);
    } catch (err) {
      toast.error(t.shop.orderFailed);
      console.error(err);
    } finally {
      setIsOrdering(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !isOwner) return;

    try {
      const productData = {
        ...newProduct,
        imageUrl: getGoogleDriveImageUrl(newProduct.imageUrl),
        price: Number(newProduct.price),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'shops', shop.id, 'products'), productData);
      toast.success(t.shop.productAdded);
      setShowAddProduct(false);
      setNewProduct({ name: '', price: '', description: '', imageUrl: '', category: '' });
    } catch (err) {
      toast.error(t.shop.orderFailed);
      console.error(err);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!shop || !isOwner) return;
    if (!window.confirm(t.shop.deleteConfirm)) return;

    try {
      await deleteDoc(doc(db, 'shops', shop.id, 'products', productId));
      toast.success(t.shop.productDeleted);
    } catch (err) {
      toast.error(t.shop.orderFailed);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      toast.success(`Order status updated to ${status}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleUpdateOffer = async () => {
    if (!shop || !isOwner) return;
    try {
      await updateDoc(doc(db, 'shops', shop.id), { todayOffer: offerText });
      setShop({ ...shop, todayOffer: offerText });
      setIsEditingOffer(false);
      toast.success("Today's offer updated!");
    } catch (err) {
      toast.error("Failed to update offer");
    }
  };

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
          {t.common.shopNotFound}
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
          {t.common.goBack}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 relative overflow-hidden">
      <Helmet>
        <title>{`${shop.name} | Barnia Bazar - Best ${shop.category} in Tehatta, Nadia`}</title>
        <meta name="description" content={`Visit ${shop.name} at Barnia Bazar, Tehatta. Best ${shop.category} with premium products. Contact: ${shop.phone}`} />
      </Helmet>

      {/* Cart Button */}
      {cart.length > 0 && (
        <button 
          onClick={() => setShowCart(true)}
          className="fixed bottom-8 right-8 z-[100] bg-brand-600 text-white p-6 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center gap-3"
        >
          <div className="relative">
            <ShoppingCart size={24} />
            <span className="absolute -top-2 -right-2 bg-white text-brand-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-lg">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>
          <span className="font-black uppercase tracking-widest text-sm hidden sm:block">Checkout</span>
        </button>
      )}

      <div className="max-w-6xl mx-auto px-4 pt-12 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <button 
            onClick={() => navigate('/bazar')}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border-4 border-zinc-200 hover:border-brand-500 hover:text-brand-600 transition-all text-xs font-bold text-zinc-600 shadow-sm"
          >
            <ChevronLeft size={16} />
            {t.common.allShops}
          </button>

          {isOwner && (
            <div className="flex bg-white p-1.5 rounded-2xl border-4 border-zinc-900 shadow-xl">
              <button 
                onClick={() => setActiveTab('products')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'products' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
              >
                <Tag size={16} />
                {t.shop.manageProducts}
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'orders' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
              >
                <ClipboardList size={16} />
                {t.shop.orders}
                {orders.filter(o => o.status === 'pending').length > 0 && (
                  <span className="bg-brand-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                    {orders.filter(o => o.status === 'pending').length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {isOwner && activeTab === 'orders' ? (
          <div className="space-y-8">
            <h2 className="text-4xl font-black tracking-tight flex items-center gap-4">
              <ClipboardList size={40} className="text-brand-600" />
              Recent Orders
            </h2>
            <div className="grid grid-cols-1 gap-6">
              {orders.length === 0 ? (
                <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-zinc-200 text-center">
                  <p className="text-zinc-400 font-bold">No orders yet.</p>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="bg-white rounded-[2.5rem] border-4 border-zinc-900 p-8 shadow-xl">
                    <div className="flex flex-col md:flex-row justify-between gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            order.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                            order.status === 'verified' ? 'bg-blue-100 text-blue-600' :
                            order.status === 'completed' ? 'bg-green-100 text-green-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {order.status}
                          </span>
                          <span className="text-zinc-400 text-xs font-bold">
                            {order.createdAt?.toDate().toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-2xl font-black">{order.customerName}</h3>
                        <div className="flex items-center gap-4">
                          <a href={`tel:${order.customerPhone}`} className="flex items-center gap-2 text-brand-600 font-bold hover:underline">
                            <Phone size={16} />
                            {order.customerPhone}
                          </a>
                          <a 
                            href={`https://www.google.com/maps?q=${order.customerLocation.lat},${order.customerLocation.lng}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-zinc-500 font-bold hover:text-brand-600 transition-colors"
                          >
                            <MapIcon size={16} />
                            View Live Location
                          </a>
                        </div>
                      </div>

                      <div className="flex-1 max-w-md">
                        <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Order Items</p>
                          <div className="space-y-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="font-bold text-zinc-700">{item.quantity}x {item.name}</span>
                                <span className="font-black">₹{item.price * item.quantity}</span>
                              </div>
                            ))}
                            <div className="pt-4 border-t border-zinc-200 flex justify-between">
                              <span className="font-black uppercase text-xs">Total</span>
                              <span className="font-black text-brand-600 text-lg">₹{order.totalPrice}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Actions</p>
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'verified')}
                          className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
                        >
                          Verify Order
                        </button>
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className="px-6 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all"
                        >
                          Mark Completed
                        </button>
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                          className="px-6 py-2 bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-200 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Shop Header */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[3rem] border-4 border-zinc-900 shadow-2xl overflow-hidden"
            >
              <div className="h-64 relative">
                <img 
                  src={getGoogleDriveImageUrl(shop.image)} 
                  alt={shop.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                  <div>
                    <span className="inline-block px-4 py-1.5 bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-4 shadow-xl flex items-center gap-2">
                      {shop.category === 'Restaurant' ? <Utensils size={12} /> : <Store size={12} />}
                      {shop.category === 'Restaurant' ? t.bazar.restaurant : shop.category}
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">
                      {shop.name}
                    </h1>
                  </div>
                  <button 
                    onClick={() => shareContent(shop.name, `${shop.category} at Barnia Bazar.`, window.location.href)}
                    className="p-4 bg-white/20 backdrop-blur-md text-white rounded-2xl hover:bg-white/40 transition-all shadow-xl"
                  >
                    <Share2 size={24} />
                  </button>
                </div>
              </div>

              <div className="p-8 md:p-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-brand-600">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Location</p>
                      <p className="text-sm font-bold">{shop.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-brand-600">
                      <Phone size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Contact</p>
                      <p className="text-sm font-bold">{shop.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-brand-600">
                      <ShoppingBag size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Products</p>
                      <p className="text-sm font-bold">{products.length} Items Available</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Today's Offer Section */}
            {(shop.todayOffer || isOwner) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-brand-600 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-brand-600/20"
              >
                <div className="absolute top-0 right-0 p-12 opacity-10">
                  <Gift size={150} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Gift className="text-white" size={32} />
                      <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">{t.bazar.todayOffer}</h2>
                    </div>
                    {isOwner && (
                      <button 
                        onClick={() => setIsEditingOffer(!isEditingOffer)}
                        className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
                      >
                        <Edit2 size={20} />
                      </button>
                    )}
                  </div>
                  
                  {isEditingOffer ? (
                    <div className="space-y-4">
                      <textarea
                        value={offerText}
                        onChange={(e) => setOfferText(e.target.value)}
                        className="w-full bg-white/10 border-2 border-white/20 rounded-2xl p-6 text-white placeholder-white/50 focus:border-white/40 outline-none transition-all"
                        placeholder={t.bazar.offerPlaceholder}
                        rows={3}
                      />
                      <div className="flex gap-4">
                        <button 
                          onClick={handleUpdateOffer}
                          className="px-8 py-3 bg-white text-brand-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-zinc-100 transition-all"
                        >
                          Save Offer
                        </button>
                        <button 
                          onClick={() => setIsEditingOffer(false)}
                          className="px-8 py-3 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white/20 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xl md:text-2xl font-bold leading-tight max-w-2xl">
                      {shop.todayOffer || (isOwner ? "Add a special offer for your customers today!" : "")}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Product Section */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black tracking-tight flex items-center gap-4">
                  <ShoppingBag size={40} className="text-brand-600" />
                  {shop.category === 'Restaurant' ? t.bazar.menu : 'Our Products'}
                </h2>
                {isOwner && (
                  <button 
                    onClick={() => setShowAddProduct(true)}
                    className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-600 transition-all flex items-center gap-3 shadow-xl"
                  >
                    <Plus size={20} />
                    Add Product
                  </button>
                )}
              </div>

              {products.length === 0 ? (
                <div className="bg-white p-32 rounded-[3rem] border-4 border-dashed border-zinc-200 text-center">
                  <ShoppingBag size={64} className="text-zinc-200 mx-auto mb-6" />
                  <p className="text-zinc-400 font-bold text-xl">No products listed yet.</p>
                  {isOwner && <p className="text-zinc-500 mt-2">Start adding products to your shop!</p>}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {products.map(product => (
                    <motion.div 
                      key={product.id}
                      whileHover={{ y: -10 }}
                      className="bg-white rounded-[2.5rem] border-4 border-zinc-100 p-6 shadow-sm hover:shadow-2xl hover:shadow-brand-500/10 transition-all group flex flex-col"
                    >
                      <div className="aspect-square rounded-3xl overflow-hidden mb-6 relative">
                        <img 
                          src={getGoogleDriveImageUrl(product.imageUrl)} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                          onError={(e) => (e.currentTarget.src = 'https://picsum.photos/seed/product/400/400')}
                        />
                        {isOwner && (
                          <button 
                            onClick={() => handleDeleteProduct(product.id)}
                            className="absolute top-4 right-4 p-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-all shadow-xl"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                      <h3 className="text-2xl font-black text-zinc-900 mb-2">{product.name}</h3>
                      <p className="text-zinc-500 text-sm mb-6 line-clamp-2 flex-1">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-black text-brand-600">₹{product.price}</span>
                        <button 
                          onClick={() => addToCart(product)}
                          className="bg-zinc-900 text-white p-4 rounded-2xl hover:bg-brand-600 transition-all shadow-lg group-hover:scale-110"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddProduct && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddProduct(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border-4 border-brand-500"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black">Add New Product</h3>
                  <button onClick={() => setShowAddProduct(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleAddProduct} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Product Name</label>
                    <input
                      required
                      type="text"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-brand-500 outline-none transition-all"
                      placeholder="e.g. Fresh Tomatoes"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Price (₹)</label>
                      <input
                        required
                        type="number"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-brand-500 outline-none transition-all"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Category</label>
                      <input
                        type="text"
                        value={newProduct.category}
                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                        className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-brand-500 outline-none transition-all"
                        placeholder="e.g. Vegetables"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Description</label>
                    <textarea
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-brand-500 outline-none transition-all h-24 resize-none"
                      placeholder="Tell customers about this product..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Image URL (Google Drive/PostImg)</label>
                    <input
                      required
                      type="text"
                      value={newProduct.imageUrl}
                      onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-brand-500 outline-none transition-all"
                      placeholder="Paste image link here"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-brand-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-200"
                  >
                    Add Product to Shop
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart/Order Modal */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border-4 border-zinc-900"
            >
              <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                {/* Cart Items */}
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-zinc-100">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black">Your Cart</h3>
                    <button onClick={() => setShowCart(false)} className="md:hidden p-2 hover:bg-zinc-100 rounded-full">
                      <X size={24} />
                    </button>
                  </div>
                  <div className="space-y-6">
                    {cart.map(item => (
                      <div key={item.productId} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl">
                        <div className="flex-1">
                          <h4 className="font-bold text-zinc-900">{item.name}</h4>
                          <p className="text-brand-600 font-black">₹{item.price}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-zinc-200">
                          <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:text-brand-600"><Trash2 size={16} /></button>
                          <span className="font-black w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:text-brand-600"><Plus size={16} /></button>
                        </div>
                        <button onClick={() => removeFromCart(item.productId)} className="text-zinc-300 hover:text-red-500 transition-colors">
                          <X size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 pt-8 border-t border-zinc-100">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Subtotal</span>
                      <span className="text-3xl font-black text-brand-600">₹{totalPrice}</span>
                    </div>
                  </div>
                </div>

                {/* Checkout Form */}
                <div className="w-full md:w-80 bg-zinc-50 p-8">
                  <div className="hidden md:flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black">Checkout</h3>
                    <button onClick={() => setShowCart(false)} className="p-2 hover:bg-zinc-200 rounded-full">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={handlePlaceOrder} className="space-y-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Your Name</label>
                      <input
                        required
                        type="text"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                        className="w-full p-4 rounded-2xl bg-white border border-zinc-200 focus:border-brand-500 outline-none transition-all"
                        placeholder="Full Name"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Mobile Number</label>
                      <input
                        required
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                        className="w-full p-4 rounded-2xl bg-white border border-zinc-200 focus:border-brand-500 outline-none transition-all"
                        placeholder="+91 00000 00000"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Live Location</label>
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={gettingLocation}
                        className={`w-full p-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 transition-all ${
                          location 
                            ? 'bg-green-50 border-green-500 text-green-600' 
                            : 'bg-white border-zinc-200 text-zinc-500 hover:border-brand-500 hover:text-brand-600'
                        }`}
                      >
                        {gettingLocation ? <Loader2 size={20} className="animate-spin" /> : <MapIcon size={20} />}
                        <span className="font-bold text-sm">
                          {location ? 'Location Captured' : 'Share Live Location'}
                        </span>
                      </button>
                      <p className="text-[10px] text-zinc-400 font-medium text-center italic">
                        * Required for delivery verification
                      </p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-6">
                      <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                        ⚠️ No online payment. Pay at shop during collection.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={isOrdering || !location}
                      className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isOrdering ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Place Order'}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
