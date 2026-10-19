/**
 * Section-by-section writing (Scottsdale Scoop model). Pure and shared by the
 * Convex backend and the browser: specs, hard-rule checks, and the converters
 * that turn approved section copy into plain text, HTML and beehiiv blocks.
 *
 * Section copy format (what the AI writes and the editor edits):
 *   - "## HEADING" a sub-heading (teal, like QUICK HITS); ">> meta" grey bold line (address, Status:);
 *     "> note" grey line; "[[FREE PICK]]" badge; "!photo: hint" / "!poll: hint" slots
 *   - blank line between paragraphs
 *   - "### Headline" for an item headline inside a section
 *   - "- " for list lines (Weekly Events List)
 *   - **bold** and [linked phrase](https://url)
 */

export const SECTION_TONES = ["Deep", "Punchy", "Straight"] as const;
export type SectionTone = (typeof SECTION_TONES)[number];

export type SectionKey = "intro" | "snapshot" | "sponsor" | "business" | "datespot" | "events" | "goodlife";

export type SectionSpec = {
  key: SectionKey;
  title: string;
  emoji: string;
  min: number;
  max: number;
  /** What the section is for, fed to the writer. */
  brief: string;
  /** Story Queue sections that feed this section by default. */
  storySections: string[];
};

export const SECTION_SPECS: SectionSpec[] = [
  {
    key: "intro",
    title: "Intro",
    emoji: "👋",
    min: 400,
    max: 900,
    brief:
      "Opening. Start with the fixed welcome: 'Good morning, Tampa. You're reading The Tampa Scoop, your shortcut to what's new, fun and worth knowing around town. Every issue: hand-picked events, new spots and the local news that actually changes your week.' Then one or two short personal lines that preview what's in this issue (only things in the context), then 'Let's dive in.' No weather filler. No headlines.",
    storySections: [],
  },
  {
    key: "snapshot",
    title: "Tampa Snapshot",
    emoji: "🌴",
    min: 700,
    max: 1800,
    brief:
      "Two to four local news items, each with a '### Headline' line, then 2 or 3 short paragraphs: the fact (who, what, where, when, address), the useful detail (hours, price, what's on), then a short personal one-liner. End each item with its own source link line '[Read more at <the source's name, only if the context names it, else just Read more> →](url)'. Optional: a '## QUICK HITS' sub-heading followed by '- **Label:** one or two sentences [Source](url)' lines for small items.",
    storySections: ["Snapshot", "Development"],
  },
  {
    key: "sponsor",
    title: "Together With [Sponsor]",
    emoji: "🤝",
    min: 250,
    max: 700,
    brief:
      "Native sponsor block. If the context includes approved sponsor copy, it runs word for word and nothing else is written. Otherwise output exactly 'VERIFY: [sponsor copy]'.",
    storySections: ["Sponsor"],
  },
  {
    key: "business",
    title: "Local Business of the Week",
    emoji: "🏪",
    min: 350,
    max: 800,
    brief:
      "One non-sponsored local business: '### Business name', then a '>> street address or neighborhood' line, then about 100 words on what it is, where, what to order or try, and a final link line '[Visit Business →](url)'. End with: 'Nothing in this section is sponsored.'",
    storySections: ["Food"],
  },
  {
    key: "datespot",
    title: "Date Spot of the Week",
    emoji: "🍷",
    min: 350,
    max: 800,
    brief:
      "One date-night venue: '### Venue name', then a '>> address or neighborhood' line, then what makes it a date spot, specific dishes, drinks, prices and hours from the facts, and a final link line '[Hours and details →](url)'. Never claim a visit that isn't in the facts.",
    storySections: ["Food"],
  },
  {
    key: "events",
    title: "Weekly Events List",
    emoji: "📅",
    min: 300,
    max: 1600,
    brief:
      "First line: '>> Picked from our Tampa events calendar.' Then events grouped by day: a '**Wednesday, Oct. 14**' line per day, then one line per event: 'emoji [Event name](url) | Venue | Time | Price'. A standout free, family or date-night event may start with '[[FREE PICK]] ', '[[FAMILY PICK]] ' or '[[DATE NIGHT PICK]] ' and be followed by a '> one-line reason to care' line. Last line: 'For the full list, check out our [Tampa events calendar](https://tampa-events-justin-s-team.viktor.space).'",
    storySections: ["Events"],
  },
  {
    key: "goodlife",
    title: "The Good Life",
    emoji: "🏡",
    min: 150,
    max: 500,
    brief:
      "The most expensive home sold in Tampa this week: address, price, one standout feature and a one-line reaction, plus a final link line '[See the listing →](url)'. Use '### Address' as the headline. Only from the context. If there is no home sale in the context, output 'VERIFY: [top home sale this week]'.",
    storySections: [],
  },
];

