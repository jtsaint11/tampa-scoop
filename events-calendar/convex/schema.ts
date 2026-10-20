import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Google Sheets ("Tampa Scoop" workbook) is the only source of truth for
 * events and submissions. These tables hold operational metadata only:
 *
 * - eventCache: a short-lived (5 minute) copy of the Approved rows read from
 *   the Events tab, so every page view does not hit the Sheets API. The sheet
 *   stays authoritative: the cache is overwritten on every refresh and the
 *   date filter is re-applied on every request.
 * - submissionLog: hashed keys + timestamps used for rate limiting and
 *   duplicate checks. No submission content is stored here.
 * - rowClaims: which Event Submissions row number a submission is writing to,
 *   so two simultaneous submissions never target the same sheet row.
 */
const schema = defineSchema({
  eventCache: defineTable({
    key: v.string(),
    fetchedAt: v.number(),
    payload: v.string(),
  }).index("by_key", ["key"]),
  submissionLog: defineTable({
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
