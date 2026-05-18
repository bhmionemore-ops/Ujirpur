import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, query, where, limit, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { FIRESTORE_SERVER_KEY } from "./constants";

export const demoMembers = [
  {
    id: "root-1",
    name: "Savitri Devi",
    role: "Matriarch",
    birthYear: "1945",
    photo: "https://images.unsplash.com/photo-1544120190-27583f2335a2?w=800&auto=format&fit=crop",
    partner: {
      name: "Late Shri Ram Sharma",
      birthYear: "1940 - 2015",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop"
    },
    children: [
      {
        id: "child-1",
        name: "Meera Sharma",
        role: "Daughter (Gen 1)",
        birthYear: "1972",
        photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop",
        children: [
          {
            id: "grand-1",
            name: "Ananya Sharma",
            role: "Granddaughter (Gen 2)",
            birthYear: "1998",
            photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&auto=format&fit=crop",
            children: [
              {
                id: "great-1",
                name: "Ishani Sharma",
                role: "Great-Granddaughter (Gen 3)",
                birthYear: "2026",
                photo: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop",
                children: []
              }
            ]
          },
          {
            id: "grand-2",
            name: "Rohan Sharma",
            role: "Grandson (Gen 2)",
            birthYear: "2002",
            photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop",
            children: []
          }
        ]
      }
    ]
  }
];

export async function bootstrapProfile(email: string, db: any, adminDb: any, admin: any) {
  const newProfileData: any = {
    email,
    name: "The Royal Lineage of Savitri Devi",
    shareId: Math.random().toString(36).substring(2, 10).toUpperCase(),
    parents: "Traditional Ancestors",
    grandparents: "Ancestral Roots",
    gotra: "Kashyap",
    kuldevi: "Mata Rani",
    kuldevta: "Lord Shiva",
    kuldeviPhoto: "https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=800&auto=format&fit=crop",
    nativePlace: "Varanasi, Uttar Pradesh",
    additionalNotes: "A legacy of strength spanning generations.",
    members: demoMembers,
    updatedAt: adminDb ? admin.firestore.FieldValue.serverTimestamp() : serverTimestamp(),
    createdAt: adminDb ? admin.firestore.FieldValue.serverTimestamp() : serverTimestamp()
  };

  if (adminDb) {
    const docRef = await adminDb.collection("vamshavali_profiles").add(newProfileData);
    return { id: docRef.id, ...newProfileData };
  } else if (db) {
    newProfileData.serverKey = FIRESTORE_SERVER_KEY;
    const docRef = await addDoc(collection(db, "vamshavali_profiles"), newProfileData);
    return { id: docRef.id, ...newProfileData };
  }
  return null;
}
