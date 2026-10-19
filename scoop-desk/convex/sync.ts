/**
 * Sync between the Desk's working copy (Convex) and Smartsheet, which is the
 * source of truth. Each save updates the row with the same Story ID / Issue ID
 * in "Story Queue" / "Issues", or adds one (auto-approved add/update rows).
 * If a write is ever held for approval, saving pauses and everything stays in
 * the Desk until it can sync.
 */
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { authenticatedAction, authenticatedQuery } from "./functions";
import { CHECKLIST, countWords, findVerifyFlags, issueTypeForDate, STATES, type StoryState } from "./lib/desk";
import {
  ISSUE_COLUMNS as ISSUE_COLUMNS_ALL,
  ISSUE_TAB,
  STORY_COLUMNS as STORY_COLUMNS_ALL,
  STORY_TAB,
} from "./lib/schema";
import { isTombstoned, type Tombstone } from "./lib/tombstones";
import { nowInTampa, normalizeSheetDate } from "./lib/tampa";
import { clip, GatewayError, readTab, safeText, upsertRow } from "./sheetsGateway";

/** After a paused/no-tabs result, automatic saves wait this long before trying again (avoids a pile of approval drafts). */
const PAUSE_BACKOFF_MS = 15 * 60 * 1000;
const PULL_THROTTLE_MS = 2 * 60 * 1000;

export const MESSAGES = {
  no_tabs:
    "Saving paused: the “Story Queue” and “Issues” sheets aren't in the Tampa Scoop workspace yet. Your work is kept here in the Desk and syncs once they exist.",
  paused:
    "Saving paused: Smartsheet asked for approval on a write. Your work is kept here in the Desk and syncs once writes go through again.",
  error: "Couldn't reach Smartsheet just now. Your work is kept here in the Desk; use Sync now in a minute.",
} as const;

type MetaStatus = "ok" | "paused" | "no_tabs" | "error" | "unknown";

function classify(e: unknown): { status: Exclude<MetaStatus, "ok" | "unknown">; message: string } {
  if ((e instanceof GatewayError && e.code === "no_tab") || /Unable to parse range/i.test(String(e))) return { status: "no_tabs", message: MESSAGES.no_tabs };
  if (e instanceof GatewayError && e.code === "needs_approval") return { status: "paused", message: MESSAGES.paused };
  return { status: "error", message: MESSAGES.error };
}

// ---------------------------------------------------------------- meta

export const getMeta = internalQuery({
  args: {},
  handler: async ctx =>
    await ctx.db
      .query("syncMeta")
      .withIndex("by_key", q => q.eq("key", "sheets"))
      .unique(),
});

export const setMeta = internalMutation({
  args: {
    status: v.union(v.literal("ok"), v.literal("paused"), v.literal("no_tabs"), v.literal("error"), v.literal("unknown")),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { status, message }) => {
    const doc = await ctx.db
      .query("syncMeta")
      .withIndex("by_key", q => q.eq("key", "sheets"))
      .unique();
    const patch = { status, message, checkedAt: Date.now() };
    if (doc) await ctx.db.patch(doc._id, patch);
    else await ctx.db.insert("syncMeta", { key: "sheets", ...patch });
    return null;
  },
});

/** Banner data for the UI. */
export const status = authenticatedQuery({
  args: {},
  handler: async ctx => {
    const meta = await ctx.db
      .query("syncMeta")
      .withIndex("by_key", q => q.eq("key", "sheets"))
      .unique();
    const unsyncedStories = (
      await Promise.all(
        (["pending", "paused", "error"] as const).map(s =>
          ctx.db
            .query("stories")
            .withIndex("by_syncState", q => q.eq("syncState", s))
            .take(500),
        ),
      )
    ).flat().length;
    const unsyncedIssues = (
      await Promise.all(
        (["pending", "paused", "error"] as const).map(s =>
          ctx.db
            .query("issues")
            .withIndex("by_syncState", q => q.eq("syncState", s))
            .take(200),
        ),
      )
    ).flat().length;
    return {
      status: (meta?.status ?? "unknown") as MetaStatus,
      message: meta?.message ?? "",
      checkedAt: meta?.checkedAt ?? 0,
      unsyncedStories,
      unsyncedIssues,
    };
  },
});

