/**
 * Scoop Desk: shared constants and pure helpers.
 * Imported by Convex functions AND the frontend, so keep it dependency-free.
 * Source: "Tampa Scoop Build Playbook", System 1 (Scoop Desk) pages 4-6.
 */

// ---------------------------------------------------------------- config

/** Live sibling sites. Change DIRECTORY_URL here when the directory goes to production. */
export const EVENTS_URL = "https://tampa-events-justin-s-team.viktor.space";
export const DIRECTORY_URL = "https://tampa-directory-justin-s-team.viktor.space";

/** UTM source/medium used on every exported link. */
export const UTM_SOURCE = "tampascoop";
export const UTM_MEDIUM = "email";

/** The only email allowed to use the Desk. */
export const ALLOWED_EMAILS = ["jtsaint11@gmail.com"] as const;

// ---------------------------------------------------------------- vocab

export const TONES = ["Deep", "Punchy", "Straight"] as const;
export type Tone = (typeof TONES)[number];

export const SECTIONS = ["Snapshot", "Events", "Food", "Development", "Sponsor"] as const;
export type Section = (typeof SECTIONS)[number];

export const READER_ACTIONS = ["go", "book", "avoid", "reply", "learn"] as const;

export const STATES = ["queued", "drafted", "verified", "cut"] as const;
export type StoryState = (typeof STATES)[number];

export const ISSUE_TYPES = ["Tue news", "Thu weekend", "Sat food"] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_STATUSES = ["Draft", "Approved", "Exported", "Sent"] as const;

/** Playbook tone controls. */
export const TONE_RULES: Record<Tone, { min: number; max: number; use: string; shape: string }> = {
  Deep: {
    min: 100,
    max: 140,
    use: "development, civic decisions, openings with neighborhood impact, or any story where why matters",
    shape: "what changed / why now / who is affected / what to watch",
  },
  Punchy: {
    min: 45,
    max: 70,
    use: "openings, weekend picks, deals, and quick service alerts",
    shape: "lead with the payoff; one vivid local detail; one action",
  },
  Straight: {
    min: 30,
    max: 55,
    use: "schedules, closures, deadlines, and factual notices",
    shape: "no color commentary. Date, place, consequence, link",
  },
};

/** Sponsor slot length from the playbook (40-90 words; copy is used verbatim). */
export const SPONSOR_RANGE = { min: 40, max: 90 };

/** Module templates, quoted from the playbook. */
export const MODULE_TEMPLATES: Record<Section, string> = {
  Snapshot:
    'Tampa Snapshot. Headline: [consequence first]. Copy: "[What changed] in [neighborhood]. It matters because [local consequence]. [Date/deadline/action]." Primary source preferred.',
  Events:
    "Events pick. [Event] - [day, time]. [One-line reason to care]. [Venue/neighborhood]. [Free or verified price].",
  Food:
    "Food & drink. Try this: [specific item] at [business]. [Why now]. [price if verified]. [reservation/walk-in note]. Separate firsthand reporting from sourced announcements.",
  Development:
    "Development watch. [Project] could change [place]. [Status today]. [What is approved vs proposed]. [Next public milestone]. Never turn a proposal into a promise.",
  Sponsor: "Sponsored by [business]. [Reader problem] + [specific offer] + [single call to action].",
};

/** The details each module needs; a missing one becomes VERIFY: [field]. */
export const REQUIRED_DETAILS: Record<Section, string[]> = {
  Snapshot: ["what changed", "neighborhood", "date or deadline"],
  Events: ["event name", "day", "time", "venue", "neighborhood", "price (free or verified)"],
  Food: ["specific item", "business", "price (only if verified)", "reservation/walk-in note"],
  Development: ["project", "place", "status today", "approved vs proposed", "next public milestone"],
  Sponsor: ["business", "offer", "call to action"],
};

export const STANDARD_CLOSE =
  "Know an event, opening, or neighborhood change? Send it here. Forward this to one Tampa friend who always asks what's happening.";

/** Three-issue weekly rhythm. */
export const ISSUE_RHYTHM: Record<IssueType, { weekday: number; job: string; build: string; cta: string }> = {
  "Tue news": { weekday: 2, job: "News + week setup", build: "Mon, 60 min", cta: "Calendar" },
  "Thu weekend": { weekday: 4, job: "Weekend planner", build: "Wed, 60 min", cta: "Share / RSVP" },
  "Sat food": { weekday: 6, job: "Food + next week", build: "Fri, 60 min", cta: "Directory" },
};

