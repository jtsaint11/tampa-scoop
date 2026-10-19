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
import { PROMPT_SKELETON, splitLines } from "./lib/desk";
import {
  BEEHIIV_PUB,
  beehiivPayload,
  checkRules,
  type IssueAssembly,
  SECTION_SPECS,
  SECTION_TONES,
  type SectionTone,
  specFor,
} from "./lib/sections";
import { subjectOptionValidator } from "./schema";
import { callTool } from "./sheetsGateway";

declare const process: { env: Record<string, string | undefined> };

type Section = NonNullable<Doc<"issues">["sections"]>[number];
const toneV = v.union(v.literal("Deep"), v.literal("Punchy"), v.literal("Straight"));
const blank = { Deep: "", Punchy: "", Straight: "" };

export const BEEHIIV_NEEDS_AUTO = "beehiiv write needs to be set to auto in Viktor integration settings";

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

// ---------------------------------------------------------------- AI

const VOICE_MODEL = `VOICE MODEL (The Scottsdale Scoop, adapted for Tampa; issue #1 excerpts):
Good morning, Tampa. You're reading The Tampa Scoop, your shortcut to what's new, fun and worth knowing around town. Every issue: hand-picked events, new spots and the local news that actually changes your week.
This is issue #1, so thanks for being here from the very start. Today: the Rays try to even the ALCS, a buzzy taco spot opens downtown and Tampa Theatre turns 100.
Let's dive in.

### Rreal Tacos Opens Downtown Today
Atlanta-born Rreal Tacos opens to the public today in the former Haiku space downtown at 808 N. Franklin St. Expect street tacos on handmade tortillas, plus birria, quesadillas, bowls and a serious margarita program (any drink comes as a pitcher).
Two tacos with rice and beans run $10, and there's a full kids menu. Hours are 11 a.m. to midnight daily. [That's So Tampa suggests a reservation this week](https://thatssotampa.com/rreal-tacos-tampa-mexican-restaurant/).

Voice: first person, warm and casual, like a well-informed Tampa friend texting you. Specifics everywhere (street, neighborhood, price, hours) but ONLY when they are in the context. Short paragraphs. A short personal one-liner is fine ("Stoked for this one."), but never claim a visit, taste or experience that isn't in the context.`;

const HARD_RULES = `HARD RULES (every draft):
- No dashes of any kind: no em dash, no en dash, no spaced hyphen. Use commas, periods or parentheses instead. Hyphenated words are fine. Write ranges with 'to' (6 to 9 PM, Oct. 21 to 23), never 6–9.
- No Oxford comma: write "tacos, birria and bowls", never "tacos, birria, and bowls".
- Use contractions: it's, you're, don't, there's, that's, what's, we're, can't.
- Never invent a fact, number, name, price, time or address. If a needed detail is missing, write VERIFY: [field] in its place. Keep every VERIFY flag already in the context.
- Keep "proposed", "approved" and "open" exactly as the facts say them.
- Links as [phrase](url) using only URLs from the context. Item headlines as "### Headline". Only use the markup the section brief shows (### , ## , >> , > , [[BADGE]], **bold**). No photo or poll lines; the layout adds those.`;

const TONE_GUIDE = `TONES:
- Deep: fuller, more context and the why-it-matters, toward the top of the length target.
- Punchy: energetic, short sentences, a little playful, middle of the length target.
- Straight: plain and efficient, just the useful facts, toward the bottom of the length target.`;