export const SECTION_KEYS = SECTION_SPECS.map(s => s.key);

export function specFor(key: string): SectionSpec {
  return SECTION_SPECS.find(s => s.key === key) ?? SECTION_SPECS[0];
}

/** The heading a section gets in the finished issue ("" for the intro). */
export function sectionHeading(key: string, sponsorName = ""): string {
  if (key === "intro") return "";
  if (key === "sponsor") return `TOGETHER WITH ${(sponsorName || "[SPONSOR]").toUpperCase()}`;
  return specFor(key).title.toUpperCase();
}

// ---------------------------------------------------------------- hard rules

/** Character count of what the reader sees (link URLs and markup not counted). */
export function visibleText(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/^!(photo|poll):.*$/gm, "")
    .replace(/\[\[([^\]]+)\]\]\s*/g, "")
    .replace(/^#{2,3}\s+/gm, "")
    .replace(/^>>?\s+/gm, "")
    .replace(/^-\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function charCount(md: string): number {
  return visibleText(md).length;
}

const SPELLED_OUT: [RegExp, string][] = [
  [/\bdo not\b/i, "do not"],
  [/\bdoes not\b/i, "does not"],
  [/\bdid not\b/i, "did not"],
  [/\bis not\b/i, "is not"],
  [/\bare not\b/i, "are not"],
  [/\bwas not\b/i, "was not"],
  [/\bwere not\b/i, "were not"],
  [/\bcannot\b|\bcan not\b/i, "cannot"],
  [/\bwill not\b/i, "will not"],
  [/\bwould not\b/i, "would not"],
  [/\bshould not\b/i, "should not"],
  [/\bcould not\b/i, "could not"],
  [/\bhave not\b/i, "have not"],
  [/\bhas not\b/i, "has not"],
  [/\bit is\b/i, "it is"],
  [/\bthat is\b/i, "that is"],
  [/\bwhat is\b/i, "what is"],
  [/\bthere is\b/i, "there is"],
  [/\bhere is\b/i, "here is"],
  [/\byou are\b/i, "you are"],
  [/\bwe are\b/i, "we are"],
  [/\bthey are\b/i, "they are"],
  [/\bI am\b/, "I am"],
  [/\bI have\b/, "I have"],
  [/\bI will\b/, "I will"],
  [/\byou will\b/i, "you will"],
  [/\bwe will\b/i, "we will"],
  [/\blet us\b/i, "let us"],
];

export type RuleCheck = { ok: boolean; problems: string[]; chars: number };

export function checkRules(md: string, key: string): RuleCheck {
  const spec = specFor(key);
  const problems: string[] = [];
  const text = visibleText(md);
  // Dashes: em/en dashes, or a hyphen used as a dash (spaced). Hyphenated words are fine.
  if (/[\u2014\u2013]/.test(text) || /\s-\s/.test(text) || /\s--?\s/.test(text)) problems.push("Uses a dash");
  // Oxford comma: "a, b, and c" inside one sentence.
  const ox = text.match(/[^,.;:!?\n]+,[^,.;:!?\n]+,\s+(and|or)\s/i);
  if (ox) problems.push(`Oxford comma: "${ox[0].trim().slice(-50)}"`);
  const spelled = SPELLED_OUT.filter(([re]) => re.test(text)).map(([, w]) => w);
  if (spelled.length) problems.push(`Spelled out instead of contracted: ${spelled.join(", ")}`);
  const chars = text.length;
  if (chars < spec.min) problems.push(`Too short: ${chars} chars (target ${spec.min} to ${spec.max})`);
  if (chars > spec.max) problems.push(`Too long: ${chars} chars (target ${spec.min} to ${spec.max})`);
  return { ok: problems.length === 0, problems, chars };
}

// ---------------------------------------------------------------- issue layout
// Reproduces issue #1's beehiiv block structure and styling exactly. Only the
// section copy changes from issue to issue.

export const HEADING_COLOR = "#0b6e99";
export const GRAY = "#52606d";
export const SLOT_HL = "#fff3bf";
export const EVENTS_CAL_URL = "https://tampa-events-justin-s-team.viktor.space";
export const DIRECTORY_LINK_URL = "https://tampa-directory-justin-s-team.viktor.space";

export type Run = {
  text: string;
  styling?: string[];
  link?: { href: string; target: "_blank" };
  text_color?: string;
  highlight_color?: string;
};
export type Block =
  | { type: "paragraph"; formattedText: Run[] }
  | { type: "heading"; level: "2"; formattedText: Run[] }
  | { type: "heading"; level: "3"; text: string }
  | { type: "list"; listType: "unordered"; items: { formattedText: Run[] }[] }
  | { type: "content_break" };

/** Inline markup (**bold**, [text](url), [[BADGE]]) to beehiiv formattedText runs. */
export function toRuns(line: string): Run[] {
  const runs: Run[] = [];
  const re = /\*\*([^*]+)\*\*|\[\[([^\]]+)\]\]\s?|\[([^\]]+)\]\((https?:[^)\s]+)\)/g;
  let last = 0;
  for (const m of line.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) runs.push({ text: line.slice(last, i) });
    if (m[1] !== undefined) runs.push({ text: m[1], styling: ["bold"] });
    else if (m[2] !== undefined) {
      runs.push({ text: m[2], styling: ["bold"], text_color: "#ffffff", highlight_color: HEADING_COLOR });
      runs.push({ text: " " });
    } else runs.push({ text: m[3], link: { href: m[4], target: "_blank" } });
    last = i + m[0].length;
  }
  if (last < line.length) runs.push({ text: line.slice(last) });
  return runs.filter(r => r.text.length > 0).flatMap(markVerify);
}

