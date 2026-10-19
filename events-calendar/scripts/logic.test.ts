/** Unit tests for sheet mapping, filters and the submission row (no network). */
import { expect, test } from "bun:test";
import { toPublicEvent } from "../convex/events";
import { validateSubmission } from "../convex/lib/submission";
import { normalizeSheetDate } from "../convex/lib/tampa";
import { buildSubmissionRow, safeText } from "../convex/submissions";
import { applyFilters, dateWindow } from "../src/lib/events";

const base = {
  "Event Name": "Sample", Venue: "Venue", Status: "Approved", "Start Date": "2026-10-17",
  Category: "Live Music", "Ticket Price / Free": "Free", Cancelled: "FALSE", Featured: "FALSE",
  "Neighborhood/ZIP": "Ybor City / 33605",
};

test("only Approved, non-cancelled rows with a valid start date publish", () => {
  expect(toPublicEvent(base)?.neighborhood).toBe("Ybor City");
  expect(toPublicEvent(base)?.zip).toBe("33605");
  expect(toPublicEvent({ ...base, Status: "Pending Review" })).toBeNull();
  expect(toPublicEvent({ ...base, Status: "Draft" })).toBeNull();
  expect(toPublicEvent({ ...base, Cancelled: "TRUE" })).toBeNull();
  expect(toPublicEvent({ ...base, "Start Date": "" })).toBeNull();
  expect(toPublicEvent({ "Event Name": "", Status: "", Featured: "FALSE" })).toBeNull();
});

test("sheet date formats normalise", () => {
  expect(normalizeSheetDate("2026-10-17")).toBe("2026-10-17");
  expect(normalizeSheetDate("10/17/2026")).toBe("2026-10-17");
  expect(normalizeSheetDate("46312")).toBe("2026-10-17");
  expect(normalizeSheetDate("nonsense")).toBe("");
});

test("weekend window", () => {
  expect(dateWindow("weekend", "2026-10-12")).toEqual(["2026-10-16", "2026-10-18"]); // Mon
  expect(dateWindow("weekend", "2026-10-17")).toEqual(["2026-10-17", "2026-10-18"]); // Sat
  expect(dateWindow("weekend", "2026-10-18")).toEqual(["2026-10-18", "2026-10-18"]); // Sun
});

test("filters", () => {
  const ev = toPublicEvent(base)!;
  const f = { q: "", date: "all" as const, on: "", category: "", neighborhood: "", free: false, family: false };
  expect(applyFilters([ev], { ...f, category: "Live Music", neighborhood: "Ybor City", free: true }, "2026-10-12")).toHaveLength(1);
  expect(applyFilters([ev], { ...f, category: "Markets" }, "2026-10-12")).toHaveLength(0);
  expect(applyFilters([ev], { ...f, date: "today" }, "2026-10-12")).toHaveLength(0);
  expect(applyFilters([ev], { ...f, q: "sample venue" }, "2026-10-12")).toHaveLength(1);
});

const input = {
  submitterName: "Ana Diaz", submitterEmail: "ana@example.com", organizer: "Ybor Arts", title: "=HYPERLINK(\"x\")",
  startDate: "2026-10-20", startTime: "18:30", endDate: "", endTime: "21:00", venue: "Centro", address: "1600 E 7th Ave, Tampa, FL 33605",
  neighborhood: "Ybor City", ticketUrl: "https://example.com", priceType: "paid" as const, price: "$25", category: "Arts + Culture",
  ageRule: "21+", description: "A long enough description of the event for validation to pass.", imageUrl: "",
  accuracyConfirmed: true, marketingOptIn: false, website: "", elapsedMs: 9000, clientId: "c",
};

test("submission row maps to Event Submissions columns", () => {
  expect(validateSubmission(input, "2026-10-12")).toEqual({});
  const { aToX, zToAA } = buildSubmissionRow(input, "SUB-1", "2026-10-12 09:00:00");
  expect(aToX).toHaveLength(24); // A..X
  expect(aToX[0]).toBe("'=HYPERLINK(\"x\")"); // formula injection neutralised
  expect(aToX[4]).toBe("Ybor City / 33605");
  expect(aToX[7]).toBe("6:30 PM – 9:00 PM");
  expect(aToX[13]).toBe("Submitted");
  expect(aToX[14]).toBe("Pending Review");
  expect(aToX[19]).toBe("2026-10-12 09:00:00");
  expect(zToAA).toEqual(["FALSE", "Ybor City"]);
  expect(safeText("+1")).toBe("'+1");
});

test("validation rejects bad input", () => {
  const e = validateSubmission({ ...input, submitterEmail: "x", startDate: "2026-10-01", category: "Nope", accuracyConfirmed: false }, "2026-10-12");
  expect(Object.keys(e).sort()).toEqual(["accuracyConfirmed", "category", "startDate", "submitterEmail"]);
});

// ---- Rate-guarded write: failed write then retry ----------------------------
import { guardedWrite } from "../convex/lib/guardedWrite";
import { LIMITS } from "../convex/submissions";

/** In-memory copy of checkAndRecordRate / releaseRate semantics. */
function fakeRateStore() {
  const log: { id: number; kind: string; keyHash: string; at: number }[] = [];
  let next = 1;
  const releasable = new Set(["client:v2", "email:v2", "duplicate:v2"]);
  return {
    log,
    reserve: async (keys: { kind: string; keyHash: string }[]) => {
      const now = Date.now();
      for (const { kind, keyHash } of keys) {
        const limit = LIMITS[kind as keyof typeof LIMITS];
        const n = log.filter(e => e.kind === kind && e.keyHash === keyHash && e.at > now - limit.windowMs).length;
        if (n >= limit.max) return { blocked: kind, releaseIds: [] as number[] };
      }
      const releaseIds: number[] = [];
      for (const { kind, keyHash } of keys) {
        const id = next++;
        log.push({ id, kind, keyHash, at: now });
        if (releasable.has(kind)) releaseIds.push(id);
      }
      return { blocked: null, releaseIds };
    },
    release: async (ids: number[]) => {
      for (const id of ids) {
        const i = log.findIndex(e => e.id === id);
        if (i >= 0) log.splice(i, 1);
      }
    },
  };
}

const KEYS = [
  { kind: "duplicate:v2", keyHash: "dup" },
  { kind: "client:v2", keyHash: "browser" },
  { kind: "email:v2", keyHash: "me@example.com" },
  { kind: "global:v2", keyHash: "all" },
];

test("failed sheet write then retry succeeds (not blocked as duplicate)", async () => {
  const store = fakeRateStore();
  let attempts = 0;
  const write = async () => {
    attempts++;
    if (attempts <= 3) throw new Error("needs_approval");
    return 7;
  };
  for (let i = 0; i < 3; i++) {
    const r = await guardedWrite({ reserve: () => store.reserve(KEYS), release: store.release, write });
    expect(r.kind).toBe("failed");
  }
  // Failed writes left no duplicate/email/client records behind.
  expect(store.log.filter(e => e.kind !== "global:v2")).toHaveLength(0);
  const ok = await guardedWrite({ reserve: () => store.reserve(KEYS), release: store.release, write });
  expect(ok).toEqual({ kind: "ok", value: 7 });
  // A real duplicate after a successful write is still blocked.
  const again = await guardedWrite({ reserve: () => store.reserve(KEYS), release: store.release, write });
  expect(again).toEqual({ kind: "blocked", by: "duplicate:v2" });
});