/** Approval checklist, word for word from the playbook. */
export const CHECKLIST = [
  "Every named fact has a source URL.",
  "Event date/time/timezone rechecked.",
  "Venue and neighborhood match.",
  "“Proposed,” “approved,” and “open” are not blurred.",
  "Prices say “from” unless exact.",
  "No claim was copied from another outlet without attribution.",
  "Sponsored placement is labeled.",
  "All links resolve to the intended page.",
  "Subject line matches the issue.",
  "Physical mailing address and unsubscribe are present.",
  "Phone test has no clipping.",
  "One person has explicit send authority.",
] as const;

/** The prompt skeleton, verbatim from the playbook. Do not edit. */
export const PROMPT_SKELETON =
  "Write only from FACT BULLETS and SOURCE URLS. Use the selected tone. Preserve “proposed,” “approved,” and “open” exactly. If a required detail is missing, output VERIFY: [field]. Add a short why-it-matters sentence for a Tampa resident. Do not invent.";

export const VOICE_GUIDE = [
  "Editorial promise: for busy Tampa locals, the useful things to know, do, eat, and watch, in five minutes, three mornings a week.",
  "Identity: an informed Tampa neighbor who did the homework.",
  "Texture: specific streets, neighborhoods, prices, times, and tradeoffs (only when they are in the facts).",
  "Sentence shape: short lead; one context sentence; one useful action.",
  "Humor: dry and occasional. Never joke about harm, emergencies, or public safety.",
  "Boundaries: no invented details, no disguised ads, no “best” without criteria.",
  "Local vocabulary: South Tampa, Westshore, Downtown, Tampa Heights, Seminole Heights, Ybor City. Use “Tampa Bay” only when the story truly crosses the region.",
].join("\n");

// ---------------------------------------------------------------- helpers

export type Claim = { claim: string; sourceUrl: string };

export function wordRange(tone: string, sponsor: boolean): { min: number; max: number } {
  if (sponsor) return SPONSOR_RANGE;
  return TONE_RULES[(TONES as readonly string[]).includes(tone) ? (tone as Tone) : "Punchy"];
}

/** All VERIFY flags in a text, e.g. "VERIFY: [price]" -> "price". */
export function findVerifyFlags(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/VERIFY:\s*(\[[^\]\n]*\]|[^.\n;,]*)/g)) {
    const field = m[1].replace(/^\[|\]$/g, "").trim();
    out.push(field || "detail");
  }
  return out;
}

/** Words in the copy, not counting VERIFY markers. */
export function countWords(text: string): number {
  const cleaned = text
    .replace(/VERIFY:\s*(\[[^\]\n]*\]|[^.\n;,]*)/g, " ")
    .replace(/https?:\/\/\S+/g, " link ");
  return cleaned.split(/\s+/).filter(w => /[A-Za-z0-9$]/.test(w)).length;
}

