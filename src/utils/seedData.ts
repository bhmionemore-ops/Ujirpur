import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, limit } from 'firebase/firestore';

const INFLUENCER_NAMES = [
  "Aarav Sharma", "Ishani Roy", "Kabir Das", "Meera Nair", "Rohan Gupta",
  "Sanya Malhotra", "Arjun Reddy", "Ananya Pandey", "Vikram Singh", "Priya Verma",
  "Aditya Birla", "Kavya Iyer", "Rahul Dravid", "Sneha Kapoor", "Amitabh Bachchan",
  "Deepika Padukone", "Ranveer Singh", "Alia Bhatt", "Shah Rukh Khan", "Priyanka Chopra",
  "Virat Kohli", "MS Dhoni", "Sachin Tendulkar", "Sunil Chhetri", "Mary Kom",
  "Saina Nehwal", "P.V. Sindhu", "Neeraj Chopra", "Abhinav Bindra", "Viswanathan Anand"
];

const BIOS = [
  "Passionate about traditional Bengali fashion and modern trends. 👗",
  "Tech enthusiast sharing the latest gadget reviews and tips. 📱",
  "Foodie on a mission to find the best street food in Nadia. 🍲",
  "Traveler exploring the hidden gems of West Bengal. 🎒",
  "Fitness coach helping you stay healthy with simple home workouts. 💪",
  "Lifestyle blogger sharing daily inspiration and positivity. ✨",
  "Digital creator focused on sustainable living and eco-friendly tips. 🌱",
  "Beauty influencer showcasing traditional and contemporary makeup. 💄",
  "Photography lover capturing the essence of rural Bengal. 📸",
  "Music artist sharing soulful melodies and behind-the-scenes. 🎵"
];

const SHOP_NAMES = [
  "Barnia Grocery Mart", "Nadia Electronics", "Ujirpur Fashion Hub", "Station Road Pharmacy", "Green Valley Nursery",
  "The Sweet Spot", "Modern Book Store", "Classic Tailors", "Fresh Fruit Corner", "Hardware World",
  "Mobile Care Center", "Saree Palace", "Kids Zone", "Sports Junction", "Jewellery House",
  "Bakery Delight", "Furniture Studio"
];

const SHOP_DESCRIPTIONS = [
  "Your one-stop shop for all daily essentials and fresh groceries in Barnia.",
  "Latest smartphones, laptops, and accessories at the most competitive prices.",
  "Exclusive collection of traditional sarees and modern ethnic wear for all occasions.",
  "Trusted pharmacy providing authentic medicines and healthcare products 24/7.",
  "Wide variety of indoor and outdoor plants to brighten up your home and garden.",
  "Delicious traditional sweets and snacks made with pure ingredients and love.",
  "A treasure trove for book lovers with a vast collection of literature and stationery.",
  "Expert tailoring services for perfectly fitted traditional and formal wear.",
  "Freshly picked seasonal fruits and vegetables sourced directly from local farms.",
  "High-quality tools and hardware supplies for all your construction and repair needs."
];

const CATEGORIES = ["Lifestyle", "Fashion", "Tech", "Food", "Travel", "Fitness", "Beauty", "Photography", "Music", "Sustainability"];
const SHOP_CATEGORIES = ["Grocery", "Electronics", "Clothing", "Medicine", "Stationery", "Food", "Hardware", "Jewellery", "Furniture"];

export const seedDatabase = async () => {
  try {
    // Check if already seeded
    const q = query(collection(db, 'influencers'), where('isSeed', '==', true), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      console.log("Database already seeded.");
      return;
    }

    console.log("Seeding database...");

    // Seed Influencers
    for (let i = 0; i < 30; i++) {
      const name = INFLUENCER_NAMES[i];
      const category = CATEGORIES[i % CATEGORIES.length];
      const bio = BIOS[i % BIOS.length];
      
      await addDoc(collection(db, 'influencers'), {
        name: name,
        bio: bio,
        socials: [
          `https://instagram.com/${name.toLowerCase().replace(/\s+/g, '.')}`,
          `https://facebook.com/${name.toLowerCase().replace(/\s+/g, '')}`
        ],
        avatar: `https://picsum.photos/seed/influencer_${i}/400/400`,
        category: category,
        uid: "seed-user",
        isSeed: true,
        isVerified: i % 3 === 0,
        createdAt: serverTimestamp()
      });
    }

    // Seed Shops
    for (let i = 0; i < 17; i++) {
      const name = SHOP_NAMES[i];
      const category = SHOP_CATEGORIES[i % SHOP_CATEGORIES.length];
      const description = SHOP_DESCRIPTIONS[i % SHOP_DESCRIPTIONS.length];
      
      await addDoc(collection(db, 'shops'), {
        name: name,
        owner: INFLUENCER_NAMES[i % INFLUENCER_NAMES.length],
        category: category,
        location: i % 2 === 0 ? "Barnia Station Road, Nadia" : "Ujirpur Main Market, Nadia",
        description: description,
        phone: `+91 ${Math.floor(7000000000 + Math.random() * 2999999999)}`,
        image: `https://picsum.photos/seed/shop_profile_${i}/800/600`,
        products: [
          { name: "Premium Item A", price: "₹" + (Math.floor(Math.random() * 500) + 150) },
          { name: "Special Offer B", price: "₹" + (Math.floor(Math.random() * 1500) + 300) },
          { name: "Daily Essential C", price: "₹" + (Math.floor(Math.random() * 200) + 20) }
        ],
        uid: "seed-user",
        isSeed: true,
        createdAt: serverTimestamp()
      });
    }

    console.log("Seeding complete!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};
