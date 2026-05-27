import { Firestore } from "firebase/firestore";
import { localFallbackDb } from "./fallback-db";

export let db: Firestore | null = null;
export let adminDb: any = localFallbackDb;
export let clientAuth: any = null;
export let firebaseConfig: any = null;
export let isAdminSDKActive: boolean = false;

// State object for modules that prefer it
export const state = {
  get db() { return db; },
  get adminDb() { return adminDb || localFallbackDb; },
  get clientAuth() { return clientAuth; },
  get firebaseConfig() { return firebaseConfig; },
  get isAdminSDKActive() { return isAdminSDKActive; }
};

export function setDb(newDb: Firestore) { db = newDb; }
export function setAdminDb(newAdminDb: any) { 
  if (newAdminDb === null || newAdminDb === undefined) {
    adminDb = localFallbackDb;
    isAdminSDKActive = false;
  } else {
    adminDb = newAdminDb;
  }
}
export function setIsAdminSDKActive(active: boolean) { isAdminSDKActive = active; }
export function setClientAuth(newAuth: any) { clientAuth = newAuth; }
export function setFirebaseConfig(config: any) { firebaseConfig = config; }

export function handleAdminError(err: any, context?: string) {
  if (err) {
    const msg = err.message || "";
    const code = err.code;
    const isCredErr = msg.toLowerCase().includes("credential") || 
                      msg.toLowerCase().includes("authenticat") || 
                      msg.toLowerCase().includes("unauthorized") || 
                      msg.toLowerCase().includes("unauthenticated") ||
                      msg.toLowerCase().includes("could not load default") ||
                      msg.toLowerCase().includes("gcp") ||
                      msg.toLowerCase().includes("metadata server") ||
                      msg.includes("ADC");

    if (code === 7 || isCredErr || msg.includes("PERMISSION_DENIED") || msg.toLowerCase().includes("permission")) {
      console.warn(`[Firebase] Admin SDK disabled (Authenticating/Credential issue detected)${context ? ` during ${context}` : ""}:`, msg);
      setIsAdminSDKActive(false);
      setAdminDb(null);
    }
  }
}