export function splitLines(s: string): string[] {
  return s
    .split(/\r?\n/)
    .map(l => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}

export function isHttpUrl(s: string): boolean {
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(s.trim());
}

export type IntakeFields = {
  issueDate: string;
  tone: string;
  section: string;
  factBullets: string;
  sourceUrls: string;
  readerAction: string;
  knownGaps: string;
  sponsor: boolean;
  sponsorName: string;
  sponsorCopy: string;
  sponsorUrl: string;
};

export const EMPTY_INTAKE: IntakeFields = {
  issueDate: "",
  tone: "",
  section: "",
  factBullets: "",
  sourceUrls: "",
  readerAction: "",
  knownGaps: "",
  sponsor: false,
  sponsorName: "",
  sponsorCopy: "",
  sponsorUrl: "",
};

function pick<T extends string>(list: readonly T[], raw: string): T | "" {
  const parts = raw
    .split(/[/|,]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  // Only accept a single, unambiguous choice (the template lists all options).
  const hits = list.filter(v => parts.includes(v.toLowerCase()));
  return hits.length === 1 ? hits[0] : "";
}

function toIsoDate(raw: string): string {
  const s = raw.trim().replace(/^\[|\]$/g, "");
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  const t = Date.parse(`${s} 12:00 UTC`);
  if (!Number.isNaN(t) && /\d/.test(s)) {
    const d = new Date(t);
    return d.toISOString().slice(0, 10);
  }
  return "";
}

const LABELS: Record<string, keyof IntakeFields | "_ignore"> = {
  "issue date": "issueDate",
  tone: "tone",
  section: "section",
  "fact bullets": "factBullets",
  "source urls": "sourceUrls",
  "source url": "sourceUrls",
  "reader action": "readerAction",
  "known gaps": "knownGaps",
  sponsor: "sponsorCopy",
};

/**
 * Parse the playbook's paste-ready intake block. Accepts both the one-line
 * header ("ISSUE DATE: x | TONE: y") and one label per line, with multi-line
 * values continuing until the next label. Unknown/placeholder values are left
 * blank rather than guessed.
 */
export function parseIntakeBlock(text: string): { fields: IntakeFields; found: string[] } {
  const fields: IntakeFields = { ...EMPTY_INTAKE };
  const found: string[] = [];
  const buckets: Record<string, string[]> = {};
  let current: string | null = null;
  const labelRe = /^\s*(ISSUE DATE|TONE|SECTION|FACT BULLETS|SOURCE URLS?|READER ACTION|KNOWN GAPS|SPONSOR)\s*:\s*/i;

  for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    // A line may hold several "LABEL: value" pairs separated by "|".
    const segments = labelRe.test(rawLine) ? rawLine.split(/\s+\|\s+(?=[A-Z ]+:)/) : [rawLine];
    for (const seg of segments) {
      const m = seg.match(labelRe);
      if (m) {
        current = LABELS[m[1].toLowerCase()] as string;
        buckets[current] = buckets[current] ?? [];
        const rest = seg.slice(m[0].length);
        if (rest.trim()) buckets[current].push(rest);
      } else if (current) {
        buckets[current].push(seg);
      }
    }
  }
  const val = (k: string) => (buckets[k] ?? []).join("\n").trim();
  const isPlaceholder = (s: string) => /^\[.*\]$/.test(s.trim());

  const date = val("issueDate");
  if (date && !isPlaceholder(date)) {
    fields.issueDate = toIsoDate(date);
    if (fields.issueDate) found.push("issue date");
  }
  const tone = pick(TONES, val("tone"));
  if (tone) {
    fields.tone = tone;
    found.push("tone");
  }
  const section = pick(SECTIONS, val("section").replace(/^\[|\]$/g, ""));
  if (section) {
    fields.section = section;
    found.push("section");
  }
  const facts = val("factBullets");
  if (facts && !isPlaceholder(facts)) {
    fields.factBullets = splitLines(facts).join("\n");
    found.push("fact bullets");
  }
  const urls = val("sourceUrls");
  if (urls && !isPlaceholder(urls)) {
    fields.sourceUrls = urls
      .split(/[\s,]+/)
      .map(s => s.trim())
      .filter(isHttpUrl)
      .join("\n");
    if (fields.sourceUrls) found.push("source URLs");
  }
  const action = pick(READER_ACTIONS, val("readerAction").replace(/^\[|\]$/g, ""));
  if (action) {
    fields.readerAction = action;
    found.push("reader action");
  }
  const gaps = val("knownGaps");
  if (gaps && !isPlaceholder(gaps)) {
    fields.knownGaps = gaps;
    found.push("known gaps");
  }
  const sp = val("sponsorCopy");
  if (sp && !isPlaceholder(sp)) {
    const yes = /^\s*yes\b/i.test(sp);
    const no = /^\s*no\b/i.test(sp);
    if (yes || no) found.push("sponsor");
    fields.sponsor = yes;
    if (yes) {
      let rest = sp.replace(/^\s*yes\s*[;,:\-–—]?\s*/i, "");
      const url = rest.match(/https?:\/\/\S+/)?.[0] ?? "";
      if (url) {
        fields.sponsorUrl = url.replace(/[).,;]+$/, "");
        rest = rest.replace(url, "").trim();
      }
      fields.sponsorCopy = rest.replace(/[\s;,+]+$/, "").trim();
    }
  }
  return { fields, found };
}

/** Field-level validation for a queue item. */
export function validateIntake(f: IntakeFields): Record<string, string> {
  const e: Record<string, string> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.issueDate)) e.issueDate = "Pick the issue date.";
  if (!f.sponsor && !(SECTIONS as readonly string[]).includes(f.section)) e.section = "Pick a section.";
  if (!f.sponsor && !(TONES as readonly string[]).includes(f.tone)) e.tone = "Pick a tone.";
  if (!f.sponsor && splitLines(f.factBullets).length === 0) e.factBullets = "Add at least one fact, one per line.";
  const urls = splitLines(f.sourceUrls);
  if (!f.sponsor && urls.length === 0) e.sourceUrls = "Add the primary source URL first.";
  else if (urls.some(u => !isHttpUrl(u))) e.sourceUrls = "One full https:// link per line.";
  if (f.readerAction && !(READER_ACTIONS as readonly string[]).includes(f.readerAction))
    e.readerAction = "Choose go / book / avoid / reply / learn.";
  if (f.sponsor) {
    if (!f.sponsorName.trim()) e.sponsorName = "Name the sponsoring business.";
    if (!f.sponsorCopy.trim()) e.sponsorCopy = "Paste the approved sponsor copy.";
    if (!isHttpUrl(f.sponsorUrl)) e.sponsorUrl = "Add the destination https:// link.";
  }
  return e;
}

// ---------------------------------------------------------------- guardrails