// ---------------------------------------------------------------- row claims

/** Gives a record its sheet row once; concurrent saves never share a row. */
export const claimRowFor = internalMutation({
  args: { table: v.union(v.literal("stories"), v.literal("issues")), id: v.string(), firstEmpty: v.number() },
  returns: v.number(),
  handler: async (ctx, { table, id, firstEmpty }) => {
    const doc =
      table === "stories"
        ? await ctx.db
            .query("stories")
            .withIndex("by_storyId", q => q.eq("storyId", id))
            .unique()
        : await ctx.db
            .query("issues")
            .withIndex("by_issueId", q => q.eq("issueId", id))
            .unique();
    if (!doc) throw new Error("Record not found");
    if (doc.sheetRow) return doc.sheetRow;
    const tab = table === "stories" ? STORY_TAB : ISSUE_TAB;
    const now = Date.now();
    const recent = await ctx.db
      .query("rowClaims")
      .withIndex("by_tab_at", q => q.eq("tab", tab).gt("at", now - 60 * 60 * 1000))
      .take(500);
    const maxClaimed = recent.reduce((m, c) => Math.max(m, c.row), 0);
    const row = Math.max(firstEmpty, maxClaimed + 1);
    await ctx.db.insert("rowClaims", { tab, row, at: now });
    await ctx.db.patch(doc._id, { sheetRow: row });
    return row;
  },
});

export const markRecord = internalMutation({
  args: {
    table: v.union(v.literal("stories"), v.literal("issues")),
    id: v.string(),
    syncState: v.union(v.literal("pending"), v.literal("synced"), v.literal("paused"), v.literal("error")),
    message: v.string(),
    /** Only mark synced if nothing changed since the values were built. */
    expectedUpdatedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { table, id, syncState, message, expectedUpdatedAt }) => {
    const doc =
      table === "stories"
        ? await ctx.db
            .query("stories")
            .withIndex("by_storyId", q => q.eq("storyId", id))
            .unique()
        : await ctx.db
            .query("issues")
            .withIndex("by_issueId", q => q.eq("issueId", id))
            .unique();
    if (!doc) return null;
    if (syncState === "synced" && expectedUpdatedAt !== undefined && doc.updatedAt !== expectedUpdatedAt) {
      // Edited while saving: stays pending; that edit scheduled its own sync.
      return null;
    }
    await ctx.db.patch(doc._id, {
      syncState,
      syncMessage: message,
      ...(syncState === "synced" ? { syncedAt: Date.now() } : {}),
    });
    return null;
  },
});

// ---------------------------------------------------------------- row builders

const ts = (ms: number) => nowInTampa(new Date(ms)).slice(0, 16);

export function storyRow(s: Doc<"stories">): string[] {
  const flags = findVerifyFlags(`${s.headline}\n${s.draft}`);
  const values = [
    s.storyId,
    s.issueDate,
    issueTypeForDate(s.issueDate),
    s.tone,
    s.section,
    s.factBullets,
    s.sourceUrls,
    s.readerAction,
    s.knownGaps,
    s.sponsor ? "Yes" : "No",
    s.sponsorName,
    s.sponsorCopy,
    s.sponsorUrl,
    s.state,
    s.headline,
    s.draft,
    s.draft ? String(countWords(s.draft)) : "",
    flags.join(", "),
    s.claims.map(c => `${c.claim} → ${c.sourceUrl}`).join("\n"),
    s.editorNotes,
    ts(s.createdAt),
    ts(s.updatedAt),
  ];
  return values.map(x => clip(safeText(x)));
}

