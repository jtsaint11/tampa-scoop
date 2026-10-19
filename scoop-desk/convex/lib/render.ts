/**
 * Builds the finished issue (beehiiv-ready HTML + plain text) from its parts.
 * Pure and shared: the builder preview and the export use the same code.
 */
import {
  DIRECTORY_URL,
  EVENTS_URL,
  findVerifyFlags,
  ISSUE_RHYTHM,
  type IssueType,
  prettyDate,
  STANDARD_CLOSE,
  TONES,
  UTM_MEDIUM,
  UTM_SOURCE,
} from "./desk";

export type RenderStory = {
  storyId: string;
  section: string;
  tone: string;
  sponsor: boolean;
  sponsorName: string;
  sponsorUrl: string;
  headline: string;
  draft: string;
  sourceUrls: string[];
};

export type EventPick = {
  key: string;
  slot: string; // Free / Family / Date night / Wildcard
  name: string;
  startDate: string;
  time: string;
  venue: string;
  neighborhood: string;
  price: string;
  note: string; // one-line reason to care (editable)
  dateVerified: string;
};

export type BusinessPick = {
  slug: string;
  name: string;
  category: string;
  neighborhood: string;
  note: string; // why it solves a current need (editable)
};

export type RenderInput = {
  issueId: string;
  issueDate: string;
  issueType: IssueType;
  subject: string;
  previewText: string;
  opening: string;
  stories: RenderStory[];
  eventPicks: EventPick[];
  business: BusinessPick | null;
};

export type RenderedLink = { label: string; url: string };

export type Rendered = {
  html: string;
  text: string;
  links: RenderedLink[];
  verifyFlags: { where: string; field: string }[];
  modules: string[];
};

