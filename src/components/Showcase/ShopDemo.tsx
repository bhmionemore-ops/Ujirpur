import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ShoppingBag, Heart, Share2, Play, ChevronRight, Star } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  category: string;
  rating: number;
}

const PRODUCTS: Product[] = [
  { id: '1', name: 'Silk Evening Gown', price: '$890', image: 'https://picsum.photos/seed/gown1/800/1200', category: 'Evening Wear', rating: 4.9 },
  { id: '2', name: 'Velvet Blazer', price: '$450', image: 'https://picsum.photos/seed/blazer1/800/1200', category: 'Outerwear', rating: 4.8 },
  { id: '3', name: 'Cashmere Scarf', price: '$120', image: 'https://picsum.photos/seed/scarf1/800/1200', category: 'Accessories', rating: 5.0 },
  { id: '4', name: 'Leather Boots', price: '$340', image: 'https://picsum.photos/seed/boots1/800/1200', category: 'Footwear', rating: 4.7 },
];

export const ShopDemo = ({ onClose }: { onClose: () => void }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-luxury-black/95 backdrop-blur-xl overflow-y-auto"
    >
      <div className="min-h-screen p-6 md:p-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-luxury-gold flex items-center justify-center">
              <ShoppingBag className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-white font-serif text-2xl">The Model Shop</h2>
              <p className="text-zinc-500 text-xs font-mono tracking-widest uppercase">Premium Collection Demo</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-24">
          <div className="relative aspect-[4/5] rounded-[40px] overflow-hidden group">
            <img 
              src="https://picsum.photos/seed/fashion-hero/1200/1500" 
              alt="Hero" 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-luxury-black/60 to-transparent" />
            <div className="absolute bottom-12 left-12">
              <span className="text-luxury-gold font-mono text-xs tracking-widest uppercase mb-4 block">New Season</span>
              <h3 className="text-5xl text-white font-serif mb-6 leading-tight">Elegance in <br /> <span className="italic">Every Thread</span></h3>
              <button className="px-8 py-4 bg-white text-luxury-black rounded-full font-bold text-sm hover:bg-luxury-gold hover:text-white transition-all flex items-center gap-2">
                Explore Collection <ChevronRight size={18} />
              </button>
            </div>
            <div className="absolute top-12 right-12">
              <button className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:scale-110 transition-all">
                <Play size={24} fill="white" />
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="mb-12">
              <h4 className="text-luxury-gold font-mono text-xs tracking-widest uppercase mb-4">Curated Selection</h4>
              <h3 className="text-4xl text-white font-serif mb-6">Handpicked for the <br /> Modern Aesthetic</h3>
              <p className="text-zinc-400 leading-relaxed max-w-md">
                Our model shop demo showcases how you can present your products with high-end editorial photography and seamless interactions.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {PRODUCTS.slice(0, 2).map((product) => (
                <div key={product.id} className="group cursor-pointer">
                  <div className="aspect-[3/4] rounded-3xl overflow-hidden mb-4 relative">
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all">
                      <Heart size={18} />
                    </button>
                  </div>
                  <h5 className="text-white font-serif text-lg mb-1">{product.name}</h5>
                  <p className="text-luxury-gold font-mono text-sm">{product.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="mb-24">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h4 className="text-luxury-gold font-mono text-xs tracking-widest uppercase mb-4">The Gallery</h4>
              <h3 className="text-4xl text-white font-serif">All Products</h3>
            </div>
            <div className="flex gap-4">
              {['All', 'Dresses', 'Suits', 'Accessories'].map((cat) => (
                <button key={cat} className="text-zinc-500 hover:text-white font-mono text-xs tracking-widest uppercase transition-all">
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {PRODUCTS.map((product) => (
              <motion.div 
                key={product.id}
                whileHover={{ y: -10 }}
                className="group cursor-pointer"
              >
                <div className="aspect-[3/4] rounded-[32px] overflow-hidden mb-6 relative">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-luxury-black/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <button className="px-6 py-3 bg-white text-luxury-black rounded-full font-bold text-xs">
                      Quick View
                    </button>
                  </div>
                  <div className="absolute top-6 left-6">
                    <span className="px-3 py-1 bg-luxury-gold text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                      Trending
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-white font-serif text-xl mb-1">{product.name}</h5>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-luxury-gold font-mono text-lg mb-1">{product.price}</p>
                    <div className="flex items-center gap-1 text-zinc-500 text-[10px]">
                      <Star size={10} className="fill-luxury-gold text-luxury-gold" />
                      {product.rating}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
