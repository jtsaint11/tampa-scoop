import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { type GuardedResult, guardedWrite, type Reservation } from "./lib/guardedWrite";
import { type SubmissionInput, validateSubmission } from "./lib/submission";
import { nowInTampa, todayInTampa } from "./lib/tampa";
import { addRows, GatewayError, SUBMISSIONS_TAB } from "./sheetsGateway";

// ---- Spam protection settings -------------------------------------------
const HOUR = 60 * 60 * 1000;
// Kind names carry a version suffix. Records written before the
// "release on failed write" fix (kinds without ":v2") are ignored by the
// checks and purged by the housekeeping in checkAndRecordRate.
export const LIMITS = {
  "client:v2": { max: 3, windowMs: HOUR }, // per browser
  "email:v2": { max: 5, windowMs: 24 * HOUR }, // per submitter email
  "global:v2": { max: 40, windowMs: HOUR }, // whole site (kept even when a write fails)
  "duplicate:v2": { max: 1, windowMs: 7 * 24 * HOUR }, // same email+title+date
} as const;
/** Records removed again when the sheet write fails. */
const RELEASE_ON_FAILURE = new Set(["client:v2", "email:v2", "duplicate:v2"]);
const MIN_FILL_MS = 3000;

/** Column order of the Event Submissions sheet (A..AA). */
const SUBMISSION_COLUMNS = [
  "Event Name", "Organizer", "Venue", "Address", "Neighborhood/ZIP", "Start Date", "End Date", "Time", "Category",
  "Description", "Ticket Price / Free", "Ticket URL", "Image URL", "Source", "Status", "Date Verified", "Featured",
  "Submitter Name", "Submitter Email", "Submitted At", "Review Notes", "Submission ID",
  "Accuracy & Rights Confirmed", "Marketing Opt-in", "Possible Duplicate", "Spam Flag", "Neighborhood",
] as const; // humans take longer than 3s to fill this form

const submissionArgs = {
  submitterName: v.string(),
  submitterEmail: v.string(),
  organizer: v.string(),
  title: v.string(),
  startDate: v.string(),
  startTime: v.string(),
  endDate: v.string(),
  endTime: v.string(),
  venue: v.string(),
  address: v.string(),
  neighborhood: v.string(),
  ticketUrl: v.string(),
  priceType: v.union(v.literal("free"), v.literal("paid")),
  price: v.string(),
  category: v.string(),
  ageRule: v.string(),
  description: v.string(),
  imageUrl: v.string(),
  accuracyConfirmed: v.boolean(),
  marketingOptIn: v.boolean(),
  // spam signals
  website: v.string(), // honeypot: must be empty
  elapsedMs: v.number(),
  clientId: v.string(),
};

/** Neutralise spreadsheet formula injection (values are USER_ENTERED). */
export function safeText(s: string): string {
  const t = s.replace(/\r\n?/g, "\n").trim();
  return /^[=+\-@\t]/.test(t) ? `'${t}` : t;
}

