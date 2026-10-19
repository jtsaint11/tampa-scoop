import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { authenticatedAction, authenticatedMutation, authenticatedQuery } from "./functions";
import {
  type Claim,
  checkDraft,
  countWords,
  findVerifyFlags,
  type IntakeFields,
  isHttpUrl,
  MODULE_TEMPLATES,
  PROMPT_SKELETON,
  REQUIRED_DETAILS,
  type Section,
  splitLines,
  TONE_RULES,
  type Tone,
  VOICE_GUIDE,
  validateIntake,
  wordRange,
} from "./lib/desk";
import { todayInTampa } from "./lib/tampa";
import { callTool, GatewayError } from "./sheetsGateway";

/** AI model used for drafts (tool gateway: ai_structured_output). */
export const DRAFT_MODEL = "claude-sonnet-5";

const intakeArgs = {
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
};

const stateV = v.union(v.literal("queued"), v.literal("drafted"), v.literal("verified"), v.literal("cut"));

function clean(f: IntakeFields): IntakeFields {
  return {
    issueDate: f.issueDate.trim(),
    tone: f.sponsor ? f.tone.trim() || "Punchy" : f.tone.trim(),
    section: f.sponsor ? "Sponsor" : f.section.trim(),
    factBullets: splitLines(f.factBullets).join("\n"),
    sourceUrls: splitLines(f.sourceUrls).join("\n"),
    readerAction: f.readerAction.trim().toLowerCase(),
    knownGaps: f.knownGaps.trim(),
    sponsor: f.sponsor,
    sponsorName: f.sponsor ? f.sponsorName.trim() : "",
    sponsorCopy: f.sponsor ? f.sponsorCopy.trim() : "",
    sponsorUrl: f.sponsor ? f.sponsorUrl.trim() : "",
  };
}

/** Sponsor copy is approved copy: it is used verbatim, never rewritten by AI. */
function sponsorDraft(f: IntakeFields) {
  return {
    headline: `Sponsored by ${f.sponsorName}`,
    draft: f.sponsorCopy,
    claims: [] as Claim[],
    warnings: checkDraft({
      draft: f.sponsorCopy,
      facts: f.sponsorCopy,
      sourceUrls: [],
      claims: [],
      tone: f.tone,
      sponsor: true,
    }),
  };
}

// ---------------------------------------------------------------- reads

export const list = authenticatedQuery({
  args: {},
  handler: async ctx => {
    return await ctx.db.query("stories").withIndex("by_updatedAt").order("desc").take(400);
  },
});

export const get = authenticatedQuery({
  args: { storyId: v.string() },
  handler: async (ctx, { storyId }) => {
    return await ctx.db
      .query("stories")
      .withIndex("by_storyId", q => q.eq("storyId", storyId))
      .unique();
  },
});

export const getInternal = internalQuery({
  args: { storyId: v.string() },
  handler: async (ctx, { storyId }) => {
    return await ctx.db
      .query("stories")
      .withIndex("by_storyId", q => q.eq("storyId", storyId))
      .unique();
  },
});

// ---------------------------------------------------------------- writes

