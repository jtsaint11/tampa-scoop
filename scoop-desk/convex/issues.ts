import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalQuery, type QueryCtx } from "./_generated/server";
import { authenticatedAction, authenticatedMutation, authenticatedQuery } from "./functions";
import { CHECKLIST, type IssueType, issueId as makeIssueId, PROMPT_SKELETON, splitLines } from "./lib/desk";
import { type RenderInput, renderIssue } from "./lib/render";
import { businessPickValidator, eventPickValidator } from "./schema";
import { callTool } from "./sheetsGateway";

const issueTypeV = v.union(v.literal("Tue news"), v.literal("Thu weekend"), v.literal("Sat food"));

async function byIssueId(ctx: QueryCtx, issueId: string) {
  return await ctx.db
    .query("issues")
    .withIndex("by_issueId", q => q.eq("issueId", issueId))
    .unique();
}

async function storiesFor(ctx: QueryCtx, issueDate: string) {
  return (
    await ctx.db
      .query("stories")
      .withIndex("by_issueDate", q => q.eq("issueDate", issueDate))
      .take(100)
  ).filter(s => s.state !== "cut");
}

function sectionRank(s: Doc<"stories">) {
  const order = ["Snapshot", "Events", "Food", "Development", "Sponsor"];
  const tones = ["Deep", "Punchy", "Straight"];
  return order.indexOf(s.sponsor ? "Sponsor" : s.section) * 10 + Math.max(0, tones.indexOf(s.tone));
}

export function toRenderInput(issue: Doc<"issues">, stories: Doc<"stories">[]): RenderInput {
  const byId = new Map(stories.map(s => [s.storyId, s]));
  return {
    issueId: issue.issueId,
    issueDate: issue.issueDate,
    issueType: issue.issueType as IssueType,
    subject: issue.subject,
    previewText: issue.previewText,
    opening: issue.opening,
    stories: issue.storyIds
      .map(id => byId.get(id))
      .filter((s): s is Doc<"stories"> => !!s && s.state !== "cut" && !!s.draft.trim())
      .map(s => ({
        storyId: s.storyId,
        section: s.section,
        tone: s.tone,
        sponsor: s.sponsor,
        sponsorName: s.sponsorName,
        sponsorUrl: s.sponsorUrl,
        headline: s.sponsor ? "" : s.headline,
        draft: s.draft,
        sourceUrls: splitLines(s.sourceUrls),
      })),
    eventPicks: issue.eventPicks,
    business: issue.business,
  };
}

/** Everything that blocks export, in plain words. */
export function exportBlockers(issue: Doc<"issues">, stories: Doc<"stories">[]) {
  const r = renderIssue(toRenderInput(issue, stories));
  const reasons: string[] = [];
  const unticked = issue.checklist.filter(c => !c).length;
  if (unticked) reasons.push(`${unticked} checklist item${unticked > 1 ? "s" : ""} not ticked`);
  if (r.verifyFlags.length)
    reasons.push(`${r.verifyFlags.length} VERIFY flag${r.verifyFlags.length > 1 ? "s" : ""} left (${r.verifyFlags.map(f => `${f.where}: ${f.field}`).join("; ")})`);
  if (!issue.subject.trim()) reasons.push("No subject line");
  if (!issue.previewText.trim()) reasons.push("No preview text");
  const included = new Set(issue.storyIds);
  const notVerified = stories.filter(s => included.has(s.storyId) && s.state === "drafted");
  const undrafted = stories.filter(s => included.has(s.storyId) && !s.draft.trim());
  if (undrafted.length) reasons.push(`${undrafted.length} included stor${undrafted.length > 1 ? "ies have" : "y has"} no draft`);
  return { reasons, rendered: r, notVerified: notVerified.map(s => s.storyId) };
}

// ---------------------------------------------------------------- reads

export const list = authenticatedQuery({
  args: {},
  handler: async ctx => await ctx.db.query("issues").withIndex("by_issueDate").order("desc").take(40),
});

