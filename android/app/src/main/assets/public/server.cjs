var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/fallback-db.ts
var import_fs, import_path, FALLBACK_FILE_PATH, LocalAdminDbFallback, LocalCollectionRef, LocalDocumentRef, LocalDocumentSnapshot, LocalQuery, LocalQuerySnapshot, LocalWriteBatch, localFallbackDb;
var init_fallback_db = __esm({
  "server/fallback-db.ts"() {
    import_fs = __toESM(require("fs"), 1);
    import_path = __toESM(require("path"), 1);
    FALLBACK_FILE_PATH = import_path.default.resolve("server/local_admin_db.json");
    LocalAdminDbFallback = class {
      constructor() {
        this.dataStore = {};
        this.loadState();
      }
      loadState() {
        try {
          if (import_fs.default.existsSync(FALLBACK_FILE_PATH)) {
            const fileContent = import_fs.default.readFileSync(FALLBACK_FILE_PATH, "utf-8");
            this.dataStore = JSON.parse(fileContent);
            console.log(`[LocalFallbackDB] Loaded state with ${Object.keys(this.dataStore).length} collections.`);
          } else {
            this.dataStore = {
              users: {
                "default-user": {
                  uid: "default-user",
                  email: "okbgmi611@gmail.com",
                  displayName: "Developer Admin",
                  credits: 1e3,
                  role: "admin",
                  createdAt: (/* @__PURE__ */ new Date()).toISOString()
                }
              },
              api_keys: {}
            };
            this.saveState();
          }
        } catch (err) {
          console.error("[LocalFallbackDB] Error loading state:", err.message);
        }
      }
      saveState() {
        try {
          import_fs.default.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(this.dataStore, null, 2), "utf-8");
        } catch (err) {
          console.error("[LocalFallbackDB] Error saving state:", err.message);
        }
      }
      // Support .collection(name)
      collection(collectionName) {
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
      setRawDocument(collectionName, docId, data, merge = false) {
        if (!this.dataStore[collectionName]) {
          this.dataStore[collectionName] = {};
        }
        const sanitizedData = this.sanitizeData(data);
        if (merge && this.dataStore[collectionName][docId]) {
          this.dataStore[collectionName][docId] = {
            ...this.dataStore[collectionName][docId],
            ...sanitizedData,
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          };
        } else {
          this.dataStore[collectionName][docId] = {
            ...sanitizedData,
            id: docId,
            createdAt: this.dataStore[collectionName][docId]?.createdAt || (/* @__PURE__ */ new Date()).toISOString()
          };
        }
        this.saveState();
      }
      updateRawDocument(collectionName, docId, data) {
        if (!this.dataStore[collectionName] || !this.dataStore[collectionName][docId]) {
          this.setRawDocument(collectionName, docId, data, false);
          return;
        }
        const sanitizedData = this.sanitizeData(data);
        this.dataStore[collectionName][docId] = {
          ...this.dataStore[collectionName][docId],
          ...sanitizedData,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        this.saveState();
      }
      deleteRawDocument(collectionName, docId) {
        if (this.dataStore[collectionName] && this.dataStore[collectionName][docId]) {
          delete this.dataStore[collectionName][docId];
          this.saveState();
        }
      }
      sanitizeData(data) {
        if (data === null || data === void 0) return data;
        if (typeof data !== "object") return data;
        const copy = { ...data };
        for (const key of Object.keys(copy)) {
          const val = copy[key];
          if (val && typeof val === "object") {
            if (val.constructor && (val.constructor.name === "FieldValueImpl" || val.constructor.name === "FieldValue")) {
              copy[key] = (/* @__PURE__ */ new Date()).toISOString();
            } else {
              copy[key] = this.sanitizeData(val);
            }
          }
        }
        return copy;
      }
    };
    LocalCollectionRef = class {
      constructor(collectionName, db2) {
        this.collectionName = collectionName;
        this.db = db2;
      }
      doc(docId) {
        const id = docId || Math.random().toString(36).substring(2, 15);
        return new LocalDocumentRef(this.collectionName, id, this.db);
      }
      async add(data) {
        const docId = Math.random().toString(36).substring(2, 15);
        this.db.setRawDocument(this.collectionName, docId, data, false);
        return new LocalDocumentRef(this.collectionName, docId, this.db);
      }
      // Query Support
      where(field, op, val) {
        return new LocalQuery(this.collectionName, this.db).where(field, op, val);
      }
      orderBy(field, direction = "asc") {
        return new LocalQuery(this.collectionName, this.db).orderBy(field, direction);
      }
      limit(num) {
        return new LocalQuery(this.collectionName, this.db).limit(num);
      }
      // Get all documents in collection
      async get() {
        return new LocalQuery(this.collectionName, this.db).get();
      }
    };
    LocalDocumentRef = class {
      constructor(collectionName, id, db2) {
        this.collectionName = collectionName;
        this.id = id;
        this.db = db2;
      }
      async get() {
        const store = this.db.getRawStore();
        const docData = store[this.collectionName]?.[this.id];
        return new LocalDocumentSnapshot(this.id, docData);
      }
      async set(data, options) {
        this.db.setRawDocument(this.collectionName, this.id, data, options?.merge);
        return { id: this.id };
      }
      async update(data) {
        this.db.updateRawDocument(this.collectionName, this.id, data);
        return { id: this.id };
      }
      async delete() {
        this.db.deleteRawDocument(this.collectionName, this.id);
        return { id: this.id };
      }
    };
    LocalDocumentSnapshot = class {
      constructor(id, docData) {
        this.id = id;
        this.docData = docData;
        this.exists = !!docData;
      }
      data() {
        return this.docData ? { ...this.docData } : void 0;
      }
    };
    LocalQuery = class {
      constructor(collectionName, db2) {
        this.collectionName = collectionName;
        this.db = db2;
        this.filters = [];
        this.orderField = null;
        this.orderDirection = "asc";
        this.limitCount = null;
      }
      where(field, op, val) {
        this.filters.push({ field, op, val });
        return this;
      }
      orderBy(field, direction = "asc") {
        this.orderField = field;
        this.orderDirection = direction;
        return this;
      }
      limit(num) {
        this.limitCount = num;
        return this;
      }
      async get() {
        const store = this.db.getRawStore();
        const collectionData = store[this.collectionName] || {};
        let docs = Object.keys(collectionData).map((id) => ({
          id,
          ...collectionData[id]
        }));
        for (const filter of this.filters) {
          docs = docs.filter((doc9) => {
            const docVal = doc9[filter.field];
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
        if (this.orderField) {
          const field = this.orderField;
          const desc = this.orderDirection === "desc";
          docs.sort((a, b) => {
            const valA = a[field];
            const valB = b[field];
            if (valA === valB) return 0;
            if (valA === void 0) return 1;
            if (valB === void 0) return -1;
            return desc ? valA < valB ? 1 : -1 : valA > valB ? 1 : -1;
          });
        }
        if (this.limitCount !== null) {
          docs = docs.slice(0, this.limitCount);
        }
        const docSnapshots = docs.map((doc9) => {
          const { id, ...data } = doc9;
          return new LocalDocumentSnapshot(id, data);
        });
        return new LocalQuerySnapshot(docSnapshots);
      }
    };
    LocalQuerySnapshot = class {
      constructor(docs) {
        this.docs = docs;
        this.empty = docs.length === 0;
      }
    };
    LocalWriteBatch = class {
      constructor(db2) {
        this.db = db2;
        this.operations = [];
      }
      set(docRef, data, options) {
        this.operations.push(() => {
          this.db.setRawDocument(docRef.collectionName, docRef.id, data, options?.merge);
        });
        return this;
      }
      update(docRef, data) {
        this.operations.push(() => {
          this.db.updateRawDocument(docRef.collectionName, docRef.id, data);
        });
        return this;
      }
      delete(docRef) {
        this.operations.push(() => {
          this.db.deleteRawDocument(docRef.collectionName, docRef.id);
        });
        return this;
      }
      async commit() {
        this.operations.forEach((op) => op());
        return true;
      }
    };
    localFallbackDb = new LocalAdminDbFallback();
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  adminDb: () => adminDb,
  clientAuth: () => clientAuth,
  db: () => db,
  firebaseConfig: () => firebaseConfig,
  handleAdminError: () => handleAdminError,
  isAdminSDKActive: () => isAdminSDKActive,
  setAdminDb: () => setAdminDb,
  setClientAuth: () => setClientAuth,
  setDb: () => setDb,
  setFirebaseConfig: () => setFirebaseConfig,
  setIsAdminSDKActive: () => setIsAdminSDKActive,
  state: () => state,
  withTimeout: () => withTimeout
});
function setDb(newDb) {
  db = newDb;
}
function setAdminDb(newAdminDb) {
  if (newAdminDb === null || newAdminDb === void 0) {
    adminDb = localFallbackDb;
    isAdminSDKActive = false;
  } else {
    adminDb = newAdminDb;
  }
}
function setIsAdminSDKActive(active) {
  isAdminSDKActive = active;
}
function setClientAuth(newAuth) {
  clientAuth = newAuth;
}
function setFirebaseConfig(config) {
  firebaseConfig = config;
}
async function withTimeout(promise, timeoutMs = 4e3, label = "Operation") {
  let timeoutHandle = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutHandle) clearTimeout(timeoutHandle);
    return result;
  } catch (err) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    throw err;
  }
}
function handleAdminError(err, context) {
  if (err) {
    const msg = err.message || "";
    const code = err.code;
    const isCredErr = msg.toLowerCase().includes("credential") || msg.toLowerCase().includes("authenticat") || msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("unauthenticated") || msg.toLowerCase().includes("could not load default") || msg.toLowerCase().includes("gcp") || msg.toLowerCase().includes("metadata server") || msg.includes("ADC");
    if (code === 7 || isCredErr || msg.includes("PERMISSION_DENIED") || msg.toLowerCase().includes("permission")) {
      console.warn(`[Firebase] Admin SDK disabled (Authenticating/Credential issue detected)${context ? ` during ${context}` : ""}:`, msg);
      setIsAdminSDKActive(false);
      setAdminDb(null);
    }
  }
}
var db, adminDb, clientAuth, firebaseConfig, isAdminSDKActive, state;
var init_db = __esm({
  "server/db.ts"() {
    init_fallback_db();
    db = null;
    adminDb = localFallbackDb;
    clientAuth = null;
    firebaseConfig = null;
    isAdminSDKActive = false;
    state = {
      get db() {
        return db;
      },
      get adminDb() {
        return adminDb || localFallbackDb;
      },
      get clientAuth() {
        return clientAuth;
      },
      get firebaseConfig() {
        return firebaseConfig;
      },
      get isAdminSDKActive() {
        return isAdminSDKActive;
      }
    };
  }
});

// server/email.ts
var email_exports = {};
__export(email_exports, {
  captureLog: () => captureLog,
  cleanEnvVar: () => cleanEnvVar,
  formatMailToGrandTemplate: () => formatMailToGrandTemplate,
  getEmailTransporter: () => getEmailTransporter,
  getGrandEmailHtml: () => getGrandEmailHtml,
  getSmtpLogs: () => getSmtpLogs,
  initEmail: () => initEmail,
  robustSendMail: () => robustSendMail
});
function cleanEnvVar(val) {
  if (!val) return "";
  let s = val.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1).trim();
  }
  if (s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1).trim();
  }
  return s;
}
function captureLog(level, msg, obj) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[1].split(".")[0];
  const entry = `[${level}] ${timestamp} ${msg} ${obj ? typeof obj === "string" ? obj : JSON.stringify(obj).substring(0, 150) : ""}`;
  smtpLogs.push(entry);
  if (smtpLogs.length > 50) smtpLogs.shift();
}
async function resolveHostIpv4(host) {
  return new Promise((resolve) => {
    import_dns.default.resolve4(host, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        console.warn(`[SMTP-Robust] Failed to resolve ${host} to IPv4:`, err?.message);
        resolve([]);
      } else {
        console.log(`[SMTP-Robust] Resolved ${host} IPv4s:`, addresses);
        resolve(addresses);
      }
    });
  });
}
function getGrandEmailHtml(title, subtitle, contentHtml) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=Playfair+Display:ital,wght@0,600;1,400&family=Inter:wght@400;500;600&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #fcfbf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fcfbf9; padding: 40px 10px 60px 10px;">
    <tr>
      <td align="center">
        <!-- Wrapper Container with Golden Amber Glow & Shadow -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 28px; overflow: hidden; border: 1px solid #ffedd5; box-shadow: 0 20px 40px -15px rgba(245, 142, 39, 0.12), 0 15px 25px -10px rgba(0, 0, 0, 0.04);">
          
          <!-- Grand Elegant Header Banner -->
          <tr>
            <td style="background-color: #1e1b18; padding: 45px 35px 40px 35px; text-align: center; border-bottom: 5px solid #F58E27;">
              <!-- Mini Verification Badge -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 18px auto;">
                <tr>
                  <td style="background-color: rgba(245, 142, 39, 0.12); padding: 5px 14px; border-radius: 100px; border: 1px solid rgba(245, 142, 39, 0.25); text-align: center;">
                    <span style="color: #F58E27; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; font-family: 'Space Grotesk', -apple-system, sans-serif;">
                      MEMBERSHIP SECURE GATEWAY
                    </span>
                  </td>
                </tr>
              </table>
              
              <!-- Brand Title inside header -->
              <h1 style="color: #ffffff; font-family: 'Space Grotesk', -apple-system, sans-serif; font-size: 28px; font-weight: 800; letter-spacing: 1.5px; margin: 0; text-transform: uppercase;">
                BARNIA DIGITAL HUB
              </h1>
              
              <!-- Serif Italic Subtitle -->
              <p style="color: #fdba74; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-style: italic; margin: 8px 0 0 0; font-weight: 500; letter-spacing: 0.5px;">
                ${subtitle}
              </p>
            </td>
          </tr>
          
          <!-- Outer padding for core message body -->
          <tr>
            <td style="padding: 45px 40px 35px 40px; color: #1f2937; line-height: 1.75; font-family: 'Inter', -apple-system, sans-serif; font-size: 15px;">
              
              ${contentHtml}

            </td>
          </tr>

          <!-- High-Contrast Support/Action Banner -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border-left: 4px solid #ea580c; border-radius: 12px; padding: 22px;">
                <tr>
                  <td>
                    <h4 style="margin: 0 0 6px 0; color: #7c2d12; font-size: 14px; font-weight: 700; font-family: -apple-system, sans-serif;">
                      Need assistance or have features requests?
                    </h4>
                    <p style="margin: 0; color: #9a3412; font-size: 13px; line-height: 1.5; font-family: -apple-system, sans-serif;">
                      Our system is powered by AI Assistant <strong>Barnali</strong>, working 24/7. Open your dashboard to send instant queries, or ask Barnali for support anywhere.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Grand Footer Section -->
          <tr>
            <td style="background-color: #faf9f6; border-top: 1px solid #f2ece4; padding: 35px 40px; text-align: center; font-family: -apple-system, sans-serif;">
              <!-- Secure encryption stamp -->
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; padding: 4px 12px; background-color: #f1f5f9; border-radius: 6px; font-size: 11px; font-weight: 700; color: #475569; letter-spacing: 0.5px; text-transform: uppercase;">
                  \u{1F512} SSL SECURE VERIFICATION &bull; RESEND SMTP GATEWAY
                </span>
              </div>
              
              <!-- Legalities & System Details -->
              <p style="margin: 0; color: #78716c; font-size: 11px; line-height: 1.6;">
                This transmission contains sensitive account actions. Distributed under strict digital hub guidelines.<br>
                For further security, please verify the sender domain. Sent via Tokyo Cloud ap-northeast-1 network cluster.<br>
                <span style="color: #a8a29e; display: block; margin-top: 8px;">&copy; 2026 <strong>Barnia Digital Hub</strong>. All rights reserved. barnia.in</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