export const create = authenticatedMutation({
  args: intakeArgs,
  returns: v.union(
    v.object({ ok: v.literal(true), storyId: v.string() }),
    v.object({ ok: v.literal(false), fieldErrors: v.record(v.string(), v.string()) }),
  ),
  handler: async (ctx, input) => {
    const f = clean(input);
    const fieldErrors = validateIntake(f);
    if (Object.keys(fieldErrors).length) return { ok: false as const, fieldErrors };
    const now = Date.now();
    const storyId = `ST-${todayInTampa().replace(/-/g, "")}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
    const sp = f.sponsor ? sponsorDraft(f) : null;
    await ctx.db.insert("stories", {
      storyId,
      ...f,
      state: sp ? "drafted" : "queued",
      headline: sp?.headline ?? "",
      draft: sp?.draft ?? "",
      claims: [],
      warnings: sp?.warnings ?? [],
      editorNotes: "",
      createdAt: now,
      updatedAt: now,
      draftCount: 0,
      syncState: "pending",
    });
    await ctx.scheduler.runAfter(0, internal.sync.syncStory, { storyId, force: false });
    return { ok: true as const, storyId };
  },
});

export const updateIntake = authenticatedMutation({
  args: { storyId: v.string(), ...intakeArgs },
  returns: v.union(
    v.object({ ok: v.literal(true), storyId: v.string() }),
    v.object({ ok: v.literal(false), fieldErrors: v.record(v.string(), v.string()) }),
  ),
  handler: async (ctx, { storyId, ...input }) => {
    const doc = await ctx.db
      .query("stories")
      .withIndex("by_storyId", q => q.eq("storyId", storyId))
      .unique();
    if (!doc) throw new Error("Story not found");
    const f = clean(input);
    const fieldErrors = validateIntake(f);
    if (Object.keys(fieldErrors).length) return { ok: false as const, fieldErrors };
    const sp = f.sponsor ? sponsorDraft(f) : null;
    await ctx.db.patch(doc._id, {
      ...f,
      ...(sp ? { headline: sp.headline, draft: sp.draft, warnings: sp.warnings, state: "drafted" as const } : {}),
      updatedAt: Date.now(),
      syncState: "pending",
    });
    await ctx.scheduler.runAfter(0, internal.sync.syncStory, { storyId, force: false });
    return { ok: true as const, storyId };
  },
});

export const saveDraft = authenticatedMutation({
  args: { storyId: v.string(), headline: v.string(), draft: v.string(), editorNotes: v.string() },
  returns: v.null(),
  handler: async (ctx, { storyId, headline, draft, editorNotes }) => {
    const doc = await ctx.db
      .query("stories")
      .withIndex("by_storyId", q => q.eq("storyId", storyId))
      .unique();
    if (!doc) throw new Error("Story not found");
    const warnings = checkDraft({
      draft,
      facts: doc.sponsor ? doc.sponsorCopy : doc.factBullets,
      sourceUrls: splitLines(doc.sourceUrls),
      claims: doc.claims,
      tone: doc.tone,
      sponsor: doc.sponsor,
    });
    await ctx.db.patch(doc._id, {
      headline: headline.trim(),
      draft: draft.trim(),
      editorNotes: editorNotes.trim(),
      warnings,
      editedByHand: true,
      // Editing a verified story sends it back to "drafted" for another check.
      state: doc.state === "verified" || (doc.state === "queued" && draft.trim()) ? "drafted" : doc.state,
      updatedAt: Date.now(),
      syncState: "pending",
    });
    await ctx.scheduler.runAfter(0, internal.sync.syncStory, { storyId, force: false });
    return null;
  },
});

export const setState = authenticatedMutation({
  args: { storyId: v.string(), state: stateV },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), message: v.string() })),
  handler: async (ctx, { storyId, state }) => {
    const doc = await ctx.db
      .query("stories")
      .withIndex("by_storyId", q => q.eq("storyId", storyId))
      .unique();
    if (!doc) throw new Error("Story not found");
    if (state === "verified") {
      if (!doc.draft.trim()) return { ok: false as const, message: "Draft it first." };
      const flags = findVerifyFlags(`${doc.headline}\n${doc.draft}`);
      if (flags.length)
        return {
          ok: false as const,
          message: `Resolve ${flags.length} VERIFY flag${flags.length > 1 ? "s" : ""} first (${flags.join(", ")}).`,
        };
    }
    if (state === "drafted" && !doc.draft.trim()) return { ok: false as const, message: "There's no draft yet." };
    await ctx.db.patch(doc._id, { state, updatedAt: Date.now(), syncState: "pending" });
    await ctx.scheduler.runAfter(0, internal.sync.syncStory, { storyId, force: false });
    return { ok: true as const };
  },
});

export const applyAiDraft = internalMutation({
  args: {
    storyId: v.string(),
    headline: v.string(),
    draft: v.string(),
    claims: v.array(v.object({ claim: v.string(), sourceUrl: v.string() })),
    warnings: v.array(v.string()),
    model: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, a) => {
    const doc = await ctx.db
      .query("stories")
      .withIndex("by_storyId", q => q.eq("storyId", a.storyId))
      .unique();
    if (!doc) throw new Error("Story not found");
    await ctx.db.patch(doc._id, {
      headline: a.headline,
      draft: a.draft,
      claims: a.claims,
      warnings: a.warnings,
      state: doc.state === "cut" ? "cut" : "drafted",
      draftCount: doc.draftCount + 1,
      lastDraftAt: Date.now(),
      lastDraftModel: a.model,
      editedByHand: false,
      updatedAt: Date.now(),
      syncState: "pending",
    });
    await ctx.scheduler.runAfter(0, internal.sync.syncStory, { storyId: a.storyId, force: false });
    return null;
  },
});

// ---------------------------------------------------------------- AI draft

type AiDraft = {
  headline: string;
  body: string;
  why_it_matters: string;
  verify_fields: string[];
  claims: { claim: string; source_url: string }[];
};

/** Builds the drafting prompt: the playbook skeleton first, verbatim, then the controls. */
export function buildDraftPrompt(s: Pick<Doc<"stories">, "tone" | "section" | "readerAction" | "knownGaps">) {
  const tone = (TONE_RULES[s.tone as Tone] ? s.tone : "Punchy") as Tone;
  const rule = TONE_RULES[tone];
  const section = (MODULE_TEMPLATES[s.section as Section] ? s.section : "Snapshot") as Section;
  return [
    PROMPT_SKELETON,
    "",
    `SELECTED TONE: ${tone.toUpperCase()} - ${rule.min} to ${rule.max} words. Use for ${rule.use}. Structure: ${rule.shape}.`,
    `MODULE: ${MODULE_TEMPLATES[section]}`,
    `REQUIRED DETAILS FOR THIS MODULE: ${REQUIRED_DETAILS[section].join("; ")}.`,
    s.readerAction ? `READER ACTION: ${s.readerAction} (end with one useful action of this kind).` : "",
    s.knownGaps ? `KNOWN GAPS (do not fill these in; any that the module needs must appear as VERIFY: [field]): ${s.knownGaps}` : "",
    "",
    "VOICE GUIDE:",
    VOICE_GUIDE,
    "",
    "RULES FOR THIS OUTPUT:",
    "- Every sentence must be supported by a fact bullet. No adjectives that imply facts not given (no 'legendary', 'beloved', 'one-day-only').",
    "- Keep the words proposed, approved and open exactly as written in the facts. Never upgrade or downgrade a status (proposed is not approved; approved is not open; under construction is not open).",
    "- If a required detail is not in the facts, write the literal marker VERIFY: [field] in the sentence where it belongs, e.g. 'Doors at VERIFY: [time].' Never guess it.",
    "- Prices say 'from' unless the facts give an exact price. Never call something free, cheap or affordable unless the facts say so.",
    "- Include exactly one short why-it-matters sentence for a Tampa resident inside the body, built only from the facts. Return that same sentence, copied exactly from the body, in why_it_matters.",
    `- The body must be ${rule.min}-${rule.max} words (VERIFY markers not counted). Do not include URLs in the body.`,
    "- headline: consequence first, under 12 words, no clickbait.",
    "- claims: list each factual claim in the body with the single source URL (copied exactly from SOURCE URLS) that supports it; use the primary (first) URL when a bullet does not say otherwise.",
    "- verify_fields: the field names you marked VERIFY (empty list if none).",
  ]
    .filter(l => l !== "")
    .join("\n");
}

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    body: { type: "string" },
    why_it_matters: { type: "string" },
    verify_fields: { type: "array", items: { type: "string" } },
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: { claim: { type: "string" }, source_url: { type: "string" } },
        required: ["claim", "source_url"],
      },
    },
  },
  required: ["headline", "body", "why_it_matters", "verify_fields", "claims"],
};

/** Post-process the model output: keep VERIFY markers visible, map claims to given URLs only. */
export function finishDraft(ai: AiDraft, sourceUrls: string[]) {
  let body = String(ai.body ?? "").trim();
  const why = String(ai.why_it_matters ?? "").trim();
  const notes: string[] = [];
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  // The why-it-matters sentence must be in the copy; never bolt on text the editor can't see in context.
  if (!why || !norm(body).includes(norm(why).slice(0, 40))) notes.push("Check the why-it-matters sentence: the writer didn't clearly include one.");
  const inBody = new Set(findVerifyFlags(body).map(f => f.toLowerCase()));
  const missing = (ai.verify_fields ?? [])
    .map(f => String(f).replace(/^\[|\]$/g, "").trim())
    .filter(f => f && !inBody.has(f.toLowerCase()));
  if (missing.length) body = `${body} ${missing.map(f => `VERIFY: [${f}]`).join(" ")}`;
  const allowed = sourceUrls.map(u => u.trim());
  const claims: Claim[] = (ai.claims ?? [])
    .map(c => ({ claim: String(c.claim ?? "").trim(), sourceUrl: String(c.source_url ?? "").trim() }))
    .filter(c => c.claim)
    .map(c => ({ ...c, sourceUrl: allowed.includes(c.sourceUrl) ? c.sourceUrl : `UNMAPPED: ${c.sourceUrl || "none"}` }));
  return { headline: String(ai.headline ?? "").trim(), body, claims, why, notes };
}

export const draftStory = authenticatedAction({
  args: { storyId: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true), wordCount: v.number(), verifyFlags: v.array(v.string()) }),
    v.object({ ok: v.literal(false), message: v.string() }),
  ),
  handler: async (ctx, { storyId }) => {
    const s = await ctx.runQuery(internal.stories.getInternal, { storyId });
    if (!s) return { ok: false as const, message: "Story not found." };
    if (s.sponsor) return { ok: false as const, message: "Sponsor copy is approved copy; it is used word for word." };
    const urls = splitLines(s.sourceUrls).filter(isHttpUrl);
    const facts = splitLines(s.factBullets);
    if (!facts.length || !urls.length) return { ok: false as const, message: "Add fact bullets and a source URL first." };

    const prompt = buildDraftPrompt(s);
    const input = [
      `ISSUE DATE: ${s.issueDate}`,
      `SECTION: ${s.section}`,
      "FACT BULLETS:",
      ...facts.map(f => `- ${f}`),
      "SOURCE URLS (primary first):",
      ...urls,
    ].join("\n");

    let result: { result?: AiDraft | null; error?: string | null };
    try {
      result = await callTool("ai_structured_output", {
        prompt,
        input_text: input,
        output_schema: DRAFT_SCHEMA,
        intelligence_level: "fast",
        model: DRAFT_MODEL,
      });
    } catch (e) {
      console.error("AI draft failed", e);
      return {
        ok: false as const,
        message:
          e instanceof GatewayError ? `The AI writer is unavailable right now (${e.code}). Try again in a minute.` : "Drafting failed.",
      };
    }
    if (!result?.result || result.error) {
      return { ok: false as const, message: `The AI writer returned no draft${result?.error ? `: ${result.error}` : ""}.` };
    }
    const done = finishDraft(result.result, urls);
    const warnings = [
      ...done.notes,
      ...checkDraft({
        draft: done.body,
        facts: facts.join("\n"),
        sourceUrls: urls,
        claims: done.claims,
        tone: s.tone,
        sponsor: false,
      }),
    ];
    await ctx.runMutation(internal.stories.applyAiDraft, {
      storyId,
      headline: done.headline,
      draft: done.body,
      claims: done.claims,
      warnings,
      model: DRAFT_MODEL,
    });
    const { min, max } = wordRange(s.tone, false);
    console.log(`Draft ${storyId}: ${countWords(done.body)} words (range ${min}-${max})`);
    return {
      ok: true as const,
      wordCount: countWords(done.body),
      verifyFlags: findVerifyFlags(`${done.headline}\n${done.body}`),
    };
  },
});