/** Approvals and approved copy for the sheet (a Smartsheet cell holds 4,000 characters). */
function sectionsCell(i: Doc<"issues">): string {
  const secs = (i.sections ?? []).filter(s => s.approvedTone || s.approvedText);
  if (!secs.length) return "";
  const full = JSON.stringify(secs.map(s => ({ key: s.key, tone: s.approvedTone, text: s.approvedText })));
  if (full.length <= 3900) return full;
  const per = Math.floor(3400 / secs.length);
  return JSON.stringify(secs.map(s => ({ key: s.key, tone: s.approvedTone, text: s.approvedText.slice(0, per) })));
}

export function issueRow(i: Doc<"issues">): string[] {
  const values = [
    i.issueId,
    i.issueDate,
    i.issueType,
    i.subject,
    i.previewText,
    i.opening,
    i.storyIds.join(", "),
    i.eventPicks.map(e => `${e.slot ? `${e.slot}: ` : ""}${e.name} (${e.startDate})`).join(" | "),
    i.business?.name ?? "",
    `${i.checklist.filter(Boolean).length}/${CHECKLIST.length}`,
    i.status,
    i.exportedText ?? "",
    i.exportedHtml ?? "",
    i.exportedAt ? ts(i.exportedAt) : "",
    ts(i.updatedAt),
    "",
    sectionsCell(i),
    (i.subjectOptions ?? []).map(o => `${o.subject} | ${o.preview}`).join("\n"),
  ];
  return values.map(x => clip(safeText(x)));
}

// ---------------------------------------------------------------- sync actions

async function shouldBackOff(
  ctx: { runQuery: (r: typeof internal.sync.getMeta, a: Record<string, never>) => Promise<Doc<"syncMeta"> | null> },
  force: boolean,
): Promise<Doc<"syncMeta"> | null> {
  if (force) return null;
  const meta = await ctx.runQuery(internal.sync.getMeta, {});
  if (meta && (meta.status === "paused" || meta.status === "no_tabs") && Date.now() - meta.checkedAt < PAUSE_BACKOFF_MS) {
    return meta;
  }
  return null;
}

export const syncStory = internalAction({
  args: { storyId: v.string(), force: v.boolean() },
  returns: v.union(v.literal("synced"), v.literal("paused"), v.literal("error")),
  handler: async (ctx, { storyId, force }) => {
    const wait = await shouldBackOff(ctx, force);
    if (wait) {
      await ctx.runMutation(internal.sync.markRecord, { table: "stories", id: storyId, syncState: "paused", message: wait.message });
      return "paused" as const;
    }
    const s = await ctx.runQuery(internal.stories.getInternal, { storyId });
    if (!s) return "error" as const;
    try {
      const row = await upsertRow(STORY_TAB, STORY_COLUMNS_ALL, storyRow(s));
      await ctx.runMutation(internal.sync.markRecord, {
        table: "stories",
        id: storyId,
        syncState: "synced",
        message: `Saved to Story Queue row ${row}`,
        expectedUpdatedAt: s.updatedAt,
      });
      await ctx.runMutation(internal.sync.setMeta, { status: "ok", message: "" });
      return "synced" as const;
    } catch (e) {
      const c = classify(e);
      console.warn(`Story ${storyId} not saved to sheet: ${c.status}`, String(e).slice(0, 300));
      await ctx.runMutation(internal.sync.setMeta, c);
      await ctx.runMutation(internal.sync.markRecord, {
        table: "stories",
        id: storyId,
        syncState: c.status === "error" ? "error" : "paused",
        message: c.message,
      });
      return c.status === "error" ? ("error" as const) : ("paused" as const);
    }
  },
});

export const getIssueInternal = internalQuery({
  args: { issueId: v.string() },
  handler: async (ctx, { issueId }) =>
    await ctx.db
      .query("issues")
      .withIndex("by_issueId", q => q.eq("issueId", issueId))
      .unique(),
});

