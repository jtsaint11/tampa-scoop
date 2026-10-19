/** Shared types + pure helpers (imported by Convex functions and the frontend). */

export const TIME_ZONE = "America/New_York";

/** Must match the Lists tab ("Quote Timing", "Contact Preference") exactly. */
export const QUOTE_TIMINGS = [
  "Today",
  "This week",
  "This month",
  "Just researching",
] as const;
export const CONTACT_PREFERENCES = ["Email", "Phone"] as const;

/** Only rows with this Status appear on the site. */
export const PUBLISHED_STATUS = "Published";

export type PublicCategory = {
  name: string;
  slug: string;
  group: string;
  phase: string;
  headline: string;
  buyingGuide: string;
  faqs: string;
  /** Business Count straight from the Categories tab (formula, all rows). */
  sheetCount: number;
  /** Published listings in this category (what the site shows). */
  count: number;
  featuredCount: number;
};

export type PublicBusiness = {
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  address: string;
  neighborhood: string;
  zip: string;
  phone: string;
  website: string;
  instagram: string;
  description: string;
  logoUrl: string;
  featured: boolean;
  claimed: boolean;
  quoteEnabled: boolean;
  dateAdded: string;
  lastVerified: string;
  hours: string;
  services: string;
  licenseNumber: string;
  priceModel: string;
  emergency: boolean;
};

export type Row = Record<string, unknown>;
const cell = (row: Row, key: string) => String(row[key] ?? "").trim();

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isTruthyCell(raw: unknown): boolean {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  return s === "true" || s === "yes" || s === "1" || s === "x" || s === "✓";
}

const pad = (n: number) => String(n).padStart(2, "0");

export function isValidIsoDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Normalise a Sheets date cell to YYYY-MM-DD ("" if unparseable). */
export function normalizeSheetDate(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  const s = String(raw).trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    const iso = `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
    return isValidIsoDate(iso) ? iso : "";
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const iso = `${year}-${pad(+m[1])}-${pad(+m[2])}`;
    return isValidIsoDate(iso) ? iso : "";
  }
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(+s) * 86400000);
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  }
  return "";
}

export function todayInTampa(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Current Tampa wall-clock time as "YYYY-MM-DD HH:MM:SS". */
export function nowInTampa(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

const httpUrl = (s: string) => (/^https?:\/\/\S+\.\S+/i.test(s) ? s : "");

/** Categories tab row -> category, or null for blank rows. */
export function toCategory(
  row: Row,
): Omit<PublicCategory, "count" | "featuredCount"> | null {
  const name = cell(row, "Category Name");
  if (!name) return null;
  const n = Number.parseInt(cell(row, "Business Count"), 10);
  return {
    name,
    slug: cell(row, "Slug") || slugify(name),
    group: cell(row, "Group"),
    phase: cell(row, "Phase"),
    headline: cell(row, "Page Headline") || `Best ${name} in Tampa, FL`,
    buyingGuide: cell(row, "Buying Guide"),
    faqs: cell(row, "FAQs"),
    sheetCount: Number.isFinite(n) ? n : 0,
  };
}

/**
 * Businesses tab row -> public listing, or null if it must not be shown.
 * Shown only when: a name, a category that exists on the Categories tab, and
 * Status = Published. Nothing is ever made up: empty cells stay empty.
 */
export function toBusiness(
  row: Row,
  categorySlugs: Map<string, string>,
): PublicBusiness | null {
  const name = cell(row, "Business Name");
  const category = cell(row, "Category");
  if (!name || !category) return null;
  if (cell(row, "Status") !== PUBLISHED_STATUS) return null;
  const categorySlug = categorySlugs.get(category.toLowerCase());
  if (!categorySlug) return null;

  const nz = cell(row, "Neighborhood/ZIP");
  const address = cell(row, "Address");
  const zip =
    nz.match(/\b\d{5}\b/)?.[0] ?? address.match(/\b3\d{4}\b/)?.[0] ?? "";
  const neighborhood =
    cell(row, "Neighborhood") ||
    nz
      .split("/")[0]
      .replace(/\b\d{5}\b/, "")
      .trim();
  let instagram = cell(row, "Instagram");
  if (instagram && !/^https?:\/\//i.test(instagram)) {
    instagram = `https://instagram.com/${instagram.replace(/^@/, "")}`;
  }
  const emergencySource = httpUrl(cell(row, "Emergency Claim Source"));

  return {
    slug: slugify(cell(row, "Slug") || name),
    name,
    category,
    categorySlug,
    address,
    neighborhood,
    zip,
    phone: cell(row, "Phone"),
    website: httpUrl(cell(row, "Website")),
    instagram: httpUrl(instagram),
    description: cell(row, "Description"),
    logoUrl: /^https:\/\//i.test(cell(row, "Logo URL"))
      ? cell(row, "Logo URL")
      : "",
    featured: isTruthyCell(row.Featured),
    claimed: isTruthyCell(row.Claimed),
    quoteEnabled: isTruthyCell(row["Quote Form Enabled"]),
    dateAdded: normalizeSheetDate(row["Date Added"]),
    lastVerified: normalizeSheetDate(row["Last Verified"]),
    hours: cell(row, "Hours"),
    services: cell(row, "Services & Specialties"),
    licenseNumber: cell(row, "License Number"),
    priceModel:
      cell(row, "Price Model") === "Not stated" ? "" : cell(row, "Price Model"),
    // Only shown when the sheet has a source link backing the claim.
    emergency:
      isTruthyCell(row["Emergency / Same-Day"]) && Boolean(emergencySource),
  };
}

