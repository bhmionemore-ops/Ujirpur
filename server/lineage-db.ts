import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { appConfig } from "./lineage-config.js";
import * as DB from "./db.js";

const dataDir = path.resolve(appConfig.dataDir);
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "family-lineage.sqlite");
let activeDb = new Database(dbPath);
activeDb.pragma("journal_mode = WAL");

let backupTimeout: NodeJS.Timeout | null = null;
let isDirty = false;

export function markDbDirDirty() {
  isDirty = true;
  if (backupTimeout) clearTimeout(backupTimeout);
  backupTimeout = setTimeout(() => {
    backupSqliteToFirestore().catch(console.error);
  }, 2000);
}

// Write backup of the SQLite file to Firestore, compressed with gzip
export async function backupSqliteToFirestore() {
  try {
    const adminDb = DB.state.adminDb;
    if (!adminDb || !DB.state.isAdminSDKActive) {
      return;
    }
    if (!fs.existsSync(dbPath)) return;

    // Read, compress, and base64 represent
    const fileData = fs.readFileSync(dbPath);
    if (fileData.length === 0) return;

    const compressed = zlib.gzipSync(fileData);
    const base64 = compressed.toString("base64");

    await adminDb.collection("sqlite_backups").doc("main").set({
      data: base64,
      updatedAt: new Date().toISOString(),
      size: fileData.length,
      compressedSize: compressed.length
    });
    console.log(`[Backup] SQLite database backed up to Firestore. Original: ${fileData.length} B, Compressed: ${compressed.length} B.`);
    isDirty = false;
  } catch (err: any) {
    console.error("[Backup] Error backing up SQLite db to Firestore:", err);
  }
}

// Restore SQLite from the compressed Firestore database backup
export async function restoreSqliteFromFirestore() {
  try {
    const adminDb = DB.state.adminDb;
    if (!adminDb || !DB.state.isAdminSDKActive) {
      console.log("[Restore] Admin DB is inactive. Skipping SQLite restore.");
      return false;
    }

    const doc = await adminDb.collection("sqlite_backups").doc("main").get();
    if (!doc.exists) {
      console.log("[Restore] No SQLite backup found in Firestore. Operating with a fresh SQLite database.");
      return false;
    }

    const { data } = doc.data() || {};
    if (!data) {
      console.log("[Restore] Backup document data empty. Skipping.");
      return false;
    }

    const compressed = Buffer.from(data, "base64");
    const fileData = zlib.gunzipSync(compressed);

    // Safely write the restored file
    activeDb.close();
    fs.writeFileSync(dbPath, fileData);
    activeDb = new Database(dbPath);
    activeDb.pragma("journal_mode = WAL");

    console.log(`[Restore] SQLite database successfully restored from Firestore! Restored ${fileData.length} bytes.`);
    return true;
  } catch (err: any) {
    console.error("[Restore] Error restoring SQLite db from Firestore:", err);
    return false;
  }
}

// Seamless Proxy wrapper so that existing code imports and calls `db.prepare`, `db.exec`, etc normally
export const db = new Proxy({} as any, {
  get(target, prop, receiver) {
    if (prop === "prepare") {
      return function(sql: string) {
        const isWrite = /insert|update|delete|replace|create|drop/i.test(sql);
        if (isWrite) {
          markDbDirDirty();
        }
        const stmt = activeDb.prepare(sql);
        return stmt;
      };
    }
    if (prop === "exec") {
      return function(sql: string) {
        const isWrite = /insert|update|delete|replace|create|drop/i.test(sql);
        if (isWrite) {
          markDbDirDirty();
        }
        return activeDb.exec(sql);
      };
    }
    if (prop === "transaction") {
      return function(fn: (...args: any[]) => any) {
        return activeDb.transaction((...args: any[]) => {
          markDbDirDirty();
          return fn.apply(this, args);
        });
      };
    }

    const value = Reflect.get(activeDb, prop);
    if (typeof value === "function") {
      return value.bind(activeDb);
    }
    return value;
  }
});

// SIGTERM / SIGINT shutdown handshakes
async function handleShutdown() {
  if (isDirty) {
    console.log("[Shutdown] Saving final SQLite database changes to Firestore...");
    if (backupTimeout) clearTimeout(backupTimeout);
    await backupSqliteToFirestore();
  }
  process.exit(0);
}

process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);

