import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { appConfig } from "./lineage-config.js";
import { db } from "./lineage-db.js";

const genders = ["male", "female", "other", "unknown"] as const;
const lifeStatuses = ["living", "deceased", "unknown"] as const;
const maritalStatuses = ["unmarried", "married", "widowed", "divorced", "separated", "unknown"] as const;
const membershipRoles = ["owner", "admin", "contributor", "viewer"] as const;

export const lineagePersonInputSchema = z.object({
  id: z.string().optional(),
  treeId: z.string().optional(),
  displayName: z.string().min(1),
  gender: z.enum(genders).default("unknown"),
  lifeStatus: z.enum(lifeStatuses).default("unknown"),
  maritalStatus: z.enum(maritalStatuses).default("unknown"),
  dateOfBirth: z.string().optional().nullable(),
  dateOfDeath: z.string().optional().nullable(),
  deathAnniversary: z.string().optional().nullable(),
  rashi: z.string().optional().nullable(),
  gotra: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  fatherId: z.string().optional().nullable(),
  motherId: z.string().optional().nullable()
});

export const lineageTreeInputSchema = z.object({
  name: z.string().min(1).optional(),
  accountHolderName: z.string().optional().nullable(),
  gotra: z.string().optional().nullable(),
  pravara: z.string().optional().nullable(),
  kuladevi: z.string().optional().nullable(),
  kuladevata: z.string().optional().nullable(),
  kulapurohit: z.string().optional().nullable(),
  gramadevata: z.string().optional().nullable(),
  nativeVillage: z.string().optional().nullable(),
  familySurname: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const lineageTreeCreateSchema = lineageTreeInputSchema.extend({
  name: z.string().min(1),
  seedAccountHolder: z.boolean().optional()
});

export const inviteCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "contributor", "viewer"]).default("viewer")
});

export type LineagePersonInput = z.infer<typeof lineagePersonInputSchema>;
export type MembershipRole = (typeof membershipRoles)[number];

