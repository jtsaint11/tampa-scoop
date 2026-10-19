import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery } from "./_generated/server";
import {
  isTruthyCell,
  NEIGHBORHOODS,
  normalizeSheetDate,
  type PublicEvent,
  todayInTampa,
} from "./lib/tampa";
import { EVENTS_TAB, readSheet } from "./sheetsGateway";

/** How long a read of the Events tab is reused before the sheet is re-read. */
export const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_KEY = "approved-events";

type Row = Record<string, unknown>;

const cell = (row: Row, key: string) => String(row[key] ?? "").trim();

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Turn one Events-tab row into the public shape, or null if not publishable. */
export function toPublicEvent(row: Row): PublicEvent | null {
  if (cell(row, "Status") !== "Approved") return null;
  if (isTruthyCell(row.Cancelled)) return null;
  const name = cell(row, "Event Name");
  const startDate = normalizeSheetDate(row["Start Date"]);
  if (!name || !startDate) return null;

  const nz = cell(row, "Neighborhood/ZIP");
  const [nzHood, nzZip] = nz.split("/").map(s => s.trim());
  let neighborhood = cell(row, "Neighborhood");
  if (!neighborhood && nzHood) {
    neighborhood =
      NEIGHBORHOODS.find(n => n.toLowerCase() === nzHood.toLowerCase()) ??
      nzHood;
  }
  const zip =
    nzZip?.match(/\d{5}/)?.[0] ??
    nz.match(/\b\d{5}\b/)?.[0] ??
    cell(row, "Address").match(/\b3\d{4}\b/)?.[0] ??
    "";
  const price = cell(row, "Ticket Price / Free");
  const isFreeCell = cell(row, "Is Free");
  const venue = cell(row, "Venue");
  const key =
    cell(row, "Slug") ||
    slugify(cell(row, "Event ID")) ||
    slugify(`${name}-${startDate}-${venue}`);

  return {
    key,
    name,
    organizer: cell(row, "Organizer"),
    venue,
    address: cell(row, "Address"),
    neighborhood,
    zip,
    startDate,
    endDate: normalizeSheetDate(row["End Date"]),
    time: cell(row, "Time"),
    categories: cell(row, "Category")
      .split(/[,;]/)
      .map(s => s.trim())
      .filter(Boolean),
    description: cell(row, "Description"),
    price,
    isFree: isFreeCell
      ? isTruthyCell(isFreeCell)
      : /\bfree\b/i.test(price),
    familyFriendly: isTruthyCell(row["Family Friendly"]),
    ticketUrl: /^https?:\/\//i.test(cell(row, "Ticket URL"))
      ? cell(row, "Ticket URL")
      : "",
    imageUrl: /^https:\/\//i.test(cell(row, "Image URL"))
      ? cell(row, "Image URL")
      : "",
    featured: isTruthyCell(row.Featured),
    dateVerified: normalizeSheetDate(row["Date Verified"]),
  };
}

export const readCache = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ fetchedAt: v.number(), payload: v.string() }),
  ),
  handler: async ctx => {
    const doc = await ctx.db
      .query("eventCache")
      .withIndex("by_key", q => q.eq("key", CACHE_KEY))
      .unique();
    return doc ? { fetchedAt: doc.fetchedAt, payload: doc.payload } : null;
  },
});

export const writeCache = internalMutation({
  args: { fetchedAt: v.number(), payload: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("eventCache")
      .withIndex("by_key", q => q.eq("key", CACHE_KEY))
      .unique();
    if (doc) await ctx.db.patch(doc._id, args);
    else await ctx.db.insert("eventCache", { key: CACHE_KEY, ...args });
    return null;
  },
});

/** Reads the Events sheet (Smartsheet) through the tool gateway. Throws on any failure. */
async function fetchApprovedFromSheet(): Promise<PublicEvent[]> {
  const rows = (await readSheet(EVENTS_TAB)) as Row[];
  const events: PublicEvent[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const ev = toPublicEvent(row);
    if (!ev) continue;
    // Keys must be unique for detail links.
    let key = ev.key;
    let i = 2;
    while (seen.has(key)) key = `${ev.key}-${i++}`;
    seen.add(key);
    events.push({ ...ev, key });
  }
  return events;
}

const eventValidator = v.object({
  key: v.string(),
  name: v.string(),
  organizer: v.string(),
  venue: v.string(),
  address: v.string(),
  neighborhood: v.string(),
  zip: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  time: v.string(),
  categories: v.array(v.string()),
  description: v.string(),
  price: v.string(),
  isFree: v.boolean(),
  familyFriendly: v.boolean(),
  ticketUrl: v.string(),
  imageUrl: v.string(),
  featured: v.boolean(),
  dateVerified: v.string(),
});

/**
 * PUBLIC (anonymous) read: approved, upcoming events from the Events tab.
 * Approved by the user as one of the two anonymous actions.
 * Only Status = Approved, not Cancelled, Start Date >= today (America/New_York).
 */
export const listUpcoming = action({
  args: {},
  returns: v.object({
    events: v.array(eventValidator),
    today: v.string(),
    fetchedAt: v.number(),
    stale: v.boolean(),
    error: v.union(v.null(), v.string()),
  }),
  handler: async ctx => {
    const today = todayInTampa();
    const cached = await ctx.runQuery(internal.events.readCache, {});
    let events: PublicEvent[];
    let fetchedAt: number;
    let stale = false;
    let error: string | null = null;

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      events = JSON.parse(cached.payload) as PublicEvent[];
      fetchedAt = cached.fetchedAt;
    } else {
      try {
        events = await fetchApprovedFromSheet();
        fetchedAt = Date.now();
        await ctx.runMutation(internal.events.writeCache, {
          fetchedAt,
          payload: JSON.stringify(events),
        });
      } catch (e) {
        console.error("Events read failed", e);
        if (!cached) throw new Error("CALENDAR_UNAVAILABLE");
        // Keep the last good data visible, but say it is stale.
        events = JSON.parse(cached.payload) as PublicEvent[];
        fetchedAt = cached.fetchedAt;
        stale = true;
        error = "Showing the last saved calendar; live refresh failed.";
      }
    }

    const upcoming = events
      .filter(e => e.startDate >= today)
      .sort(
        (a, b) =>
          a.startDate.localeCompare(b.startDate) ||
          a.time.localeCompare(b.time) ||
          a.name.localeCompare(b.name),
      );
    return { events: upcoming, today, fetchedAt, stale, error };
  },
});
