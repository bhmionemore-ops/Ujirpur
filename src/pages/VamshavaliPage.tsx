import React from "react";
import { useParams } from "react-router-dom";
import {
  Baby,
  Check,
  ChevronsUpDown,
  CircleDot,
  FileText,
  Heart,
  Home as HomeIcon,
  KeyRound,
  Landmark,
  LocateFixed,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Mic,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Users,
  Trash2,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import "../styles-vamshavali.css";

type Gender = "male" | "female" | "other" | "unknown";
type LifeStatus = "living" | "deceased" | "unknown";
type MaritalStatus = "unmarried" | "married" | "widowed" | "divorced" | "separated" | "unknown";
type AppView = "overview" | "tree" | "people" | "traditions" | "import" | "account";

type Account = {
  id: string;
  email: string;
  name: string;
  hasPassword: boolean;
};

type Session = {
  token: string;
  account: Account;
  maxTreesPerAccount: number;
  treeId: string | null;
};

type LineageTree = {
  id: string;
  name: string;
  accountHolderName: string | null;
  gotra: string | null;
  pravara: string | null;
  kuladevi: string | null;
  kuladevata: string | null;
  kulapurohit: string | null;
  gramadevata: string | null;
  nativeVillage: string | null;
  familySurname: string | null;
  notes: string | null;
  updatedAt?: string;
};

type Person = {
  id: string;
  treeId: string;
  displayName: string;
  gender: Gender;
  lifeStatus: LifeStatus;
  maritalStatus: MaritalStatus;
  dateOfBirth: string | null;
  dateOfDeath: string | null;
  deathAnniversary: string | null;
  rashi: string | null;
  gotra: string | null;
  photoUrl: string | null;
  notes: string | null;
  fatherId: string | null;
  motherId: string | null;
};

type SpouseLink = {
  id: string;
  treeId: string;
  personAId: string;
  personBId: string;
  status: string;
};

type ImportPerson = {
  clientKey: string;
  displayName: string;
  gender: Gender;
  lifeStatus: LifeStatus;
  maritalStatus: MaritalStatus;
  fatherKey?: string | null;
  motherKey?: string | null;
  spouseKeys?: string[];
};

type ImportProposal = {
  treeId: string;
  people: ImportPerson[];
  warnings: string[];
  familyMetadata?: Partial<LineageTree>;
  source: string;
};

type Proposal = {
  id: string;
  treeId: string;
  sourceType: "telegram_text" | "telegram_voice" | "csv";
  rawText: string;
  proposal: ImportProposal;
  status: "pending" | "committed" | "dismissed";
  createdAt: string;
};

type LineageState = {
  trees: LineageTree[];
  activeTreeId: string | null;
  activeRole: "owner" | "admin" | "contributor" | "viewer" | null;
  people: Person[];
  spouses: SpouseLink[];
  proposals: Proposal[];
};

type TreeAccessMember = {
  accountId: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "contributor" | "viewer";
  createdAt: string;
};

type TreeInvitation = {
  id: string;
  treeId: string;
  email: string;
  role: "admin" | "contributor" | "viewer";
  status: "pending" | "accepted" | "revoked";
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

type TreeAccess = {
  members: TreeAccessMember[];
  invitations: TreeInvitation[];
};

type PersonForm = {
  displayName: string;
  gender: Gender;
  lifeStatus: LifeStatus;
  maritalStatus: MaritalStatus;
  spouseId: string;
  dateOfBirth: string;
  dateOfDeath: string;
  deathAnniversary: string;
  rashi: string;
  gotra: string;
  photoUrl: string;
  notes: string;
  fatherId: string;
  motherId: string;
};

const sessionKey = "vanshavali-session";

function inviteTokenFromUrl() {
  return new URLSearchParams(window.location.search).get("invite");
}

function clearInviteTokenFromUrl() {
  if (!inviteTokenFromUrl()) return;
  window.history.replaceState({}, "", window.location.pathname);
}

const emptyPersonForm: PersonForm = {
  displayName: "",
  gender: "unknown",
  lifeStatus: "living",
  maritalStatus: "unknown",
  spouseId: "",
  dateOfBirth: "",
  dateOfDeath: "",
  deathAnniversary: "",
  rashi: "",
  gotra: "",
  photoUrl: "",
  notes: "",
  fatherId: "",
  motherId: ""
};

const sampleCsv = `person_id,name,gender,is_living,dob,dod,rashi,gotra,father_id,mother_id,spouse_ids,marital_status,photo_url,notes
P1,Harish Rao,male,false,1932-01-10,2009-04-22,Mesha,Vasishta,,,P2,married,,Oldest known ancestor
P2,Lakshmi Rao,female,false,1938-05-08,2018-11-02,Karka,Vasishta,,,P1,married,,
P3,Suresh Rao,male,true,1964-09-12,,Simha,Vasishta,P1,P2,P4,married,,
P4,Geeta Rao,female,true,1968-07-14,,Tula,,,P3,married,,
P5,Nikhil Rao,male,true,1995-02-20,,Kanya,Vasishta,P3,P4,,unmarried,,`;

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(sessionKey);
    const parsed = raw ? JSON.parse(raw) as Partial<Session> : null;
    return parsed?.token && parsed.account?.email ? parsed as Session : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  if (!session) localStorage.removeItem(sessionKey);
  else localStorage.setItem(sessionKey, JSON.stringify(session));
}

function personToForm(person: Person): PersonForm {
  return {
    displayName: person.displayName,
    gender: person.gender,
    lifeStatus: person.lifeStatus,
    maritalStatus: person.maritalStatus,
    spouseId: "",
    dateOfBirth: person.dateOfBirth ?? "",
    dateOfDeath: person.dateOfDeath ?? "",
    deathAnniversary: person.deathAnniversary ?? "",
    rashi: person.rashi ?? "",
    gotra: person.gotra ?? "",
    photoUrl: person.photoUrl ?? "",
    notes: person.notes ?? "",
    fatherId: person.fatherId ?? "",
    motherId: person.motherId ?? ""
  };
}

function formToBody(form: PersonForm, treeId: string) {
  return {
    treeId,
    displayName: form.displayName.trim(),
    gender: form.gender,
    lifeStatus: form.lifeStatus,
    maritalStatus: form.maritalStatus,
    dateOfBirth: form.dateOfBirth.trim() || null,
    dateOfDeath: form.dateOfDeath.trim() || null,
    deathAnniversary: form.deathAnniversary.trim() || null,
    rashi: form.rashi.trim() || null,
    gotra: form.gotra.trim() || null,
    photoUrl: form.photoUrl.trim() || null,
    notes: form.notes.trim() || null,
    fatherId: form.fatherId || null,
    motherId: form.motherId || null
  };
}

function useLineage(session: Session | null, treeId: string | null, enabled: boolean, isPublic = false) {
  const [state, setState] = React.useState<LineageState | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!enabled) return;
    if (isPublic && treeId) {
      const response = await fetch(`/api/lineage/public/trees/${encodeURIComponent(treeId)}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not load lineage.");
      setState(json);
      setError(null);
      return;
    }
    if (!session) return;
    const query = treeId ? `?treeId=${encodeURIComponent(treeId)}` : "";
    const response = await fetch(`/api/lineage/state${query}`, {
      headers: { Authorization: `Bearer ${session.token}` }
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Could not load lineage.");
    setState(json);
    setError(null);
  }, [session?.token, treeId, enabled, isPublic]);

  React.useEffect(() => {
    setState(null);
    refresh().catch((reason) => setError((reason as Error).message));
  }, [refresh]);

  async function request(label: string, url: string, options: RequestInit = {}) {
    setBusy(label);
    setError(null);
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
          ...(options.headers ?? {})
        }
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Action failed.");
      if (json.trees && json.people) setState(json);
      else if (json.state) setState(json.state);
      else await refresh();
      return json;
    } catch (reason) {
      setError((reason as Error).message);
      throw reason;
    } finally {
      setBusy(null);
    }
  }

  return { state, busy, error, refresh, request };
}

function AuthScreen({ onAuth }: { onAuth: (session: Session) => void }) {
  const pendingInvite = Boolean(inviteTokenFromUrl());
  const [mode, setMode] = React.useState<"code" | "password" | "create">("code");
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [currentCode, setCurrentCode] = React.useState("");
  const [developmentCode, setDevelopmentCode] = React.useState("");
  const [codeRequested, setCodeRequested] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  function buildSession(json: {
    token: string;
    account: Account;
    maxTreesPerAccount: number;
    state?: LineageState;
  }): Session {
    return {
      token: json.token,
      account: json.account,
      maxTreesPerAccount: json.maxTreesPerAccount,
      treeId: json.state?.activeTreeId ?? null
    };
  }

  async function authRequest(url: string, body: Record<string, string>) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Authentication failed.");
      return json;
    } catch (reason) {
      setMessage((reason as Error).message);
      throw reason;
    } finally {
      setBusy(false);
    }
  }

  async function requestCode() {
    try {
      const json = await authRequest("/api/auth/request-code", { email, name });
      setDevelopmentCode(json.developmentCode ?? "");
      setCodeRequested(true);
      setMessage(json.developmentCode ? `Access code sent. For local testing, use ${json.developmentCode}.` : "Access code sent successfully! Please check your email inbox.");
    } catch {
      setCodeRequested(false);
    }
  }

  async function verifyCode() {
    const json = await authRequest("/api/auth/verify-code", { email, code: currentCode });
    onAuth(buildSession(json));
  }

  async function passwordLogin() {
    const json = await authRequest("/api/auth/login-password", { email, password });
    onAuth(buildSession(json));
  }

  async function createPasswordAccount() {
    const json = await authRequest("/api/auth/register-password", { email, name, password });
    onAuth(buildSession(json));
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-story">
          <span className="small-rule" />
          <h1>Preserve Your Roots, Grow Your Legacy.</h1>
          <p>A secure digital Vanshavali for family history, spiritual identity, and verified lineage records.</p>
          <div className="auth-feature"><Landmark size={18} /><div><strong>Historical Identity</strong><span>Keep Gotra, Kuladevata, village, and elder records together.</span></div></div>
          <div className="auth-feature"><Users size={18} /><div><strong>Lineage Mapping</strong><span>Connect ancestors, spouses, children, and branches clearly.</span></div></div>
          <div className="auth-feature"><ShieldCheck size={18} /><div><strong>Private Legacy</strong><span>Your family archive stays visible only to invited members.</span></div></div>
        </div>
        <div className="auth-form">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div className="brand-logo-container" style={{ width: "40px", height: "40px", borderRadius: "10px" }}>
              <img 
                src="https://i.postimg.cc/McBQ2pVg/barnia-logo-120x120.png" 
                alt="Barnia Logo" 
                className="brand-logo-img"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="secure-pill"><ShieldCheck size={13} /> Secure access</span>
          </div>
          <h2>Digital Vanshavali</h2>
          <p>Sign in to view an existing lineage, or create a new account to begin a family record.</p>
          {pendingInvite && <p className="busy">You have a family tree invite. Sign in or create an account with the invited email to accept it.</p>}
          <div className="segmented auth-tabs">
            <button className={mode === "code" ? "active" : ""} onClick={() => setMode("code")}><Mail size={15} />Access code</button>
            <button className={mode === "password" ? "active" : ""} onClick={() => setMode("password")}><KeyRound size={15} />Password</button>
          </div>
          <label>
            Email address
            <div className="input-with-icon">
              <Mail size={18} />
              <input value={email} placeholder="name@family.com" onChange={(event) => setEmail(event.target.value)} />
            </div>
          </label>
          {mode === "create" && (
            <label>
              Account holder name
              <div className="input-with-icon">
                <UserRound size={18} />
                <input value={name} placeholder="e.g. Aarav Sharma" onChange={(event) => setName(event.target.value)} />
              </div>
            </label>
          )}
          {(mode === "password" || mode === "create") && (
            <label>
              Password
              <div className="input-with-icon">
                <KeyRound size={18} />
                <input type="password" value={password} placeholder="Minimum 8 characters" onChange={(event) => setPassword(event.target.value)} />
              </div>
            </label>
          )}
          {mode === "code" && (
            <>
              <button className="auth-primary" disabled={busy || !email.trim()} onClick={requestCode}>Generate access code <span>{"->"}</span></button>
              {(codeRequested || developmentCode) && (
                <label>
                  Access code
                  <div className="input-with-icon">
                    <ShieldCheck size={18} />
                    <input value={currentCode} placeholder="6 digit code" onChange={(event) => setCurrentCode(event.target.value)} />
                  </div>
                </label>
              )}
              <button disabled={busy || !email.trim() || !currentCode.trim()} onClick={verifyCode}><Check size={16} />Verify and sign in</button>
            </>
          )}
          {mode === "password" && (
            <button className="auth-primary" disabled={busy || !email.trim() || !password} onClick={passwordLogin}>Sign in with password <span>{"->"}</span></button>
          )}
          {mode === "create" && (
            <button className="auth-primary" disabled={busy || !email.trim() || !name.trim() || password.length < 8} onClick={createPasswordAccount}>Create account <span>{"->"}</span></button>
          )}
          {message && <p className={codeRequested ? "busy" : "error"}>{message}</p>}
          <div className="new-account">
            <span>New to digital lineage?</span>
            <button onClick={() => setMode(mode === "create" ? "code" : "create")}><Plus size={15} /> {mode === "create" ? "Use existing account" : "Create your own account"}</button>
          </div>
          <small>Privacy first: your data is only visible to people you invite.</small>
        </div>
      </section>
    </main>
  );
}

function createEmptyTreeBody(session: Session, mode: "manual" | "import") {
  const familyName = session.account.name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
  return {
    name: mode === "manual" ? `${familyName || "My"} Family Lineage` : "Imported Family Lineage",
    accountHolderName: familyName || "Account Holder",
    seedAccountHolder: mode === "manual",
    notes: "Created from account onboarding."
  };
}

function Onboarding({
  session,
  onTreeCreated,
  request,
  onLogout
}: {
  session: Session;
  onTreeCreated: (treeId: string) => void;
  request: ReturnType<typeof useLineage>["request"];
  onLogout: () => void;
}) {
  const [csv, setCsv] = React.useState(sampleCsv);
  const [importOpen, setImportOpen] = React.useState(false);

  async function startManual() {
    const state = await request("create-tree", "/api/lineage/trees", {
      method: "POST",
      body: JSON.stringify(createEmptyTreeBody(session, "manual"))
    });
    onTreeCreated(state.activeTreeId);
  }

  async function importCsv() {
    const state = await request("create-import-tree", "/api/lineage/trees", {
      method: "POST",
      body: JSON.stringify(createEmptyTreeBody(session, "import"))
    });
    await request("commit-csv", "/api/lineage/import/commit", {
      method: "POST",
      body: JSON.stringify({ treeId: state.activeTreeId, csv })
    });
    onTreeCreated(state.activeTreeId);
  }

  return (
    <main className="onboarding">
      <div className="onboarding-topbar">
        <div className="brand-mark">
          <div className="brand-logo-container">
            <img 
              src="https://i.postimg.cc/McBQ2pVg/barnia-logo-120x120.png" 
              alt="Barnia Logo" 
              className="brand-logo-img"
              referrerPolicy="no-referrer"
            />
          </div>
          <strong>Vanshavali</strong>
        </div>
        <button onClick={onLogout}><LogOut size={16} />Sign out</button>
      </div>
      <section className="welcome-panel">
        <p className="eyebrow">Welcome, {session.account.name}</p>
        <h1>Start your family lineage</h1>
        <p>Create your Vanshavali manually, or import a prepared spreadsheet and review it inside the app.</p>
      </section>
      <section className="choice-grid">
        <button className="choice-card" onClick={startManual}>
          <UserRound size={24} />
          <strong>Create manually</strong>
          <span>Add yourself first, then connect parents, spouses, children, and ancestors.</span>
        </button>
        <button className="choice-card" onClick={() => setImportOpen((value) => !value)}>
          <Upload size={24} />
          <strong>Import from CSV</strong>
          <span>Paste a spreadsheet export with person IDs, parents, spouses, and details.</span>
        </button>
        <button className="choice-card muted-choice">
          <MessageCircle size={24} />
          <strong>Telegram intake</strong>
          <span>Available after a lineage exists, so proposals can be reviewed safely.</span>
        </button>
      </section>
      {importOpen && (
        <section className="onboarding-import">
          <header>
            <div>
              <p className="eyebrow">Spreadsheet import</p>
              <h2>Paste CSV lineage data</h2>
            </div>
            <button onClick={importCsv}><Check size={16} /> Create lineage from CSV</button>
          </header>
          <textarea value={csv} onChange={(event) => setCsv(event.target.value)} />
        </section>
      )}
    </main>
  );
}

function generationMap(people: Person[], spouses: SpouseLink[]) {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const map = new Map(people.map((person) => [person.id, 0]));
  let changed = true;
  let guard = 0;
  while (changed && guard < people.length + spouses.length + 10) {
    changed = false;
    guard += 1;
    for (const person of people) {
      const parents = [person.fatherId, person.motherId].map((id) => (id ? peopleById.get(id) : null)).filter(Boolean) as Person[];
      if (!parents.length) continue;
      const next = Math.max(...parents.map((parent) => map.get(parent.id) ?? 0)) + 1;
      if ((map.get(person.id) ?? 0) < next) {
        map.set(person.id, next);
        changed = true;
      }
    }
    for (const spouse of spouses) {
      const a = map.get(spouse.personAId);
      const b = map.get(spouse.personBId);
      if (a === undefined || b === undefined) continue;
      const next = Math.max(a, b);
      if (a !== next) {
        map.set(spouse.personAId, next);
        changed = true;
      }
      if (b !== next) {
        map.set(spouse.personBId, next);
        changed = true;
      }
    }
  }
  return map;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function statusLabel(person: Person) {
  const life = person.lifeStatus === "deceased" ? "Deceased" : person.lifeStatus === "living" ? "Living" : "Unknown";
  const married = person.maritalStatus === "married" ? "Married" : person.maritalStatus === "unmarried" ? "Unmarried" : person.maritalStatus;
  return `${life} - ${married}`;
}

function displayPersonName(person: Person | null | undefined) {
  if (!person) return "Unknown";
  if (person.lifeStatus !== "deceased") return person.displayName;
  return /^late\s+/i.test(person.displayName) ? person.displayName : `Late ${person.displayName}`;
}

function spouseNamesFor(person: Person, peopleById: Map<string, Person>, spouses: SpouseLink[]) {
  return spouses
    .filter((link) => link.personAId === person.id || link.personBId === person.id)
    .map((link) => peopleById.get(link.personAId === person.id ? link.personBId : link.personAId))
    .filter((spouse): spouse is Person => Boolean(spouse))
    .map(displayPersonName);
}

function parentSummary(person: Person, peopleById: Map<string, Person>) {
  const father = person.fatherId ? peopleById.get(person.fatherId) : null;
  const mother = person.motherId ? peopleById.get(person.motherId) : null;
  if (father && mother) return `Child of ${displayPersonName(father)} and ${displayPersonName(mother)}`;
  if (father) return `Child of ${displayPersonName(father)}`;
  if (mother) return `Child of ${displayPersonName(mother)}`;
  return "Oldest known / parent link not recorded";
}

function FamilyTreeCanvas({
  people,
  spouses,
  selectedId,
  onSelect
}: {
  people: Person[];
  spouses: SpouseLink[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(0.6);
  const [offset, setOffset] = React.useState({ x: 24, y: 24 });
  const [drag, setDrag] = React.useState<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const layout = React.useMemo(() => {
    const generations = generationMap(people, spouses);
    const grouped = new Map<number, Person[]>();
    for (const person of people) {
      const gen = generations.get(person.id) ?? 0;
      grouped.set(gen, [...(grouped.get(gen) ?? []), person]);
    }
    const rows = [...grouped.entries()].sort(([a], [b]) => a - b);
    const nodeWidth = 198;
    const rowHeight = 176;
    const gap = 48;
    const maxRow = Math.max(1, ...rows.map(([, row]) => row.length));
    const canvasWidth = Math.max(850, maxRow * (nodeWidth + gap) + 160);
    const canvasHeight = Math.max(560, rows.length * rowHeight + 190);
    const nodes = rows.flatMap(([generation, row]) => {
      const sorted = [...row].sort((a, b) => displayPersonName(a).localeCompare(displayPersonName(b)));
      const rowWidth = sorted.length * nodeWidth + Math.max(0, sorted.length - 1) * gap;
      const startX = (canvasWidth - rowWidth) / 2;
      return sorted.map((person, index) => ({
        person,
        generation,
        x: startX + index * (nodeWidth + gap),
        y: 92 + generation * rowHeight
      }));
    });
    return { nodes, canvasWidth, canvasHeight, nodeWidth };
  }, [people, spouses]);

  const nodeById = new Map(layout.nodes.map((node) => [node.person.id, node]));
  const parentLines = people.flatMap((person) =>
    [person.fatherId, person.motherId]
      .map((parentId) => {
        const parent = parentId ? nodeById.get(parentId) : null;
        const child = nodeById.get(person.id);
        return parent && child ? { parent, child } : null;
      })
      .filter(Boolean)
  ) as Array<{ parent: (typeof layout.nodes)[number]; child: (typeof layout.nodes)[number] }>;
  const spouseLines = spouses
    .map((spouse) => {
      const a = nodeById.get(spouse.personAId);
      const b = nodeById.get(spouse.personBId);
      return a && b ? { a, b } : null;
    })
    .filter(Boolean) as Array<{ a: (typeof layout.nodes)[number]; b: (typeof layout.nodes)[number] }>;

  function fit() {
    const box = viewportRef.current?.getBoundingClientRect();
    if (!box) return;
    const nextScale = Math.min(1, Math.max(0.22, Math.min(box.width / layout.canvasWidth, box.height / layout.canvasHeight) * 0.92));
    setScale(nextScale);
    setOffset({
      x: Math.max(16, (box.width - layout.canvasWidth * nextScale) / 2),
      y: Math.max(16, (box.height - layout.canvasHeight * nextScale) / 2)
    });
  }

  React.useEffect(() => {
    fit();
  }, [people.length]);

  if (!people.length) {
    return (
      <section className="empty-tree">
        <Users size={34} />
        <h2>No family members yet</h2>
        <p>Add the account holder or import a CSV to begin the lineage map.</p>
      </section>
    );
  }

  return (
    <section className="tree-stage">
      <div className="tree-toolbar">
        <button title="Fit tree" onClick={fit}><LocateFixed size={16} /></button>
        <button title="Zoom out" onClick={() => setScale((value) => Math.max(0.18, value - 0.1))}><ZoomOut size={16} /></button>
        <span>{Math.round(scale * 100)}%</span>
        <button title="Zoom in" onClick={() => setScale((value) => Math.min(1.7, value + 0.1))}><ZoomIn size={16} /></button>
      </div>
      <div
        className="tree-viewport"
        ref={viewportRef}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest(".tree-node")) return;
          setDrag({ x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y });
        }}
        onPointerMove={(event) => {
          if (!drag) return;
          setOffset({ x: drag.ox + event.clientX - drag.x, y: drag.oy + event.clientY - drag.y });
        }}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        <div
          className="tree-canvas"
          style={{
            width: layout.canvasWidth,
            height: layout.canvasHeight,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
          }}
        >
          <svg className="tree-lines" width={layout.canvasWidth} height={layout.canvasHeight}>
            {parentLines.map(({ parent, child }) => (
              <path
                key={`${parent.person.id}-${child.person.id}`}
                d={`M ${parent.x + layout.nodeWidth / 2} ${parent.y + 116} C ${parent.x + layout.nodeWidth / 2} ${parent.y + 150}, ${child.x + layout.nodeWidth / 2} ${child.y - 34}, ${child.x + layout.nodeWidth / 2} ${child.y}`}
                className="parent-line"
              />
            ))}
            {spouseLines.map(({ a, b }) => (
              <path
                key={`${a.person.id}-${b.person.id}`}
                d={`M ${a.x + layout.nodeWidth} ${a.y + 58} C ${(a.x + b.x + layout.nodeWidth) / 2} ${a.y + 42}, ${(a.x + b.x + layout.nodeWidth) / 2} ${b.y + 72}, ${b.x} ${b.y + 58}`}
                className="spouse-line"
              />
            ))}
          </svg>
          {layout.nodes.map((node) => (
            <button
              type="button"
              key={node.person.id}
              className={`tree-node ${node.person.gender} ${node.person.lifeStatus} ${selectedId === node.person.id ? "selected" : ""}`}
              style={{ left: node.x, top: node.y }}
              onClick={() => onSelect(node.person.id)}
            >
              <span className="avatar">{node.person.photoUrl ? <img src={node.person.photoUrl} alt="" /> : initials(node.person.displayName)}</span>
              <strong>{displayPersonName(node.person)}</strong>
              <small>{statusLabel(node.person)}</small>
              <span className="node-badges"><CircleDot size={13} /> Generation {node.generation + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function TextInput({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function PersonEditor({
  people,
  spouses,
  form,
  setForm,
  onSubmit,
  onCancel,
  busy,
  title,
  currentPersonId
}: {
  people: Person[];
  spouses: SpouseLink[];
  form: PersonForm;
  setForm: React.Dispatch<React.SetStateAction<PersonForm>>;
  onSubmit: () => void;
  onCancel: () => void;
  busy: boolean;
  title: string;
  currentPersonId?: string | null;
}) {
  const eligibleParents = people.filter((person) => person.id !== currentPersonId && person.gender === "male");
  const eligibleSpouses = form.gender === "male"
    ? people.filter((person) => person.id !== currentPersonId && person.gender === "female" && !person.fatherId && !person.motherId)
    : [];
  const fatherSpouses = form.fatherId
    ? spouses
        .filter((spouse) => spouse.personAId === form.fatherId || spouse.personBId === form.fatherId)
        .map((spouse) => people.find((person) => person.id === (spouse.personAId === form.fatherId ? spouse.personBId : spouse.personAId)))
        .filter((person): person is Person => Boolean(person) && person.id !== currentPersonId)
    : [];
  const hasOneMother = fatherSpouses.length === 1;
  const hasMultipleMothers = fatherSpouses.length > 1;
  const motherHelp = !form.fatherId
    ? "Select a father first. Mother choices are based on his linked spouse records."
    : fatherSpouses.length === 0
      ? "No spouse is linked to the selected father yet."
      : hasOneMother
        ? "Automatically selected from the father's linked spouse."
        : "Choose from the father's linked spouses.";
  const spouseLabel = "Wife / spouse";
  const marriedDaughterNotice = form.gender === "female" && form.maritalStatus === "married"
    ? "Married daughters are shown as part of this family, but their husband and children should be maintained in the husband's family tree."
    : "";

  React.useEffect(() => {
    if (!form.fatherId) {
      if (form.motherId) setForm((current) => ({ ...current, motherId: "" }));
      return;
    }
    if (fatherSpouses.length === 1 && form.motherId !== fatherSpouses[0].id) {
      setForm((current) => ({ ...current, motherId: fatherSpouses[0].id }));
      return;
    }
    if (fatherSpouses.length !== 1 && form.motherId && !fatherSpouses.some((person) => person.id === form.motherId)) {
      setForm((current) => ({ ...current, motherId: "" }));
    }
  }, [form.fatherId, form.motherId, fatherSpouses.map((person) => person.id).join("|"), setForm]);

  React.useEffect(() => {
    if ((form.maritalStatus !== "married" || form.gender !== "male") && form.spouseId) {
      setForm((current) => ({ ...current, spouseId: "" }));
    }
  }, [form.gender, form.maritalStatus, form.spouseId, setForm]);

  return (
    <section className="surface">
      <header className="surface-head">
        <div>
          <p className="eyebrow">Manual builder</p>
          <h2>{title}</h2>
        </div>
        <div className="surface-actions">
          <button onClick={onCancel}>Cancel</button>
          <button className="primary-action" disabled={busy || !form.displayName.trim()} onClick={onSubmit}><Save size={16} />Save person</button>
        </div>
      </header>
      <div className="form-grid">
        <TextInput label="Full name" value={form.displayName} onChange={(displayName) => setForm((current) => ({ ...current, displayName }))} />
        <label className="field">
          <span>Gender</span>
          <select value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value as Gender }))}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label className="field">
          <span>Living status</span>
          <select value={form.lifeStatus} onChange={(event) => setForm((current) => ({ ...current, lifeStatus: event.target.value as LifeStatus }))}>
            <option value="living">Living</option>
            <option value="deceased">Deceased</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label className="field">
          <span>Marital status</span>
          <select value={form.maritalStatus} onChange={(event) => setForm((current) => ({ ...current, maritalStatus: event.target.value as MaritalStatus }))}>
            <option value="unmarried">Unmarried</option>
            <option value="married">Married</option>
            <option value="widowed">Widowed</option>
            <option value="divorced">Divorced</option>
            <option value="separated">Separated</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        {form.maritalStatus === "married" && (
          form.gender === "male" ? (
            <label className="field">
              <span>{spouseLabel}</span>
              <select value={form.spouseId} onChange={(event) => setForm((current) => ({ ...current, spouseId: event.target.value }))}>
                <option value="">Not linked yet</option>
                {eligibleSpouses.map((person) => <option key={person.id} value={person.id}>{displayPersonName(person)}</option>)}
              </select>
              <small>Select an existing female spouse who is not already recorded as a daughter in this tree.</small>
            </label>
          ) : (
            <div className="field lineage-rule-note">
              <span>Marriage continuation rule</span>
              <small>{marriedDaughterNotice || "Set gender to Male if this person is a male lineage member whose next generation should continue here."}</small>
            </div>
          )
        )}
        <TextInput label="Date of birth" value={form.dateOfBirth} placeholder="YYYY-MM-DD" onChange={(dateOfBirth) => setForm((current) => ({ ...current, dateOfBirth }))} />
        <TextInput label="Date of death" value={form.dateOfDeath} placeholder="YYYY-MM-DD" onChange={(dateOfDeath) => setForm((current) => ({ ...current, dateOfDeath }))} />
        <TextInput label="Death anniversary / tithi" value={form.deathAnniversary} onChange={(deathAnniversary) => setForm((current) => ({ ...current, deathAnniversary }))} />
        <TextInput label="Rashi" value={form.rashi} onChange={(rashi) => setForm((current) => ({ ...current, rashi }))} />
        <TextInput label="Gotra" value={form.gotra} onChange={(gotra) => setForm((current) => ({ ...current, gotra }))} />
        <label className="field">
          <span>Father</span>
          <select value={form.fatherId} onChange={(event) => setForm((current) => ({ ...current, fatherId: event.target.value }))}>
            <option value="">Unknown / not set</option>
            {eligibleParents.map((person) => <option key={person.id} value={person.id}>{displayPersonName(person)}</option>)}
          </select>
          <small>Only male lineage members can be selected as father for next-generation continuation.</small>
        </label>
        <label className="field parent-constrained">
          <span>Mother</span>
          <select
            value={form.motherId}
            disabled={!hasMultipleMothers}
            onChange={(event) => setForm((current) => ({ ...current, motherId: event.target.value }))}
          >
            <option value="">{form.fatherId ? "No eligible mother selected" : "Select father first"}</option>
            {fatherSpouses.map((person) => <option key={person.id} value={person.id}>{displayPersonName(person)}</option>)}
          </select>
          <small>{motherHelp}</small>
        </label>
        <TextInput label="Photo URL" value={form.photoUrl} onChange={(photoUrl) => setForm((current) => ({ ...current, photoUrl }))} />
        <label className="field wide">
          <span>Notes</span>
          <textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </label>
      </div>
    </section>
  );
}

function TraditionPanel({ tree, request, busy, canEdit }: { tree: LineageTree; request: ReturnType<typeof useLineage>["request"]; busy: boolean; canEdit: boolean }) {
  const [draft, setDraft] = React.useState(tree);
  React.useEffect(() => setDraft(tree), [tree.id, tree.updatedAt]);
  function update(key: keyof LineageTree, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  return (
    <section className="surface traditions-surface">
      <header className="surface-head">
        <div>
          <p className="eyebrow">Family record</p>
          <h2>Traditions and identity</h2>
        </div>
        {canEdit && <button className="primary-action" disabled={busy} onClick={() => request("save-family", `/api/lineage/trees/${tree.id}`, { method: "PATCH", body: JSON.stringify(draft) })}><Save size={16} />Save details</button>}
      </header>
      <div className="tradition-display">
        {[
          ["Gotra", draft.gotra],
          ["Pravara", draft.pravara],
          ["Kuladevi", draft.kuladevi],
          ["Kuladevata", draft.kuladevata],
          ["Kulapurohit", draft.kulapurohit],
          ["Gramadevata", draft.gramadevata],
          ["Native village", draft.nativeVillage],
          ["Family surname", draft.familySurname]
        ].map(([label, value]) => (
          <div className="tradition-tile" key={label ?? ""}>
            <span>{label}</span>
            <strong>{value || "Not recorded"}</strong>
          </div>
        ))}
      </div>
      <div className="form-grid traditions-form">
        <TextInput label="Lineage name" value={draft.name ?? ""} onChange={(value) => update("name", value)} />
        <TextInput label="Account holder" value={draft.accountHolderName ?? ""} onChange={(value) => update("accountHolderName", value)} />
        <TextInput label="Gotra" value={draft.gotra ?? ""} onChange={(value) => update("gotra", value)} />
        <TextInput label="Pravara" value={draft.pravara ?? ""} onChange={(value) => update("pravara", value)} />
        <TextInput label="Kuladevi" value={draft.kuladevi ?? ""} onChange={(value) => update("kuladevi", value)} />
        <TextInput label="Kuladevata" value={draft.kuladevata ?? ""} onChange={(value) => update("kuladevata", value)} />
        <TextInput label="Kulapurohit" value={draft.kulapurohit ?? ""} onChange={(value) => update("kulapurohit", value)} />
        <TextInput label="Gramadevata" value={draft.gramadevata ?? ""} onChange={(value) => update("gramadevata", value)} />
        <TextInput label="Native village" value={draft.nativeVillage ?? ""} onChange={(value) => update("nativeVillage", value)} />
        <TextInput label="Family surname" value={draft.familySurname ?? ""} onChange={(value) => update("familySurname", value)} />
      </div>
    </section>
  );
}

function CsvImporter({ treeId, request }: { treeId: string; request: ReturnType<typeof useLineage>["request"] }) {
  const [csv, setCsv] = React.useState(sampleCsv);
  const [preview, setPreview] = React.useState<ImportProposal | null>(null);
  async function previewCsv() {
    setPreview(await request("preview-csv", "/api/lineage/import/preview", { method: "POST", body: JSON.stringify({ treeId, csv }) }));
  }
  async function commitCsv() {
    await request("commit-csv", "/api/lineage/import/commit", { method: "POST", body: JSON.stringify({ treeId, csv }) });
    setPreview(null);
  }
  return (
    <section className="surface">
      <header className="surface-head">
        <div>
          <p className="eyebrow">Spreadsheet</p>
          <h2>CSV import</h2>
        </div>
        <button onClick={previewCsv}><Upload size={16} />Preview</button>
      </header>
      <textarea className="csv-box" value={csv} onChange={(event) => setCsv(event.target.value)} />
      {preview && (
        <div className="preview-box">
          <div className="preview-head">
            <strong>{preview.people.length} people detected</strong>
            <button className="primary-action" onClick={commitCsv}><Check size={16} />Commit import</button>
          </div>
          {preview.warnings.map((warning) => <p className="warning" key={warning}>{warning}</p>)}
          <div className="preview-list">
            {preview.people.slice(0, 8).map((person) => (
              <span key={person.clientKey}>{person.displayName}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function TelegramInbox({ treeId, proposals, request }: { treeId: string; proposals: Proposal[]; request: ReturnType<typeof useLineage>["request"] }) {
  const [sourceType, setSourceType] = React.useState<"telegram_text" | "telegram_voice" | "csv">("telegram_text");
  const [rawText, setRawText] = React.useState("My name is Arjun Deshpande. My father is Mahesh Deshpande. My mother is Kavita Deshpande. My grandfather was Ganesh Deshpande and grandmother was Sushila Deshpande. My wife is Priya Deshpande. Our gotra is Kashyap, Kuladevi is Tulja Bhavani, Gramadevata is Khandoba, my rashi is Vrischika.");
  async function createProposal() {
    await request("telegram-proposal", "/api/lineage/telegram", { method: "POST", body: JSON.stringify({ treeId, rawText, sourceType }) });
  }
  return (
    <section className="surface">
      <header className="surface-head">
        <div>
          <p className="eyebrow">Telegram and voice</p>
          <h2>Reviewable intake</h2>
        </div>
        <button onClick={createProposal}>{sourceType === "telegram_voice" ? <Mic size={16} /> : <MessageCircle size={16} />}Extract</button>
      </header>
      <div className="segmented">
        <button className={sourceType === "telegram_text" ? "active" : ""} onClick={() => setSourceType("telegram_text")}><MessageCircle size={15} />Text</button>
        <button className={sourceType === "telegram_voice" ? "active" : ""} onClick={() => setSourceType("telegram_voice")}><Mic size={15} />Voice transcript</button>
      </div>
      <textarea className="telegram-box" value={rawText} onChange={(event) => setRawText(event.target.value)} />
      <div className="proposal-list">
        {proposals.map((proposal) => (
          <article className="proposal" key={proposal.id}>
            <div>
              <strong>{proposal.proposal.people.length} proposed people</strong>
              <span>{proposal.status} - {proposal.sourceType.replace("_", " ")}</span>
            </div>
            <p>{proposal.rawText}</p>
            {proposal.proposal.warnings.map((warning) => <small key={warning}>{warning}</small>)}
            {proposal.status === "pending" && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                <button className="primary-action" onClick={() => request(`commit-${proposal.id}`, `/api/lineage/proposals/${proposal.id}/commit`, { method: "POST" })}>
                  <Check size={16} />Commit proposal
                </button>
                <button className="danger-action" onClick={() => request(`dismiss-${proposal.id}`, `/api/lineage/proposals/${proposal.id}/dismiss`, { method: "POST" })}>
                  <X size={16} />Dismiss
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function PersonDrawer({ person, people, spouses, canEdit, onClose, onEdit, onDelete, onLinkSpouse }: {
  person: Person;
  people: Person[];
  spouses: SpouseLink[];
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLinkSpouse: (spouseId: string) => void;
}) {
  const [spouseId, setSpouseId] = React.useState("");
  const peopleById = new Map(people.map((item) => [item.id, item]));
  const spouseNames = spouseNamesFor(person, peopleById, spouses);
  return (
    <aside className="detail-drawer">
      <button className="icon-only close-drawer" onClick={onClose}><X size={18} /></button>
      <div className={`drawer-avatar ${person.gender} ${person.lifeStatus}`}>{person.photoUrl ? <img src={person.photoUrl} alt="" /> : initials(person.displayName)}</div>
      <h2>{displayPersonName(person)}</h2>
      <p>{statusLabel(person)}</p>
      <div className="detail-grid">
        <span>Father</span><strong>{person.fatherId ? displayPersonName(peopleById.get(person.fatherId)) : "Unknown"}</strong>
        <span>Mother</span><strong>{person.motherId ? displayPersonName(peopleById.get(person.motherId)) : "Unknown"}</strong>
        <span>Spouse</span><strong>{spouseNames.join(", ") || "Not linked"}</strong>
        <span>DOB</span><strong>{person.dateOfBirth || "Unknown"}</strong>
        <span>DOD</span><strong>{person.dateOfDeath || "Not applicable"}</strong>
        <span>Anniversary</span><strong>{person.deathAnniversary || "Unknown"}</strong>
        <span>Rashi</span><strong>{person.rashi || "Unknown"}</strong>
        <span>Gotra</span><strong>{person.gotra || "Unknown"}</strong>
      </div>
      {person.notes && <p className="drawer-notes">{person.notes}</p>}
      <div className="drawer-actions">
        {canEdit ? (
          <>
            <button className="primary-action" onClick={onEdit}><UserRound size={16} />Edit person</button>
            <button className="danger-action" onClick={onDelete}><Trash2 size={16} />Delete person</button>
            <div className="inline-linker">
              <select value={spouseId} onChange={(event) => setSpouseId(event.target.value)}>
                <option value="">Select spouse</option>
                {people.filter((item) => item.id !== person.id).map((item) => <option key={item.id} value={item.id}>{displayPersonName(item)}</option>)}
              </select>
              <button disabled={!spouseId} onClick={() => { onLinkSpouse(spouseId); setSpouseId(""); }}><Heart size={16} /></button>
            </div>
          </>
        ) : (
          <p className="settings-note">Read-only access. Ask the tree owner for edit permission.</p>
        )}
      </div>
    </aside>
  );
}

function Overview({
  tree,
  people,
  spouses,
  onView,
  onAddPerson,
  canEdit
}: {
  tree: LineageTree;
  people: Person[];
  spouses: SpouseLink[];
  onView: (view: AppView) => void;
  onAddPerson: () => void;
  canEdit: boolean;
}) {
  const generations = new Set(generationMap(people, spouses).values());
  return (
    <section className="overview-grid">
      <div className="lineage-hero">
        <p className="eyebrow">Digital Vanshavali</p>
        <h1>{tree.name}</h1>
        <p>{tree.notes || "A private, structured family chronicle for lineage, identity, and family traditions."}</p>
        <div className="hero-actions">
          <button className="primary-action" onClick={() => onView("tree")}>Open family tree</button>
          {canEdit && <button onClick={onAddPerson}><Plus size={16} />Add member</button>}
        </div>
      </div>
      <div className="stat-grid">
        <span><Users size={18} /><strong>{people.length}</strong>People</span>
        <span><ChevronsUpDown size={18} /><strong>{generations.size}</strong>Generations</span>
        <span><Heart size={18} /><strong>{spouses.length}</strong>Marriages</span>
        <span><Baby size={18} /><strong>{people.filter((person) => person.fatherId || person.motherId).length}</strong>Child links</span>
      </div>
      <div className="tradition-strip">
        <div><span>Gotra</span><strong>{tree.gotra || "Not recorded"}</strong></div>
        <div><span>Kuladevi</span><strong>{tree.kuladevi || "Not recorded"}</strong></div>
        <div><span>Gramadevata</span><strong>{tree.gramadevata || "Not recorded"}</strong></div>
        <div><span>Native village</span><strong>{tree.nativeVillage || "Not recorded"}</strong></div>
      </div>
      <section className="surface">
        <header className="surface-head">
          <div>
            <p className="eyebrow">Recent records</p>
            <h2>Family members</h2>
          </div>
          <button onClick={() => onView("people")}>Manage people</button>
        </header>
        <div className="people-table">
          {people.slice(0, 8).map((person) => (
            <div key={person.id}>
              <span className={`person-dot ${person.gender} ${person.lifeStatus}`} />
              <strong>{displayPersonName(person)}</strong>
              <small>{statusLabel(person)}</small>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function PeopleDirectory({
  people,
  filteredPeople,
  spouses,
  onAddPerson,
  canEdit,
  onOpen,
  onEdit,
  onDelete
}: {
  people: Person[];
  filteredPeople: Person[];
  spouses: SpouseLink[];
  onAddPerson: () => void;
  canEdit: boolean;
  onOpen: (id: string) => void;
  onEdit: (person: Person) => void;
  onDelete: (person: Person) => void;
}) {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const generations = generationMap(people, spouses);
  const childCounts = new Map<string, number>();
  for (const person of people) {
    for (const parentId of [person.fatherId, person.motherId]) {
      if (!parentId) continue;
      childCounts.set(parentId, (childCounts.get(parentId) ?? 0) + 1);
    }
  }
  const grouped = new Map<number, Person[]>();
  for (const person of filteredPeople) {
    const generation = generations.get(person.id) ?? 0;
    grouped.set(generation, [...(grouped.get(generation) ?? []), person]);
  }
  const groups = [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .map(([generation, members]) => ({
      generation,
      members: [...members].sort((a, b) => displayPersonName(a).localeCompare(displayPersonName(b)))
    }));

  return (
    <section className="surface people-directory">
      <header className="surface-head">
        <div>
          <p className="eyebrow">Directory</p>
          <h2>{filteredPeople.length === people.length ? `${people.length} people` : `${filteredPeople.length} of ${people.length} people`}</h2>
        </div>
        {canEdit && <button className="primary-action" onClick={onAddPerson}><Plus size={16} />Add new person</button>}
      </header>
      <div className="generation-list">
        {groups.map(({ generation, members }) => (
          <section className="generation-group" key={generation}>
            <header className="generation-head">
              <div>
                <strong>Generation {generation + 1}</strong>
                <span>{generation === 0 ? "Oldest known ancestors and root records" : `Level ${generation + 1} in the lineage`}</span>
              </div>
              <small>{members.length} {members.length === 1 ? "person" : "people"}</small>
            </header>
            <div className="people-table">
              {members.map((person) => {
                const spouseNames = spouseNamesFor(person, peopleById, spouses);
                const childCount = childCounts.get(person.id) ?? 0;
                return (
                  <div className="person-row" key={person.id}>
                    <span className={`person-dot ${person.gender} ${person.lifeStatus}`} />
                    <div className="person-main">
                      <strong>{displayPersonName(person)}</strong>
                      <small>{statusLabel(person)}</small>
                    </div>
                    <div className="relationship-meta">
                      <span><CircleDot size={13} />Generation {generation + 1}</span>
                      <span>{parentSummary(person, peopleById)}</span>
                      <span><Heart size={13} />{spouseNames.length ? `Married to ${spouseNames.join(", ")}` : "Spouse not linked"}</span>
                      <span><Baby size={13} />{childCount} {childCount === 1 ? "child" : "children"} linked</span>
                    </div>
                    <div className="person-actions">
                      <button onClick={() => onOpen(person.id)}>Open</button>
                      {canEdit && <button onClick={() => onEdit(person)}><UserRound size={14} />Edit</button>}
                      {canEdit && <button className="danger-action" onClick={() => onDelete(person)}><Trash2 size={14} />Delete</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {!groups.length && (
          <div className="empty-directory">
            <strong>No matching people</strong>
            <span>Try another search or add a new family member.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function AccountSettings({
  session,
  state,
  request,
  onSessionChange,
  onTreeCreated
}: {
  session: Session;
  state: LineageState;
  request: ReturnType<typeof useLineage>["request"];
  onSessionChange: (session: Session) => void;
  onTreeCreated: (treeId: string) => void;
}) {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<"viewer" | "contributor" | "admin">("viewer");
  const [access, setAccess] = React.useState<TreeAccess | null>(null);
  const [inviteLink, setInviteLink] = React.useState("");
  const canManageAccess = state.activeRole === "owner" || state.activeRole === "admin";
  const activeTreeId = state.activeTreeId;

  React.useEffect(() => {
    if (!canManageAccess || !activeTreeId) {
      setAccess(null);
      return;
    }
    fetch(`/api/lineage/trees/${activeTreeId}/access`, {
      headers: { Authorization: `Bearer ${session.token}` }
    })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Could not load access list.");
        setAccess(json);
      })
      .catch(() => setAccess(null));
  }, [canManageAccess, activeTreeId, session.token]);

  async function changePassword() {
    setMessage("");
    try {
      const json = await request("change-password", "/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      onSessionChange({ ...session, account: json.account });
      setCurrentPassword("");
      setNewPassword("");
      setMessage(session.account.hasPassword ? "Password changed." : "Password set for this account.");
    } catch {
      setMessage("");
    }
  }

  async function createAdditionalTree() {
    const nextNumber = state.trees.length + 1;
    const body = {
      ...createEmptyTreeBody(session, "manual"),
      name: nextNumber === 2 ? `${session.account.name} Maternal Family Lineage` : `${session.account.name} Family Lineage ${nextNumber}`
    };
    const nextState = await request("create-tree", "/api/lineage/trees", {
      method: "POST",
      body: JSON.stringify(body)
    });
    if (nextState.activeTreeId) onTreeCreated(nextState.activeTreeId);
  }

  async function createInvite() {
    if (!activeTreeId) return;
    setMessage("");
    setInviteLink("");
    const response = await fetch(`/api/lineage/trees/${activeTreeId}/invites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`
      },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole })
    });
    const json = await response.json();
    if (!response.ok) {
      setMessage(json.error ?? "Could not create invite.");
      return;
    }
    setInviteLink(json.inviteUrl);
    setInviteEmail("");
    const accessResponse = await fetch(`/api/lineage/trees/${activeTreeId}/access`, {
      headers: { Authorization: `Bearer ${session.token}` }
    });
    if (accessResponse.ok) setAccess(await accessResponse.json());
  }

  return (
    <section className="account-layout">
      <section className="surface">
        <header className="surface-head">
          <div>
            <p className="eyebrow">Account</p>
            <h2>Profile and security</h2>
          </div>
        </header>
        <div className="account-summary">
          <div><span>Name</span><strong>{session.account.name}</strong></div>
          <div><span>Email</span><strong>{session.account.email}</strong></div>
          <div><span>Password</span><strong>{session.account.hasPassword ? "Enabled" : "Access code only"}</strong></div>
          <div><span>Role on active tree</span><strong>{state.activeRole ?? "None"}</strong></div>
          <div><span>Family trees</span><strong>{state.trees.length} of {session.maxTreesPerAccount}</strong></div>
        </div>
      </section>

      <section className="surface">
        <header className="surface-head">
          <div>
            <p className="eyebrow">Public view link</p>
            <h2>Share family tree</h2>
          </div>
        </header>
        <p className="settings-note">Anyone with this link can view this family tree in read-only mode without needing to sign in.</p>
        <div className="invite-form" style={{ gap: "12px", alignItems: "flex-end" }}>
          <label className="field" style={{ flex: 1, margin: 0 }}>
            <span>Family tree share link / Profile ID link</span>
            <input 
              readOnly 
              value={`${window.location.origin}/vamshavali/v/${activeTreeId}`} 
              onFocus={(event) => event.currentTarget.select()} 
            />
          </label>
          <button 
            className="primary-action" 
            style={{ height: "40px" }}
            onClick={() => {
              const url = `${window.location.origin}/vamshavali/v/${activeTreeId}`;
              navigator.clipboard.writeText(url);
              setMessage("Family tree link copied to clipboard.");
            }}
          >
            Copy link
          </button>
        </div>
      </section>
      <section className="surface">
        <header className="surface-head">
          <div>
            <p className="eyebrow">Family access</p>
            <h2>Invite family members</h2>
          </div>
        </header>
        {!canManageAccess && <p className="settings-note">Your role for this tree is {state.activeRole}. Only owners and admins can invite family members.</p>}
        {canManageAccess && (
          <>
            <div className="invite-form">
              <label className="field">
                <span>Email address</span>
                <input value={inviteEmail} placeholder="relative@example.com" onChange={(event) => setInviteEmail(event.target.value)} />
              </label>
              <label className="field">
                <span>Role</span>
                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "viewer" | "contributor" | "admin")}>
                  <option value="viewer">Viewer - read only</option>
                  <option value="contributor">Contributor - can edit lineage</option>
                  <option value="admin">Admin - can edit and invite</option>
                </select>
              </label>
              <button className="primary-action" disabled={!inviteEmail.trim()} onClick={createInvite}><Plus size={16} />Create invite link</button>
            </div>
            {inviteLink && (
              <label className="field invite-link-field">
                <span>Invite link for family members</span>
                <input readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} />
              </label>
            )}
            <div className="access-grid">
              <section>
                <h3>Members</h3>
                <div className="tree-list">
                  {(access?.members ?? []).map((member) => (
                    <div key={member.accountId}>
                      <strong>{member.name}</strong>
                      <span>{member.email} - {member.role}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3>Invites</h3>
                <div className="tree-list">
                  {(access?.invitations ?? []).map((invite) => (
                    <div key={invite.id}>
                      <strong>{invite.email}</strong>
                      <span>{invite.role} - {invite.status}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </section>
      <section className="surface">
        <header className="surface-head">
          <div>
            <p className="eyebrow">Password login</p>
            <h2>{session.account.hasPassword ? "Change password" : "Set password"}</h2>
          </div>
          <button className="primary-action" disabled={newPassword.length < 8 || (session.account.hasPassword && !currentPassword)} onClick={changePassword}>
            <KeyRound size={16} />Save password
          </button>
        </header>
        <div className="form-grid">
          {session.account.hasPassword && (
            <label className="field">
              <span>Current password</span>
              <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </label>
          )}
          <label className="field">
            <span>New password</span>
            <input type="password" value={newPassword} placeholder="Minimum 8 characters" onChange={(event) => setNewPassword(event.target.value)} />
          </label>
        </div>
        {message && <p className="busy">{message}</p>}
      </section>
      <section className="surface">
        <header className="surface-head">
          <div>
            <p className="eyebrow">Family trees</p>
            <h2>Tree allowance</h2>
          </div>
          <button
            className="primary-action"
            disabled={state.trees.length >= session.maxTreesPerAccount}
            onClick={createAdditionalTree}
          >
            <Plus size={16} />Create another tree
          </button>
        </header>
        <p className="settings-note">This account can create {session.maxTreesPerAccount} family trees.</p>
        <div className="tree-list">
          {state.trees.map((tree) => (
            <div key={tree.id}>
              <strong>{tree.name}</strong>
              <span>{tree.accountHolderName || "Account holder not recorded"}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function AppShell({
  session,
  isPublic = false,
  shareId,
  inviteMessage,
  onInviteMessageClear,
  onLogout,
  onSessionChange
}: {
  session: Session | null;
  isPublic?: boolean;
  shareId?: string;
  inviteMessage: string;
  onInviteMessageClear: () => void;
  onLogout: () => void;
  onSessionChange: (session: Session) => void;
}) {
  const lineage = useLineage(session, isPublic ? (shareId ?? null) : (session?.treeId ?? null), true, isPublic);
  const [view, setView] = React.useState<AppView>("overview");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [form, setForm] = React.useState<PersonForm>(emptyPersonForm);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isPersonEditorOpen, setIsPersonEditorOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  function handleTreeCreated(treeId: string) {
    if (!session) return;
    const next = { ...session, treeId };
    onSessionChange(next);
    setView("people");
    setIsMobileMenuOpen(false);
  }

  if (!lineage.state) {
    return <main className="loading-screen"><Users size={28} />Loading lineage...</main>;
  }

  if (!lineage.state.activeTreeId) {
    if (!session) return <main className="loading-screen"><Users size={28} />Family tree not found.</main>;
    return <Onboarding session={session} onTreeCreated={handleTreeCreated} request={lineage.request} onLogout={onLogout} />;
  }

  const tree = lineage.state.trees.find((item) => item.id === lineage.state!.activeTreeId) ?? lineage.state.trees[0];
  const canEdit = lineage.state.activeRole !== "viewer";
  const people = lineage.state.people;
  const spouses = lineage.state.spouses;
  const proposals = lineage.state.proposals;
  const selected = people.find((person) => person.id === selectedId) ?? null;
  const filteredPeople = search.trim()
    ? people.filter((person) => displayPersonName(person).toLowerCase().includes(search.toLowerCase()))
    : people;

  function spouseIdFor(personId: string) {
    const link = spouses.find((spouse) => spouse.personAId === personId || spouse.personBId === personId);
    return link ? (link.personAId === personId ? link.personBId : link.personAId) : "";
  }

  function personFormWithSpouse(person: Person): PersonForm {
    return { ...personToForm(person), spouseId: spouseIdFor(person.id) };
  }

  async function savePerson() {
    let savedPersonId = editingId;
    if (editingId) {
      await lineage.request("update-person", `/api/lineage/people/${editingId}`, { method: "PATCH", body: JSON.stringify(formToBody(form, tree.id)) });
    } else {
      const json = await lineage.request("create-person", "/api/lineage/people", { method: "POST", body: JSON.stringify(formToBody(form, tree.id)) });
      savedPersonId = json.person.id;
      setSelectedId(json.person.id);
    }
    if (savedPersonId && form.maritalStatus === "married" && form.spouseId) {
      await lineage.request("link-spouse", "/api/lineage/spouses", {
        method: "POST",
        body: JSON.stringify({ treeId: tree.id, personAId: savedPersonId, personBId: form.spouseId })
      });
    }
    setForm(emptyPersonForm);
    setEditingId(null);
    setIsPersonEditorOpen(false);
  }

  function addPerson() {
    setForm(emptyPersonForm);
    setEditingId(null);
    setSelectedId(null);
    setIsPersonEditorOpen(true);
    setView("people");
  }

  function cancelPersonEdit() {
    setForm(emptyPersonForm);
    setEditingId(null);
    setIsPersonEditorOpen(false);
  }

  function editSelected() {
    if (!selected) return;
    setForm(personFormWithSpouse(selected));
    setEditingId(selected.id);
    setSelectedId(null);
    setIsPersonEditorOpen(true);
    setView("people");
  }

  function editPerson(person: Person) {
    setForm(personFormWithSpouse(person));
    setEditingId(person.id);
    setSelectedId(null);
    setIsPersonEditorOpen(true);
    setView("people");
  }

  async function deletePerson(person: Person) {
    const confirmed = window.confirm(
      `Delete ${displayPersonName(person)} from this lineage? Their spouse links will be removed and child parent references to them will be cleared.`
    );
    if (!confirmed) return;
    await lineage.request("delete-person", `/api/lineage/people/${person.id}`, { method: "DELETE" });
    if (selectedId === person.id) setSelectedId(null);
    if (editingId === person.id) {
      setEditingId(null);
      setForm(emptyPersonForm);
      setIsPersonEditorOpen(false);
    }
  }

  function goHome() {
    setSelectedId(null);
    setEditingId(null);
    setForm(emptyPersonForm);
    setIsPersonEditorOpen(false);
    setView("overview");
    setIsMobileMenuOpen(false);
  }

  function navigate(nextView: AppView) {
    setView(nextView);
    setIsMobileMenuOpen(false);
  }

  return (
    <main className="product-shell">
      <header className="mobile-appbar">
        <button className="icon-only" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">
          <Menu size={21} />
        </button>
        <button className="brand-mark" onClick={goHome} aria-label="Go to overview home">
          <div className="brand-logo-container">
            <img 
              src="https://i.postimg.cc/McBQ2pVg/barnia-logo-120x120.png" 
              alt="Barnia Logo" 
              className="brand-logo-img"
              referrerPolicy="no-referrer"
            />
          </div>
          <strong>Vanshavali</strong>
        </button>
      </header>
      {isMobileMenuOpen && <button className="mobile-menu-backdrop" aria-label="Close menu" onClick={() => setIsMobileMenuOpen(false)} />}
      <aside className={`app-sidebar ${isMobileMenuOpen ? "open" : ""}`}>
        <button className="brand-mark" onClick={goHome} aria-label="Go to overview home">
          <div className="brand-logo-container">
            <img 
              src="https://i.postimg.cc/McBQ2pVg/barnia-logo-120x120.png" 
              alt="Barnia Logo" 
              className="brand-logo-img"
              referrerPolicy="no-referrer"
            />
          </div>
          <strong>Vanshavali</strong>
        </button>
        <nav>
          {[
            ["overview", HomeIcon, "Overview"],
            ["tree", Users, "Tree"],
            ["people", UserRound, "People"],
            ["traditions", Landmark, "Family Details"],
            ...(canEdit ? [["import", Upload, "Import"] as const] : []),
            ...(!isPublic ? [["account", KeyRound, "Account"] as const] : [])
          ].map(([key, Icon, label]) => (
            <button key={key as string} className={view === key ? "active" : ""} onClick={() => navigate(key as AppView)}>
              {React.createElement(Icon as typeof HomeIcon, { size: 17 })}
              {label as string}
            </button>
          ))}
        </nav>
        <button className="logout-button" onClick={onLogout}>
          <LogOut size={16} />{isPublic ? "Admin Log In" : "Sign out"}
        </button>
      </aside>

      <section className="app-main">
        <header className="app-topbar">
          <div>
            <p className="eyebrow">{isPublic ? "Public family archive" : "Private family archive"}</p>
            <h1>{tree.name}</h1>
          </div>
          <div className="topbar-tools">
            {!isPublic && session && lineage.state.trees.length > 1 && (
              <label className="tree-switcher">
                <span>Family tree</span>
                <select
                  value={tree.id || ""}
                  onChange={(event) => onSessionChange({ ...session, treeId: event.target.value })}
                >
                  {lineage.state.trees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            )}
            <div className="search-box">
              <Search size={17} />
              <input value={search} placeholder="Search family members" onChange={(event) => setSearch(event.target.value)} />
            </div>
            {!isPublic && session && (
              <button className="account-chip" onClick={() => setView("account")}><ShieldCheck size={15} />{session.account.email}</button>
            )}
            {isPublic && (
              <button className="account-chip" onClick={() => window.location.href = "/vamshavali"}><ShieldCheck size={15} />Log in</button>
            )}
          </div>
        </header>

        {lineage.error && <p className="error">{lineage.error}</p>}
        {lineage.busy && <p className="busy">Working on {lineage.busy}...</p>}

        {inviteMessage && <p className="busy invite-status" onClick={onInviteMessageClear}>{inviteMessage}</p>}
        {view === "overview" && <Overview tree={tree} people={people} spouses={spouses} onView={setView} onAddPerson={addPerson} canEdit={canEdit} />}
        {view === "tree" && (
          <section className="surface tree-surface">
            <header className="surface-head">
              <div>
                <p className="eyebrow">Bird's-eye lineage</p>
                <h2>Family tree</h2>
              </div>
              <div className="legend">
                <span className="legend-dot male" />Male
                <span className="legend-dot female" />Female
                <span className="legend-dot deceased" />Deceased
                <span className="legend-ring" />Married
              </div>
            </header>
            <FamilyTreeCanvas people={filteredPeople} spouses={spouses} selectedId={selectedId} onSelect={setSelectedId} />
          </section>
        )}
        {view === "people" && (
          <section className="people-layout">
            {isPersonEditorOpen && (
              <PersonEditor
                people={people}
                spouses={spouses}
                form={form}
                setForm={setForm}
                busy={Boolean(lineage.busy)}
                title={editingId ? "Edit family member" : "Add family member"}
                currentPersonId={editingId}
                onSubmit={savePerson}
                onCancel={cancelPersonEdit}
              />
            )}
            <PeopleDirectory
              people={people}
              filteredPeople={filteredPeople}
              spouses={spouses}
              onAddPerson={addPerson}
              canEdit={canEdit}
              onOpen={setSelectedId}
              onEdit={editPerson}
              onDelete={deletePerson}
            />
          </section>
        )}
        {view === "traditions" && <TraditionPanel tree={tree} request={lineage.request} busy={Boolean(lineage.busy)} canEdit={canEdit} />}
        {view === "import" && canEdit && (
          <section className="import-layout">
            <CsvImporter treeId={tree.id} request={lineage.request} />
            <TelegramInbox treeId={tree.id} proposals={proposals} request={lineage.request} />
          </section>
        )}
        {view === "account" && (
          <AccountSettings
            session={session}
            state={lineage.state}
            request={lineage.request}
            onSessionChange={onSessionChange}
            onTreeCreated={handleTreeCreated}
          />
        )}
      </section>

      {selected && (
        <PersonDrawer
          person={selected}
          people={people}
          spouses={spouses}
          canEdit={canEdit}
          onClose={() => setSelectedId(null)}
          onEdit={editSelected}
          onDelete={() => deletePerson(selected)}
          onLinkSpouse={(spouseId) => lineage.request("link-spouse", "/api/lineage/spouses", { method: "POST", body: JSON.stringify({ treeId: tree.id, personAId: selected.id, personBId: spouseId }) })}
        />
      )}
    </main>
  );
}

function App({ isPublic = false, shareId }: { isPublic?: boolean; shareId?: string }) {
  const [session, setSession] = React.useState<Session | null>(() => loadSession());
  const [inviteMessage, setInviteMessage] = React.useState("");

  function updateSession(next: Session | null) {
    if (isPublic) return;
    setSession(next);
    saveSession(next);
  }

  React.useEffect(() => {
    if (isPublic) return;
    const token = inviteTokenFromUrl();
    if (!session || !token) return;
    fetch("/api/invites/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`
      },
      body: JSON.stringify({ token })
    })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Could not accept invite.");
        updateSession({ ...session, treeId: json.activeTreeId ?? session.treeId });
        clearInviteTokenFromUrl();
        setInviteMessage("Family tree invite accepted.");
      })
      .catch((reason) => setInviteMessage((reason as Error).message));
  }, [session?.token, isPublic]);

  if (!session && !isPublic) {
    return <AuthScreen onAuth={(next) => updateSession(next)} />;
  }

  return (
    <AppShell
      session={session}
      isPublic={isPublic}
      shareId={shareId}
      inviteMessage={inviteMessage}
      onInviteMessageClear={() => setInviteMessage("")}
      onSessionChange={updateSession}
      onLogout={() => {
        if (isPublic) {
          window.location.href = "/vamshavali";
        } else {
          updateSession(null);
        }
      }}
    />
  );
}

export function VamshavaliPage({ isPublic = false }: { isPublic?: boolean }) {
  const { shareId } = useParams();
  return (
    <div className="vamshavali-theme min-h-screen">
      <App isPublic={isPublic} shareId={shareId} />
    </div>
  );
}