type TreeRow = {
  id: string;
  name: string;
  account_holder_name: string | null;
  gotra: string | null;
  pravara: string | null;
  kuladevi: string | null;
  kuladevata: string | null;
  kulapurohit: string | null;
  gramadevata: string | null;
  native_village: string | null;
  family_surname: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PersonRow = {
  id: string;
  tree_id: string;
  display_name: string;
  gender: (typeof genders)[number];
  life_status: (typeof lifeStatuses)[number];
  marital_status: (typeof maritalStatuses)[number];
  date_of_birth: string | null;
  date_of_death: string | null;
  death_anniversary: string | null;
  rashi: string | null;
  gotra: string | null;
  photo_url: string | null;
  notes: string | null;
  father_id: string | null;
  mother_id: string | null;
  created_at: string;
  updated_at: string;
};

type SpouseRow = {
  id: string;
  tree_id: string;
  person_a_id: string;
  person_b_id: string;
  status: string;
  marriage_date: string | null;
  notes: string | null;
};

type ProposalRow = {
  id: string;
  tree_id: string;
  source_type: "telegram_text" | "telegram_voice" | "csv";
  raw_text: string;
  proposal_json: string;
  status: "pending" | "committed" | "dismissed";
  created_at: string;
};

type AccessMemberRow = {
  account_id: string;
  email: string;
  display_name: string;
  role: MembershipRole;
  created_at: string;
};

type InvitationRow = {
  id: string;
  tree_id: string;
  invited_email: string;
  role: Exclude<MembershipRole, "owner">;
  invited_by_account_id: string;
  token_hash: string;
  status: "pending" | "accepted" | "revoked";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

function now() {
  return new Date().toISOString();
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function nullable(value: unknown) {
  const text = cleanText(value);
  return text ? text : null;
}

function normalizeGender(value: unknown): (typeof genders)[number] {
  const text = cleanText(value).toLowerCase();
  if (["m", "male", "man", "father", "son", "husband"].includes(text)) return "male";
  if (["f", "female", "woman", "mother", "daughter", "wife"].includes(text)) return "female";
  if (text === "other") return "other";
  return "unknown";
}

function normalizeLifeStatus(value: unknown): (typeof lifeStatuses)[number] {
  const text = cleanText(value).toLowerCase();
  if (["living", "alive", "yes", "true", "y"].includes(text)) return "living";
  if (["deceased", "dead", "expired", "passed", "no", "false", "n"].includes(text)) return "deceased";
  return "unknown";
}

function normalizeMaritalStatus(value: unknown): (typeof maritalStatuses)[number] {
  const text = cleanText(value).toLowerCase();
  if (maritalStatuses.includes(text as (typeof maritalStatuses)[number])) return text as (typeof maritalStatuses)[number];
  if (["single", "unmarried"].includes(text)) return "unmarried";
  return "unknown";
}

function mapTree(row: TreeRow) {
  return {
    id: row.id,
    name: row.name,
    accountHolderName: row.account_holder_name,
    gotra: row.gotra,
    pravara: row.pravara,
    kuladevi: row.kuladevi,
    kuladevata: row.kuladevata,
    kulapurohit: row.kulapurohit,
    gramadevata: row.gramadevata,
    nativeVillage: row.native_village,
    familySurname: row.family_surname,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPerson(row: PersonRow) {
  return {
    id: row.id,
    treeId: row.tree_id,
    displayName: row.display_name,
    gender: row.gender,
    lifeStatus: row.life_status,
    maritalStatus: row.marital_status,
    dateOfBirth: row.date_of_birth,
    dateOfDeath: row.date_of_death,
    deathAnniversary: row.death_anniversary,
    rashi: row.rashi,
    gotra: row.gotra,
    photoUrl: row.photo_url,
    notes: row.notes,
    fatherId: row.father_id,
    motherId: row.mother_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSpouse(row: SpouseRow) {
  return {
    id: row.id,
    treeId: row.tree_id,
    personAId: row.person_a_id,
    personBId: row.person_b_id,
    status: row.status,
    marriageDate: row.marriage_date,
    notes: row.notes
  };
}

function mapProposal(row: ProposalRow) {
  return {
    id: row.id,
    treeId: row.tree_id,
    sourceType: row.source_type,
    rawText: row.raw_text,
    proposal: JSON.parse(row.proposal_json) as unknown,
    status: row.status,
    createdAt: row.created_at
  };
}

db.exec(`
  CREATE TABLE IF NOT EXISTS lineage_trees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    account_holder_name TEXT,
    gotra TEXT,
    pravara TEXT,
    kuladevi TEXT,
    kuladevata TEXT,
    kulapurohit TEXT,
    gramadevata TEXT,
    native_village TEXT,
    family_surname TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lineage_people (
    id TEXT PRIMARY KEY,
    tree_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    gender TEXT NOT NULL,
    life_status TEXT NOT NULL,
    marital_status TEXT NOT NULL,
    date_of_birth TEXT,
    date_of_death TEXT,
    death_anniversary TEXT,
    rashi TEXT,
    gotra TEXT,
    photo_url TEXT,
    notes TEXT,
    father_id TEXT,
    mother_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(tree_id) REFERENCES lineage_trees(id)
  );

  CREATE TABLE IF NOT EXISTS lineage_spouses (
    id TEXT PRIMARY KEY,
    tree_id TEXT NOT NULL,
    person_a_id TEXT NOT NULL,
    person_b_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'married',
    marriage_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(tree_id, person_a_id, person_b_id)
  );

  CREATE TABLE IF NOT EXISTS lineage_import_proposals (
    id TEXT PRIMARY KEY,
    tree_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    proposal_json TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS account_tree_memberships (
    account_id TEXT NOT NULL,
    tree_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner',
    created_at TEXT NOT NULL,
    PRIMARY KEY(account_id, tree_id),
    FOREIGN KEY(tree_id) REFERENCES lineage_trees(id)
  );

  CREATE TABLE IF NOT EXISTS tree_invitations (
    id TEXT PRIMARY KEY,
    tree_id TEXT NOT NULL,
    invited_email TEXT NOT NULL,
    role TEXT NOT NULL,
    invited_by_account_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    accepted_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(tree_id) REFERENCES lineage_trees(id)
  );
`);

function defaultTreeId() {
  const existing = db.prepare("SELECT id FROM lineage_trees ORDER BY created_at LIMIT 1").get() as { id: string } | undefined;
  if (existing) return existing.id;

  const timestamp = now();
  const treeId = randomUUID();
  db.prepare(
    `INSERT INTO lineage_trees (
      id, name, account_holder_name, gotra, kuladevi, kuladevata, kulapurohit,
      gramadevata, native_village, family_surname, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    treeId,
    "Sharma Family Lineage",
    "Aarav Sharma",
    "Bharadwaj",
    "Mahalakshmi",
    "Mahadev",
    "Pandit Narayan Joshi",
    "Hanuman Mandir Devata",
    "Kolhapur",
    "Sharma",
    "Demo tree with traditional family metadata. Replace this with your verified family record.",
    timestamp,
    timestamp
  );

  const seedPeople: LineagePersonInput[] = [
    { id: "demo-great-grandfather", displayName: "Vishwanath Sharma", gender: "male", lifeStatus: "deceased", maritalStatus: "married", rashi: "Mesha", gotra: "Bharadwaj", deathAnniversary: "Shraddha Paksha", notes: "Great grandfather" },
    { id: "demo-great-grandmother", displayName: "Savitri Devi", gender: "female", lifeStatus: "deceased", maritalStatus: "married", rashi: "Vrishabha", notes: "Great grandmother" },
    { id: "demo-grandfather", displayName: "Mohan Sharma", gender: "male", lifeStatus: "deceased", maritalStatus: "married", fatherId: "demo-great-grandfather", motherId: "demo-great-grandmother", dateOfBirth: "1938-04-12", dateOfDeath: "2018-09-17" },
    { id: "demo-grandmother", displayName: "Kamala Sharma", gender: "female", lifeStatus: "living", maritalStatus: "married", dateOfBirth: "1944-11-03" },
    { id: "demo-father", displayName: "Rajesh Sharma", gender: "male", lifeStatus: "living", maritalStatus: "married", fatherId: "demo-grandfather", motherId: "demo-grandmother", dateOfBirth: "1968-02-21", rashi: "Karka" },
    { id: "demo-mother", displayName: "Anita Sharma", gender: "female", lifeStatus: "living", maritalStatus: "married", dateOfBirth: "1972-08-14", rashi: "Kanya" },
    { id: "demo-holder", displayName: "Aarav Sharma", gender: "male", lifeStatus: "living", maritalStatus: "married", fatherId: "demo-father", motherId: "demo-mother", dateOfBirth: "1995-05-05", rashi: "Simha" },
    { id: "demo-spouse", displayName: "Meera Sharma", gender: "female", lifeStatus: "living", maritalStatus: "married", dateOfBirth: "1997-01-10" },
    { id: "demo-child", displayName: "Isha Sharma", gender: "female", lifeStatus: "living", maritalStatus: "unmarried", fatherId: "demo-holder", motherId: "demo-spouse", dateOfBirth: "2022-03-18" }
  ];
  for (const person of seedPeople) {
    const { fatherId: _fatherId, motherId: _motherId, ...personWithoutParents } = person;
    lineageStore.createPerson({ ...personWithoutParents, treeId });
  }
  lineageStore.linkSpouses(treeId, "demo-great-grandfather", "demo-great-grandmother");
  lineageStore.linkSpouses(treeId, "demo-grandfather", "demo-grandmother");
  lineageStore.linkSpouses(treeId, "demo-father", "demo-mother");
  lineageStore.linkSpouses(treeId, "demo-holder", "demo-spouse");
  for (const person of seedPeople) {
    if (person.id && (person.fatherId || person.motherId)) {
      lineageStore.updatePerson(person.id, { fatherId: person.fatherId ?? null, motherId: person.motherId ?? null });
    }
  }
  return treeId;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(csv: string) {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function csvRowsToProposal(treeId: string, csv: string) {
  const rows = parseCsv(csv);
  const warnings: string[] = [];
  const people = rows.map((row, index) => {
    const rowId = cleanText(row.id || row.person_id) || `csv-${index + 1}`;
    const displayName = cleanText(row.name || row.display_name || row.person_name);
    if (!displayName) warnings.push(`Row ${index + 2} has no name and will be ignored.`);
    return {
      clientKey: rowId,
      displayName,
      gender: normalizeGender(row.gender),
      lifeStatus: normalizeLifeStatus(row.life_status || row.living || row.is_living),
      maritalStatus: normalizeMaritalStatus(row.marital_status),
      dateOfBirth: nullable(row.dob || row.date_of_birth),
      dateOfDeath: nullable(row.dod || row.date_of_death),
      deathAnniversary: nullable(row.death_anniversary || row.tithi),
      rashi: nullable(row.rashi),
      gotra: nullable(row.gotra),
      photoUrl: nullable(row.photo_url || row.photo),
      notes: nullable(row.notes),
      fatherKey: nullable(row.father_id || row.father),
      motherKey: nullable(row.mother_id || row.mother),
      spouseKeys: cleanText(row.spouse_ids || row.spouse_id || row.spouse)
        .split(/[;|]/)
        .map((item) => item.trim())
        .filter(Boolean)
    };
  }).filter((person) => person.displayName);
  return { treeId, people, warnings, source: "csv" };
}

function inferNames(rawText: string) {
  const names = new Set<string>();
  const patterns = [
    /(?:my name is|i am|account holder is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/gi,
    /(?:my father is|father is|father's name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/gi,
    /(?:my mother is|mother is|mother's name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/gi,
    /(?:grandfather is|grandfather was|dada was|nana was)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/gi,
    /(?:grandmother is|grandmother was|dadi was|nani was)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/gi,
    /(?:wife is|husband is|spouse is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/gi,
    /(?:son is|daughter is|child is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/gi
  ];
  for (const pattern of patterns) {
    for (const match of rawText.matchAll(pattern)) names.add(match[1].trim());
  }
  return [...names];
}

function textToProposal(treeId: string, rawText: string) {
  const get = (pattern: RegExp) => rawText.match(pattern)?.[1]?.trim() ?? "";
  const holder = get(/(?:my name is|i am|account holder is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i) || "Account Holder";
  const father = get(/(?:my father is|father is|father's name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i);
  const mother = get(/(?:my mother is|mother is|mother's name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i);
  const grandfather = get(/(?:grandfather is|grandfather was|dada was|nana was)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i);
  const grandmother = get(/(?:grandmother is|grandmother was|dadi was|nani was)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i);
  const spouse = get(/(?:wife is|husband is|spouse is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i);
  const gotra = get(/gotra(?: is)?\s+([A-Za-z ]{2,40})/i);
  const kuladevi = get(/kuladevi(?: is)?\s+([A-Za-z ]{2,40})/i);
  const kuladevata = get(/kuladevata(?: is)?\s+([A-Za-z ]{2,40})/i);
  const gramadevata = get(/gramadevata(?: is)?\s+([A-Za-z ]{2,40})/i);
  const rashi = get(/rashi(?: is)?\s+([A-Za-z ]{2,24})/i);
  const people = [
    { clientKey: "holder", displayName: holder, gender: "unknown", lifeStatus: "living", maritalStatus: spouse ? "married" : "unknown", fatherKey: father ? "father" : null, motherKey: mother ? "mother" : null, rashi: rashi || null, gotra: gotra || null, spouseKeys: spouse ? ["spouse"] : [] },
    father && { clientKey: "father", displayName: father, gender: "male", lifeStatus: "unknown", maritalStatus: mother ? "married" : "unknown", fatherKey: grandfather ? "grandfather" : null, motherKey: grandmother ? "grandmother" : null, spouseKeys: mother ? ["mother"] : [] },
    mother && { clientKey: "mother", displayName: mother, gender: "female", lifeStatus: "unknown", maritalStatus: father ? "married" : "unknown", spouseKeys: father ? ["father"] : [] },
    grandfather && { clientKey: "grandfather", displayName: grandfather, gender: "male", lifeStatus: "unknown", maritalStatus: grandmother ? "married" : "unknown", spouseKeys: grandmother ? ["grandmother"] : [] },
    grandmother && { clientKey: "grandmother", displayName: grandmother, gender: "female", lifeStatus: "unknown", maritalStatus: grandfather ? "married" : "unknown", spouseKeys: grandfather ? ["grandfather"] : [] },
    spouse && { clientKey: "spouse", displayName: spouse, gender: "unknown", lifeStatus: "living", maritalStatus: "married", spouseKeys: ["holder"] }
  ].filter(Boolean);
  const mentioned = inferNames(rawText);
  const warnings = mentioned.length <= people.length
    ? ["Review this extraction before committing. Natural language lineage can be ambiguous."]
    : ["Some names were found but not linked. Add relationship words like father, mother, wife, grandfather, or child for better extraction."];
  return {
    treeId,
    people,
    familyMetadata: { gotra: gotra || null, kuladevi: kuladevi || null, kuladevata: kuladevata || null, gramadevata: gramadevata || null },
    warnings,
    source: "telegram"
  };
}

function commitProposal(proposal: any) {
  const keyToId = new Map<string, string>();
  const people = Array.isArray(proposal.people) ? proposal.people : [];
  for (const item of people) {
    const person = lineageStore.createPerson({
      treeId: proposal.treeId,
      displayName: item.displayName,
      gender: item.gender,
      lifeStatus: item.lifeStatus,
      maritalStatus: item.maritalStatus,
      dateOfBirth: item.dateOfBirth,
      dateOfDeath: item.dateOfDeath,
      deathAnniversary: item.deathAnniversary,
      rashi: item.rashi,
      gotra: item.gotra,
      photoUrl: item.photoUrl,
      notes: item.notes
    });
    keyToId.set(item.clientKey, person!.id);
  }
  for (const item of people) {
    const id = keyToId.get(item.clientKey);
    if (!id) continue;
    for (const spouseKey of item.spouseKeys ?? []) {
      const spouseId = keyToId.get(spouseKey) ?? spouseKey;
      if (spouseId && spouseId !== id) lineageStore.linkSpouses(proposal.treeId, id, spouseId);
    }
  }
  for (const item of people) {
    const id = keyToId.get(item.clientKey);
    if (!id) continue;
    const fatherId = item.fatherKey ? keyToId.get(item.fatherKey) ?? item.fatherKey : null;
    const motherId = item.motherKey ? keyToId.get(item.motherKey) ?? item.motherKey : null;
    lineageStore.updatePerson(id, { fatherId, motherId });
  }
  if (proposal.familyMetadata) lineageStore.updateTree(proposal.treeId, proposal.familyMetadata);
}

function personExistsInTree(treeId: string, personId: string | null | undefined) {
  if (!personId) return true;
  const row = db.prepare("SELECT id FROM lineage_people WHERE id = ? AND tree_id = ?").get(personId, treeId);
  return Boolean(row);
}

function personRowInTree(treeId: string, personId: string | null | undefined) {
  if (!personId) return null;
  return db.prepare("SELECT * FROM lineage_people WHERE id = ? AND tree_id = ?").get(personId, treeId) as PersonRow | undefined ?? null;
}

function spouseIdsFor(treeId: string, personId: string) {
  const rows = db
    .prepare("SELECT person_a_id, person_b_id FROM lineage_spouses WHERE tree_id = ? AND (person_a_id = ? OR person_b_id = ?)")
    .all(treeId, personId, personId) as Array<{ person_a_id: string; person_b_id: string }>;
  return rows.map((row) => (row.person_a_id === personId ? row.person_b_id : row.person_a_id));
}

function validationError(message: string): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = 400;
  return error;
}

function resolveParentage(input: {
  treeId: string;
  selfId?: string;
  fatherId?: string | null;
  motherId?: string | null;
}) {
  const fatherId = input.fatherId || null;
  let motherId = input.motherId || null;

  if (input.selfId && (fatherId === input.selfId || motherId === input.selfId)) {
    throw validationError("A person cannot be their own parent.");
  }
  if (fatherId && motherId && fatherId === motherId) {
    throw validationError("Father and mother must be different people.");
  }
  if (!personExistsInTree(input.treeId, fatherId)) {
    throw validationError("Selected father does not belong to this lineage.");
  }
  if (!personExistsInTree(input.treeId, motherId)) {
    throw validationError("Selected mother does not belong to this lineage.");
  }

  if (fatherId) {
    const father = personRowInTree(input.treeId, fatherId);
    const fatherGender = (father?.gender ?? "").toLowerCase().trim();
    if (fatherGender !== "male" && fatherGender !== "m") {
      throw validationError("Only male lineage members can continue the next generation in this family tree.");
    }
    const fatherSpouses = spouseIdsFor(input.treeId, fatherId);
    if (!motherId && fatherSpouses.length === 1) {
      motherId = fatherSpouses[0];
    }
    if (motherId && !fatherSpouses.includes(motherId)) {
      throw validationError("Mother must be one of the selected father's linked spouses.");
    }
  }
  if (motherId) {
    const mother = personRowInTree(input.treeId, motherId);
    const motherGender = (mother?.gender ?? "").toLowerCase().trim();
    if (motherGender !== "female" && motherGender !== "f") {
      throw validationError("Mother must be a female spouse linked to the selected father.");
    }
  }

  return { fatherId, motherId };
}

function accountTrees(accountId: string) {
  return (db.prepare(
    `SELECT t.*
     FROM lineage_trees t
     INNER JOIN account_tree_memberships m ON m.tree_id = t.id
     WHERE m.account_id = ?
     ORDER BY t.created_at`
  ).all(accountId) as TreeRow[]).map(mapTree);
}

function accountTreeCount(accountId: string) {
  const row = db.prepare("SELECT COUNT(*) AS count FROM account_tree_memberships WHERE account_id = ?").get(accountId) as { count: number };
  return row.count;
}

function canAccessTree(accountId: string, treeId: string) {
  const row = db.prepare("SELECT 1 FROM account_tree_memberships WHERE account_id = ? AND tree_id = ?").get(accountId, treeId);
  return Boolean(row);
}

function treeRole(accountId: string, treeId: string): MembershipRole | null {
  const row = db.prepare("SELECT role FROM account_tree_memberships WHERE account_id = ? AND tree_id = ?")
    .get(accountId, treeId) as { role: MembershipRole } | undefined;
  return row?.role ?? null;
}

function assertTreeAccess(accountId: string, treeId: string) {
  if (!canAccessTree(accountId, treeId)) {
    throw Object.assign(new Error("You do not have access to this family tree."), { statusCode: 403 });
  }
}

function assertTreeEditAccess(accountId: string, treeId: string) {
  const role = treeRole(accountId, treeId);
  if (!role || role === "viewer") {
    throw Object.assign(new Error("You only have read-only access to this family tree."), { statusCode: 403 });
  }
}

function assertTreeAdminAccess(accountId: string, treeId: string) {
  const role = treeRole(accountId, treeId);
  if (role !== "owner" && role !== "admin") {
    throw Object.assign(new Error("Only owners and admins can manage family tree invitations."), { statusCode: 403 });
  }
}

function personTreeId(personId: string) {
  const row = db.prepare("SELECT tree_id FROM lineage_people WHERE id = ?").get(personId) as { tree_id: string } | undefined;
  if (!row) throw Object.assign(new Error("Person not found."), { statusCode: 404 });
  return row.tree_id;
}

function proposalTreeId(proposalId: string) {
  const row = db.prepare("SELECT tree_id FROM lineage_import_proposals WHERE id = ?").get(proposalId) as { tree_id: string } | undefined;
  if (!row) throw Object.assign(new Error("Proposal not found."), { statusCode: 404 });
  return row.tree_id;
}

function mapInvitation(row: InvitationRow) {
  return {
    id: row.id,
    treeId: row.tree_id,
    email: row.invited_email,
    role: row.role,
    status: row.status,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at
  };
}

export const lineageStore = {
  state(treeId = defaultTreeId()) {
    const trees = (db.prepare("SELECT * FROM lineage_trees ORDER BY created_at").all() as TreeRow[]).map(mapTree);
    const people = (db.prepare("SELECT * FROM lineage_people WHERE tree_id = ? ORDER BY created_at").all(treeId) as PersonRow[]).map(mapPerson);
    const spouses = (db.prepare("SELECT * FROM lineage_spouses WHERE tree_id = ? ORDER BY created_at").all(treeId) as SpouseRow[]).map(mapSpouse);
    const proposals = (db.prepare("SELECT * FROM lineage_import_proposals WHERE tree_id = ? ORDER BY created_at DESC LIMIT 8").all(treeId) as ProposalRow[]).map(mapProposal);
    return { trees, activeTreeId: treeId, people, spouses, proposals };
  },

  stateForAccount(accountId: string, requestedTreeId?: string | null) {
    const trees = accountTrees(accountId);
    const activeTreeId = requestedTreeId && trees.some((tree) => tree.id === requestedTreeId)
      ? requestedTreeId
      : trees[0]?.id ?? null;
    if (!activeTreeId) {
      return { trees, activeTreeId, activeRole: null, people: [], spouses: [], proposals: [] };
    }
    const people = (db.prepare("SELECT * FROM lineage_people WHERE tree_id = ? ORDER BY created_at").all(activeTreeId) as PersonRow[]).map(mapPerson);
    const spouses = (db.prepare("SELECT * FROM lineage_spouses WHERE tree_id = ? ORDER BY created_at").all(activeTreeId) as SpouseRow[]).map(mapSpouse);
    const proposals = (db.prepare("SELECT * FROM lineage_import_proposals WHERE tree_id = ? ORDER BY created_at DESC LIMIT 8").all(activeTreeId) as ProposalRow[]).map(mapProposal);
    return { trees, activeTreeId, activeRole: treeRole(accountId, activeTreeId), people, spouses, proposals };
  },

  publicState(treeId: string) {
    const treeRow = db.prepare("SELECT * FROM lineage_trees WHERE id = ?").get(treeId) as TreeRow | undefined;
    if (!treeRow) {
      throw Object.assign(new Error("Family tree not found."), { statusCode: 404 });
    }
    const tree = mapTree(treeRow);
    const people = (db.prepare("SELECT * FROM lineage_people WHERE tree_id = ? ORDER BY created_at").all(treeId) as PersonRow[]).map(mapPerson);
    const spouses = (db.prepare("SELECT * FROM lineage_spouses WHERE tree_id = ? ORDER BY created_at").all(treeId) as SpouseRow[]).map(mapSpouse);
    return {
      trees: [tree],
      activeTreeId: treeId,
      activeRole: "viewer",
      people,
      spouses,
      proposals: []
    };
  },

  assertTreeAccess,
  assertTreeEditAccess,
  assertTreeAdminAccess,
  personTreeId,
  proposalTreeId,
  accountTreeCount,

  listTreeAccess(accountId: string, treeId: string) {
    assertTreeAdminAccess(accountId, treeId);
    const members = (db.prepare(
      `SELECT m.account_id, a.email, a.display_name, m.role, m.created_at
       FROM account_tree_memberships m
       INNER JOIN accounts a ON a.id = m.account_id
       WHERE m.tree_id = ?
       ORDER BY
         CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'contributor' THEN 2 ELSE 3 END,
         a.display_name`
    ).all(treeId) as AccessMemberRow[]).map((row) => ({
      accountId: row.account_id,
      email: row.email,
      name: row.display_name,
      role: row.role,
      createdAt: row.created_at
    }));
    const invitations = (db.prepare(
      `SELECT * FROM tree_invitations
       WHERE tree_id = ?
       ORDER BY created_at DESC
       LIMIT 20`
    ).all(treeId) as InvitationRow[]).map(mapInvitation);
    return { members, invitations };
  },

  createInvite(accountId: string, treeId: string, input: z.infer<typeof inviteCreateSchema>, origin: string) {
    assertTreeAdminAccess(accountId, treeId);
    const parsed = inviteCreateSchema.parse(input);
    const token = randomBytes(32).toString("hex");
    const timestamp = now();
    db.prepare(
      `INSERT INTO tree_invitations (
        id, tree_id, invited_email, role, invited_by_account_id, token_hash, status, expires_at, accepted_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(),
      treeId,
      normalizeEmail(parsed.email),
      parsed.role,
      accountId,
      sha256(token),
      "pending",
      addDays(appConfig.inviteDays),
      null,
      timestamp
    );
    return {
      email: normalizeEmail(parsed.email),
      role: parsed.role,
      expiresAt: addDays(appConfig.inviteDays),
      inviteUrl: `${origin}/vamshavali?invite=${token}`
    };
  },

  acceptInvite(accountId: string, accountEmail: string, token: string) {
    const invitation = db.prepare(
      `SELECT * FROM tree_invitations
       WHERE token_hash = ? AND status = 'pending' AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`
    ).get(sha256(token.trim()), now()) as InvitationRow | undefined;
    if (!invitation) {
      throw Object.assign(new Error("Invite link is invalid or expired."), { statusCode: 400 });
    }
    if (normalizeEmail(accountEmail) !== invitation.invited_email) {
      throw Object.assign(new Error(`This invite is for ${invitation.invited_email}. Sign in with that email to accept it.`), { statusCode: 403 });
    }
    db.transaction(() => {
      db.prepare(
        `INSERT INTO account_tree_memberships (account_id, tree_id, role, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(account_id, tree_id) DO UPDATE SET role =
           CASE
             WHEN account_tree_memberships.role = 'owner' THEN 'owner'
             WHEN excluded.role = 'admin' THEN 'admin'
             WHEN account_tree_memberships.role = 'admin' THEN 'admin'
             WHEN excluded.role = 'contributor' THEN 'contributor'
             ELSE account_tree_memberships.role
           END`
      ).run(accountId, invitation.tree_id, invitation.role, now());
      db.prepare("UPDATE tree_invitations SET status = 'accepted', accepted_at = ? WHERE id = ?").run(now(), invitation.id);
    })();
    return this.stateForAccount(accountId, invitation.tree_id);
  },

  createTree(input: z.infer<typeof lineageTreeCreateSchema>, ownerAccountId?: string, maxTreesPerAccount?: number) {
    const parsed = lineageTreeCreateSchema.parse(input);
    if (ownerAccountId && maxTreesPerAccount && accountTreeCount(ownerAccountId) >= maxTreesPerAccount) {
      throw Object.assign(new Error(`This account can create up to ${maxTreesPerAccount} family trees.`), { statusCode: 409 });
    }
    const timestamp = now();
    const treeId = randomUUID();
    db.prepare(
      `INSERT INTO lineage_trees (
        id, name, account_holder_name, gotra, pravara, kuladevi, kuladevata, kulapurohit,
        gramadevata, native_village, family_surname, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      treeId,
      parsed.name,
      parsed.accountHolderName ?? null,
      parsed.gotra ?? null,
      parsed.pravara ?? null,
      parsed.kuladevi ?? null,
      parsed.kuladevata ?? null,
      parsed.kulapurohit ?? null,
      parsed.gramadevata ?? null,
      parsed.nativeVillage ?? null,
      parsed.familySurname ?? null,
      parsed.notes ?? null,
      timestamp,
      timestamp
    );

    if (ownerAccountId) {
      db.prepare("INSERT INTO account_tree_memberships (account_id, tree_id, role, created_at) VALUES (?, ?, ?, ?)")
        .run(ownerAccountId, treeId, "owner", timestamp);
    }

    if (parsed.seedAccountHolder && parsed.accountHolderName) {
      this.createPerson({
        treeId,
        displayName: parsed.accountHolderName,
        gender: "unknown",
        lifeStatus: "living",
        maritalStatus: "unknown"
      });
    }

    if (ownerAccountId) return this.stateForAccount(ownerAccountId, treeId);
    return this.state(treeId);
  },

  updateTree(treeId: string, input: z.infer<typeof lineageTreeInputSchema>) {
    const parsed = lineageTreeInputSchema.parse(input);
    const mapping: Record<string, string> = {
      name: "name",
      accountHolderName: "account_holder_name",
      gotra: "gotra",
      pravara: "pravara",
      kuladevi: "kuladevi",
      kuladevata: "kuladevata",
      kulapurohit: "kulapurohit",
      gramadevata: "gramadevata",
      nativeVillage: "native_village",
      familySurname: "family_surname",
      notes: "notes"
    };
    const entries = Object.entries(parsed);
    if (entries.length) {
      const assignments = entries.map(([key]) => `${mapping[key]} = ?`);
      const values = entries.map(([, value]) => value ?? null);
      values.push(now(), treeId);
      db.prepare(`UPDATE lineage_trees SET ${assignments.join(", ")}, updated_at = ? WHERE id = ?`).run(...values);
    }
    return this.state(treeId);
  },

  createPerson(input: LineagePersonInput) {
    const parsed = lineagePersonInputSchema.parse(input);
    const timestamp = now();
    const id = parsed.id ?? randomUUID();
    const treeId = parsed.treeId ?? defaultTreeId();
    const parentage = resolveParentage({
      treeId,
      selfId: id,
      fatherId: parsed.fatherId,
      motherId: parsed.motherId
    });
    db.prepare(
      `INSERT INTO lineage_people (
        id, tree_id, display_name, gender, life_status, marital_status, date_of_birth, date_of_death,
        death_anniversary, rashi, gotra, photo_url, notes, father_id, mother_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      treeId,
      parsed.displayName,
      parsed.gender,
      parsed.lifeStatus,
      parsed.maritalStatus,
      parsed.dateOfBirth ?? null,
      parsed.dateOfDeath ?? null,
      parsed.deathAnniversary ?? null,
      parsed.rashi ?? null,
      parsed.gotra ?? null,
      parsed.photoUrl ?? null,
      parsed.notes ?? null,
      parentage.fatherId,
      parentage.motherId,
      timestamp,
      timestamp
    );
    return mapPerson(db.prepare("SELECT * FROM lineage_people WHERE id = ?").get(id) as PersonRow);
  },

  updatePerson(id: string, input: Partial<LineagePersonInput>) {
    const parsed = lineagePersonInputSchema.partial().parse(input);
    const existing = db.prepare("SELECT * FROM lineage_people WHERE id = ?").get(id) as PersonRow | undefined;
    if (!existing) throw new Error("Person not found.");
    const nextFatherId = "fatherId" in parsed ? parsed.fatherId ?? null : existing.father_id;
    const nextMotherId = "motherId" in parsed ? parsed.motherId ?? null : existing.mother_id;
    const nextGender = "gender" in parsed ? parsed.gender ?? existing.gender : existing.gender;
    const parentage = resolveParentage({
      treeId: existing.tree_id,
      selfId: id,
      fatherId: nextFatherId,
      motherId: nextMotherId
    });
    if (nextGender === "female" && (parentage.fatherId || parentage.motherId) && spouseIdsFor(existing.tree_id, id).length > 0) {
      throw validationError("A daughter recorded in this family tree cannot link her husband or continue her next generation here.");
    }
    const normalizedParsed = {
      ...parsed,
      fatherId: parentage.fatherId,
      motherId: parentage.motherId
    };
    const mapping: Record<string, string> = {
      displayName: "display_name",
      gender: "gender",
      lifeStatus: "life_status",
      maritalStatus: "marital_status",
      dateOfBirth: "date_of_birth",
      dateOfDeath: "date_of_death",
      deathAnniversary: "death_anniversary",
      rashi: "rashi",
      gotra: "gotra",
      photoUrl: "photo_url",
      notes: "notes",
      fatherId: "father_id",
      motherId: "mother_id"
    };
    const entries = Object.entries(normalizedParsed).filter(([key]) => key !== "id" && key !== "treeId");
    if (entries.length) {
      const assignments = entries.map(([key]) => `${mapping[key]} = ?`);
      const values = entries.map(([, value]) => value ?? null);
      values.push(now(), id);
      db.prepare(`UPDATE lineage_people SET ${assignments.join(", ")}, updated_at = ? WHERE id = ?`).run(...values);
    }
    return mapPerson(db.prepare("SELECT * FROM lineage_people WHERE id = ?").get(id) as PersonRow);
  },

  deletePerson(id: string) {
    const existing = db.prepare("SELECT * FROM lineage_people WHERE id = ?").get(id) as PersonRow | undefined;
    if (!existing) throw validationError("Person not found.");
    const timestamp = now();
    db.transaction(() => {
      db.prepare("DELETE FROM lineage_spouses WHERE tree_id = ? AND (person_a_id = ? OR person_b_id = ?)").run(
        existing.tree_id,
        id,
        id
      );
      db.prepare("UPDATE lineage_people SET father_id = NULL, updated_at = ? WHERE tree_id = ? AND father_id = ?").run(
        timestamp,
        existing.tree_id,
        id
      );
      db.prepare("UPDATE lineage_people SET mother_id = NULL, updated_at = ? WHERE tree_id = ? AND mother_id = ?").run(
        timestamp,
        existing.tree_id,
        id
      );
      db.prepare("DELETE FROM lineage_people WHERE id = ?").run(id);
    })();
    return this.state(existing.tree_id);
  },

  linkSpouses(treeId: string, personAId: string, personBId: string, status = "married") {
    if (personAId === personBId) throw validationError("A person cannot be linked as their own spouse.");
    const personA = personRowInTree(treeId, personAId);
    const personB = personRowInTree(treeId, personBId);
    if (!personA || !personB) throw validationError("Both spouses must belong to this family tree.");

    let genderA = (personA.gender ?? "unknown").toLowerCase().trim();
    let genderB = (personB.gender ?? "unknown").toLowerCase().trim();

    if (genderA === "m") genderA = "male";
    if (genderA === "f") genderA = "female";
    if (genderB === "m") genderB = "male";
    if (genderB === "f") genderB = "female";

    const timestamp = now();

    // Auto-resolve unknown/empty genders based on the other spouse for maximum robustness
    if (genderA === "male" && (genderB === "unknown" || !genderB)) {
      db.prepare("UPDATE lineage_people SET gender = 'female', updated_at = ? WHERE id = ?").run(timestamp, personBId);
      personB.gender = "female";
      genderB = "female";
    } else if (genderB === "male" && (genderA === "unknown" || !genderA)) {
      db.prepare("UPDATE lineage_people SET gender = 'female', updated_at = ? WHERE id = ?").run(timestamp, personAId);
      personA.gender = "female";
      genderA = "female";
    } else if (genderA === "female" && (genderB === "unknown" || !genderB)) {
      db.prepare("UPDATE lineage_people SET gender = 'male', updated_at = ? WHERE id = ?").run(timestamp, personBId);
      personB.gender = "male";
      genderB = "male";
    } else if (genderB === "female" && (genderA === "unknown" || !genderA)) {
      db.prepare("UPDATE lineage_people SET gender = 'male', updated_at = ? WHERE id = ?").run(timestamp, personAId);
      personA.gender = "male";
      genderA = "male";
    } else if ((genderA === "unknown" || !genderA) && (genderB === "unknown" || !genderB)) {
      db.prepare("UPDATE lineage_people SET gender = 'male', updated_at = ? WHERE id = ?").run(timestamp, personAId);
      db.prepare("UPDATE lineage_people SET gender = 'female', updated_at = ? WHERE id = ?").run(timestamp, personBId);
      personA.gender = "male";
      personB.gender = "female";
      genderA = "male";
      genderB = "female";
    }

    const male = genderA === "male" ? personA : genderB === "male" ? personB : null;
    const female = genderA === "female" ? personA : genderB === "female" ? personB : null;

    if (!male || !female) {
      console.warn(`[Lineage Spouses] Same-gender or non-standard spouse link between ${personAId} (${personA.display_name}) and ${personBId} (${personB.display_name}). Allowing link for robustness.`);
    }

    if (female && (female.father_id || female.mother_id)) {
      console.warn(`[Lineage Spouses] Linked spouse to a daughter: ${female.display_name}. Warning only.`);
    }

    const [a, b] = [personAId, personBId].sort();
    db.prepare(
      `INSERT OR IGNORE INTO lineage_spouses (
        id, tree_id, person_a_id, person_b_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), treeId, a, b, status, timestamp, timestamp);
    db.prepare("UPDATE lineage_people SET marital_status = 'married', updated_at = ? WHERE id IN (?, ?)").run(timestamp, personAId, personBId);
  },

  csvPreview(treeId: string, csv: string) {
    return csvRowsToProposal(treeId, csv);
  },

  commitCsv(treeId: string, csv: string) {
    const proposal = csvRowsToProposal(treeId, csv);
    commitProposal(proposal);
    return this.state(treeId);
  },

  createTelegramProposal(treeId: string, rawText: string, sourceType: "telegram_text" | "telegram_voice") {
    const proposal = textToProposal(treeId, rawText);
    const id = randomUUID();
    db.prepare(
      "INSERT INTO lineage_import_proposals (id, tree_id, source_type, raw_text, proposal_json, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)"
    ).run(id, treeId, sourceType, rawText, JSON.stringify(proposal), now());
    return mapProposal(db.prepare("SELECT * FROM lineage_import_proposals WHERE id = ?").get(id) as ProposalRow);
  },

  commitProposal(id: string) {
    const row = db.prepare("SELECT * FROM lineage_import_proposals WHERE id = ?").get(id) as ProposalRow | undefined;
    if (!row) throw new Error("Proposal not found.");
    commitProposal(JSON.parse(row.proposal_json));
    db.prepare("UPDATE lineage_import_proposals SET status = 'committed' WHERE id = ?").run(id);
    return this.state(row.tree_id);
  },

  dismissProposal(id: string) {
    const row = db.prepare("SELECT * FROM lineage_import_proposals WHERE id = ?").get(id) as ProposalRow | undefined;
    if (!row) throw new Error("Proposal not found.");
    db.prepare("UPDATE lineage_import_proposals SET status = 'dismissed' WHERE id = ?").run(id);
    return this.state(row.tree_id);
  }
};