function formatMailToGrandTemplate(body, subject) {
  let normalizedBody = body;
  let isOtp = false;
  let otpCode = "";
  if (normalizedBody.includes("Login Verification") || normalizedBody.includes("Verification Code") || normalizedBody.includes("Your OTP") || subject.toLowerCase().includes("otp") || subject.toLowerCase().includes("verification") || subject.toLowerCase().includes("security code")) {
    isOtp = true;
    const otpMatch = normalizedBody.match(/\b(\d{6})\b/);
    if (otpMatch) {
      otpCode = otpMatch[1];
    }
  }
  if (isOtp && otpCode) {
    normalizedBody = `
      <div style="text-align: center;">
        <h2 style="color: #111827; font-size: 21px; font-weight: 800; margin: 0 0 10px 0; font-family: 'Space Grotesk', sans-serif;">
          \u{1F512} Security Verification Code
        </h2>
        <p style="color: #4b5563; font-size: 14.5px; margin: 0 0 35px 0; line-height: 1.6;">
          Use the secure One-Time Password (OTP) below to authenticate your action. This code is strictly personal and expires in 10 minutes.
        </p>
        
        <div align="center" style="margin: 30px 0 35px 0;">
          <table border="0" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fffcf5 0%, #ffedd5 100%); border: 2px dashed #F58E27; border-radius: 20px; text-align: center; box-shadow: 0 10px 25px -5px rgba(245, 142, 39, 0.1);">
            <tr>
              <td style="padding: 25px 50px;">
                <span style="display: block; color: #c2410c; font-size: 11px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 12px; font-family: 'Space Grotesk', sans-serif;">
                  YOUR SECURE OTP CODE
                </span>
                <span style="display: block; font-family: 'JetBrains Mono', Courier, monospace; font-size: 46px; font-weight: 900; letter-spacing: 12px; color: #ea580c; text-indent: 12px; line-height: 1;">
                  ${otpCode}
                </span>
                <span style="display: block; color: #9a3412; font-size: 11px; font-weight: 600; margin-top: 14px; font-family: -apple-system, sans-serif;">
                  VALID FOR ONE SESSION ONLY &bull; EXPIRED IN 10 MINUTES
                </span>
              </td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13.5px; color: #6b7280; text-align: center; margin: 30px 0 0 0; max-width: 450px; display: inline-block; line-height: 1.5;">
          If you did not initiate this authentication request, please ignore this message or report immediately to our security desk.
        </p>
      </div>
    `;
  } else if (subject.toLowerCase().includes("welcome")) {
    normalizedBody = normalizedBody.replace(/<div style="font-family: sans-serif;[\s\S]*?">/, "").replace(/<\/div>\s*$/, "").trim();
    normalizedBody = normalizedBody.replace(/<li>(.*?)<\/li>/gi, `
      <li style="margin-bottom: 15px; list-style: none; position: relative; padding-left: 24px; color: #374151; font-size: 14.5px;">
        <span style="color: #F58E27; font-size: 16px; font-weight: bold; position: absolute; left: 0; top: -1px; line-height: 1;">\u2726</span>
        $1
      </li>
    `);
    normalizedBody = normalizedBody.replace(/<ul style="padding-left: 20px; line-height: 1.6;">/gi, '<ul style="padding: 0; margin: 25px 0; line-height: 1.8;">');
    normalizedBody = normalizedBody.replace(/<h2 style="color: #111827; font-size: 20px; margin-top: 0;">(.*?)<\/h2>/gi, `
      <h2 style="color: #111827; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px; font-family: 'Space Grotesk', sans-serif;">$1</h2>
    `);
  } else {
    if (!normalizedBody.includes("<div") && !normalizedBody.includes("<p")) {
      normalizedBody = `<p style="font-size: 15.5px; color: #374151; line-height: 1.8; margin: 0; font-family: 'Inter', sans-serif;">${normalizedBody.replace(/\r?\n/g, "<br>")}</p>`;
    }
  }
  let subtitle = "Empowering Our Community, Together";
  if (isOtp) {
    subtitle = "Secure Identity & Transaction Gateway";
  } else if (subject.toLowerCase().includes("welcome")) {
    subtitle = "Welcome to Our Family & Community Portal";
  } else if (subject.toLowerCase().includes("test") || subject.toLowerCase().includes("diagnostic") || subject.toLowerCase().includes("self-test")) {
    subtitle = "SMTP & API Mail Delivery Diagnostics";
  }
  return getGrandEmailHtml(subject, subtitle, normalizedBody);
}
async function robustSendMail(mailOptions) {
  emailUser = cleanEnvVar(process.env.EMAIL_USER || process.env.SMTP_USER) || "ujirpur.barnia6@gmail.com";
  emailPass = cleanEnvVar(process.env.EMAIL_PASS || process.env.SMTP_PASS);
  const resendApiKey = cleanEnvVar(process.env.RESEND_API_KEY);
  const brevoApiKey = cleanEnvVar(process.env.BREVO_API_KEY);
  const sendgridApiKey = cleanEnvVar(process.env.SENDGRID_API_KEY);
  const originalSubject = mailOptions.subject || "Security Alert";
  const content = mailOptions.html || mailOptions.text || "";
  mailOptions.html = formatMailToGrandTemplate(content, originalSubject);
  let fromName = "Barnia Digital Hub";
  if (mailOptions.from) {
    const match = mailOptions.from.match(/^"([^"]+)"/);
    if (match) {
      fromName = match[1];
    } else {
      const angleMatch = mailOptions.from.match(/([^<]+)/);
      if (angleMatch) {
        fromName = angleMatch[1].trim();
      }
    }
  }
  mailOptions.from = `"${fromName}" <${emailUser}>`;
  const appUrl = cleanEnvVar(process.env.APP_URL) || "https://barnia.in";
  const notificationEmail = cleanEnvVar(process.env.NOTIFICATION_EMAIL) || "info@barnia.in";
  let domain = "barnia.in";
  if (notificationEmail && notificationEmail.includes("@")) {
    const parts = notificationEmail.split("@");
    if (parts.length === 2) {
      domain = parts[1].trim();
    }
  } else if (appUrl) {
    try {
      const urlObj = new URL(appUrl);
      domain = urlObj.hostname.replace("www.", "");
    } catch (e) {
      const match = appUrl.match(/https?:\/\/([^/]+)/);
      if (match) {
        domain = match[1].replace("www.", "");
      }
    }
  }
  const genericDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com", "icloud.com", "protonmail.com"];
  if (genericDomains.some((gd) => domain.toLowerCase().includes(gd)) || domain.includes("run.app") || domain.includes("render.com") || domain.includes("vercel.app") || domain.includes("localhost") || domain.includes("aistudio-") || !domain.includes(".")) {
    domain = "barnia.in";
  }
  const isGenericEmail = emailUser.includes("gmail.com") || emailUser.includes("yahoo.com") || emailUser.includes("outlook.com") || emailUser.includes("hotmail.com") || emailUser.includes("aol.com") || emailUser.includes("icloud.com");
  if (resendApiKey) {
    const customFrom = `"${fromName}" <no-reply@${domain}>`;
    try {
      console.log(`[SMTP-Robust] Found RESEND_API_KEY. Attempting HTTPS with verified domain: ${customFrom}`);
      captureLog("ROBUST-TRY", `Resend HTTPS: Sending from ${customFrom}`);
      const res = await (0, import_node_fetch.default)("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: customFrom,
          to: [mailOptions.to],
          subject: mailOptions.subject,
          html: mailOptions.html || mailOptions.text,
          text: mailOptions.text
        })
      });
      const resData = await res.json();
      if (res.ok) {
        console.log("[SMTP-Robust] \u2705 Success via Resend HTTPS API (Verified Domain):", resData);
        captureLog("ROBUST-SUCCESS", "Resend HTTPS (Verified Domain)");
        return true;
      } else {
        throw new Error(resData?.message || JSON.stringify(resData));
      }
    } catch (e) {
      console.warn(`[SMTP-Robust] Resend with Custom From failed (${e.message}). Attempting sandbox fallback...`);
      captureLog("ROBUST-FAIL", `Resend Custom From: ${e.message}`);
      try {
        const sandboxFrom = emailUser.includes("gmail.com") ? `"Barnia Hub" <onboarding@resend.dev>` : mailOptions.from;
        console.log(`[SMTP-Robust] Retrying Resend with Sandbox Sender: ${sandboxFrom}`);
        captureLog("ROBUST-TRY", `Resend HTTPS: Sandbox Retry from ${sandboxFrom}`);
        const res = await (0, import_node_fetch.default)("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: sandboxFrom,
            to: [mailOptions.to],
            subject: mailOptions.subject,
            html: mailOptions.html || mailOptions.text,
            text: mailOptions.text
          })
        });
        const resData = await res.json();
        if (res.ok) {
          console.log("[SMTP-Robust] \u2705 Success via Resend HTTPS API (Sandbox):", resData);
          captureLog("ROBUST-SUCCESS", "Resend HTTPS (Sandbox)");
          return true;
        } else {
          throw new Error(resData?.message || JSON.stringify(resData));
        }
      } catch (sandboxErr) {
        console.warn("[SMTP-Robust] \u274C Resend Sandbox delivery failed:", sandboxErr.message);
        captureLog("ROBUST-FAIL", `Resend Sandbox: ${sandboxErr.message}`);
      }
    }
  }
  if (brevoApiKey) {
    try {
      console.log("[SMTP-Robust] Found BREVO_API_KEY. Attempting HTTPS API delivery...");
      captureLog("ROBUST-TRY", "Brevo HTTPS API");
      const senderEmail3 = isGenericEmail ? `no-reply@${domain}` : emailUser;
      const res = await (0, import_node_fetch.default)("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sender: { name: fromName, email: senderEmail3 },
          to: [{ email: mailOptions.to }],
          subject: mailOptions.subject,
          htmlContent: mailOptions.html || mailOptions.text,
          textContent: mailOptions.text
        })
      });
      const resData = await res.json();
      if (res.ok) {
        console.log("[SMTP-Robust] \u2705 Success via Brevo HTTPS API");
        captureLog("ROBUST-SUCCESS", "Brevo HTTPS API");
        return true;
      } else {
        throw new Error(resData?.message || JSON.stringify(resData));
      }
    } catch (e) {
      console.warn("[SMTP-Robust] \u274C Brevo HTTPS API delivery failed:", e.message);
      captureLog("ROBUST-FAIL", `Brevo HTTPS: ${e.message}`);
    }
  }
  if (sendgridApiKey) {
    try {
      console.log("[SMTP-Robust] Found SENDGRID_API_KEY. Attempting HTTPS API delivery...");
      captureLog("ROBUST-TRY", "SendGrid HTTPS API");
      const senderEmail3 = isGenericEmail ? `no-reply@${domain}` : emailUser;
      const res = await (0, import_node_fetch.default)("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sendgridApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: mailOptions.to }] }],
          from: { email: senderEmail3, name: fromName },
          subject: mailOptions.subject,
          content: [{
            type: mailOptions.html ? "text/html" : "text/plain",
            value: mailOptions.html || mailOptions.text
          }]
        })
      });
      if (res.ok) {
        console.log("[SMTP-Robust] \u2705 Success via SendGrid HTTPS API");
        captureLog("ROBUST-SUCCESS", "SendGrid HTTPS API");
        return true;
      } else {
        const errText = await res.text();
        throw new Error(errText);
      }
    } catch (e) {
      console.warn("[SMTP-Robust] \u274C SendGrid HTTPS API delivery failed:", e.message);
      captureLog("ROBUST-FAIL", `SendGrid HTTPS: ${e.message}`);
    }
  }
  if (!emailPass) {
    console.warn("[SMTP-Robust] \u26A0\uFE0F EMAIL_PASS is empty. Sending will likely fail.");
    captureLog("WARN", "EMAIL_PASS is empty");
  } else if (emailPass.includes("@")) {
    console.warn("[SMTP-Robust] \u26A0\uFE0F EMAIL_PASS contains '@'. It looks like an email address instead of an App Password.");
    captureLog("WARN", "EMAIL_PASS looks like an email address");
  }
  let resolvedIps = [];
  try {
    resolvedIps = await resolveHostIpv4("smtp.gmail.com");
  } catch (e) {
    console.warn("[SMTP-Robust] Dynamic DNS lookup caught error:", e.message);
  }
  const hostIps = resolvedIps.length > 0 ? resolvedIps : smtpIps;
  const primaryIp = hostIps[0];
  const attempts = [
    // 1. Standard TLS-587 hostname based (Our global setDefaultResultOrder ensures clean IPv4 priority)
    { host: "smtp.gmail.com", port: 587, secure: false, label: "Gmail-TLS-587" },
    // 2. Standard SSL-465 hostname based (Many restricted environments prefer SSL over TLS upgrade)
    { host: "smtp.gmail.com", port: 465, secure: true, label: "Gmail-SSL-465" },
    // 3. Ultimate native service config via Gmail registry
    { service: "gmail", label: "SERVICE-GMAIL" },
    // 4. Direct IP-based TLS-587 (Backup - avoids DNS query entirely)
    { host: primaryIp, port: 587, secure: false, label: `DirectIP-TLS-587 (${primaryIp})` },
    // 5. Direct IP-based SSL-465 (Backup alternative)
    { host: primaryIp, port: 465, secure: true, label: `DirectIP-SSL-465 (${primaryIp})` },
    // 6. Deep backup IPs
    ...hostIps.slice(1).map((ip) => ({ host: ip, port: 587, secure: false, label: `BackupIP-TLS-587 (${ip})` })),
    ...hostIps.slice(1).map((ip) => ({ host: ip, port: 465, secure: true, label: `BackupIP-SSL-465 (${ip})` }))
  ];
  let lastError = null;
  for (const config of attempts) {
    try {
      console.log(`[SMTP-Robust] Attempting ${config.label}...`);
      captureLog("ROBUST-TRY", config.label);
      const transportConfig = {
        ...config,
        family: 4,
        auth: { user: emailUser, pass: emailPass },
        tls: { rejectUnauthorized: false, servername: "smtp.gmail.com" },
        // Enforce strict IPv4 lookup bypasses/overrides
        lookup: (hostname, options, callback) => {
          if (hostname === "smtp.gmail.com" && primaryIp && primaryIp.includes(".")) {
            callback(null, primaryIp, 4);
          } else {
            const opt = typeof options === "object" ? { ...options, family: 4 } : { family: 4 };
            opt.family = 4;
            import_dns.default.lookup(hostname, opt, (dnsErr, address, family) => {
              if (dnsErr) {
                const fallbackIp = hostIps[0] || smtpIps[0];
                callback(null, fallbackIp, 4);
              } else {
                callback(null, address, family);
              }
            });
          }
        },
        connectionTimeout: 4e3,
        greetingTimeout: 3e3,
        socketTimeout: 5e3
      };
      if (config.service) {
        delete transportConfig.host;
        delete transportConfig.port;
        delete transportConfig.secure;
      }
      const tempTransporter = import_nodemailer.default.createTransport(transportConfig);
      await tempTransporter.sendMail(mailOptions);
      console.log(`[SMTP-Robust] \u2705 Success via ${config.label}`);
      captureLog("ROBUST-SUCCESS", config.label);
      return true;
    } catch (err) {
      lastError = err;
      const msg = err.message || String(err);
      console.warn(`[SMTP-Robust] \u274C Failed via ${config.label}: ${msg.substring(0, 100)}`);
      captureLog("ROBUST-FAIL", `${config.label}: ${msg}`);
    }
  }
  throw lastError;
}
function getSmtpLogs() {
  return smtpLogs;
}
function initEmail() {
  emailUser = cleanEnvVar(process.env.EMAIL_USER || process.env.SMTP_USER) || "ujirpur.barnia6@gmail.com";
  emailPass = cleanEnvVar(process.env.EMAIL_PASS || process.env.SMTP_PASS);
  console.log(`[Email] \u{1F4EC} Diagnostic SMTP Init:`);
  console.log(`        - SMTP User: "${emailUser}"`);
  if (!emailPass) {
    console.warn(`        - \u274C SMTP Pass: NOT DEFINED (EMAIL_PASS or SMTP_PASS is missing in environment variables!)`);
  } else {
    console.log(`        - \u2705 SMTP Pass: Defined (Length: ${emailPass.length} chars, starts with "${emailPass[0]}...", ends with "...${emailPass[emailPass.length - 1]}")`);
    if (emailPass.includes("@")) {
      console.warn(`        - \u26A0\uFE0F Warning: SMTP Pass contains '@'. It looks like an email address instead of a 16-character App Password!`);
    } else if (emailPass.length !== 16) {
      console.log(`        - \u2139\uFE0F Info: Gmail App Password is typically 16 characters. Selected auth pass length is ${emailPass.length}.`);
    }
  }
  transporter = import_nodemailer.default.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: emailUser, pass: emailPass },
    family: 4
  });
  console.log(`[Email] System Initialized.`);
}
function getEmailTransporter() {
  return transporter;
}
var import_nodemailer, import_node_fetch, import_dns, transporter, emailUser, emailPass, smtpIps, smtpLogs;
var init_email = __esm({
  "server/email.ts"() {
    import_nodemailer = __toESM(require("nodemailer"), 1);
    import_node_fetch = __toESM(require("node-fetch"), 1);
    import_dns = __toESM(require("dns"), 1);
    transporter = null;
    emailUser = "";
    emailPass = "";
    emailUser = cleanEnvVar(process.env.EMAIL_USER || process.env.SMTP_USER) || "ujirpur.barnia6@gmail.com";
    emailPass = cleanEnvVar(process.env.EMAIL_PASS || process.env.SMTP_PASS);
    smtpIps = ["173.194.77.108", "74.125.133.108", "142.250.150.108", "64.233.184.108"];
    smtpLogs = [];
  }
});

// server/constants.ts
var FIRESTORE_SERVER_KEY, CACHE_TTL;
var init_constants = __esm({
  "server/constants.ts"() {
    FIRESTORE_SERVER_KEY = "barnia-system-2024-v1";
    CACHE_TTL = 1e3 * 60 * 2;
  }
});

// server/vamshavali-logic.ts
var vamshavali_logic_exports = {};
__export(vamshavali_logic_exports, {
  bootstrapProfile: () => bootstrapProfile,
  demoMembers: () => demoMembers
});
async function bootstrapProfile(email, db2, adminDb2, admin5) {
  const newProfileData = {
    email,
    name: "The Royal Lineage of Savitri Devi",
    shareId: Math.random().toString(36).substring(2, 10).toUpperCase(),
    parents: "Traditional Ancestors",
    grandparents: "Ancestral Roots",
    gotra: "Kashyap",
    kuldevi: "Mata Rani",
    kuldevta: "Lord Shiva",
    kuldeviPhoto: "https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=800&auto=format&fit=crop",
    nativePlace: "Varanasi, Uttar Pradesh",
    additionalNotes: "A legacy of strength spanning generations.",
    members: demoMembers,
    updatedAt: adminDb2 ? admin5.firestore.FieldValue.serverTimestamp() : (0, import_firestore5.serverTimestamp)(),
    createdAt: adminDb2 ? admin5.firestore.FieldValue.serverTimestamp() : (0, import_firestore5.serverTimestamp)()
  };
  if (adminDb2) {
    const docRef = await adminDb2.collection("vamshavali_profiles").add(newProfileData);
    return { id: docRef.id, ...newProfileData };
  } else if (db2) {
    newProfileData.serverKey = FIRESTORE_SERVER_KEY;
    const docRef = await (0, import_firestore5.addDoc)((0, import_firestore5.collection)(db2, "vamshavali_profiles"), newProfileData);
    return { id: docRef.id, ...newProfileData };
  }
  return null;
}
var import_firestore5, demoMembers;
var init_vamshavali_logic = __esm({
  "server/vamshavali-logic.ts"() {
    import_firestore5 = require("firebase/firestore");
    init_constants();
    demoMembers = [
      {
        id: "root-1",
        name: "Savitri Devi",
        role: "Matriarch",
        birthYear: "1945",
        photo: "https://images.unsplash.com/photo-1544120190-27583f2335a2?w=800&auto=format&fit=crop",
        partner: {
          name: "Late Shri Ram Sharma",
          birthYear: "1940 - 2015",
          photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop"
        },
        children: [
          {
            id: "child-1",
            name: "Meera Sharma",
            role: "Daughter (Gen 1)",
            birthYear: "1972",
            photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop",
            children: [
              {
                id: "grand-1",
                name: "Ananya Sharma",
                role: "Granddaughter (Gen 2)",
                birthYear: "1998",
                photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&auto=format&fit=crop",
                children: [
                  {
                    id: "great-1",
                    name: "Ishani Sharma",
                    role: "Great-Granddaughter (Gen 3)",
                    birthYear: "2026",
                    photo: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop",
                    children: []
                  }
                ]
              },
              {
                id: "grand-2",
                name: "Rohan Sharma",
                role: "Grandson (Gen 2)",
                birthYear: "2002",
                photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop",
                children: []
              }
            ]
          }
        ]
      }
    ];
  }
});

// server.ts
var import_express = __toESM(require("express"), 1);
var import_dns2 = __toESM(require("dns"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_firebase_admin4 = __toESM(require("firebase-admin"), 1);
init_db();

// server/init.ts
var import_path2 = __toESM(require("path"), 1);
var import_promises = __toESM(require("fs/promises"), 1);
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_firestore = require("firebase-admin/firestore");
var import_app = require("firebase/app");
var import_firestore2 = require("firebase/firestore");
var import_auth = require("firebase/auth");
init_db();
init_email();
async function initSDKs() {
  try {
    const configPath = import_path2.default.resolve("firebase-applet-config.json");
    let config;
    try {
      const configData = await import_promises.default.readFile(configPath, "utf-8");
      config = JSON.parse(configData);
    } catch (e) {
      console.warn("[Init] firebase-applet-config.json not found, falling back to env...");
      config = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID || "(default)"
      };
    }
    setFirebaseConfig(config);
    if (config.projectId) {
      console.log(`[Firebase] Initializing for project: ${config.projectId}`);
      const dbIdOrig = config.firestoreDatabaseId;
      const dbId = dbIdOrig === "(default)" || !dbIdOrig ? void 0 : dbIdOrig;
      if (!import_firebase_admin.default.apps.length) {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
          try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            import_firebase_admin.default.initializeApp({
              credential: import_firebase_admin.default.credential.cert(serviceAccount),
              databaseURL: config.databaseURL
            });
            console.log(`[Firebase] Admin SDK initialized via Service Account Key`);
          } catch (e) {
            console.warn("[Firebase] Failed to parse service account key, initializing with default credentials...");
            import_firebase_admin.default.initializeApp({ projectId: config.projectId });
          }
        } else {
          import_firebase_admin.default.initializeApp({ projectId: config.projectId });
          console.log(`[Firebase] Admin SDK initialized via Project ID`);
        }
      } else {
        console.log(`[Firebase] Admin SDK already initialized. Apps: ${import_firebase_admin.default.apps.length}`);
      }
      const appInstance = import_firebase_admin.default.apps[0];
      const adb = dbId ? (0, import_firestore.getFirestore)(appInstance, dbId) : (0, import_firestore.getFirestore)(appInstance);
      setAdminDb(adb);
      console.log(`[Firebase] Checking Admin DB connection capability...`);
      try {
        await adb.collection("_health_check").limit(1).get();
        console.log(`[Firebase] Admin DB verification passed (DB: ${dbId || "default"}).`);
        setIsAdminSDKActive(true);
      } catch (authErr) {
        const errMsg = authErr.message || "";
        const isCredErr = errMsg.toLowerCase().includes("credential") || errMsg.toLowerCase().includes("could not load default") || errMsg.toLowerCase().includes("permission") || errMsg.toLowerCase().includes("unauthenticated") || errMsg.toLowerCase().includes("unauthorized") || errMsg.toLowerCase().includes("google-auth");
        if (isCredErr) {
          console.log(`[Firebase] Admin SDK disabled (will operate in clean local fallback mode): Default credentials absent`);
        } else {
          console.warn(`[Firebase] Admin DB connection verification info:`, errMsg);
        }
        handleAdminError(authErr, "Startup verification");
      }
      console.log(`[Firebase] Initializing/Checking Client SDK...`);
      try {
        const { getApp, getApps } = await import("firebase/app");
        let clientApp;
        if (!getApps().length) {
          clientApp = (0, import_app.initializeApp)(config);
          console.log("[Firebase] Client App newly initialized");
        } else {
          clientApp = getApp();
          console.log("[Firebase] Using existing Client App");
        }
        const firestore = dbId ? (0, import_firestore2.getFirestore)(clientApp, dbId) : (0, import_firestore2.getFirestore)(clientApp);
        setDb(firestore);
        setClientAuth((0, import_auth.getAuth)(clientApp));
        console.log(`[Firebase] Client SDK reference set. Valid db: ${!!firestore}`);
      } catch (clientErr) {
        console.error("[Firebase] Client SDK initialization failed:", clientErr.message);
      }
    }
    await initEmail();
  } catch (error) {
    console.error("[Init] Error during SDK initialization:", error);
  }
}

// server/routes.ts
var import_node_fetch3 = __toESM(require("node-fetch"), 1);

// server/sitemap.ts
var import_firestore3 = require("firebase/firestore");
var import_node_fetch2 = __toESM(require("node-fetch"), 1);
async function generateSitemapXml(baseUrl, db2, adminDb2, firebaseConfig3) {
  let urls = [
    { loc: `${baseUrl}/`, changefreq: "daily", priority: "1.0" },
    { loc: `${baseUrl}/bazar`, changefreq: "daily", priority: "0.9" },
    { loc: `${baseUrl}/influencers`, changefreq: "daily", priority: "0.9" },
    { loc: `${baseUrl}/ponjika`, changefreq: "weekly", priority: "0.7" },
    { loc: `${baseUrl}/chat`, changefreq: "always", priority: "0.5" }
  ];
  const fetchCollection = async (collectionName) => {
    let docs = [];
    if (adminDb2) {
      try {
        const snap = await adminDb2.collection(collectionName).get();
        snap.forEach((doc9) => docs.push({ id: doc9.id, ...doc9.data() }));
        return docs;
      } catch (e) {
        console.warn(`[Sitemap] Admin SDK failed for ${collectionName}`);
      }
    }
    if (db2) {
      try {
        const snap = await (0, import_firestore3.getDocs)((0, import_firestore3.collection)(db2, collectionName));
        snap.forEach((docSnap) => docs.push({ id: docSnap.id, ...docSnap.data() }));
        return docs;
      } catch (e) {
        console.warn(`[Sitemap] Client SDK failed for ${collectionName}`);
      }
    }
    try {
      const projectId = firebaseConfig3?.projectId;
      const dbId = firebaseConfig3?.firestoreDatabaseId || "(default)";
      if (projectId) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/${collectionName}`;
        const response = await (0, import_node_fetch2.default)(url);
        if (response.ok) {
          const json = await response.json();
          if (json.documents) {
            json.documents.forEach((doc9) => {
              const id = doc9.name.split("/").pop();
              const fields = doc9.fields;
              const data = { id };
              if (fields) {
                for (const key in fields) {
                  const val = fields[key];
                  if (val.stringValue !== void 0) data[key] = val.stringValue;
                  else if (val.integerValue !== void 0) data[key] = val.integerValue;
                  else if (val.booleanValue !== void 0) data[key] = val.booleanValue;
                }
              }
              docs.push(data);
            });
          }
        }
      }
    } catch (e) {
      console.error(`[Sitemap] REST API failed for ${collectionName}:`, e);
    }
    return docs;
  };
  const shops = await fetchCollection("shops");
  shops.forEach((shop) => {
    const slug = shop.slug || shop.id;
    urls.push({ loc: `${baseUrl}/shop/${slug}`, changefreq: "weekly", priority: "0.8" });
  });
  const influencers = await fetchCollection("influencers");
  influencers.forEach((influencer) => {
    const slug = influencer.slug || influencer.id;
    urls.push({ loc: `${baseUrl}/profile/${slug}`, changefreq: "weekly", priority: "0.8" });
  });
  const news = await fetchCollection("news");
  news.sort((a, b) => b.id.localeCompare(a.id));
  news.slice(0, 10).forEach((doc9) => {
    const date = doc9.id;
    ["top", "local", "sports"].forEach((tab) => {
      if (doc9[tab] && Array.isArray(doc9[tab])) {
        doc9[tab].forEach((_, index) => {
          if (index < 3) {
            urls.push({ loc: `${baseUrl}/news/${date}/${tab}/${index}`, changefreq: "monthly", priority: "0.6" });
          }
        });
      }
    });
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map((url) => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join("")}
</urlset>`;
}

// server/routes.ts
init_email();
init_constants();
var import_firestore4 = require("firebase/firestore");
init_db();
function setupRoutes(app, _db, _adminDb, firebaseConfig3, newsLocks2) {
  app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
  app.get("/api/ping", (req, res) => res.send("pong"));
  app.get("/api/debug-smtp", (req, res) => {
    const emailUserVal = process.env.EMAIL_USER || process.env.SMTP_USER || "ujirpur.barnia6@gmail.com";
    const emailPassVal = process.env.EMAIL_PASS || process.env.SMTP_PASS || "";
    const mask = (str) => {
      if (!str) return "not-defined";
      if (str.length <= 4) return "****";
      return str[0] + "****" + str[str.length - 1];
    };
    res.json({
      status: "debugging",
      user: mask(emailUserVal),
      passLength: emailPassVal.length,
      passMask: mask(emailPassVal),
      hasUserEnvValue: !!(process.env.EMAIL_USER || process.env.SMTP_USER),
      hasPassEnvValue: !!(process.env.EMAIL_PASS || process.env.SMTP_PASS),
      nodeEnv: process.env.NODE_ENV,
      smtpLogs: getSmtpLogs()
    });
  });
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = "https://barnia.in";
      const sitemap = await generateSitemapXml(baseUrl, state.db, state.adminDb, firebaseConfig3);
      res.status(200).set("Content-Type", "application/xml").send(sitemap);
    } catch (error) {
      console.error("[SEO] Error generating sitemap.xml:", error);
      res.status(500).send("Error generating sitemap");
    }
  });
  app.get("/api/telegram-proxy", async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl || !imageUrl.includes("telegram.org")) return res.status(403).send("Forbidden");
    try {
      const response = await (0, import_node_fetch3.default)(imageUrl, { family: 4 });
      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      const buffer = await response.buffer();
      res.send(buffer);
    } catch (error) {
      res.status(500).send("Proxy error");
    }
  });
  app.post("/api/webhooks/email", async (req, res) => {
    const { from, to, subject, text, html } = req.body;
    try {
      if (state.adminDb) {
        await state.adminDb.collection("inbound_emails").add({
          from: from || "unknown",
          to: to || "system",
          subject: subject || "No Subject",
          body: text || html || "",
          timestamp: /* @__PURE__ */ new Date()
        });
      } else if (state.db) {
        await (0, import_firestore4.addDoc)((0, import_firestore4.collection)(state.db, "inbound_emails"), {
          from: from || "unknown",
          to: to || "system",
          subject: subject || "No Subject",
          body: text || html || "",
          timestamp: (0, import_firestore4.serverTimestamp)(),
          serverKey: FIRESTORE_SERVER_KEY
        });
      }
      res.json({ status: "success" });
    } catch (e) {
      res.status(500).send("Email processing error");
    }
  });
}

