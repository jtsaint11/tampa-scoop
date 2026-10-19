/**
 * Permanent Delete for stories. Order matters because pull is sheet-wins:
 * 1) record a tombstone, 2) remove the story locally (and from issues),
 * 3) delete the Story Queue row. If the row delete is held for approval or
 * fails, the row's State is set to "Deleted" (auto-approved update) and the
 * delete is retried on later syncs.
 */
declare const process: { env: Record<string, string | undefined> };
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { authenticatedAction } from "./functions";
import { STORY_TAB } from "./lib/schema";
import { DELETE_FALLBACK_TOAST, findTombRow, stripStoryFromIssue } from "./lib/tombstones";
import { deleteRows, readTab, updateRows } from "./sheetsGateway";

/** Retries of a held row delete wait this long (avoids a pile of approval cards). */
const RETRY_MS = 15 * 60 * 1000;

const outcomeV = v.union(v.literal("deleted"), v.literal("marked"), v.literal("failed"), v.literal("skipped"));
type Outcome = "deleted" | "marked" | "failed" | "skipped";

export const removeLocal = internalMutation({
  args: { storyId: v.string() },
  returns: v.object({ issues: v.number() }),
  handler: async (ctx, { storyId }) => {
    const existing = await ctx.db
      .query("tombstones")
      .withIndex("by_storyId", q => q.eq("storyId", storyId))
      .unique();
    if (!existing) await ctx.db.insert("tombstones", { storyId, deletedAt: Date.now(), status: "pending" });
    const doc = await ctx.db
      .query("stories")
      .withIndex("by_storyId", q => q.eq("storyId", storyId))
      .unique();
    if (doc) await ctx.db.delete(doc._id);
    let issues = 0;
    for (const i of await ctx.db.query("issues").take(1000)) {
      const r = stripStoryFromIssue(i, storyId);
      if (r.changed) {
        await ctx.db.patch(i._id, { storyIds: r.storyIds, sections: r.sections, updatedAt: Date.now(), syncState: "pending" });
        await ctx.scheduler.runAfter(0, internal.sync.syncIssue, { issueId: i.issueId, force: false });
        issues++;
      }
    }
    return { issues };
  },
});

export const listTombs = internalQuery({
  args: {},
  handler: async ctx => await ctx.db.query("tombstones").take(2000),
});

export const markTomb = internalMutation({
  args: {
    storyId: v.string(),
    status: v.union(v.literal("pending"), v.literal("marked"), v.literal("done")),
    sheetRowId: v.optional(v.string()),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { storyId, status, sheetRowId, message }) => {
    const t = await ctx.db
      .query("tombstones")
      .withIndex("by_storyId", q => q.eq("storyId", storyId))
      .unique();
    if (t) await ctx.db.patch(t._id, { status, message, lastTryAt: Date.now(), ...(sheetRowId ? { sheetRowId } : {}) });
    return null;
  },
});

/** Tries to remove the tombstoned story's Story Queue row; falls back to State = Deleted. */
export const purgeTomb = internalAction({
  args: { storyId: v.string() },
  returns: outcomeV,
  handler: async (ctx, { storyId }): Promise<Outcome> => {
    // Dev test mode only touches throwaway rows (Story ID starting ZZTEST-).
    if (process.env.DESK_TEST_MODE === "1" && !/^ZZTEST-/i.test(storyId)) return "skipped";
    const tombs: { storyId: string; sheetRowId?: string }[] = await ctx.runQuery(internal.deletes.listTombs, {});
    const t = tombs.find(x => x.storyId === storyId) ?? { storyId };
    let rows: Record<string, unknown>[];
    try {
      rows = await readTab(STORY_TAB);
    } catch (e) {
      await ctx.runMutation(internal.deletes.markTomb, { storyId, status: "pending", message: `Read failed: ${String(e).slice(0, 200)}` });
      return "failed";
    }
    const row = findTombRow(rows, t);
    if (!row) {
      await ctx.runMutation(internal.deletes.markTomb, { storyId, status: "done", message: "No Story Queue row" });
      return "deleted";
    }
    const rowId = String(row._rowId);
    try {
      await deleteRows(STORY_TAB, [rowId]);
      await ctx.runMutation(internal.deletes.markTomb, { storyId, status: "done", sheetRowId: rowId, message: "Row deleted" });
      return "deleted";
    } catch (e) {
      console.warn(`Row delete for ${storyId} not done`, String(e).slice(0, 300));
      try {
        await updateRows(STORY_TAB, [{ rowId, State: "Deleted" }]);
        await ctx.runMutation(internal.deletes.markTomb, {
          storyId,
          status: "marked",
          sheetRowId: rowId,
          message: `Row marked Deleted; delete held: ${String(e).slice(0, 200)}`,
        });
        return "marked";
      } catch (e2) {
        await ctx.runMutation(internal.deletes.markTomb, { storyId, status: "pending", sheetRowId: rowId, message: String(e2).slice(0, 200) });
        return "failed";
      }
    }
  },
});

/** Called on each sync/pull: retries row deletes that were held (at most every 15 minutes each). */
export const retryTombs = internalAction({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    const tombs: { storyId: string; status: string; lastTryAt?: number }[] = await ctx.runQuery(internal.deletes.listTombs, {});
    let n = 0;
    for (const t of tombs) {
      if (t.status === "done" || (t.lastTryAt && Date.now() - t.lastTryAt < RETRY_MS)) continue;
      const r: Outcome = await ctx.runAction(internal.deletes.purgeTomb, { storyId: t.storyId });
      if (r === "deleted") n++;
    }
    return n;
  },
});

/** The Delete button. Never blocks: the story is gone from the Desk whatever the sheet says. */
export const deleteStory = authenticatedAction({
  args: { storyId: v.string() },
  returns: v.object({ outcome: outcomeV, message: v.string() }),
  handler: async (ctx, { storyId }): Promise<{ outcome: Outcome; message: string }> => {
    await ctx.runMutation(internal.deletes.removeLocal, { storyId });
    const outcome: Outcome = await ctx.runAction(internal.deletes.purgeTomb, { storyId });
    const message =
      outcome === "deleted"
        ? "Deleted from the Desk and Smartsheet."
        : outcome === "skipped"
          ? "Removed from the Desk (test mode: sheet untouched)."
          : DELETE_FALLBACK_TOAST;
    return { outcome, message };
  },
});
