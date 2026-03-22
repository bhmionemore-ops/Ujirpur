import React, { useEffect, useState } from 'react';
import { db, increment, updateDoc, doc, getDoc, setDoc, onSnapshot, handleFirestoreError, OperationType } from '../firebase';
import { Users } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export const VisitorCounter = () => {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { t } = useLanguage();
  const BASE_COUNT = 1500;

  if (error) throw error;

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
        try {
          handleFirestoreError(error, OperationType.WRITE, 'stats/visitors');
        } catch (e) {
          setError(e as Error);
        }
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
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'stats/visitors');
      } catch (e) {
        setError(e as Error);
      }
    });

    return () => unsub();
  }, []);

  if (count === null) return null;

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl group hover:border-brand-500/30 transition-all duration-500">
      <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
        <Users size={16} className="text-brand-500" />
      </div>
      <div className="flex flex-col">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 leading-none mb-1">
          {t.footer.visitorCount}
        </span>
        <span className="text-sm font-mono font-bold text-white tracking-wider">
          {(BASE_COUNT + count).toLocaleString().split('').map((char, i) => (
            <span key={i} className="inline-block min-w-[0.6em] text-center">{char}</span>
          ))}
        </span>
      </div>
    </div>
  );
};