/** Builds the public directory from raw tab rows. */
export function buildDirectory(categoryRows: Row[], businessRows: Row[]) {
  const cats = categoryRows
    .map(toCategory)
    .filter((c): c is NonNullable<typeof c> => c !== null);
  const slugByName = new Map(cats.map(c => [c.name.toLowerCase(), c.slug]));
  const businesses: PublicBusiness[] = [];
  const seen = new Set<string>();
  for (const row of businessRows) {
    const b = toBusiness(row, slugByName);
    if (!b) continue;
    let slug = b.slug || "business";
    let i = 2;
    while (seen.has(slug)) slug = `${b.slug}-${i++}`;
    seen.add(slug);
    businesses.push({ ...b, slug });
  }
  businesses.sort(compareBusinesses);
  const categories: PublicCategory[] = cats.map(c => {
    const inCat = businesses.filter(b => b.categorySlug === c.slug);
    return {
      ...c,
      count: inCat.length,
      featuredCount: inCat.filter(b => b.featured).length,
    };
  });
  return { categories, businesses };
}

/** Featured first, then claimed, then A–Z. */
export function compareBusinesses(
  a: PublicBusiness,
  b: PublicBusiness,
): number {
  return (
    Number(b.featured) - Number(a.featured) ||
    Number(b.claimed) - Number(a.claimed) ||
    a.name.localeCompare(b.name)
  );
}

// ---------------------------------------------------------------- quotes

export type QuoteInput = {
  businessSlug: string;
  serviceZip: string;
  timing: string;
  jobDescription: string;
  name: string;
  email: string;
  phone: string;
  phoneConsent: boolean;
  contactPreference: string;
  termsAccepted: boolean;
  sourcePageUrl: string;
  website: string; // honeypot
};

export const JOB_MAX = 500;
export const JOB_MIN = 20;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Field-level validation shared by the form and the server. */
export function validateQuote(q: QuoteInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (!/^\d{5}$/.test(q.serviceZip.trim()))
    e.serviceZip = "Enter the 5-digit ZIP where the work is needed.";
  if (!(QUOTE_TIMINGS as readonly string[]).includes(q.timing))
    e.timing = "Choose when you need this done.";
  const job = q.jobDescription.trim();
  if (job.length < JOB_MIN)
    e.jobDescription = `Tell the business a little more (at least ${JOB_MIN} characters).`;
  else if (job.length > JOB_MAX)
    e.jobDescription = `Keep it to ${JOB_MAX} characters or fewer.`;
  const name = q.name.trim();
  if (name.length < 2) e.name = "Enter your name.";
  else if (name.length > 80) e.name = "Keep your name under 80 characters.";
  const email = q.email.trim();
  if (!email) e.email = "Enter your email.";
  else if (!EMAIL_RE.test(email) || email.length > 120)
    e.email = "Enter a valid email address.";
  const phoneDigits = q.phone.replace(/\D/g, "");
  if (
    q.phone.trim() &&
    (phoneDigits.length < 10 || phoneDigits.length > 11 || q.phone.length > 25)
  )
    e.phone = "Enter a 10-digit US phone number, or leave it blank.";
  if (!(CONTACT_PREFERENCES as readonly string[]).includes(q.contactPreference))
    e.contactPreference = "Choose how you'd like to be contacted.";
  else if (q.contactPreference === "Phone" && !q.phone.trim())
    e.phone = "Add a phone number, or choose email.";
  if (q.phone.trim() && q.contactPreference === "Phone" && !q.phoneConsent)
    e.phoneConsent = "Tick this so the business may call or text you.";
  if (!q.termsAccepted)
    e.termsAccepted = "Please agree so we can pass your request on.";
  return e;
}