export const get = authenticatedQuery({
  args: { issueId: v.string() },
  handler: async (ctx, { issueId }) => {
    const issue = await byIssueId(ctx, issueId);
    if (!issue) return null;
    const candidates = await storiesFor(ctx, issue.issueDate);
    const ids = new Set(candidates.map(s => s.storyId));
    // Stories picked earlier that have since moved date are still shown.
    for (const id of issue.storyIds) {
      if (ids.has(id)) continue;
      const s = await ctx.db
        .query("stories")
        .withIndex("by_storyId", q => q.eq("storyId", id))
        .unique();
      if (s) candidates.push(s);
    }
    candidates.sort((a, b) => sectionRank(a) - sectionRank(b));
    const { reasons, rendered, notVerified } = exportBlockers(issue, candidates);
    return { issue, candidates, rendered, blockers: reasons, notVerified };
  },
});

export const getInternal = internalQuery({
  args: { issueId: v.string() },
  handler: async (ctx, { issueId }) => {
    const issue = await byIssueId(ctx, issueId);
    if (!issue) return null;
    const stories = await storiesFor(ctx, issue.issueDate);
    return { issue, stories };
  },
});

// ---------------------------------------------------------------- writes

export const ensure = authenticatedMutation({
  args: { issueDate: v.string(), issueType: issueTypeV },
  returns: v.string(),
  handler: async (ctx, { issueDate, issueType }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) throw new Error("Pick an issue date");
    const issueId = makeIssueId(issueDate, issueType);
    if (await byIssueId(ctx, issueId)) return issueId;
    const stories = (await storiesFor(ctx, issueDate)).sort((a, b) => sectionRank(a) - sectionRank(b));
    const now = Date.now();
    await ctx.db.insert("issues", {
      issueId,
      issueDate,
      issueType,
      subject: "",
      previewText: "",
      opening: "",
      storyIds: stories.map(s => s.storyId),
      eventPicks: [],
      business: null,
      checklist: CHECKLIST.map(() => false),
      status: "Draft",
      updatedAt: now,
      syncState: "pending",
    });
    await ctx.scheduler.runAfter(0, internal.sync.syncIssue, { issueId, force: false });
    return issueId;
  },
});

export const update = authenticatedMutation({
  args: {
    issueId: v.string(),
    subject: v.optional(v.string()),
    previewText: v.optional(v.string()),
    opening: v.optional(v.string()),
    storyIds: v.optional(v.array(v.string())),
    eventPicks: v.optional(v.array(eventPickValidator)),
    business: v.optional(v.union(v.null(), businessPickValidator)),
  },
  returns: v.null(),
  handler: async (ctx, { issueId, ...patch }) => {
    const issue = await byIssueId(ctx, issueId);
    if (!issue) throw new Error("Issue not found");
    if (patch.eventPicks && patch.eventPicks.length > 4) throw new Error("Four event picks at most");
    const clean = Object.fromEntries(Object.entries(patch).filter(([, val]) => val !== undefined));
    await ctx.db.patch(issue._id, {
      ...clean,
      // Any content change after approval/export needs a fresh look.
      status: issue.status === "Sent" ? "Sent" : "Draft",
      updatedAt: Date.now(),
      syncState: "pending",
    });
    await ctx.scheduler.runAfter(0, internal.sync.syncIssue, { issueId, force: false });
    return null;
  },
});

export const setCheck = authenticatedMutation({
  args: { issueId: v.string(), index: v.number(), value: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { issueId, index, value }) => {
    const issue = await byIssueId(ctx, issueId);
    if (!issue) throw new Error("Issue not found");
    if (index < 0 || index >= CHECKLIST.length) throw new Error("Bad checklist item");
    const checklist = CHECKLIST.map((_, i) => (i === index ? value : (issue.checklist[i] ?? false)));
    await ctx.db.patch(issue._id, { checklist, updatedAt: Date.now(), syncState: "pending" });
    await ctx.scheduler.runAfter(0, internal.sync.syncIssue, { issueId, force: false });
    return null;
  },
});

export const markSent = authenticatedMutation({
  args: { issueId: v.string() },
  returns: v.null(),
  handler: async (ctx, { issueId }) => {
    const issue = await byIssueId(ctx, issueId);
    if (!issue) throw new Error("Issue not found");
    if (issue.status !== "Exported") throw new Error("Export it first");
    await ctx.db.patch(issue._id, { status: "Sent", updatedAt: Date.now(), syncState: "pending" });
    await ctx.scheduler.runAfter(0, internal.sync.syncIssue, { issueId, force: false });
    return null;
  },
});

