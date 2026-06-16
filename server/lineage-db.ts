import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { appConfig } from "./lineage-config.js";

const dataDir = path.resolve(appConfig.dataDir);
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "family-lineage.sqlite"));
db.pragma("journal_mode = WAL");
