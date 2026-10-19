import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation } from "./_generated/server";
import { loadDirectory } from "./directory";
import {
  nowInTampa,
  type PublicBusiness,
  type QuoteInput,
  todayInTampa,
  validateQuote,
} from "./lib/directory";
import {
  type GuardedResult,
  guardedWrite,
  type Reservation,
} from "./lib/guardedWrite";
import { addRows, GatewayError, QUOTES_TAB } from "./sheetsGateway";

// ---- Spam protection settings -------------------------------------------
const HOUR = 60 * 60 * 1000;
// Kind names carry a version suffix. Records written before the
// "release on failed write" fix (kinds without ":v2") are ignored by the
// checks and purged by the housekeeping in checkAndRecordRate.
export const LIMITS = {
  "client:v2": { max: 3, windowMs: HOUR }, // per browser
  "email:v2": { max: 5, windowMs: 24 * HOUR }, // per requester email
  "global:v2": { max: 40, windowMs: HOUR }, // whole site (kept even when a write fails)
  "duplicate:v2": { max: 1, windowMs: 24 * HOUR }, // same email + business
} as const;
/** Records removed again when the sheet write fails. */
export const RELEASE_ON_FAILURE = new Set<string>([
  "client:v2",
  "email:v2",
  "duplicate:v2",
]);
const MIN_FILL_MS = 3000; // humans take longer than 3s to fill this form

/** Neutralise spreadsheet formula injection (values are USER_ENTERED). */
export function safeText(s: string): string {
  const t = s.replace(/\r\n?/g, "\n").trim();
  return /^[=+\-@\t]/.test(t) ? `'${t}` : t;
}

/**
 * Builds the 19 cell values (A..S) for one Quote Requests row.
 * The tab has no formula columns, so the whole row is written in one range.
 */
/** Column order of the Quote Requests sheet (A..S). */
const QUOTE_COLUMNS = [
  "Request ID", "Submitted At", "Category", "Service ZIP", "Timing", "Job Description", "Name", "Email", "Phone",
  "Phone Consent", "Contact Preference", "Terms Accepted", "Status", "Matched Businesses", "Alert Sent At",
  "Approved By", "Source", "Source Page URL", "Notes",
] as const;

