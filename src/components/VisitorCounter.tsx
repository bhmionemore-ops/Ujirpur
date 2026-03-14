import React, { useEffect, useState } from 'react';
import { db, increment, updateDoc, doc, getDoc, setDoc, onSnapshot } from '../firebase';
import { Users } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export const VisitorCounter = () => {
  const [count, setCount] = useState<number | null>(null);
  const { t } = useLanguage();
  const BASE_COUNT = 1500;

  useEffect(() => {
    const visitorDoc = doc(db, 'stats', 'visitors');

    const updateVisitors = async () => {
      try {
        const docSnap = await getDoc(visitorDoc);
        if (!docSnap.exists()) {
          await setDoc(visitorDoc, { count: 1 });
        } else {
          await updateDoc(visitorDoc, {
            count: increment(1)
          });
        }
      } catch (error) {
        console.error("Error updating visitor count:", error);
      }
    };

    // Only increment once per session (using sessionStorage)
    if (!sessionStorage.getItem('visited')) {
      updateVisitors();
      sessionStorage.setItem('visited', 'true');
    }

    // Listen for real-time updates
    const unsub = onSnapshot(visitorDoc, (doc) => {
      if (doc.exists()) {
        setCount(doc.data().count);
      }
    });

    return () => unsub();
  }, []);

  if (count === null) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-full border border-zinc-700 shadow-lg">
      <Users size={14} className="text-orange-500" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
        {t.footer.visitorCount}:
      </span>
      <span className="text-xs font-mono font-bold text-white">
        {(BASE_COUNT + count).toLocaleString()}
      </span>
    </div>
  );
};
