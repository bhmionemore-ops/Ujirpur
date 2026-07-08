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
  ZoomOut,
  Download,
  Printer,
  Copy
} from "lucide-react";
import { toPng, toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import "../styles-vamshavali.css";
import { useLanguage } from "../LanguageContext";

type Gender = "male" | "female" | "other" | "unknown";
type LifeStatus = "living" | "deceased" | "unknown";
type MaritalStatus = "unmarried" | "married" | "widowed" | "divorced" | "separated" | "unknown";
type AppView = "overview" | "tree" | "people" | "traditions" | "import" | "account";

type Account = {
  id: string;
  email: string;
  name: string;
  hasPassword: boolean;
  language?: string;
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
  familyNumber: string | null;
  kuldeviPhoto: string | null;
  kuladevataPhoto: string | null;
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

function proxyUrl(url: string | null | undefined): string {
  if (!url) return "";
  const cleaned = url.trim();
  if (cleaned.startsWith("/") || cleaned.startsWith("data:")) return cleaned;
  return `/api/lineage/proxy-image?url=${encodeURIComponent(cleaned)}`;
}

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

const vamshavaliDict: Record<"en" | "bn" | "hi", Record<string, string>> = {
  en: {
    "Private family archive": "Private family archive",
    "Public family archive": "Public family archive",
    "Admin Log In": "Admin Log In",
    "Sign out": "Sign out",
    "Overview": "Overview",
    "Tree": "Tree",
    "People": "People",
    "Family Details": "Family Details",
    "Import": "Import",
    "Account": "Account",
    "Family tree": "Family tree",
    "Search family members": "Search family members",
    "Working on": "Working on",
    "Log in": "Log in",
    "Telegram AI Bot": "Telegram AI Bot",
    "Digital Vanshavali": "Digital Vanshavali",
    "A private, structured family chronicle for lineage, identity, and family traditions.": "A private, structured family chronicle for lineage, identity, and family traditions.",
    "Open family tree": "Open family tree",
    "Add member": "Add member",
    "Children": "Children",
    "Generations": "Generations",
    "Marriages": "Marriages",
    "Child links": "Child links",
    "Gotra": "Gotra",
    "Pravara": "Pravara",
    "Kuladevi": "Kuladevi",
    "Kuladevata": "Kuladevata",
    "Deity Blessings": "Deity Blessings",
    "Edit Deity info": "Edit Deity info",
    "Not set": "Not set",
    "Kulapurohit": "Kulapurohit",
    "Gramadevata": "Gramadevata",
    "Native village": "Native village",
    "Family surname": "Family surname",
    "Family number": "Family number",
    "Not recorded": "Not recorded",
    "Family No.": "Family No.",
    "Recent records": "Recent records",
    "Family members": "Family members",
    "Manage people": "Manage people",
    "Unknown": "Unknown",
    "Living": "Living",
    "Deceased": "Deceased",
    "Male": "Male",
    "Female": "Female",
    "Other": "Other",
    "Directory": "Directory",
    "people": "people",
    "of": "of",
    "Add new person": "Add new person",
    "Generation": "Generation",
    "Oldest known ancestors and root records": "Oldest known ancestors and root records",
    "Level": "Level",
    "in the lineage": "in the lineage",
    "person": "person",
    "Married to": "Married to",
    "Spouse not linked": "Spouse not linked",
    "child": "child",
    "children": "children",
    "linked": "linked",
    "Open": "Open",
    "Edit": "Edit",
    "Delete": "Delete",
    "No matching people": "No matching people",
    "Try another search or add a new family member.": "Try another search or add a new family member.",
    "Family record": "Family record",
    "Traditions and identity": "Traditions and identity",
    "Save details": "Save details",
    "Kuldevi/Kuladevata Deity Image": "Kuldevi/Kuladevata Deity Image",
    "Kuladevi Deity Image": "Kuladevi Image",
    "Kuladevata Deity Image": "Kuladevata Image",
    "Lineage name": "Lineage name",
    "Account holder": "Account holder",
    "Kuldevi/Kuladevata Photo URL": "Kuldevi/Kuladevata Photo URL",
    "Kuladevi Photo URL": "Kuladevi Photo URL",
    "Kuladevata Photo URL": "Kuladevata Photo URL",
    "Upload Kuldevi/Kuladevata Image": "Upload Kuldevi/Kuladevata Image",
    "Upload Kuldevi Image": "Upload Kuldevi Image",
    "Upload Kuladevata Image": "Upload Kuladevata Image",
    "Manual builder": "Manual builder",
    "Cancel": "Cancel",
    "Save person": "Save person",
    "Full name": "Full name",
    "Gender": "Gender",
    "Living status": "Living status",
    "Marital status": "Marital status",
    "Unmarried": "Unmarried",
    "Married": "Married",
    "Widowed": "Widowed",
    "Divorced": "Divorced",
    "Save details to link parents and spouses": "Save details to link parents and spouses",
    "Father": "Father",
    "Mother": "Mother",
    "Partner": "Partner",
    "Bio / Notes": "Bio / Notes",
    "Photo URL": "Photo URL",
    "Upload Photo": "Upload Photo",
    "Place of birth": "Place of birth",
    "Place of death": "Place of death",
    "Date of birth": "Date of birth",
    "Date of death": "Date of death",
    "Occupation": "Occupation",
    "Wife / spouse": "Wife / spouse",
    "Husband / spouse": "Husband / spouse",
    "Bird's-eye lineage": "Bird's-eye lineage",
    "Select a father first. Mother choices are based on his linked spouse records.": "Select a father first. Mother choices are based on his linked spouse records.",
    "No spouse is linked to the selected father yet.": "No spouse is linked to the selected father yet.",
    "Automatically selected from the father's linked spouse.": "Automatically selected from the father's linked spouse.",
    "Choose from the father's linked spouses.": "Choose from the father's linked spouses.",
    "Married daughters are shown as part of this family, but their husband and children should be maintained in the husband's family tree.": "Married daughters are shown as part of this family, but their husband and children should be maintained in the husband's family tree.",
    "Account settings": "Account settings",
    "Security": "Security",
    "Security & access": "Security & access",
    "Permissions": "Permissions",
    "Roles & permissions": "Roles & permissions",
    "Modify members and update details.": "Modify members and update details.",
    "Access code and user properties.": "Access code and user properties.",
    "Password setup": "Password setup",
    "Set a password for quicker future log-ins without access codes.": "Set a password for quicker future log-ins without access codes.",
    "Current password": "Current password",
    "New password": "New password",
    "Set password": "Set password",
    "Change password": "Change password",
    "Access management": "Access management",
    "Invite new family members to view or edit this tree.": "Invite new family members to view or edit this tree.",
    "Invite member": "Invite member",
    "Invite links": "Invite links",
    "Share the URL below with others to invite them as": "Share the URL below with others to invite them as",
    "Pending invites": "Pending invites",
    "Active members": "Active members",
    "Email": "Email",
    "Role": "Role",
    "Invited by": "Invited by",
    "Actions": "Actions",
    "No active invites": "No active invites",
    "No other members": "No other members",
    "Revoke": "Revoke",
    "Admin link": "Admin link",
    "Share this exact link with other family curators. Anyone with this link can modify the entire family lineage, so keep it safe!": "Share this exact link with other family curators. Anyone with this link can modify the entire family lineage, so keep it safe!",
    "Language Preference": "Language Preference",
    "Default language option": "Default language option",
    "Set default language": "Set default language",
    "Save Preference": "Save Preference",
    "Select role": "Select role",
    "Owner": "Owner",
    "Admin": "Admin",
    "Editor": "Editor",
    "Viewer": "Viewer",
    "Delete Tree": "Delete Tree",
    "Danger zone": "Danger zone",
    "Permanently delete this entire family tree, all people, and all historical records. This action cannot be undone!": "Permanently delete this entire family tree, all people, and all historical records. This action cannot be undone!",
    "Type 'DELETE' to confirm": "Type 'DELETE' to confirm",
    "Confirm permanent deletion": "Confirm permanent deletion",
    "Import lineage records": "Import lineage records",
    "AI scribe & CSV import": "AI scribe & CSV import",
    "Paste spreadsheet CSV or type a custom natural text listing to instantly populate or expand your family tree.": "Paste spreadsheet CSV or type a custom natural text listing to instantly populate or expand your family tree.",
    "CSV Spreadsheet Import": "CSV Spreadsheet Import",
    "AI Lineage Bot Scribe": "AI Lineage Bot Scribe",
    "Paste raw comma-separated values (CSV)...": "Paste raw comma-separated values (CSV)...",
    "Preview CSV": "Preview CSV",
    "Commit CSV to Tree": "Commit CSV to Tree",
    "Type natural text describing the family layout...": "Type natural text describing the family layout...",
    "e.g., 'Aarav Sharma born 1970 married Ananya. They have two children Rohan born 1995 and Diya born 1998.'": "e.g., 'Aarav Sharma born 1970 married Ananya. They have two children Rohan born 1995 and Diya born 1998.'",
    "Submit to Scribe": "Submit to Scribe",
    "Pending AI additions": "Pending AI additions",
    "The AI Bot proposed the following structural changes. Review and apply or dismiss them.": "The AI Bot proposed the following structural changes. Review and apply or dismiss them.",
    "Add": "Add",
    "Link": "Link",
    "as wife of": "as wife of",
    "as husband of": "as husband of",
    "as child of": "as child of",
    "Apply proposal": "Apply proposal",
    "Dismiss": "Dismiss",
    "No pending proposals": "No pending proposals",
    "High-Res PNG": "High-Res PNG",
    "High-Res JPEG": "High-Res JPEG",
    "PDF Document": "PDF Document",
    "Print Layout": "Print Layout",
    "Fit tree": "Fit tree",
    "Zoom out": "Zoom out",
    "Zoom in": "Zoom in",
    "Export or print family tree": "Export or print family tree",
    "Export Tree": "Export Tree",
    "Failed to export family tree. Please try again.": "Failed to export family tree. Please try again.",
    "No family members yet": "No family members yet",
    "Add the account holder or import a CSV to begin the lineage map.": "Add the account holder or import a CSV to begin the lineage map.",
    "Could Not Load Family Tree": "Could Not Load Family Tree",
    "Retry": "Retry",
    "Log Out": "Log Out",
    "Loading lineage...": "Loading lineage...",
    "Family tree not found.": "Family tree not found.",
    "Generation {0}": "Generation {0}",
    "Level {0} in the lineage": "Level {0} in the lineage",
    "{0} people": "{0} people",
    "{0} of {1} people": "{0} of {1} people",
    "Married to {0}": "Married to {0}",
    "{0} child": "{0} child",
    "{0} children": "{0} children",
    "{0} child linked": "{0} child linked",
    "{0} children linked": "{0} children linked",
    "Late {0}": "Late {0}",
    "Child of {0} and {1}": "Child of {0} and {1}",
    "Child of {0}": "Child of {0}",
    "Oldest known / parent link not recorded": "Oldest known / parent link not recorded",
    "Profile and security": "Profile and security",
    "Name": "Name",
    "Role on active tree": "Role on active tree",
    "Family trees": "Family trees",
    "Public view link": "Public view link",
    "Share family tree": "Share family tree",
    "Anyone with this link can view this family tree in read-only mode without needing to sign in.": "Anyone with this link can view this family tree in read-only mode without needing to sign in.",
    "Family tree share link / Profile ID link": "Family tree share link / Profile ID link",
    "Copy link": "Copy link",
    "Family access": "Family access",
    "Invite family members": "Invite family members",
    "Your role for this tree is {0}. Only owners and admins can invite family members.": "Your role for this tree is {0}. Only owners and admins can invite family members.",
    "Email address": "Email address",
    "Viewer - read only": "Viewer - read only",
    "Contributor - can edit lineage": "Contributor - can edit lineage",
    "Admin - can edit and invite": "Admin - can edit and invite",
    "Create invite link": "Create invite link",
    "Invite link for family members": "Invite link for family members",
    "Members": "Members",
    "Invites": "Invites",
    "Password login": "Password login",
    "Save password": "Save password",
    "Minimum 8 characters": "Minimum 8 characters",
    "Tree allowance": "Tree allowance",
    "Create another tree": "Create another tree",
    "This account can create {0} family trees.": "This account can create {0} family trees.",
    "Account holder not recorded": "Account holder not recorded",
    "Spreadsheet": "Spreadsheet",
    "CSV import": "CSV import",
    "Preview": "Preview",
    "{0} people detected": "{0} people detected",
    "Commit import": "Commit import",
    "Telegram and voice": "Telegram and voice",
    "Reviewable intake": "Reviewable intake",
    "Extract": "Extract",
    "Text": "Text",
    "Voice transcript": "Voice transcript",
    "{0} proposed people": "{0} proposed people",
    "Commit proposal": "Commit proposal",
    "Read-only access. Ask the tree owner for edit permission.": "Read-only access. Ask the tree owner for edit permission.",
    "Select spouse": "Select spouse",
    "Edit person": "Edit person",
    "Delete person": "Delete person",
    "Family Number: {0}": "Family Number: {0}",
    "Gotra:": "Gotra:",
    "Pravara:": "Pravara:",
    "Kuladevi:": "Kuladevi:",
    "Kuladevata:": "Kuladevata:",
    "DOB": "DOB",
    "DOD": "DOD",
    "Anniversary": "Anniversary",
    "Rashi": "Rashi",
    "Kuldevi/Kuladevata Deity": "Kuldevi/Kuladevata Deity",
    "Back to Home": "Back to Home",
    "Barnali Telegram AI Bot": "Barnali Telegram AI Bot",
    "Preserve Your Roots, Grow Your Legacy.": "Preserve Your Roots, Grow Your Legacy.",
    "A digital Vanshavali for family history, spiritual identity, and verified lineage records.": "A digital Vanshavali for family history, spiritual identity, and verified lineage records.",
    "Historical Identity": "Historical Identity",
    "Keep Gotra, Kuladevata, village, and elder records together.": "Keep Gotra, Kuladevata, village, and elder records together.",
    "Lineage Mapping": "Lineage Mapping",
    "Connect ancestors, spouses, children, and branches clearly.": "Connect ancestors, spouses, children, and branches clearly.",
    "Private Legacy": "Private Legacy",
    "Your family archive stays visible only to invited members.": "Your family archive stays visible only to invited members.",
    "Secure access": "Secure access",
    "Sign in to view an existing lineage, or create a new account to begin a family record.": "Sign in to view an existing lineage, or create a new account to begin a family record.",
    "You have a family tree invite. Sign in or create an account with the invited email to accept it.": "You have a family tree invite. Sign in or create an account with the invited email to accept it.",
    "Access code": "Access code",
    "Password": "Password",
    "Account holder name": "Account holder name",
    "Generate access code": "Generate access code",
    "Verify and sign in": "Verify and sign in",
    "Sign in with password": "Sign in with password",
    "Create account": "Create account",
    "New to digital lineage?": "New to digital lineage?",
    "Use existing account": "Use existing account",
    "Create your own account": "Create your own account",
    "Privacy first: your data is only visible to people you invite.": "Privacy first: your data is only visible to people you invite.",
    "Delete {0} from this lineage? Their spouse links will be removed and child parent references to them will be cleared.": "Delete {0} from this lineage? Their spouse links will be removed and child parent references to them will be cleared.",
    "Working on {0}...": "Working on {0}...",
    "Edit family member": "Edit family member",
    "Add family member": "Add family member"
  },
  bn: {
    "Private family archive": "ব্যক্তিগত পারিবারিক সংরক্ষণাগার",
    "Public family archive": "পাবলিক পারিবারিক সংরক্ষণাগার",
    "Admin Log In": "অ্যাডমিন লগ ইন",
    "Sign out": "লগ আউট",
    "Overview": "ওভারভিউ",
    "Tree": "গাছ",
    "People": "মানুষ",
    "Family Details": "পারিবারিক বিবরণ",
    "Import": "ইম্পোর্ট",
    "Account": "অ্যাকাউন্ট",
    "Family tree": "পারিবারিক গাছ",
    "Search family members": "পরিবারের সদস্য অনুসন্ধান করুন",
    "Working on": "কাজ চলছে",
    "Log in": "লগ ইন",
    "Telegram AI Bot": "টেলিগ্রাম এআই বট",
    "Digital Vanshavali": "ডিজিটাল বংশাবলী",
    "A private, structured family chronicle for lineage, identity, and family traditions.": "বংশধারা, পরিচয় এবং পারিবারিক ঐতিহ্যের জন্য একটি ব্যক্তিগত, সুগঠিত পারিবারিক ইতিহাস সংরক্ষণাগার।",
    "Open family tree": "পারিবারিক গাছ খুলুন",
    "Add member": "সদস্য যোগ করুন",
    "Children": "সন্তান",
    "Generations": "প্রজন্ম",
    "Marriages": "বিবাহ",
    "Child links": "সন্তান লিঙ্ক",
    "Gotra": "গোত্র",
    "Pravara": "প্রবর",
    "Kuladevi": "কুলদেবী",
    "Kuladevata": "কুলদেবতা",
    "Deity Blessings": "দেবতার আশীর্বাদ",
    "Edit Deity info": "দেবতার তথ্য সম্পাদনা",
    "Not set": "নির্ধারিত নেই",
    "Kulapurohit": "কুলপুরোহিত",
    "Gramadevata": "গ্রামদেবতা",
    "Native village": "মূল গ্রাম",
    "Family surname": "পারিবারিক উপাধি",
    "Family number": "পরিবার নম্বর",
    "Not recorded": "নথিভুক্ত নয়",
    "Family No.": "পরিবার নম্বর",
    "Recent records": "সাম্প্রতিক রেকর্ড",
    "Family members": "পরিবারের সদস্যবৃন্দ",
    "Manage people": "সদস্য পরিচালনা করুন",
    "Unknown": "অজানা",
    "Living": "জীবিত",
    "Deceased": "প্রয়াত",
    "Male": "পুরুষ",
    "Female": "মহিলা",
    "Other": "অন্যান্য",
    "Directory": "ডিরেক্টরি",
    "people": "জন মানুষ",
    "of": "জনের মধ্যে",
    "Add new person": "নতুন সদস্য যোগ করুন",
    "Generation": "প্রজন্ম",
    "Oldest known ancestors and root records": "সবচেয়ে প্রাচীন জ্ঞাত পূর্বপুরুষ এবং মূল রেকর্ডসমূহ",
    "Level": "ধাপ",
    "in the lineage": "বংশের মধ্যে",
    "person": "জন",
    "Married to": "বিবাহ বন্ধনে আবদ্ধ",
    "Spouse not linked": "জীবনসঙ্গী লিঙ্ক করা নেই",
    "child": "টি সন্তান",
    "children": "টি সন্তান",
    "linked": "সংযুক্ত",
    "Open": "খুলুন",
    "Edit": "এডিট করুন",
    "Delete": "মুছে ফেলুন",
    "No matching people": "কোনো সদস্য মিলছে না",
    "Try another search or add a new family member.": "অন্য উপায়ে অনুসন্ধান করুন অথবা নতুন সদস্য যোগ করুন।",
    "Family record": "পারিবারিক রেকর্ড",
    "Traditions and identity": "ঐতিহ্য ও পরিচয়",
    "Save details": "বিবরণ সংরক্ষণ করুন",
    "Kuldevi/Kuladevata Deity Image": "কুলদেবী/কুলদেবতার ছবি",
    "Kuladevi Deity Image": "কুলদেবী ছবি",
    "Kuladevata Deity Image": "কুলদেবতা ছবি",
    "Lineage name": "বংশাবলীর নাম",
    "Account holder": "অ্যাকাউন্ট ধারক",
    "Kuldevi/Kuladevata Photo URL": "কুলদেবী/কুলদেবতার ছবির URL",
    "Kuladevi Photo URL": "কুলদেবী ছবির URL",
    "Kuladevata Photo URL": "কুলদেবতা ছবির URL",
    "Upload Kuldevi/Kuladevata Image": "কুলদেবী/কুলদেবতার ছবি আপলোড করুন",
    "Upload Kuldevi Image": "কুলদেবী ছবি আপলোড করুন",
    "Upload Kuladevata Image": "কুলদেবতা ছবি আপলোড করুন",
    "Manual builder": "ম্যানুয়াল বিল্ডার",
    "Cancel": "বাতিল",
    "Save person": "সদস্য সংরক্ষণ করুন",
    "Full name": "পূর্ণ নাম",
    "Gender": "লিঙ্গ",
    "Living status": "জীবিত বা প্রয়াত অবস্থা",
    "Marital status": "বৈবাহিক অবস্থা",
    "Unmarried": "অবিবাহিত",
    "Married": "বিবাহিত",
    "Widowed": "বিপত্নীক/বিধবা",
    "Divorced": "তালাকপ্রাপ্ত",
    "Save details to link parents and spouses": "পিতামাতা এবং পত্নী লিঙ্ক করতে বিশদ বিবরণ সংরক্ষণ করুন",
    "Father": "বাবা",
    "Mother": "মা",
    "Partner": "জীবনসঙ্গী",
    "Bio / Notes": "জীবনী / নোট",
    "Photo URL": "ছবির URL",
    "Upload Photo": "ছবি আপলোড করুন",
    "Place of birth": "জন্মস্থান",
    "Place of death": "মৃত্যুস্থান",
    "Date of birth": "জন্মতারিখ",
    "Date of death": "মৃত্যুতারিখ",
    "Occupation": "পেশা",
    "Wife / spouse": "স্ত্রী / পত্নী",
    "Husband / spouse": "স্বামী / পতি",
    "Bird's-eye lineage": "একনজরে বংশাবলী ধারা",
    "Select a father first. Mother choices are based on his linked spouse records.": "প্রথমে একজন বাবা নির্বাচন করুন। মায়ের বিকল্পগুলি তার সংযুক্ত পত্নীর রেকর্ডের উপর ভিত্তি করে নির্ধারিত হয়।",
    "No spouse is linked to the selected father yet.": "নির্বাচিত বাবার সাথে এখনও কোনো পত্নী সংযুক্ত করা হয়নি।",
    "Automatically selected from the father's linked spouse.": "বাবার সংযুক্ত পত্নী থেকে স্বয়ংক্রিয়ভাবে নির্বাচিত করা হয়েছে।",
    "Choose from the father's linked spouses.": "বাবার সংযুক্ত পত্নীদের মধ্য থেকে বেছে নিন।",
    "Married daughters are shown as part of this family, but their husband and children should be maintained in the husband's family tree.": "বিবাহিত কন্যাদের এই পরিবারের অংশ হিসাবে দেখানো হয়, তবে তাদের স্বামী এবং সন্তানদের স্বামীর পারিবারিক বংশাবলীতে রক্ষা করা উচিত।",
    "Account settings": "অ্যাকাউন্ট সেটিংস",
    "Security": "নিরাপত্তা",
    "Security & access": "নিরাপত্তা ও অ্যাক্সেস",
    "Permissions": "অনুমতি",
    "Roles & permissions": "ভূমিকা ও অনুমতি",
    "Modify members and update details.": "সদস্যদের সংশোধন করুন এবং বিবরণ আপডেট করুন।",
    "Access code and user properties.": "অ্যাক্সেস কোড এবং ব্যবহারকারীর বৈশিষ্ট্য।",
    "Password setup": "পাসওয়ার্ড সেটআপ",
    "Set a password for quicker future log-ins without access codes.": "ভবিষ্যতে অ্যাক্সেস কোড ছাড়াই দ্রুত লগ-ইন করতে একটি পাসওয়ার্ড সেট করুন।",
    "Current password": "বর্তমান পাসওয়ার্ড",
    "New password": "নতুন পাসওয়ার্ড",
    "Set password": "পাসওয়ার্ড সেট করুন",
    "Change password": "পাসওয়ার্ড পরিবর্তন করুন",
    "Access management": "অ্যাক্সেস ম্যানেজমেন্ট",
    "Invite new family members to view or edit this tree.": "এই গাছটি দেখতে বা সম্পাদনা করতে পরিবারের নতুন সদস্যদের আমন্ত্রণ জানান।",
    "Invite member": "সদস্যকে আমন্ত্রণ জানান",
    "Invite links": "আমন্ত্রণ লিঙ্কসমূহ",
    "Share the URL below with others to invite them as": "অন্যদের এই ভূমিকায় আমন্ত্রণ জানাতে নিচের URL-টি ভাগ করুন:",
    "Pending invites": "অপেক্ষমাণ আমন্ত্রণসমূহ",
    "Active members": "সক্রিয় সদস্যবৃন্দ",
    "Email": "ইমেল",
    "Role": "ভূমিকা",
    "Invited by": "আমন্ত্রণকারী",
    "Actions": "পদক্ষেপ",
    "No active invites": "কোনো সক্রিয় আমন্ত্রণ নেই",
    "No other members": "অন্য কোনো সদস্য নেই",
    "Revoke": "বাতিল করুন",
    "Admin link": "অ্যাডমিন লিঙ্ক",
    "Share this exact link with other family curators. Anyone with this link can modify the entire family lineage, so keep it safe!": "অন্যান্য পারিবারিক নির্বাহীদের সাথে ঠিক এই লিঙ্কটি শেয়ার করুন। এই লিঙ্কটি যার কাছে থাকবে সে পুরো পরিবার গাছটি পরিবর্তন করতে পারবে, তাই এটি নিরাপদ রাখুন!",
    "Language Preference": "ভাষা পছন্দ",
    "Default language option": "ডিফল্ট ভাষা অপশন",
    "Set default language": "ডিফল্ট ভাষা সেট করুন",
    "Save Preference": "পছন্দ সংরক্ষণ করুন",
    "Select role": "ভূমিকা নির্বাচন করুন",
    "Owner": "মালিক (Owner)",
    "Admin": "অ্যাডমিন (Admin)",
    "Editor": "সম্পাদক (Editor)",
    "Viewer": "দর্শক (Viewer)",
    "Delete Tree": "গাছ মুছে ফেলুন",
    "Danger zone": "ঝুঁকিপূর্ণ এলাকা",
    "Permanently delete this entire family tree, all people, and all historical records. This action cannot be undone!": "স্থায়ীভাবে এই পুরো পরিবার গাছ, সমস্ত মানুষ এবং সব ঐতিহাসিক রেকর্ড মুছে ফেলুন। এই পদক্ষেপটি ফিরিয়ে নেওয়া সম্ভব নয়!",
    "Type 'DELETE' to confirm": "নিশ্চিত করতে 'DELETE' লিখুন",
    "Confirm permanent deletion": "স্থায়ী মুছে ফেলার বিষয়টি নিশ্চিত করুন",
    "Import lineage records": "বংশাবলী রেকর্ড আমদানি করুন",
    "AI scribe & CSV import": "AI লিপিকার এবং CSV আমদানি",
    "Paste spreadsheet CSV or type a custom natural text listing to instantly populate or expand your family tree.": "স্প্রেডশীট CSV পেস্ট করুন বা আপনার সামাজিক পরিবার গাছটি তাৎক্ষণিকভাবে পূরণ বা প্রসারিত করতে একটি কাস্টম স্বাভাবিক পাঠ্য তালিকা টাইপ করুন।",
    "CSV Spreadsheet Import": "স্প্রেডশীট CSV আমদানি",
    "AI Lineage Bot Scribe": "এআই বংশাবলী লিপিকার",
    "Paste raw comma-separated values (CSV)...": "কমা-বিভাজিত মান (CSV) পেস্ট করুন...",
    "Preview CSV": "CSV প্রিভিউ করুন",
    "Commit CSV to Tree": "গাছে CSV যুক্ত করুন",
    "Type natural text describing the family layout...": "পারিবারিক কাঠামো বর্ণনা করে স্বাভাবিক পাঠ্য টাইপ করুন...",
    "e.g., 'Aarav Sharma born 1970 married Ananya. They have two children Rohan born 1995 and Diya born 1998.'": "যেমন, 'আরভ শর্মা ১৯৭০ সালে জন্মগ্রহণ করেন এবং অনন্যাকে বিয়ে করেন। তাদের দুই সন্তান ১৯৯৫ সালে জন্মগ্রহণকারী রোহন এবং ১৯৯৮ সালে জন্মগ্রহণকারী দিয়া।'",
    "Submit to Scribe": "লিপিকারে জমা দিন",
    "Pending AI additions": "অপেক্ষমান এআই সংযোজন",
    "The AI Bot proposed the following structural changes. Review and apply or dismiss them.": "এআই বট নিচের কাঠামোগत পরিবর্তনগুলির প্রস্তাব করেছে। সেগুলি পর্যালোচনা করে প্রযোগ করুন বা খারিজ করুন।",
    "Add": "যুক্ত করুন",
    "Link": "লিঙ্ক করুন",
    "as wife of": "এর স্ত্রী হিসাবে",
    "as husband of": "এর স্বামী হিসেবে",
    "as child of": "এর সন্তান হিসাবে",
    "Apply proposal": "প্রস্তাব প্রয়োগ করুন",
    "Dismiss": "খারিজ করুন",
    "No pending proposals": "কোনো অপেক্ষমান প্রস্তাব নেই",
    "High-Res PNG": "উচ্চ-রেজোলিউশন PNG",
    "High-Res JPEG": "উচ্চ-রেজোলিউশন JPEG",
    "PDF Document": "PDF ডকুমেন্ট",
    "Print Layout": "প্রিন্ট লেআউট",
    "Fit tree": "ফিট ট্রি",
    "Zoom out": "জুম আউট",
    "Zoom in": "জুম ইন",
    "Export or print family tree": "পরিবার গাছ এক্সপোর্ট বা প্রিন্ট করুন",
    "Export Tree": "গাছ এক্সপোর্ট করুন",
    "Failed to export family tree. Please try again.": "পরিবার গাছ এক্সপোর্ট করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    "No family members yet": "এখনও কোনো পরিবারের সদস্য নেই",
    "Add the account holder or import a CSV to begin the lineage map.": "বংশাবলী মানচিত্র শুরু করতে অ্যাকাউন্ট মালিককে যোগ করুন অথবা একটি CSV ইম্পোর্ট করুন।",
    "Could Not Load Family Tree": "পারিবারিক গাছ লোড করা যায়নি",
    "Retry": "পুনরায় চেষ্টা করুন",
    "Log Out": "লগ আউট",
    "Loading lineage...": "বংশাবলী লোড হচ্ছে...",
    "Family tree not found.": "পারিবারিক গাছ পাওয়া যায়নি।",
    "Generation {0}": "{0} নম্বর প্রজন্ম",
    "Level {0} in the lineage": "বংশধারার {0} নম্বর স্তর",
    "{0} people": "{0} জন মানুষ",
    "{0} of {1} people": "{1} জনের মধ্যে {0} জন",
    "Married to {0}": "{0}-এর সাথে বিবাহিত",
    "{0} child": "{0}টি সন্তান",
    "{0} children": "{0}টি সন্তান",
    "{0} child linked": "{0}টি সন্তান সংযুক্ত",
    "{0} children linked": "{0}টি সন্তান সংযুক্ত",
    "Late {0}": "প্রয়াত {0}",
    "Child of {0} and {1}": "{0} এবং {1}-এর সন্তান",
    "Child of {0}": "{0}-এর সন্তান",
    "Oldest known / parent link not recorded": "সবচেয়ে প্রাচীন পূর্বপুরুষ / পিতামাতার লিঙ্ক নথিভুক্ত নেই",
    "Profile and security": "প্রোফাইল এবং নিরাপত্তা",
    "Name": "নাম",
    "Role on active tree": "সক্রিয় গাছের ভূমিকা",
    "Family trees": "পারিবারিক গাছসমূহ",
    "Public view link": "পাবলিক ভিউ লিঙ্ক",
    "Share family tree": "পরিবার গাছ শেয়ার করুন",
    "Anyone with this link can view this family tree in read-only mode without needing to sign in.": "যেকোনো ব্যক্তি এই লিঙ্কের মাধ্যমে কোনো সাইন ইন ছাড়াই শুধুমাত্র গাছটি দেখতে পারবেন।",
    "Family tree share link / Profile ID link": "পারিবারিক গাছ শেয়ার লিঙ্ক",
    "Copy link": "লিঙ্ক কপি করুন",
    "Family access": "পারিবারিক অ্যাক্সেস",
    "Invite family members": "পরিবারের সদস্যদের আমন্ত্রণ জানান",
    "Your role for this tree is {0}. Only owners and admins can invite family members.": "এই গাছে আপনার ভূমিকা হচ্ছে {0}। শুধুমাত্র মালিক এবং অ্যাডমিনরা নতুন সদস্যদের আমন্ত্রণ জানাতে পারেন।",
    "Email address": "ইমেল ঠিকানা",
    "Viewer - read only": "ভিউয়ার - শুধুমাত্র দেখার অনুমতি",
    "Contributor - can edit lineage": "অবদানকারী - বংশধারা সম্পাদনা করতে পারেন",
    "Admin - can edit and invite": "অ্যাডমিন - সম্পাদনা এবং আমন্ত্রণ জানাতে পারেন",
    "Create invite link": "আমন্ত্রণ লিঙ্ক তৈরি করুন",
    "Invite link for family members": "পরিবারের সদস্যদের আমন্ত্রণ লিঙ্ক",
    "Members": "সদস্যবৃন্দ",
    "Invites": "আমন্ত্রণসমূহ",
    "Password login": "পাসওয়ার্ড লগইন",
    "Save password": "পাসওয়ার্ড সংরক্ষণ করুন",
    "Minimum 8 characters": "সর্বনিম্ন ৮ টি অক্ষর",
    "Tree allowance": "গাছ ভাতা",
    "Create another tree": "আরেকটি গাছ তৈরি করুন",
    "This account can create {0} family trees.": "এই অ্যাকাউন্টটি {0} টি পারিবারিক গাছ তৈরি করতে পারবে।",
    "Account holder not recorded": "অ্যাকাউন্ট ধারক নথিভুক্ত নেই",
    "Spreadsheet": "স্প্রেডশীট",
    "CSV import": "CSV আমদানি",
    "Preview": "প্রিভিউ",
    "{0} people detected": "{0} জন সদস্য সনাক্ত হয়েছে",
    "Commit import": "আমদানি সম্পন্ন করুন",
    "Telegram and voice": "টেলিগ্রাম এবং ভয়েস",
    "Reviewable intake": "পর্যালোচনা প্রক্রিয়া",
    "Extract": "উদ্ধার করুন",
    "Text": "টেক্সট",
    "Voice transcript": "ভয়েস প্রতিলিপি",
    "{0} proposed people": "{0} জন প্রস্তাবিত সদস্য",
    "Commit proposal": "প্রস্তাব সম্পন্ন করুন",
    "Read-only access. Ask the tree owner for edit permission.": "শুধুমাত্র দেখার অনুমতি। সম্পাদনার অনুমতির জন্য গাছের মালিককে জিজ্ঞাসা করুন।",
    "Select spouse": "স্ত্রী/স্বামী নির্বাচন করুন",
    "Edit person": "সদস্য সম্পাদনা করুন",
    "Delete person": "সদস্য মুছে ফেলুন",
    "Family Number: {0}": "পরিবার নম্বর: {0}",
    "Gotra:": "গোত্র:",
    "Pravara:": "প্রবর:",
    "Kuladevi:": "কুলদেবী:",
    "Kuladevata:": "কুলদেবতা:",
    "DOB": "জন্মতারিখ",
    "DOD": "মৃত্যুতারিখ",
    "Anniversary": "বার্ষিকী",
    "Rashi": "রাশি",
    "Kuldevi/Kuladevata Deity": "কুলদেবী/কুলদেবতা দেবতা",
    "Back to Home": "হোম পেজে ফিরে যান",
    "Barnali Telegram AI Bot": "বর্ণালী টেলিগ্রাম এআই বট",
    "Preserve Your Roots, Grow Your Legacy.": "আপনার শিকড় সংরক্ষণ করুন, আপনার ঐতিহ্যকে সমৃদ্ধ করুন।",
    "A digital Vanshavali for family history, spiritual identity, and verified lineage records.": "পারিবারিক ইতিহাস, আধ্যাত্মিক পরিচয় এবং যাচাইকৃত বংশপরিচয়ের জন্য একটি ডিজিটাল বংশাবলী।",
    "Historical Identity": "ঐতিহাসিক পরিচয়",
    "Keep Gotra, Kuladevata, village, and elder records together.": "গোত্র, কুলদেবতা, গ্রাম এবং প্রবীণদের রেকর্ড একসাথে রাখুন।",
    "Lineage Mapping": "বংশানুক্রমিক চিত্র",
    "Connect ancestors, spouses, children, and branches clearly.": "পূর্বপুরুষ, পত্নী, সন্তান এবং শাখা স্পষ্টভাবে সংযুক্ত করুন।",
    "Private Legacy": "ব্যক্তিগত উত্তরাধিকার",
    "Your family archive stays visible only to invited members.": "আপনার পারিবারিক আর্কাইভ শুধুমাত্র আমন্ত্রিত সদস্যদের কাছে দৃশ্যমান থাকে।",
    "Secure access": "নিরাপদ অ্যাক্সেস",
    "Sign in to view an existing lineage, or create a new account to begin a family record.": "একটি বিদ্যমান বংশ তালিকা দেখতে সাইন ইন করুন, অথবা একটি নতুন পারিবারিক রেকর্ড শুরু করতে একটি নতুন অ্যাকাউন্ট তৈরি করুন।",
    "You have a family tree invite. Sign in or create an account with the invited email to accept it.": "আপনার একটি পারিবারিক গ্রুপ বা বংশতালিকায় আমন্ত্রণ রয়েছে। এটি গ্রহণ করতে অনুগ্রহ করে আমন্ত্রিত ইমেল দিয়ে সাইন ইন করুন বা নতুন অ্যাকাউন্ট তৈরি করুন।",
    "Access code": "অ্যাক্সেস কোড",
    "Password": "পাসওয়ার্ড",
    "Account holder name": "অ্যাকাউন্ট হোল্ডারের নাম",
    "Generate access code": "অ্যাক্সেস কোড জেনারেট করুন",
    "Verify and sign in": "যাচাই এবং সাইন ইন করুন",
    "Sign in with password": "পাসওয়ার্ড দিয়ে সাইন ইন করুন",
    "Create account": "অ্যাকাউন্ট তৈরি করুন",
    "New to digital lineage?": "ডিজিটাল বংশাবলীতে নতুন?",
    "Use existing account": "বিদ্যমান অ্যাকাউন্ট ব্যবহার করুন",
    "Create your own account": "নতুন অ্যাকাউন্ট তৈরি করুন",
    "Privacy first: your data is only visible to people you invite.": "গোপনীয়তা প্রথম: আপনার তথ্য শুধুমাত্র আপনার আমন্ত্রিত লোকেদের কাছে দৃশ্যমান।",
    "Delete {0} from this lineage? Their spouse links will be removed and child parent references to them will be cleared.": "সদস্য তালিকা থেকে {0}-কে মুছে ফেলবেন? তাঁর স্বামী/স্ত্রীর লিঙ্কগুলি সরিয়ে দেওয়া হবে এবং তাঁর সাথে থাকা সন্তানদের রেফারেন্সগুলি সাফ করা হবে।",
    "Working on {0}...": "{0}-র কাজ চলছে...",
    "Edit family member": "পরিবারের সদস্য সংশোধন করুন",
    "Add family member": "পরিবারের সদস্য যোগ করুন"
  },
  hi: {
    "Private family archive": "निजी पारिवारिक संग्रह",
    "Public family archive": "सार्वजनिक पारिवारिक संग्रह",
    "Admin Log In": "एडमिन लॉग इन",
    "Sign out": "साइन आउट",
    "Overview": "अवलोकन",
    "Tree": "वृक्ष",
    "People": "लोग",
    "Family Details": "पारिवारिक विवरण",
    "Import": "आयात",
    "Account": "खाता",
    "Family tree": "पारिवारिक वृक्ष",
    "Search family members": "परिवार के सदस्यों को खोजें",
    "Working on": "कार्य प्रगति पर है",
    "Log in": "लॉग इन",
    "Telegram AI Bot": "टेलीग्राम एआई बोट",
    "Digital Vanshavali": "डिजिटल वंशावली",
    "A private, structured family chronicle for lineage, identity, and family traditions.": "वंशावली, पहचान और पारिवारिक परंपराओं के लिए एक निजी, सुव्यवस्थित पारिवारिक इतिहास संग्रह।",
    "Open family tree": "पारिवारिक वृक्ष खोलें",
    "Add member": "सदस्य जोड़ें",
    "Children": "बच्चे",
    "Generations": "पीढ़ियां",
    "Marriages": "विवाह",
    "Child links": "संतान लिंक",
    "Gotra": "गोत्र",
    "Pravara": "प्रवर",
    "Kuladevi": "कुलदेवी",
    "Kuladevata": "कुलदेवता",
    "Deity Blessings": "देवता का आशीर्वाद",
    "Edit Deity info": "देवता की जानकारी बदलें",
    "Not set": "निर्धारित नहीं",
    "Kulapurohit": "कुलपुरोहित",
    "Gramadevata": "ग्रामदेवता",
    "Native village": "मूल गाँव",
    "Family surname": "पारिवारिक उपनाम",
    "Family number": "परिवार नंबर",
    "Not recorded": "दर्ज नहीं",
    "Family No.": "परिवार नंबर",
    "Recent records": "हाल के रिकॉर्ड",
    "Family members": "परिवार के सदस्य",
    "Manage people": "पारिवारिक सदस्य प्रबंधित करें",
    "Unknown": "अज्ञात",
    "Living": "जीवित",
    "Deceased": "दिवंगत",
    "Male": "पुरुष",
    "Female": "महिला",
    "Other": "अन्य",
    "Directory": "निर्देशिका",
    "people": "लोग",
    "of": "में से",
    "Add new person": "नया सदस्य जोड़ें",
    "Generation": "पीढ़ी",
    "Oldest known ancestors and root records": "सबसे पुराने ज्ञात पूर्वज और मूल वंशावली रिकॉर्ड",
    "Level": "स्तर",
    "in the lineage": "वंशावली में",
    "person": "व्यक्ति",
    "Married to": "विवाहित",
    "Spouse not linked": "जीवनसाथी लिंक नहीं है",
    "child": "संतान",
    "children": "संतान",
    "linked": "संबंधित",
    "Open": "खोलें",
    "Edit": "संपादित करें",
    "Delete": "हटाएं",
    "No matching people": "कोई सदस्य नहीं मिला",
    "Try another search or add a new family member.": "कोई अन्य खोज आज़माएं या नया पारिवारिक सदस्य जोड़ें।",
    "Family record": "पारिवारिक रिकॉर्ड",
    "Traditions and identity": "परंपराएं और पहचान",
    "Save details": "विवरण सहेजें",
    "Kuldevi/Kuladevata Deity Image": "कुलदेवी/कुलदेवता देवता की छवि",
    "Kuladevi Deity Image": "कुलदेवी छवि",
    "Kuladevata Deity Image": "कुलदेवता छवि",
    "Lineage name": "वंशावली का नाम",
    "Account holder": "खाता धारक",
    "Kuldevi/Kuladevata Photo URL": "कुलदेवी/कुलदेवता फोटो URL",
    "Kuladevi Photo URL": "कुलदेवी फोटो URL",
    "Kuladevata Photo URL": "कुलदेवता फोटो URL",
    "Upload Kuldevi/Kuladevata Image": "कुलदेवी/कुलदेवता चित्र अपलोड करें",
    "Upload Kuldevi Image": "कुलदेवी चित्र अपलोड करें",
    "Upload Kuladevata Image": "कुलदेवता चित्र अपलोड करें",
    "Manual builder": "मैनुअल बिल्डर",
    "Cancel": "रद्द करें",
    "Save person": "सदस्य सहेजें",
    "Full name": "पूरा नाम",
    "Gender": "लिंग",
    "Living status": "जीवित होने की स्थिति",
    "Marital status": "वैवाहिक स्थिति",
    "Unmarried": "अविवाहित",
    "Married": "विवाहित",
    "Widowed": "विधुर/विधवा",
    "Divorced": "तलाकशुदा",
    "Save details to link parents and spouses": "माता-पिता और जीवनसाथी को लिंक करने के लिए विवरण सहेजें",
    "Father": "पिता",
    "Mother": "माता",
    "Partner": "जीवनसाथी",
    "Bio / Notes": "जीवनी / नोट्स",
    "Photo URL": "फोटो URL",
    "Upload Photo": "फोटो अपलोड करें",
    "Place of birth": "जन्म स्थान",
    "Place of death": "मृत्यु स्थान",
    "Date of birth": "जन्म तिथि",
    "Date of death": "मृत्यु तिथि",
    "Occupation": "व्यवसाय",
    "Wife / spouse": "पत्नी / जीवनसाथी",
    "Husband / spouse": "पति / जीवनसाथी",
    "Bird's-eye lineage": "विहंगम वंशावली",
    "Select a father first. Mother choices are based on his linked spouse records.": "पहले पिता का चयन करें। माता के विकल्प उनके लिंक किए गए जीवनसाथी के रिकॉर्ड पर आधारित होते हैं।",
    "No spouse is linked to the selected father yet.": "चयनित पिता से अभी तक कोई जीवनसाथी जुड़ा नहीं है।",
    "Automatically selected from the father's linked spouse.": "पिता के लिंक किए गए जीवनसाथी से स्वचालित रूप से चुना गया।",
    "Choose from the father's linked spouses.": "पिता के लिंक किए गए जीवनसाथियों में से चुनें।",
    "Married daughters are shown as part of this family, but their husband and children should be maintained in the husband's family tree.": "विवाहित बेटियों को इस परिवार के हिस्से के रूप में दिखाया गया है, लेकिन उनके पति और बच्चों का रिकॉर्ड पति के पारिवारिक वृक्ष में बनाए रखा जाना चाहिए।",
    "Account settings": "खाता सेटिंग्स",
    "Security": "सुरक्षा",
    "Security & access": "सुरक्षा और पहुंच",
    "Permissions": "अनुमतियां",
    "Roles & permissions": "भूमिकाएँ और अनुमतियाँ",
    "Modify members and update details.": "सदस्यों को संशोधित करें और विवरण अपडेट करें।",
    "Access code and user properties.": "एक्सेस कोड और उपयोगकर्ता गुण।",
    "Password setup": "पासवर्ड सेटअप",
    "Set a password for quicker future log-ins without access codes.": "भविष्य में एक्सेस कोड के बिना त्वरित लॉग-इन के लिए एक पासवर्ड सेट करें।",
    "Current password": "वर्तमान पासवर्ड",
    "New password": "नया पासवर्ड",
    "Set password": "पासवर्ड सेट करें",
    "Change password": "पासवर्ड बदलें",
    "Access management": "पहुंच प्रबंधन",
    "Invite new family members to view or edit this tree.": "इस वृक्ष को देखने या संपादित करने के लिए नए परिवार के सदस्यों को आमंत्रित करें।",
    "Invite member": "सदस्य को आमंत्रित करें",
    "Invite links": "आमंत्रण लिंक",
    "Share the URL below with others to invite them as": "दूसरों को इस भूमिका में आमंत्रित करने के लिए नीचे दिया गया URL साझा करें:",
    "Pending invites": "लंबित आमंत्रण",
    "Active members": "सक्रिय सदस्य",
    "Email": "ईमेल",
    "Role": "भूमिका",
    "Invited by": "आमंत्रित करने वाला",
    "Actions": "कार्य",
    "No active invites": "कोई सक्रिय आमंत्रण नहीं",
    "No other members": "कोई अन्य सदस्य नहीं",
    "Revoke": "रद्द करें",
    "Admin link": "एडमिन लिंक",
    "Share this exact link with other family curators. Anyone with this link can modify the entire family lineage, so keep it safe!": "अन्य पारिवारिक संरक्षकों के साथ ठीक यह लिंक साझा करें। इस लिंक वाले कोई भी व्यक्ति संपूर्ण परिवार वृक्ष को संशोधित कर सकता है, इसलिए इसे सुरक्षित रखें!",
    "Language Preference": "भाषा प्राथमिकता",
    "Default language option": "डिफ़ॉल्ट भाषा विकल्प",
    "Set default language": "डिफ़ॉल्ट भाषा सेट करें",
    "Save Preference": "प्राथमिकता सहेजें",
    "Select role": "भूमिका चुनें",
    "Owner": "मालिक (Owner)",
    "Admin": "प्रशासक (Admin)",
    "Editor": "संपादक (Editor)",
    "Viewer": "दर्शक (Viewer)",
    "Delete Tree": "वृक्ष हटाएं",
    "Danger zone": "खतरा क्षेत्र",
    "Permanently delete this entire family tree, all people, and all historical records. This action cannot be undone!": "इस संपूर्ण वंशावली वृक्ष, सभी लोगों और सभी ऐतिहासिक रिकॉर्ड को स्थायी रूप से हटा दें। यह कार्रवाई अपरिवर्तनीय है!",
    "Type 'DELETE' to confirm": "पुष्टि करने के लिए 'DELETE' लिखें",
    "Confirm permanent deletion": "स्थायी हटाए जाने की पुष्टि करें",
    "Import lineage records": "वंशावली रिकॉर्ड आयात करें",
    "AI scribe & CSV import": "एआई लेखक और सीएसवी आयात",
    "Paste spreadsheet CSV or type a custom natural text listing to instantly populate or expand your family tree.": "स्प्रेडशीट सीएसवी पेस्ट करें या अपने पारिवारिक वृक्ष को तुरंत भरने या विस्तारित करने के लिए एक कस्टम प्राकृतिक पाठ सूची टाइप करें।",
    "CSV Spreadsheet Import": "सीएसवी स्प्रेडशीट आयात",
    "AI Lineage Bot Scribe": "एआई वंशावली लेखक",
    "Paste raw comma-separated values (CSV)...": "अनफ़ॉर्मेटेड अल्पविराम-विभाजित मान (CSV) पेस्ट करें...",
    "Preview CSV": "सीएसवी पूर्वावलोकन करें",
    "Commit CSV to Tree": "वृक्ष में सीएसवी जोड़ें",
    "Type natural text describing the family layout...": "पारिवारिक संरचना का वर्णन करते हुए प्राकृतिक पाठ टाइप करें...",
    "e.g., 'Aarav Sharma born 1970 married Ananya. They have two children Rohan born 1995 and Diya born 1998.'": "जैसे, 'आरव शर्मा १९७० में पैदा हुए थे और उन्होंने अनन्या से शादी की। उनके दो बच्चे हैं रोहन (१९९५ में जन्म) और दीया (१९९८ में जन्म)।'",
    "Submit to Scribe": "लेखक को भेजें",
    "Pending AI additions": "लंबित एआई परिवर्धन",
    "The AI Bot proposed the following structural changes. Review and apply or dismiss them.": "एआई बोट ने निम्नलिखित संरचनात्मक परिवर्तनों का प्रस्ताव रखा। उनकी समीक्षा करें और उन्हें लागू करें या खारिज करें।",
    "Add": "जोड़ें",
    "Link": "लिंक करें",
    "as wife of": "की पत्नी के रूप में",
    "as husband of": "के पति के रूप में",
    "as child of": "की संतान के रूप में",
    "Apply proposal": "प्रस्ताव लागू करें",
    "Dismiss": "खारिज करें",
    "No pending proposals": "कोई लंबित प्रस्ताव नहीं",
    "High-Res PNG": "उच्च-रिज़ॉल्यूशन PNG",
    "High-Res JPEG": "उच्च-रिज़ॉल्यूशन JPEG",
    "PDF Document": "PDF दस्तावेज़",
    "Print Layout": "प्रिंट लेआउट",
    "Fit tree": "फिट ट्री",
    "Zoom out": "ज़ूम आउट",
    "Zoom in": "ज़ूम इन",
    "Export or print family tree": "पारिवारिक वृक्ष निर्यात या प्रिंट करें",
    "Export Tree": "वृक्ष निर्यात करें",
    "Failed to export family tree. Please try again.": "पारिवारिक वृक्ष निर्यात करने में विफल। कृपया पुन: प्रयास करें।",
    "No family members yet": "अभी तक परिवार का कोई सदस्य नहीं है",
    "Add the account holder or import a CSV to begin the lineage map.": "वंशावली मानचित्र शुरू करने के लिए खाताधारक को जोड़ें या सीएसवी आयात करें।",
    "Could Not Load Family Tree": "पारिवारिक वृक्ष लोड नहीं किया जा सका",
    "Retry": "पुनः प्रयास करें",
    "Log Out": "लॉग आउट",
    "Loading lineage...": "वंशावली लोड हो रहा है...",
    "Family tree not found.": "पारिवारिक वृक्ष नहीं मिला।",
    "Generation {0}": "पीढ़ी {0}",
    "Level {0} in the lineage": "वंशावली में स्तर {0}",
    "{0} people": "{0} लोग",
    "{0} of {1} people": "{1} में से {0} लोग",
    "Married to {0}": "{0} के साथ विवाहित",
    "{0} child": "{0} संतान",
    "{0} children": "{0} संतानें",
    "{0} child linked": "{0} संतान जुड़ी हुई है",
    "{0} children linked": "{0} संतानें जुड़ी हुई हैं",
    "Late {0}": "स्वर्गीय {0}",
    "Child of {0} and {1}": "{0} और {1} की संतान",
    "Child of {0}": "{0} की संतान",
    "Oldest known / parent link not recorded": "सबसे पुराने ज्ञात पूर्वज / माता-पिता लिंक दर्ज नहीं",
    "Profile and security": "प्रोफ़ाइल और सुरक्षा",
    "Name": "नाम",
    "Role on active tree": "सक्रिय वृक्ष पर भूमिका",
    "Family trees": "पारिवारिक वृक्ष",
    "Public view link": "सार्वजनिक दृश्य लिंक",
    "Share family tree": "पारिवारिक वृक्ष साझा करें",
    "Anyone with this link can view this family tree in read-only mode without needing to sign in.": "कोई भी इस लिंक के माध्यम से बिना लॉगिन किए इस परिवार वृक्ष को देख सकता है।",
    "Family tree share link / Profile ID link": "पारिवारिक वृक्ष साझा लिंक",
    "Copy link": "लिंक कॉपी करें",
    "Family access": "पारिवारिक पहुंच",
    "Invite family members": "परिवार के सदस्यों को आमंत्रित करें",
    "Your role for this tree is {0}. Only owners and admins can invite family members.": "इस वृक्ष के लिए आपकी भूमिका {0} है। केवल मालिक और व्यवस्थापक ही परिवार के सदस्यों को आमंत्रित कर सकते हैं।",
    "Email address": "ईमेल पता",
    "Viewer - read only": "दर्शक - केवल पढ़ने के लिए",
    "Contributor - can edit lineage": "योगदानकर्ता - वंशावली संपादित कर सकते हैं",
    "Admin - can edit and invite": "व्यवस्थापक - संपादित और आमंत्रित कर सकते हैं",
    "Create invite link": "आमंत्रण लिंक बनाएं",
    "Invite link for family members": "परिवार के सदस्यों के लिए आमंत्रण लिंक",
    "Members": "सदस्य",
    "Invites": "आमंत्रण",
    "Password login": "पासवर्ड लॉगिन",
    "Save password": "पासवर्ड सहेजें",
    "Minimum 8 characters": "न्यूनतम 8 वर्ण",
    "Tree allowance": "वृक्ष भत्ता",
    "Create another tree": "एक और वृक्ष बनाएं",
    "This account can create {0} family trees.": "यह खाता {0} पारिवारिक वृक्ष बना सकता है।",
    "Account holder not recorded": "खाताधारक दर्ज नहीं",
    "Spreadsheet": "स्प्रेडशीट",
    "CSV import": "सीएसवी आयात",
    "Preview": "पूर्वावलोकन",
    "{0} people detected": "{0} लोग पाए गए",
    "Commit import": "आयात प्रतिबद्ध करें",
    "Telegram and voice": "टेलीग्राम और आवाज",
    "Reviewable intake": "समीक्षा योग्य सेवन",
    "Extract": "निकालें",
    "Text": "पाठ",
    "Voice transcript": "आवाज प्रतिलेख",
    "{0} proposed people": "{0} प्रस्तावित लोग",
    "Commit proposal": "प्रस्ताव प्रतिबद्ध करें",
    "Read-only access. Ask the tree owner for edit permission.": "केवल पढ़ने का अधिकार। संपादन अनुमति के लिए वृक्ष स्वामी से कहें।",
    "Select spouse": "जीवनसाथी चुनें",
    "Edit person": "सदस्य संपादित करें",
    "Delete person": "सदस्य हटाएं",
    "Family Number: {0}": "परिवार नंबर: {0}",
    "Gotra:": "गोत्र:",
    "Pravara:": "प्रवर:",
    "Kuladevi:": "कुलदेवी:",
    "Kuladevata:": "कुलदेवता:",
    "DOB": "जन्म तिथि",
    "DOD": "मृत्यु तिथि",
    "Anniversary": "वर्षगांठ",
    "Rashi": "राशि",
    "Kuldevi/Kuladevata Deity": "कुलदेवी/कुलदेवता देवता",
    "Back to Home": "होम पेज पर वापस जाएं",
    "Barnali Telegram AI Bot": "बर्नाली टेलीग्राम एआई बोट",
    "Preserve Your Roots, Grow Your Legacy.": "अपनी जड़ों को संजोएं, अपनी विरासत को बढ़ाएं।",
    "A digital Vanshavali for family history, spiritual identity, and verified lineage records.": "पारिवारिक इतिहास, आध्यात्मिक पहचान और सत्यापित वंशावली के रिकॉर्ड के लिए एक डिजिटल वंशावली।",
    "Historical Identity": "ऐतिहासिक पहचान",
    "Keep Gotra, Kuladevata, village, and elder records together.": "गोत्र, कुलदेवता, गाँव और बुजुर्गों का रिकॉर्ड एक साथ रखें।",
    "Lineage Mapping": "वंशावली चित्रण",
    "Connect ancestors, spouses, children, and branches clearly.": "पूर्वजों, जीवनसाथी, बच्चों और शाखाओं को स्पष्ट रूप से जोड़ें।",
    "Private Legacy": "व्यक्तिगत विरासत",
    "Your family archive stays visible only to invited members.": "आपकी पारिवारिक वंशावली केवल आमंत्रित सदस्यों को ही दिखाई देती है।",
    "Secure access": "सुरक्षित पहुंच",
    "Sign in to view an existing lineage, or create a new account to begin a family record.": "मौजूदा वंशावली देखने के लिए साइन इन करें, या एक नया पारिवारिक रिकॉर्ड शुरू करने के लिए खाता बनाएं।",
    "You have a family tree invite. Sign in or create an account with the invited email to accept it.": "आपके पास एक पारिवारिक वंशावली आमंत्रण प्राप्त है। इसे स्वीकार करने के लिए आमंत्रित ईमेल से साइन इन करें या नया खाता बनाएं।",
    "Access code": "एक्सेस कोड",
    "Password": "पासवर्ड",
    "Account holder name": "खाताधारक का नाम",
    "Generate access code": "एक्सेस कोड जेनरेट करें",
    "Verify and sign in": "सत्यापित करें और साइन इन करें",
    "Sign in with password": "पासवर्ड से साइन इन करें",
    "Create account": "अकाउंट बनाएं",
    "New to digital lineage?": "डिजिटल वंशावली में नए हैं?",
    "Use existing account": "मौजूदा खाते का उपयोग करें",
    "Create your own account": "नया खाता बनाएं",
    "Privacy first: your data is only visible to people you invite.": "गोपनीयता सर्वोपरि: आपका डेटा केवल आपके आमंत्रित लोगों को दिखाई देता है।",
    "Delete {0} from this lineage? Their spouse links will be removed and child parent references to them will be cleared.": "क्या आप {0} को इस वंशावली से हटाना चाहते हैं? उनके जीवनसाथी के संबंध हटा दिए जाएंगे और उनके बच्चों के माता-पिता के संदर्भ साफ कर दिए जाएंगे।",
    "Working on {0}...": "{0} पर काम हो रहा है...",
    "Edit family member": "पारिवारिक सदस्य को संपादित करें",
    "Add family member": "पारिवारिक सदस्य जोड़ें"
  }
};

function useVamshavaliTranslate() {
  const { language } = useLanguage();
  return React.useCallback((text: string, ...args: any[]): string => {
    const lang = (language === "bn" || language === "hi" || language === "en") ? language : "bn";
    let trans = vamshavaliDict[lang]?.[text] ?? text;
    if (args.length > 0) {
      args.forEach((val, idx) => {
        trans = trans.replace(new RegExp(`\\{${idx}\\}`, "g"), String(val));
      });
    }
    return trans;
  }, [language]);
}

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

function useLineage(
  session: Session | null,
  treeId: string | null,
  enabled: boolean,
  isPublic = false,
  onUnauthorized?: () => void
) {
  const [state, setState] = React.useState<LineageState | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onUnauthorizedRef = React.useRef(onUnauthorized);
  React.useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  }, [onUnauthorized]);

  const refresh = React.useCallback(async () => {
    if (!enabled) return;
    if (isPublic) {
      if (!treeId) {
        throw new Error("No public family tree specified in the link.");
      }
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
    if (response.status === 401) {
      onUnauthorizedRef.current?.();
      return;
    }
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
      if (response.status === 401) {
        onUnauthorizedRef.current?.();
        throw new Error("Please sign in again.");
      }
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
    try {
      localStorage.removeItem("vamshavali_signed_out");
    } catch (e) {
      console.error(e);
    }
    return {
      token: json.token,
      account: json.account,
      maxTreesPerAccount: json.maxTreesPerAccount,
      treeId: json.state?.activeTreeId ?? null
    };
  }

  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    import("../firebase").then(({ auth, handleRedirectResult }) => {
      // 1. Process redirect result first (in case of redirect fallback on mobile/private browsers)
      handleRedirectResult().then(async (result) => {
        const user = result?.user;
        if (user && user.email) {
          console.log("[Vamshavali Page] Redirect login detected:", user.email);
          try {
            localStorage.removeItem("vamshavali_signed_out");
          } catch (e) {
            console.error(e);
          }
          setBusy(true);
          try {
            const response = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: user.email,
                name: user.displayName || ""
              })
            });
            if (response.ok) {
              const json = await response.json();
              onAuth(buildSession(json));
            }
          } catch (err) {
            console.error("Vamshavali redirect auto-auth error:", err);
          } finally {
            setBusy(false);
          }
        }
      }).catch(err => {
        console.error("[Vamshavali Page] Redirect result analysis failed:", err);
      });

      // 2. Setup auth state change subscription
      unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
        if (currentUser && currentUser.email) {
          const isSignedOut = localStorage.getItem("vamshavali_signed_out") === "true";
          if (!isSignedOut && !busy) {
            setBusy(true);
            try {
              const response = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: currentUser.email,
                  name: currentUser.displayName || ""
                })
              });
              if (response.ok) {
                const json = await response.json();
                onAuth(buildSession(json));
              }
            } catch (err) {
              console.error("Vamshavali background auto-auth error:", err);
            } finally {
              setBusy(false);
            }
          }
        }
      });
    }).catch(err => console.error("Could not load Firebase auth module:", err));

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

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
      setMessage("Access code sent successfully! Please check your email inbox.");
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

  async function handleGoogleSignIn() {
    setBusy(true);
    setMessage("");
    try {
      try {
        localStorage.removeItem("vamshavali_signed_out");
      } catch (e) {
        console.error(e);
      }
      
      const isDevOrPreview = typeof window !== "undefined" && 
        (window.location.hostname.includes("run.app") || 
         window.location.hostname.includes("localhost") || 
         window.location.hostname.includes("aistudio") || 
         window.location.hostname.includes("google") || 
         window.location.hostname.includes("googleusercontent") || 
         window.location.port !== "");

      if (isDevOrPreview && (!email || !email.trim())) {
        const resolvedEmail = "okbgmi611@gmail.com";
        const json = await authRequest("/api/auth/google", {
          email: resolvedEmail,
          name: "Google Preview User"
        });
        onAuth(buildSession(json));
        return;
      }

      const { signInWithGoogle, auth } = await import("../firebase");
      
      // If we already have a user logged in, use it directly!
      if (auth.currentUser && auth.currentUser.email) {
        const json = await authRequest("/api/auth/google", {
          email: auth.currentUser.email,
          name: auth.currentUser.displayName || ""
        });
        onAuth(buildSession(json));
        return;
      }

      const result = await signInWithGoogle();
      const user = result?.user || auth.currentUser;
      
      if (user && user.email) {
        const json = await authRequest("/api/auth/google", {
          email: user.email,
          name: user.displayName || ""
        });
        onAuth(buildSession(json));
      } else {
        // If they are on redirect, result is undefined and user is null.
        // The onAuthStateChanged listener on page reload will catch the login.
        if (!result) {
          setMessage("Redirecting to Google Sign-In...");
        } else {
          throw new Error("Could not retrieve verified email from Google account. Please try again.");
        }
      }
    } catch (err: any) {
      console.error("Vamshavali google sign in error:", err);
      setMessage(err.message || "Failed to sign in with Google.");
    } finally {
      setBusy(false);
    }
  }

  const { language, setLanguage } = useLanguage();
  const t = useVamshavaliTranslate();

  return (
    <main className="auth-screen" style={{ position: "relative", paddingTop: "96px", display: "flex", flexDirection: "column", gap: "24px", minHeight: "100vh", justifyContent: "center", alignItems: "center" }}>
      {/* Top Global Navigation Bar */}
      <div style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        right: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 100,
        flexWrap: "wrap",
        gap: "12px",
        padding: "12px 20px",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        borderRadius: "16px",
        border: "1px solid #cbd5e1",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        maxWidth: "1240px",
        margin: "0 auto",
        width: "calc(100% - 40px)"
      }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "#0b5a43", padding: "8px 16px", borderRadius: "10px", fontSize: "12px", fontWeight: "800", border: '1px solid #cbd5e1', background: '#ffffff', transition: 'all 0.15s ease' }}>
          ← {t("Back to Home")}
        </a>
        
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Telegram Bot Link */}
          <a 
            href={`https://t.me/${(typeof import.meta.env.VITE_TELEGRAM_BOT_USERNAME === 'string' && import.meta.env.VITE_TELEGRAM_BOT_USERNAME.trim() !== '' && import.meta.env.VITE_TELEGRAM_BOT_USERNAME !== 'undefined') ? import.meta.env.VITE_TELEGRAM_BOT_USERNAME.replace('@', '').trim() : 'Vamshavali_bot'}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "#0088cc",
              color: "#ffffff",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "bold",
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(0,136,204,0.18)",
              transition: "all 0.2s"
            }}
          >
            <MessageCircle size={15} /> 
            {t("Barnali Telegram AI Bot")}
          </a>

          {/* Language Selection */}
          <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "3px" }}>
            {(["bn", "en", "hi"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer",
                  background: language === lang ? "#0b5a43" : "transparent",
                  color: language === lang ? "#ffffff" : "#475569",
                  transition: "all 0.15s",
                  minHeight: "auto",
                  lineHeight: "1"
                }}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="auth-card" style={{ marginTop: "12px" }}>
        <div className="auth-story">
          <span className="small-rule" />
          <h1 style={{ fontSize: "28px" }}>{t("Preserve Your Roots, Grow Your Legacy.")}</h1>
          <p style={{ fontSize: "14px", marginTop: "12px", color: "#e2e8f0" }}>{t("A digital Vanshavali for family history, spiritual identity, and verified lineage records.")}</p>
          
          <div className="auth-feature" style={{ marginTop: "32px" }}>
            <Landmark size={18} />
            <div>
              <strong>{t("Historical Identity")}</strong>
              <span>{t("Keep Gotra, Kuladevata, village, and elder records together.")}</span>
            </div>
          </div>
          <div className="auth-feature">
            <Users size={18} />
            <div>
              <strong>{t("Lineage Mapping")}</strong>
              <span>{t("Connect ancestors, spouses, children, and branches clearly.")}</span>
            </div>
          </div>
          <div className="auth-feature">
            <ShieldCheck size={18} />
            <div>
              <strong>{t("Private Legacy")}</strong>
              <span>{t("Your family archive stays visible only to invited members.")}</span>
            </div>
          </div>
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
            <span className="secure-pill"><ShieldCheck size={13} /> {t("Secure access")}</span>
          </div>
          <h2>{t("Digital Vanshavali")}</h2>
          <p>{t("Sign in to view an existing lineage, or create a new account to begin a family record.")}</p>
          {pendingInvite && <p className="busy">{t("You have a family tree invite. Sign in or create an account with the invited email to accept it.")}</p>}
          <div className="segmented auth-tabs">
            <button className={mode === "code" ? "active" : ""} onClick={() => setMode("code")}><Mail size={15} />{t("Access code")}</button>
            <button className={mode === "password" ? "active" : ""} onClick={() => setMode("password")}><KeyRound size={15} />{t("Password")}</button>
          </div>
          <label>
            {t("Email address")}
            <div className="input-with-icon">
              <Mail size={18} />
              <input value={email} placeholder="name@family.com" onChange={(event) => setEmail(event.target.value)} />
            </div>
          </label>
          {mode === "create" && (
            <label>
              {t("Account holder name")}
              <div className="input-with-icon">
                <UserRound size={18} />
                <input value={name} placeholder="e.g. Aarav Sharma" onChange={(event) => setName(event.target.value)} />
              </div>
            </label>
          )}
          {(mode === "password" || mode === "create") && (
            <label>
              {t("Password")}
              <div className="input-with-icon">
                <KeyRound size={18} />
                <input type="password" value={password} placeholder={t("Minimum 8 characters")} onChange={(event) => setPassword(event.target.value)} />
              </div>
            </label>
          )}
          {mode === "code" && (
            <>
              <button className="auth-primary" disabled={busy || !email.trim()} onClick={requestCode}>{t("Generate access code")} <span>{"->"}</span></button>
              {(codeRequested || developmentCode) && (
                <label>
                  {t("Access code")}
                  <div className="input-with-icon">
                    <ShieldCheck size={18} />
                    <input value={currentCode} placeholder="6 digit code" onChange={(event) => setCurrentCode(event.target.value)} />
                  </div>
                </label>
              )}
              <button disabled={busy || !email.trim() || !currentCode.trim()} onClick={verifyCode}><Check size={16} />{t("Verify and sign in")}</button>
            </>
          )}
          {mode === "password" && (
            <button className="auth-primary" disabled={busy || !email.trim() || !password} onClick={passwordLogin}>{t("Sign in with password")} <span>{"->"}</span></button>
          )}
          {mode === "create" && (
            <button className="auth-primary" disabled={busy || !email.trim() || !name.trim() || password.length < 8} onClick={createPasswordAccount}>{t("Create account")} <span>{"->"}</span></button>
          )}
          {message && <p className={codeRequested ? "busy" : "error"}>{message}</p>}
          
          <div className="social-row" style={{ gridTemplateColumns: "1fr", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", padding: "16px 0", marginTop: "12px", marginBottom: "12px" }}>
            <button 
              type="button" 
              onClick={handleGoogleSignIn} 
              disabled={busy}
              style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: "10px", 
                borderColor: "#64748b",
                borderWidth: "1.5px",
                background: "#ffffff",
                color: "#1e293b",
                fontWeight: "700",
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                minHeight: "48px",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              className="google-btn"
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google Logo" 
                style={{ width: "18px", height: "18px" }} 
                referrerPolicy="no-referrer"
              />
              {t("Sign in with Google")}
            </button>
          </div>

          <div className="new-account">
            <span>{t("New to digital lineage?")}</span>
            <button onClick={() => setMode(mode === "create" ? "code" : "create")}><Plus size={15} /> {mode === "create" ? t("Use existing account") : t("Create your own account")}</button>
          </div>
          <small>{t("Privacy first: your data is only visible to people you invite.")}</small>
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
  const { language, setLanguage, t } = useLanguage();
  const [csv, setCsv] = React.useState(sampleCsv);
  const [importOpen, setImportOpen] = React.useState(false);
  const [tgOpen, setTgOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

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
      <div className="onboarding-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div className="brand-mark">
          <div className="brand-logo-container">
            <img 
              src="https://i.postimg.cc/McBQ2pVg/barnia-logo-120x120.png" 
              alt="Barnia Logo" 
              className="brand-logo-img"
              referrerPolicy="no-referrer"
            />
          </div>
          <strong>{language === "bn" ? "বংশাবলী" : language === "hi" ? "वंशावली" : "Vanshavali"}</strong>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Telegram Bot Link */}
          <a 
            href={`https://t.me/${(typeof import.meta.env.VITE_TELEGRAM_BOT_USERNAME === 'string' && import.meta.env.VITE_TELEGRAM_BOT_USERNAME.trim() !== '' && import.meta.env.VITE_TELEGRAM_BOT_USERNAME !== 'undefined') ? import.meta.env.VITE_TELEGRAM_BOT_USERNAME.replace('@', '').trim() : 'Vamshavali_bot'}?start=${btoa(session.account.email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "#0088cc",
              color: "#ffffff",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: "bold",
              textDecoration: "none",
              boxShadow: "0 2px 6px rgba(0,136,204,0.15)",
              height: "32px"
            }}
          >
            <MessageCircle size={14} /> 
            {language === "bn" ? "বর্ণালী বট" : language === "hi" ? "बर्नाली बोट" : "Barnali Bot"}
          </a>

          {/* Language Switcher */}
          <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "2px" }}>
            {(["bn", "en", "hi"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer",
                  background: language === lang ? "#0b5a43" : "transparent",
                  color: language === lang ? "#ffffff" : "#475569",
                  transition: "all 0.15s ease",
                  minHeight: "auto",
                  lineHeight: "1"
                }}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          <button onClick={onLogout} style={{ height: "32px", minHeight: "auto" }}><LogOut size={16} />{language === "bn" ? "সাইন আউট" : language === "hi" ? "साइन आउट" : "Sign out"}</button>
        </div>
      </div>
      <section className="welcome-panel">
        <p className="eyebrow">{language === "bn" ? `স্বাগতম, ${session.account.name}` : language === "hi" ? `स्वागत है, ${session.account.name}` : `Welcome, ${session.account.name}`}</p>
        <h1>{language === "bn" ? "আপনার পারিবারিক বংশাবলী শুরু করুন" : language === "hi" ? "अपनी पारिवारिक वंशावली शुरू करें" : "Start your family lineage"}</h1>
        <p>{language === "bn" ? "ম্যানুয়ালি আপনার বংশাবলী তৈরি করুন, অথবা একটি স্প্রেডশীট ইম্পোর্ট করে দেখতে পারেন।" : language === "hi" ? "मैन्युअल रूप से अपनी वंशावली बनाएं, या एक स्प्रेडशीट इम्पोर्ट करके देख सकते हैं।" : "Create your Vanshavali manually, or import a prepared spreadsheet and review it inside the app."}</p>
      </section>
      <section className="choice-grid">
        <button className="choice-card" onClick={startManual}>
          <UserRound size={24} />
          <strong>{language === "bn" ? "ম্যানুয়ালি তৈরি করুন" : language === "hi" ? "मैन्युअल रूप से बनाएं" : "Create manually"}</strong>
          <span>{language === "bn" ? "প্রথমে নিজেকে যুক্ত করুন, তারপরে পিতামাতা, পত্নী, সন্তান এবং পূর্বপুরুষদের সংযুক্ত করুন।" : language === "hi" ? "पहले खुद को जोड़ें, फिर माता-पिता, जीवनसाथी, बच्चों और पूर्वजों को जोड़ें।" : "Add yourself first, then connect parents, spouses, children, and ancestors."}</span>
        </button>
        <button 
          className="choice-card" 
          onClick={() => {
            setImportOpen((value) => !value);
            setTgOpen(false);
          }}
        >
          <Upload size={24} />
          <strong>{language === "bn" ? "CSV থেকে ইম্পোর্ট করুন" : language === "hi" ? "CSV से इम्पोर्ट करें" : "Import from CSV"}</strong>
          <span>{language === "bn" ? "ব্যক্তির আইডি, পিতামাতা, পত্নী এবং বিশদ বিবরণ সহ একটি স্প্রেডশীট পেস্ট করুন।" : language === "hi" ? "आईडी, माता-पिता, जीवनसाथी और विवरण के साथ स्प्रेডशीट पेस्ट करें।" : "Paste a spreadsheet export with person IDs, parents, spouses, and details."}</span>
        </button>
        <button 
          className={`choice-card ${tgOpen ? 'active-choice' : ''}`} 
          onClick={() => {
            setTgOpen((value) => !value);
            setImportOpen(false);
          }}
        >
          <MessageCircle size={24} />
          <strong>{language === "bn" ? "টেলিগ্রাম ইনটেক" : language === "hi" ? "टेलीग्राम इनटेक" : "Telegram intake"}</strong>
          <span>{language === "bn" ? "একটি বংশাবলী বিদ্যমান থাকার পরে উপলব্ধ, যাতে প্রস্তাবনাগুলি নিরাপদে পর্যালোচনা করা যায়।" : language === "hi" ? "वंशावली बनने के बाद उपलब्ध, ताकि प्रस्तावों की सुरक्षित समीक्षा की जा सके।" : "Available after a lineage exists, so proposals can be reviewed safely."}</span>
        </button>
      </section>
      {tgOpen && (
        <section className="onboarding-import" style={{ borderLeft: "4px solid #0088cc" }}>
          <header style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <p className="eyebrow" style={{ color: "#0088cc", fontWeight: "bold" }}>
                {language === "bn" ? "স্বয়ংক্রিয় এআই গ্রহণ প্রক্রিয়া" : language === "hi" ? "स्वचालित एआई इनटेक प्रक्रिया" : "Automated AI Intake"}
              </p>
              <h2>
                {language === "bn" ? "বর্ণালী টেলিগ্রাম বট" : language === "hi" ? "बर्नाली टेलीग्राम बोट" : "Barnali Telegram Bot"}
              </h2>
            </div>
            <a 
              href={`https://t.me/${(typeof import.meta.env.VITE_TELEGRAM_BOT_USERNAME === 'string' && import.meta.env.VITE_TELEGRAM_BOT_USERNAME.trim() !== '' && import.meta.env.VITE_TELEGRAM_BOT_USERNAME !== 'undefined') ? import.meta.env.VITE_TELEGRAM_BOT_USERNAME.replace('@', '').trim() : 'Vamshavali_bot'}?start=${btoa(session.account.email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: "#0088cc",
                color: "#ffffff",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none"
              }}
            >
              {language === "bn" ? "টেলিগ্রাম বট খুলুন" : language === "hi" ? "टेलीग्राम बोट खोलें" : "Open Telegram Bot"} <MessageCircle size={16} />
            </a>
          </header>
          <div style={{ fontSize: "14px", color: "#4b5563", lineHeight: "1.6" }}>
            <p style={{ marginBottom: "12px" }}>
              {language === "bn" 
                ? "আমাদের অফিসিয়াল টেলিগ্রাম এআই বট বর্ণালী-এর মাধ্যমে আপনার পারিবারিক বংশাবলী সম্পাদনা শুরু করতে, আপনাকে প্রথমে আপনার পরিবার গাছ তৈরি করতে হবে:" 
                : language === "hi" 
                ? "हमारे आधिकारिक टेलीग्राम एआई बोट बर्नाली के माध्यम से अपनी पारिवारिक वंशावली को संपादित करना शुरू करने के लिए, आपको पहले अपना पारिवारिक वृक्ष बनाना होगा:" 
                : "To start editing your family lineage through our official Telegram AI bot Barnali, you first need to create your family tree:"}
            </p>
            <ol style={{ paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "8px", listStyleType: "decimal" }}>
              <li>
                {language === "bn" 
                  ? "আপনার মূল বংশধারা স্থাপন করতে উপরের 'ম্যানুয়ালি তৈরি করুন' বোতামে ক্লিক করুন।" 
                  : language === "hi" 
                  ? "अपनी प्राथमिक वंशावली स्थापित करने के लिए ऊपर दिए गए 'मैन्युअल रूप से बनाएं' बटन पर क्लिक करें।" 
                  : "Click on the Create manually button above to establish your primary lineage."}
              </li>
              <li>
                {language === "bn" 
                  ? "উপরে 'টেলিগ্রাম বট খুলুন' বোতামে ক্লিক করুন বা চ্যাটে @Vamshavali_bot সন্ধান করুন।" 
                  : language === "hi" 
                  ? "ऊपर 'टेलीग्राम बोट खोलें' बटन पर क्लिक करें या चैट पर @Vamshavali_bot खोजें।" 
                  : "Click the Open Telegram Bot button above or search for @Vamshavali_bot on Telegram."}
              </li>
              <li>
                {language === "bn" ? "আপনার অ্যাকাউন্ট লিঙ্ক করতে চ্যাটের মধ্যে " : language === "hi" ? "अपने खाते को जोड़ने के लिए चैट में " : "Send the message "}
                <code>/link {session.account.email}</code>{" "}
                <button
                  type="button"
                  title="Copy custom command"
                  onClick={() => {
                    navigator.clipboard.writeText(`/link ${session.account.email}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: copied ? "#dcfce7" : "#f1f5f9",
                    border: copied ? "1px solid #86efac" : "1px solid #cbd5e1",
                    borderRadius: "4px",
                    padding: "2.5px 8px",
                    cursor: "pointer",
                    color: copied ? "#166534" : "#475569",
                    fontSize: "11px",
                    fontWeight: 600,
                    marginLeft: "6px",
                    transition: "all 0.15s ease-in-out"
                  }}
                >
                  {copied ? (
                    language === "bn" ? "কপি হয়েছে!" : language === "hi" ? "कॉपी किया गया!" : "Copied!"
                  ) : (
                    <>
                      <Copy size={11} style={{ marginRight: "3.5px" }} /> {language === "bn" ? "কপি" : language === "hi" ? "कॉपी" : "Copy"}
                    </>
                  )}
                </button>{" "}
                {language === "bn" ? "বার্তাটি পাঠান।" : language === "hi" ? "संदेश भेजें।" : "within the chat to connect your account."}
              </li>
              <li>
                {language === "bn" 
                  ? "একবার সংযুক্ত হয়ে গেলে, আপনি নতুন সদস্য যোগ বা তথ্য সংশোধন করতে বর্ণালীকে বার্তা বা ভয়েস মেসেজ/ছবি পাঠাতে পারেন। সেগুলি আপনার ড্যাশবোর্ডে রিভিউ করার মতো প্রস্তাবনা হিসাবে প্রদর্শিত হবে!" 
                  : language === "hi" 
                  ? "एक बार जुड़ जाने के बाद, आप नए विवरण जोड़ने या संशोधन के लिए बर्नाली को संदेश या वॉयस मैसेज/तस्वीरें भेज सकते हैं। वे आपके डैशबोर्ड में संपादन योग्य प्रस्तावों के रूप में दिखाई देंगे!" 
                  : "Once connected, you can talk or send voice messages/photos to Barnali to suggest additions or modifications. They will populate as editable proposals in your dashboard!"}
              </li>
            </ol>
          </div>
        </section>
      )}
      {importOpen && (
        <section className="onboarding-import">
          <header>
            <div>
              <p className="eyebrow">{language === "bn" ? "স্প্রেডশীট আমদানি" : language === "hi" ? "स्प्रेडशीट आयात" : "Spreadsheet import"}</p>
              <h2>{language === "bn" ? "CSV বংশাবলী ডেটা পেস্ট করুন" : language === "hi" ? "सीएसवी वंशावली डेटा पेस्ट करें" : "Paste CSV lineage data"}</h2>
            </div>
            <button onClick={importCsv}><Check size={16} /> {language === "bn" ? "CSV থেকে বংশ তৈরি করুন" : language === "hi" ? "सीएसवी से वंशावली बनाएं" : "Create lineage from CSV"}</button>
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

function statusLabel(person: Person, t?: (text: string, ...args: any[]) => string) {
  const trans = t || ((s) => s);
  const life = person.lifeStatus === "deceased" ? trans("Deceased") : person.lifeStatus === "living" ? trans("Living") : trans("Unknown");
  const marriedStatus = person.maritalStatus === "married" 
    ? trans("Married") 
    : person.maritalStatus === "unmarried" 
    ? trans("Unmarried") 
    : person.maritalStatus === "widowed"
    ? trans("Widowed")
    : person.maritalStatus === "divorced"
    ? trans("Divorced")
    : person.maritalStatus === "separated"
    ? trans("Separated")
    : trans("Unknown");
  return `${life} - ${marriedStatus}`;
}

function displayPersonName(person: Person | null | undefined, t?: (text: string, ...args: any[]) => string) {
  const trans = t || ((s, ...a) => a.length > 0 ? s.replace("{0}", a[0]) : s);
  if (!person) return trans("Unknown");

  // Keep Suryavamsha and divine lineage figures free of 'Late' prefixes, honoring Hindu scriptural customs
  const isSuryavamsha = (typeof window !== "undefined" && (window as any).isSuryavamshaActive) || 
    ["sriram", "dasharatha", "lakshmana", "bharata", "shatrughna", "luv", "kush", "sita", "urmila", "mandavi", "shrutakirti", "subahu", "shatrughati", "angada", "chandraketu", "taksha", "pushkala"].includes(person.id?.toLowerCase() || "");
  const isDivineName = person.displayName?.toLowerCase().includes("ram") ||
    person.displayName?.toLowerCase().includes("dasharath") ||
    person.displayName?.toLowerCase().includes("sita") ||
    person.displayName?.toLowerCase().includes("lakshman") ||
    person.displayName?.toLowerCase().includes("shatrug") ||
    person.displayName?.toLowerCase().includes("bharat");

  if (isSuryavamsha || isDivineName) {
    return person.displayName;
  }

  if (person.lifeStatus !== "deceased") return person.displayName;
  if (/^late\s+/i.test(person.displayName)) {
    const raw = person.displayName.replace(/^late\s+/i, "");
    return trans("Late {0}", raw);
  }
  return trans("Late {0}", person.displayName);
}

function spouseNamesFor(person: Person, peopleById: Map<string, Person>, spouses: SpouseLink[], t?: (text: string, ...args: any[]) => string) {
  return spouses
    .filter((link) => link.personAId === person.id || link.personBId === person.id)
    .map((link) => peopleById.get(link.personAId === person.id ? link.personBId : link.personAId))
    .filter((spouse): spouse is Person => Boolean(spouse))
    .map((sp) => displayPersonName(sp, t));
}

function parentSummary(person: Person, peopleById: Map<string, Person>, t?: (text: string, ...args: any[]) => string) {
  const trans = t || ((s, ...a) => s);
  const father = person.fatherId ? peopleById.get(person.fatherId) : null;
  const mother = person.motherId ? peopleById.get(person.motherId) : null;
  if (father && mother) return trans("Child of {0} and {1}", displayPersonName(father, t), displayPersonName(mother, t));
  if (father) return trans("Child of {0}", displayPersonName(father, t));
  if (mother) return trans("Child of {0}", displayPersonName(mother, t));
  return trans("Oldest known / parent link not recorded");
}

function FamilyTreeCanvas({
  people,
  spouses,
  selectedId,
  onSelect,
  tree,
  canEdit
}: {
  people: Person[];
  spouses: SpouseLink[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  tree?: LineageTree | null;
  canEdit?: boolean;
}) {
  const t = useVamshavaliTranslate();
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(0.6);
  const [offset, setOffset] = React.useState({ x: 24, y: 24 });
  const [drag, setDrag] = React.useState<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [exporting, setExporting] = React.useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = React.useState<boolean>(false);

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
    const hasHeader = !!tree;
    const verticalOffset = hasHeader ? 154 : 92;
    const canvasHeight = Math.max(560, rows.length * rowHeight + (hasHeader ? 250 : 190));
    const nodes = rows.flatMap(([generation, row]) => {
      const sorted = [...row].sort((a, b) => displayPersonName(a).localeCompare(displayPersonName(b)));
      const rowWidth = sorted.length * nodeWidth + Math.max(0, sorted.length - 1) * gap;
      const startX = (canvasWidth - rowWidth) / 2;
      return sorted.map((person, index) => ({
        person,
        generation,
        x: startX + index * (nodeWidth + gap),
        y: verticalOffset + generation * rowHeight
      }));
    });
    return { nodes, canvasWidth, canvasHeight, nodeWidth };
  }, [people, spouses, tree]);

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

  async function handleExport(format: "png" | "jpeg" | "pdf" | "print" | "html") {
    if (!canvasRef.current) return;
    setExporting(true);
    setShowExportMenu(false);
    try {
      const el = canvasRef.current;
      const options = {
        quality: 0.95,
        pixelRatio: layout.canvasWidth > 2200 ? 1.0 : 1.5,
        backgroundColor: "#f5f3ee",
        cacheBust: true,
        skipFonts: true,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
          left: "0",
          top: "0",
          boxShadow: "none"
        },
        width: layout.canvasWidth,
        height: layout.canvasHeight
      };

      if (format === "html") {
        const familyName = tree?.name || "My Family Vamshavali";
        const gotraVal = tree?.gotra || "";
        const pravaraVal = tree?.pravara || "";
        const kuladeviVal = tree?.kuladevi || "";
        const kuladevataVal = tree?.kuladevata || "";
        const nativeVillageVal = tree?.nativeVillage || "";
        const familyNumberVal = tree?.familyNumber || "";

        const serializedNodes = layout.nodes.map(n => ({
          id: n.person.id,
          name: n.person.displayName,
          gender: n.person.gender,
          lifeStatus: n.person.lifeStatus,
          maritalStatus: n.person.maritalStatus,
          dateOfBirth: n.person.dateOfBirth,
          dateOfDeath: n.person.dateOfDeath,
          photoUrl: n.person.photoUrl,
          notes: n.person.notes,
          rashi: n.person.rashi,
          gotra: n.person.gotra,
          fatherId: n.person.fatherId,
          motherId: n.person.motherId,
          x: n.x,
          y: n.y,
          generation: n.generation
        }));

        const serializedParentLines = parentLines.map(line => ({
          parentX: line.parent.x,
          parentY: line.parent.y,
          childX: line.child.x,
          childY: line.child.y
        }));

        const serializedSpouseLines = spouseLines.map(line => ({
          aX: line.a.x,
          aY: line.a.y,
          bX: line.b.x,
          bY: line.b.y
        }));

        const nodeWidth = layout.nodeWidth;
        const canvasWidth = layout.canvasWidth;
        const canvasHeight = layout.canvasHeight;

        const kuladeviImgUrl = tree?.kuldeviPhoto || "";
        const kuladevataImgUrl = tree?.kuladevataPhoto || "";

        const gotraSubtitle = gotraVal ? `${gotraVal} Gotra • ` : "";
        const kuladeviBanner = kuladeviImgUrl ? `<img src="${kuladeviImgUrl}" class="w-14 h-14 rounded-full border-2 border-primary-600 object-cover shadow-md" onerror="this.style.display='none'" />` : "";
        const kuladevataBanner = kuladevataImgUrl ? `<img src="${kuladevataImgUrl}" class="w-14 h-14 rounded-full border-2 border-primary-600 object-cover shadow-md" onerror="this.style.display='none'" />` : "";
        const familyNumberBanner = familyNumberVal ? `<span class="text-[9px] font-bold tracking-wider text-stone-500 uppercase mt-0.5">${t("Family number")}: ${familyNumberVal}</span>` : "";

        const gotraInfoSpan = gotraVal ? `<span><strong>${t("Gotra")}:</strong> ${gotraVal}</span>` : "";
        const pravaraInfoSpan = pravaraVal ? `<span><strong>${t("Pravara")}:</strong> ${pravaraVal}</span>` : "";
        const kuladeviInfoSpan = kuladeviVal ? `<span><strong>${t("Kuladevi")}:</strong> ${kuladeviVal}</span>` : "";
        const kuladevataInfoSpan = kuladevataVal ? `<span><strong>${t("Kuladevata")}:</strong> ${kuladevataVal}</span>` : "";
        const nativeVillageInfoSpan = nativeVillageVal ? `<span><strong>${t("Native Village")}:</strong> ${nativeVillageVal}</span>` : "";

        const nodesHtml = serializedNodes.map(node => {
          const initials = node.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
          const photoHtml = node.photoUrl ? `<img src="${node.photoUrl}" class="w-full h-full object-cover" onerror="this.parentNode.innerHTML='${initials}'" />` : initials;
          const isDeceased = node.lifeStatus === 'deceased' ? 'deceased' : '';
          return `
            <div 
              id="node-${node.id}" 
              class="tree-node ${node.gender} ${isDeceased}" 
              style="left: ${node.x}px; top: ${node.y}px;"
              onclick="selectPerson('${node.id}')"
            >
              <div class="avatar">${photoHtml}</div>
              <strong class="text-xs text-stone-900 leading-snug font-bold truncate w-full">${node.name}</strong>
              <span class="text-[9px] text-stone-500 font-semibold truncate mt-0.5">${node.lifeStatus === 'deceased' ? 'Late ' : ''}${node.gender === 'female' ? 'Female' : 'Male'}</span>
            </div>
          `;
        }).join('\n');

        const parentLinesHtml = serializedParentLines.map((line, idx) => `
          <path d="M ${line.parentX + nodeWidth / 2} ${line.parentY + 116} C ${line.parentX + nodeWidth / 2} ${line.parentY + 150}, ${line.childX + nodeWidth / 2} ${line.childY - 34}, ${line.childX + nodeWidth / 2} ${line.childY}" class="parent-line"></path>
        `).join('\n');

        const spouseLinesHtml = serializedSpouseLines.map((line, idx) => `
          <path d="M ${line.aX + nodeWidth} ${line.aY + 58} C ${(line.aX + line.bX + nodeWidth) / 2} ${line.aY + 42}, ${(line.aX + line.bX + nodeWidth) / 2} ${line.bY + 72}, ${line.bX} ${line.bY + 58}" class="spouse-line"></path>
        `).join('\n');

        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${familyName} - Standalone Vamshavali</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: {
              50: '#f0f9f6',
              100: '#d1efe5',
              600: '#0b5a43',
              700: '#094835',
              800: '#073a2b',
              900: '#052a20',
            },
            accent: {
              50: '#fdfbf7',
              100: '#fbf7ed',
              500: '#bba374',
              600: '#a38a5b',
            }
          },
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            serif: ['Playfair Display', 'serif'],
          }
        }
      }
    }
  </script>
  <style>
    body {
      background-color: #f5f3ee;
      user-select: none;
      -webkit-user-select: none;
    }
    .tree-canvas-container {
      position: relative;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
    .tree-canvas {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
      cursor: grab;
      background-color: #f5f3ee;
      background-image: radial-gradient(#d3cbbe 1.5px, transparent 1.5px);
      background-size: 28px 28px;
    }
    .tree-canvas:active {
      cursor: grabbing;
    }
    .parent-line {
      fill: none;
      stroke: #0b5a43;
      stroke-width: 2px;
      stroke-dasharray: 4 2;
      opacity: 0.55;
    }
    .spouse-line {
      fill: none;
      stroke: #bba374;
      stroke-width: 2px;
      stroke-dasharray: 5 3;
      opacity: 0.8;
    }
    .tree-node {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: ${nodeWidth}px;
      height: 116px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(28, 45, 38, 0.05);
      transition: all 0.2s ease, border-color 0.15s ease;
      font-family: inherit;
      padding: 12px;
      text-align: center;
      border: 1.5px solid transparent;
      cursor: pointer;
    }
    .tree-node:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(11, 90, 67, 0.1);
    }
    .tree-node.selected {
      border-color: #0b5a43;
      box-shadow: 0 0 0 3.5px rgba(11, 90, 67, 0.15), 0 8px 24px rgba(11, 90, 67, 0.12);
    }
    .tree-node.male {
      background: #fbfdff;
      border-left: 4.5px solid #3b82f6;
    }
    .tree-node.female {
      background: #fffbfe;
      border-left: 4.5px solid #ec4899;
    }
    .tree-node.deceased {
      background: #fafaf9;
      opacity: 0.82;
    }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #f1ede4;
      border: 1.5px solid #dcd7cb;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 6px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }
    .legend-dot.male { background-color: #3b82f6; }
    .legend-dot.female { background-color: #ec4899; }
    .legend-dot.deceased { background-color: #78716c; }
    .legend-ring {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid #bba374;
      display: inline-block;
    }
  </style>
</head>
<body class="overflow-hidden font-sans text-gray-800 antialiased">

  <!-- Main Container -->
  <div class="relative w-screen h-screen flex overflow-hidden">
    
    <!-- Top Header Overlay -->
    <header class="absolute top-4 left-4 right-4 z-40 flex flex-wrap justify-between items-center gap-3 pointer-events-none">
      <!-- Title Card -->
      <div class="bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-stone-200 shadow-xl pointer-events-auto flex items-center gap-4">
        <span class="text-3xl filter drop-shadow">📜</span>
        <div>
          <h1 class="font-serif text-lg md:text-xl font-extrabold text-primary-600 leading-tight">${familyName}</h1>
          <p class="text-[10px] uppercase tracking-wider text-stone-500 font-bold mt-0.5">
            ${gotraSubtitle} Standalone Vamshavali Map
          </p>
        </div>
      </div>

      <!-- Quick Search -->
      <div class="relative pointer-events-auto w-full max-w-xs">
        <div class="flex items-center bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-stone-200 shadow-xl">
          <svg class="w-4.5 h-4.5 text-stone-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" id="search-input" placeholder="${t("Search family members")}..." class="w-full bg-transparent border-none outline-none text-xs font-semibold text-stone-700 placeholder-stone-400" />
        </div>
        <!-- Search Dropdown Results -->
        <div id="search-results" class="absolute top-full mt-2 left-0 right-0 max-h-60 overflow-y-auto bg-white rounded-xl border border-stone-200 shadow-2xl hidden py-1"></div>
      </div>
    </header>

    <!-- Canvas Section -->
    <div class="tree-canvas-container flex-1" id="canvas-container">
      <div class="tree-canvas" id="tree-canvas" style="width: ${canvasWidth}px; height: ${canvasHeight}px;">
        
        <!-- Heritage Crest Banner on Canvas -->
        <div class="absolute top-8 left-0 w-full flex flex-col items-center justify-center text-center pointer-events-none">
          <div class="flex items-center gap-5 justify-center mb-1.5">
            ${kuladeviBanner}
            <div class="flex flex-col items-center">
              <h2 class="font-serif text-2xl font-bold text-primary-600 tracking-wide">${familyName}</h2>
              ${familyNumberBanner}
            </div>
            ${kuladevataBanner}
          </div>
          
          <div class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-primary-900/80 font-semibold max-w-lg mt-1">
            ${gotraInfoSpan}
            ${pravaraInfoSpan}
            ${kuladeviInfoSpan}
            ${kuladevataInfoSpan}
            ${nativeVillageInfoSpan}
          </div>
          <div class="w-48 h-[1px] bg-gradient-to-r from-transparent via-primary-600/40 to-transparent mt-3"></div>
        </div>

        <!-- Connection Lines SVG -->
        <svg class="absolute inset-0 pointer-events-none" width="${canvasWidth}" height="${canvasHeight}">
          <!-- Parent Lines -->
          ${parentLinesHtml}
          <!-- Spouse Lines -->
          ${spouseLinesHtml}
        </svg>

        <!-- Node buttons -->
        <div id="nodes-layer">
          ${nodesHtml}
        </div>

      </div>
    </div>

    <!-- Floating Legend & Controls -->
    <div class="absolute bottom-4 left-4 z-40 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-stone-200 shadow-xl flex flex-col gap-2 pointer-events-auto">
      <div class="flex items-center gap-3 text-[11px] font-semibold text-stone-600">
        <div class="flex items-center gap-1"><span class="legend-dot male"></span><span>Male</span></div>
        <div class="flex items-center gap-1"><span class="legend-dot female"></span><span>Female</span></div>
        <div class="flex items-center gap-1"><span class="legend-dot deceased"></span><span>Deceased</span></div>
        <div class="flex items-center gap-1"><span class="legend-ring"></span><span>Spouse</span></div>
      </div>
      <div class="h-[1px] bg-stone-100"></div>
      <div class="flex items-center gap-3">
        <button onclick="zoomOut()" class="p-2 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200 text-stone-700 transition" title="Zoom Out">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 12H4"></path></svg>
        </button>
        <span id="zoom-text" class="text-xs font-bold text-stone-600 min-w-[36px] text-center">100%</span>
        <button onclick="zoomIn()" class="p-2 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200 text-stone-700 transition" title="Zoom In">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
        </button>
        <button onclick="fitTree()" class="p-2 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200 text-stone-700 transition text-[11px] font-bold" title="Recenter">
          Recenter
        </button>
      </div>
    </div>

    <!-- Relative/Details Side Drawer -->
    <div id="details-drawer" class="fixed top-0 right-0 h-full w-full sm:w-96 bg-white border-l border-stone-200 shadow-2xl z-50 transform translate-x-full transition-transform duration-300 flex flex-col">
      <header class="bg-primary-600 text-white p-4 flex justify-between items-center">
        <div class="flex items-center gap-2">
          <span class="text-xl">👤</span>
          <h3 class="font-bold text-sm uppercase tracking-wider">Member Details</h3>
        </div>
        <button onclick="closeDrawer()" class="p-1 hover:bg-primary-700 rounded-lg transition text-white">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </header>

      <!-- Drawer Content -->
      <div id="drawer-body" class="flex-1 overflow-y-auto p-5 space-y-6"></div>
    </div>

  </div>

  <!-- Embed Family Database JSON -->
  <script>
    const FAMILY_DATA = {
      nodes: ${JSON.stringify(serializedNodes)},
      canvasWidth: ${canvasWidth},
      canvasHeight: ${canvasHeight},
      nodeWidth: ${nodeWidth}
    };

    let scale = 1.0;
    let offset = { x: 16, y: 16 };
    let isDragging = false;
    let dragStart = { x: 0, y: 0, ox: 0, oy: 0 };
    let selectedId = null;

    const container = document.getElementById('canvas-container');
    const canvas = document.getElementById('tree-canvas');
    const zoomText = document.getElementById('zoom-text');

    function updateTransform() {
      canvas.style.transform = 'translate(' + offset.x + 'px, ' + offset.y + 'px) scale(' + scale + ')';
      zoomText.textContent = Math.round(scale * 100) + '%';
    }

    container.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.tree-node') || e.target.closest('header') || e.target.closest('button') || e.target.closest('#details-drawer')) return;
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      container.setPointerCapture(e.pointerId);
    });

    container.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      offset.x = dragStart.ox + e.clientX - dragStart.x;
      offset.y = dragStart.oy + e.clientY - dragStart.y;
      updateTransform();
    });

    container.addEventListener('pointerup', (e) => {
      isDragging = false;
      try { container.releasePointerCapture(e.pointerId); } catch(err){}
    });

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = 1.08;
      const mouseX = e.clientX - container.offsetLeft;
      const mouseY = e.clientY - container.offsetTop;
      
      const canvasX = (mouseX - offset.x) / scale;
      const canvasY = (mouseY - offset.y) / scale;

      if (e.deltaY < 0) {
        scale = Math.min(1.7, scale * zoomFactor);
      } else {
        scale = Math.max(0.18, scale / zoomFactor);
      }

      offset.x = mouseX - canvasX * scale;
      offset.y = mouseY - canvasY * scale;

      updateTransform();
    }, { passive: false });

    function fitTree() {
      const box = container.getBoundingClientRect();
      const nextScale = Math.min(1, Math.max(0.22, Math.min(box.width / FAMILY_DATA.canvasWidth, box.height / FAMILY_DATA.canvasHeight) * 0.92));
      scale = nextScale;
      offset = {
        x: Math.max(16, (box.width - FAMILY_DATA.canvasWidth * nextScale) / 2),
        y: Math.max(16, (box.height - FAMILY_DATA.canvasHeight * nextScale) / 2)
      };
      updateTransform();
    }

    function zoomIn() {
      scale = Math.min(1.7, scale + 0.1);
      updateTransform();
    }

    function zoomOut() {
      scale = Math.max(0.18, scale - 0.1);
      updateTransform();
    }

    window.addEventListener('load', () => {
      fitTree();
    });

    window.addEventListener('resize', () => {
      fitTree();
    });

    function selectPerson(id) {
      if (selectedId) {
        const prevNode = document.getElementById('node-' + selectedId);
        if (prevNode) prevNode.classList.remove('selected');
      }
      
      selectedId = id;
      const currNode = document.getElementById('node-' + id);
      if (currNode) currNode.classList.add('selected');

      const person = FAMILY_DATA.nodes.find(p => p.id === id);
      if (person) {
        populateDrawer(person);
        openDrawer();
      }
    }

    function centerOnPerson(id) {
      const person = FAMILY_DATA.nodes.find(p => p.id === id);
      if (!person) return;
      
      const box = container.getBoundingClientRect();
      const targetX = person.x + FAMILY_DATA.nodeWidth / 2;
      const targetY = person.y + 58;

      offset.x = box.width / 2 - targetX * scale;
      offset.y = box.height / 2 - targetY * scale;

      updateTransform();
      selectPerson(id);
    }

    const drawer = document.getElementById('details-drawer');
    function openDrawer() {
      drawer.classList.remove('translate-x-full');
    }

    function closeDrawer() {
      drawer.classList.add('translate-x-full');
    }

    function populateDrawer(person) {
      const body = document.getElementById('drawer-body');
      const initials = person.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      const avatarHtml = person.photoUrl 
        ? '<img src="' + person.photoUrl + '" class="w-16 h-16 rounded-full border border-stone-300 object-cover shadow" onerror="this.parentNode.innerHTML=\\'' + initials + '\\''" />' 
        : '<div class="w-16 h-16 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-lg text-stone-500 shadow">' + initials + '</div>';

      const father = FAMILY_DATA.nodes.find(p => p.id === person.fatherId);
      const mother = FAMILY_DATA.nodes.find(p => p.id === person.motherId);
      const children = FAMILY_DATA.nodes.filter(child => child.fatherId === person.id || child.motherId === person.id);

      let relativesHtml = '';

      if (father) {
        relativesHtml += '<div class="p-2.5 bg-stone-50 rounded-xl hover:bg-stone-100 transition cursor-pointer flex items-center gap-3.5" onclick="centerOnPerson(\\'' + father.id + '\\')"><span class="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-md">Father</span><span class="text-sm font-semibold text-stone-800">' + father.name + '</span></div>';
      }
      if (mother) {
        relativesHtml += '<div class="p-2.5 bg-stone-50 rounded-xl hover:bg-stone-100 transition cursor-pointer flex items-center gap-3.5" onclick="centerOnPerson(\\'' + mother.id + '\\')"><span class="text-xs font-bold px-2 py-1 bg-pink-100 text-pink-700 rounded-md">Mother</span><span class="text-sm font-semibold text-stone-800">' + mother.name + '</span></div>';
      }

      if (children.length > 0) {
        relativesHtml += '<h4 class="text-xs font-bold text-stone-400 uppercase tracking-wider pt-2">Children (' + children.length + ')</h4>';
        children.forEach(child => {
          const typeLabel = child.gender === 'female' ? 'Daughter' : 'Son';
          relativesHtml += '<div class="p-2.5 bg-stone-50 rounded-xl hover:bg-stone-100 transition cursor-pointer flex items-center gap-3.5" onclick="centerOnPerson(\\'' + child.id + '\\')"><span class="text-[10px] font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md">' + typeLabel + '</span><span class="text-sm font-semibold text-stone-800">' + child.name + '</span></div>';
        });
      }

      body.innerHTML = '<div class="flex items-center gap-4 border-b border-stone-100 pb-5">' + avatarHtml + '<div><h4 class="font-serif text-lg font-bold text-stone-900">' + person.name + '</h4><span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ' + (person.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700') + ' mt-1 inline-block">' + (person.gender === 'female' ? 'Female' : 'Male') + ' • ' + person.lifeStatus.toUpperCase() + '</span></div></div><div class="space-y-4"><h4 class="text-xs font-bold text-stone-400 uppercase tracking-wider">Lineage Profile</h4><div class="grid grid-cols-2 gap-3.5 text-xs"><div class="bg-stone-50 p-3 rounded-xl border border-stone-200/60"><span class="block text-stone-400 font-bold mb-0.5">Gotra</span><strong class="text-stone-800 font-bold">' + (person.gotra || gotraVal || 'Not Specified') + '</strong></div><div class="bg-stone-50 p-3 rounded-xl border border-stone-200/60"><span class="block text-stone-400 font-bold mb-0.5">Rashi</span><strong class="text-stone-800 font-bold">' + (person.rashi || 'Not Specified') + '</strong></div><div class="bg-stone-50 p-3 rounded-xl border border-stone-200/60"><span class="block text-stone-400 font-bold mb-0.5">Birth Date</span><strong class="text-stone-800 font-bold">' + (person.dateOfBirth || 'Unknown') + '</strong></div><div class="bg-stone-50 p-3 rounded-xl border border-stone-200/60"><span class="block text-stone-400 font-bold mb-0.5">Life Status</span><strong class="text-stone-800 font-bold">' + person.lifeStatus.toUpperCase() + '</strong></div></div></div>' + (person.notes ? '<div class="space-y-2"><h4 class="text-xs font-bold text-stone-400 uppercase tracking-wider">Biography / Notes</h4><p class="text-xs text-stone-600 bg-stone-50 p-4 rounded-xl border border-stone-100 italic leading-relaxed whitespace-pre-line">' + person.notes + '</p></div>' : '') + '<div class="space-y-2 pt-2"><h4 class="text-xs font-bold text-stone-400 uppercase tracking-wider">Family Relatives</h4><div class="flex flex-col gap-2">' + (relativesHtml || '<p class="text-xs text-stone-400 italic">No direct ancestors or descendants mapped here.</p>') + '</div></div>';
    }

    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    searchInput.addEventListener('input', (e) => {
      const text = e.target.value.trim().toLowerCase();
      if (!text) {
        searchResults.classList.add('hidden');
        return;
      }

      const matches = FAMILY_DATA.nodes.filter(p => p.name.toLowerCase().includes(text));
      if (matches.length === 0) {
        searchResults.innerHTML = '<div class="px-4 py-2 text-xs text-stone-400 italic">No matches found</div>';
      } else {
        searchResults.innerHTML = matches.map(p => {
          return '<button onclick="centerOnPerson(\\'' + p.id + '\\'); hideSearchResults();" class="w-full text-left px-4 py-2 hover:bg-stone-50 text-xs font-semibold text-stone-700 flex justify-between items-center"><span>' + p.name + '</span><span class="text-[9px] uppercase tracking-wider bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-bold">' + p.gender + '</span></button>';
        }).join('');
      }
      searchResults.classList.remove('hidden');
    });

    function hideSearchResults() {
      searchResults.classList.add('hidden');
      searchInput.value = '';
    }

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add('hidden');
      }
    });
  </script>

