import fs from "fs";
import path from "path";

// Define a simple local JSON file path to persist state
const FALLBACK_FILE_PATH = path.resolve("server/local_admin_db.json");

interface LocalDoc {
  id: string;
  data: any;
}

class LocalAdminDbFallback {
  private dataStore: Record<string, Record<string, any>> = {};

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      if (fs.existsSync(FALLBACK_FILE_PATH)) {
        const fileContent = fs.readFileSync(FALLBACK_FILE_PATH, "utf-8");
        this.dataStore = JSON.parse(fileContent);
        console.log(`[LocalFallbackDB] Loaded state with ${Object.keys(this.dataStore).length} collections.`);
      } else {
        // Initialize default mock data to ensure seamless first-time experience
        this.dataStore = {
          users: {
            "default-user": {
              uid: "default-user",
              email: "okbgmi611@gmail.com",
              displayName: "Developer Admin",
              credits: 1000,
              role: "admin",
              createdAt: new Date().toISOString()
            }
          },
          api_keys: {}
        };
        this.saveState();
      }
    } catch (err: any) {
      console.error("[LocalFallbackDB] Error loading state:", err.message);
    }
  }

  private saveState() {
    try {
      fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(this.dataStore, null, 2), "utf-8");
    } catch (err: any) {
      console.error("[LocalFallbackDB] Error saving state:", err.message);
    }
  }

  // Support .collection(name)
  collection(collectionName: string) {
    if (!this.dataStore[collectionName]) {
      this.dataStore[collectionName] = {};
      this.saveState();
    }
    return new LocalCollectionRef(collectionName, this);
  }

  // Support .batch()
  batch() {
    return new LocalWriteBatch(this);
  }

  // Expose raw data for fallback operations
  getRawStore() {
    return this.dataStore;
  }

  setRawDocument(collectionName: string, docId: string, data: any, merge = false) {
    if (!this.dataStore[collectionName]) {
      this.dataStore[collectionName] = {};
    }
    
    // Resolve Server Timestamps and FieldValues
    const sanitizedData = this.sanitizeData(data);

    if (merge && this.dataStore[collectionName][docId]) {
      this.dataStore[collectionName][docId] = {
        ...this.dataStore[collectionName][docId],
        ...sanitizedData,
        updatedAt: new Date().toISOString()
      };
    } else {
      this.dataStore[collectionName][docId] = {
        ...sanitizedData,
        id: docId,
        createdAt: this.dataStore[collectionName][docId]?.createdAt || new Date().toISOString()
      };
    }
    this.saveState();
  }

  updateRawDocument(collectionName: string, docId: string, data: any) {
    if (!this.dataStore[collectionName] || !this.dataStore[collectionName][docId]) {
      // Create if it doesn't exist to prevent crash
      this.setRawDocument(collectionName, docId, data, false);
      return;
    }
    const sanitizedData = this.sanitizeData(data);
    this.dataStore[collectionName][docId] = {
      ...this.dataStore[collectionName][docId],
      ...sanitizedData,
      updatedAt: new Date().toISOString()
    };
    this.saveState();
  }

  deleteRawDocument(collectionName: string, docId: string) {
    if (this.dataStore[collectionName] && this.dataStore[collectionName][docId]) {
      delete this.dataStore[collectionName][docId];
      this.saveState();
    }
  }

  private sanitizeData(data: any): any {
    if (data === null || data === undefined) return data;
    if (typeof data !== "object") return data;

    const copy = { ...data };
    for (const key of Object.keys(copy)) {
      const val = copy[key];
      // Strip any Firebase FieldValues or server timestamp placeholders
      if (val && typeof val === "object") {
        if (val.constructor && (val.constructor.name === "FieldValueImpl" || val.constructor.name === "FieldValue")) {
          copy[key] = new Date().toISOString();
        } else {
          copy[key] = this.sanitizeData(val);
        }
      }
    }
    return copy;
  }
}

class LocalCollectionRef {
  constructor(private collectionName: string, private db: LocalAdminDbFallback) {}

  doc(docId?: string) {
    const id = docId || Math.random().toString(36).substring(2, 15);
    return new LocalDocumentRef(this.collectionName, id, this.db);
  }

  async add(data: any) {
    const docId = Math.random().toString(36).substring(2, 15);
    this.db.setRawDocument(this.collectionName, docId, data, false);
    return new LocalDocumentRef(this.collectionName, docId, this.db);
  }