/** VERIFY flags get issue #1's yellow highlight so they can't be missed in beehiiv. */
function markVerify(r: Run): Run[] {
  if (r.link || !/VERIFY:/.test(r.text)) return [r];
  const out: Run[] = [];
  let last = 0;
  for (const m of r.text.matchAll(/VERIFY:\s*(\[[^\]\n]*\]|[^|.\n,;]*[^|.\n,;\s])/g)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ ...r, text: r.text.slice(last, i) });
    out.push({ text: m[0], styling: ["bold"], highlight_color: SLOT_HL });
    last = i + m[0].length;
  }
  if (last < r.text.length) out.push({ ...r, text: r.text.slice(last) });
  return out;
}

const restyle = (runs: Run[], add: Partial<Run>, bold: boolean) =>
  runs.map(r => {
    const out: Run = { ...r, text_color: r.text_color ?? add.text_color };
    if (bold) out.styling = [...new Set([...(r.styling ?? []), "bold"])];
    return out;
  });

export function slot(kind: "photo" | "poll", hint: string): Block {
  const label = kind === "photo" ? "📷 PHOTO HERE " : "📊 POLL HERE ";
  const pick = kind === "photo" ? "Image" : "Poll";
  return {
    type: "paragraph",
    formattedText: [
      { text: label, styling: ["bold"], highlight_color: SLOT_HL },
      { text: `— ${hint} Click here, type / and pick ${pick}, then delete this line.`, text_color: GRAY, styling: ["italic"] },
    ],
  };
}

const h2 = (text: string): Block => ({
  type: "heading",
  level: "2",
  formattedText: [{ text: text.toUpperCase(), text_color: HEADING_COLOR, styling: ["bold"] }],
});