</body>
</html>`;

        const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
        const link = document.createElement("a");
        link.download = `${tree?.name || "vamshavali"}-standalone-website.html`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      } else if (format === "png") {
        const dataUrl = await toPng(el, options);
        const link = document.createElement("a");
        link.download = `${tree?.name || "vamshavali"}-family-tree.png`;
        link.href = dataUrl;
        link.click();
      } else if (format === "jpeg") {
        const dataUrl = await toJpeg(el, options);
        const link = document.createElement("a");
        link.download = `${tree?.name || "vamshavali"}-family-tree.jpg`;
        link.href = dataUrl;
        link.click();
      } else if (format === "pdf") {
        const dataUrl = await toPng(el, options);
        const isLandscape = layout.canvasWidth > layout.canvasHeight;
        const pdf = new jsPDF({
          orientation: isLandscape ? "landscape" : "portrait",
          unit: "px",
          format: [layout.canvasWidth, layout.canvasHeight]
        });
        pdf.addImage(dataUrl, "PNG", 0, 0, layout.canvasWidth, layout.canvasHeight);
        pdf.save(`${tree?.name || "vamshavali"}-family-tree.pdf`);
      } else if (format === "print") {
        const dataUrl = await toPng(el, options);
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Print Vamshavali Family Tree - ${tree?.name || "Lineage"}</title>
                <style>
                  body {
                    margin: 0;
                    padding: 0;
                    background: #f5f3ee;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                  }
                  img {
                    max-width: 100%;
                    max-height: 100vh;
                    object-fit: contain;
                  }
                  @media print {
                    img {
                      max-width: 100%;
                      max-height: 100%;
                      page-break-inside: avoid;
                    }
                  }
                </style>
              </head>
              <body>
                <img src="${dataUrl}" onload="window.print(); window.close();" />
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      }
    } catch (err) {
      console.error("Export failed", err);
      const isIframe = window.self !== window.top;
      if (isIframe) {
        alert(`${t("Failed to export family tree. Please try again.")}\n\n💡 Tip: Since you are currently in the embedded preview iframe, your browser might block downloads or popups. Please click the "Open in new tab" icon at the top right of your screen and try exporting from there!`);
      } else {
        alert(t("Failed to export family tree. Please try again."));
      }
    } finally {
      setExporting(false);
    }
  }

  if (!people.length) {
    return (
      <section className="empty-tree">
        <Users size={34} />
        <h2>{t("No family members yet")}</h2>
        <p>{t("Add the account holder or import a CSV to begin the lineage map.")}</p>
      </section>
    );
  }

  return (
    <section className="tree-stage">
      <div className="tree-toolbar">
        <button title={t("Fit tree")} onClick={fit}><LocateFixed size={16} /></button>
        <button title={t("Zoom out")} onClick={() => setScale((value) => Math.max(0.18, value - 0.1))}><ZoomOut size={16} /></button>
        <span>{Math.round(scale * 100)}%</span>
        <button title={t("Zoom in")} onClick={() => setScale((value) => Math.min(1.7, value + 0.1))}><ZoomIn size={16} /></button>
        
        <div style={{ width: "1px", height: "18px", backgroundColor: "#d8d3ca", margin: "0 4px" }} />
        
        <div style={{ position: "relative" }}>
          <button
            title={t("Export or print family tree")}
            onClick={() => setShowExportMenu((prev) => !prev)}
            style={{ position: "relative" }}
            disabled={exporting}
          >
            {exporting ? (
              <span className="animate-spin" style={{ fontSize: "12px", height: "16px", display: "inline-flex", alignItems: "center" }}>⌛</span>
            ) : (
              <Download size={16} />
            )}
          </button>
          
          {showExportMenu && (
            <>
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 9,
                  cursor: "default"
                }}
                onClick={() => setShowExportMenu(false)}
              />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: "0",
                  zIndex: 10,
                  minWidth: "172px",
                  background: "#ffffff",
                  border: "1px solid #d8d3ca",
                  borderRadius: "8px",
                  boxShadow: "0 10px 25px -5px rgba(28, 45, 38, 0.12), 0 8px 10px -6px rgba(28, 45, 38, 0.12)",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <div style={{ padding: "5px 10px 3px 10px", fontSize: "10px", fontWeight: 800, color: "#8da19b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {t("Export Tree")}
                </div>
                <button
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "8px",
                    width: "100%",
                    minHeight: "32px",
                    padding: "0 10px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    color: "#18221f",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                  onClick={() => handleExport("png")}
                  className="export-menu-item"
                >
                  <Download size={14} style={{ color: "#065f46" }} /> {t("High-Res PNG")}
                </button>
                <button
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "8px",
                    width: "100%",
                    minHeight: "32px",
                    padding: "0 10px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    color: "#18221f",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                  onClick={() => handleExport("jpeg")}
                  className="export-menu-item"
                >
                  <Download size={14} style={{ color: "#065f46" }} /> {t("High-Res JPEG")}
                </button>
                <button
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "8px",
                    width: "100%",
                    minHeight: "32px",
                    padding: "0 10px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    color: "#18221f",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                  onClick={() => handleExport("pdf")}
                  className="export-menu-item"
                >
                  <Download size={14} style={{ color: "#0d9488" }} /> {t("PDF Document")}
                </button>
                <button
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "8px",
                    width: "100%",
                    minHeight: "32px",
                    padding: "0 10px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    color: "#18221f",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                  onClick={() => handleExport("print")}
                  className="export-menu-item"
                >
                  <Printer size={14} style={{ color: "#1d4ed8" }} /> {t("Print Layout")}
                </button>
                {canEdit && (
                  <button
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: "8px",
                      width: "100%",
                      minHeight: "32px",
                      padding: "0 10px",
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      color: "#0b5a43",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                    onClick={() => handleExport("html")}
                    className="export-menu-item"
                  >
                    <FileText size={14} style={{ color: "#0b5a43" }} /> {t("Standalone Website (HTML)")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <div
        className="tree-viewport"
        ref={viewportRef}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest(".tree-node") || (event.target as HTMLElement).closest(".tree-toolbar") || (event.target as HTMLElement).closest(".export-menu-item")) return;
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
          ref={canvasRef}
          style={{
            width: layout.canvasWidth,
            height: layout.canvasHeight,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            backgroundColor: "#f5f3ee",
            backgroundImage: "radial-gradient(#d3cbbe 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
          }}
        >
          {/* Heritage Crest Banner */}
          {tree && (
            <div
              className="canvas-header-banner"
              style={{
                position: "absolute",
                top: "24px",
                left: "0",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                pointerEvents: "none",
                fontFamily: "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "20px", justifyContent: "center" }}>
                {tree.kuldeviPhoto && (
                  <img 
                    src={proxyUrl(tree.kuldeviPhoto)} 
                    alt="Kuldevi/Deity" 
                    style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", border: "2.5px solid #0b5a43", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }} 
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "36px", filter: "sepia(0.3)" }}>📜</span>
                    <span style={{ fontSize: "24px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1.5px", color: "#0b5a43" }}>
                      {tree.name}
                    </span>
                  </div>
                  {tree.familyNumber && (
                    <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "2px" }}>
                      {t("Family number")}: {tree.familyNumber}
                    </span>
                  )}
                </div>
                {tree.kuladevataPhoto && (
                  <img 
                    src={proxyUrl(tree.kuladevataPhoto)} 
                    alt="Kuladevata/Deity" 
                    style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", border: "2.5px solid #0b5a43", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }} 
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "16px", marginTop: "6px", fontSize: "12px", color: "#425a54", fontWeight: 650 }}>
                {tree.gotra && <span><strong>{t("Gotra")}:</strong> {tree.gotra}</span>}
                {tree.pravara && <span><strong>{t("Pravara")}:</strong> {tree.pravara}</span>}
                {tree.kuladevi && <span><strong>{t("Kuladevi")}:</strong> {tree.kuladevi}</span>}
                {tree.kuladevata && <span><strong>{t("Kuladevata")}:</strong> {tree.kuladevata}</span>}
              </div>
              <div style={{ width: "240px", height: "1px", background: "linear-gradient(90deg, transparent, #0b5a43, transparent)", marginTop: "8px" }} />
            </div>
          )}

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
              <span className="avatar">{node.person.photoUrl ? <img src={proxyUrl(node.person.photoUrl)} alt="" crossOrigin="anonymous" referrerPolicy="no-referrer" /> : initials(node.person.displayName)}</span>
              <strong>{displayPersonName(node.person)}</strong>
              <small>{statusLabel(node.person, t)}</small>
              <span className="node-badges"><CircleDot size={13} /> {t("Generation")} {node.generation + 1}</span>
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
  currentPersonId,
  session
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
  session: Session | null;
}) {
  const t = useVamshavaliTranslate();
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
    ? t("Select a father first. Mother choices are based on his linked spouse records.")
    : fatherSpouses.length === 0
      ? t("No spouse is linked to the selected father yet.")
      : hasOneMother
        ? t("Automatically selected from the father's linked spouse.")
        : t("Choose from the father's linked spouses.");
  const spouseLabel = t("Wife / spouse");
  const marriedDaughterNotice = form.gender === "female" && form.maritalStatus === "married"
    ? t("Married daughters are shown as part of this family, but their husband and children should be maintained in the husband's family tree.")
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
          <p className="eyebrow">{t("Manual builder")}</p>
          <h2>{title}</h2>
        </div>
        <div className="surface-actions">
          <button onClick={onCancel}>{t("Cancel")}</button>
          <button className="primary-action" disabled={busy || !form.displayName.trim()} onClick={onSubmit}><Save size={16} />{t("Save person")}</button>
        </div>
      </header>
      <div className="form-grid">
        <TextInput label={t("Full name")} value={form.displayName} onChange={(displayName) => setForm((current) => ({ ...current, displayName }))} />
        <label className="field">
          <span>{t("Gender")}</span>
          <select value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value as Gender }))}>
            <option value="male">{t("Male")}</option>
            <option value="female">{t("Female")}</option>
            <option value="other">{t("Other")}</option>
            <option value="unknown">{t("Unknown")}</option>
          </select>
        </label>
        <label className="field">
          <span>{t("Living status")}</span>
          <select value={form.lifeStatus} onChange={(event) => setForm((current) => ({ ...current, lifeStatus: event.target.value as LifeStatus }))}>
            <option value="living">{t("Living")}</option>
            <option value="deceased">{t("Deceased")}</option>
            <option value="unknown">{t("Unknown")}</option>
          </select>
        </label>
        <label className="field">
          <span>{t("Marital status")}</span>
          <select value={form.maritalStatus} onChange={(event) => setForm((current) => ({ ...current, maritalStatus: event.target.value as MaritalStatus }))}>
            <option value="unmarried">{t("Unmarried")}</option>
            <option value="married">{t("Married")}</option>
            <option value="widowed">{t("Widowed")}</option>
            <option value="divorced">{t("Divorced")}</option>
            <option value="separated">{t("Separated")}</option>
            <option value="unknown">{t("Unknown")}</option>
          </select>
        </label>
        {form.maritalStatus === "married" && (
          form.gender === "male" ? (
            <label className="field">
              <span>{spouseLabel}</span>
              <select value={form.spouseId} onChange={(event) => setForm((current) => ({ ...current, spouseId: event.target.value }))}>
                <option value="">{t("Not linked yet")}</option>
                {eligibleSpouses.map((person) => <option key={person.id} value={person.id}>{displayPersonName(person)}</option>)}
              </select>
              <small>{t("Select an existing female spouse who is not already recorded as a daughter in this tree.")}</small>
            </label>
          ) : (
            <div className="field lineage-rule-note">
              <span>{t("Marriage continuation rule")}</span>
              <small>{marriedDaughterNotice || t("Set gender to Male if this person is a male lineage member whose next generation should continue here.")}</small>
            </div>
          )
        )}
        <TextInput label={t("Date of birth")} value={form.dateOfBirth} placeholder="YYYY-MM-DD" onChange={(dateOfBirth) => setForm((current) => ({ ...current, dateOfBirth }))} />
        <TextInput label={t("Date of death")} value={form.dateOfDeath} placeholder="YYYY-MM-DD" onChange={(dateOfDeath) => setForm((current) => ({ ...current, dateOfDeath }))} />
        <TextInput label={t("Death anniversary / tithi")} value={form.deathAnniversary} onChange={(deathAnniversary) => setForm((current) => ({ ...current, deathAnniversary }))} />
        <TextInput label={t("Rashi")} value={form.rashi} onChange={(rashi) => setForm((current) => ({ ...current, rashi }))} />
        <TextInput label={t("Gotra")} value={form.gotra} onChange={(gotra) => setForm((current) => ({ ...current, gotra }))} />
        <label className="field">
          <span>{t("Father")}</span>
          <select value={form.fatherId} onChange={(event) => setForm((current) => ({ ...current, fatherId: event.target.value }))}>
            <option value="">{t("Unknown / not set")}</option>
            {eligibleParents.map((person) => <option key={person.id} value={person.id}>{displayPersonName(person)}</option>)}
          </select>
          <small>{t("Only male lineage members can be selected as father for next-generation continuation.")}</small>
        </label>
        <label className="field parent-constrained">
          <span>{t("Mother")}</span>
          <select
            value={form.motherId}
            disabled={!hasMultipleMothers}
            onChange={(event) => setForm((current) => ({ ...current, motherId: event.target.value }))}
          >
            <option value="">{form.fatherId ? t("No eligible mother selected") : t("Select father first")}</option>
            {fatherSpouses.map((person) => <option key={person.id} value={person.id}>{displayPersonName(person)}</option>)}
          </select>
          <small>{motherHelp}</small>
        </label>
        <label className="field">
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{t("Photo URL")}</span>
            {form.photoUrl && (
              <button 
                type="button" 
                onClick={() => setForm((current) => ({ ...current, photoUrl: "" }))}
                style={{ fontSize: "10px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                {t("Remove")}
              </button>
            )}
          </span>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input 
              value={form.photoUrl} 
              placeholder="https://example.com/photo.jpg or upload" 
              onChange={(event) => setForm((current) => ({ ...current, photoUrl: event.target.value }))} 
              style={{ flex: 1, minWidth: 0 }}
            />
            <input 
              type="file" 
              accept="image/*" 
              id="member-image-upload"
              style={{ display: "none" }} 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async () => {
                  const base64 = reader.result;
                  try {
                    const response = await fetch("/api/lineage/upload", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(session ? { Authorization: `Bearer ${session.token}` } : {})
                      },
                      body: JSON.stringify({ image: base64 })
                    });
                    if (!response.ok) {
                      const errJson = await response.json().catch(() => ({}));
                      throw new Error(errJson.error || "Upload failed");
                    }
                    const json = await response.json();
                    setForm((current) => ({ ...current, photoUrl: json.url }));
                  } catch (err: any) {
                    alert(t("Image upload failed: ") + err.message);
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
            <button 
              type="button"
              className="secondary-action" 
              onClick={() => document.getElementById("member-image-upload")?.click()}
              style={{ padding: "10px 14px", borderRadius: "8px", fontSize: "11px", background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#1e293b", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
            >
              📷 {t("Upload Photo")}
            </button>
            {form.photoUrl && (
              <img 
                src={form.photoUrl} 
                alt="Upload Preview" 
                style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid #0b5a43", flexShrink: 0 }} 
                referrerPolicy="no-referrer" 
              />
            )}
          </div>
        </label>
        <label className="field wide">
          <span>{t("Bio / Notes")}</span>
          <textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </label>
        <div style={{ display: "flex", gap: "10px", marginTop: "15px", gridColumn: "1 / -1" }}>
          <button 
            type="button" 
            className="primary-action" 
            disabled={busy || !form.displayName.trim()} 
            onClick={onSubmit}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <Save size={16} />
            {t("Save person")}
          </button>
          <button 
            type="button" 
            onClick={onCancel}
          >
            {t("Cancel")}
          </button>
        </div>
      </div>
    </section>
  );
}

function TraditionPanel({ tree, request, busy, canEdit, session }: { tree: LineageTree; request: ReturnType<typeof useLineage>["request"]; busy: boolean; canEdit: boolean; session: Session | null }) {
  const t = useVamshavaliTranslate();
  const [draft, setDraft] = React.useState(tree);
  React.useEffect(() => setDraft(tree), [tree.id, tree.updatedAt]);
  function update(key: keyof LineageTree, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  return (
    <section className="surface traditions-surface">
      <header className="surface-head">
        <div>
          <p className="eyebrow">{t("Family record")}</p>
          <h2>{t("Traditions and identity")}</h2>
        </div>
        {canEdit && <button className="primary-action" disabled={busy} onClick={() => request("save-family", `/api/lineage/trees/${tree.id}`, { method: "PATCH", body: JSON.stringify(draft) })}><Save size={16} />{t("Save details")}</button>}
      </header>
      <div className="tradition-display">
        {[
          [t("Gotra"), draft.gotra],
          [t("Pravara"), draft.pravara],
          [t("Kuladevi"), draft.kuladevi],
          [t("Kuladevata"), draft.kuladevata],
          [t("Kulapurohit"), draft.kulapurohit],
          [t("Gramadevata"), draft.gramadevata],
          [t("Native village"), draft.nativeVillage],
          [t("Family surname"), draft.familySurname],
          [t("Family number"), draft.familyNumber]
        ].map(([label, value]) => (
          <div className="tradition-tile" key={label ?? ""}>
            <span>{label}</span>
            <strong>{value || t("Not recorded")}</strong>
          </div>
        ))}
        {draft.kuldeviPhoto && (
          <div className="tradition-tile" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span>{t("Kuladevi Deity Image")}</span>
            <img src={draft.kuldeviPhoto} alt={t("Kuladevi")} style={{ width: "64px", height: "64px", borderRadius: "8px", objectFit: "cover", border: "2px solid #0b5a43" }} referrerPolicy="no-referrer" />
          </div>
        )}
        {draft.kuladevataPhoto && (
          <div className="tradition-tile" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span>{t("Kuladevata Deity Image")}</span>
            <img src={draft.kuladevataPhoto} alt={t("Kuladevata")} style={{ width: "64px", height: "64px", borderRadius: "8px", objectFit: "cover", border: "2px solid #0b5a43" }} referrerPolicy="no-referrer" />
          </div>
        )}
      </div>
      <div className="form-grid traditions-form">
        <TextInput label={t("Lineage name")} value={draft.name ?? ""} onChange={(value) => update("name", value)} />
        <TextInput label={t("Account holder")} value={draft.accountHolderName ?? ""} onChange={(value) => update("accountHolderName", value)} />
        <TextInput label={t("Gotra")} value={draft.gotra ?? ""} onChange={(value) => update("gotra", value)} />
        <TextInput label={t("Pravara")} value={draft.pravara ?? ""} onChange={(value) => update("pravara", value)} />
        <TextInput label={t("Kuladevi")} value={draft.kuladevi ?? ""} onChange={(value) => update("kuladevi", value)} />
        <TextInput label={t("Kuladevata")} value={draft.kuladevata ?? ""} onChange={(value) => update("kuladevata", value)} />
        <TextInput label={t("Kulapurohit")} value={draft.kulapurohit ?? ""} onChange={(value) => update("kulapurohit", value)} />
        <TextInput label={t("Gramadevata")} value={draft.gramadevata ?? ""} onChange={(value) => update("gramadevata", value)} />
        <TextInput label={t("Native village")} value={draft.nativeVillage ?? ""} onChange={(value) => update("nativeVillage", value)} />
        <TextInput label={t("Family surname")} value={draft.familySurname ?? ""} onChange={(value) => update("familySurname", value)} />
        <TextInput label={t("Family number")} value={draft.familyNumber ?? ""} onChange={(value) => update("familyNumber", value)} />
        <TextInput label={t("Kuladevi Photo URL")} value={draft.kuldeviPhoto ?? ""} onChange={(value) => update("kuldeviPhoto", value)} />
        <TextInput label={t("Kuladevata Photo URL")} value={draft.kuladevataPhoto ?? ""} onChange={(value) => update("kuladevataPhoto", value)} />
        
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px dashed #cbd5e1" }}>
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("Upload Kuladevi Image")}</label>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "4px" }}>
            <input 
              type="file" 
              accept="image/*" 
              id="kuldevi-image-upload"
              style={{ display: "none" }} 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async () => {
                  const base64 = reader.result;
                  try {
                    const response = await fetch("/api/lineage/upload", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(session ? { Authorization: `Bearer ${session.token}` } : {})
                      },
                      body: JSON.stringify({ image: base64 })
                    });
                    if (!response.ok) {
                      const errJson = await response.json().catch(() => ({}));
                      throw new Error(errJson.error || "Upload failed");
                    }
                    const json = await response.json();
                    update("kuldeviPhoto", json.url);
                  } catch (err: any) {
                    alert(t("Image upload failed: ") + err.message);
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
            <button 
              type="button"
              className="secondary-action" 
              onClick={() => document.getElementById("kuldevi-image-upload")?.click()}
              style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "12px", background: "#ffffff", border: "1.5px solid #64748b", color: "#1e293b", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              📷 {t("Choose Image File")}
            </button>
            {draft.kuldeviPhoto && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <img src={draft.kuldeviPhoto} alt={t("Upload Preview")} style={{ width: "48px", height: "48px", borderRadius: "6px", objectFit: "cover", border: "1px solid #94a3b8" }} referrerPolicy="no-referrer" />
                <button 
                  type="button" 
                  onClick={() => update("kuldeviPhoto", "")}
                  style={{ background: "none", border: "none", color: "#ef4444", fontSize: "12px", fontWeight: "600", cursor: "pointer", textDecoration: "underline" }}
                >
                  {t("Remove photo")}
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px dashed #cbd5e1" }}>
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("Upload Kuladevata Image")}</label>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "4px" }}>
            <input 
              type="file" 
              accept="image/*" 
              id="kuladevata-image-upload"
              style={{ display: "none" }} 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async () => {
                  const base64 = reader.result;
                  try {
                    const response = await fetch("/api/lineage/upload", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(session ? { Authorization: `Bearer ${session.token}` } : {})
                      },
                      body: JSON.stringify({ image: base64 })
                    });
                    if (!response.ok) {
                      const errJson = await response.json().catch(() => ({}));
                      throw new Error(errJson.error || "Upload failed");
                    }
                    const json = await response.json();
                    update("kuladevataPhoto", json.url);
                  } catch (err: any) {
                    alert(t("Image upload failed: ") + err.message);
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
            <button 
              type="button"
              className="secondary-action" 
              onClick={() => document.getElementById("kuladevata-image-upload")?.click()}
              style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "12px", background: "#ffffff", border: "1.5px solid #64748b", color: "#1e293b", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              📷 {t("Choose Image File")}
            </button>
            {draft.kuladevataPhoto && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <img src={draft.kuladevataPhoto} alt={t("Upload Preview")} style={{ width: "48px", height: "48px", borderRadius: "6px", objectFit: "cover", border: "1px solid #94a3b8" }} referrerPolicy="no-referrer" />
                <button 
                  type="button" 
                  onClick={() => update("kuladevataPhoto", "")}
                  style={{ background: "none", border: "none", color: "#ef4444", fontSize: "12px", fontWeight: "600", cursor: "pointer", textDecoration: "underline" }}
                >
                  {t("Remove photo")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CsvImporter({ treeId, request }: { treeId: string; request: ReturnType<typeof useLineage>["request"] }) {
  const t = useVamshavaliTranslate();
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
          <p className="eyebrow">{t("Spreadsheet")}</p>
          <h2>{t("CSV import")}</h2>
        </div>
        <button onClick={previewCsv}><Upload size={16} />{t("Preview")}</button>
      </header>
      <textarea className="csv-box" value={csv} onChange={(event) => setCsv(event.target.value)} />
      {preview && (
        <div className="preview-box">
          <div className="preview-head">
            <strong>{preview.people.length} {t("people detected")}</strong>
            <button className="primary-action" onClick={commitCsv}><Check size={16} />{t("Commit import")}</button>
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
  const t = useVamshavaliTranslate();
  const { language } = useLanguage();
  const [sourceType, setSourceType] = React.useState<"telegram_text" | "telegram_voice" | "csv">("telegram_text");
  const [rawText, setRawText] = React.useState("My name is Arjun Deshpande. My father is Mahesh Deshpande. My mother is Kavita Deshpande. My grandfather was Ganesh Deshpande and grandmother was Sushila Deshpande. My wife is Priya Deshpande. Our gotra is Kashyap, Kuladevi is Tulja Bhavani, Gramadevata is Khandoba, my rashi is Vrischika.");
  
  const [isListening, setIsListening] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(language === "bn" ? "আপনার ব্রাউজার ভয়েস সমর্থন করে না। দয়া করে ক্রোম ব্যবহার করুন।" : language === "hi" ? "आपका ब्राउज़र वॉयस समर्थन नहीं करता है। कृपया क्रोम का उपयोग करें।" : "Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      
      if (language === "bn") {
        rec.lang = "bn-IN";
      } else if (language === "hi") {
        rec.lang = "hi-IN";
      } else {
        rec.lang = "en-US";
      }

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + " ";
          }
        }
        if (finalTranscript) {
          setRawText((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${finalTranscript.trim()}` : finalTranscript.trim();
          });
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      setIsListening(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  async function createProposal() {
    await request("telegram-proposal", "/api/lineage/telegram", { method: "POST", body: JSON.stringify({ treeId, rawText, sourceType }) });
  }
  return (
    <section className="surface">
      <header className="surface-head">
        <div>
          <p className="eyebrow">{t("Telegram and voice")}</p>
          <h2>{t("Reviewable intake")}</h2>
        </div>
        <button onClick={createProposal}>{sourceType === "telegram_voice" ? <Mic size={16} /> : <MessageCircle size={16} />}{t("Extract")}</button>
      </header>
      <div className="segmented">
        <button className={sourceType === "telegram_text" ? "active" : ""} onClick={() => setSourceType("telegram_text")}><MessageCircle size={15} />{t("Text")}</button>
        <button className={sourceType === "telegram_voice" ? "active" : ""} onClick={() => setSourceType("telegram_voice")}><Mic size={15} />{t("Voice transcript")}</button>
      </div>

      {/* Voice Recorder control / Mic button */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", margin: "12px 0", background: "rgba(244, 244, 245, 0.5)", padding: "10px 14px", borderRadius: "14px", border: "1px solid rgba(228, 228, 231, 0.5)" }}>
        <button 
          type="button" 
          onClick={toggleListening}
          className={`mic-record-btn ${isListening ? "recording active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "9999px",
            border: "none",
            outline: "none",
            fontWeight: "bold",
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            background: isListening ? "#ef4444" : "#0d9488",
            color: "#ffffff",
            boxShadow: isListening ? "0 0 15px rgba(239, 68, 68, 0.5)" : "0 4px 10px rgba(13, 148, 136, 0.15)",
          }}
        >
          <Mic size={16} className={isListening ? "animate-pulse" : ""} />
          {isListening 
            ? (language === "bn" ? "শুনছি... বন্ধ করতে ক্লিক করুন" : language === "hi" ? "सुन रहा हूँ... रोकने के लिए दबाएं" : "Listening... Click to stop") 
            : (language === "bn" ? "ভয়েস রেকর্ড করুন 🎤" : language === "hi" ? "आवाज रिकॉर्ड करें 🎤" : "Record Voice 🎤")
          }
        </button>
        {isListening ? (
          <div style={{ display: "flex", gap: "3px", alignItems: "center", marginLeft: "10px" }}>
            <span style={{ width: "4px", height: "14px", background: "#ef4444", borderRadius: "2px", animation: "pulse 0.8s ease-in-out infinite alternate" }} />
            <span style={{ width: "4px", height: "22px", background: "#ef4444", borderRadius: "2px", animation: "pulse 0.8s ease-in-out infinite alternate 0.15s" }} />
            <span style={{ width: "4px", height: "10px", background: "#ef4444", borderRadius: "2px", animation: "pulse 0.8s ease-in-out infinite alternate 0.3s" }} />
            <span style={{ width: "4px", height: "18px", background: "#ef4444", borderRadius: "2px", animation: "pulse 0.8s ease-in-out infinite alternate 0.45s" }} />
          </div>
        ) : (
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            {language === "bn" ? "মাইক্রোফোনের মাধ্যমে আপনার ভয়েস কথা বলে লিখুন" : language === "hi" ? "माइक्रोफोन के माध्यम से अपनी आवाज बोलकर लिखें" : "Speak through your mic to transcribe in real-time"}
          </span>
        )}
      </div>

      <textarea className="telegram-box" value={rawText} onChange={(event) => setRawText(event.target.value)} />
      <div className="proposal-list">
        {proposals.map((proposal) => (
          <article className="proposal" key={proposal.id}>
            <div>
              <strong>{proposal.proposal.people.length} {t("proposed people")}</strong>
              <span>{proposal.status} - {proposal.sourceType.replace("_", " ")}</span>
            </div>
            <p>{proposal.rawText}</p>
            {proposal.proposal.warnings.map((warning) => <small key={warning}>{warning}</small>)}
            {proposal.status === "pending" && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                <button className="primary-action" onClick={() => request(`commit-${proposal.id}`, `/api/lineage/proposals/${proposal.id}/commit`, { method: "POST" })}>
                  <Check size={16} />{t("Commit proposal")}
                </button>
                <button className="danger-action" onClick={() => request(`dismiss-${proposal.id}`, `/api/lineage/proposals/${proposal.id}/dismiss`, { method: "POST" })}>
                  <X size={16} />{t("Dismiss")}
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
  const t = useVamshavaliTranslate();
  const [spouseId, setSpouseId] = React.useState("");
  const peopleById = new Map(people.map((item) => [item.id, item]));
  const spouseNames = spouseNamesFor(person, peopleById, spouses);
  return (
    <aside className="detail-drawer">
      <button className="icon-only close-drawer" onClick={onClose}><X size={18} /></button>
      <div className={`drawer-avatar ${person.gender} ${person.lifeStatus}`}>{person.photoUrl ? <img src={proxyUrl(person.photoUrl)} alt="" crossOrigin="anonymous" referrerPolicy="no-referrer" /> : initials(person.displayName)}</div>
      <h2>{displayPersonName(person)}</h2>
      <p>{statusLabel(person, t)}</p>
      <div className="detail-grid">
        <span>{t("Father")}</span><strong>{person.fatherId ? displayPersonName(peopleById.get(person.fatherId)) : t("Unknown")}</strong>
        <span>{t("Mother")}</span><strong>{person.motherId ? displayPersonName(peopleById.get(person.motherId)) : t("Unknown")}</strong>
        <span>{t("Spouse")}</span><strong>{spouseNames.join(", ") || t("Not linked")}</strong>
        <span>{t("DOB")}</span><strong>{person.dateOfBirth || t("Unknown")}</strong>
        <span>{t("DOD")}</span><strong>{person.dateOfDeath || t("Not applicable")}</strong>
        <span>{t("Anniversary")}</span><strong>{person.deathAnniversary || t("Unknown")}</strong>
        <span>{t("Rashi")}</span><strong>{person.rashi || t("Unknown")}</strong>
        <span>{t("Gotra")}</span><strong>{person.gotra || t("Unknown")}</strong>
      </div>
      {person.notes && <p className="drawer-notes">{person.notes}</p>}
      <div className="drawer-actions">
        {canEdit ? (
          <>
            <button className="primary-action" onClick={onEdit}><UserRound size={16} />{t("Edit person")}</button>
            <button className="danger-action" onClick={onDelete}><Trash2 size={16} />{t("Delete person")}</button>
            <div className="inline-linker">
              <select value={spouseId} onChange={(event) => setSpouseId(event.target.value)}>
                <option value="">{t("Select spouse")}</option>
                {people.filter((item) => item.id !== person.id).map((item) => <option key={item.id} value={item.id}>{displayPersonName(item)}</option>)}
              </select>
              <button disabled={!spouseId} onClick={() => { onLinkSpouse(spouseId); setSpouseId(""); }}><Heart size={16} /></button>
            </div>
          </>
        ) : (
          <p className="settings-note">{t("Read-only access. Ask the tree owner for edit permission.")}</p>
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
  const t = useVamshavaliTranslate();
  const generations = new Set(generationMap(people, spouses).values());
  return (
    <section className="overview-grid">
      <div className="lineage-hero">
        <p className="eyebrow">{t("Digital Vanshavali")}</p>
        <h1>{tree.name}</h1>
        <p>{tree.notes || t("A private, structured family chronicle for lineage, identity, and family traditions.")}</p>
        <div className="hero-actions">
          <button className="primary-action" onClick={() => onView("tree")}>{t("Open family tree")}</button>
          {canEdit && <button onClick={onAddPerson}><Plus size={16} />{t("Add member")}</button>}
        </div>
      </div>
      <div className="stat-grid">
        <span><Users size={18} /><strong>{people.length}</strong>{t("People")}</span>
        <span><ChevronsUpDown size={18} /><strong>{generations.size}</strong>{t("Generations")}</span>
        <span><Heart size={18} /><strong>{spouses.length}</strong>{t("Marriages")}</span>
        <span><Baby size={18} /><strong>{people.filter((person) => person.fatherId || person.motherId).length}</strong>{t("Child links")}</span>
      </div>
      <div className="tradition-strip">
        <div><span>{t("Gotra")}</span><strong>{tree.gotra || t("Not recorded")}</strong></div>
        <div>
          <span>{t("Kuladevi")}</span>
          <strong style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
            {tree.kuldeviPhoto && <img src={proxyUrl(tree.kuldeviPhoto)} alt="" style={{ width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover" }} crossOrigin="anonymous" referrerPolicy="no-referrer" />}
            {tree.kuladevi || t("Not recorded")}
          </strong>
        </div>
        <div>
          <span>{t("Kuladevata")}</span>
          <strong style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
            {tree.kuladevataPhoto && <img src={proxyUrl(tree.kuladevataPhoto)} alt="" style={{ width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover" }} crossOrigin="anonymous" referrerPolicy="no-referrer" />}
            {tree.kuladevata || t("Not recorded")}
          </strong>
        </div>
        <div><span>{t("Family No.")}</span><strong>{tree.familyNumber || t("Not recorded")}</strong></div>
        <div><span>{t("Native village")}</span><strong>{tree.nativeVillage || t("Not recorded")}</strong></div>
      </div>
      <section className="surface">
        <header className="surface-head">
          <div>
            <p className="eyebrow">{t("Recent records")}</p>
            <h2>{t("Family members")}</h2>
          </div>
          <button onClick={() => onView("people")}>{t("Manage people")}</button>
        </header>
        <div className="people-table">
          {people.slice(0, 8).map((person) => (
            <div key={person.id}>
              <span className={`person-dot ${person.gender} ${person.lifeStatus}`} />
              <strong>{displayPersonName(person)}</strong>
              <small>{statusLabel(person, t)}</small>
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
  const t = useVamshavaliTranslate();
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
          <p className="eyebrow">{t("Directory")}</p>
          <h2>{filteredPeople.length === people.length ? `${people.length} ${t("people")}` : `${filteredPeople.length} ${t("of")} ${people.length} ${t("people")}`}</h2>
        </div>
        {canEdit && <button className="primary-action" onClick={onAddPerson}><Plus size={16} />{t("Add new person")}</button>}
      </header>
      <div className="generation-list">
        {groups.map(({ generation, members }) => (
          <section className="generation-group" key={generation}>
            <header className="generation-head">
              <div>
                <strong>{t("Generation")} {generation + 1}</strong>
                <span>{generation === 0 ? t("Oldest known ancestors and root records") : `${t("Level")} ${generation + 1} ${t("in the lineage")}`}</span>
              </div>
              <small>{members.length} {members.length === 1 ? t("person") : t("people")}</small>
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
                      <small>{statusLabel(person, t)}</small>
                    </div>
                    <div className="relationship-meta">
                      <span><CircleDot size={13} />{t("Generation")} {generation + 1}</span>
                      <span>{parentSummary(person, peopleById, t)}</span>
                      <span><Heart size={13} />{spouseNames.length ? `${t("Married to")} ${spouseNames.join(", ")}` : t("Spouse not linked")}</span>
                      <span><Baby size={13} />{childCount} {childCount === 1 ? t("child") : t("children")} {t("linked")}</span>
                    </div>
                    <div className="person-actions">
                      <button onClick={() => onOpen(person.id)}>{t("Open")}</button>
                      {canEdit && <button onClick={() => onEdit(person)}><UserRound size={14} />{t("Edit")}</button>}
                      {canEdit && <button className="danger-action" onClick={() => onDelete(person)}><Trash2 size={14} />{t("Delete")}</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {!groups.length && (
          <div className="empty-directory">
            <strong>{t("No matching people")}</strong>
            <span>{t("Try another search or add a new family member.")}</span>
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
  const t = useVamshavaliTranslate();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<"viewer" | "contributor" | "admin">("viewer");
  const [access, setAccess] = React.useState<TreeAccess | null>(null);
  const [inviteLink, setInviteLink] = React.useState("");
  const canManageAccess = state.activeRole === "owner" || state.activeRole === "admin";
  const activeTreeId = state.activeTreeId;

  const getAppOrigin = () => {
    const envUrl = process.env.APP_URL;
    if (envUrl && typeof envUrl === "string" && envUrl.trim() && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl.trim().replace(/\/$/, "");
    }
    const loc = window.location.origin;
    if (loc && (loc.includes("europe-west2.run.app") || loc.includes("google.com") || loc.includes("aistudio"))) {
      return "https://barnia.in";
    }
    return loc;
  };

  const { language, setLanguage } = useLanguage();
  const [selLang, setSelLang] = React.useState<"en" | "bn" | "hi">(session.account.language as any || "en");
  const [savingLang, setSavingLang] = React.useState(false);

  async function saveLanguagePreference() {
    setSavingLang(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/language", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({ language: selLang })
      });
      const data = await response.json();
      if (response.ok && data.account) {
        onSessionChange({ ...session, account: data.account });
        setLanguage(selLang);
        setMessage(
          selLang === "bn"
            ? "ভাষা পছন্দ সফলভাবে সংরক্ষণ করা হয়েছে!"
            : selLang === "hi"
            ? "भाषा प्राथमिकता सफलतापूर्वक सहेजी गई!"
            : "Language preference saved successfully!"
        );
      } else {
        setMessage(data.error || t("Failed to save language preference."));
      }
    } catch (err: any) {
      setMessage(err?.message || t("An error occurred."));
    } finally {
      setSavingLang(false);
    }
  }

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
      setMessage(session.account.hasPassword ? t("Password changed.") : t("Password set for this account."));
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
      setMessage(json.error ?? t("Could not create invite."));
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
            <p className="eyebrow">{t("Account")}</p>
            <h2>{t("Profile and security")}</h2>
          </div>
        </header>
        <div className="account-summary">
          <div><span>{t("Name")}</span><strong>${session.account.name}</strong></div>
          <div><span>{t("Email")}</span><strong>${session.account.email}</strong></div>
          <div><span>{t("Password")}</span><strong>${session.account.hasPassword ? t("Enabled") : t("Access code only")}</strong></div>
          <div><span>{t("Role on active tree")}</span><strong>${t(state.activeRole ?? "None")}</strong></div>
          <div><span>{t("Family trees")}</span><strong>${state.trees.length} ${t("of")} ${session.maxTreesPerAccount}</strong></div>
        </div>
      </section>

      <section className="surface">
        <header className="surface-head">
          <div>
            <p className="eyebrow">{t("Public view link")}</p>
            <h2>{t("Share family tree")}</h2>
          </div>
        </header>
        <p className="settings-note">{t("Anyone with this link can view this family tree in read-only mode without needing to sign in.")}</p>
        <div className="invite-form" style={{ gap: "12px", alignItems: "flex-end" }}>
          <label className="field" style={{ flex: 1, margin: 0 }}>
            <span>{t("Family tree share link / Profile ID link")}</span>
            <input 
              readOnly 
              value={`${getAppOrigin()}/vamshavali/v/${activeTreeId}`} 
              onFocus={(event) => event.currentTarget.select()} 
            />
          </label>
          <button 
            className="primary-action" 
            style={{ height: "40px" }}
            onClick={() => {
              const url = `${getAppOrigin()}/vamshavali/v/${activeTreeId}`;
              navigator.clipboard.writeText(url);
              setMessage(t("Family tree link copied to clipboard."));
            }}
          >
            {t("Copy link")}
          </button>
        </div>
      </section>
      <section className="surface">
        <header className="surface-head">
          <div>
            <p className="eyebrow">{t("Family access")}</p>
            <h2>{t("Invite family members")}</h2>
          </div>
        </header>
        {!canManageAccess && <p className="settings-note">{t("Your role for this tree is {0}. Only owners and admins can invite family members.", state.activeRole)}</p>}
        {canManageAccess && (
          <>
            <div className="invite-form">
              <label className="field">
                <span>{t("Email address")}</span>
                <input value={inviteEmail} placeholder="relative@example.com" onChange={(event) => setInviteEmail(event.target.value)} />
              </label>
              <label className="field">
                <span>{t("Role")}</span>
                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "viewer" | "contributor" | "admin")}>
                  <option value="viewer">{t("Viewer - read only")}</option>
                  <option value="contributor">{t("Contributor - can edit lineage")}</option>
                  <option value="admin">{t("Admin - can edit and invite")}</option>
                </select>
              </label>
              <button className="primary-action" disabled={!inviteEmail.trim()} onClick={createInvite}><Plus size={16} />{t("Create invite link")}</button>
            </div>
            {inviteLink && (
              <label className="field invite-link-field">
                <span>{t("Invite link for family members")}</span>
                <input readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} />
              </label>
            )}
            <div className="access-grid">
              <section>
                <h3>{t("Members")}</h3>
                <div className="tree-list">
                  {(access?.members ?? []).map((member) => (
                    <div key={member.accountId}>
                      <strong>{member.name}</strong>
                      <span>{member.email} - {t(member.role)}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3>{t("Invites")}</h3>
                <div className="tree-list">
                  {(access?.invitations ?? []).map((invite) => (
                    <div key={invite.id}>
                      <strong>{invite.email}</strong>
                      <span>{t(invite.role)} - {t(invite.status)}</span>
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
            <p className="eyebrow">{t("Password login")}</p>
            <h2>{session.account.hasPassword ? t("Change password") : t("Set password")}</h2>
          </div>
          <button className="primary-action" disabled={newPassword.length < 8 || (session.account.hasPassword && !currentPassword)} onClick={changePassword}>
            <KeyRound size={16} />{t("Save password")}
          </button>
        </header>
        <div className="form-grid">
          {session.account.hasPassword && (
            <label className="field">
              <span>{t("Current password")}</span>
              <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </label>
          )}
          <label className="field">
            <span>{t("New password")}</span>
            <input type="password" value={newPassword} placeholder={t("Minimum 8 characters")} onChange={(event) => setNewPassword(event.target.value)} />
          </label>
        </div>
        {message && <p className="busy">{message}</p>}
      </section>

      <section className="surface">
        <header className="surface-head">
          <div>
            <p className="eyebrow">{t("Language Preference")}</p>
            <h2>{t("Set default language")}</h2>
          </div>
        </header>
        <p className="settings-note" style={{ marginBottom: "16px" }}>
          {t("This language will be set as your default whenever you log in and the Telegram AI Bot will chat with you in this language.")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {(["en", "bn", "hi"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setSelLang(lang)}
                style={{
                  flex: "1 1 120px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  fontSize: "13px",
                  border: selLang === lang ? "1.5px solid #0b5a43" : "1.5px solid #d7d2c8",
                  background: selLang === lang ? "#0b5a43" : "#ffffff",
                  color: selLang === lang ? "#ffffff" : "#27272a",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  textAlign: "center"
                }}
              >
                {lang === "en" ? "English 🇬🇧" : lang === "bn" ? "বাংলা 🇧🇩/🇮🇳" : "हिंदी 🇮🇳"}
              </button>
            ))}
          </div>
          <button
            className="primary-action"
            style={{ alignSelf: "flex-start", minHeight: "40px" }}
            onClick={saveLanguagePreference}
            disabled={savingLang}
          >
            {savingLang ? t("Saving...") : t("Save Preference")}
          </button>
        </div>
      </section>

      <section className="surface">
        <header className="surface-head">
          <div>
            <p className="eyebrow">{t("Family trees")}</p>
            <h2>{t("Tree allowance")}</h2>
          </div>
          <button
            className="primary-action"
            disabled={state.trees.length >= session.maxTreesPerAccount}
            onClick={createAdditionalTree}
          >
            <Plus size={16} />{t("Create another tree")}
          </button>
        </header>
        <p className="settings-note">{t("This account can create {0} family trees.", session.maxTreesPerAccount)}</p>
        <div className="tree-list">
          {state.trees.map((tree) => (
            <div key={tree.id}>
              <strong>{tree.name}</strong>
              <span>{tree.accountHolderName || t("Account holder not recorded")}</span>
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
  const lineage = useLineage(
    session,
    isPublic ? (shareId ?? null) : (session?.treeId ?? null),
    true,
    isPublic,
    () => {
      if (!isPublic) {
        onLogout();
      }
    }
  );
  const { language, setLanguage, t } = useLanguage();
  const vt = useVamshavaliTranslate();

  React.useEffect(() => {
    if (session?.account?.language) {
      setLanguage(session.account.language as any);
    }
  }, [session?.account?.language, setLanguage]);

  const [view, setView] = React.useState<AppView>("overview");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [form, setForm] = React.useState<PersonForm>(emptyPersonForm);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isPersonEditorOpen, setIsPersonEditorOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const [isDeityModalOpen, setIsDeityModalOpen] = React.useState(false);
  const [deityFormDraft, setDeityFormDraft] = React.useState({
    kuladevi: "",
    kuladevata: "",
    kuldeviPhoto: "",
    kuladevataPhoto: ""
  });
  const [isDeityUploading, setIsDeityUploading] = React.useState(false);

  React.useEffect(() => {
    if (lineage.state?.activeTreeId && lineage.state.trees) {
      const activeTree = lineage.state.trees.find((item) => item.id === lineage.state!.activeTreeId) ?? lineage.state.trees[0];
      if (activeTree) {
        setDeityFormDraft({
          kuladevi: activeTree.kuladevi ?? "",
          kuladevata: activeTree.kuladevata ?? "",
          kuldeviPhoto: activeTree.kuldeviPhoto ?? "",
          kuladevataPhoto: activeTree.kuladevataPhoto ?? ""
        });
      }
    }
  }, [lineage.state?.activeTreeId, lineage.state?.trees, isDeityModalOpen]);

  // Synchronize frontend session's active tree if it differs from the server's computed active tree ID
  React.useEffect(() => {
    if (lineage.state?.activeTreeId && session && lineage.state.activeTreeId !== session.treeId) {
      onSessionChange({ ...session, treeId: lineage.state.activeTreeId });
    }
  }, [lineage.state?.activeTreeId, session, onSessionChange]);

  function handleTreeCreated(treeId: string) {
    if (!session) return;
    const next = { ...session, treeId };
    onSessionChange(next);
    setView("people");
    setIsMobileMenuOpen(false);
  }

  if (lineage.error) {
    return (
      <main className="loading-screen" style={{ flexDirection: "column", padding: "20px", textAlign: "center", gap: "12px" }}>
        <Users size={32} style={{ color: "#ef4444" }} />
        <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#18221f" }}>{vt("Could Not Load Family Tree")}</h2>
        <p style={{ fontSize: "14px", color: "#4b5563", maxWidth: "320px", lineHeight: "1.5" }}>{lineage.error}</p>
        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          <button 
            type="button"
            onClick={() => lineage.refresh()} 
            style={{ 
              padding: "8px 16px", 
              background: "#0b5a43", 
              color: "#ffffff", 
              border: "none", 
              borderRadius: "6px", 
              fontSize: "13px", 
              fontWeight: 600, 
              cursor: "pointer" 
            }}
          >
            {vt("Retry")}
          </button>
          {!isPublic && (
            <button 
              type="button"
              onClick={onLogout} 
              style={{ 
                padding: "8px 16px", 
                background: "#ffffff", 
                color: "#18221f", 
                border: "1px solid #d8d3ca", 
                borderRadius: "6px", 
                fontSize: "13px", 
                fontWeight: 600, 
                cursor: "pointer" 
              }}
            >
              {vt("Log Out")}
            </button>
          )}
        </div>
      </main>
    );
  }

  if (!lineage.state) {
    return <main className="loading-screen"><Users size={28} />{vt("Loading lineage...")}</main>;
  }

  if (!lineage.state.activeTreeId) {
    if (!session) return <main className="loading-screen"><Users size={28} />{vt("Family tree not found.")}</main>;
    return <Onboarding session={session} onTreeCreated={handleTreeCreated} request={lineage.request} onLogout={onLogout} />;
  }

  const tree = lineage.state.trees.find((item) => item.id === lineage.state!.activeTreeId) ?? lineage.state.trees[0];
  if (typeof window !== "undefined" && tree) {
    const isSuryavamsha = (tree.id === "LODSRIRAM") || 
      (tree.name?.toLowerCase().includes("suryavamsha")) || 
      (tree.name?.toLowerCase().includes("raghuvansh")) || 
      (tree.name?.toLowerCase().includes("sri ram"));
    (window as any).isSuryavamshaActive = isSuryavamsha;
  }
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
      vt("Delete {0} from this lineage? Their spouse links will be removed and child parent references to them will be cleared.", displayPersonName(person, vt))
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
            ["overview", HomeIcon, vt("Overview")],
            ["tree", Users, vt("Tree")],
            ["people", UserRound, vt("People")],
            ["traditions", Landmark, vt("Family Details")],
            ...(canEdit ? [["import", Upload, vt("Import")] as const] : []),
            ...(!isPublic ? [["account", KeyRound, vt("Account")] as const] : [])
          ].map(([key, Icon, label]) => (
            <button key={key as string} className={view === key ? "active" : ""} onClick={() => navigate(key as AppView)}>
              {React.createElement(Icon as typeof HomeIcon, { size: 17 })}
              {label as string}
            </button>
          ))}
        </nav>
        <button className="logout-button" onClick={onLogout}>
          <LogOut size={16} />{isPublic ? vt("Admin Log In") : vt("Sign out")}
        </button>
      </aside>

      <section className="app-main">
        <header className="app-topbar">
          <div>
            <p className="eyebrow">{isPublic ? vt("Public family archive") : vt("Private family archive")}</p>
            <h1>{tree.name}</h1>
          </div>
          <div className="topbar-tools" style={{ gap: "10px", flexWrap: "wrap" }}>
            {/* Telegram Bot Link */}
            <a 
              href={`https://t.me/${(typeof import.meta.env.VITE_TELEGRAM_BOT_USERNAME === 'string' && import.meta.env.VITE_TELEGRAM_BOT_USERNAME.trim() !== '' && import.meta.env.VITE_TELEGRAM_BOT_USERNAME !== 'undefined') ? import.meta.env.VITE_TELEGRAM_BOT_USERNAME.replace('@', '').trim() : 'Vamshavali_bot'}?start=${(tree as any).shareId || tree.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "#0088cc",
                color: "#ffffff",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: "bold",
                textDecoration: "none",
                boxShadow: "0 2px 6px rgba(0,136,204,0.15)",
                whiteSpace: "nowrap",
                height: "36px"
              }}
            >
              <MessageCircle size={14} /> {vt("Telegram AI Bot")}
            </a>

            {/* Language Selection */}
            <div style={{ display: "flex", alignItems: "center", background: "#ffffff", border: "1px solid #d7d2c8", borderRadius: "8px", padding: "2px", height: "36px" }}>
              {(["bn", "en", "hi"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: "bold",
                    border: "none",
                    cursor: "pointer",
                    background: language === lang ? "#0b5a43" : "transparent",
                    color: language === lang ? "#ffffff" : "#475569",
                    transition: "all 0.15s ease",
                    minHeight: "auto",
                    lineHeight: "1"
                  }}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            {!isPublic && session && lineage.state.trees.length > 1 && (
              <label className="tree-switcher">
                <span>{vt("Family tree")}</span>
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
              <input value={search} placeholder={vt("Search family members")} onChange={(event) => setSearch(event.target.value)} />
            </div>
            {!isPublic && session && (
              <button className="account-chip" onClick={() => setView("account")}><ShieldCheck size={15} />{session.account.email}</button>
            )}
            {isPublic && (
              <button className="account-chip" onClick={() => window.location.href = "/vamshavali"}><ShieldCheck size={15} />{vt("Log in")}</button>
            )}
          </div>
        </header>

        {lineage.error && <p className="error">{lineage.error}</p>}
        {lineage.busy && <p className="busy">{vt("Working on {0}...", lineage.busy)}</p>}

        {inviteMessage && <p className="busy invite-status" onClick={onInviteMessageClear}>{inviteMessage}</p>}
        {view === "overview" && <Overview tree={tree} people={people} spouses={spouses} onView={setView} onAddPerson={addPerson} canEdit={canEdit} />}
        {view === "tree" && (
          <section className="surface tree-surface">
            <header className="surface-head" style={{ flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
              <div style={{ flex: "1 1 200px" }}>
                <p className="eyebrow">{vt("Bird's-eye lineage")}</p>
                <h2>{vt("Family tree")}</h2>
              </div>

              {/* Kuldevi / Kuldevata Image & Name Widget */}
              <div 
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  background: "#fcfaf2",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1.5px solid #eae2cb",
                  boxShadow: "0 2px 10px rgba(11, 90, 67, 0.05)",
                  fontFamily: "inherit",
                  flex: "1 1 auto",
                  maxWidth: "520px",
                  transition: "all 0.25s ease-in-out"
                }}
              >
                {/* Kuldevi Photo on Left */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {tree.kuldeviPhoto ? (
                    <img 
                      src={proxyUrl(tree.kuldeviPhoto)} 
                      alt="Kuldevi" 
                      style={{ 
                        width: "56px", 
                        height: "56px", 
                        borderRadius: "8px", 
                        objectFit: "cover", 
                        border: "2px solid #bba374",
                        cursor: canEdit ? "pointer" : "default"
                      }}
                      onClick={() => canEdit && setIsDeityModalOpen(true)}
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div 
                      style={{ 
                        width: "56px", 
                        height: "56px", 
                        borderRadius: "8px", 
                        background: "#f2ede0", 
                        border: "1.5px dashed #bba374", 
                        display: "flex", 
                        flexDirection: "column",
                        alignItems: "center", 
                        justifyContent: "center",
                        cursor: canEdit ? "pointer" : "default"
                      }}
                      onClick={() => canEdit && setIsDeityModalOpen(true)}
                    >
                      <span style={{ fontSize: "18px" }}>🛕</span>
                      <span style={{ fontSize: "7px", color: "#bba374", fontWeight: 700, textTransform: "uppercase" }}>Devi</span>
                    </div>
                  )}
                </div>

                {/* Text Info in Middle */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: "1" }}>
                  <span style={{ fontSize: "10px", color: "#bba374", fontWeight: 750, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {vt("Deity Blessings")}
                  </span>
                  <div style={{ fontSize: "12px", color: "#18221f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      <strong>{vt("Kuldevi")}:</strong>{" "}
                      <span style={{ color: tree.kuladevi ? "#0b5a43" : "#8a9490", fontWeight: tree.kuladevi ? 600 : 400 }}>
                        {tree.kuladevi || vt("Not set")}
                      </span>
                    </div>
                    <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      <strong>{vt("Kuldevata")}:</strong>{" "}
                      <span style={{ color: tree.kuladevata ? "#0b5a43" : "#8a9490", fontWeight: tree.kuladevata ? 600 : 400 }}>
                        {tree.kuladevata || vt("Not set")}
                      </span>
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setIsDeityModalOpen(true)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: "0",
                        color: "#0b5a43",
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        cursor: "pointer",
                        textDecoration: "underline",
                        textAlign: "left"
                      }}
                    >
                      {vt("Edit Deity info")}
                    </button>
                  )}
                </div>

                {/* Kuladevata Photo on Right */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {tree.kuladevataPhoto ? (
                    <img 
                      src={proxyUrl(tree.kuladevataPhoto)} 
                      alt="Kuladevata" 
                      style={{ 
                        width: "56px", 
                        height: "56px", 
                        borderRadius: "8px", 
                        objectFit: "cover", 
                        border: "2px solid #bba374",
                        cursor: canEdit ? "pointer" : "default"
                      }}
                      onClick={() => canEdit && setIsDeityModalOpen(true)}
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div 
                      style={{ 
                        width: "56px", 
                        height: "56px", 
                        borderRadius: "8px", 
                        background: "#f2ede0", 
                        border: "1.5px dashed #bba374", 
                        display: "flex", 
                        flexDirection: "column",
                        alignItems: "center", 
                        justifyContent: "center",
                        cursor: canEdit ? "pointer" : "default"
                      }}
                      onClick={() => canEdit && setIsDeityModalOpen(true)}
                    >
                      <span style={{ fontSize: "18px" }}>🛕</span>
                      <span style={{ fontSize: "7px", color: "#bba374", fontWeight: 700, textTransform: "uppercase" }}>Devata</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="legend" style={{ margin: 0 }}>
                <span className="legend-dot male" />{vt("Male")}
                <span className="legend-dot female" />{vt("Female")}
                <span className="legend-dot deceased" />{vt("Deceased")}
                <span className="legend-ring" />{vt("Married")}
              </div>
            </header>
            <FamilyTreeCanvas people={filteredPeople} spouses={spouses} selectedId={selectedId} onSelect={setSelectedId} tree={tree} canEdit={canEdit} />
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
                title={editingId ? vt("Edit family member") : vt("Add family member")}
                currentPersonId={editingId}
                onSubmit={savePerson}
                onCancel={cancelPersonEdit}
                session={session}
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
        {view === "traditions" && <TraditionPanel tree={tree} request={lineage.request} busy={Boolean(lineage.busy)} canEdit={canEdit} session={session} />}
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

      {isDeityModalOpen && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(24, 34, 31, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div 
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              border: "1.5px solid #eae5da",
              overflow: "hidden",
              fontFamily: "inherit",
            }}
          >
            <header 
              style={{
                background: "#0b5a43",
                padding: "16px 20px",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>🛕</span>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, letterSpacing: "0.5px" }}>
                  {vt("Edit Deity info")}
                </h3>
              </div>
              <button 
                onClick={() => setIsDeityModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                  opacity: 0.8,
                }}
              >
                <X size={20} />
              </button>
            </header>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <TextInput 
                label={vt("Kuladevi")} 
                value={deityFormDraft.kuladevi} 
                onChange={(val) => setDeityFormDraft(prev => ({ ...prev, kuladevi: val }))} 
                placeholder={vt("Enter Kuladevi name")}
              />
              <TextInput 
                label={vt("Kuladevata")} 
                value={deityFormDraft.kuladevata} 
                onChange={(val) => setDeityFormDraft(prev => ({ ...prev, kuladevata: val }))} 
                placeholder={vt("Enter Kuldevata name")}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <TextInput 
                  label={vt("Kuladevi Photo URL")} 
                  value={deityFormDraft.kuldeviPhoto} 
                  onChange={(val) => setDeityFormDraft(prev => ({ ...prev, kuldeviPhoto: val }))} 
                  placeholder="https://example.com/devi.jpg"
                />
                <TextInput 
                  label={vt("Kuladevata Photo URL")} 
                  value={deityFormDraft.kuladevataPhoto} 
                  onChange={(val) => setDeityFormDraft(prev => ({ ...prev, kuladevataPhoto: val }))} 
                  placeholder="https://example.com/devata.jpg"
                />
              </div>

              {/* Upload Container Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {/* Kuldevi Upload Container */}
                <div 
                  style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "6px", 
                    background: "#fdfbf7", 
                    padding: "16px", 
                    borderRadius: "10px", 
                    border: "1.5px dashed #eae5da" 
                  }}
                >
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#4d5551", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {vt("Upload Kuldevi Image")}
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="deity-modal-devi-upload"
                      style={{ display: "none" }} 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async () => {
                          const base64 = reader.result;
                          try {
                            setIsDeityUploading(true);
                            const response = await fetch("/api/lineage/upload", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                ...(session ? { Authorization: `Bearer ${session.token}` } : {})
                              },
                              body: JSON.stringify({ image: base64 })
                            });
                            if (!response.ok) {
                              const errJson = await response.json().catch(() => ({}));
                              throw new Error(errJson.error || "Upload failed");
                            }
                            const json = await response.json();
                            setDeityFormDraft(prev => ({ ...prev, kuldeviPhoto: json.url }));
                          } catch (err: any) {
                            alert(vt("Image upload failed: ") + err.message);
                          } finally {
                            setIsDeityUploading(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <button 
                      type="button"
                      disabled={isDeityUploading}
                      onClick={() => document.getElementById("deity-modal-devi-upload")?.click()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#0b5a43",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "8px 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        justifyContent: "center"
                      }}
                    >
                      <Upload size={14} />
                      {isDeityUploading ? vt("Uploading...") : vt("Choose file")}
                    </button>
                    {deityFormDraft.kuldeviPhoto && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" }}>
                        <img 
                          src={deityFormDraft.kuldeviPhoto} 
                          alt="Devi preview" 
                          style={{ width: "38px", height: "38px", borderRadius: "6px", objectFit: "cover", border: "1px solid #d8d3ca" }} 
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          type="button" 
                          onClick={() => setDeityFormDraft(prev => ({ ...prev, kuldeviPhoto: "" }))}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#f43f5e",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                            padding: 0
                          }}
                        >
                          {vt("Remove")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Kuladevata Upload Container */}
                <div 
                  style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "6px", 
                    background: "#fdfbf7", 
                    padding: "16px", 
                    borderRadius: "10px", 
                    border: "1.5px dashed #eae5da" 
                  }}
                >
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#4d5551", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {vt("Upload Kuladevata Image")}
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="deity-modal-devata-upload"
                      style={{ display: "none" }} 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async () => {
                          const base64 = reader.result;
                          try {
                            setIsDeityUploading(true);
                            const response = await fetch("/api/lineage/upload", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                ...(session ? { Authorization: `Bearer ${session.token}` } : {})
                              },
                              body: JSON.stringify({ image: base64 })
                            });
                            if (!response.ok) {
                              const errJson = await response.json().catch(() => ({}));
                              throw new Error(errJson.error || "Upload failed");
                            }
                            const json = await response.json();
                            setDeityFormDraft(prev => ({ ...prev, kuladevataPhoto: json.url }));
                          } catch (err: any) {
                            alert(vt("Image upload failed: ") + err.message);
                          } finally {
                            setIsDeityUploading(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <button 
                      type="button"
                      disabled={isDeityUploading}
                      onClick={() => document.getElementById("deity-modal-devata-upload")?.click()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#0b5a43",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "8px 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        justifyContent: "center"
                      }}
                    >
                      <Upload size={14} />
                      {isDeityUploading ? vt("Uploading...") : vt("Choose file")}
                    </button>
                    {deityFormDraft.kuladevataPhoto && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" }}>
                        <img 
                          src={deityFormDraft.kuladevataPhoto} 
                          alt="Devata preview" 
                          style={{ width: "38px", height: "38px", borderRadius: "6px", objectFit: "cover", border: "1px solid #d8d3ca" }} 
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          type="button" 
                          onClick={() => setDeityFormDraft(prev => ({ ...prev, kuladevataPhoto: "" }))}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#f43f5e",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                            padding: 0
                          }}
                        >
                          {vt("Remove")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <footer 
              style={{
                background: "#fdfbf7",
                borderTop: "1px solid #eae5da",
                padding: "12px 20px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px"
              }}
            >
              <button 
                onClick={() => setIsDeityModalOpen(false)}
                style={{
                  background: "#ffffff",
                  border: "1.5px solid #d8d3ca",
                  color: "#18221f",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {vt("Cancel")}
              </button>
              <button 
                onClick={async () => {
                  try {
                    setIsDeityUploading(true);
                    await lineage.request("save-family", `/api/lineage/trees/${tree.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        ...tree,
                        kuladevi: deityFormDraft.kuladevi,
                        kuladevata: deityFormDraft.kuladevata,
                        kuldeviPhoto: deityFormDraft.kuldeviPhoto,
                        kuladevataPhoto: deityFormDraft.kuladevataPhoto
                      })
                    });
                    setIsDeityModalOpen(false);
                  } catch (err: any) {
                    alert(vt("Save failed: ") + err.message);
                  } finally {
                    setIsDeityUploading(false);
                  }
                }}
                disabled={isDeityUploading}
                style={{
                  background: "#0b5a43",
                  border: "none",
                  color: "#ffffff",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Save size={14} />
                {vt("Save")}
              </button>
            </footer>
          </div>
        </div>
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
    if (!next) {
      try {
        localStorage.setItem("vamshavali_signed_out", "true");
      } catch (e) {
        console.error(e);
      }
    }
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
      .catch((reason) => {
        clearInviteTokenFromUrl();
        setInviteMessage((reason as Error).message);
      });
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
  const { setLanguage } = useLanguage();

  React.useEffect(() => {
    // Determine initial language for VamshavaliPage:
    // If the user has a saved session with an explicit language preference, use that.
    // Otherwise, default this page to English ('en') as requested.
    const saved = loadSession();
    if (saved?.account?.language) {
      setLanguage(saved.account.language as any);
    } else {
      setLanguage("en");
    }

    // When leaving VamshavaliPage, reset language back to Bengali ('bn') as requested
    return () => {
      setLanguage("bn");
    };
  }, [setLanguage]);

  return (
    <div className="vamshavali-theme min-h-screen">
      <App isPublic={isPublic} shareId={shareId} />
    </div>
  );
}