export const syncIssue = internalAction({
  args: { issueId: v.string(), force: v.boolean() },
  returns: v.union(v.literal("synced"), v.literal("paused"), v.literal("error")),
  handler: async (ctx, { issueId, force }) => {
    const wait = await shouldBackOff(ctx, force);
    if (wait) {
      await ctx.runMutation(internal.sync.markRecord, { table: "issues", id: issueId, syncState: "paused", message: wait.message });
      return "paused" as const;
    }
    const i = await ctx.runQuery(internal.sync.getIssueInternal, { issueId });
    if (!i) return "error" as const;
    try {
      const row = await upsertRow(ISSUE_TAB, ISSUE_COLUMNS_ALL, issueRow(i), ["Notes"]);
      await ctx.runMutation(internal.sync.markRecord, {
        table: "issues",
        id: issueId,
        syncState: "synced",
        message: `Saved to Issues row ${row}`,
        expectedUpdatedAt: i.updatedAt,
      });
      await ctx.runMutation(internal.sync.setMeta, { status: "ok", message: "" });
      return "synced" as const;
    } catch (e) {
      const c = classify(e);
      console.warn(`Issue ${issueId} not saved to sheet: ${c.status}`, String(e).slice(0, 300));
      await ctx.runMutation(internal.sync.setMeta, c);
      await ctx.runMutation(internal.sync.markRecord, {
        table: "issues",
        id: issueId,
        syncState: c.status === "error" ? "error" : "paused",
        message: c.message,
      });
      return c.status === "error" ? ("error" as const) : ("paused" as const);
    }
  },
});

export const unsyncedIds = internalQuery({
  args: {},
  handler: async ctx => {
    const stories: string[] = [];
    const issues: string[] = [];
    for (const s of ["pending", "paused", "error"] as const) {
      for (const d of await ctx.db
        .query("stories")
        .withIndex("by_syncState", q => q.eq("syncState", s))
        .take(200))
        stories.push(d.storyId);
      for (const d of await ctx.db
        .query("issues")
        .withIndex("by_syncState", q => q.eq("syncState", s))
        .take(100))
        issues.push(d.issueId);
    }
    return { stories, issues };
  },
});

/** "Sync now": tries every unsaved item once, stopping at the first pause. */
export const syncNow = authenticatedAction({
  args: {},
  returns: v.object({ synced: v.number(), remaining: v.number(), status: v.string(), message: v.string() }),
  handler: async (ctx): Promise<{ synced: number; remaining: number; status: string; message: string }> => {
    const { stories, issues }: { stories: string[]; issues: string[] } = await ctx.runQuery(internal.sync.unsyncedIds, {});
    let synced = 0;
    let stopped: string | null = null;
    for (const id of stories) {
      const r: "synced" | "paused" | "error" = await ctx.runAction(internal.sync.syncStory, { storyId: id, force: true });
      if (r === "synced") synced++;
      else {
        stopped = r;
        break;
      }
    }
    if (!stopped) {
      for (const id of issues) {
        const r: "synced" | "paused" | "error" = await ctx.runAction(internal.sync.syncIssue, { issueId: id, force: true });
        if (r === "synced") synced++;
        else {
          stopped = r;
          break;
        }
      }
    }
    await ctx.runAction(internal.deletes.retryTombs, {});
    if (stories.length + issues.length === 0) {
      // Nothing to write: still check the tabs exist so the banner is honest.
      await ctx.runAction(internal.sync.checkTabs, {});
    }
    const meta: Doc<"syncMeta"> | null = await ctx.runQuery(internal.sync.getMeta, {});
    return {
      synced,
      remaining: stories.length + issues.length - synced,
      status: meta?.status ?? "unknown",
      message: meta?.message ?? "",
    };
  },
});

// ---------------------------------------------------------------- pull (sheet wins)

const cell = (row: Record<string, unknown>, k: string) => String(row[k] ?? "").trim();

