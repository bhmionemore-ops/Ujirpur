import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  FacebookAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp, 
  getDocFromServer, 
  increment, 
  updateDoc 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore for more robust connection in iframes/proxies
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Auth Helpers
export const signInWithGoogle = async () => {
  try {
    // Always try popup first as it's more reliable in most desktop/mobile browsers
    // unless explicitly blocked.
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error: any) {
    console.error("Sign in with popup error:", error);
    
    // If popup is blocked, cancelled, or closed by user, and we are on mobile, try redirect
    // Also try redirect for internal-error which can happen in some iframe/proxy scenarios
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isPopupError = [
      'auth/popup-blocked',
      'auth/cancelled-popup-request',
      'auth/popup-closed-by-user',
      'auth/internal-error'
    ].includes(error.code);

    if ((isMobile && isPopupError) || error.code === 'auth/internal-error') {
      console.log("Attempting redirect fallback...");
      try {
        return await signInWithRedirect(auth, googleProvider);
      } catch (redirectError) {
        console.error("Redirect fallback failed:", redirectError);
        throw redirectError;
      }
    }
    
    // Re-throw to be handled by the UI
    throw error;
  }
};

export const handleRedirectResult = () => getRedirectResult(auth);
export const logout = () => signOut(auth);
export const sendPasswordReset = (email: string) => sendPasswordResetEmail(auth, email);
export { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile, 
  sendEmailVerification, 
  increment, 
  updateDoc,
  doc,
  getDoc,
  setDoc,
  onSnapshot
};

// Connection Test with Retries
async function testConnection(retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Firebase] Connection attempt ${i + 1}/${retries}...`);
      
      // Use a promise with timeout for the connection test
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firebase connection timed out")), 15000)
      );
      
      // We try to get a non-existent doc just to check network reachability
      await Promise.race([
        getDocFromServer(doc(db, '_connection_test_', 'ping')),
        timeoutPromise
      ]);
      
      console.log("[Firebase] Connection successful");
      return;
    } catch (error) {
      const isLastRetry = i === retries - 1;
      const isOffline = error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'));
      
      if (isOffline || error instanceof Error && error.message.includes('timed out')) {
        if (isLastRetry) {
          console.error("Firebase connection failed permanently: The client is offline or the connection timed out. Please check your Firebase configuration and ensure the database exists.");
        } else {
          console.warn(`[Firebase] Connection attempt ${i + 1} failed. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } else {
        // Other errors (like permissions) might actually mean the connection IS working but we just can't read that specific doc
        console.log("[Firebase] Connection test received response (possibly limited permissions):", error instanceof Error ? error.message : String(error));
        return;
      }
    }
  }
}
testConnection();

// Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