  // Query Support
  where(field: string, op: string, val: any) {
    return new LocalQuery(this.collectionName, this.db).where(field, op, val);
  }

  orderBy(field: string, direction = "asc") {
    return new LocalQuery(this.collectionName, this.db).orderBy(field, direction);
  }

  limit(num: number) {
    return new LocalQuery(this.collectionName, this.db).limit(num);
  }

  // Get all documents in collection
  async get() {
    return new LocalQuery(this.collectionName, this.db).get();
  }
}

class LocalDocumentRef {
  constructor(
    public collectionName: string,
    public id: string,
    private db: LocalAdminDbFallback
  ) {}

  async get() {
    const store = this.db.getRawStore();
    const docData = store[this.collectionName]?.[this.id];
    return new LocalDocumentSnapshot(this.id, docData);
  }

  async set(data: any, options?: { merge?: boolean }) {
    this.db.setRawDocument(this.collectionName, this.id, data, options?.merge);
    return { id: this.id };
  }

  async update(data: any) {
    this.db.updateRawDocument(this.collectionName, this.id, data);
    return { id: this.id };
  }

  async delete() {
    this.db.deleteRawDocument(this.collectionName, this.id);
    return { id: this.id };
  }
}

class LocalDocumentSnapshot {
  public exists: boolean;
  constructor(public id: string, private docData: any) {
    this.exists = !!docData;
  }

  data() {
    return this.docData ? { ...this.docData } : undefined;
  }
}

class LocalQuery {
  private filters: { field: string; op: string; val: any }[] = [];
  private orderField: string | null = null;
  private orderDirection = "asc";
  private limitCount: number | null = null;

  constructor(private collectionName: string, private db: LocalAdminDbFallback) {}

  where(field: string, op: string, val: any) {
    this.filters.push({ field, op, val });
    return this;
  }

  orderBy(field: string, direction = "asc") {
    this.orderField = field;
    this.orderDirection = direction;
    return this;
  }

  limit(num: number) {
    this.limitCount = num;
    return this;
  }

  async get() {
    const store = this.db.getRawStore();
    const collectionData = store[this.collectionName] || {};
    let docs = Object.keys(collectionData).map(id => ({
      id,
      ...collectionData[id]
    }));

    // Apply Filters
    for (const filter of this.filters) {
      docs = docs.filter(doc => {
        const docVal = doc[filter.field];
        switch (filter.op) {
          case "==":
            return docVal === filter.val;
          case "!=":
            return docVal !== filter.val;
          case ">":
            return docVal > filter.val;
          case ">=":
            return docVal >= filter.val;
          case "<":
            return docVal < filter.val;
          case "<=":
            return docVal <= filter.val;
          case "array-contains":
            return Array.isArray(docVal) && docVal.includes(filter.val);
          default:
            return true;
        }
      });
    }

    // Apply Order
    if (this.orderField) {
      const field = this.orderField;
      const desc = this.orderDirection === "desc";
      docs.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA === valB) return 0;
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        
        return desc 
          ? (valA < valB ? 1 : -1)
          : (valA > valB ? 1 : -1);
      });
    }

    // Apply Limit
    if (this.limitCount !== null) {
      docs = docs.slice(0, this.limitCount);
    }

    const docSnapshots = docs.map(doc => {
      const { id, ...data } = doc;
      return new LocalDocumentSnapshot(id, data);
    });

    return new LocalQuerySnapshot(docSnapshots);
  }
}

class LocalQuerySnapshot {
  public empty: boolean;
  constructor(public docs: LocalDocumentSnapshot[]) {
    this.empty = docs.length === 0;
  }
}

class LocalWriteBatch {
  private operations: (() => void)[] = [];

  constructor(private db: LocalAdminDbFallback) {}

  set(docRef: LocalDocumentRef, data: any, options?: { merge?: boolean }) {
    this.operations.push(() => {
      this.db.setRawDocument(docRef.collectionName, docRef.id, data, options?.merge);
    });
    return this;
  }

  update(docRef: LocalDocumentRef, data: any) {
    this.operations.push(() => {
      this.db.updateRawDocument(docRef.collectionName, docRef.id, data);
    });
    return this;
  }

  delete(docRef: LocalDocumentRef) {
    this.operations.push(() => {
      this.db.deleteRawDocument(docRef.collectionName, docRef.id);
    });
    return this;
  }

  async commit() {
    this.operations.forEach(op => op());
    return true;
  }
}

export const localFallbackDb = new LocalAdminDbFallback();
