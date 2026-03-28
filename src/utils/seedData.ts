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

const SHOP_NAMES = [
  "Barnia Grocery Mart", "Nadia Electronics", "Ujirpur Fashion Hub", "Station Road Pharmacy", "Green Valley Nursery",
  "The Sweet Spot", "Modern Book Store", "Classic Tailors", "Fresh Fruit Corner", "Hardware World",
  "Mobile Care Center", "Saree Palace", "Kids Zone", "Sports Junction", "Jewellery House",
  "Bakery Delight", "Furniture Studio"
];

const CATEGORIES = ["Lifestyle", "Fashion", "Tech", "Food", "Travel", "Fitness"];
const SHOP_CATEGORIES = ["Grocery", "Electronics", "Clothing", "Medicine", "Stationery", "Other"];

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
      await addDoc(collection(db, 'influencers'), {
        name: INFLUENCER_NAMES[i],
        bio: `Professional ${CATEGORIES[i % CATEGORIES.length]} influencer based in Nadia. Sharing my journey and tips with the community.`,
        socials: [
          `https://instagram.com/${INFLUENCER_NAMES[i].toLowerCase().replace(' ', '.')}`,
          `https://facebook.com/${INFLUENCER_NAMES[i].toLowerCase().replace(' ', '')}`
        ],
        avatar: `https://picsum.photos/seed/inf${i}/200/200`,
        category: CATEGORIES[i % CATEGORIES.length],
        isSeed: true,
        createdAt: serverTimestamp()
      });
    }

    // Seed Shops
    for (let i = 0; i < 17; i++) {
      await addDoc(collection(db, 'shops'), {
        name: SHOP_NAMES[i],
        owner: INFLUENCER_NAMES[i % INFLUENCER_NAMES.length],
        category: SHOP_CATEGORIES[i % SHOP_CATEGORIES.length],
        location: "Barnia, Nadia",
        phone: `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        image: `https://picsum.photos/seed/shop${i}/400/300`,
        products: [
          { name: "Product A", price: "₹" + (Math.floor(Math.random() * 500) + 50) },
          { name: "Product B", price: "₹" + (Math.floor(Math.random() * 1000) + 100) }
        ],
        isSeed: true,
        createdAt: serverTimestamp()
      });
    }

    console.log("Seeding complete!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};
