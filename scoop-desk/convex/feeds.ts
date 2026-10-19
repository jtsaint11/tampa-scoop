/**
 * Read-only feeds from the workbook for the issue builder:
 * Events (Status = Approved, upcoming) and Businesses (Status = Published).
 * Same mapping as the calendar and directory Spaces, so links match.
 */
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { authenticatedAction } from "./functions";
import { buildDirectory } from "./lib/directory";
import { mapEvents } from "./lib/events";
import { BUSINESSES_TAB, CATEGORIES_TAB, EVENTS_TAB } from "./lib/schema";
import { todayInTampa } from "./lib/tampa";
import { readTab } from "./sheetsGateway";

export const CACHE_TTL_MS = 5 * 60 * 1000;

export const readCache = internalQuery({
  args: { key: v.string() },
  returns: v.union(v.null(), v.object({ fetchedAt: v.number(), payload: v.string() })),
  handler: async (ctx, { key }) => {
    const doc = await ctx.db
      .query("feedCache")
      .withIndex("by_key", q => q.eq("key", key))
      .unique();
    return doc ? { fetchedAt: doc.fetchedAt, payload: doc.payload } : null;
  },
});

export const writeCache = internalMutation({
  args: { key: v.string(), fetchedAt: v.number(), payload: v.string() },
  returns: v.null(),
  handler: async (ctx, { key, ...rest }) => {
    const doc = await ctx.db
      .query("feedCache")
      .withIndex("by_key", q => q.eq("key", key))
      .unique();
    if (doc) await ctx.db.patch(doc._id, rest);
    else await ctx.db.insert("feedCache", { key, ...rest });
    return null;
  },
});

const eventV = v.object({
  key: v.string(),
  name: v.string(),
  venue: v.string(),
  neighborhood: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  time: v.string(),
  categories: v.array(v.string()),
  description: v.string(),
  price: v.string(),
  isFree: v.boolean(),
  familyFriendly: v.boolean(),
  featured: v.boolean(),
  dateVerified: v.string(),
});

const businessV = v.object({
  slug: v.string(),
  name: v.string(),
  category: v.string(),
  neighborhood: v.string(),
  description: v.string(),
  featured: v.boolean(),
  lastVerified: v.string(),
});

type Feeds = {
  events: (typeof eventV)["type"][];
  businesses: (typeof businessV)["type"][];
};

async function fetchFeeds(): Promise<Feeds> {
  const [eventRows, categoryRows, businessRows] = await Promise.all([
    readTab(EVENTS_TAB),
    readTab(CATEGORIES_TAB),
    readTab(BUSINESSES_TAB),
  ]);
  const events = mapEvents(eventRows).map(e => ({
    key: e.key,
    name: e.name,
    venue: e.venue,
    neighborhood: e.neighborhood,
    startDate: e.startDate,
    endDate: e.endDate,
    time: e.time,
    categories: e.categories,
    description: e.description,
    price: e.price,
    isFree: e.isFree,
    familyFriendly: e.familyFriendly,
    featured: e.featured,
    dateVerified: e.dateVerified,
  }));
  const { businesses } = buildDirectory(categoryRows, businessRows);
  return {
    events,
    businesses: businesses.map(b => ({
      slug: b.slug,
      name: b.name,
      category: b.category,
      neighborhood: b.neighborhood,
      description: b.description,
      featured: b.featured,
      lastVerified: b.lastVerified,
    })),
  };
}

/** Upcoming approved events + published businesses (5-minute cache, last good copy on failure). */
export const load = authenticatedAction({
  args: { force: v.boolean() },
  returns: v.object({
    events: v.array(eventV),
    businesses: v.array(businessV),
    today: v.string(),
    fetchedAt: v.number(),
    stale: v.boolean(),
    error: v.union(v.null(), v.string()),
  }),
  handler: async (ctx, { force }) => {
    const today = todayInTampa();
    const cached = await ctx.runQuery(internal.feeds.readCache, { key: "feeds" });
    let data: Feeds = { events: [], businesses: [] };
    let fetchedAt = 0;
    let stale = false;
    let error: string | null = null;
    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      data = JSON.parse(cached.payload);
      fetchedAt = cached.fetchedAt;
    } else {
      try {
        data = await fetchFeeds();
        fetchedAt = Date.now();
        await ctx.runMutation(internal.feeds.writeCache, { key: "feeds", fetchedAt, payload: JSON.stringify(data) });
      } catch (e) {
        console.error("Feed read failed", e);
        error = "Couldn't read the Events/Businesses tabs just now.";
        if (cached) {
          data = JSON.parse(cached.payload);
          fetchedAt = cached.fetchedAt;
          stale = true;
        }
      }
    }
    return {
      events: data.events.filter(e => e.startDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)),
      businesses: data.businesses,
      today,
      fetchedAt,
      stale,
      error,
    };
  },
});