export function withUtm(url: string, campaign: string, content: string): string {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return url;
    if (!u.searchParams.has("utm_source")) {
      u.searchParams.set("utm_source", UTM_SOURCE);
      u.searchParams.set("utm_medium", UTM_MEDIUM);
      u.searchParams.set("utm_campaign", campaign);
      u.searchParams.set("utm_content", content);
    }
    return u.toString();
  } catch {
    return url;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Snapshot order: Deep, Punchy, Straight (playbook Tuesday outline). */
export function orderSnapshot<T extends { tone: string }>(items: T[]): T[] {
  const rank = (t: string) => {
    const i = (TONES as readonly string[]).indexOf(t);
    return i < 0 ? 9 : i;
  };
  return [...items].sort((a, b) => rank(a.tone) - rank(b.tone));
}

export function storyBuckets(stories: RenderStory[]) {
  const sponsor = stories.filter(s => s.sponsor || s.section === "Sponsor");
  const rest = stories.filter(s => !(s.sponsor || s.section === "Sponsor"));
  return {
    snapshot: orderSnapshot(rest.filter(s => s.section === "Snapshot")),
    events: rest.filter(s => s.section === "Events"),
    food: rest.filter(s => s.section === "Food"),
    development: rest.filter(s => s.section === "Development"),
    sponsor,
  };
}

export function renderIssue(input: RenderInput): Rendered {
  const campaign = input.issueId;
  const links: RenderedLink[] = [];
  const flags: { where: string; field: string }[] = [];
  const modules: string[] = [];
  const html: string[] = [];
  const text: string[] = [];
  const link = (label: string, url: string, content: string) => {
    const tagged = withUtm(url, campaign, content);
    links.push({ label, url: tagged });
    return tagged;
  };
  const flagCheck = (where: string, s: string) => {
    for (const f of findVerifyFlags(s)) flags.push({ where, field: f });
  };
  const p = (s: string) => `<p style="margin:0 0 14px;line-height:1.55">${s}</p>`;
  const h2 = (s: string) =>
    `<h2 style="margin:28px 0 10px;font-size:20px;line-height:1.25">${esc(s)}</h2>`;

  flagCheck("Subject", input.subject);
  flagCheck("Preview text", input.previewText);
  flagCheck("Opening", input.opening);

  const b = storyBuckets(input.stories);
  const rhythm = ISSUE_RHYTHM[input.issueType];

  // 1. Opening
  if (input.opening.trim()) {
    modules.push("Opening");
    html.push(p(esc(input.opening.trim())));
    text.push(input.opening.trim(), "");
  }

  const story = (s: RenderStory, content: string) => {
    flagCheck(s.headline || s.storyId, `${s.headline}\n${s.draft}`);
    const src = s.sourceUrls[0];
    const srcUrl = src ? link(`Source: ${host(src)}`, src, `${content}-source`) : "";
    html.push(
      p(
        `${s.headline ? `<strong>${esc(s.headline)}</strong><br>` : ""}${esc(s.draft.trim()).replace(/\n+/g, "<br>")}${
          srcUrl ? ` <a href="${esc(srcUrl)}">Source: ${esc(host(src))}</a>` : ""
        }`,
      ),
    );
    if (s.headline) text.push(s.headline.toUpperCase());
    text.push(s.draft.trim());
    if (srcUrl) text.push(`Source: ${srcUrl}`);
    text.push("");
  };

  // 2. Tampa Snapshot
  if (b.snapshot.length) {
    modules.push("Tampa Snapshot");
    html.push(h2("Tampa Snapshot"));
    text.push("TAMPA SNAPSHOT", "");
    for (const s of b.snapshot) story(s, "snapshot");
  }

  // 3. Event picks
  if (input.eventPicks.length || b.events.length) {
    modules.push("Event picks");
    html.push(h2("Event picks"));
    text.push("EVENT PICKS", "");
    for (const e of input.eventPicks) {
      const url = link(e.name, `${EVENTS_URL}/events/${encodeURIComponent(e.key)}`, "events");
      const when = [prettyDate(e.startDate), e.time].filter(Boolean).join(", ");
      const where = [e.venue, e.neighborhood].filter(Boolean).join(", ");
      flagCheck(e.name, e.note);
      html.push(
        p(
          `${e.slot ? `<em>${esc(e.slot)}:</em> ` : ""}<strong><a href="${esc(url)}">${esc(e.name)}</a></strong> - ${esc(when)}<br>${
            e.note ? `${esc(e.note)} ` : ""
          }${esc(where)}${where ? ". " : ""}${esc(e.price)}`,
        ),
      );
      text.push(
        `${e.slot ? `${e.slot}: ` : ""}${e.name} - ${when}`,
        [e.note, where && `${where}.`, e.price].filter(Boolean).join(" "),
        url,
        "",
      );
    }
    for (const s of b.events) story(s, "events");
    const cal = link("Full Tampa events calendar", EVENTS_URL, "events-calendar");
    html.push(p(`<a href="${esc(cal)}">See every verified Tampa event on the calendar →</a>`));
    text.push(`See every verified Tampa event on the calendar: ${cal}`, "");
  }

  // 4. Food & drink
  if (b.food.length) {
    modules.push("Food & drink");
    html.push(h2("Food & drink"));
    text.push("FOOD & DRINK", "");
    for (const s of b.food) story(s, "food");
  }

  // 5. One useful business
  if (input.business) {
    const biz = input.business;
    modules.push("One useful business");
    const url = link(biz.name, `${DIRECTORY_URL}/business/${encodeURIComponent(biz.slug)}`, "business");
    flagCheck(biz.name, biz.note);
    html.push(h2("One useful business"));
    html.push(
      p(
        `<strong><a href="${esc(url)}">${esc(biz.name)}</a></strong> · ${esc(
          [biz.category, biz.neighborhood].filter(Boolean).join(" · "),
        )}${biz.note ? `<br>${esc(biz.note)}` : ""}`,
      ),
    );
    text.push(
      "ONE USEFUL BUSINESS",
      "",
      `${biz.name} · ${[biz.category, biz.neighborhood].filter(Boolean).join(" · ")}`,
      ...(biz.note ? [biz.note] : []),
      url,
      "",
    );
  }

  // 6. Development watch
  if (b.development.length) {
    modules.push("Development watch");
    html.push(h2("Development watch"));
    text.push("DEVELOPMENT WATCH", "");
    for (const s of b.development) story(s, "development");
  }

  // 7. Sponsor (always visibly labelled)
  for (const s of b.sponsor) {
    modules.push("Sponsor");
    flagCheck(`Sponsor: ${s.sponsorName}`, s.draft);
    const url = s.sponsorUrl ? link(`Sponsor: ${s.sponsorName}`, s.sponsorUrl, "sponsor") : "";
    html.push(
      `<div style="margin:28px 0;padding:14px 16px;border:1px solid #d9cdb8;border-radius:8px"><p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Sponsored</p><p style="margin:0 0 8px"><strong>Sponsored by ${esc(
        s.sponsorName,
      )}</strong></p>${p(esc(s.draft.trim()))}${url ? p(`<a href="${esc(url)}">${esc(url.split("?")[0])}</a>`) : ""}</div>`,
    );
    text.push("SPONSORED", `Sponsored by ${s.sponsorName}`, s.draft.trim(), ...(url ? [url] : []), "");
  }

  // 8. Standard close
  modules.push("Close");
  const submit = link("Submit an event", `${EVENTS_URL}/submit-event`, "close-submit-event");
  const suggest = link("Suggest a business", `${DIRECTORY_URL}/list-your-business`, "close-suggest-business");
  const ctaUrl =
    rhythm.cta === "Directory"
      ? link("Tampa business directory", DIRECTORY_URL, "close-cta")
      : link("Tampa events calendar", EVENTS_URL, "close-cta");
  const ctaLine =
    rhythm.cta === "Calendar"
      ? "Plan the week on the Tampa events calendar"
      : rhythm.cta === "Directory"
        ? "Need a local pro? Browse the Tampa business directory"
        : "Going to something this weekend? Bring a friend: share this issue and check the calendar";
  const [closeA, closeB] = STANDARD_CLOSE.split(" Forward");
  html.push(`<hr style="margin:28px 0;border:none;border-top:1px solid #d9cdb8">`);
  html.push(p(`<a href="${esc(ctaUrl)}">${esc(ctaLine)} →</a>`));
  html.push(
    p(
      `${esc(closeA.replace("Send it here.", ""))}<a href="${esc(submit)}">Send it here.</a> Forward${esc(closeB)}`,
    ),
  );
  html.push(p(`<a href="${esc(submit)}">Submit an event</a> · <a href="${esc(suggest)}">Suggest a business</a>`));
  text.push(
    "---",
    `${ctaLine}: ${ctaUrl}`,
    "",
    STANDARD_CLOSE,
    `Submit an event: ${submit}`,
    `Suggest a business: ${suggest}`,
  );

  return {
    html: html.join("\n"),
    text: text.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    links,
    verifyFlags: flags,
    modules,
  };
}
