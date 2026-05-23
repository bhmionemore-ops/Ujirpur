import { Firestore } from "firebase/firestore";
import { localFallbackDb } from "./fallback-db";

export let db: Firestore | null = null;
export let adminDb: any = localFallbackDb;
export let clientAuth: any = null;
export let firebaseConfig: any = null;

// State object for modules that prefer it
export const state = {
  get db() { return db; },
  get adminDb() { return adminDb || localFallbackDb; },
  get clientAuth() { return clientAuth; },
  get firebaseConfig() { return firebaseConfig; }
};

export function setDb(newDb: Firestore) { db = newDb; }
export function setAdminDb(newAdminDb: any) { 
  if (newAdminDb === null || newAdminDb === undefined) {
    adminDb = localFallbackDb;
  } else {
    adminDb = newAdminDb;
  }
}
export function setClientAuth(newAuth: any) { clientAuth = newAuth; }
export function setFirebaseConfig(config: any) { firebaseConfig = config; }

export function handleAdminError(err: any, context?: string) {
  if (err) {
    const msg = err.message || "";
    const code = err.code;
    if (code === 7 || msg.includes("PERMISSION_DENIED") || msg.toLowerCase().includes("permission")) {
      console.warn(`[Firebase] Admin SDK PERMISSION_DENIED detected${context ? ` in ${context}` : ""}. Disabling Admin SDK:`, msg);
      setAdminDb(null);
    }
  }
}