export function buildQuoteRow(
  q: QuoteInput,
  business: Pick<PublicBusiness, "name" | "category" | "slug">,
  requestId: string,
  submittedAt: string,
): string[] {
  const hasPhone = Boolean(q.phone.trim());
  return [
    requestId, // A Request ID
    submittedAt, // B Submitted At (America/New_York)
    business.category, // C Category (matches Categories!A)
    q.serviceZip.trim(), // D Service ZIP
    q.timing, // E Timing
    safeText(q.jobDescription).slice(0, 500), // F Job Description
    safeText(q.name), // G Name
    q.email.trim(), // H Email
    hasPhone ? `'${q.phone.trim()}` : "", // I Phone (kept as text)
    hasPhone && q.phoneConsent ? "TRUE" : "FALSE", // J Phone Consent
    q.contactPreference, // K Contact Preference
    q.termsAccepted ? "TRUE" : "FALSE", // L Terms Accepted
    "New", // M Status
    "", // N Matched Businesses (filled when routed, Step 4)
    "", // O Alert Sent At
    "", // P Approved By
    "Directory page", // Q Source
    /^https:\/\/\S+$/.test(q.sourcePageUrl)
      ? q.sourcePageUrl.slice(0, 300)
      : "", // R Source Page URL
    safeText(
      `Requested from listing: ${business.name} (/business/${business.slug})`,
    ), // S Notes
  ];
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Atomically checks every rate limit and, if all pass, records the attempt.
 * Returns the ids of the records to delete if the sheet write then fails.
 */
export const checkAndRecordRate = internalMutation({
  args: { keys: v.array(v.object({ kind: v.string(), keyHash: v.string() })) },
  returns: v.object({
    blocked: v.union(v.null(), v.string()),
    releaseIds: v.array(v.id("quoteLog")),
  }),
  handler: async (ctx, { keys }) => {
    const now = Date.now();
    for (const { kind, keyHash } of keys) {
      const limit = LIMITS[kind as keyof typeof LIMITS];
      if (!limit) continue;
      const recent = await ctx.db
        .query("quoteLog")
        .withIndex("by_kind_key_at", q =>
          q
            .eq("kind", kind)
            .eq("keyHash", keyHash)
            .gt("at", now - limit.windowMs),
        )
        .take(limit.max);
      if (recent.length >= limit.max) return { blocked: kind, releaseIds: [] };
    }
    const releaseIds: Id<"quoteLog">[] = [];
    for (const { kind, keyHash } of keys) {
      const id = await ctx.db.insert("quoteLog", { kind, keyHash, at: now });
      if (RELEASE_ON_FAILURE.has(kind)) releaseIds.push(id);
    }
    // Housekeeping: drop entries older than 2 days and legacy (pre-v2) entries.
    const old = await ctx.db
      .query("quoteLog")
      .withIndex("by_kind_key_at")
      .take(200);
    for (const doc of old) {
      if (doc.at < now - 2 * 24 * HOUR || !(doc.kind in LIMITS))
        await ctx.db.delete(doc._id);
    }
    return { blocked: null, releaseIds };
  },
});

/** Deletes the records of an attempt whose sheet write failed. */
export const releaseRate = internalMutation({
  args: { ids: v.array(v.id("quoteLog")) },
  returns: v.null(),
  handler: async (ctx, { ids }) => {
    for (const id of ids) {
      if (await ctx.db.get(id)) await ctx.db.delete(id);
    }
    return null;
  },
});

/** Reserves a sheet row so concurrent requests never overwrite each other. */
export const claimRow = internalMutation({
  args: { firstEmptyRow: v.number() },
  returns: v.number(),
  handler: async (ctx, { firstEmptyRow }) => {
    const now = Date.now();
    const recent = await ctx.db
      .query("rowClaims")
      .withIndex("by_at", q => q.gt("at", now - 10 * 60 * 1000))
      .collect();
    const maxClaimed = recent.reduce((m, c) => Math.max(m, c.row), 0);
    const row = Math.max(firstEmptyRow, maxClaimed + 1);
    await ctx.db.insert("rowClaims", { row, at: now });
    return row;
  },
});

const failure = v.object({
  ok: v.literal(false),
  reason: v.union(
    v.literal("invalid"),
    v.literal("rate_limited"),
    v.literal("duplicate"),
    v.literal("unavailable"),
  ),
  message: v.string(),
  fieldErrors: v.record(v.string(), v.string()),
});

/**
 * PUBLIC (anonymous) write: appends one row to the Quote Requests tab.
 * The only write the site makes. Nothing else in the workbook is touched.
 */
export const submitQuote = action({
  args: {
    businessSlug: v.string(),
    serviceZip: v.string(),
    timing: v.string(),
    jobDescription: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    phoneConsent: v.boolean(),
    contactPreference: v.string(),
    termsAccepted: v.boolean(),
    sourcePageUrl: v.string(),
    website: v.string(), // honeypot: must be empty
    elapsedMs: v.number(),
    clientId: v.string(),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), requestId: v.string() }),
    failure,
  ),
  handler: async (ctx, input) => {
    const today = todayInTampa();
    const fakeId = `QR-${today.replace(/-/g, "")}-${Date.now().toString(36).slice(-6).toUpperCase()}`;
    // Honeypot or bot-speed fill: pretend success, write nothing.
    if (input.website.trim() !== "" || input.elapsedMs < MIN_FILL_MS) {
      console.warn("Quote request dropped by spam trap");
      return { ok: true as const, requestId: fakeId };
    }

    const fieldErrors = validateQuote(input);
    if (Object.keys(fieldErrors).length > 0) {
      return {
        ok: false as const,
        reason: "invalid" as const,
        message: "Please fix the highlighted fields.",
        fieldErrors,
      };
    }

    // The listing must exist, be published and have the quote form switched on.
    let business: PublicBusiness | undefined;
    try {
      const { data } = await loadDirectory(ctx);
      business = data.businesses.find(b => b.slug === input.businessSlug);
    } catch {
      return {
        ok: false as const,
        reason: "unavailable" as const,
        message:
          "We couldn't send your request right now. Please try again in a few minutes.",
        fieldErrors: {},
      };
    }
    if (!business || !business.quoteEnabled) {
      return {
        ok: false as const,
        reason: "invalid" as const,
        message:
          "This business isn't taking quote requests through The Tampa Scoop right now.",
        fieldErrors: {},
      };
    }

    const email = input.email.trim().toLowerCase();
    const keys = [
      {
        kind: "duplicate:v2",
        keyHash: await sha256(`${email}|${business.slug}`),
      },
      {
        kind: "client:v2",
        keyHash: await sha256(input.clientId.slice(0, 64) || "none"),
      },
      { kind: "email:v2", keyHash: await sha256(email) },
      { kind: "global:v2", keyHash: "all" },
    ];
    const requestId = `QR-${today.replace(/-/g, "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const values = buildQuoteRow(input, business, requestId, nowInTampa());

    // Rate records are released again if the sheet write fails, so a failed
    // attempt never blocks the retry (the site-wide cap is kept).
    const result: GuardedResult<number> = await guardedWrite<
      number,
      Id<"quoteLog">
    >({
      reserve: (): Promise<Reservation<Id<"quoteLog">>> =>
        ctx.runMutation(internal.quotes.checkAndRecordRate, { keys }),
      release: async ids => {
        await ctx.runMutation(internal.quotes.releaseRate, { ids });
      },
      write: async (): Promise<number> => {
        // One new row at the bottom of Quote Requests.
        const record: Record<string, string> = {};
        QUOTE_COLUMNS.forEach((h, i) => {
          record[h] = values[i] ?? "";
        });
        const [created] = await addRows(QUOTES_TAB, [record]);
        const row = created?.rowNumber ?? 0;
        return row;
      },
    });

    if (result.kind === "blocked") {
      if (result.by === "duplicate:v2") {
        return {
          ok: false as const,
          reason: "duplicate" as const,
          message: `We already have a request from you for ${business.name} today. No need to send it again.`,
          fieldErrors: {},
        };
      }
      return {
        ok: false as const,
        reason: "rate_limited" as const,
        message:
          "Too many requests in a short time. Please try again in an hour.",
        fieldErrors: {},
      };
    }
    if (result.kind === "ok") {
      console.log(`Quote request ${requestId} written to row ${result.value}`);
      return { ok: true as const, requestId };
    }
    const e = result.error;
    console.error("Quote request write failed", requestId, e);
    return {
      ok: false as const,
      reason: "unavailable" as const,
      message:
        e instanceof GatewayError && e.code === "needs_approval"
          ? "Quote requests are paused while we finish setting up. Please call the business directly for now."
          : "We couldn't send your request right now. Please try again in a few minutes.",
      fieldErrors: {},
    };
  },
});
