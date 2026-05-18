import { Firestore } from "firebase/firestore";

export let db: Firestore | null = null;
export let adminDb: any = null;
export let clientAuth: any = null;
export let firebaseConfig: any = null;

export function setDb(newDb: Firestore) { db = newDb; }
export function setAdminDb(newAdminDb: any) { adminDb = newAdminDb; }
export function setClientAuth(newAuth: any) { clientAuth = newAuth; }
export function setFirebaseConfig(config: any) { firebaseConfig = config; }