export const upsertFromSheet = internalMutation({
  args: {
    rows: v.array(
      v.object({
        sheetRow: v.number(),
        storyId: v.string(),
        issueDate: v.string(),
        tone: v.string(),
        section: v.string(),
        factBullets: v.string(),
        sourceUrls: v.string(),
        readerAction: v.string(),
        knownGaps: v.string(),
        sponsor: v.boolean(),
        sponsorName: v.string(),
        sponsorCopy: v.string(),
        sponsorUrl: v.string(),
        state: v.string(),
        headline: v.string(),
        draft: v.string(),
        editorNotes: v.string(),
      }),
    ),
  },
  returns: v.object({ added: v.number(), updated: v.number() }),
  handler: async (ctx, { rows }) => {
    let added = 0;
    let updated = 0;
    for (const r of rows) {
      const state = ((STATES as readonly string[]).includes(r.state) ? r.state : "queued") as StoryState;
      const { sheetRow, ...fields } = r;
      const tomb = await ctx.db
        .query("tombstones")
        .withIndex("by_storyId", q => q.eq("storyId", r.storyId))
        .first();
      if (tomb) continue;
      const doc = await ctx.db
        .query("stories")
        .withIndex("by_storyId", q => q.eq("storyId", r.storyId))
        .unique();
      if (!doc) {
        const now = Date.now();
        await ctx.db.insert("stories", {
          ...fields,
          state,
          claims: [],
          warnings: [],
          createdAt: now,
          updatedAt: now,
          draftCount: 0,
          sheetRow,
          syncState: "synced",
          syncedAt: now,
          syncMessage: `Loaded from Story Queue row ${sheetRow}`,
        });
        added++;
      } else if (doc.syncState === "synced") {
        const changed = (Object.keys(fields) as (keyof typeof fields)[]).some(
          k => k !== "state" && String(doc[k as keyof typeof doc] ?? "") !== String(fields[k]),
        ) || doc.state !== state;
        if (changed) {
          await ctx.db.patch(doc._id, { ...fields, state, sheetRow, updatedAt: Date.now(), syncedAt: Date.now() });
          updated++;
        }
      }
    }
    return { added, updated };
  },
});

export const pullStories = internalAction({
  args: { force: v.boolean() },
  returns: v.object({ ok: v.boolean(), added: v.number(), updated: v.number(), message: v.string() }),
  handler: async (ctx, { force }): Promise<{ ok: boolean; added: number; updated: number; message: string }> => {
    const last = await ctx.runQuery(internal.feeds.readCache, { key: "lastPull" });
    if (!force && last && Date.now() - last.fetchedAt < PULL_THROTTLE_MS) {
      return { ok: true, added: 0, updated: 0, message: "recent" };
    }
    await ctx.runMutation(internal.feeds.writeCache, { key: "lastPull", fetchedAt: Date.now(), payload: "" });
    try {
      const rows = await readTab(STORY_TAB);
      const tombs: Tombstone[] = await ctx.runQuery(internal.deletes.listTombs, {});
      const parsed = rows
        .filter(r => cell(r, "Story ID"))
        .filter(r => !isTombstoned({ storyId: cell(r, "Story ID"), rowId: String(r._rowId ?? "") }, tombs))
        .map(r => ({
          sheetRow: Number(r._rowNumber) || 0,
          storyId: cell(r, "Story ID"),
          issueDate: normalizeSheetDate(r["Issue Date"]),
          tone: cell(r, "Tone"),
          section: cell(r, "Section"),
          factBullets: cell(r, "Fact Bullets"),
          sourceUrls: cell(r, "Source URLs"),
          readerAction: cell(r, "Reader Action"),
          knownGaps: cell(r, "Known Gaps"),
          sponsor: /^yes$/i.test(cell(r, "Sponsor")),
          sponsorName: cell(r, "Sponsor Name"),
          sponsorCopy: cell(r, "Sponsor Copy"),
          sponsorUrl: cell(r, "Sponsor URL"),
          state: cell(r, "State"),
          headline: cell(r, "Headline"),
          draft: cell(r, "Draft"),
          editorNotes: cell(r, "Editor Notes"),
        }))
        .filter(r => r.sheetRow > 0);
      const res: { added: number; updated: number } = await ctx.runMutation(internal.sync.upsertFromSheet, { rows: parsed });
      // Retry Story Queue row deletes that were held for approval.
      await ctx.runAction(internal.deletes.retryTombs, {});
      const meta: Doc<"syncMeta"> | null = await ctx.runQuery(internal.sync.getMeta, {});
      // The tabs exist now: lift a "no tabs" pause so saving retries.
      if (!meta || meta.status === "no_tabs" || meta.status === "error" || meta.status === "unknown")
        await ctx.runAction(internal.sync.checkTabs, {});
      return { ok: true, ...res, message: "" };
    } catch (e) {
      const c = classify(e);
      if (c.status === "no_tabs") await ctx.runMutation(internal.sync.setMeta, c);
      return { ok: false, added: 0, updated: 0, message: c.message };
    }
  },
});