/** One section's copy to blocks. `photos` adds a photo slot under each item headline (and its meta line). */
export function sectionBlocks(md: string, photos: boolean): Block[] {
  const lines = md.replace(/\r\n?/g, "\n").split("\n").map(l => l.trim()).filter(Boolean);
  const out: Block[] = [];
  let pendingPhoto: string | null = null;
  const flushPhoto = () => {
    if (pendingPhoto !== null) out.push(slot("photo", pendingPhoto));
    pendingPhoto = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      flushPhoto();
      const text = visibleText(line.slice(4));
      out.push({ type: "heading", level: "3", text });
      const explicit = lines[i + 1]?.startsWith("!photo:") || (lines[i + 1]?.startsWith(">> ") && lines[i + 2]?.startsWith("!photo:"));
      if (photos && !explicit) pendingPhoto = `${text} photo (use your own or a licensed one, with credit).`;
      continue;
    }
    if (line.startsWith(">> ")) {
      out.push({ type: "paragraph", formattedText: restyle(toRuns(line.slice(3)), { text_color: GRAY }, true) });
      flushPhoto();
      continue;
    }
    flushPhoto();
    if (line.startsWith("!photo:")) out.push(slot("photo", line.slice(7).trim()));
    else if (line.startsWith("!poll:")) out.push(slot("poll", line.slice(6).trim()));
    else if (line.startsWith("## ")) out.push(h2(visibleText(line.slice(3))));
    else if (line.startsWith("> ")) out.push({ type: "paragraph", formattedText: restyle(toRuns(line.slice(2)), { text_color: GRAY }, false) });
    else if (/^[-*]\s+/.test(line)) {
      const item = { formattedText: toRuns(line.replace(/^[-*]\s+/, "")) };
      const prev = out[out.length - 1];
      if (prev && prev.type === "list") prev.items.push(item);
      else out.push({ type: "list", listType: "unordered", items: [item] });
    } else out.push({ type: "paragraph", formattedText: toRuns(line) });
  }
  flushPhoto();
  return out;
}

export type LayoutSection = { heading: string; md: string; photos?: boolean };
export type LayoutInput = {
  sections: LayoutSection[];
  /** The fixed links block (Events Calendar + Local Business Directory). */
  links: boolean;
  closeLines: string[];
  disclosure: string;
};

export const LINKS_HEADING = "RESOURCE LIST";
export const LINKS_MD = `📅 [Events Calendar](${EVENTS_CAL_URL})\n🏪 [Local Business Directory](${DIRECTORY_LINK_URL})`;

/** The reusable issue layout: issue #1's structure, colours and formatting. */
export function issueLayout(input: LayoutInput): Block[] {
  const blocks: Block[] = [];
  const secs = input.sections.filter(s => s.md.trim());
  if (input.links) secs.push({ heading: LINKS_HEADING, md: LINKS_MD });
  secs.forEach((s, idx) => {
    if (idx > 0) blocks.push({ type: "content_break" });
    if (s.heading) blocks.push(h2(s.heading));
    blocks.push(...sectionBlocks(s.md, !!s.photos));
  });
  blocks.push({ type: "content_break" });
  for (const l of input.closeLines) blocks.push(...sectionBlocks(l, false));
  blocks.push({ type: "paragraph", formattedText: [{ text: input.disclosure, styling: ["italic", "bold"], text_color: GRAY }] });
  return blocks;
}

// ---------------------------------------------------------------- assembly

export type ApprovedSection = { key: string; text: string };
export type IssueAssembly = { subject: string; previewText: string; sponsorName: string; sections: ApprovedSection[] };

const PHOTO_SECTIONS = new Set(["snapshot", "sponsor", "business", "datespot", "goodlife"]);

export const FEEDBACK_MD =
  '!poll: Question: "Did you like this week\'s issue?" Options: Loved it / It was OK / Not for me.';