function storyContext(s: Doc<"stories">): string {
  if (s.sponsor)
    return `[SPONSOR: ${s.sponsorName}] Approved copy (runs word for word):\n${s.sponsorCopy}\nLink: ${s.sponsorUrl}`;
  return [
    `[Story ${s.storyId} · ${s.section} · ${s.issueDate}]${s.headline ? ` ${s.headline}` : ""}`,
    `FACT BULLETS:\n${s.factBullets}`,
    `SOURCE URLS:\n${s.sourceUrls}`,
    s.knownGaps && s.knownGaps.toLowerCase() !== "none" ? `KNOWN GAPS (write VERIFY if needed): ${s.knownGaps}` : "",
    s.draft ? `EXISTING DRAFT (already written from these facts):\n${s.draft}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function defaultStories(key: string, issue: Doc<"issues">, all: Doc<"stories">[]) {
  const spec = specFor(key);
  const inIssue = all.filter(s => issue.storyIds.includes(s.storyId));
  if (key === "intro") return inIssue;
  if (key === "sponsor") return inIssue.filter(s => s.sponsor);
  return inIssue.filter(s => !s.sponsor && spec.storySections.includes(s.section));
}

const draftSchema = {
  type: "object",
  properties: {
    deep: { type: "string" },
    punchy: { type: "string" },
    straight: { type: "string" },
    deep_note: { type: "string", description: "One line: how this draft follows the rules." },
    punchy_note: { type: "string" },
    straight_note: { type: "string" },
  },
  required: ["deep", "punchy", "straight", "deep_note", "punchy_note", "straight_note"],
};

type DraftOut = { deep: string; punchy: string; straight: string; deep_note: string; punchy_note: string; straight_note: string };

export const write = authenticatedAction({
  args: { issueId: v.string(), key: v.string() },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), message: v.string() })),
  handler: async (ctx, { issueId, key }) => {
    const data = await ctx.runQuery(internal.sections.contextInternal, { issueId });
    if (!data) return { ok: false as const, message: "Issue not found." };
    const { issue, stories } = data;
    const spec = specFor(key);
    const sec = fullSections(issue).find(s => s.key === key) ?? emptySection(key);
    const picked = sec.storyIds.length
      ? stories.filter(s => sec.storyIds.includes(s.storyId))
      : defaultStories(key, issue, stories);

    // Sponsor copy runs word for word: no AI.
    const sponsorStory = picked.find(s => s.sponsor && s.sponsorCopy.trim());
    if (key === "sponsor" && sponsorStory) {
      const text = `${sponsorStory.sponsorCopy.trim()}${sponsorStory.sponsorUrl ? `\n\n[Learn more about ${sponsorStory.sponsorName}](${sponsorStory.sponsorUrl})` : ""}`;
      const note = "Sponsor's approved copy, word for word (never rewritten).";
      await ctx.runMutation(internal.sections.saveDrafts, {
        issueId,
        key,
        drafts: { Deep: text, Punchy: text, Straight: text },
        draftNotes: { Deep: note, Punchy: note, Straight: note },
      });
      return { ok: true as const };
    }

    const material: string[] = picked.map(storyContext);
    if (key === "events" && issue.eventPicks.length)
      material.push(
        `EVENT PICKS (from the verified Events calendar):\n${issue.eventPicks
          .map(e => `${e.startDate} | ${e.name} | ${e.venue} | ${e.time} | ${e.price}${e.note ? ` | ${e.note}` : ""}`)
          .join("\n")}`,
      );
    if (key === "business" && issue.business)
      material.push(`DIRECTORY BUSINESS: ${issue.business.name} (${issue.business.category}, ${issue.business.neighborhood}). ${issue.business.note}`);
    if (key === "intro") {
      const approved = fullSections(issue).filter(s => s.key !== "intro" && s.approvedText.trim());
      if (approved.length) material.push(`APPROVED SECTIONS SO FAR:\n${approved.map(s => `[${specFor(s.key).title}]\n${s.approvedText}`).join("\n\n")}`);
    }
    if (sec.notes.trim()) material.push(`EDITOR NOTES (checked facts):\n${sec.notes.trim()}`);
    if (!material.length)
      return {
        ok: false as const,
        message: "No context yet. Click Add context to pick Story Queue stories or paste notes, then try again.",
      };
    const previous = SECTION_TONES.map(t => (sec.drafts[t] ? `[${t}]\n${sec.drafts[t]}` : "")).filter(Boolean).join("\n\n");

    const prompt = [
      PROMPT_SKELETON,
      "",
      `You write the "${spec.title}" section of The Tampa Scoop, a local Tampa email newsletter (issue date ${issue.issueDate}, ${issue.issueType}).`,
      `SECTION BRIEF: ${spec.brief}`,
      `LENGTH TARGET: ${spec.min} to ${spec.max} characters of visible text per draft (link URLs don't count). Stay inside it.`,
      "",
      VOICE_MODEL,
      "",
      HARD_RULES,
      "",
      TONE_GUIDE,
      "",
      "Write three complete drafts of this section (deep, punchy, straight), each ready to paste. Use only the CONTEXT.",
      sec.command.trim() ? `EDITOR COMMAND (follow it): ${sec.command.trim()}` : "",
      sec.outline.trim() ? `OUTLINE (follow this beat structure):\n${sec.outline.trim()}` : "",
      previous ? `PREVIOUS DRAFTS (write fresh versions that improve on these):\n${previous}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await callTool<{ result?: DraftOut | null; error?: string | null }>("ai_structured_output", {
        prompt,
        input_text: `CONTEXT:\n\n${material.join("\n\n---\n\n")}`,
        output_schema: draftSchema,
        intelligence_level: "balanced",
      });
      const r = res?.result;
      if (!r) return { ok: false as const, message: "The AI writer returned nothing. Try again." };
      await ctx.runMutation(internal.sections.saveDrafts, {
        issueId,
        key,
        drafts: { Deep: r.deep.trim(), Punchy: r.punchy.trim(), Straight: r.straight.trim() },
        draftNotes: { Deep: r.deep_note.trim(), Punchy: r.punchy_note.trim(), Straight: r.straight_note.trim() },
      });
      return { ok: true as const };
    } catch (e) {
      console.error("Section write failed", e);
      return { ok: false as const, message: "The AI writer is unavailable right now. Try again in a minute." };
    }
  },
});

export const regenerateSubjects = authenticatedAction({
  args: { issueId: v.string() },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), message: v.string() })),
  handler: async (ctx, { issueId }) => {
    const data = await ctx.runQuery(internal.sections.contextInternal, { issueId });
    if (!data) return { ok: false as const, message: "Issue not found." };
    const approved = fullSections(data.issue).filter(s => s.approvedText.trim() && s.key !== "sponsor");
    if (!approved.length) return { ok: false as const, message: "Approve at least one section first." };
    try {
      const res = await callTool<{ result?: { options: { subject: string; preview: string; why: string }[] } | null }>(
        "ai_structured_output",
        {
          prompt: [
            "Write 5 subject line + preview text options for this issue of The Tampa Scoop, using ONLY the approved sections below.",
            "Scottsdale Scoop model: the subject is the headline of the single most exciting local item (a named new place or a big change to a familiar place), 3 to 8 words, conversational, no date, no issue number. The preview is a second hook, often starting 'Plus' or 'And', under 90 characters.",
            "No dashes, no Oxford comma, use contractions. Never invent anything. Don't use any item marked VERIFY.",
            "why: one short line on why this pairing should work.",
          ].join("\n"),
          input_text: approved.map(s => `[${specFor(s.key).title}]\n${s.approvedText}`).join("\n\n"),
          output_schema: {
            type: "object",
            properties: {
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: { subject: { type: "string" }, preview: { type: "string" }, why: { type: "string" } },
                  required: ["subject", "preview", "why"],
                },
              },
            },
            required: ["options"],
          },
          intelligence_level: "balanced",
        },
      );
      const opts = (res?.result?.options ?? []).slice(0, 5).map(o => ({ subject: o.subject.trim(), preview: o.preview.trim(), why: o.why.trim() }));
      if (!opts.length) return { ok: false as const, message: "The AI writer returned nothing. Try again." };
      await ctx.runMutation(internal.sections.saveSubjectOptions, { issueId, options: opts });
      return { ok: true as const };
    } catch (e) {
      console.error("Subject options failed", e);
      return { ok: false as const, message: "The AI writer is unavailable right now. Try again in a minute." };
    }
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
    let res: { content?: string; draft_id?: string | null; error?: string; response_role?: string };
    try {
      res = await callTool("mcp_pd_beehiiv_proxy_post", {
        url: `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB}/posts`,
        json_body: payload,
      });
    } catch (e) {
      const msg = String(e);
      console.warn("beehiiv call refused", msg.slice(0, 300));
      if (/approv|permi|not allowed|denied|forbidden|auto|quarantin|draft/i.test(msg)) return { ok: false, message: BEEHIIV_NEEDS_AUTO };
      return { ok: false, message: `beehiiv didn't take it: ${msg.slice(0, 200)}` };
    }
    if (res?.draft_id) return { ok: false, message: BEEHIIV_NEEDS_AUTO };
    if (res?.response_role === "tool_error" || (res?.error && !res.content)) {
      const msg = res.error ?? "error";
      if (/approv|permi|not allowed|denied/i.test(msg)) return { ok: false, message: BEEHIIV_NEEDS_AUTO };
      return { ok: false, message: `beehiiv didn't take it: ${msg.slice(0, 200)}` };
    }
    try {
      const outer = JSON.parse(res.content ?? "{}") as { status_code?: number; body?: unknown };
      const body = (typeof outer.body === "string" ? JSON.parse(outer.body) : outer.body) as { data?: { id?: string }; errors?: unknown };
      if (outer.status_code && outer.status_code >= 300)
        return { ok: false, message: `beehiiv said ${outer.status_code}: ${JSON.stringify(body).slice(0, 200)}` };
      const id = body?.data?.id ?? "";
      if (id) await ctx.runMutation(internal.sections.markBeehiiv, { issueId, postId: id });
      return { ok: true, message: "Draft created in beehiiv. Open beehiiv to review, add photos and send it yourself." };
    } catch {
      return { ok: true, message: "beehiiv accepted the draft. Open beehiiv to check it." };
    }
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
