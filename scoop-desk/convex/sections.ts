/**
 * Section-by-section issue writer (Scottsdale Scoop model): seven sections,
 * three tone drafts each, approvals, subject options and the beehiiv draft.
 * Everything is stored on the issue document and synced to the Issues sheet.
 */
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { authenticatedAction, authenticatedMutation, authenticatedQuery } from "./functions";
import { splitLines } from "./lib/desk";
import {
  BEEHIIV_PUB,
  beehiivPayload,
  checkRules,
  type IssueAssembly,
  SECTION_SPECS,
  type SectionTone,
} from "./lib/sections";
import { subjectOptionValidator } from "./schema";

declare const process: { env: Record<string, string | undefined> };

type Section = NonNullable<Doc<"issues">["sections"]>[number];
const toneV = v.union(v.literal("Deep"), v.literal("Punchy"), v.literal("Straight"));
const blank = { Deep: "", Punchy: "", Straight: "" };


function emptySection(key: string): Section {
  return { key, command: "", outline: "", notes: "", storyIds: [], drafts: blank, draftNotes: blank, approvedTone: "", approvedText: "", updatedAt: 0 };
}

export function fullSections(issue: Doc<"issues">): Section[] {
  return SECTION_SPECS.map(s => issue.sections?.find(x => x.key === s.key) ?? emptySection(s.key));
}

async function byIssueId(ctx: QueryCtx, issueId: string) {
  return await ctx.db
    .query("issues")
    .withIndex("by_issueId", q => q.eq("issueId", issueId))
    .unique();
}

async function saveSection(ctx: MutationCtx, issueId: string, key: string, patch: (s: Section) => Section, extra: Partial<Doc<"issues">> = {}) {
  const issue = await byIssueId(ctx, issueId);
  if (!issue) throw new Error("Issue not found");
  if (!SECTION_SPECS.some(s => s.key === key)) throw new Error("Unknown section");
  const sections = fullSections(issue).map(s => (s.key === key ? { ...patch(s), updatedAt: Date.now() } : s));
  await ctx.db.patch(issue._id, { sections, ...extra, updatedAt: Date.now(), syncState: "pending" });
  await ctx.scheduler.runAfter(0, internal.sync.syncIssue, { issueId, force: false });
}

export function assembly(issue: Doc<"issues">, stories: Doc<"stories">[]): IssueAssembly {
  const sponsor = stories.find(s => s.sponsor && issue.storyIds.includes(s.storyId)) ?? stories.find(s => s.sponsor);
  return {
    subject: issue.subject,
    previewText: issue.previewText,
    sponsorName: sponsor?.sponsorName ?? "",
    sections: fullSections(issue)
      .filter(s => s.approvedTone && s.approvedText.trim())
      .map(s => ({ key: s.key, text: s.approvedText })),
  };
}

// ---------------------------------------------------------------- reads

/** The writer board: sections (always all 7), stories to pick as context. */
export const board = authenticatedQuery({
  args: { issueId: v.string() },
  handler: async (ctx, { issueId }) => {
    const issue = await byIssueId(ctx, issueId);
    if (!issue) return null;
    const stories = (await ctx.db.query("stories").withIndex("by_updatedAt").order("desc").take(200)).filter(s => s.state !== "cut");
    return {
      issue,
      sections: fullSections(issue),
      stories: stories.map(s => ({
        storyId: s.storyId,
        issueDate: s.issueDate,
        section: s.section,
        tone: s.tone,
        headline: s.headline,
        firstFact: splitLines(s.factBullets)[0] ?? "",
        sponsor: s.sponsor,
        sponsorName: s.sponsorName,
        inIssue: issue.storyIds.includes(s.storyId),
      })),
      assembly: assembly(issue, stories),
    };
  },
});

export const contextInternal = internalQuery({
  args: { issueId: v.string() },
  handler: async (ctx, { issueId }) => {
    const issue = await byIssueId(ctx, issueId);
    if (!issue) return null;
    const stories = (await ctx.db.query("stories").withIndex("by_updatedAt").order("desc").take(300)).filter(s => s.state !== "cut");
    return { issue, stories };
  },
});

// ---------------------------------------------------------------- writes

export const patch = authenticatedMutation({
  args: {
    issueId: v.string(),
    key: v.string(),
    command: v.optional(v.string()),
    outline: v.optional(v.string()),
    notes: v.optional(v.string()),
    storyIds: v.optional(v.array(v.string())),
    approvedText: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { issueId, key, ...p }) => {
    const clean = Object.fromEntries(Object.entries(p).filter(([, x]) => x !== undefined)) as Partial<Section>;
    await saveSection(ctx, issueId, key, s => ({ ...s, ...clean }));
    return null;
  },
});

export const approve = authenticatedMutation({
  args: { issueId: v.string(), key: v.string(), tone: toneV },
  returns: v.null(),
  handler: async (ctx, { issueId, key, tone }) => {
    await saveSection(ctx, issueId, key, s => {
      if (!s.drafts[tone].trim()) throw new Error("That draft is empty");
      return { ...s, approvedTone: tone, approvedText: s.drafts[tone] };
    });
    return null;
  },
});

/** No AI in the Desk: paste finished copy (written elsewhere) and approve it in one step. */
export const pasteApproved = authenticatedMutation({
  args: { issueId: v.string(), key: v.string(), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { issueId, key, text }) => {
    const t = text.trim();
    if (!t) throw new Error("Paste some text first");
    await saveSection(ctx, issueId, key, s => ({
      ...s,
      drafts: { ...s.drafts, Straight: t },
      approvedTone: "Straight",
      approvedText: t,
    }));
    return null;
  },
});