/** Called when the Desk opens: pulls edits made directly in the sheet (throttled). */
export const refreshFromSheet = authenticatedAction({
  args: { force: v.boolean() },
  returns: v.object({ ok: v.boolean(), added: v.number(), updated: v.number(), message: v.string() }),
  handler: async (ctx, { force }): Promise<{ ok: boolean; added: number; updated: number; message: string }> =>
    await ctx.runAction(internal.sync.pullStories, { force }),
});

/** Test cleanup (CLI only): removes records made by e2e tests from the dev database. */
export const deleteTestData = internalMutation({
  args: {},
  returns: v.object({ stories: v.number(), issues: v.number() }),
  handler: async ctx => {
    let stories = 0;
    let issues = 0;
    const testDates = new Set<string>();
    for (const s of await ctx.db.query("stories").take(1000)) {
      if (/TEST ONLY/i.test(`${s.factBullets} ${s.sponsorName} ${s.sponsorCopy}`)) {
        testDates.add(s.issueDate);
        await ctx.db.delete(s._id);
        stories++;
      }
    }
    for (const i of await ctx.db.query("issues").take(500)) {
      if (testDates.has(i.issueDate) || /TEST ONLY/i.test(i.subject)) {
        await ctx.db.delete(i._id);
        issues++;
      }
    }
    for (const m of await ctx.db.query("syncMeta").take(10)) await ctx.db.delete(m._id);
    for (const c of await ctx.db.query("rowClaims").take(1000)) await ctx.db.delete(c._id);
    return { stories, issues };
  },
});

/**
 * Read-only readiness check: both Desk tabs exist and their headers match the
 * app's column layout. Writes nothing to the sheet; records the result in syncMeta.
 */
export const checkTabs = internalAction({
  args: {},
  returns: v.object({ status: v.string(), message: v.string() }),
  handler: async (ctx): Promise<{ status: string; message: string }> => {
    try {
      const problems: string[] = [];
      for (const [tab, cols] of [
        [STORY_TAB, STORY_COLUMNS_ALL],
        [ISSUE_TAB, ISSUE_COLUMNS_ALL],
      ] as const) {
        const rows = await readTab(tab);
        const header = rows.length
          ? Object.keys(rows[0]).filter(k => !k.startsWith("_"))
          : null;
        if (header && header.join("|") !== cols.join("|")) problems.push(`${tab} headers don't match`);
      }
      if (problems.length) {
        const message = `Saving paused: ${problems.join("; ")}. Fix the header row, then Sync now.`;
        await ctx.runMutation(internal.sync.setMeta, { status: "error", message });
        return { status: "error", message };
      }
      const meta: Doc<"syncMeta"> | null = await ctx.runQuery(internal.sync.getMeta, {});
      // A paused write (approval needed) is only cleared by a write that succeeds.
      if (meta?.status === "paused") return { status: "paused", message: meta.message };
      await ctx.runMutation(internal.sync.setMeta, { status: "ok", message: "Story Queue and Issues tabs found; headers match." });
      return { status: "ok", message: "Story Queue and Issues tabs found; headers match." };
    } catch (e) {
      const c = classify(e);
      await ctx.runMutation(internal.sync.setMeta, c);
      return { status: c.status, message: c.message };
    }
  },
});
