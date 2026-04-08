export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl: string;
  videoUrl?: string;
  category?: string;
  createdAt?: any;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  shopId: string;
  shopUid: string;
  shopName: string;
  customerName: string;
  customerPhone: string;
  customerLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  items: OrderItem[];
  totalPrice: number;
  status: 'pending' | 'verified' | 'completed' | 'cancelled';
  createdAt: any;
}

export interface Shop {
  id: string;
  slug: string;
  name: string;
  owner: string;
  category: string;
  location: string;
  phone: string;
  products: any[]; // Legacy array, we'll use sub-collection now
  image: string;
  todayOffer?: string;
  uid?: string;
}

export interface Influencer {
  id: string;
  name: string;
  handle: string;
  category: string;
  followers: string;
  bio: string;
  imageUrl: string;
  coverImage?: string;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    twitter?: string;
  };
  posts: Post[];
  createdAt: any;
  uid: string;
  facebookId?: string;
  isVerified?: boolean;
}

export interface Post {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  likes: string;
  comments: string;
  caption?: string;
}