export const unapprove = authenticatedMutation({
  args: { issueId: v.string(), key: v.string() },
  returns: v.null(),
  handler: async (ctx, { issueId, key }) => {
    await saveSection(ctx, issueId, key, s => ({ ...s, approvedTone: "", approvedText: "" }));
    return null;
  },
});

export const startOver = authenticatedMutation({
  args: { issueId: v.string(), key: v.string() },
  returns: v.null(),
  handler: async (ctx, { issueId, key }) => {
    await saveSection(ctx, issueId, key, () => emptySection(key));
    return null;
  },
});

export const reopen = authenticatedMutation({
  args: { issueId: v.string() },
  returns: v.null(),
  handler: async (ctx, { issueId }) => {
    const issue = await byIssueId(ctx, issueId);
    if (!issue) throw new Error("Issue not found");
    await ctx.db.patch(issue._id, { status: "Draft", updatedAt: Date.now(), syncState: "pending" });
    await ctx.scheduler.runAfter(0, internal.sync.syncIssue, { issueId, force: false });
    return null;
  },
});

export const saveDrafts = internalMutation({
  args: {
    issueId: v.string(),
    key: v.string(),
    drafts: v.object({ Deep: v.string(), Punchy: v.string(), Straight: v.string() }),
    draftNotes: v.object({ Deep: v.string(), Punchy: v.string(), Straight: v.string() }),
  },
  returns: v.null(),
  handler: async (ctx, { issueId, key, drafts, draftNotes }) => {
    await saveSection(ctx, issueId, key, s => ({ ...s, drafts, draftNotes }));
    return null;
  },
});

export const saveSubjectOptions = internalMutation({
  args: { issueId: v.string(), options: v.array(subjectOptionValidator) },
  returns: v.null(),
  handler: async (ctx, { issueId, options }) => {
    const issue = await byIssueId(ctx, issueId);
    if (!issue) return null;
    await ctx.db.patch(issue._id, { subjectOptions: options, updatedAt: Date.now(), syncState: "pending" });
    await ctx.scheduler.runAfter(0, internal.sync.syncIssue, { issueId, force: false });
    return null;
  },
});

export const markBeehiiv = internalMutation({
  args: { issueId: v.string(), postId: v.string() },
  returns: v.null(),
  handler: async (ctx, { issueId, postId }) => {
    const issue = await byIssueId(ctx, issueId);
    if (issue) await ctx.db.patch(issue._id, { beehiivPostId: postId, status: "Exported", updatedAt: Date.now(), syncState: "pending" });
    return null;
  },
});

// ---------------------------------------------------------------- beehiiv

/** Creates a DRAFT post in beehiiv (never sends or schedules). One attempt, no retries. */
export const sendToBeehiiv = authenticatedAction({
  args: { issueId: v.string() },
  returns: v.object({ ok: v.boolean(), message: v.string() }),
  handler: async (ctx, { issueId }) => {
    const data = await ctx.runQuery(internal.sections.contextInternal, { issueId });
    if (!data) return { ok: false, message: "Issue not found." };
    const a = assembly(data.issue, data.stories);
    if (!a.sections.length) return { ok: false, message: "Approve at least one section first." };
    if (!a.subject.trim()) return { ok: false, message: "Add a subject line first." };
    const payload = beehiivPayload(a);
    if (payload.status !== "draft") return { ok: false, message: "Refusing to send anything but a draft." };
    if (process.env.DESK_TEST_MODE === "1")
      return { ok: false, message: `Test mode: beehiiv draft not created (payload ready, ${payload.blocks.length} blocks).` };
    const apiKey = process.env.BEEHIIV_API_KEY;
    if (!apiKey) return { ok: false, message: "BEEHIIV_API_KEY is not set on the Convex deployment." };
    let status = 0;
    let text = "";
    try {
      const r = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB}/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      status = r.status;
      text = await r.text();
    } catch (e) {
      return { ok: false, message: `beehiiv unreachable: ${String(e).slice(0, 200)}` };
    }
    if (status === 401 || status === 403)
      return { ok: false, message: `beehiiv refused the key (${status}). Check BEEHIIV_API_KEY and that the plan allows the Posts API.` };
    if (status >= 300) return { ok: false, message: `beehiiv said ${status}: ${text.slice(0, 200)}` };
    try {
      const body = JSON.parse(text) as { data?: { id?: string } };
      const id = body?.data?.id ?? "";
      if (id) await ctx.runMutation(internal.sections.markBeehiiv, { issueId, postId: id });
    } catch {
      // Accepted but unparseable: still a draft.
    }
    return { ok: true, message: "Draft created in beehiiv. Open beehiiv to review, add photos and send it yourself." };
  },
});

/** Exposed so the e2e test can check the request without calling beehiiv. */
export const previewPayload = authenticatedQuery({
  args: { issueId: v.string() },
  handler: async (ctx, { issueId }) => {
    const issue = await byIssueId(ctx, issueId);
    if (!issue) return null;
    const stories = await ctx.db.query("stories").withIndex("by_updatedAt").order("desc").take(300);
    return beehiivPayload(assembly(issue, stories));
  },
});

export function rulesFor(text: string, key: string) {
  return checkRules(text, key);
}
export type { SectionTone };