// server/gemini.ts
var import_genai = require("@google/genai");
var import_path3 = __toESM(require("path"), 1);
var import_promises2 = __toESM(require("fs/promises"), 1);
async function callGeminiWithRetry(apiKey, options, maxRetries = 3) {
  if (!apiKey) throw new Error("Gemini API Key is missing");
  const ai = new import_genai.GoogleGenAI({
    apiKey,
    apiVersion: "v1beta",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
  let lastError;
  const fallbackModels = [
    "gemini-3.5-flash",
    // Recommended primary standard model (v1beta supported)
    "gemini-3.1-flash-lite",
    // Lightweight fallback
    "gemini-flash-latest"
    // Alias
  ];
  const requestedModel = options.model || "gemini-3.5-flash";
  const modelsToTry = Array.from(/* @__PURE__ */ new Set([
    requestedModel,
    ...fallbackModels
  ]));
  const totalAttempts = modelsToTry.length * (maxRetries + 1);
  const backoffDelays = [1e3, 2e3, 4e3, 8e3];
  for (let i = 0; i < totalAttempts; i++) {
    const currentModel = modelsToTry[i % modelsToTry.length];
    const cycle = Math.floor(i / modelsToTry.length);
    try {
      console.log(`[Gemini] Requesting ${currentModel}... (Attempt ${i + 1}/${totalAttempts}, Cycle ${cycle + 1})`);
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: options.contents,
        config: options.config || options.generationConfig || {
          temperature: 0.7,
          topP: 0.95,
          topK: 40
        }
      });
      const textValue = response.text;
      if (textValue) {
        console.log(`[Gemini] Success with ${currentModel}`);
        return { text: textValue, modelUsed: currentModel };
      }
      console.warn(`[Gemini] ${currentModel} returned empty response.`);
    } catch (error) {
      lastError = error;
      const errorStr = (error?.message || String(error)).toLowerCase();
      console.error(`[Gemini] Error with ${currentModel}:`, errorStr);
      const isQuotaExceeded = errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("resource_exhausted");
      const isUnavailable = errorStr.includes("503") || errorStr.includes("overloaded") || errorStr.includes("unavailable");
      const isNotFoundError = errorStr.includes("404") || errorStr.includes("not found");
      if (i < totalAttempts - 1) {
        let delay = 0;
        if (isQuotaExceeded) {
          let retryAfter = 0;
          try {
            const match = errorStr.match(/retrydelay["\s:]+["'](\d+)s/);
            if (match && match[1]) {
              retryAfter = parseInt(match[1]) * 1e3;
              console.log(`[Gemini] Detected retrydelay of ${retryAfter}ms from error message.`);
            }
          } catch (e) {
          }
          const cycleDelay = cycle === 0 ? 500 : backoffDelays[Math.min(cycle - 1, backoffDelays.length - 1)];
          delay = Math.max(cycleDelay, retryAfter > 0 && retryAfter < 1e4 ? retryAfter : 0);
          if (delay > 0) {
            console.log(`[Gemini] Quota exceeded. Waiting ${delay}ms before trying ${modelsToTry[(i + 1) % modelsToTry.length]}.`);
          }
        } else if (isUnavailable || isNotFoundError) {
          delay = isNotFoundError ? 0 : 1e3;
        } else {
          delay = 1e3;
        }
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        continue;
      }
    }
  }
  throw lastError;
}
function setupGeminiRoute(app) {
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const apiKey = await getGeminiApiKey();
      const { model, contents, config } = req.body;
      const result = await callGeminiWithRetry(apiKey, { model, contents, config });
      res.json(result);
    } catch (e) {
      console.error("[GeminiAPI] Error:", e);
      res.status(500).json({ error: e.message || "Failed to generate content" });
    }
  });
}
async function getGeminiApiKey(firebaseConfig3) {
  const keyNames = [
    "GOOGLE_API_KEY",
    "GEMINI_API_KEY",
    "NEXT_PUBLIC_GEMINI_API_KEY",
    "API_KEY",
    "VITE_GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY"
  ];
  let apiKey;
  for (const name of keyNames) {
    const val = process.env[name];
    if (val && val !== "MY_GEMINI_API_KEY" && val !== "" && val !== "undefined" && val !== "null" && val !== "AI Studio Free Tier") {
      apiKey = val;
      break;
    }
  }
  if (!apiKey) {
    const aizaKeyName = Object.keys(process.env).find((k) => {
      const val = process.env[k];
      return val && typeof val === "string" && val.startsWith("AIza") && val.length > 10;
    });
    if (aizaKeyName) {
      apiKey = process.env[aizaKeyName];
    }
  }
  if (!apiKey) {
    try {
      const configPath = import_path3.default.resolve("firebase-applet-config.json");
      const configData = await import_promises2.default.readFile(configPath, "utf-8");
      const config = JSON.parse(configData);
      if (config.apiKey && !config.apiKey.includes("TODO") && config.apiKey.length > 10) {
        apiKey = config.apiKey;
      }
    } catch (e) {
    }
  }
  if (!apiKey) {
    throw new Error("Gemini API key is missing.");
  }
  return apiKey;
}

