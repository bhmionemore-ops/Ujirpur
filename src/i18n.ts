export type Language = 'bn' | 'en';

export const translations = {
  bn: {
    nav: {
      news: 'খবর',
      bazar: 'বাজার',
      influencers: 'ইনফ্লুয়েন্সার',
      collab: 'সহযোগিতা',
    },
    banner: {
      title: 'উজিরপুর বার্নিয়া ডিজিটাল হাব',
      subtitle: 'নদীয়ার হৃদস্পন্দনের সাথে যুক্ত থাকুন। খবর, বাজার দর এবং স্থানীয় প্রতিভা - সব এক জায়গায়।',
      cta: 'বাজার দেখুন',
      news: 'নিউজ',
      influencer: 'ইনফ্লুয়েন্সার',
      bazar: 'বার্নিয়া বাজার',
    },
    news: {
      title: 'উজিরপুর বার্নিয়া দৈনিক',
      live: 'লাইভ আপডেট',
      lastChecked: 'শেষ চেক করা হয়েছে',
      category: 'বিভাগ',
      readMore: 'আরও পড়ুন',
      share: 'শেয়ার করুন',
    },
    bazar: {
      title: 'বার্নিয়া বাজার',
      subtitle: 'দৈনিক বাজার দর দেখুন এবং স্থানীয় দোকানদারদের সাথে যোগাযোগ করুন।',
      search: 'দোকান বা পণ্য খুঁজুন...',
      register: 'দোকান নথিভুক্ত করুন',
      category: 'বিভাগ',
      owner: 'মালিক',
      prices: 'পণ্যের দাম',
      contact: 'যোগাযোগ করুন',
      share: 'শেয়ার করুন',
    },
    influencers: {
      title: 'ইনফ্লুয়েন্সার নেটওয়ার্ক',
      subtitle: 'স্থানীয় ক্রিয়েটরদের সাথে যুক্ত হন এবং সহযোগিতা করুন।',
      join: 'নেটওয়ার্কে যোগ দিন',
      bio: 'বায়ো',
      collab: 'সহযোগিতা করুন',
      share: 'শেয়ার করুন',
    },
    collab: {
      title: 'সহযোগিতা হাব',
      subtitle: 'ক্রিয়েটরদের মধ্যে নিরবচ্ছিন্ন অংশীদারিত্বের জন্য ডিজাইন করা টুল।',
      messages: 'বার্তা',
      planning: 'ক্যাম্পেইন পরিকল্পনা',
      projects: 'শেয়ার করা প্রজেক্ট',
      chat: 'আমাদের সাথে চ্যাট করুন',
      placeholder: 'আপনার বার্তা লিখুন...',
      send: 'পাঠান',
    },
    footer: {
      about: 'উজিরপুর বার্নিয়ার ডিজিটাল প্রাণকেন্দ্র। আমরা আপনাদের জন্য প্রতিদিনের স্থানীয় খবর নিয়ে আসি এবং ক্রিয়েটরদের আমাদের সম্প্রদায়ের ভবিষ্যৎ গড়ে তোলার জন্য একটি প্ল্যাটফর্ম প্রদান করি।',
      links: 'দ্রুত লিঙ্ক',
      contact: 'যোগাযোগ করুন',
      rights: 'সর্বস্বত্ব সংরক্ষিত।',
    },
    data: {
      influencers: [
        {
          id: '1',
          name: 'অর্জুন দাস',
          bio: 'নদীয়ার লুকানো রত্নগুলি অন্বেষণকারী ট্রাভেল ব্লগার।',
          socials: ['instagram.com/arjun', 'youtube.com/arjun', 'facebook.com/arjun'],
          avatar: 'https://picsum.photos/seed/influencer1/200/200'
        },
        {
          id: '2',
          name: 'প্রিয়া সেন',
          bio: 'খাদ্যরসিক এবং স্থানীয় সংস্কৃতি প্রেমী।',
          socials: ['instagram.com/priya', 'twitter.com/priya', 'tiktok.com/priya'],
          avatar: 'https://picsum.photos/seed/influencer2/200/200'
        }
      ],
      shops: [
        {
          id: '1',
          name: 'মন্ডল গ্রোসারি স্টোর',
          owner: 'সুভাষ মন্ডল',
          category: 'মুদিখানা',
          location: 'মেন রোড, বার্নিয়া',
          phone: '+91 98765 43210',
          image: 'https://picsum.photos/seed/shop1/400/300',
          products: [
            { name: 'চাল (মিনিকেট)', price: '₹৫২/কেজি' },
            { name: 'সরষের তেল', price: '₹১৬৫/লিটার' },
            { name: 'চিনি', price: '₹৪৪/কেজি' }
          ]
        },
        {
          id: '2',
          name: 'বার্নিয়া ভ্যারাইটি স্টোর',
          owner: 'রাজেশ সাহা',
          category: 'স্টেশনারি',
          location: 'বাজার এলাকা, বার্নিয়া',
          phone: '+91 98765 43211',
          image: 'https://picsum.photos/seed/shop2/400/300',
          products: [
            { name: 'খাতা (A4)', price: '₹৬০' },
            { name: 'পেন সেট', price: '₹৫০' },
            { name: 'স্কুল ব্যাগ', price: '₹৪৫০' }
          ]
        }
      ],
      collab: {
        chatWith: 'অর্জুন দাসের সাথে চ্যাট করুন',
        online: 'অনলাইন',
        messages: [
          { text: 'হাই! আমি আপনার প্রোফাইল দেখেছি। আপনি কি উজিরপুর স্থানীয় বাজার সম্পর্কে একটি ভিডিওতে সহযোগিতা করতে চান?', isMe: false },
          { text: 'এটি দারুণ শোনাচ্ছে! আমি আগামী সপ্তাহে ওই এলাকা পরিদর্শনের পরিকল্পনা করছি।', isMe: true }
        ],
        campaigns: [
          { title: 'নদীয়ার ঐতিহ্যবাহী সফর', date: '২৫ মার্চ, ২০২৬', status: 'পরিকল্পনা' },
          { title: 'স্থানীয় কারিগরদের স্পটলাইট', date: '০২ এপ্রিল, ২০২৬', status: 'খসড়া' }
        ],
        projects: [
          { title: 'গ্রাম্য জীবনের তথ্যচিত্র', partners: ['অর্জুন', 'প্রিয়া'], progress: 75 },
          { title: 'নদীয়ার স্ট্রিট ফুড গাইড', partners: ['প্রিয়া', 'রাহুল'], progress: 30 }
        ]
      },
      chat: {
        welcome: 'হ্যালো! আমরা আপনাকে আজ কীভাবে সাহায্য করতে পারি? এখানে পাঠানো যেকোনো বার্তা সরাসরি আমাদের অ্যাডমিনের কাছে যায়।',
        contactInfo: 'যেকোনো জিজ্ঞাসা বা বিবরণের জন্য আপনি সরাসরি আমাদের সাথে ujirpur.barnia6@gmail.com এ যোগাযোগ করতে পারেন।',
        support: 'লাইভ সাপোর্ট',
        assistant: 'স্বয়ংক্রিয় সহকারী',
        delivered: 'বার্তা অ্যাডমিনের কাছে পৌঁছেছে!',
      }
    }
  },
  en: {
    nav: {
      news: 'News',
      bazar: 'Bazar',
      influencers: 'Influencers',
      collab: 'Collaborate',
    },
    banner: {
      title: 'Ujirpur Barnia Digital Hub',
      subtitle: 'Stay connected with the heartbeat of Nadia. News, market prices, and local talent - all in one place.',
      cta: 'Explore Bazar',
      news: 'NEWS',
      influencer: 'INFLUENCER',
      bazar: 'BARNIA BAZAR',
    },
    news: {
      title: 'Ujirpur Barnia Daily',
      live: 'Live Updates',
      lastChecked: 'Last Checked',
      category: 'Category',
      readMore: 'Read More',
      share: 'Share',
    },
    bazar: {
      title: 'Barnia Bazar',
      subtitle: 'Check daily prices and connect with local shop owners.',
      search: 'Search shops or products...',
      register: 'Register Shop',
      category: 'Category',
      owner: 'Owner',
      prices: 'Product Prices',
      contact: 'Contact Owner',
      share: 'Share',
    },
    influencers: {
      title: 'Influencer Network',
      subtitle: 'Connect and collaborate with local creators.',
      join: 'Join the Network',
      bio: 'Bio',
      collab: 'Collaborate',
      share: 'Share',
    },
    collab: {
      title: 'Collaboration Hub',
      subtitle: 'Tools designed for seamless partnership between creators.',
      messages: 'Messages',
      planning: 'Campaign Planning',
      projects: 'Shared Projects',
      chat: 'Chat with Us',
      placeholder: 'Type your message...',
      send: 'Send',
    },
    footer: {
      about: 'The digital heart of Ujirpur Barnia. We bring you daily local news and provide a platform for creators to connect and build the future of our community.',
      links: 'Quick Links',
      contact: 'Contact Us',
      rights: 'All rights reserved.',
    },
    data: {
      influencers: [
        {
          id: '1',
          name: 'Arjun Das',
          bio: 'Travel blogger exploring the hidden gems of Nadia.',
          socials: ['instagram.com/arjun', 'youtube.com/arjun', 'facebook.com/arjun'],
          avatar: 'https://picsum.photos/seed/influencer1/200/200'
        },
        {
          id: '2',
          name: 'Priya Sen',
          bio: 'Foodie and local culture enthusiast.',
          socials: ['instagram.com/priya', 'twitter.com/priya', 'tiktok.com/priya'],
          avatar: 'https://picsum.photos/seed/influencer2/200/200'
        }
      ],
      shops: [
        {
          id: '1',
          name: 'Mondal Grocery Store',
          owner: 'Subhash Mondal',
          category: 'Grocery',
          location: 'Main Road, Barnia',
          phone: '+91 98765 43210',
          image: 'https://picsum.photos/seed/shop1/400/300',
          products: [
            { name: 'Rice (Minikit)', price: '₹52/kg' },
            { name: 'Mustard Oil', price: '₹165/L' },
            { name: 'Sugar', price: '₹44/kg' }
          ]
        },
        {
          id: '2',
          name: 'Barnia Variety Store',
          owner: 'Rajesh Saha',
          category: 'Stationery',
          location: 'Bazar Area, Barnia',
          phone: '+91 98765 43211',
          image: 'https://picsum.photos/seed/shop2/400/300',
          products: [
            { name: 'Notebook (A4)', price: '₹60' },
            { name: 'Pen Set', price: '₹50' },
            { name: 'School Bag', price: '₹450' }
          ]
        }
      ],
      collab: {
        chatWith: 'Chat with Arjun Das',
        online: 'Online',
        messages: [
          { text: 'Hey! I saw your profile. Would you like to collaborate on a video about the Ujirpur local market?', isMe: false },
          { text: 'That sounds amazing! I\'ve been planning to visit that area next week.', isMe: true }
        ],
        campaigns: [
          { title: 'Nadia Heritage Tour', date: 'March 25, 2026', status: 'Planning' },
          { title: 'Local Artisans Spotlight', date: 'April 02, 2026', status: 'Draft' }
        ],
        projects: [
          { title: 'Village Life Documentary', partners: ['Arjun', 'Priya'], progress: 75 },
          { title: 'Nadia Street Food Guide', partners: ['Priya', 'Rahul'], progress: 30 }
        ]
      },
      chat: {
        welcome: 'Hello! How can we help you today? Any messages sent here go directly to our admin.',
        contactInfo: 'You can contact us directly at ujirpur.barnia6@gmail.com for any inquiries or details.',
        support: 'Live Support',
        assistant: 'Automated Assistant',
        delivered: 'Message delivered to admin!',
      }
    }
  }
};
