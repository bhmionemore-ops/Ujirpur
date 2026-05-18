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
  sendPasswordReset: (email: string) => Promise<void>;
  sendOTP: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    // Safety timeout to prevent infinite loading screen if Firebase fails to connect
    const safetyTimeout = setTimeout(() => {
      console.warn("[FirebaseContext] Initialization safety timeout reached. Setting loading to false.");
      setLoading(false);
    }, 8000);

    // Handle redirect result for mobile
    handleRedirectResult().catch(err => {
      console.error("Redirect result error:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(safetyTimeout);
      setUser(currentUser);
      
      if (currentUser) {
        // Sync user to Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            console.log(`[FirebaseContext] New user detected via auth state change: ${currentUser.email}. Creating Firestore doc...`);
            await setDoc(userRef, {
              displayName: currentUser.displayName,
              email: currentUser.email,
              photoURL: currentUser.photoURL,
              role: 'user',
              createdAt: serverTimestamp()
            });
            
            // Send welcome email
            if (currentUser.email) {
              console.log(`[FirebaseContext] Sending welcome email to: ${currentUser.email}`);
              fetch('/api/send-welcome-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: currentUser.email,
                  name: currentUser.displayName || 'User'
                })
              }).then(res => {
                if (res.ok) {
                  console.log(`[FirebaseContext] Welcome email API call successful for: ${currentUser.email}`);
                } else {
                  console.error(`[FirebaseContext] Welcome email API failed with status: ${res.status}`);
                }
              }).catch(err => console.error("[FirebaseContext] Error sending welcome email:", err));
            }
            
            setIsAdmin(false);
          } else {
            console.log(`[FirebaseContext] User already exists in Firestore: ${currentUser.email}`);
            setIsAdmin(userDoc.data().role === 'admin' || currentUser.email === 'okbgmi611@gmail.com' || currentUser.email === 'ujirpur.barnia6@gmail.com');
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
      console.log(`[FirebaseContext] Received message from origin: ${event.origin}`, event.data);
      
      // Validate origin
      const isAllowedOrigin = event.origin.endsWith('.run.app') || 
                             event.origin.includes('localhost') || 
                             event.origin.includes('barnia.in');
      
      if (!isAllowedOrigin) {
        console.warn(`[FirebaseContext] Origin ${event.origin} not allowed.`);
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        console.error('[FirebaseContext] OAuth error received:', event.data.error);
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('auth-error', { detail: event.data.error || 'Facebook sign-in failed' }));
        }
        setLoading(false);
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.user) {
        console.log('[FirebaseContext] OAuth success received for user:', event.data.user.name);
        const fbUser = event.data.user;
        const accessToken = event.data.accessToken;
        
        try {
          let currentUser = auth.currentUser;
          
          if (accessToken) {
            console.log('[FirebaseContext] Signing in with Facebook credential. Token length:', accessToken.length);
            const { FacebookAuthProvider, signInWithCredential } = await import('firebase/auth');
            const credential = FacebookAuthProvider.credential(accessToken);
            console.log('[FirebaseContext] Credential created. Calling signInWithCredential...');
            const cred = await signInWithCredential(auth, credential);
            currentUser = cred.user;
            console.log('[FirebaseContext] Signed in successfully to Firebase:', currentUser.uid);
          } else if (!currentUser) {
            console.log('[FirebaseContext] No access token and no current user, signing in anonymously...');
            const { signInAnonymously } = await import('firebase/auth');
            const cred = await signInAnonymously(auth);
            currentUser = cred.user;
          }

          if (currentUser) {
            console.log('[FirebaseContext] Syncing user data to Firestore...', currentUser.uid);
            
            // Update the Firebase Auth profile so onAuthStateChanged gets the right data
            const { updateProfile } = await import('firebase/auth');
            await updateProfile(currentUser, {
              displayName: fbUser.name,
              photoURL: fbUser.picture || null
            });

            const userRef = doc(db, 'users', currentUser.uid);
            await setDoc(userRef, {
              displayName: fbUser.name,
              email: fbUser.email || null,
              photoURL: fbUser.picture || null,
              facebookId: fbUser.id,
              role: 'user',
              lastLogin: serverTimestamp()
            }, { merge: true });
            
            console.log('[FirebaseContext] User synced successfully. Closing modal.');
            setAuthModalOpen(false);
            
            // Force state update to ensure UI updates immediately
            setUser({
              ...currentUser,
              displayName: fbUser.name,
              photoURL: fbUser.picture || null,
              email: fbUser.email || currentUser.email
            } as User);
          }
        } catch (err: any) {
          console.error('[FirebaseContext] Error handling OAuth success:', err);
          // Show error in UI if possible
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('auth-error', { detail: err.message || 'Facebook sign-in failed' }));
          }
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
    const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } = await import('./firebase');
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCredential.user, { displayName: name });
    
    // Send email verification
    try {
      await sendEmailVerification(userCredential.user);
      console.log(`[FirebaseContext] Verification email sent to: ${email}`);
    } catch (verifErr) {
      console.error("[FirebaseContext] Failed to send verification email:", verifErr);
    }
    
    console.log(`[FirebaseContext] New user signed up: ${email}. Syncing to Firestore...`);
    
    // Sync to Firestore immediately
    const userRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userRef, {
      displayName: name,
      email: email,
      photoURL: null,
      role: 'user',
      createdAt: serverTimestamp()
    });

    // Explicitly trigger welcome email for manual sign-up
    console.log(`[FirebaseContext] Triggering welcome email for manual sign-up: ${email}`);
    fetch('/api/send-welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        name: name
      })
    })
    .then(res => {
      if (res.ok) console.log("[FirebaseContext] Welcome email triggered successfully");
      else console.error("[FirebaseContext] Welcome email trigger failed:", res.status);
    })
    .catch(err => console.error("[FirebaseContext] Error sending welcome email:", err));
  };

  const signOut = async () => {
    const { logout } = await import('./firebase');
    await logout();
  };

  const sendPasswordReset = async (email: string) => {
    const { sendPasswordReset: firebaseReset } = await import('./firebase');
    await firebaseReset(email);
  };

  const sendOTP = async (email: string) => {
    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error("[FirebaseContext] Error sending OTP:", error);
      return { success: false, error: error.message };
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Verification failed');

      if (!data.customToken) {
        throw new Error('Server returned success but no token was provided');
      }

      console.log(`[FirebaseContext] Received custom token (starts with ${data.customToken.substring(0, 10)}...)`);
      const { signInWithCustomToken } = await import('firebase/auth');
      await signInWithCustomToken(auth, data.customToken);
      console.log("[FirebaseContext] OTP login successful");
    } catch (error: any) {
      console.error("[FirebaseContext] Error verifying OTP:", error);
      throw error;
    }
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
      signUpWithEmail,
      sendPasswordReset,
      sendOTP,
      verifyOTP
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