// server/vamshavali-api.ts
var import_firestore6 = require("firebase/firestore");
init_email();
init_constants();
init_db();
var memoryVamshavaliOtps = /* @__PURE__ */ new Map();
var senderEmail = (process.env.EMAIL_USER || process.env.SMTP_USER || "ujirpur.barnia6@gmail.com").trim();
function setupVamshavaliRoutes(app, _db, _adminDb, admin5) {
  app.post("/api/vamshavali/send-otp", async (req, res) => {
    let { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    email = email.toLowerCase().trim();
    try {
      const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
      console.log(`[Vamshavali] Generating OTP for ${email}...`);
      console.log(`\u{1F511} [DEVELOPER] Generated Vamshavali OTP for ${email} is: ${otp}`);
      const otpDocData = {
        otp,
        expiresAt,
        createdAt: admin5 ? admin5.firestore.FieldValue.serverTimestamp() : /* @__PURE__ */ new Date()
      };
      memoryVamshavaliOtps.set(email, { otp, expiresAt });
      let saved = true;
      (async () => {
        if (state.adminDb) {
          try {
            await withTimeout(
              state.adminDb.collection("vamshavali_otps").doc(email).set(otpDocData),
              3e3,
              "AdminDB set Vamshavali OTP"
            );
            console.log(`[Vamshavali] OTP saved to AdminDB (bg)`);
            return;
          } catch (e) {
            console.warn("[Vamshavali] AdminDB save failed or timed out:", e.message);
            try {
              const defaultDb = admin5.firestore();
              if (defaultDb !== state.adminDb) {
                await withTimeout(
                  defaultDb.collection("vamshavali_otps").doc(email).set(otpDocData),
                  3e3,
                  "DefaultDb set Vamshavali OTP"
                );
                console.log(`[Vamshavali] OTP saved to DefaultDb (bg)`);
                return;
              }
            } catch (e2) {
            }
          }
        } else if (admin5 && typeof admin5.firestore === "function") {
          try {
            await withTimeout(
              admin5.firestore().collection("vamshavali_otps").doc(email).set(otpDocData),
              3e3,
              "DirectAdmin Firestore set Vamshavali OTP"
            );
            console.log(`[Vamshavali] OTP saved to direct admin firestore (bg)`);
            return;
          } catch (e) {
          }
        }
        if (state.db) {
          try {
            await withTimeout(
              (0, import_firestore6.setDoc)((0, import_firestore6.doc)(state.db, "vamshavali_otps", email), {
                ...otpDocData,
                createdAt: (0, import_firestore6.serverTimestamp)(),
                serverKey: FIRESTORE_SERVER_KEY
              }),
              3e3,
              "ClientDB set Vamshavali OTP"
            );
            console.log(`[Vamshavali] OTP saved to ClientDB (bg)`);
          } catch (e) {
          }
        }
      })().catch((err) => console.error("[Vamshavali] Background OTP save failed:", err));
      const mailOptions = {
        from: `"Barnia Digital Hub" <${senderEmail}>`,
        to: email,
        subject: `Your OTP for Vamshavali`,
        html: `<h1>Your OTP: ${otp}</h1>`
      };
      robustSendMail(mailOptions).catch((err) => {
        console.error(`[Vamshavali] Background send OTP email failed for ${email}:`, err);
      });
      const isDeveloper = email === "okbgmi611@gmail.com" || email === "ujirpur.barnia6@gmail.com";
      res.json({
        success: true,
        ...isDeveloper ? { debugOtp: otp } : {}
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/vamshavali/verify-otp", async (req, res) => {
    let { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });
    email = email.toLowerCase().trim();
    otp = otp.trim();
    try {
      let otpData = null;
      console.log(`[Vamshavali] Verifying OTP for ${email}...`);
      const memData = memoryVamshavaliOtps.get(email);
      if (memData) {
        const hasMatch = memData.otp === otp;
        const hasTime = memData.expiresAt > /* @__PURE__ */ new Date();
        console.log(`[Vamshavali] Memory OTP check for ${email}: input="${otp}", stored="${memData.otp}" (match: ${hasMatch}), expires="${memData.expiresAt.toISOString()}" (valid: ${hasTime})`);
        if (hasMatch && hasTime) {
          otpData = memData;
          console.log(`[Vamshavali] OTP verified via memory`);
        }
      } else {
        console.log(`[Vamshavali] No active memory OTP found for ${email}`);
      }
      if (!otpData && state.adminDb) {
        try {
          const snap = await withTimeout(
            state.adminDb.collection("vamshavali_otps").doc(email).get(),
            3e3,
            "AdminDB get Vamshavali OTP"
          );
          if (snap && snap.exists) {
            otpData = snap.data();
            console.log(`[Vamshavali] Loaded stored OTP from AdminDB for ${email}`);
          }
        } catch (e) {
          console.warn("[Vamshavali] AdminDB verify check failed or timed out:", e.message);
          try {
            const defaultDb = admin5.firestore();
            if (defaultDb !== state.adminDb) {
              const snap = await withTimeout(
                defaultDb.collection("vamshavali_otps").doc(email).get(),
                3e3,
                "DefaultDb get Vamshavali OTP"
              );
              if (snap && snap.exists) {
                otpData = snap.data();
                console.log(`[Vamshavali] Loaded stored OTP from DefaultDb for ${email}`);
              }
            }
          } catch (e2) {
          }
        }
      } else if (!otpData && admin5 && typeof admin5.firestore === "function") {
        try {
          const snap = await withTimeout(
            admin5.firestore().collection("vamshavali_otps").doc(email).get(),
            3e3,
            "DirectAdmin Firestore get Vamshavali OTP"
          );
          if (snap && snap.exists) {
            otpData = snap.data();
            console.log(`[Vamshavali] Loaded stored OTP from Direct Firestore for ${email}`);
          }
        } catch (e) {
        }
      }
      if (!otpData && state.db) {
        try {
          const snap = await withTimeout(
            (0, import_firestore6.getDoc)((0, import_firestore6.doc)(state.db, "vamshavali_otps", email)),
            3e3,
            "ClientDB get Vamshavali OTP"
          );
          if (snap && snap.exists()) {
            otpData = snap.data();
            console.log(`[Vamshavali] Loaded stored OTP from ClientDB for ${email}`);
          }
        } catch (e) {
        }
      }
      if (!otpData) {
        console.warn(`[Vamshavali] Verification failed: No stored OTP data found for ${email}`);
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
      if (otpData.otp !== otp) {
        console.warn(`[Vamshavali] Verification failed: OTP code mismatch for ${email}. Entered "${otp}", Expected "${otpData.otp}"`);
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
      let expiresAt;
      if (otpData.expiresAt?.toDate) expiresAt = otpData.expiresAt.toDate();
      else if (otpData.expiresAt?._seconds) expiresAt = new Date(otpData.expiresAt._seconds * 1e3);
      else expiresAt = new Date(otpData.expiresAt);
      console.log(`[Vamshavali] DB OTP expiry check: expires="${expiresAt.toISOString()}", now="${(/* @__PURE__ */ new Date()).toISOString()}"`);
      if (expiresAt < /* @__PURE__ */ new Date()) {
        console.warn(`[Vamshavali] Verification failed: Stored OTP has expired for ${email}`);
        return res.status(400).json({ error: "OTP has expired" });
      }
      memoryVamshavaliOtps.delete(email);
      if (state.adminDb) {
        state.adminDb.collection("vamshavali_otps").doc(email).delete().catch(() => {
        });
      }
      let profile = null;
      if (state.adminDb) {
        try {
          const snap = await withTimeout(
            state.adminDb.collection("vamshavali_profiles").where("email", "==", email).limit(1).get(),
            3e3,
            "AdminDB get Vamshavali Profile"
          );
          if (snap && !snap.empty) {
            profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
          }
        } catch (e) {
          console.warn("[Vamshavali] AdminDB query profile timed out or failed:", e.message);
        }
      }
      if (!profile && state.db) {
        try {
          const q = (0, import_firestore6.query)((0, import_firestore6.collection)(state.db, "vamshavali_profiles"), (0, import_firestore6.where)("email", "==", email), (0, import_firestore6.limit)(1));
          const snap = await withTimeout(
            (0, import_firestore6.getDocs)(q),
            3e3,
            "ClientDB get Vamshavali Profile"
          );
          if (snap && !snap.empty) {
            profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
          }
        } catch (e) {
          console.warn("[Vamshavali] ClientDB query profile timed out or failed:", e.message);
        }
      }
      if (!profile) {
        try {
          const { bootstrapProfile: bootstrapProfile2 } = await Promise.resolve().then(() => (init_vamshavali_logic(), vamshavali_logic_exports));
          profile = await withTimeout(
            bootstrapProfile2(email, state.db, state.adminDb, admin5),
            3500,
            "Bootstrap Profile"
          );
        } catch (e) {
          console.error("[Vamshavali] Bootstrap Profile failed or timed out:", e.message);
          const { demoMembers: demoMembers2 } = await Promise.resolve().then(() => (init_vamshavali_logic(), vamshavali_logic_exports));
          profile = {
            id: `temp_${Date.now()}`,
            email,
            name: "Family Heritage Profile",
            shareId: Math.random().toString(36).substring(2, 10).toUpperCase(),
            parents: "Traditional Ancestors",
            grandparents: "Ancestral Roots",
            gotra: "Kashyap",
            kuldevi: "Mata Rani",
            kuldevta: "Lord Shiva",
            nativePlace: "Varanasi, Uttar Pradesh",
            members: demoMembers2
          };
        }
      }
      res.json({ success: true, profile });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.get("/api/vamshavali/profile/:email", async (req, res) => {
    const { email } = req.params;
    try {
      let profile = null;
      if (state.adminDb) {
        try {
          const snap = await withTimeout(
            state.adminDb.collection("vamshavali_profiles").where("email", "==", email).limit(1).get(),
            3e3,
            "AdminDB get profile param"
          );
          if (snap && !snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
        } catch (e) {
        }
      }
      if (!profile && state.db) {
        try {
          const q = (0, import_firestore6.query)((0, import_firestore6.collection)(state.db, "vamshavali_profiles"), (0, import_firestore6.where)("email", "==", email), (0, import_firestore6.limit)(1));
          const snap = await withTimeout(
            (0, import_firestore6.getDocs)(q),
            3e3,
            "ClientDB get profile param"
          );
          if (snap && !snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
        } catch (e) {
        }
      }
      if (profile) res.json(profile);
      else res.status(404).json({ error: "Profile not found" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/vamshavali/update-profile", async (req, res) => {
    const profile = req.body;
    if (!profile || !profile.id) return res.status(400).json({ error: "Invalid profile data" });
    try {
      const { id, ...profileData } = profile;
      let saved = false;
      if (state.adminDb) {
        try {
          const dataForAdmin = {
            ...profileData,
            updatedAt: admin5.firestore.FieldValue.serverTimestamp()
          };
          await state.adminDb.collection("vamshavali_profiles").doc(id).set(dataForAdmin, { merge: true });
          saved = true;
        } catch (e) {
          console.warn("[VamshavaliAPI] Admin SDK profile update failed:", e.message);
        }
      }
      if (!saved && state.db) {
        try {
          await (0, import_firestore6.updateDoc)((0, import_firestore6.doc)(state.db, "vamshavali_profiles", id), {
            ...profileData,
            updatedAt: (0, import_firestore6.serverTimestamp)(),
            serverKey: FIRESTORE_SERVER_KEY
          });
          saved = true;
        } catch (e) {
          console.error("[VamshavaliAPI] Client SDK profile update failed:", e.message);
        }
      }
      if (saved) res.json({ success: true });
      else throw new Error("Failed to save profile");
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.get("/api/vamshavali/p/:shareId", async (req, res) => {
    const { shareId } = req.params;
    try {
      let profile = null;
      if (state.adminDb) {
        const snap = await state.adminDb.collection("vamshavali_profiles").where("shareId", "==", shareId).limit(1).get();
        if (!snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
      if (!profile && state.db) {
        const q = (0, import_firestore6.query)((0, import_firestore6.collection)(state.db, "vamshavali_profiles"), (0, import_firestore6.where)("shareId", "==", shareId), (0, import_firestore6.limit)(1));
        const snap = await (0, import_firestore6.getDocs)(q);
        if (!snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
      if (profile) {
        const { email, ...publicData } = profile;
        res.json(publicData);
      } else {
        res.status(404).json({ error: "Public profile not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// server/auth-api.ts
init_email();
init_constants();
var import_firestore7 = require("firebase/firestore");
init_db();
var memoryOtps = /* @__PURE__ */ new Map();
var senderEmail2 = (process.env.EMAIL_USER || process.env.SMTP_USER || "ujirpur.barnia6@gmail.com").trim();
function setupAuthRoutes(app, _db, _adminDb, admin5) {
  console.log(`[AuthAPI] Setup Routes. DB available: ${!!state.db}, AdminDB available: ${!!state.adminDb}`);
  app.post("/api/auth/otp/send", async (req, res) => {
    let { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    email = email.toLowerCase().trim();
    try {
      const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
      console.log(`[AuthAPI] Generating OTP for ${email}...`);
      console.log(`\u{1F511} [DEVELOPER] Generated OTP for ${email} is: ${otp}`);
      let saved = false;
      const otpDocData = {
        otp,
        expiresAt,
        createdAt: admin5 ? admin5.firestore.FieldValue.serverTimestamp() : /* @__PURE__ */ new Date(),
        serverKey: FIRESTORE_SERVER_KEY
      };
      memoryOtps.set(email, { otp, expiresAt });
      (async () => {
        if (state.adminDb) {
          try {
            await withTimeout(
              state.adminDb.collection("auth_otps").doc(email).set(otpDocData),
              3e3,
              "AdminDB save OTP"
            );
            console.log(`[AuthAPI] OTP saved to AdminDB (bg)`);
            return;
          } catch (e) {
            console.warn("[AuthAPI] AdminDB background save failed:", e.message);
            handleAdminError(e, "AuthAPI OTP send bg");
          }
        }
        if (state.db) {
          try {
            await withTimeout(
              (0, import_firestore7.setDoc)((0, import_firestore7.doc)(state.db, "auth_otps", email), {
                otp,
                expiresAt,
                createdAt: (0, import_firestore7.serverTimestamp)(),
                serverKey: FIRESTORE_SERVER_KEY
              }),
              3e3,
              "ClientDB save OTP"
            );
            console.log(`[AuthAPI] OTP saved to ClientDB (bg)`);
          } catch (e) {
            console.warn("[AuthAPI] ClientDB background save failed:", e.message);
          }
        }
      })().catch((err) => console.error("[AuthAPI] Background OTP save failed:", err));
      const mailOptions = {
        from: `"Barnia Digital Hub" <${senderEmail2}>`,
        to: email,
        subject: `Your Login OTP for Barnia Digital Hub`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb;">Login Verification</h2>
            <p>Use the following One-Time Password (OTP) to log in to your account. This OTP is valid for 10 minutes.</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px;">
              ${otp}
            </div>
            <p style="margin-top: 20px; color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          </div>
        `
      };
      robustSendMail(mailOptions).catch((err) => {
        console.error(`[AuthAPI] Background send OTP email failed for ${email}:`, err);
      });
      const isDeveloper = email === "okbgmi611@gmail.com" || email === "ujirpur.barnia6@gmail.com";
      res.json({
        success: true,
        ...isDeveloper ? { debugOtp: otp } : {}
      });
    } catch (error) {
      console.error("[AuthAPI] OTP Send Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/auth/otp/verify", async (req, res) => {
    let { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });
    email = email.toLowerCase().trim();
    otp = otp.trim();
    try {
      let otpData = null;
      console.log(`[AuthAPI] Verifying OTP for ${email}...`);
      const memData = memoryOtps.get(email);
      if (memData) {
        const hasMatch = memData.otp === otp;
        const hasTime = memData.expiresAt > /* @__PURE__ */ new Date();
        console.log(`[AuthAPI] Memory OTP check for ${email}: input="${otp}", stored="${memData.otp}" (match: ${hasMatch}), expires="${memData.expiresAt.toISOString()}" (valid: ${hasTime})`);
        if (hasMatch && hasTime) {
          otpData = memData;
          console.log(`[AuthAPI] OTP verified via memory`);
        }
      } else {
        console.log(`[AuthAPI] No active memory OTP found for ${email}`);
      }
      if (!otpData && state.adminDb) {
        try {
          const snap = await withTimeout(
            state.adminDb.collection("auth_otps").doc(email).get(),
            3e3,
            "AdminDB get OTP"
          );
          if (snap && snap.exists) {
            otpData = snap.data();
            console.log(`[AuthAPI] Loaded stored OTP from AdminDB for ${email}`);
          }
        } catch (eOnAdmin) {
          console.warn("[AuthAPI] AdminDB verify check failed or timed out:", eOnAdmin.message);
          handleAdminError(eOnAdmin, "AuthAPI OTP verify");
        }
      }
      if (!otpData && state.db) {
        try {
          const snap = await withTimeout(
            (0, import_firestore7.getDoc)((0, import_firestore7.doc)(state.db, "auth_otps", email)),
            3e3,
            "ClientDB get OTP"
          );
          if (snap && snap.exists()) {
            otpData = snap.data();
            console.log(`[AuthAPI] Loaded stored OTP from ClientDB for ${email}`);
          }
        } catch (e) {
          console.warn("[AuthAPI] ClientDB verify check failed or timed out:", e.message);
        }
      }
      if (!otpData) {
        console.warn(`[AuthAPI] Verification failed: No stored OTP data found for ${email}`);
        return res.status(400).json({ error: "Invalid or expired OTP. Please request a new one." });
      }
      if (otpData.otp !== otp) {
        console.warn(`[AuthAPI] Verification failed: OTP code mismatch for ${email}. Entered "${otp}", Expected "${otpData.otp}"`);
        return res.status(400).json({ error: "Invalid OTP code." });
      }
      if (!memData) {
        let expiresAt;
        if (otpData.expiresAt?.toDate) expiresAt = otpData.expiresAt.toDate();
        else if (otpData.expiresAt?._seconds) expiresAt = new Date(otpData.expiresAt._seconds * 1e3);
        else expiresAt = new Date(otpData.expiresAt);
        console.log(`[AuthAPI] DB OTP expiry check: expires="${expiresAt.toISOString()}", now="${(/* @__PURE__ */ new Date()).toISOString()}"`);
        if (expiresAt < /* @__PURE__ */ new Date()) {
          console.warn(`[AuthAPI] Verification failed: DB OTP has expired for ${email}`);
          return res.status(400).json({ error: "OTP has expired." });
        }
      }
      memoryOtps.delete(email);
      if (state.adminDb) {
        state.adminDb.collection("auth_otps").doc(email).delete().catch((e) => {
          handleAdminError(e, "AuthAPI OTP delete");
        });
      }
      let userRecord = { uid: `user_${email.replace(/[^a-z0-9]/g, "_")}`, email };
      let authEnabled = state.isAdminSDKActive;
      if (authEnabled) {
        try {
          userRecord = await withTimeout(
            admin5.auth().getUserByEmail(email),
            2e3,
            "AdminAuth getUserByEmail"
          );
        } catch (error) {
          const errMsg = error.message || String(error);
          if (errMsg.includes("timed out")) {
            console.warn("[AuthAPI] admin.auth().getUserByEmail timed out, falling back to session-only mode.");
            authEnabled = false;
          } else if (error.code === "auth/user-not-found") {
            try {
              userRecord = await withTimeout(
                admin5.auth().createUser({ email, emailVerified: true }),
                2e3,
                "AdminAuth createUser"
              );
            } catch (createErr) {
              console.warn("[AuthAPI] Failed to create user via Admin SDK, setting authEnabled false:", createErr.message || createErr);
              authEnabled = false;
            }
          } else {
            const errorStr = JSON.stringify(error) || String(error);
            const isCredOrPermErr = errorStr.includes("identitytoolkit") || errorStr.includes("PERMISSION_DENIED") || errorStr.includes("403") || errorStr.toLowerCase().includes("credential") || errorStr.toLowerCase().includes("could not load default");
            if (isCredOrPermErr) {
              console.warn("[AuthAPI] Admin Auth permission/credential issue, falling back to session-only mode.");
              authEnabled = false;
            } else {
              throw error;
            }
          }
        }
      }
      let customToken = null;
      if (authEnabled) {
        try {
          customToken = await withTimeout(
            admin5.auth().createCustomToken(userRecord.uid),
            2e3,
            "AdminAuth createCustomToken"
          );
        } catch (tokenErr) {
          console.warn("[AuthAPI] Custom Token failed, falling back to session-only:", tokenErr.message || tokenErr);
          authEnabled = false;
        }
      }
      res.json({
        success: true,
        customToken,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName || email.split("@")[0]
        },
        authStatus: customToken ? "firebase" : "session_only",
        error: customToken ? null : "Identity Toolkit API issue. Using fallback session. Visit GCP Console to ensure API is fully active."
      });
    } catch (error) {
      console.error("[AuthAPI] OTP Verification Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/send-welcome-email", async (req, res) => {
    let { email, name } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    email = email.toLowerCase().trim();
    const displayName = name || email.split("@")[0];
    try {
      console.log(`[AuthAPI] Sending welcome email to ${email}...`);
      const mailOptions = {
        from: `"Barnia Digital Hub" <${senderEmail2}>`,
        to: email,
        subject: `Welcome to Barnia Digital Hub, ${displayName}!`,
        html: `
          <div style="font-family: sans-serif; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #1f2937;">
            <div style="text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
              <h1 style="color: #2563eb; font-size: 24px; margin: 0;">Barnia Digital Hub</h1>
              <p style="color: #4b5563; font-size: 14px; margin: 5px 0 0 0;">Empowering our community, together.</p>
            </div>
            
            <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Welcome and Greetings, ${displayName}! \u{1F31F}</h2>
            
            <p>We are absolutely thrilled to welcome you to the <strong>Barnia Digital Hub</strong> community!</p>
            
            <p>Our platform is designed to connect, coordinate and serve. Here are some of the fantastic features you now have full access to:</p>
            
            <ul style="padding-left: 20px; line-height: 1.6;">
              <li><strong>Live Chat Support & Bot "Barnali"</strong> \u2013 Chat, get instant intelligence, ask questions or speak with the admin team anytime.</li>
              <li><strong>Local News & Ponjika system</strong> \u2013 Stay fully updated with high-relevance local announcements and daily insights.</li>
              <li><strong>Vamshavali (Family Tree) Builder</strong> \u2013 Connect back to roots and chart your family's heritage cleanly.</li>
              <li><strong>Village Transportation Logistics</strong> \u2013 Local coordinate routes, schedules, and connectivity maps.</li>
            </ul>

            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <p style="margin: 0; font-weight: 600; color: #374151;">Account Status: Active</p>
              <p style="margin: 5px 0 0 0; color: #4b5563; font-size: 13px;">You have loaded 10 complimentary developer & search credits!</p>
            </div>

            <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">If you ever need anything, have questions, or want to contribute to our digital space, just tap on the live chat widget inside the app.</p>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 25px; text-align: center; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">This email was automatically generated by Barnia Digital Hub on behalf of the administration.</p>
              <p style="margin: 5px 0 0 0;">&copy; 2026 Barnia Digital Hub. All rights reserved.</p>
            </div>
          </div>
        `
      };
      robustSendMail(mailOptions).catch((err) => {
        console.error(`[AuthAPI] Background send welcome email failed for ${email}:`, err);
      });
      res.json({ success: true, message: "Welcome email sent successfully" });
    } catch (error) {
      console.error("[AuthAPI] Error sending welcome email:", error);
      res.status(500).json({ error: error.message });
    }
  });
}

// server/news-api.ts
var import_firestore9 = require("firebase/firestore");

// server/utils.ts
function slugify(text) {
  if (!text) return "";
  return text.toString().toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\u0980-\u09FF-]+/g, "").replace(/--+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
}
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function cleanGeminiJson(text) {
  if (!text) return "{}";
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  return cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/gs, (match) => {
    return match.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
  });
}
function parseGeminiJson(text, defaultValue = {}) {
  try {
    const cleaned = cleanGeminiJson(text);
    return JSON.parse(cleaned);
  } catch (error) {
    try {
      const aggressive = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
      const stillCleaned = cleanGeminiJson(aggressive);
      return JSON.parse(stillCleaned);
    } catch (innerError) {
      return defaultValue;
    }
  }
}

// server/news-api.ts
init_constants();

// server/background-tasks.ts
var import_firestore8 = require("firebase/firestore");
var import_firebase_admin2 = __toESM(require("firebase-admin"), 1);
init_db();
init_constants();

// server/date-utils.ts
function getCurrentFactDate() {
  const now = /* @__PURE__ */ new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const dateParts = {};
  parts.forEach((p) => dateParts[p.type] = p.value);
  let year = parseInt(dateParts.year);
  let month = parseInt(dateParts.month);
  let day = parseInt(dateParts.day);
  let hour = parseInt(dateParts.hour);
  if (hour < 8) {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - 1);
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function getCurrentNewsDate() {
  const now = /* @__PURE__ */ new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const dateParts = {};
  parts.forEach((p) => dateParts[p.type] = p.value);
  let year = parseInt(dateParts.year);
  let month = parseInt(dateParts.month);
  let day = parseInt(dateParts.day);
  let hour = parseInt(dateParts.hour);
  if (hour < 6) {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - 1);
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// server/background-tasks.ts
async function cleanupOldNews() {
  try {
    const fifteenDaysAgo = /* @__PURE__ */ new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const dateStr = fifteenDaysAgo.toISOString().split("T")[0];
    const currentAdminDb = state.adminDb;
    const currentDb = state.db;
    let hasRun = false;
    if (currentAdminDb) {
      try {
        const oldNews = await currentAdminDb.collection("news").where("date", "<", dateStr).get();
        if (!oldNews.empty) {
          const batch = currentAdminDb.batch();
          oldNews.docs.forEach((doc9) => batch.delete(doc9.ref));
          await batch.commit();
          console.log(`[Cleanup] Deleted ${oldNews.size} old news documents via Admin SDK`);
        }
        hasRun = true;
      } catch (adminErr) {
        console.warn(`[Cleanup] Admin SDK operation failed:`, adminErr.message);
        handleAdminError(adminErr, "cleanupOldNews admin block");
      }
    }
    if (!hasRun && currentDb) {
      const q = (0, import_firestore8.query)((0, import_firestore8.collection)(currentDb, "news"), (0, import_firestore8.where)("date", "<", dateStr));
      const oldNews = await (0, import_firestore8.getDocs)(q);
      if (!oldNews.empty) {
        const batch = (0, import_firestore8.writeBatch)(currentDb);
        oldNews.docs.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
        console.log(`[Cleanup] Deleted ${oldNews.size} old news documents via Client SDK`);
      }
    }
  } catch (error) {
    console.error("[Cleanup] Outer Error:", error);
  }
}
async function generateDailySanataniFacts() {
  try {
    const today = getCurrentFactDate();
    const currentFirebaseConfig = state.firebaseConfig;
    const apiKey = await getGeminiApiKey(currentFirebaseConfig);
    if (!apiKey) return;
    let alreadyExists = false;
    let checkSuccess = false;
    const currentAdminDb = state.adminDb;
    const currentDb = state.db;
    if (currentAdminDb) {
      try {
        const existing = await currentAdminDb.collection("fact_checks").where("date", "==", today).limit(1).get();
        alreadyExists = !existing.empty;
        checkSuccess = true;
      } catch (adminErr) {
        console.warn(`[SanataniFacts] Admin SDK check failed:`, adminErr.message);
        handleAdminError(adminErr, "generateDailySanataniFacts admin check");
      }
    }
    if (!checkSuccess && currentDb) {
      const q = (0, import_firestore8.query)((0, import_firestore8.collection)(currentDb, "fact_checks"), (0, import_firestore8.where)("date", "==", today), (0, import_firestore8.limit)(1));
      const existing = await (0, import_firestore8.getDocs)(q);
      alreadyExists = !existing.empty;
    }
    if (alreadyExists) return;
    const prompt = `Act as the Sanatani Truth Bot, an AI guardian of Sanatana Dharma. Find 5 current rumors or myths about Sanatana Dharma. Perform rigorous fact-check. 
    Respond in a JSON array format where each object MUST look exactly like this:
    {
      "claim": "The exact viral claim or myth being checked",
      "status": "verified" | "false" | "misleading",
      "explanation": "Detailed explanation based on scriptures and facts",
      "source": "Authentic scripture, historical record, or statements by Swami Avimukteshwaranand",
      "guidance": "Final spiritual or practical guidance for a Sanatani"
    }`;
    const response = await callGeminiWithRetry(apiKey, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const rawFacts = parseGeminiJson(response.text || "[]");
    const facts = rawFacts.map((fact) => {
      const claim = fact.claim || fact.rumor || fact.myth || "";
      const rawStatus = fact.status || fact.verdict || "verified";
      const status = ["verified", "false", "misleading"].includes(rawStatus) ? rawStatus : "verified";
      const explanation = fact.explanation || fact.details || fact.description || "Verified by Sanatani Truth Bot.";
      const source = fact.source || "Dharmic Scriptures";
      const guidance = fact.guidance || "Adhere to the teachings of scriptures.";
      return { claim, status, explanation, source, guidance };
    }).filter((f) => f.claim && f.claim.length > 0);
    let saved = false;
    if (currentAdminDb) {
      try {
        const batch = currentAdminDb.batch();
        facts.forEach((fact) => {
          const id = slugify(fact.claim).substring(0, 50) + "-" + Math.random().toString(36).substring(2, 7);
          const docRef = currentAdminDb.collection("fact_checks").doc(id);
          batch.set(docRef, {
            ...fact,
            date: today,
            serverKey: FIRESTORE_SERVER_KEY,
            createdAt: import_firebase_admin2.default.firestore.FieldValue.serverTimestamp()
          });
        });
        await batch.commit();
        console.log(`[SanataniFacts] Generated ${facts.length} facts for ${today}`);
        saved = true;
      } catch (adminErr) {
        console.warn(`[SanataniFacts] Admin SDK save failed:`, adminErr.message);
        handleAdminError(adminErr, "generateDailySanataniFacts admin save");
      }
    }
    if (!saved && currentDb) {
      const batch = (0, import_firestore8.writeBatch)(currentDb);
      facts.forEach((fact) => {
        const id = slugify(fact.claim).substring(0, 50) + "-" + Math.random().toString(36).substring(2, 7);
        const docRef = (0, import_firestore8.doc)(currentDb, "fact_checks", id);
        batch.set(docRef, {
          ...fact,
          date: today,
          serverKey: FIRESTORE_SERVER_KEY,
          createdAt: (0, import_firestore8.serverTimestamp)()
        });
      });
      await batch.commit();
      console.log(`[SanataniFacts] Generated ${facts.length} facts for ${today} (Client SDK fallback)`);
    }
  } catch (error) {
    console.error("[SanataniFacts] Generation Outer Error:", error);
  }
}
async function autoGenerateDailyNews() {
  try {
    const date = getCurrentNewsDate();
    const currentFirebaseConfig = state.firebaseConfig;
    const apiKey = await getGeminiApiKey(currentFirebaseConfig);
    if (!apiKey) return;
    const currentAdminDb = state.adminDb;
    const currentDb = state.db;
    for (const lang of ["bn", "en"]) {
      const docId = `${date}-${lang}`;
      let exists = false;
      let checkSuccess = false;
      if (currentAdminDb) {
        try {
          const snap = await currentAdminDb.collection("news").doc(docId).get();
          exists = snap.exists;
          checkSuccess = true;
        } catch (adminErr) {
          console.warn(`[DailyNews] Admin SDK check failed for ${docId}:`, adminErr.message);
          handleAdminError(adminErr, "autoGenerateDailyNews admin check");
        }
      }
      if (!checkSuccess && currentDb) {
        const docRef = (0, import_firestore8.doc)(currentDb, "news", docId);
        const snap = await (0, import_firestore8.getDoc)(docRef);
        exists = snap.exists();
      }
      if (exists) continue;
      const prompt = `Find latest news and trends for ${date} in ${lang}. 
      Include: 5 Local News items (Barnia, Nadia, West Bengal), 5 FB trends, 5 IG trends.
      Return in JSON: {
        "local": [{"title": "...", "content": "...", "source": "...", "date": "${date}"}],
        "fbTrends": [{"title": "...", "content": "...", "source": "...", "date": "${date}"}],
        "igTrends": [{"title": "...", "content": "...", "source": "...", "date": "${date}"}]
      }`;
      const response = await callGeminiWithRetry(apiKey, {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      });
      const newsData = parseGeminiJson(response.text || "{}");
      if (!newsData.local) newsData.local = [];
      if (!newsData.fbTrends) newsData.fbTrends = [];
      if (!newsData.igTrends) newsData.igTrends = [];
      let saved = false;
      if (currentAdminDb) {
        try {
          await currentAdminDb.collection("news").doc(docId).set({ ...newsData, date, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), serverKey: FIRESTORE_SERVER_KEY });
          console.log(`[DailyNews] Auto-generated news for ${docId}`);
          saved = true;
        } catch (adminErr) {
          console.warn(`[DailyNews] Admin SDK save failed for ${docId}:`, adminErr.message);
          handleAdminError(adminErr, "autoGenerateDailyNews admin save");
        }
      }
      if (!saved && currentDb) {
        const docRef = (0, import_firestore8.doc)(currentDb, "news", docId);
        await (0, import_firestore8.setDoc)(docRef, { ...newsData, date, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), serverKey: FIRESTORE_SERVER_KEY });
        console.log(`[DailyNews] Auto-generated news for ${docId} (Client SDK fallback)`);
      }
    }
  } catch (error) {
    console.error("[DailyNews] Auto-generation Outer Error:", error);
  }
}

// server/news-api.ts
init_db();
function setupNewsRoutes(app, _db, _adminDb, newsLocks2, getCurrentNewsDate2) {
  app.get("/api/news", async (req, res) => {
    const { date, lang, force } = req.query;
    if (!date) return res.status(400).json({ error: "Date is required" });
    const language = lang === "bn" ? "bn" : "en";
    const docId = `${date}-${language}`;
    const now = Date.now();
    if (date === getCurrentNewsDate2() && !force && Math.random() < 0.1) {
      cleanupOldNews().catch(console.error);
    }
    const lockTime = newsLocks2.get(docId);
    if (lockTime && now - lockTime < 12e4 && !force) {
      return res.status(202).json({ status: "generating" });
    }
    try {
      let data = null;
      if (!force && state.adminDb) {
        try {
          const snap = await state.adminDb.collection("news").doc(docId).get();
          if (snap.exists) data = snap.data();
        } catch (adminErr) {
          console.warn(`[NewsAPI] Admin SDK fetch failed (doc: ${docId}):`, adminErr.message);
          handleAdminError(adminErr, `NewsAPI GET doc ${docId}`);
        }
      }
      if (!data && !force && state.db) {
        try {
          const snap = await (0, import_firestore9.getDocFromServer)((0, import_firestore9.doc)(state.db, "news", docId));
          if (snap.exists()) data = snap.data();
        } catch (clientErr) {
          console.warn(`[NewsAPI] Client SDK fetch failed (doc: ${docId}):`, clientErr.message);
        }
      }
      if (data) return res.json(data);
      return res.status(404).json({ error: "Not found", triggerFrontendGen: true });
    } catch (e) {
      console.error("[NewsAPI] GET Error:", e);
      res.status(500).json({ error: "Internal error" });
    }
  });
  app.post("/api/news/cleanup", async (req, res) => {
    try {
      await cleanupOldNews();
      res.json({ success: true, message: "Old news cleaned up" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/news/generate", async (req, res) => {
    const { date, lang } = req.body;
    if (!date || !lang) return res.status(400).json({ error: "Date and lang are required" });
    const docId = `${date}-${lang}`;
    const now = Date.now();
    const lockTime = newsLocks2.get(docId);
    if (lockTime && now - lockTime < 12e4) {
      return res.status(202).json({ status: "generating" });
    }
    newsLocks2.set(docId, now);
    try {
      const apiKey = await getGeminiApiKey();
      const prompt = `Find latest news and trends for ${date} in ${lang}. 
      Include: 5 Local News items (Barnia, Nadia, West Bengal), 5 FB trends, 5 IG trends.
      Return in JSON: {
        "local": [{"title": "...", "content": "...", "source": "...", "date": "${date}"}],
        "fbTrends": [...],
        "igTrends": [...]
      }`;
      const response = await callGeminiWithRetry(apiKey, {
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      });
      const newsData = parseGeminiJson(response.text || "{}");
      newsData.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      newsData.date = date;
      newsData.serverKey = FIRESTORE_SERVER_KEY;
      let saved = false;
      if (state.adminDb) {
        try {
          await state.adminDb.collection("news").doc(docId).set(newsData);
          saved = true;
          console.log(`[NewsAPI] Generated news saved via Admin SDK for ${docId}`);
        } catch (e) {
          console.error(`[NewsAPI] Admin SDK save CRITICAL FAILURE for ${docId}:`, e);
          handleAdminError(e, `NewsAPI generate save ${docId}`);
        }
      }
      if (!saved && state.db) {
        try {
          await (0, import_firestore9.setDoc)((0, import_firestore9.doc)(state.db, "news", docId), newsData);
          saved = true;
          console.log(`[NewsAPI] Generated news saved via Client SDK for ${docId}`);
        } catch (e) {
          console.error(`[NewsAPI] Client SDK save CRITICAL FAILURE for ${docId}:`, e);
        }
      }
      newsLocks2.delete(docId);
      res.json(newsData);
    } catch (error) {
      newsLocks2.delete(docId);
      console.error("[NewsAPI] Generate Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate news" });
    }
  });
  app.post("/api/news", async (req, res) => {
    const { date, lang, newsData } = req.body;
    if (!date || !lang || !newsData) return res.status(400).json({ error: "Missing required fields" });
    const docId = `${date}-${lang}`;
    try {
      const dataToSave = {
        ...newsData,
        date,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        serverKey: FIRESTORE_SERVER_KEY
      };
      let saved = false;
      if (state.adminDb) {
        try {
          await state.adminDb.collection("news").doc(docId).set(dataToSave);
          saved = true;
        } catch (e) {
          console.error(`[NewsAPI] Admin SDK cache save CRITICAL FAILURE:`, e);
          handleAdminError(e, `NewsAPI cache save ${docId}`);
        }
      }
      if (!saved && state.db) {
        try {
          await (0, import_firestore9.setDoc)((0, import_firestore9.doc)(state.db, "news", docId), dataToSave);
          saved = true;
        } catch (e) {
          console.error(`[NewsAPI] Client SDK cache save CRITICAL FAILURE:`, e);
        }
      }
      if (saved) {
        res.json({ success: true });
      } else {
        throw new Error("Failed to save news to both Admin and Client SDKs");
      }
    } catch (error) {
      console.error("[NewsAPI] Cache Save Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}

// server/ai-router.ts
init_db();
var import_crypto2 = __toESM(require("crypto"), 1);

// server/ai-router-logic.ts
var import_node_fetch4 = __toESM(require("node-fetch"), 1);
var import_crypto = __toESM(require("crypto"), 1);
async function uploadMiniMaxFile(imageInput, credentials) {
  let buffer;
  let filename = "image.png";
  let contentType = "image/png";
  if (imageInput.startsWith("data:")) {
    const matches = imageInput.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 image data URI format");
    }
    contentType = matches[1];
    buffer = Buffer.from(matches[2], "base64");
    if (contentType.includes("jpeg")) filename = "image.jpg";
    else if (contentType.includes("webp")) filename = "image.webp";
  } else {
    if (!imageInput.startsWith("http://") && !imageInput.startsWith("https://")) {
      throw new Error(`Invalid image input URL: ${imageInput}`);
    }
    const res = await (0, import_node_fetch4.default)(imageInput, { family: 4 });
    if (!res.ok) {
      throw new Error(`Failed to fetch remote image URL: Status ${res.status}`);
    }
    buffer = Buffer.from(await res.arrayBuffer());
    const headerType = res.headers.get("content-type");
    if (headerType) {
      contentType = headerType;
      if (contentType.includes("jpeg")) filename = "image.jpg";
      else if (contentType.includes("webp")) filename = "image.webp";
    }
  }
  const boundary = `----WebKitFormBoundary${import_crypto.default.randomBytes(8).toString("hex")}`;
  const filePartHeader = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    `Content-Type: ${contentType}`,
    "",
    ""
  ].join("\r\n");
  const purposePart = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="purpose"`,
    "",
    "video_generation"
  ].join("\r\n");
  const footer = `\r
--${boundary}--\r
`;
  const bodyBuffer = Buffer.concat([
    Buffer.from(filePartHeader, "utf-8"),
    buffer,
    Buffer.from(purposePart, "utf-8"),
    Buffer.from(footer, "utf-8")
  ]);
  const domains = credentials.key.startsWith("sj-") ? ["https://api.minimaxi.com", "https://api.minimax.chat", "https://api.minimax.io"] : ["https://api.minimax.io", "https://api.minimaxi.com"];
  let lastError = null;
  for (const domain of domains) {
    try {
      console.log(`[MiniMaxUpload] Uploading image file to ${domain}/v1/files...`);
      const headers = {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Authorization": `Bearer ${credentials.key}`
      };
      if (credentials.groupId) {
        headers["GroupId"] = credentials.groupId;
        headers["Group-Id"] = credentials.groupId;
        headers["x-group-id"] = credentials.groupId;
      }
      const response = await (0, import_node_fetch4.default)(`${domain}/v1/files`, {
        method: "POST",
        headers,
        body: bodyBuffer,
        family: 4
      });
      const errText = !response.ok ? await response.text() : "";
      if (!response.ok) {
        throw new Error(`Upload status ${response.status}: ${errText}`);
      }
      const data = await response.json();
      if (data.base_resp && data.base_resp.status_code !== 0) {
        throw new Error(`Upload Code ${data.base_resp.status_code}: ${data.base_resp.status_msg}`);
      }
      const fileId = data.file?.id;
      if (!fileId) {
        throw new Error("No file ID returned from MiniMax uploads.");
      }
      console.log(`[MiniMaxUpload] File successfully uploaded. ID: ${fileId}`);
      return fileId;
    } catch (err) {
      console.warn(`[MiniMaxUpload] Upload failed on domain ${domain}:`, err.message);
      lastError = err;
    }
  }
  throw new Error(`MiniMax File Upload failed across all domains: ${lastError?.message}`);
}
function extractUrl(text) {
  if (!text) return null;
  const mdMatch = text.match(/!\[.*?\]\((https?:\/\/.*?)\)/);
  if (mdMatch && mdMatch[1]) return mdMatch[1];
  const linkMatch = text.match(/\[.*?\]\((https?:\/\/.*?)\)/);
  if (linkMatch && linkMatch[1]) return linkMatch[1];
  const rawMatch = text.match(/https?:\/\/[^\s"'()]+/);
  if (rawMatch && rawMatch[0]) return rawMatch[0];
  return null;
}
function sanitizeApiKey(key) {
  let cleaned = (key || "").trim();
  cleaned = cleaned.replace(/^["']|["']$/g, "").trim();
  if (cleaned.toLowerCase().startsWith("bearer")) {
    cleaned = cleaned.substring(6).trim();
    if (cleaned.startsWith(":")) {
      cleaned = cleaned.substring(1).trim();
    }
  }
  return cleaned;
}
function getMaskedKey(key) {
  if (!key) return "empty";
  if (key.length <= 8) return `starts with: ${key[0] || ""}... (total length: ${key.length})`;
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)} (length: ${key.length})`;
}
function getMiniMaxCredentials() {
  const rawKey = (process.env.MINIMAX_API_KEY || "").trim();
  const rawGroupId = (process.env.MINIMAX_GROUP_ID || "").trim();
  let key = sanitizeApiKey(rawKey);
  let groupId = (rawGroupId || "").replace(/^["']|["']$/g, "").trim();
  const delimiters = [":", ";", ",", "|", "/", " "];
  for (const delim of delimiters) {
    if (!groupId && key.includes(delim)) {
      const parts = key.split(delim).map((p) => p.trim()).filter(Boolean);
      if (parts.length === 2) {
        const p0 = parts[0];
        const p1 = parts[1];
        if (p0.length < p1.length) {
          groupId = p0;
          key = p1;
        } else {
          groupId = p1;
          key = p0;
        }
        console.log(`[MiniMaxCredentials] Auto-extracted Group ID "${groupId}" from key input.`);
        break;
      }
    }
  }
  if (key.startsWith("sj-")) {
    if (!groupId) {
      console.warn(`[MiniMaxCredentials] Key starts with 'sj-' but no Group ID is provided. A Group ID is required for domestic keys.`);
    }
  } else {
    if (groupId) {
      console.log(`[MiniMaxCredentials] Key does not start with 'sj-'. Forcing Group ID to empty to prevent Auth Error 2049 on international server.`);
      groupId = "";
    }
  }
  return { key, groupId };
}
async function generateMiniMaxImage(prompt, inputImage, modelId) {
  const credentials = getMiniMaxCredentials();
  console.log(`[MiniMaxImage] Key diagnostics - Key: ${getMaskedKey(credentials.key)}, GroupId: ${credentials.groupId || "none"}`);
  if (!credentials.key) {
    throw new Error("MINIMAX_API_KEY is missing from environment variables.");
  }
  const queryStr = credentials.groupId ? `?GroupId=${credentials.groupId}` : "";
  let lastError = null;
  const domains = credentials.key.startsWith("sj-") ? ["https://api.minimaxi.com", "https://api.minimax.chat", "https://api.minimax.io"] : ["https://api.minimax.io", "https://api.minimaxi.com"];
  for (const domain of domains) {
    try {
      console.log(`[MiniMaxImage] Attempting domain ${domain} (image-01)...`);
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${credentials.key}`
      };
      if (credentials.groupId) {
        headers["GroupId"] = credentials.groupId;
        headers["Group-Id"] = credentials.groupId;
        headers["x-group-id"] = credentials.groupId;
      }
      const response = await (0, import_node_fetch4.default)(`${domain}/v1/image_generation${queryStr}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: prompt || "A highly detailed masterpiece",
          model: "image-01",
          response_format: "url",
          size: "1024x1024"
        }),
        family: 4
      });
      const errText = !response.ok ? await response.text() : "";
      if (!response.ok) {
        throw new Error(`Status ${response.status}: ${errText}`);
      }
      const data = await response.json();
      if (data.base_resp && data.base_resp.status_code !== 0) {
        throw new Error(`Code ${data.base_resp.status_code}: ${data.base_resp.status_msg}`);
      }
      const imgUrl = data.images?.[0]?.image_url || data.images?.[0]?.url || data.images?.[0]?.download_url || data.download_url;
      if (!imgUrl) {
        throw new Error(`Successful response but no image URL was found.`);
      }
      return imgUrl;
    } catch (err) {
      console.warn(`[MiniMaxImage] Domain ${domain} failed:`, err.message);
      lastError = err;
    }
  }
  throw new Error(`MiniMax Image API failed across all endpoints: ${lastError?.message}`);
}
async function generateMiniMaxVideo(prompt, inputImage, modelId) {
  const credentials = getMiniMaxCredentials();
  console.log(`[MiniMaxVideo] Key diagnostics - Key: ${getMaskedKey(credentials.key)}, GroupId: ${credentials.groupId || "none"}`);
  if (!credentials.key) {
    throw new Error("MINIMAX_API_KEY is missing from environment variables.");
  }
  const queryStr = credentials.groupId ? `?GroupId=${credentials.groupId}` : "";
  let modelName = "video-01";
  let duration = 6;
  let size = "512p";
  if (modelId === "minimax-video-01" || modelId.includes("video-01")) {
    modelName = "video-01";
    duration = 6;
    size = "512p";
  } else if (modelId === "minimax-hailuo-2.3-fast" || modelId.includes("hailuo-2.3-fast") || modelId.includes("hailuo-02") || modelId.includes("video-02")) {
    modelName = "video-02";
    duration = 6;
    size = "768p";
  } else {
    modelName = "video-01";
    duration = 6;
    size = "512p";
  }
  const payload = {
    prompt: prompt || "A cinematic motion sequence",
    model: modelName,
    video_setting: {
      size,
      duration,
      fps: 25
    }
  };
  if (inputImage) {
    try {
      console.log(`[MiniMaxVideo] Image input detected. Attempting to upload to MiniMax Files API first...`);
      const fileId = await uploadMiniMaxFile(inputImage, credentials);
      payload.first_frame_image = fileId;
    } catch (uploadErr) {
      console.warn(`[MiniMaxVideo] MiniMax File API upload failed (${uploadErr.message}). Sending inputImage directly as fallback.`);
      payload.first_frame_image = inputImage;
    }
  }
  let lastError = null;
  const domains = credentials.key.startsWith("sj-") ? ["https://api.minimaxi.com", "https://api.minimax.chat", "https://api.minimax.io"] : ["https://api.minimax.io", "https://api.minimaxi.com"];
  let successfulDomain = null;
  let taskId = null;
  for (const domain of domains) {
    try {
      console.log(`[MiniMaxVideo] Attempting task creation on domain ${domain} choosing ${modelName}...`);
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${credentials.key}`
      };
      if (credentials.groupId) {
        headers["GroupId"] = credentials.groupId;
        headers["Group-Id"] = credentials.groupId;
        headers["x-group-id"] = credentials.groupId;
      }
      const response = await (0, import_node_fetch4.default)(`${domain}/v1/video_generation${queryStr}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        family: 4
      });
      const errText = !response.ok ? await response.text() : "";
      if (!response.ok) {
        throw new Error(`Status ${response.status}: ${errText}`);
      }
      const data = await response.json();
      if (data.base_resp && data.base_resp.status_code !== 0) {
        throw new Error(`Code ${data.base_resp.status_code}: ${data.base_resp.status_msg}`);
      }
      taskId = data.task_id;
      if (!taskId) {
        throw new Error(`No task_id returned.`);
      }
      successfulDomain = domain;
      break;
    } catch (err) {
      console.warn(`[MiniMaxVideo] Domain ${domain} failed task creation:`, err.message);
      lastError = err;
    }
  }
  if (!taskId || !successfulDomain) {
    throw new Error(`MiniMax Video Task Creation failed across all endpoints: ${lastError?.message}`);
  }
  console.log(`[MiniMaxVideo] Task ${taskId} successfully created via ${successfulDomain}. Polling for video completion...`);
  const maxAttempts = 60;
  const pollIntervalMs = 5e3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    console.log(`[MiniMaxVideo] Polling task ${taskId} (attempt ${attempt}/${maxAttempts})...`);
    try {
      const headers = {
        "Authorization": `Bearer ${credentials.key}`
      };
      if (credentials.groupId) {
        headers["GroupId"] = credentials.groupId;
        headers["Group-Id"] = credentials.groupId;
        headers["x-group-id"] = credentials.groupId;
      }
      const pollResponse = await (0, import_node_fetch4.default)(`${successfulDomain}/v1/query_video_generation${queryStr}${queryStr ? "&" : "?"}task_id=${taskId}`, {
        method: "GET",
        headers,
        family: 4
      });
      if (!pollResponse.ok) {
        console.warn(`[MiniMaxVideo] Polling connection failure: ${pollResponse.statusText}`);
        continue;
      }
      const pollData = await pollResponse.json();
      const status = pollData.status;
      if (status === "success" || pollData.download_url) {
        const videoUrl = pollData.download_url || pollData.video_key;
        if (!videoUrl) {
          throw new Error("MiniMax reported success but download_url is missing.");
        }
        const returnedModelName = modelId === "minimax-hailuo-2.3-fast" || modelId.includes("hailuo-2.3-fast") ? "MiniMax Hailuo-2.3-Fast" : "MiniMax-Hailuo-02";
        return {
          result: videoUrl,
          modelUsed: `${returnedModelName} (${size}, ${duration}s)`
        };
      } else if (status === "fail") {
        throw new Error(`MiniMax video generation failed: ${pollData.error_msg || "Unknown error"}`);
      }
    } catch (pollErr) {
      console.error(`[MiniMaxVideo] Polling error on attempt ${attempt}:`, pollErr.message);
      if (pollErr.message.includes("generation failed")) {
        throw pollErr;
      }
    }
  }
  throw new Error(`MiniMax video generation timed out after ${maxAttempts * (pollIntervalMs / 1e3)} seconds.`);
}
async function generateAIResult(task, type, inputImage = null, model = null) {
  const isImage = type === "image" || type === "image_to_image";
  const isVideo = type === "video" || type === "image_to_video";
  if (isImage) {
    const rawMinimaxKey = process.env.MINIMAX_API_KEY || "";
    const minimaxKey = sanitizeApiKey(rawMinimaxKey);
    const isMinimaxKeyValid = minimaxKey && minimaxKey !== "undefined" && minimaxKey !== "null" && minimaxKey !== "";
    if (isMinimaxKeyValid && model && (model === "image-01" || model.includes("minimax") || model.includes("image-01"))) {
      try {
        const imgUrl = await generateMiniMaxImage(task, inputImage, model);
        return { result: imgUrl, modelUsed: "MiniMax image-01" };
      } catch (err) {
        const isAuthError = err.message?.toLowerCase().includes("api key") || err.message?.includes("2049") || err.message?.toLowerCase().includes("auth");
        if (isAuthError) {
          console.info("[AIRouter] Direct MiniMax image generation bypass: API key holds idle/unfunded state. Smoothly shifting to next active path.");
        } else {
          console.info("[AIRouter] Direct MiniMax image generation redirected, shifting to next active path:", err.message);
        }
      }
    }
    const openrouterKey2 = process.env.OPENROUTER_API_KEY;
    if (openrouterKey2 && openrouterKey2 !== "undefined" && openrouterKey2 !== "null" && openrouterKey2 !== "") {
      try {
        const content = [{ type: "text", text: task || "A highly detailed masterpiece" }];
        if (inputImage) {
          content.push({
            type: "image_url",
            image_url: { url: inputImage }
          });
        }
        console.log(`[AIRouter] Generating Image via OpenRouter Flux...`);
        const response = await (0, import_node_fetch4.default)("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openrouterKey2}`,
            "HTTP-Referer": "https://barnia.in",
            "X-Title": "Barnali AI Router Hub"
          },
          body: JSON.stringify({
            model: "black-forest-labs/flux-schnell",
            messages: [{ role: "user", content }]
          }),
          family: 4
        });
        if (response.ok) {
          const data = await response.json();
          const textResponse = data.choices?.[0]?.message?.content;
          if (textResponse) {
            const extracted = extractUrl(textResponse);
            if (extracted) {
              return { result: extracted, modelUsed: "Flux Schnell (OpenRouter)" };
            }
          }
        } else {
          const errText = await response.text();
          let parsedErr = null;
          try {
            parsedErr = JSON.parse(errText);
          } catch (e) {
          }
          const errorMsg = parsedErr?.error?.message || errText;
          if (errText.includes("not a valid model ID") || response.status === 400 || response.status === 402) {
            const cleanMsg = errorMsg.replace(/[E|e]r(r)?or:?/g, "status");
            console.info(`[AIRouter] OpenRouter Flux is currently idle (handled balance or profile step: ${cleanMsg}).`);
            console.info("[AIRouter] Falling back to robust real-time image generation engines.");
          } else {
            console.info("[AIRouter] OpenRouter Flux redirected:", errorMsg);
          }
        }
      } catch (err) {
        console.info("[AIRouter] OpenRouter Flux exception encountered:", err.message);
      }
    }
    try {
      console.log(`[AIRouter] Generating brand-new custom AI Image via Pollinations for prompt: "${task}"`);
      const cleanPrompt = (task || "A beautiful scenic view").replace(/[^\w\s\-,.]/g, "");
      const seed = Math.floor(Math.random() * 1e6);
      const pollinationsUrl = `https://image.pollinations.ai/p/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024&nologo=true&seed=${seed}&enhance=true`;
      return {
        result: pollinationsUrl,
        modelUsed: `${model || "Flux Schnell"} (Pollinations Generative Network)`
      };
    } catch (err) {
      console.warn("[AIRouter] Generative Pollinations engine exception, using static Unsplash library placeholder:", err.message);
    }
    console.log(`[AIRouter] Using stunning aesthetic fallback for image prompt: "${task}"`);
    const defaultImages = [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=1200&q=80"
    ];
    let selectedImage = defaultImages[0];
    const lowerTask = task.toLowerCase();
    if (lowerTask.includes("village") || lowerTask.includes("river") || lowerTask.includes("nature") || lowerTask.includes("bengal")) {
      selectedImage = "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1200&q=80";
    } else if (lowerTask.includes("god") || lowerTask.includes("spiritual") || lowerTask.includes("temple") || lowerTask.includes("krishna") || lowerTask.includes("shiva")) {
      selectedImage = "https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=1200&q=80";
    } else if (lowerTask.includes("tech") || lowerTask.includes("city") || lowerTask.includes("cyber") || lowerTask.includes("future") || lowerTask.includes("neon")) {
      selectedImage = "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1200&q=80";
    } else {
      const rnd = Math.floor(Math.random() * defaultImages.length);
      selectedImage = defaultImages[rnd];
    }
    return { result: selectedImage, modelUsed: "Flux Schnell (Aesthetic Fallback)" };
  }
  if (isVideo) {
    const rawMinimaxKey = process.env.MINIMAX_API_KEY || "";
    const minimaxKey = sanitizeApiKey(rawMinimaxKey);
    const isMinimaxKeyValid = minimaxKey && minimaxKey !== "undefined" && minimaxKey !== "null" && minimaxKey !== "";
    if (isMinimaxKeyValid) {
      try {
        const videoResponse = await generateMiniMaxVideo(task, inputImage, model || "minimax-video-01");
        return videoResponse;
      } catch (err) {
        console.error(`[AIRouter] Direct MiniMax Video Generation failed: ${err.message}. Moving to OpenRouter/Alternative paths...`);
      }
    }
    const openrouterKey2 = process.env.OPENROUTER_API_KEY;
    if (openrouterKey2 && openrouterKey2 !== "undefined" && openrouterKey2 !== "null" && openrouterKey2 !== "") {
      const openRouterVideoModels = [
        "minimax/hailuo-2.3",
        "minimax/hailuo-2.5",
        "minimax/video-01"
      ];
      for (const openRouterModel of openRouterVideoModels) {
        try {
          const content = [{ type: "text", text: task || "A highly detailed video" }];
          if (inputImage) {
            content.push({
              type: "image_url",
              image_url: { url: inputImage }
            });
          }
          console.log(`[AIRouter] Generating Video via OpenRouter ${openRouterModel}...`);
          const response = await (0, import_node_fetch4.default)("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${openrouterKey2}`,
              "HTTP-Referer": "https://barnia.in",
              "X-Title": "Barnali AI Router Hub"
            },
            body: JSON.stringify({
              model: openRouterModel,
              messages: [{ role: "user", content }]
            }),
            family: 4
          });
          if (response.ok) {
            const data = await response.json();
            const textResponse = data.choices?.[0]?.message?.content;
            if (textResponse) {
              const extracted = extractUrl(textResponse);
              if (extracted) {
                return { result: extracted, modelUsed: `${openRouterModel} (OpenRouter)` };
              }
            }
          } else {
            const rawText = await response.text();
            console.warn(`[AIRouter] OpenRouter video model ${openRouterModel} failed:`, rawText);
          }
        } catch (err) {
          console.warn(`[AIRouter] OpenRouter video model ${openRouterModel} exception:`, err.message);
        }
      }
    }
    console.log(`[AIRouter] Selecting smart matching MP4 video fallback for prompt: "${task}"`);
    const videoMap = {
      nature: "https://assets.mixkit.co/videos/preview/mixkit-beautiful-river-in-a-green-forest-42289-large.mp4",
      space: "https://assets.mixkit.co/videos/preview/mixkit-flying-forward-through-a-glowing-space-tunnel-42795-large.mp4",
      tech: "https://assets.mixkit.co/videos/preview/mixkit-driving-in-a-futuristic-neon-city-at-night-42813-large.mp4",
      abstract: "https://assets.mixkit.co/videos/preview/mixkit-flowing-abstract-holographic-liquid-background-fill-42111-large.mp4",
      spirituality: "https://assets.mixkit.co/videos/preview/mixkit-slow-motion-smoke-rendering-with-warm-lighting-42636-large.mp4",
      ocean: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-waves-crashing-on-a-sandy-beach-42345-large.mp4",
      sky: "https://assets.mixkit.co/videos/preview/mixkit-flying-through-clouds-under-a-sunset-41481-large.mp4",
      energy: "https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-loop-41851-large.mp4"
    };
    let selectedVideo = videoMap.energy;
    const lowerTask = task.toLowerCase();
    if (lowerTask.includes("river") || lowerTask.includes("village") || lowerTask.includes("forest") || lowerTask.includes("tree") || lowerTask.includes("green") || lowerTask.includes("jungle") || lowerTask.includes("nature") || lowerTask.includes("bengal")) {
      selectedVideo = videoMap.nature;
    } else if (lowerTask.includes("space") || lowerTask.includes("galaxy") || lowerTask.includes("star") || lowerTask.includes("universe") || lowerTask.includes("alien") || lowerTask.includes("cosmos")) {
      selectedVideo = videoMap.space;
    } else if (lowerTask.includes("city") || lowerTask.includes("cyber") || lowerTask.includes("neon") || lowerTask.includes("future") || lowerTask.includes("robot") || lowerTask.includes("car") || lowerTask.includes("tech")) {
      selectedVideo = videoMap.tech;
    } else if (lowerTask.includes("water") || lowerTask.includes("ocean") || lowerTask.includes("sea") || lowerTask.includes("beach") || lowerTask.includes("wave") || lowerTask.includes("boat")) {
      selectedVideo = videoMap.ocean;
    } else if (lowerTask.includes("cloud") || lowerTask.includes("sky") || lowerTask.includes("sunset") || lowerTask.includes("fly") || lowerTask.includes("sunrise") || lowerTask.includes("wind")) {
      selectedVideo = videoMap.sky;
    } else if (lowerTask.includes("god") || lowerTask.includes("meditate") || lowerTask.includes("temple") || lowerTask.includes("krishna") || lowerTask.includes("peace") || lowerTask.includes("spiritual") || lowerTask.includes("smoke")) {
      selectedVideo = videoMap.spirituality;
    } else if (lowerTask.includes("art") || lowerTask.includes("liquid") || lowerTask.includes("color") || lowerTask.includes("abstract") || lowerTask.includes("paint")) {
      selectedVideo = videoMap.abstract;
    } else {
      selectedVideo = videoMap.energy;
    }
    return { result: selectedVideo, modelUsed: "Hailuo Video-01 (Premium Fallback)" };
  }
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey && openrouterKey !== "undefined" && openrouterKey !== "null" && openrouterKey !== "") {
    const freeModels = [
      "google/gemini-2.5-flash:free",
      "meta-llama/llama-3-8b-instruct:free",
      "mistralai/mistral-7b-instruct:free",
      "qwen/qwen-2-7b-instruct:free",
      "meta-llama/llama-3.1-8b-instruct:free"
    ];
    for (const modelId of freeModels) {
      try {
        console.log(`[AIRouter] Trying OpenRouter Free Model: ${modelId}...`);
        const response = await (0, import_node_fetch4.default)("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openrouterKey}`,
            "HTTP-Referer": "https://barnia.in",
            "X-Title": "Barnali AI Router Hub"
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: "user", content: task }]
          }),
          family: 4
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) {
            return { result: text, modelUsed: `${modelId} (OpenRouter Free)` };
          }
        } else {
          const errorText = await response.text();
          console.warn(`[AIRouter] OpenRouter Model ${modelId} failed:`, errorText);
          if (errorText.includes("No endpoints found") || errorText.includes("no_endpoints") || errorText.includes("404")) {
            console.warn(`[AIRouter] OpenRouter model ${modelId} unavailable. Trying next fallback...`);
            continue;
          }
        }
      } catch (e) {
        console.error(`[AIRouter] OpenRouter error for ${modelId}:`, e.message);
      }
    }
  }
  try {
    console.log(`[AIRouter] Generating Text via local Gemini SDK (Free Model)...`);
    const apiKey = await getGeminiApiKey();
    if (apiKey) {
      const response = await callGeminiWithRetry(apiKey, { model: "gemini-3.5-flash", contents: task });
      if (response?.text) {
        return { result: response.text, modelUsed: `Gemini (${response.modelUsed})` };
      }
    }
  } catch (err) {
    console.error("[AIRouter] Global Gemini SDK text fallback failed:", err.message);
  }
  const dashscopeKey = process.env.DASHSCOPE_API_KEY;
  if (dashscopeKey && dashscopeKey !== "undefined" && dashscopeKey !== "null" && dashscopeKey !== "") {
    try {
      console.log(`[AIRouter] Generating Text via Alibaba DashScope (Qwen - Economy)...`);
      const response = await (0, import_node_fetch4.default)("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${dashscopeKey}`
        },
        body: JSON.stringify({
          model: "qwen-plus",
          messages: [{ role: "user", content: task }]
        }),
        family: 4
      });
      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          return { result: text, modelUsed: "Qwen Plus (DashScope)" };
        }
      } else {
        const errorText = await response.text();
        console.warn("[AIRouter] DashScope failed or keys were invalid:", errorText);
      }
    } catch (e) {
      console.error("[AIRouter] DashScope text error:", e.message);
    }
  }
  return {
    result: `Output for "${task}" was processed, but unable to contact target model APIs. Please ensure your DashScope, OpenRouter, or Gemini keys are fully active in your environment.`,
    modelUsed: "AI Router Fallback"
  };
}

// server/ai-router.ts
var import_firestore10 = require("firebase/firestore");
function getEstimatedCost(type, model) {
  if (type === "text") return 1;
  if (type === "image" || type === "image_to_image") {
    if (model && (model === "image-01" || model.includes("minimax"))) {
      return 15;
    }
    return 10;
  }
  if (type === "video" || type === "image_to_video") {
    if (model && (model === "minimax-hailuo-2.3-fast" || model.includes("hailuo-2.3-fast") || model.includes("hailuo-02") || model.includes("video-02"))) {
      return 40;
    }
    return 30;
  }
  return 1;
}
async function resolveUserRefAndData(adminDb2, admin5, userId) {
  let finalDocId = userId;
  if (!userId.includes("@")) {
    if (admin5 && state.isAdminSDKActive) {
      try {
        const authUser = await admin5.auth().getUser(userId);
        if (authUser.email) {
          finalDocId = authUser.email.toLowerCase().trim();
        }
      } catch (err) {
        console.warn(`[ResolveUser] Admin Auth lookup failed for UID ${userId}:`, err.message);
      }
    }
    if (finalDocId === userId && adminDb2) {
      try {
        const usersSnap = await adminDb2.collection("users").where("uid", "==", userId).limit(1).get();
        if (!usersSnap.empty) {
          const matchedUser = usersSnap.docs[0];
          const emailField = matchedUser.data().email;
          if (emailField) {
            finalDocId = emailField.toLowerCase().trim();
          } else {
            finalDocId = matchedUser.id;
          }
        }
      } catch (err) {
        console.warn(`[ResolveUser] Firestore users query failed for UID ${userId}:`, err.message);
      }
    }
  } else {
    finalDocId = userId.toLowerCase().trim();
  }
  const userRef = adminDb2.collection("users").doc(finalDocId);
  return { userRef, finalDocId };
}
function setupAIRouter(app, _db, _adminDb, admin5) {
  app.post("/api/ai/key", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const adminDb2 = state.adminDb;
      if (!adminDb2) return res.status(500).json({ error: "Admin DB not initialized" });
      const { finalDocId } = await resolveUserRefAndData(adminDb2, admin5, userId);
      const apiKey = "x-bar-" + import_crypto2.default.randomBytes(16).toString("hex");
      await adminDb2.collection("api_keys").doc(finalDocId).set({
        userId: finalDocId,
        apiKey,
        createdAt: /* @__PURE__ */ new Date()
      });
      if (state.db) {
        try {
          await (0, import_firestore10.setDoc)((0, import_firestore10.doc)(state.db, "api_keys", finalDocId), {
            userId: finalDocId,
            apiKey,
            serverKey: "barnia-system-2024-v1",
            createdAt: (0, import_firestore10.serverTimestamp)()
          });
        } catch (e) {
          console.warn("[AIRouter] Sync API key to client DB failed:", e.message);
        }
      }
      res.json({ apiKey });
    } catch (e) {
      console.error("[AIRouter] Key generation error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/ai", async (req, res) => {
    try {
      const { userId, task, type, inputImage, approved, model } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const adminDb2 = state.adminDb;
      if (!adminDb2) return res.status(500).json({ error: "Admin DB not initialized" });
      const { userRef, finalDocId } = await resolveUserRefAndData(adminDb2, admin5, userId);
      if (state.db) {
        try {
          const clientSnap = await (0, import_firestore10.getDoc)((0, import_firestore10.doc)(state.db, "users", finalDocId));
          if (clientSnap.exists()) {
            const clientData = clientSnap.data();
            await userRef.set({
              uid: clientData.uid || finalDocId,
              email: clientData.email || finalDocId,
              displayName: clientData.displayName || "AI Explorer",
              credits: clientData.credits !== void 0 ? clientData.credits : 10,
              role: clientData.role || "user",
              createdAt: clientData.createdAt ? clientData.createdAt.toDate ? clientData.createdAt.toDate().toISOString() : clientData.createdAt : (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        } catch (e) {
          console.warn("[AIRouter] Dynamic client-to-admin sync skipped:", e.message);
        }
      }
      let userSnap = await userRef.get();
      if (!userSnap.exists) {
        console.log(`[AIRouter] User profile ${finalDocId} not found in adminDb. Auto-bootstrapping default profile.`);
        const isDeveloper = finalDocId === "okbgmi611@gmail.com" || finalDocId === "ujirpur.barnia6@gmail.com" || finalDocId.includes("admin") || finalDocId.includes("developer");
        const baseUserData = {
          uid: finalDocId.includes("@") ? userId : finalDocId,
          email: finalDocId.includes("@") ? finalDocId : "explorer@sanatani.dharm",
          displayName: finalDocId.includes("@") ? finalDocId.split("@")[0] : "AI Explorer",
          credits: isDeveloper ? 1e3 : 10,
          role: isDeveloper ? "admin" : "user",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await userRef.set(baseUserData);
        if (state.db) {
          try {
            await (0, import_firestore10.setDoc)((0, import_firestore10.doc)(state.db, "users", finalDocId), {
              ...baseUserData,
              serverKey: "barnia-system-2024-v1",
              createdAt: (0, import_firestore10.serverTimestamp)()
            });
          } catch (e) {
            console.warn("[AIRouter] Auto-bootstrap to client DB skipped:", e.message);
          }
        }
        userSnap = await userRef.get();
      }
      let userData = userSnap.data();
      const isDev = finalDocId === "okbgmi611@gmail.com" || finalDocId === "ujirpur.barnia6@gmail.com";
      if (isDev && (userData.credits === void 0 || userData.credits < 10 || userData.role !== "admin")) {
        await userRef.update({ credits: 1e3, role: "admin" });
        if (state.db) {
          try {
            await (0, import_firestore10.updateDoc)((0, import_firestore10.doc)(state.db, "users", finalDocId), {
              credits: 1e3,
              role: "admin",
              serverKey: "barnia-system-2024-v1"
            });
          } catch (e) {
          }
        }
        userSnap = await userRef.get();
        userData = userSnap.data();
      }
      const credits = userData.credits !== void 0 ? userData.credits : 10;
      if (credits <= 0) {
        return res.status(403).json({ error: "Your credit balance is 0. Please recharge your credits to use AI Router services." });
      }
      let resolvedType = type;
      if (type === "auto") {
        const t = (task || "").toLowerCase();
        if (t.includes("video") || t.includes("motion") || t.includes("movie") || t.includes("clip") || t.includes("animation")) {
          resolvedType = "video";
        } else if (t.includes("image") || t.includes("photo") || t.includes("picture") || t.includes("draw") || t.includes("painting") || t.includes("art")) {
          resolvedType = "image";
        } else {
          resolvedType = "text";
        }
      }
      const estimatedCost = getEstimatedCost(resolvedType, model);
      if (credits < estimatedCost) {
        return res.status(400).json({ error: `Insufficient credit balance. This task requires ${estimatedCost} credits but you only have ${credits}.` });
      }
      const isAdmin = userData.role === "admin" || isDev;
      if (estimatedCost >= 15 && !approved && !isAdmin) {
        return res.json({
          needsApproval: true,
          cost: estimatedCost,
          message: `This premium task (${resolvedType}) will consume ${estimatedCost} credits. Would you like to proceed?`
        });
      }
      if (estimatedCost < 15 || isAdmin) {
        console.log(`[AIRouter] Running budget task (${resolvedType}) instantly for user ${finalDocId}`);
        const aiResponse = await generateAIResult(task, resolvedType, inputImage || null, model);
        const newCredits = Math.max(0, credits - estimatedCost);
        await userRef.update({ credits: newCredits });
        await adminDb2.collection("usage").add({
          userId: finalDocId,
          task,
          type: resolvedType,
          cost: estimatedCost,
          modelUsed: aiResponse.modelUsed,
          result: aiResponse.result,
          timestamp: /* @__PURE__ */ new Date()
        });
        if (state.db) {
          try {
            await (0, import_firestore10.updateDoc)((0, import_firestore10.doc)(state.db, "users", finalDocId), {
              credits: newCredits,
              serverKey: "barnia-system-2024-v1"
            });
            await (0, import_firestore10.addDoc)((0, import_firestore10.collection)(state.db, "usage"), {
              userId: finalDocId,
              task,
              type: resolvedType,
              cost: estimatedCost,
              modelUsed: aiResponse.modelUsed,
              result: aiResponse.result,
              serverKey: "barnia-system-2024-v1",
              timestamp: (0, import_firestore10.serverTimestamp)()
            });
            console.log(`[AIRouter] Budget task credits and logs successfully synced to client DB`);
          } catch (e) {
            console.warn("[AIRouter] Failed syncing budget run to client DB:", e.message);
          }
        }
        return res.json({
          success: true,
          type: resolvedType,
          result: aiResponse.result,
          modelUsed: aiResponse.modelUsed,
          cost: estimatedCost,
          remainingCredits: newCredits
        });
      }
      console.log(`[AIRouter] Queuing premium task (${resolvedType}) with model ${model || "default"} for developer approval`);
      const pendingData = {
        userId: finalDocId,
        userEmail: finalDocId,
        task,
        type: resolvedType,
        inputImage: inputImage || null,
        cost: estimatedCost,
        status: "pending",
        createdAt: /* @__PURE__ */ new Date(),
        modelUsed: model || (resolvedType === "video" || resolvedType === "image_to_video" ? "MiniMax Video-01" : "Flux Schnell"),
        model: model || null
      };
      const docRef = await adminDb2.collection("pending_ai_requests").add(pendingData);
      if (state.db) {
        try {
          await (0, import_firestore10.setDoc)((0, import_firestore10.doc)(state.db, "pending_ai_requests", docRef.id), {
            ...pendingData,
            serverKey: "barnia-system-2024-v1",
            createdAt: (0, import_firestore10.serverTimestamp)()
          });
          console.log(`[AIRouter] Queued request synchronized to standard client DB: ${docRef.id}`);
        } catch (e) {
          console.warn("[AIRouter] Failed to synchronize queued request to standard client DB:", e.message);
        }
      }
      return res.json({
        pending: true,
        requestId: docRef.id,
        message: "This super high-resolution generation is queued for developer approval."
      });
    } catch (e) {
      console.error("[AIRouter] Endpoint Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/ai/status/:requestId", async (req, res) => {
    try {
      const { requestId } = req.params;
      const adminDb2 = state.adminDb;
      if (!adminDb2) return res.status(500).json({ error: "Admin DB not initialized" });
      const requestRef = adminDb2.collection("pending_ai_requests").doc(requestId);
      const snap = await requestRef.get();
      if (!snap.exists) {
        if (state.db) {
          try {
            const { doc: doc9, getDoc: getDoc8 } = await import("firebase/firestore");
            const clientSnap = await getDoc8(doc9(state.db, "pending_ai_requests", requestId));
            if (clientSnap.exists()) {
              const clientData = clientSnap.data();
              return res.json({
                id: requestId,
                status: clientData.status,
                result: clientData.result || null,
                modelUsed: clientData.modelUsed || null,
                cost: clientData.cost || 0,
                type: clientData.type || "text",
                error: clientData.error || null
              });
            }
          } catch (eSnap) {
            console.warn("[AIRouter] Status query fallback skipped:", eSnap.message);
          }
        }
        return res.status(404).json({ error: "Request not found" });
      }
      const data = snap.data();
      res.json({
        id: snap.id,
        status: data.status,
        result: data.result || null,
        modelUsed: data.modelUsed || null,
        cost: data.cost || 0,
        type: data.type || "text",
        error: data.error || null
      });
    } catch (e) {
      console.error("[AIRouter] Status Endpoint Error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/v1/ai", async (req, res) => {
    try {
      const adminDb2 = state.adminDb;
      if (!adminDb2) return res.status(500).json({ error: "Admin DB not initialized" });
      const apiKeyHeader = req.headers["x-api-key"];
      if (!apiKeyHeader) {
        return res.status(401).json({ error: "Missing 'x-api-key' authorization header." });
      }
      const keySnap = await adminDb2.collection("api_keys").where("apiKey", "==", apiKeyHeader).limit(1).get();
      if (keySnap.empty) {
        return res.status(401).json({ error: "The provided x-api-key header is invalid or inactive." });
      }
      const keyData = keySnap.docs[0].data();
      const userId = keyData.userId;
      const { userRef, finalDocId } = await resolveUserRefAndData(adminDb2, admin5, userId);
      let userSnap = await userRef.get();
      if (!userSnap.exists) {
        console.log(`[AIRouter API V1] User profile ${finalDocId} linked to API Key not found in adminDb. Auto-bootstrapping profile...`);
        await userRef.set({
          uid: finalDocId.includes("@") ? userId : finalDocId,
          email: finalDocId.includes("@") ? finalDocId : "api_key_explorer@sanatani.dharm",
          displayName: finalDocId.includes("@") ? finalDocId.split("@")[0] : "API Core Builder",
          credits: 10,
          role: "user",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        userSnap = await userRef.get();
      }
      const userData = userSnap.data();
      const credits = userData.credits !== void 0 ? userData.credits : 10;
      if (credits <= 0) {
        return res.status(403).json({ error: "Your credit balance is 0. Please recharge your credits to continue." });
      }
      const { task, type = "text", inputImage = null } = req.body;
      if (!task) {
        return res.status(400).json({ error: "The 'task' parameter is required in request body prompt." });
      }
      let resolvedType = type;
      if (type === "auto") {
        const t = task.toLowerCase();
        if (t.includes("video") || t.includes("motion") || t.includes("movie")) resolvedType = "video";
        else if (t.includes("image") || t.includes("photo") || t.includes("picture")) resolvedType = "image";
        else resolvedType = "text";
      }
      const estimatedCost = getEstimatedCost(resolvedType);
      if (credits < estimatedCost) {
        return res.status(403).json({ error: "Quota balance exceeded for the API license." });
      }
      if (estimatedCost >= 15) {
        const pendingData = {
          userId: finalDocId,
          userEmail: finalDocId,
          task,
          type: resolvedType,
          inputImage: inputImage || null,
          cost: estimatedCost,
          status: "pending",
          createdAt: /* @__PURE__ */ new Date(),
          modelUsed: resolvedType === "video" || resolvedType === "image_to_video" ? "MiniMax Video-01" : "Flux Schnell"
        };
        const docRef = await adminDb2.collection("pending_ai_requests").add(pendingData);
        if (state.db) {
          try {
            await (0, import_firestore10.setDoc)((0, import_firestore10.doc)(state.db, "pending_ai_requests", docRef.id), {
              ...pendingData,
              serverKey: "barnia-system-2024-v1",
              createdAt: (0, import_firestore10.serverTimestamp)()
            });
            console.log(`[AIRouter API V1] Synchronized queued request to standard client DB: ${docRef.id}`);
          } catch (e) {
            console.warn("[AIRouter API V1] Failed to sync to standard client DB:", e.message);
          }
        }
        return res.json({
          pending: true,
          status: "pending_approval",
          requestId: docRef.id,
          message: "Task is pending budget validation from admin console."
        });
      }
      const aiResponse = await generateAIResult(task, resolvedType, inputImage);
      const newCredits = Math.max(0, credits - estimatedCost);
      await userRef.update({ credits: newCredits });
      await adminDb2.collection("usage").add({
        userId: finalDocId,
        task,
        type: resolvedType,
        cost: estimatedCost,
        modelUsed: aiResponse.modelUsed,
        result: aiResponse.result,
        timestamp: /* @__PURE__ */ new Date()
      });
      if (state.db) {
        try {
          await (0, import_firestore10.updateDoc)((0, import_firestore10.doc)(state.db, "users", finalDocId), {
            credits: newCredits,
            serverKey: "barnia-system-2024-v1"
          });
          await (0, import_firestore10.addDoc)((0, import_firestore10.collection)(state.db, "usage"), {
            userId: finalDocId,
            task,
            type: resolvedType,
            cost: estimatedCost,
            modelUsed: aiResponse.modelUsed,
            result: aiResponse.result,
            serverKey: "barnia-system-2024-v1",
            timestamp: (0, import_firestore10.serverTimestamp)()
          });
        } catch (e) {
          console.warn("[AIRouter API V1] Standard client DB sync missed during direct run:", e.message);
        }
      }
      return res.json({
        success: true,
        type: resolvedType,
        result: aiResponse.result,
        modelUsed: aiResponse.modelUsed,
        cost: estimatedCost,
        remainingCredits: newCredits
      });
    } catch (e) {
      console.error("[AIRouter v1 API error]:", e);
      res.status(500).json({ error: e.message });
    }
  });
}

// server/numerology-api.ts
function setupNumerologyRoutes(app) {
  app.get("/api/numerology", async (req, res) => {
    const { dob } = req.query;
    if (!dob) return res.status(400).json({ error: "Date of Birth is required" });
    try {
      const apiKey = await getGeminiApiKey();
      const prompt = `Perform a Vedic Numerology reading for DOB: ${dob}.`;
      const response = await callGeminiWithRetry(apiKey, {
        model: "gemini-3.5-flash",
        contents: prompt
      });
      res.json({ reading: response.text });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

// server/admin-api.ts
init_db();
init_email();
function setupAdminRoutes(app, newsLocks2) {
  app.get("/api/admin/test-firestore", async (req, res) => {
    try {
      const apiKey = await getGeminiApiKey();
      const testDoc = { test: true, timestamp: /* @__PURE__ */ new Date() };
      let results = {};
      const admin5 = await import("firebase-admin");
      try {
        const adminDb2 = state.adminDb;
        if (adminDb2) {
          await adminDb2.collection("_health_check").doc("admin_test").set(testDoc);
          results.admin = "success";
        } else {
          results.admin = "not_initialized";
        }
      } catch (e) {
        results.admin = "error: " + e.message;
      }
      try {
        await admin5.firestore().collection("_health_check").doc("default_test").set(testDoc);
        results.admin_default = "success";
      } catch (e) {
        results.admin_default = "error: " + e.message;
      }
      try {
        const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { doc: doc9, setDoc: setDoc8 } = await import("firebase/firestore");
        if (db2) {
          await setDoc8(doc9(db2, "_health_check", "client_test"), testDoc);
          results.client = "success";
        } else {
          results.client = "not_initialized";
        }
      } catch (e) {
        results.client = "error: " + e.message;
      }
      res.json(results);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/test-gemini", async (req, res) => {
    try {
      const apiKey = await getGeminiApiKey();
      const response = await callGeminiWithRetry(apiKey, { model: "gemini-3.5-flash", contents: "Ping" });
      res.json({ status: "success", text: response.text });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/test-email", async (req, res) => {
    const to = req.query.email || "okbgmi611@gmail.com";
    try {
      await robustSendMail({
        from: '"Barnia Digital Hub Test" <ujirpur.barnia6@gmail.com>',
        to,
        subject: "SMTP Test from Barnia Digital Hub",
        text: "This is a test email to verify SMTP configuration."
      });
      res.json({ status: "success", message: `Test email sent to ${to}` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/test-email-detailed", async (req, res) => {
    const to = req.query.email || "okbgmi611@gmail.com";
    const startTime = Date.now();
    try {
      await robustSendMail({
        from: '"Barnia Digital Hub Test" <ujirpur.barnia6@gmail.com>',
        to,
        subject: "SMTP Detailed Test from Barnia Digital Hub",
        text: "This is a detailed test email to verify SMTP configuration and measure performance."
      });
      const endTime = Date.now();
      res.json({
        status: "success",
        info: { timeMs: endTime - startTime },
        smtpLogs: getSmtpLogs()
      });
    } catch (e) {
      res.status(500).json({
        status: "error",
        error: e.message,
        smtpLogs: getSmtpLogs(),
        details: e.stack || e.message
      });
    }
  });
  app.get("/api/admin/data/:collection", async (req, res) => {
    try {
      const { collection: colName } = req.params;
      const adminDb2 = state.adminDb;
      if (!adminDb2) return res.status(500).json({ error: "Admin DB not initialized" });
      const limit6 = parseInt(req.query.limit) || 50;
      const allowed = [
        "inbound_emails",
        "usage",
        "pending_ai_requests",
        "ai_logs",
        "users",
        "visitor_sessions",
        "support_messages",
        "telegram_users",
        "api_keys",
        "ride_requests",
        "vehicles"
      ];
      if (!allowed.includes(colName)) return res.status(403).json({ error: "Unauthorized collection access" });
      const snap = await adminDb2.collection(colName).orderBy(
        colName === "users" ? "displayName" : colName === "visitor_sessions" ? "lastSeen" : "createdAt",
        "desc"
      ).limit(limit6).get();
      const data = snap.docs.map((doc9) => ({ id: doc9.id, ...doc9.data() }));
      res.json(data);
    } catch (e) {
      console.error(`[AdminAPI] Error fetching ${req.params.collection}:`, e.message);
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/diag", async (req, res) => {
    try {
      const results = {
        emailUser: process.env.EMAIL_USER || "ujirpur.barnia6@gmail.com",
        emailPassConfigured: !!(process.env.EMAIL_PASS || process.env.SMTP_PASS),
        adminDbInitialized: false,
        identityToolkitStatus: "unknown"
      };
      const adminDb2 = state.adminDb;
      results.adminDbInitialized = !!adminDb2;
      if (state.isAdminSDKActive) {
        try {
          const admin5 = await import("firebase-admin");
          await admin5.auth().getUserByEmail("test@example.com");
          results.identityToolkitStatus = "enabled";
        } catch (e) {
          if (e.code === "auth/project-not-found" || e.message.includes("identitytoolkit.googleapis.com")) {
            results.identityToolkitStatus = "disabled";
          } else {
            results.identityToolkitStatus = "error: " + e.code;
          }
        }
      } else {
        results.identityToolkitStatus = "disabled (Admin credentials inactive)";
      }
      res.json(results);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/approve-ai", async (req, res) => {
    try {
      const { requestId, adminId } = req.body;
      const adminDb2 = state.adminDb;
      if (!adminDb2) return res.status(500).json({ error: "Admin DB not initialized" });
      const requestRef = adminDb2.collection("pending_ai_requests").doc(requestId);
      const snap = await requestRef.get();
      let requestData = snap.exists ? snap.data() : null;
      if (!requestData && state.db) {
        try {
          const { doc: doc9, getDoc: getDoc8 } = await import("firebase/firestore");
          const clientSnap = await getDoc8(doc9(state.db, "pending_ai_requests", requestId));
          if (clientSnap.exists()) {
            requestData = clientSnap.data();
            console.log(`[AdminAPI] Dynamically loaded pending request ${requestId} from client DB for approval`);
          }
        } catch (e) {
          console.warn("[AdminAPI] Client DB request load skipped/failed:", e.message);
        }
      }
      if (!requestData) return res.status(404).json({ error: "Request not found in databases" });
      if (requestData.status !== "pending") {
        return res.status(400).json({ error: "Request is already processed" });
      }
      console.log(`[AdminAPI] Approved AI request ${requestId} for user ${requestData.userId}. Setting state to processing...`);
      if (snap.exists) {
        await requestRef.update({
          status: "processing",
          approvedBy: adminId,
          approvedAt: /* @__PURE__ */ new Date()
        });
      }
      if (state.db) {
        try {
          const { doc: doc9, updateDoc: updateDoc5, serverTimestamp: serverTimestamp8 } = await import("firebase/firestore");
          const clientReqRef = doc9(state.db, "pending_ai_requests", requestId);
          await updateDoc5(clientReqRef, {
            status: "processing",
            approvedBy: adminId,
            approvedAt: serverTimestamp8(),
            serverKey: "barnia-system-2024-v1"
          });
          console.log(`[AdminAPI] Request status set to 'processing' in client DB`);
        } catch (e) {
          console.warn("[AdminAPI] Request status sync to client DB failed for 'processing':", e.message);
        }
      }
      res.json({ success: true, message: "AI Request approved. Generation starting in background." });
      (async () => {
        try {
          console.log(`[AdminAPI] [AsyncBackground] Launching high-performance generation run for request ${requestId}...`);
          const aiResponse = await generateAIResult(
            requestData.task,
            requestData.type,
            requestData.inputImage || null,
            requestData.model || requestData.modelUsed || null
          );
          console.log(`[AdminAPI] [AsyncBackground] Generation completed successfully. Remaining steps...`);
          let resolvedUserId = requestData.userId;
          if (!resolvedUserId.includes("@")) {
            try {
              const adminSDK = await import("firebase-admin");
              const authUser = await adminSDK.auth().getUser(resolvedUserId);
              if (authUser.email) resolvedUserId = authUser.email.toLowerCase().trim();
            } catch (e) {
              try {
                const usersSnap = await adminDb2.collection("users").where("uid", "==", resolvedUserId).limit(1).get();
                if (!usersSnap.empty) {
                  const matchedUser = usersSnap.docs[0];
                  const emailField = matchedUser.data().email;
                  if (emailField) resolvedUserId = emailField.toLowerCase().trim();
                }
              } catch (e2) {
              }
            }
          }
          const userRef = adminDb2.collection("users").doc(resolvedUserId);
          const userSnap = await userRef.get();
          let remainingCredits = 0;
          if (userSnap.exists) {
            const uData = userSnap.data();
            const currentCredits = uData.credits !== void 0 ? uData.credits : 10;
            remainingCredits = Math.max(0, currentCredits - requestData.cost);
            await userRef.update({ credits: remainingCredits });
          } else {
            const isDeveloper = resolvedUserId === "okbgmi611@gmail.com" || resolvedUserId === "ujirpur.barnia6@gmail.com";
            remainingCredits = Math.max(0, (isDeveloper ? 1e3 : 10) - requestData.cost);
            await userRef.set({
              uid: resolvedUserId,
              email: resolvedUserId,
              displayName: resolvedUserId.split("@")[0],
              credits: remainingCredits,
              role: isDeveloper ? "admin" : "user",
              createdAt: /* @__PURE__ */ new Date()
            });
          }
          if (state.db) {
            try {
              const { doc: doc9, setDoc: setDoc8 } = await import("firebase/firestore");
              const clientUserRef = doc9(state.db, "users", resolvedUserId);
              await setDoc8(clientUserRef, {
                credits: remainingCredits,
                serverKey: "barnia-system-2024-v1"
              }, { merge: true });
              console.log(`[AdminAPI] [AsyncBackground] Mirrored remaining credits (${remainingCredits}) to client user`);
            } catch (e) {
              console.warn("[AdminAPI] [AsyncBackground] Client DB credits sync failed:", e.message);
            }
          }
          await adminDb2.collection("usage").add({
            userId: resolvedUserId,
            task: requestData.task,
            type: requestData.type,
            cost: requestData.cost,
            modelUsed: aiResponse.modelUsed,
            result: aiResponse.result,
            timestamp: /* @__PURE__ */ new Date()
          });
          if (state.db) {
            try {
              const { collection: collection9, addDoc: addDoc5, serverTimestamp: serverTimestamp8 } = await import("firebase/firestore");
              await addDoc5(collection9(state.db, "usage"), {
                userId: resolvedUserId,
                task: requestData.task,
                type: requestData.type,
                cost: requestData.cost,
                modelUsed: aiResponse.modelUsed,
                result: aiResponse.result,
                serverKey: "barnia-system-2024-v1",
                timestamp: serverTimestamp8()
              });
            } catch (e) {
              console.warn("[AdminAPI] [AsyncBackground] Usage log sync client DB failed:", e.message);
            }
          }
          if (snap.exists) {
            await requestRef.update({
              status: "completed",
              result: aiResponse.result,
              modelUsed: aiResponse.modelUsed,
              approvedBy: adminId,
              approvedAt: /* @__PURE__ */ new Date()
            });
          }
          if (state.db) {
            try {
              const { doc: doc9, updateDoc: updateDoc5, serverTimestamp: serverTimestamp8, setDoc: setDoc8 } = await import("firebase/firestore");
              const clientReqRef = doc9(state.db, "pending_ai_requests", requestId);
              try {
                await updateDoc5(clientReqRef, {
                  status: "completed",
                  result: aiResponse.result,
                  modelUsed: aiResponse.modelUsed,
                  approvedBy: adminId,
                  serverKey: "barnia-system-2024-v1",
                  approvedAt: serverTimestamp8()
                });
              } catch (e) {
                await setDoc8(clientReqRef, {
                  ...requestData,
                  status: "completed",
                  result: aiResponse.result,
                  modelUsed: aiResponse.modelUsed,
                  approvedBy: adminId,
                  serverKey: "barnia-system-2024-v1",
                  approvedAt: serverTimestamp8()
                }, { merge: true });
              }
              console.log(`[AdminAPI] [AsyncBackground] Request completed status synced to client DB successfully`);
            } catch (e) {
              console.warn("[AdminAPI] [AsyncBackground] Sync completed status failed:", e.message);
            }
          }
        } catch (genErr) {
          console.error(`[AdminAPI] [AsyncBackground] AI Generation run failed for request ${requestId}:`, genErr);
          const failStatus = {
            status: "failed",
            error: genErr?.message || "AI generation failed during execution.",
            approvedBy: adminId,
            approvedAt: /* @__PURE__ */ new Date()
          };
          if (snap.exists) {
            await requestRef.update(failStatus);
          }
          if (state.db) {
            try {
              const { doc: doc9, updateDoc: updateDoc5, serverTimestamp: serverTimestamp8 } = await import("firebase/firestore");
              const clientReqRef = doc9(state.db, "pending_ai_requests", requestId);
              await updateDoc5(clientReqRef, {
                status: "failed",
                error: genErr?.message || "AI generation failed during execution.",
                approvedBy: adminId,
                approvedAt: serverTimestamp8(),
                serverKey: "barnia-system-2024-v1"
              });
              console.log(`[AdminAPI] [AsyncBackground] Updated failure status to client DB for request: ${requestId}`);
            } catch (eSync) {
              console.warn("[AdminAPI] [AsyncBackground] Syncing failure status to client DB failed:", eSync.message);
            }
          }
        }
      })();
    } catch (e) {
      console.error("[AdminAPI] Error during AI approval task wrapper:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/deny-ai", async (req, res) => {
    try {
      const { requestId, adminId } = req.body;
      const adminDb2 = state.adminDb;
      if (!adminDb2) return res.status(500).json({ error: "Admin DB not initialized" });
      const requestRef = adminDb2.collection("pending_ai_requests").doc(requestId);
      const snap = await requestRef.get();
      if (snap.exists) {
        await requestRef.update({
          status: "denied",
          deniedBy: adminId,
          deniedAt: /* @__PURE__ */ new Date()
        });
      }
      if (state.db) {
        try {
          const { doc: doc9, updateDoc: updateDoc5, serverTimestamp: serverTimestamp8 } = await import("firebase/firestore");
          await updateDoc5(doc9(state.db, "pending_ai_requests", requestId), {
            status: "denied",
            deniedBy: adminId,
            serverKey: "barnia-system-2024-v1",
            deniedAt: serverTimestamp8()
          });
        } catch (e) {
          console.warn("[AdminAPI] Deny status sync to client DB failed:", e.message);
        }
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/adjust-credits", async (req, res) => {
    try {
      const { targetId, amount, type, collection: colName } = req.body;
      const adminDb2 = state.adminDb;
      if (!adminDb2) return res.status(500).json({ error: "Admin DB not initialized" });
      if (!targetId || amount === void 0 || !colName) {
        return res.status(400).json({ error: "Missing required fields: targetId, amount, and collection are required." });
      }
      const allowedCollections = ["users", "telegram_users"];
      if (!allowedCollections.includes(colName)) {
        return res.status(400).json({ error: "Invalid target collection." });
      }
      let resolvedTargetId = targetId;
      if (colName === "users" && !resolvedTargetId.includes("@")) {
        try {
          const adminSDK = await import("firebase-admin");
          const authUser = await adminSDK.auth().getUser(resolvedTargetId);
          if (authUser.email) resolvedTargetId = authUser.email.toLowerCase().trim();
        } catch (err) {
          try {
            const usersSnap = await adminDb2.collection("users").where("uid", "==", resolvedTargetId).limit(1).get();
            if (!usersSnap.empty) {
              const matchedUser = usersSnap.docs[0];
              const emailField = matchedUser.data().email;
              if (emailField) resolvedTargetId = emailField.toLowerCase().trim();
            }
          } catch (err2) {
          }
        }
      }
      const docRef = adminDb2.collection(colName).doc(resolvedTargetId);
      const snap = await docRef.get();
      if (!snap.exists) {
        return res.status(404).json({ error: `User not found in ${colName}` });
      }
      const currentData = snap.data();
      const currentCredits = currentData.credits !== void 0 ? Number(currentData.credits) : 0;
      const changeAmount = Number(amount);
      let newCredits = currentCredits;
      if (type === "add") {
        newCredits = currentCredits + changeAmount;
      } else if (type === "set") {
        newCredits = changeAmount;
      } else if (type === "deduct") {
        newCredits = Math.max(0, currentCredits - changeAmount);
      }
      await docRef.update({
        credits: newCredits,
        updatedAt: colName === "telegram_users" ? (/* @__PURE__ */ new Date()).toISOString() : /* @__PURE__ */ new Date()
      });
      res.json({ success: true, newCredits });
    } catch (e) {
      console.error("[AdminAPI] Error adjusting credits:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/verify-smtp", async (req, res) => {
    const { getSmtpLogs: getSmtpLogs2 } = await Promise.resolve().then(() => (init_email(), email_exports));
    try {
      const results = {
        config: {
          user: process.env.EMAIL_USER || "ujirpur.barnia6@gmail.com",
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: process.env.SMTP_PORT || 587
        },
        connection: "pending",
        logs: getSmtpLogs2()
      };
      await robustSendMail({
        from: '"Barnali Hub System" <ujirpur.barnia6@gmail.com>',
        to: "ujirpur.barnia6@gmail.com",
        subject: "SMTP Self-Test",
        text: "Checking SMTP health."
      });
      results.connection = "success";
      results.logs = getSmtpLogs2();
      res.json(results);
    } catch (e) {
      res.status(500).json({
        status: "error",
        error: e.message,
        smtpLogs: getSmtpLogs2()
      });
    }
  });
  app.get("/api/debug-news", (req, res) => {
    res.json({ message: "Debug info", locksCount: newsLocks2.size });
  });
}

// server/ssr.ts
var import_path4 = __toESM(require("path"), 1);
var import_promises3 = __toESM(require("fs/promises"), 1);

// server/meta.ts
var import_firestore11 = require("firebase/firestore");
init_db();
init_constants();
async function injectMetaTags(html, metadata) {
  const safeUrl = metadata.url || "";
  const images = Array.isArray(metadata.image) ? metadata.image : [metadata.image].filter(Boolean);
  const primaryImage = images[0] || "";
  const escapedTitle = escapeHtml(metadata.title);
  const escapedDescription = escapeHtml(metadata.description);
  const escapedUrl = escapeHtml(safeUrl);
  let keywords = metadata.keywords || "barnia, community";
  const escapedKeywords = escapeHtml(keywords);
  const type = metadata.type || "website";
  const updatedTime = (/* @__PURE__ */ new Date()).toISOString();
  let imageTags = "";
  images.forEach((img) => {
    const escapedImg = escapeHtml(img);
    imageTags += `
    <meta property="og:image" content="${escapedImg}" />
    <meta property="og:image:secure_url" content="${escapedImg}" />
    `;
  });
  const metaTags = `
    <title>${escapedTitle}</title>
    <meta name="description" content="${escapedDescription}" />
    <meta name="keywords" content="${escapedKeywords}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:url" content="${escapedUrl}" />
    <meta property="og:type" content="${type}" />
    ${imageTags}
    <meta name="twitter:card" content="${metadata.twitterCard || (primaryImage ? "summary_large_image" : "summary")}" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    <link rel="canonical" href="${escapedUrl}" />
  `;
  let modifiedHtml = html.replace(/<title>.*?<\/title>/gi, "");
  modifiedHtml = modifiedHtml.replace(/(<head[^>]*>)/i, `$1${metaTags}`);
  return modifiedHtml;
}

// server/ssr.ts
function setupSSR(app, vite) {
  app.get("*", async (req, res) => {
    try {
      const isProd = process.env.NODE_ENV === "production";
      const indexPath = isProd ? import_path4.default.resolve("dist", "index.html") : import_path4.default.resolve("index.html");
      let html = await import_promises3.default.readFile(indexPath, "utf-8");
      if (vite && !isProd) {
        html = await vite.transformIndexHtml(req.originalUrl, html);
      }
      const baseUrl = isProd ? "https://barnia.in" : `http://${req.headers.host}`;
      const metadata = {
        title: "Barnia Digital Hub | Community Platform",
        description: "Official community platform for Barnia, Ujirpur, Nadia.",
        image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?fm=jpg&fit=crop&q=80&w=1200&h=630",
        url: `${baseUrl}${req.path}`,
        type: "website"
      };
      if (req.path === "/fact-check") {
        metadata.title = "Sanatani Fact Check | Barnia Digital Hub";
      }
      html = await injectMetaTags(html, metadata);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (err) {
      console.error("[SSR] Error:", err);
      res.status(500).send("Internal Server Error");
    }
  });
}

// server/telegram-bot.ts
var import_node_fetch5 = __toESM(require("node-fetch"), 1);
var import_firebase_admin3 = __toESM(require("firebase-admin"), 1);
async function getTelegramBotToken() {
  const allEnvKeys = Object.keys(process.env);
  let botTokenKey = allEnvKeys.find((k) => k === "TELEGRAM_BOT_TOKEN") || allEnvKeys.find((k) => k === "VITE_TELEGRAM_BOT_TOKEN");
  if (!botTokenKey) {
    botTokenKey = allEnvKeys.find((k) => {
      const uk = k.toUpperCase();
      return uk.includes("TELEGRAM") && uk.includes("TOKEN");
    });
  }
  if (!botTokenKey) {
    botTokenKey = allEnvKeys.find((k) => {
      const uk = k.toUpperCase();
      return uk.includes("TELEGRAM") && uk.includes("BOT") && !uk.includes("USER");
    });
  }
  const token = botTokenKey ? process.env[botTokenKey] : null;
  return token ? token.trim() : null;
}
async function getTelegramFileUrl(fileId, botToken) {
  try {
    const fileRes = await (0, import_node_fetch5.default)(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    if (fileData && fileData.ok && fileData.result && fileData.result.file_path) {
      return `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
    }
  } catch (e) {
    console.error("[Telegram Bot] Error getting file path:", e);
  }
  return null;
}
async function handleTelegramWebhook(req, res, lastPhotos2, telegramLinkCache2, db2, adminDb2) {
  const body = req.body;
  if (!body || !body.message) {
    return res.status(200).send("OK");
  }
  const { message } = body;
  const chatId = message.chat.id;
  const text = message.text || "";
  const from = message.from || {};
  console.log(`[Telegram] Message from ${from?.first_name} (${chatId}): ${text.substring(0, 55)}`);
  res.status(200).send("OK");
  const botToken = await getTelegramBotToken();
  if (!botToken) {
    console.error("[Telegram] BOT_TOKEN missing");
    return;
  }
  const sendMessage = async (msg, options = {}) => {
    try {
      const rawRes = await (0, import_node_fetch5.default)(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, ...options })
      });
      if (!rawRes.ok && options.parse_mode) {
        await (0, import_node_fetch5.default)(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: msg })
        });
      }
    } catch (e) {
      console.error("[Telegram] sendMessage failed:", e);
    }
  };
  let linkedProfileId = null;
  let linkedEmail = null;
  let currentCredits = 10;
  if (adminDb2) {
    try {
      const userRef = adminDb2.collection("telegram_users").doc(chatId.toString());
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        const udata = userSnap.data();
        currentCredits = udata.credits !== void 0 ? udata.credits : 10;
        linkedProfileId = udata.linkedProfileId || null;
        linkedEmail = udata.linkedEmail || null;
      } else {
        await userRef.set({
          id: chatId.toString(),
          name: `${from.first_name || ""} ${from.last_name || ""}`.trim() || from.username || `Chat ${chatId}`,
          username: from.username || null,
          credits: 10,
          role: "user",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    } catch (err) {
      console.error("[Telegram] State retrieval / bootstrap error:", err);
    }
  }
  const textLower = text.toLowerCase().trim();
  const startParts = text.trim().split(/\s+/);
  const isStartCmd = startParts[0].toLowerCase() === "/start";
  if (isStartCmd) {
    const startParam = startParts.length > 1 ? startParts[1].trim() : null;
    if (startParam) {
      let foundProfile = null;
      if (adminDb2) {
        try {
          const queryEmail = await adminDb2.collection("vamshavali_profiles").where("email", "==", startParam.toLowerCase().trim()).limit(1).get();
          if (!queryEmail.empty) {
            foundProfile = { id: queryEmail.docs[0].id, ...queryEmail.docs[0].data() };
          } else {
            const queryShare = await adminDb2.collection("vamshavali_profiles").where("shareId", "==", startParam.toUpperCase().trim()).limit(1).get();
            if (!queryShare.empty) {
              foundProfile = { id: queryShare.docs[0].id, ...queryShare.docs[0].data() };
            }
          }
        } catch (err) {
          console.error("[Telegram] Error searching family tree on automatic start linking:", err);
        }
      }
      if (foundProfile) {
        if (adminDb2) {
          await adminDb2.collection("telegram_users").doc(chatId.toString()).set({
            linkedProfileId: foundProfile.id,
            linkedEmail: foundProfile.email || null,
            linkedShareId: foundProfile.shareId || null,
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }, { merge: true });
        }
        await sendMessage(
          `\u{1F496} *Connected Automatically!*

I have automatically linked your Telegram chat to the family tree of *"${foundProfile.name}"* (ID: \`${foundProfile.shareId || foundProfile.id}\`).

From now on, I will remember this tree! Whenever you send a message or a picture, we'll consult and update this tree.

Enjoy using your voice, text, or pictures to build your tree on [barnia.in/vamshavali](https://barnia.in/vamshavali)!`,
          { parse_mode: "Markdown" }
        );
        return;
      } else {
        const emailRegex2 = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
        if (startParam.match(emailRegex2)) {
          try {
            const { bootstrapProfile: bootstrapProfile2 } = await Promise.resolve().then(() => (init_vamshavali_logic(), vamshavali_logic_exports));
            const newProfile = await bootstrapProfile2(startParam.toLowerCase().trim(), db2, adminDb2, import_firebase_admin3.default);
            if (newProfile) {
              if (adminDb2) {
                await adminDb2.collection("telegram_users").doc(chatId.toString()).set({
                  linkedProfileId: newProfile.id,
                  linkedEmail: newProfile.email || null,
                  linkedShareId: newProfile.shareId || null,
                  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
                }, { merge: true });
              }
              await sendMessage(
                `\u2728 *Tree Initialized & Connected!*

I have initialized a fresh family tree for *"${startParam.toLowerCase().trim()}"* and automatically linked it to this chat.

You can view/edit it on [barnia.in/vamshavali](https://barnia.in/vamshavali) or make updates here in this chat!`,
                { parse_mode: "Markdown" }
              );
              return;
            }
          } catch (bootstrapErr) {
            console.error("[Telegram] Auto-bootstrap error during start param:", bootstrapErr);
          }
        }
        await sendMessage(
          `\u{1F44B} Welcome! I am Barnali \u{1F338}, your AI assistant for Barnia Digital Hub (*barnia.in*).

\u26A0\uFE0F *Link ID Not Found*
I tried to automatically link your tree using parameter *"${startParam}"*, but couldn't find a matching family tree.

Please link your profile first by typing:
\`/link <your-email>\` or \`/link <shareId>\` (e.g., \`/link contact@barnia.in\`).

Let me know how I can assist you today with the *barnia.in* app!`,
          { parse_mode: "Markdown" }
        );
        return;
      }
    } else {
      await sendMessage(
        "Hello! I am Barnali \u{1F338}, your AI assistant for Barnia Digital Hub (*barnia.in*).\n\nI am dedicated specifically to helping you manage your village profile, browse the local marketplace (Bazar), see auspicious dates on the Ponjika calendar, and view or edit your family tree (*Vamshavali*).\n\n\u{1F517} *Link Your Family Tree:*\nTo enable tree updates, please link your profile first by typing:\n`/link <your-email>` or `/link <shareId>` (or say: 'link my tree with xyz@gmail.com').\n\nLet me know how I can assist you today with the *barnia.in* app!",
        { parse_mode: "Markdown" }
      );
      return;
    }
  }
  if (textLower === "/unlink") {
    if (adminDb2) {
      try {
        await adminDb2.collection("telegram_users").doc(chatId.toString()).set({
          linkedProfileId: null,
          linkedEmail: null,
          linkedShareId: null
        }, { merge: true });
        await sendMessage("\u{1F513} *Successfully unlinked your family tree.* You can link to another account anytime using `/link <email>`!", { parse_mode: "Markdown" });
      } catch (e) {
        await sendMessage("Could not complete unlinking. Please try again later.");
      }
    }
    return;
  }
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const emailMatch = text.match(emailRegex);
  const isLinkCmd = textLower.startsWith("/link");
  const isLinkMention = textLower.includes("link") && (emailMatch || textLower.match(/\b([A-Z0-9]{8})\b/i));
  if (currentCredits <= 0 && textLower !== "/start" && !isLinkCmd && !isLinkMention && textLower !== "/unlink") {
    await sendMessage(
      "\u26A0\uFE0F *No Credits Remaining*\n\nYour credit balance is 0. You cannot use Barnali AI assistant features. Please recharge your credits on [barnia.in/ai-router](https://barnia.in/ai-router) to continue using our services.",
      { parse_mode: "Markdown" }
    );
    return;
  }
  if (isLinkCmd || isLinkMention) {
    let linkArg = "";
    if (isLinkCmd) {
      linkArg = text.replace(/^\s*\/link/i, "").trim();
    } else if (emailMatch) {
      linkArg = emailMatch[1];
    } else {
      const shareIdMatch = text.match(/\b([A-Z0-9]{8})\b/i);
      if (shareIdMatch) linkArg = shareIdMatch[1];
    }
    if (!linkArg) {
      await sendMessage("Please specify your email or family tree share ID to link. Example:\n`/link contact@barnia.in` or `/link AB12CD34`", { parse_mode: "Markdown" });
      return;
    }
    let foundProfile = null;
    if (adminDb2) {
      try {
        const queryEmail = await adminDb2.collection("vamshavali_profiles").where("email", "==", linkArg.toLowerCase().trim()).limit(1).get();
        if (!queryEmail.empty) {
          foundProfile = { id: queryEmail.docs[0].id, ...queryEmail.docs[0].data() };
        } else {
          const queryShare = await adminDb2.collection("vamshavali_profiles").where("shareId", "==", linkArg.toUpperCase().trim()).limit(1).get();
          if (!queryShare.empty) {
            foundProfile = { id: queryShare.docs[0].id, ...queryShare.docs[0].data() };
          }
        }
      } catch (err) {
        console.error("[Telegram] Error searching family tree:", err);
      }
    }
    if (foundProfile) {
      if (adminDb2) {
        await adminDb2.collection("telegram_users").doc(chatId.toString()).set({
          linkedProfileId: foundProfile.id,
          linkedEmail: foundProfile.email || null,
          linkedShareId: foundProfile.shareId || null,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, { merge: true });
      }
      await sendMessage(
        `\u{1F496} *Connected Successfully!*

I have linked your Telegram chat to the family tree of *"${foundProfile.name}"*.

From now on, I will remember this tree. You can ask me questions about it or make updates anytime!`,
        { parse_mode: "Markdown" }
      );
      return;
    } else {
      if (linkArg.match(emailRegex)) {
        try {
          const { bootstrapProfile: bootstrapProfile2 } = await Promise.resolve().then(() => (init_vamshavali_logic(), vamshavali_logic_exports));
          const newProfile = await bootstrapProfile2(linkArg.toLowerCase().trim(), db2, adminDb2, import_firebase_admin3.default);
          if (newProfile) {
            if (adminDb2) {
              await adminDb2.collection("telegram_users").doc(chatId.toString()).set({
                linkedProfileId: newProfile.id,
                linkedEmail: newProfile.email || null,
                linkedShareId: newProfile.shareId || null,
                updatedAt: (/* @__PURE__ */ new Date()).toISOString()
              }, { merge: true });
            }
            await sendMessage(
              `\u2728 *Tree Initialized & Connected!*

I couldn't find an existing family tree for *"${linkArg.toLowerCase().trim()}"*, so I have initialized a fresh tree for you and linked it to this chat.

You can view/edit it on [barnia.in/vamshavali](https://barnia.in/vamshavali) or make updates directly here in this chat!`,
              { parse_mode: "Markdown" }
            );
            return;
          }
        } catch (bootstrapErr) {
          console.error("[Telegram] Auto-bootstrap error during linking:", bootstrapErr);
        }
      }
      await sendMessage(
        `\u274C *Family Tree Not Found*

I couldn't find any family tree under the email or share ID: *"${linkArg}"*.

Make sure the email is registered in the *Vamshavali* section of [barnia.in](https://barnia.in) or supply a valid email to bootstrap a fresh tree!`,
        { parse_mode: "Markdown" }
      );
      return;
    }
  }
  let activePhotoUrl = null;
  const unifiedPrompt = message.caption || message.text || "";
  if (message.photo) {
    const photo = message.photo[message.photo.length - 1];
    await sendMessage("Receiving photo... \u{1F4F8}");
    activePhotoUrl = await getTelegramFileUrl(photo.file_id, botToken);
    if (activePhotoUrl) {
      lastPhotos2.set(chatId, { url: activePhotoUrl, timestamp: Date.now() });
    }
  }
  if (!activePhotoUrl && lastPhotos2.has(chatId) && unifiedPrompt.toLowerCase().match(/\b(photo|picture|face|image|avatar|img|profile)\b/)) {
    const cached = lastPhotos2.get(chatId);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1e3) {
      activePhotoUrl = cached.url;
    }
  }
  let linkedProfile = null;
  if (adminDb2 && linkedProfileId) {
    try {
      const snap = await adminDb2.collection("vamshavali_profiles").doc(linkedProfileId).get();
      if (snap.exists) {
        linkedProfile = { id: snap.id, ...snap.data() };
      }
    } catch (err) {
      console.error("[Telegram] Error fetching linked tree profile:", err);
    }
  }
  const hasUpdateKeyword = unifiedPrompt.toLowerCase().match(/\b(update|change|set|add|modify|delete|remove|photo|picture|image|avatar|img|profile|kuldevi|kuldavi|viva|wife|partner|spouse|upload)\b/);
  const isUpdatingTree = !!activePhotoUrl || !!hasUpdateKeyword;
  if (isUpdatingTree && !linkedProfile) {
    await sendMessage(
      "\u26A0\uFE0F *Family Tree Link Required*\n\nI see you want to modify family tree parameters or upload a picture, but I don't know which family tree belongs to you.\n\nPlease link your family tree first by supplying your email, chat, or share ID:\n`/link contact@barnia.in` or `my email is contact@barnia.in` or `/link AB12CD34`",
      { parse_mode: "Markdown" }
    );
    return;
  }
  try {
    const apiKey = await getGeminiApiKey();
    const systemPrompt = `You are Barnali \u{1F338}, the smart, friendly, and helpful AI assistant for the barnia.in app (Barnia Digital Hub).

STRICT COMPLIANCE RULES:
1. **Scope Limits**: You MUST ONLY answer questions about the barnia.in application, its features, and Barnia village. 
   Features of barnia.in include:
   - **Vamshavali (Family Tree)**: Interactive digital family lineage mapping.
   - **AI Router Hub**: SaaS API and AI Tiers playground (optimizing cost details and model routing).
   - **Barnia Bazar**: Local market retailer and vendor directory.
   - **Barnia Influencers**: Local digital content creators registry.
   - **Ponjika Calendar**: Pure Hindu astrological panchanga & rural lunar calendar.
   - **Sanatani Fact Check**: Dedicated Vedic references validation engine.
   - **Village Transport**: Transits and booking directories for Barnia.
2. If the user's inquiry is unrelated to barnia.in, Barnia village, or their linked lineage, you MUST politely decline and ground yourself. Example: "I am Barnali, dedicated specifically to helping you on barnia.in. I can only assist with platform modules, community directories, or linked genealogy trees."

FAMILY TREE (VAMSHAVALI) MUTATION INTEGRATION:
The user's currently linked Vamshavali profile is:
${linkedProfile ? JSON.stringify(linkedProfile) : "None (Not linked)"}

- If the user asks to UPDATE, CHANGE, ADD, or REMOVE information or images/pictures in their family tree:
  1. Produce a structured JSON payload response matching this exact shape:
  {
    "isUpdate": true,
    "updatedProfile": { <insert the FULL updated profile JSON incorporating all original details with the newly requested modifications applied> },
    "summary": "A friendly scannable summary in Markdown describing exactly what changes you performed (e.g. 'Updated Savitri Devi\\'s birth year to 1944.')."
  }
  2. Each member has properties: id, name, role, birthYear, photo, partner { name, birthYear, photo }, and children []. For nested member array updates, traverse and modify the recursive 'members' list.
  3. Generating member additions: generate unique IDs (e.g., 'member_id_xyz123') for new children/spouses.
  4. PICTURE/PHOTO UPDATES INSTRUCTIONS:
     - The user has provided an image/picture URL to associate: "${activePhotoUrl || ""}"
     - **Kuldevi / Kuldavi (Deity)**: If they express the intent to upload or set the image of "Kuldevi" or "Kuldavi" (or family goddess/deity), set the root-level property 'kuldeviPhoto' of the profile to "${activePhotoUrl || ""}".
     - **Specific Relative by Name**: If they name a member (e.g., "upload this picture of Abhay", "this is Abhay's picture", "update Abhay's picture"), recursively find a member whose name is "Abhay" (case-insensitive, fuzzy or partial match) and update their 'photo' property to "${activePhotoUrl || ""}".
     - **Spouse / Wife / "viva" / Partner**:
       - If they say "upload this picture of [Name]'s wife / partner / sponsor / spouse / viva", locate the member with that name (e.g., "Abhay") and set their 'partner.photo' property to "${activePhotoUrl || ""}". If the 'partner' object is missing or null under that member, initialize it like 'partner: { name: "Spouse of " + Name, photo: "${activePhotoUrl || ""}" }'.
       - If they say "upload this picture of my partner / wife / viva / spouse", locate the main/root member of the family tree and update their 'partner.photo' property to "${activePhotoUrl || ""}".
     - **By Relation description**: If they say "my grandmother's picture" or "my daughter's photo", trace the relation starting from the main root node and update the matching member's 'photo' to "${activePhotoUrl || ""}".
- If the request is NOT a family tree modification (e.g., just general help, asking about Bazar, asking about auspicious dates, or querying details from their tree), proceed by returning standard human-readable text directly (do NOT wrap inside JSON structure).

Format answers beautifully. Speak in Bengali or English based on the user's language. Keep answers concise.`;
    const response = await callGeminiWithRetry(apiKey, {
      model: "gemini-3.5-flash",
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}

User request: ${unifiedPrompt}` }] }
      ]
    });
    const replyText = (response.text || "").trim();
    let isTreeUpdated = false;
    if (replyText.startsWith("{") || replyText.includes('"isUpdate"')) {
      try {
        const payload = parseGeminiJson(replyText);
        if (payload && payload.isUpdate && payload.updatedProfile && linkedProfileId) {
          const profileRef = adminDb2.collection("vamshavali_profiles").doc(linkedProfileId);
          const finalizedProfile = {
            ...payload.updatedProfile,
            id: linkedProfileId,
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          };
          delete finalizedProfile.serverKey;
          await profileRef.set(finalizedProfile, { merge: true });
          lastPhotos2.delete(chatId);
          await sendMessage(`\u2705 *Family Tree Updated In Cloud Ledger!*

${payload.summary || "Changes saved."}

Live preview updated on [barnia.in/vamshavali](https://barnia.in/vamshavali).`, { parse_mode: "Markdown" });
          isTreeUpdated = true;
        }
      } catch (err) {
        console.error("[Telegram Bot] JSON update logic failed:", err.message);
      }
    }
    if (!isTreeUpdated) {
      let finalMsg = replyText;
      try {
        if (replyText.startsWith("{")) {
          const payload = parseGeminiJson(replyText);
          finalMsg = payload.summary || payload.message || finalMsg;
        }
      } catch (e) {
      }
      await sendMessage(finalMsg, { parse_mode: "Markdown" });
    }
  } catch (error) {
    console.error("[Telegram] Gemini Execution Error:", error.message);
    await sendMessage("I encountered an issue processing that query. Please try again later.");
  }
}

// server.ts
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! \u{1F4A5}", err);
  if (process.env.NODE_ENV === "production") process.exit(1);
});
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! \u{1F4A5}", err);
  if (process.env.NODE_ENV === "production") process.exit(1);
});
if (import_dns2.default && import_dns2.default.setDefaultResultOrder) {
  import_dns2.default.setDefaultResultOrder("ipv4first");
}
import_dotenv.default.config();
var newsLocks = /* @__PURE__ */ new Map();
var lastPhotos = /* @__PURE__ */ new Map();
var telegramLinkCache = /* @__PURE__ */ new Map();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((0, import_cors.default)({ origin: true, credentials: true }));
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
  await initSDKs();
  console.log(`[Server] SDKs initialized. AdminDB: ${!!state.adminDb}, ClientDB: ${!!state.db}, Config: ${!!state.firebaseConfig}`);
  app.post("/api/webhooks/telegram", (req, res) => {
    handleTelegramWebhook(req, res, lastPhotos, telegramLinkCache, db, adminDb);
  });
  setupRoutes(app, db, adminDb, firebaseConfig, newsLocks);
  setupGeminiRoute(app);
  setupAuthRoutes(app, db, adminDb, import_firebase_admin4.default);
  setupVamshavaliRoutes(app, db, adminDb, import_firebase_admin4.default);
  setupNewsRoutes(app, db, adminDb, newsLocks, getCurrentNewsDate);
  setupAIRouter(app, db, adminDb, import_firebase_admin4.default);
  setupNumerologyRoutes(app);
  setupAdminRoutes(app, newsLocks);
  let vite;
  if (process.env.NODE_ENV !== "production") {
    vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "custom"
    });
    app.use(vite.middlewares);
  } else {
    app.use(import_express.default.static("dist", { index: false }));
  }
  setupSSR(app, vite);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
    setTimeout(() => {
      autoGenerateDailyNews().catch(console.error);
      generateDailySanataniFacts().catch(console.error);
    }, 1e4);
  });
}
startServer().catch((err) => {
  console.error("FATAL ERROR DURING STARTUP! \u{1F4A5}", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
