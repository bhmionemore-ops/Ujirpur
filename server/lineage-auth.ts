import { randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { z } from "zod";
import { appConfig } from "./lineage-config.js";
import { db } from "./lineage-db.js";

type AccountRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string | null;
  password_salt: string | null;
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  account_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
};

function now() {
  return new Date().toISOString();
}

function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function nameFromEmail(email: string) {
  return email.split("@")[0].replace(/[._-]/g, " ").trim() || "Family Account";
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return {
    salt,
    hash: scryptSync(password, salt, 64).toString("hex")
  };
}

function verifyPassword(password: string, salt: string, hash: string) {
  const candidate = Buffer.from(hashPassword(password, salt).hash, "hex");
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function mapAccount(row: AccountRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.display_name,
    hasPassword: Boolean(row.password_hash)
  };
}

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT,
    password_salt TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS account_login_codes (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS account_sessions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  );
`);

export const authSchemas = {
  email: z.object({
    email: z.string().email(),
    name: z.string().optional()
  }),
  verifyCode: z.object({
    email: z.string().email(),
    code: z.string().min(4).max(12)
  }),
  registerPassword: z.object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(8)
  }),
  loginPassword: z.object({
    email: z.string().email(),
    password: z.string().min(1)
  }),
  changePassword: z.object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8)
  })
};

export const authStore = {
  accountById(accountId: string) {
    const row = db.prepare("SELECT * FROM accounts WHERE id = ?").get(accountId) as AccountRow | undefined;
    return row ? mapAccount(row) : null;
  },

  accountByEmail(email: string) {
    const row = db.prepare("SELECT * FROM accounts WHERE email = ?").get(normalizeEmail(email)) as AccountRow | undefined;
    return row ? mapAccount(row) : null;
  },

  ensureAccount(email: string, name?: string) {
    const cleanEmail = normalizeEmail(email);
    const existing = db.prepare("SELECT * FROM accounts WHERE email = ?").get(cleanEmail) as AccountRow | undefined;
    if (existing) return mapAccount(existing);
    const timestamp = now();
    const id = randomUUID();
    db.prepare(
      "INSERT INTO accounts (id, email, display_name, password_hash, password_salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, cleanEmail, name?.trim() || nameFromEmail(cleanEmail), null, null, timestamp, timestamp);
    return { id, email: cleanEmail, name: name?.trim() || nameFromEmail(cleanEmail), hasPassword: false };
  },

  requestAccessCode(email: string, name?: string) {
    const account = this.ensureAccount(email, name);
    const code = String(randomInt(100000, 999999));
    db.prepare("UPDATE account_login_codes SET used_at = ? WHERE account_id = ? AND used_at IS NULL").run(now(), account.id);
    db.prepare(
      "INSERT INTO account_login_codes (id, account_id, code_hash, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(randomUUID(), account.id, sha256(code), addMinutes(appConfig.accessCodeMinutes), null, now());
    console.log(`Access code for ${account.email}: ${code}`);
    return { account, code, expiresInMinutes: appConfig.accessCodeMinutes };
  },

  verifyAccessCode(email: string, code: string) {
    const cleanEmail = normalizeEmail(email);
    const accountRow = db.prepare("SELECT * FROM accounts WHERE email = ?").get(cleanEmail) as AccountRow | undefined;
    if (!accountRow) throw Object.assign(new Error("No account exists for this email."), { statusCode: 401 });
    const codeRow = db.prepare(
      `SELECT * FROM account_login_codes
       WHERE account_id = ? AND code_hash = ? AND used_at IS NULL AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`
    ).get(accountRow.id, sha256(code.trim()), now()) as { id: string } | undefined;
    if (!codeRow) throw Object.assign(new Error("Access code is invalid or expired."), { statusCode: 401 });
    db.prepare("UPDATE account_login_codes SET used_at = ? WHERE id = ?").run(now(), codeRow.id);
    return this.createSession(accountRow);
  },

  registerPassword(email: string, name: string, password: string) {
    const cleanEmail = normalizeEmail(email);
    const existing = db.prepare("SELECT * FROM accounts WHERE email = ?").get(cleanEmail) as AccountRow | undefined;
    if (existing?.password_hash) {
      throw Object.assign(new Error("An account with this email already has a password. Please sign in."), { statusCode: 409 });
    }
    const timestamp = now();
    const { salt, hash } = hashPassword(password);
    const accountId = existing?.id ?? randomUUID();
    if (existing) {
      db.prepare("UPDATE accounts SET display_name = ?, password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?")
        .run(name.trim(), hash, salt, timestamp, existing.id);
    } else {
      db.prepare(
        "INSERT INTO accounts (id, email, display_name, password_hash, password_salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(accountId, cleanEmail, name.trim(), hash, salt, timestamp, timestamp);
    }
    const row = db.prepare("SELECT * FROM accounts WHERE id = ?").get(accountId) as AccountRow;
    return this.createSession(row);
  },

  loginPassword(email: string, password: string) {
    const cleanEmail = normalizeEmail(email);
    const row = db.prepare("SELECT * FROM accounts WHERE email = ?").get(cleanEmail) as AccountRow | undefined;
    if (!row?.password_hash || !row.password_salt || !verifyPassword(password, row.password_salt, row.password_hash)) {
      throw Object.assign(new Error("Email or password is incorrect."), { statusCode: 401 });
    }
    return this.createSession(row);
  },

  createSession(accountRow: AccountRow) {
    const token = `${randomUUID()}.${randomBytes(32).toString("hex")}`;
    const timestamp = now();
    db.prepare("INSERT INTO account_sessions (id, account_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(randomUUID(), accountRow.id, sha256(token), addDays(appConfig.sessionDays), timestamp);
    return {
      token,
      account: mapAccount(accountRow),
      expiresAt: addDays(appConfig.sessionDays),
      maxTreesPerAccount: appConfig.maxTreesPerAccount
    };
  },

  authenticate(token: string | null | undefined) {
    if (!token) return null;
    const session = db.prepare("SELECT * FROM account_sessions WHERE token_hash = ? AND expires_at > ?")
      .get(sha256(token), now()) as SessionRow | undefined;
    if (!session) return null;
    const account = this.accountById(session.account_id);
    return account ? { sessionId: session.id, account } : null;
  },

  changePassword(accountId: string, currentPassword: string | undefined, newPassword: string) {
    const row = db.prepare("SELECT * FROM accounts WHERE id = ?").get(accountId) as AccountRow | undefined;
    if (!row) throw Object.assign(new Error("Account not found."), { statusCode: 404 });
    if (row.password_hash && row.password_salt && !verifyPassword(currentPassword ?? "", row.password_salt, row.password_hash)) {
      throw Object.assign(new Error("Current password is incorrect."), { statusCode: 401 });
    }
    const { salt, hash } = hashPassword(newPassword);
    db.prepare("UPDATE accounts SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?")
      .run(hash, salt, now(), accountId);
    return this.accountById(accountId);
  }
};