/** The 7-section Tampa Scoop issue in issue #1's layout. */
export function layoutFor(a: IssueAssembly): LayoutInput {
  const sections: LayoutSection[] = SECTION_KEYS.map(k => a.sections.find(s => s.key === k))
    .filter((s): s is ApprovedSection => !!s && !!s.text.trim())
    .map(s => ({ heading: sectionHeading(s.key, a.sponsorName), md: s.text, photos: PHOTO_SECTIONS.has(s.key) }));
  sections.push({ heading: "SHARE FEEDBACK", md: FEEDBACK_MD });
  const sponsored = a.sections.some(s => s.key === "sponsor" && s.text.trim());
  return {
    sections,
    links: true,
    closeLines: [
      "That's the Scoop for today. Thanks for reading.",
      "Know an event, opening or neighborhood change? Hit reply and tell us.",
      "Forward this to one Tampa friend who always asks what's happening.",
    ],
    disclosure: sponsored ? "The Together With section is sponsored. Nothing else in this issue is." : "Nothing in this issue is sponsored.",
  };
}

export function toBlocks(a: IssueAssembly): Block[] {
  return issueLayout(layoutFor(a));
}

/** The create-post request body. Always a draft, always blocks (never body_content). */
export const BEEHIIV_PUB = "pub_70361159-9f75-498c-a7a5-88cf427f2cf0";
export const BEEHIIV_TEMPLATE = "post_template_18dad33c-1ef9-4730-980a-eded3c7e114d";

export function beehiivPayload(a: IssueAssembly) {
  return {
    title: a.subject.trim() || "Untitled issue",
    subtitle: a.previewText.trim(),
    status: "draft" as const,
    post_template_id: BEEHIIV_TEMPLATE,
    blocks: toBlocks(a),
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function runsHtml(runs: Run[]): string {
  return runs
    .map(r => {
      let t = esc(r.text);
      const st: string[] = [];
      if (r.text_color) st.push(`color:${r.text_color}`);
      if (r.highlight_color) st.push(`background:${r.highlight_color};padding:1px 4px;border-radius:3px`);
      if (st.length) t = `<span style="${st.join(";")}">${t}</span>`;
      if (r.styling?.includes("italic")) t = `<em>${t}</em>`;
      if (r.styling?.includes("bold")) t = `<strong>${t}</strong>`;
      if (r.link) t = `<a href="${esc(r.link.href)}" target="_blank" style="color:${HEADING_COLOR}">${t}</a>`;
      return t;
    })
    .join("");
}

/** Paste-ready HTML rendered from the same blocks beehiiv gets. */
export function blocksToHtml(blocks: Block[]): string {
  const body = blocks
    .map(b => {
      if (b.type === "content_break") return '<hr style="border:none;border-top:1px solid #e4e7eb;margin:28px 0">';
      if (b.type === "heading" && b.level === "2") return `<h2 style="margin:0 0 12px;font-size:22px;letter-spacing:.5px">${runsHtml(b.formattedText)}</h2>`;
      if (b.type === "heading") return `<h3 style="margin:22px 0 8px;font-size:19px;color:#1f2933">${esc(b.text)}</h3>`;
      if (b.type === "list") return `<ul style="padding-left:20px;margin:0 0 14px">${b.items.map(i => `<li style="margin:6px 0;line-height:1.6">${runsHtml(i.formattedText)}</li>`).join("")}</ul>`;
      return `<p style="margin:0 0 14px;line-height:1.6">${runsHtml(b.formattedText)}</p>`;
    })
    .join("\n");
  return `<div style="font-family:Georgia,'Times New Roman',serif;color:#1f2933;font-size:17px;max-width:640px">\n${body}\n</div>`;
}

export function blocksToPlain(blocks: Block[]): string {
  const rt = (runs: Run[]) => runs.map(r => (r.link ? `${r.text} (${r.link.href})` : r.text)).join("");
  return blocks
    .map(b => {
      if (b.type === "content_break") return "";
      if (b.type === "heading" && b.level === "2") return `${rt(b.formattedText)}\n`;
      if (b.type === "heading") return b.text;
      if (b.type === "list") return b.items.map(i => `• ${rt(i.formattedText)}`).join("\n");
      return rt(b.formattedText);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function toHtml(a: IssueAssembly): string {
  return blocksToHtml(toBlocks(a));
}

export function toPlain(a: IssueAssembly): string {
  return `Subject: ${a.subject}\nPreview: ${a.previewText}\n\n${blocksToPlain(toBlocks(a))}`;
}
