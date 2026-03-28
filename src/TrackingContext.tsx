import React, { createContext, useContext, useEffect, useRef } from 'react';
import { db } from './firebase';
import { serverTimestamp, setDoc, doc, arrayUnion, getDoc } from 'firebase/firestore';
import { useFirebase } from './FirebaseContext';

interface TrackingContextType {
  logEvent: (eventName: string, params?: any) => Promise<void>;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export const TrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useFirebase();
  const sessionIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Initialize Session
    let sessionId = sessionStorage.getItem('visitor_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('visitor_session_id', sessionId);
    }
    sessionIdRef.current = sessionId;

    const initSession = async () => {
      try {
        const docRef = doc(db, 'visitor_sessions', sessionId!);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          // Get IP/Location info
          try {
            const geoResponse = await fetch('https://ipapi.co/json/');
            const geoData = await geoResponse.json();

            const sessionData = {
              id: sessionId,
              startTime: serverTimestamp(),
              lastSeen: serverTimestamp(),
              country: geoData.country_name || 'Unknown',
              city: geoData.city || 'Unknown',
              ip: geoData.ip || 'Unknown',
              userAgent: navigator.userAgent,
              referrer: document.referrer || 'Direct',
              events: ['session_start'],
              uid: user?.uid || null,
              email: user?.email || null
            };

            await setDoc(docRef, sessionData);
          } catch (geoErr) {
            // Fallback if geo info fails
            await setDoc(docRef, {
              id: sessionId,
              startTime: serverTimestamp(),
              lastSeen: serverTimestamp(),
              userAgent: navigator.userAgent,
              referrer: document.referrer || 'Direct',
              events: ['session_start'],
              uid: user?.uid || null,
              email: user?.email || null
            });
          }
        } else {
          // Just update lastSeen
          await setDoc(docRef, { lastSeen: serverTimestamp() }, { merge: true });
        }

        // 2. Start heartbeat to track duration
        intervalRef.current = setInterval(async () => {
          if (sessionIdRef.current) {
            try {
              await setDoc(doc(db, 'visitor_sessions', sessionIdRef.current), {
                lastSeen: serverTimestamp()
              }, { merge: true });
            } catch (e) {
              console.warn('Heartbeat failed:', e);
            }
          }
        }, 30000); // Every 30 seconds

      } catch (error) {
        console.error('Error initializing visitor session:', error);
      }
    };

    initSession();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Update UID if user logs in during session
  useEffect(() => {
    if (user && sessionIdRef.current) {
      setDoc(doc(db, 'visitor_sessions', sessionIdRef.current), {
        uid: user.uid,
        email: user.email
      }, { merge: true }).catch(console.error);
    }
  }, [user]);

  const logEvent = async (eventName: string, params?: any) => {
    if (sessionIdRef.current) {
      try {
        const eventData = params ? `${eventName}: ${JSON.stringify(params)}` : eventName;
        const docRef = doc(db, 'visitor_sessions', sessionIdRef.current);
        
        await setDoc(docRef, {
          events: arrayUnion(eventData),
          lastSeen: serverTimestamp()
        }, { merge: true });
      } catch (error: any) {
        // If it fails because the document doesn't exist (even with merge: true, some SDK versions/configs might complain)
        // or if it's a permission error, we log it but don't crash.
        console.warn('Error logging event to Firestore:', error.message);
      }
    }
  };

  return (
    <TrackingContext.Provider value={{ logEvent }}>
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (context === undefined) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
};
