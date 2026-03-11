import React, { useState, useEffect } from 'react';
import { Store, Plus, Search, Tag, Phone, MapPin, X, ShoppingBag, Share2, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';
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
}

export const BarniaBazar = () => {
  const { t } = useLanguage();
  const [userShops, setUserShops] = useState<Shop[]>([]);
  const shops = [...t.data.shops, ...userShops];

  const [showAddShop, setShowAddShop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  const [newShop, setNewShop] = useState({
    name: '',
    owner: '',
    category: 'Grocery',
    location: '',
    phone: '',
    imageUrl: '',
    products: [{ name: '', price: '' }]
  });

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const res = await fetch('/api/shops');
      const data = await res.json();
      setUserShops(data);
    } catch (err) {
      console.error('Failed to fetch shops:', err);
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
    const filteredProducts = newShop.products.filter(p => p.name.trim() !== '' && p.price.trim() !== '');
    
    const shopData = {
      name: newShop.name,
      owner: newShop.owner,
      category: newShop.category,
      location: newShop.location,
      phone: newShop.phone,
      image: newShop.imageUrl || `https://picsum.photos/seed/${Math.random()}/400/300`,
      products: filteredProducts
    };

    try {
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shopData)
      });
      const data = await res.json();

      if (data.success) {
        setUserShops([...userShops, data.shop]);
        setShowAddShop(false);

        // Notify admin
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'chat',
            data: { 
              sender: 'System', 
              message: `New Shop Registered: ${data.shop.name} by ${data.shop.owner} in Barnia Bazar.` 
            }
          })
        }).catch(err => console.error('Failed to notify admin:', err));

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
    } catch (err) {
      console.error('Failed to save shop:', err);
    }
  };

  const filteredShops = shops.filter(shop => 
    shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.products.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="text-emerald-600" size={24} />
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{t.bazar.category}</span>
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-zinc-900">{t.bazar.title}</h2>
            <p className="text-zinc-500 mt-2">{t.bazar.subtitle}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                placeholder={t.bazar.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-64"
              />
            </div>
            <button
              onClick={() => setShowAddShop(true)}
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              {t.bazar.register}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredShops.map((shop) => (
            <motion.div
              layoutId={shop.id}
              key={shop.id}
              className="group bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-xl transition-all overflow-hidden"
            >
              <div className="aspect-video overflow-hidden relative cursor-pointer" onClick={() => setSelectedShop(shop)}>
                <img
                  src={shop.image}
                  alt={shop.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-emerald-600 uppercase tracking-wider shadow-sm">
                    {shop.category}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-xl font-bold text-zinc-900 cursor-pointer" onClick={() => setSelectedShop(shop)}>{shop.name}</h3>
                  <button 
                    onClick={() => shareContent(shop.name, `${shop.category} at Barnia Bazar. Location: ${shop.location}`)}
                    className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                  >
                    <Share2 size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-zinc-500 text-sm mb-4">
                  <MapPin size={14} />
                  <span>{shop.location}</span>
                </div>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t.bazar.prices}</p>
                  {shop.products.slice(0, 2).map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-zinc-600">{p.name}</span>
                      <span className="font-bold text-emerald-600">{p.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add Shop Modal */}
        <AnimatePresence>
          {showAddShop && (
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
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
              >
                <div className="p-8">
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
                          className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Owner Name</label>
                        <input
                          required
                          type="text"
                          value={newShop.owner}
                          onChange={(e) => setNewShop({ ...newShop, owner: e.target.value })}
                          className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Category</label>
                        <select
                          value={newShop.category}
                          onChange={(e) => setNewShop({ ...newShop, category: e.target.value })}
                          className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
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
                          className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
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
                        className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
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
                          className="flex-1 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
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
                          className="text-emerald-600 hover:text-emerald-700 p-1 rounded-lg hover:bg-emerald-50 transition-all"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {newShop.products.map((product, index) => (
                          <div key={index} className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder={t.bazar.productNamePlaceholder}
                              value={product.name}
                              onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                              className="w-full p-2 text-sm rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                            />
                            <input
                              type="text"
                              placeholder={t.bazar.productPricePlaceholder}
                              value={product.price}
                              onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                              className="w-full p-2 text-sm rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                            />
                          </div>
                        ))}
                      </div>
                      <button 
                        type="button"
                        onClick={handleAddProduct}
                        className="w-full py-2 border-2 border-dashed border-zinc-200 rounded-xl text-xs font-bold text-zinc-400 hover:border-emerald-200 hover:text-emerald-600 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={14} />
                        {t.bazar.addProduct}
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                    >
                      Register Shop
                    </button>
                  </form>
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
                className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden"
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
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{selectedShop.category}</span>
                      <h3 className="text-3xl font-bold text-zinc-900">{selectedShop.name}</h3>
                      <p className="text-zinc-500">Owner: {selectedShop.owner}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-zinc-600 mb-1">
                        <Phone size={16} className="text-emerald-600" />
                        <span className="font-bold">{selectedShop.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500 text-sm">
                        <MapPin size={16} className="text-emerald-600" />
                        <span>{selectedShop.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <Tag size={20} className="text-emerald-600" />
                      Product Price List
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedShop.products.map((p, i) => (
                        <div key={i} className="flex justify-between items-center p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <span className="font-medium text-zinc-700">{p.name}</span>
                          <span className="text-lg font-bold text-emerald-600">{p.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="w-full mt-8 bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all">
                    Contact Shop Owner
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
