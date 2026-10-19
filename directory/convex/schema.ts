import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Google Sheets ("Tampa Scoop" workbook) is the only source of truth for
 * businesses, categories and quote requests. These tables hold operational
 * metadata only:
 *
 * - directoryCache: a short-lived (5 minute) copy of the published rows read
 *   from the Businesses and Categories tabs, so every page view does not hit
 *   the Sheets API. Overwritten on every refresh.
 * - quoteLog: hashed keys + timestamps for rate limiting and duplicate checks.
 *   No quote content (names, emails, job details) is stored here.
 * - rowClaims: which Quote Requests row number a request is writing to, so two
 *   simultaneous requests never target the same sheet row.
 */
const schema = defineSchema({
  ...authTables,
  directoryCache: defineTable({
    key: v.string(),
    fetchedAt: v.number(),
    payload: v.string(),
  }).index("by_key", ["key"]),
  quoteLog: defineTable({
    keyHash: v.string(),
    kind: v.string(),
    at: v.number(),
  }).index("by_kind_key_at", ["kind", "keyHash", "at"]),
  rowClaims: defineTable({
    row: v.number(),
    at: v.number(),
  }).index("by_at", ["at"]),
});

export default schema;
