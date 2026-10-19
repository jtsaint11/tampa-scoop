/** Shared constants + helpers (imported by Convex functions and the frontend). */

export const TIME_ZONE = "America/New_York";

/** Must match the "Event Category" list on the workbook's Lists tab exactly. */
export const EVENT_CATEGORIES = [
  "Arts + Culture",
  "Community",
  "Family",
  "Food + Drink",
  "Live Music",
  "Nightlife",
  "Sports",
  "Health + Fitness",
  "Holiday",
  "Shopping",
  "Markets",
  "Civic + Public",
] as const;

/** Must match the "Neighborhood" list on the workbook's Lists tab exactly. */
export const NEIGHBORHOODS = [
  "Downtown",
  "Ybor City",
  "South Tampa",
  "Seminole Heights",
  "Westshore",
  "Tampa Heights",
  "Channel District",
  "Hyde Park",
  "Davis Islands",
  "Other Tampa",
  "Outside Tampa (Bay area)",
] as const;

export const AGE_RULES = ["All ages", "18+", "21+", "Kids/Family"] as const;

export type PublicEvent = {
  key: string;
  name: string;
  organizer: string;
  venue: string;
  address: string;
  neighborhood: string;
  zip: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD or ""
  time: string;
  categories: string[];
  description: string;
  price: string;
  isFree: boolean;
  familyFriendly: boolean;
  ticketUrl: string;
  imageUrl: string;
  featured: boolean;
  dateVerified: string;
};

/** Today's date in Tampa as YYYY-MM-DD. */
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

const pad = (n: number) => String(n).padStart(2, "0");

/** Add days to a YYYY-MM-DD date (calendar math, timezone free). */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** 0 = Sunday ... 6 = Saturday for a YYYY-MM-DD date. */
export function weekday(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

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

/**
 * Normalise a date cell from Google Sheets to YYYY-MM-DD.
 * Accepts 2026-10-20, 2026/10/20, 10/20/2026, 10/20/26, Oct 20, 2026 and
 * Sheets serial numbers. Returns "" when it cannot be parsed.
 */
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
    // Sheets serial date: days since 1899-12-30.
    const ms = Date.UTC(1899, 11, 30) + Math.floor(+s) * 86400000;
    const dt = new Date(ms);
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  }
  const parsed = Date.parse(`${s} 12:00 UTC`);
  if (!Number.isNaN(parsed)) {
    const dt = new Date(parsed);
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  }
  return "";
}

export function isTruthyCell(raw: unknown): boolean {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  return s === "true" || s === "yes" || s === "1" || s === "x" || s === "✓";
}