const STATUS_WORDS = ["proposed", "approved", "open"] as const;

function hasWord(text: string, w: string): boolean {
  return new RegExp(`\\b${w}\\b`, "i").test(text);
}

/**
 * Checks a draft against its facts. Returns human-readable warnings.
 * - status words (proposed/approved/open) kept and not introduced
 * - numbers, prices and times in the draft that are not in the facts
 * - claim URLs that are not among the given source URLs
 */
export function checkDraft(args: {
  draft: string;
  facts: string;
  sourceUrls: string[];
  claims: Claim[];
  tone: string;
  sponsor: boolean;
}): string[] {
  const warnings: string[] = [];
  const { draft, facts } = args;
  for (const w of STATUS_WORDS) {
    if (hasWord(facts, w) && !hasWord(draft, w)) warnings.push(`The facts say “${w}” but the draft dropped it.`);
    if (!hasWord(facts, w) && hasWord(draft, w))
      warnings.push(`The draft says “${w}” but the facts never do. Check it isn't blurring status.`);
  }
  const factTokens = new Set(
    (facts.match(/\$?\d[\d,.:]*\s*(?:am|pm|a\.m\.|p\.m\.)?/gi) ?? []).map(t => t.replace(/[\s,]/g, "").toLowerCase()),
  );
  const draftTokens = (draft.replace(/VERIFY:\s*(\[[^\]\n]*\]|[^.\n;,]*)/g, " ").match(/\$?\d[\d,.:]*\s*(?:am|pm|a\.m\.|p\.m\.)?/gi) ??
    []) as string[];
  const unknown = [
    ...new Set(
      draftTokens
        .map(t => t.replace(/[\s,]/g, "").replace(/\.$/, "").toLowerCase())
        .filter(t => ![...factTokens].some(f => f.replace(/\.$/, "") === t || f.includes(t))),
    ),
  ];
  if (unknown.length) warnings.push(`Numbers not found in the facts: ${unknown.join(", ")}.`);
  if (!args.sponsor) {
    const allowed = new Set(args.sourceUrls.map(u => u.trim()));
    const bad = args.claims.filter(c => !allowed.has(c.sourceUrl.trim()));
    if (bad.length) warnings.push(`${bad.length} claim(s) point to a link that isn't in the source list.`);
    if (args.claims.length === 0) warnings.push("No claims were mapped to sources.");
  }
  for (const w of ["free", "cheap", "affordable", "sold out"]) {
    if (hasWord(draft, w) && !hasWord(facts, w)) warnings.push(`Says “${w}” but the facts don't.`);
  }
  if (/\bbest\b/i.test(draft) && !/\bbest\b/i.test(facts)) warnings.push("Uses “best” without criteria from the facts.");
  const { min, max } = wordRange(args.tone, args.sponsor);
  const n = countWords(draft);
  if (n < min || n > max) warnings.push(`${n} words; the ${args.sponsor ? "sponsor slot" : args.tone} range is ${min}-${max}.`);
  return warnings;
}

// ---------------------------------------------------------------- dates

const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

export function prettyDate(iso: string, withWeekday = true): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [, m, d] = iso.split("-").map(Number);
  return `${withWeekday ? `${DAY[weekdayOf(iso)]}, ` : ""}${MON[m - 1]} ${d}`;
}

export function shortDay(iso: string): string {
  return DAY[weekdayOf(iso)].slice(0, 3);
}

/** Suggest the issue type for a date from the Tue/Thu/Sat rhythm. */
export function issueTypeForDate(iso: string): IssueType {
  const wd = weekdayOf(iso);
  if (wd === 4 || wd === 5) return "Thu weekend";
  if (wd === 6 || wd === 0) return "Sat food";
  return "Tue news";
}

/** Next Tue/Thu/Sat on or after today. */
export function nextIssueDate(todayIso: string): string {
  for (let i = 0; i < 7; i++) {
    const d = addDaysIso(todayIso, i);
    if ([2, 4, 6].includes(weekdayOf(d))) return d;
  }
  return todayIso;
}

/** Window of events an issue type should pick from: [start, end] inclusive. */
export function eventWindow(issueDate: string, type: IssueType): { start: string; end: string; label: string } {
  if (type === "Thu weekend") {
    const toFri = (5 - weekdayOf(issueDate) + 7) % 7;
    const fri = addDaysIso(issueDate, toFri);
    return { start: issueDate, end: addDaysIso(fri, 2), label: "through the weekend" };
  }
  return { start: issueDate, end: addDaysIso(issueDate, 7), label: "the next 7 days" };
}

export function issueId(issueDate: string, type: IssueType): string {
  return `${issueDate}-${type.split(" ")[0].toLowerCase()}`;
}
