import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery } from "./_generated/server";
import {
  buildDirectory,
  type PublicBusiness,
  type PublicCategory,
  type Row,
} from "./lib/directory";
import { BUSINESSES_TAB, CATEGORIES_TAB, readSheet } from "./sheetsGateway";

/** How long a read of the sheet is reused before it is re-read. */
export const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_KEY = "directory";

export type DirectoryPayload = {
  categories: PublicCategory[];
  businesses: PublicBusiness[];
};

export const readCache = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ fetchedAt: v.number(), payload: v.string() }),
  ),
  handler: async ctx => {
    const doc = await ctx.db
      .query("directoryCache")
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
      .query("directoryCache")
      .withIndex("by_key", q => q.eq("key", CACHE_KEY))
      .unique();
    if (doc) await ctx.db.patch(doc._id, args);
    else await ctx.db.insert("directoryCache", { key: CACHE_KEY, ...args });
    return null;
  },
});

async function readTab(sheetName: string): Promise<Row[]> {
  return (await readSheet(sheetName)) as Row[];
}

/** Reads Categories + Businesses through the tool gateway. Throws on failure. */
export async function fetchDirectoryFromSheet(): Promise<DirectoryPayload> {
  const [categoryRows, businessRows] = await Promise.all([
    readTab(CATEGORIES_TAB),
    readTab(BUSINESSES_TAB),
  ]);
  return buildDirectory(categoryRows, businessRows);
}

/** Cached read shared by the public query action and the quote action. */
export async function loadDirectory(ctx: {
  runQuery: (
    ref: typeof internal.directory.readCache,
    args: Record<string, never>,
  ) => Promise<{ fetchedAt: number; payload: string } | null>;
  runMutation: (
    ref: typeof internal.directory.writeCache,
    args: { fetchedAt: number; payload: string },
  ) => Promise<null>;
}): Promise<{ data: DirectoryPayload; fetchedAt: number; stale: boolean }> {
  const cached = await ctx.runQuery(internal.directory.readCache, {});
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return {
      data: JSON.parse(cached.payload),
      fetchedAt: cached.fetchedAt,
      stale: false,
    };
  }
  try {
    const data = await fetchDirectoryFromSheet();
    const fetchedAt = Date.now();
    await ctx.runMutation(internal.directory.writeCache, {
      fetchedAt,
      payload: JSON.stringify(data),
    });
    return { data, fetchedAt, stale: false };
  } catch (e) {
    console.error("Directory read failed", e);
    if (!cached) throw new Error("DIRECTORY_UNAVAILABLE");
    // Keep the last good data visible, but say it is stale.
    return {
      data: JSON.parse(cached.payload),
      fetchedAt: cached.fetchedAt,
      stale: true,
    };
  }
}

const categoryValidator = v.object({
  name: v.string(),
  slug: v.string(),
  group: v.string(),
  phase: v.string(),
  headline: v.string(),
  buyingGuide: v.string(),
  faqs: v.string(),
  sheetCount: v.number(),
  count: v.number(),
  featuredCount: v.number(),
});

const businessValidator = v.object({
  slug: v.string(),
  name: v.string(),
  category: v.string(),
  categorySlug: v.string(),
  address: v.string(),
  neighborhood: v.string(),
  zip: v.string(),
  phone: v.string(),
  website: v.string(),
  instagram: v.string(),
  description: v.string(),
  logoUrl: v.string(),
  featured: v.boolean(),
  claimed: v.boolean(),
  quoteEnabled: v.boolean(),
  dateAdded: v.string(),
  lastVerified: v.string(),
  hours: v.string(),
  services: v.string(),
  licenseNumber: v.string(),
  priceModel: v.string(),
  emergency: v.boolean(),
});

/**
 * PUBLIC (anonymous) read #1: categories (Categories tab) and Published
 * businesses (Businesses tab). Approved as an anonymous action.
 */
export const getDirectory = action({
  args: {},
  returns: v.object({
    categories: v.array(categoryValidator),
    businesses: v.array(businessValidator),
    fetchedAt: v.number(),
    stale: v.boolean(),
  }),
  handler: async ctx => {
    const { data, fetchedAt, stale } = await loadDirectory(ctx);
    return {
      categories: data.categories,
      businesses: data.businesses,
      fetchedAt,
      stale,
    };
  },
});