function formatTime(hhmm: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/**
 * Builds the cell values for one Event Submissions row.
 * Columns A..X are written in one range and Z..AA in another, skipping
 * Y (Possible Duplicate), which is an array formula in the sheet.
 */
export function buildSubmissionRow(
  input: SubmissionInput,
  submissionId: string,
  submittedAt: string,
): { aToX: string[]; zToAA: string[] } {
  const zip = input.address.match(/\b3\d{4}\b/)?.[0] ?? "";
  const neighborhoodZip = [input.neighborhood, zip].filter(Boolean).join(" / ");
  const time = input.endTime
    ? `${formatTime(input.startTime)} – ${formatTime(input.endTime)}`
    : formatTime(input.startTime);
  const price = input.priceType === "free" ? "Free" : safeText(input.price);
  const notes = `Age/access: ${input.ageRule}. Submitted via the website form.`;
  const aToX = [
    safeText(input.title), // A Event Name
    safeText(input.organizer), // B Organizer
    safeText(input.venue), // C Venue
    safeText(input.address), // D Address
    neighborhoodZip, // E Neighborhood/ZIP
    input.startDate, // F Start Date
    input.endDate, // G End Date
    time, // H Time
    input.category, // I Category
    safeText(input.description), // J Description
    price, // K Ticket Price / Free
    input.ticketUrl.trim(), // L Ticket URL
    input.imageUrl.trim(), // M Image URL
    "Submitted", // N Source
    "Pending Review", // O Status
    "", // P Date Verified
    "FALSE", // Q Featured
    safeText(input.submitterName), // R Submitter Name
    input.submitterEmail.trim(), // S Submitter Email
    submittedAt, // T Submitted At (America/New_York)
    notes, // U Review Notes
    submissionId, // V Submission ID
    input.accuracyConfirmed ? "TRUE" : "FALSE", // W Accuracy & Rights Confirmed
    input.marketingOptIn ? "TRUE" : "FALSE", // X Marketing Opt-in
  ];
  const zToAA = [
    "FALSE", // Z Spam Flag
    input.neighborhood, // AA Neighborhood
  ];
  return { aToX, zToAA };
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Atomically checks every rate limit and, if all pass, records the attempt.
 * Returns the ids of the records to delete if the sheet write then fails.
 */
export const checkAndRecordRate = internalMutation({
  args: {
    keys: v.array(v.object({ kind: v.string(), keyHash: v.string() })),
  },
  returns: v.object({ blocked: v.union(v.null(), v.string()), releaseIds: v.array(v.id("submissionLog")) }),
  handler: async (ctx, { keys }) => {
    const now = Date.now();
    for (const { kind, keyHash } of keys) {
      const limit = LIMITS[kind as keyof typeof LIMITS];
      if (!limit) continue;
      const recent = await ctx.db
        .query("submissionLog")
        .withIndex("by_kind_key_at", q =>
          q.eq("kind", kind).eq("keyHash", keyHash).gt("at", now - limit.windowMs),
        )
        .take(limit.max);
      if (recent.length >= limit.max) return { blocked: kind, releaseIds: [] };
    }
    const releaseIds: Id<"submissionLog">[] = [];
    for (const { kind, keyHash } of keys) {
      const id = await ctx.db.insert("submissionLog", { kind, keyHash, at: now });
      if (RELEASE_ON_FAILURE.has(kind)) releaseIds.push(id);
    }
    // Housekeeping: drop entries older than 8 days and legacy (pre-v2) entries.
    const old = await ctx.db.query("submissionLog").withIndex("by_kind_key_at").take(200);
    for (const doc of old) {
      if (doc.at < now - 8 * 24 * HOUR || !(doc.kind in LIMITS)) await ctx.db.delete(doc._id);
    }
    return { blocked: null, releaseIds };
  },
});

/** Deletes the records of an attempt whose sheet write failed. */
export const releaseRate = internalMutation({
  args: { ids: v.array(v.id("submissionLog")) },
  returns: v.null(),
  handler: async (ctx, { ids }) => {
    for (const id of ids) {
      if (await ctx.db.get(id)) await ctx.db.delete(id);
    }
    return null;
  },
});

/** Reserves a sheet row so concurrent submissions never overwrite each other. */
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

/**
 * PUBLIC (anonymous) write: appends one row to the Event Submissions tab.
 * Approved by the user as the second anonymous action. Nothing else is written.
 */
export const submitEvent = action({
  args: submissionArgs,
  returns: v.union(
    v.object({ ok: v.literal(true), submissionId: v.string() }),
    v.object({
      ok: v.literal(false),
      reason: v.union(
        v.literal("invalid"),
        v.literal("rate_limited"),
        v.literal("duplicate"),
        v.literal("unavailable"),
      ),
      message: v.string(),
      fieldErrors: v.record(v.string(), v.string()),
    }),
  ),
  handler: async (ctx, input) => {
    const fakeId = `SUB-${Date.now().toString(36).toUpperCase()}`;
    // Honeypot or bot-speed fill: pretend success, write nothing.
    if (input.website.trim() !== "" || input.elapsedMs < MIN_FILL_MS) {
      console.warn("Submission dropped by spam trap");
      return { ok: true as const, submissionId: fakeId };
    }

    const today = todayInTampa();
    const fieldErrors = validateSubmission(input, today);
    if (Object.keys(fieldErrors).length > 0) {
      return {
        ok: false as const,
        reason: "invalid" as const,
        message: "Please fix the highlighted fields.",
        fieldErrors,
      };
    }

    const email = input.submitterEmail.trim().toLowerCase();
    const keys = [
      { kind: "duplicate:v2", keyHash: await sha256(`${email}|${input.title.trim().toLowerCase()}|${input.startDate}`) },
      { kind: "client:v2", keyHash: await sha256(input.clientId.slice(0, 64) || "none") },
      { kind: "email:v2", keyHash: await sha256(email) },
      { kind: "global:v2", keyHash: "all" },
    ];
    const submissionId = `SUB-${today.replace(/-/g, "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const { aToX, zToAA } = buildSubmissionRow(input, submissionId, nowInTampa());

    const result: GuardedResult<number> = await guardedWrite<number, Id<"submissionLog">>({
      reserve: (): Promise<Reservation<Id<"submissionLog">>> => ctx.runMutation(internal.submissions.checkAndRecordRate, { keys }),
      release: async ids => {
        await ctx.runMutation(internal.submissions.releaseRate, { ids });
      },
      write: async (): Promise<number> => {
        // One new row at the bottom of Event Submissions. Possible Duplicate is left to the sheet.
        const header = SUBMISSION_COLUMNS;
        const values = [...aToX, "", ...zToAA];
        const record: Record<string, string> = {};
        header.forEach((h, i) => {
          if (h !== "Possible Duplicate") record[h] = values[i] ?? "";
        });
        const [created] = await addRows(SUBMISSIONS_TAB, [record]);
        const row = created?.rowNumber ?? 0;
        return row;
      },
    });

    if (result.kind === "blocked") {
      if (result.by === "duplicate:v2") {
        return {
          ok: false as const,
          reason: "duplicate" as const,
          message: "We already have this event from you. No need to send it again; we'll review it.",
          fieldErrors: {},
        };
      }
      return {
        ok: false as const,
        reason: "rate_limited" as const,
        message: "Too many submissions in a short time. Please try again in an hour.",
        fieldErrors: {},
      };
    }
    if (result.kind === "failed") {
      const e = result.error;
      console.error("Submission write failed", submissionId, e);
      return {
        ok: false as const,
        reason: "unavailable" as const,
        message:
          e instanceof GatewayError && e.code === "needs_approval"
            ? "Submissions are paused while we finish setting up. Please try again later."
            : "We couldn't save your submission right now. Please try again in a few minutes.",
        fieldErrors: {},
      };
    }
    console.log(`Submission ${submissionId} written to row ${result.value}`);
    return { ok: true as const, submissionId };
  },
});

/** Operator check: how many rate/duplicate records exist, by kind (no content). */
export const submissionLogSummary = internalQuery({
  args: {},
  returns: v.record(v.string(), v.number()),
  handler: async ctx => {
    const counts: Record<string, number> = {};
    for (const doc of await ctx.db.query("submissionLog").take(1000)) {
      counts[doc.kind] = (counts[doc.kind] ?? 0) + 1;
    }
    return counts;
  },
});
