import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType, handleRedirectResult } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  signIn: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    // Handle redirect result for mobile
    handleRedirectResult().catch(err => {
      console.error("Redirect result error:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Sync user to Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              displayName: currentUser.displayName,
              email: currentUser.email,
              photoURL: currentUser.photoURL,
              role: 'user',
              createdAt: serverTimestamp()
            });
            setIsAdmin(false);
          } else {
            setIsAdmin(userDoc.data().role === 'admin' || currentUser.email === 'okbgmi611@gmail.com');
          }
        } catch (error) {
          console.error("Error syncing user:", error);
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const { signInWithGoogle } = await import('./firebase');
    await signInWithGoogle();
  };
  
  const signInWithFacebook = async () => {
    try {
      const response = await fetch('/api/auth/facebook/url');
      if (!response.ok) throw new Error('Failed to get Facebook auth URL');
      const { url } = await response.json();
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        url,
        'facebook_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error("Facebook sign-in error:", error);
      throw error;
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost') && !event.origin.includes('barnia.in')) return;
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.user) {
        const fbUser = event.data.user;
        
        // For now, we'll sync this user data to Firestore
        // In a real app, you'd ideally link this to a Firebase Auth user
        // But since we can't easily do that without manual Firebase Console setup,
        // we'll treat this as a successful login and update our local user state
        // or sign in anonymously and link.
        
        // Let's try to sign in anonymously if not already signed in
        let currentUser = auth.currentUser;
        if (!currentUser) {
          const { signInAnonymously } = await import('firebase/auth');
          const cred = await signInAnonymously(auth);
          currentUser = cred.user;
        }

        if (currentUser) {
          const userRef = doc(db, 'users', currentUser.uid);
          await setDoc(userRef, {
            displayName: fbUser.name,
            email: fbUser.email || null,
            photoURL: fbUser.picture || null,
            facebookId: fbUser.id,
            role: 'user',
            lastLogin: serverTimestamp()
          }, { merge: true });
          
          // Force a refresh of the user state
          setUser({
            ...currentUser,
            displayName: fbUser.name,
            photoURL: fbUser.picture || null,
            email: fbUser.email || currentUser.email
          } as User);
          
          setAuthModalOpen(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    const { signInWithEmailAndPassword } = await import('./firebase');
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const { createUserWithEmailAndPassword, updateProfile } = await import('./firebase');
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCredential.user, { displayName: name });
    
    // Sync to Firestore immediately
    const userRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userRef, {
      displayName: name,
      email: email,
      photoURL: null,
      role: 'user',
      createdAt: serverTimestamp()
    });
  };

  const signOut = async () => {
    const { logout } = await import('./firebase');
    await logout();
  };

  return (
    <FirebaseContext.Provider value={{ 
      user, 
      loading, 
      isAdmin, 
      isAuthModalOpen, 
      setAuthModalOpen, 
      signIn, 
      signInWithFacebook,
      signOut, 
      signInWithEmail, 
      signUpWithEmail 
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