/** The gate: export only when all 12 checks are ticked and no VERIFY flag is left. */
export const exportIssue = authenticatedMutation({
  args: { issueId: v.string() },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      subject: v.string(),
      previewText: v.string(),
      html: v.string(),
      text: v.string(),
      links: v.array(v.object({ label: v.string(), url: v.string() })),
    }),
    v.object({ ok: v.literal(false), reasons: v.array(v.string()) }),
  ),
  handler: async (ctx, { issueId }) => {
    const issue = await byIssueId(ctx, issueId);
    if (!issue) throw new Error("Issue not found");
    const stories = await storiesFor(ctx, issue.issueDate);
    for (const id of issue.storyIds) {
      if (stories.some(s => s.storyId === id)) continue;
      const s = await ctx.db
        .query("stories")
        .withIndex("by_storyId", q => q.eq("storyId", id))
        .unique();
      if (s) stories.push(s);
    }
    const { reasons, rendered } = exportBlockers(issue, stories);
    if (reasons.length) return { ok: false as const, reasons };
    await ctx.db.patch(issue._id, {
      status: issue.status === "Sent" ? "Sent" : "Exported",
      exportedAt: Date.now(),
      exportedHtml: rendered.html,
      exportedText: rendered.text,
      updatedAt: Date.now(),
      syncState: "pending",
    });
    await ctx.scheduler.runAfter(0, internal.sync.syncIssue, { issueId, force: false });
    return {
      ok: true as const,
      subject: issue.subject,
      previewText: issue.previewText,
      html: rendered.html,
      text: rendered.text,
      links: rendered.links,
    };
  },
});

// ---------------------------------------------------------------- AI packaging

/** Suggests subject, preview text and opening from the issue's own drafts (nothing else). */
export const suggestPackaging = authenticatedAction({
  args: { issueId: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true), subject: v.string(), previewText: v.string(), opening: v.string() }),
    v.object({ ok: v.literal(false), message: v.string() }),
  ),
  handler: async (ctx, { issueId }) => {
    const data = await ctx.runQuery(internal.issues.getInternal, { issueId });
    if (!data) return { ok: false as const, message: "Issue not found." };
    const input = toRenderInput(data.issue, data.stories);
    const nonSponsor = input.stories.filter(s => !s.sponsor);
    if (!nonSponsor.length && !input.eventPicks.length)
      return { ok: false as const, message: "Add at least one drafted story or event pick first." };
    const material = [
      ...nonSponsor.map(s => `[${s.section}] ${s.headline}\n${s.draft}`),
      ...input.eventPicks.map(e => `[Event pick] ${e.name} - ${e.startDate} ${e.time} - ${e.venue}`),
    ].join("\n\n");
    try {
      const res = await callTool<{ result?: { subject: string; preview_text: string; opening: string } | null; error?: string | null }>(
        "ai_structured_output",
        {
          prompt: [
            PROMPT_SKELETON,
            "",
            `Package a ${input.issueType} issue of a Tampa local newsletter from the MATERIAL below (already-verified drafts). Use only facts in the material.`,
            "subject: 'Tampa in 5: [lead consequence] + [standout event]' pattern, under 60 characters if possible. It must match what's in the issue.",
            "preview_text: under 90 characters, complements (doesn't repeat) the subject.",
            "opening: one sentence that earns the scroll; no weather filler unless weather changes plans; no hype.",
            "Keep VERIFY markers if a fact you need is marked VERIFY in the material. Do not use the word 'best'.",
          ].join("\n"),
          input_text: material,
          output_schema: {
            type: "object",
            properties: { subject: { type: "string" }, preview_text: { type: "string" }, opening: { type: "string" } },
            required: ["subject", "preview_text", "opening"],
          },
          intelligence_level: "fast",
          model: "claude-sonnet-5",
        },
      );
      if (!res?.result) return { ok: false as const, message: "The AI writer returned nothing. Try again." };
      return {
        ok: true as const,
        subject: res.result.subject.trim(),
        previewText: res.result.preview_text.trim(),
        opening: res.result.opening.trim(),
      };
    } catch (e) {
      console.error("Packaging suggestion failed", e);
      return { ok: false as const, message: "The AI writer is unavailable right now. Try again in a minute." };
    }
  },
});


