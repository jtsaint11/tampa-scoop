import { describe, expect, test } from "bun:test";
import { isAllowedDeskUser } from "../convex/lib/access";
import {
  CHECKLIST,
  checkDraft,
  countWords,
  eventWindow,
  findVerifyFlags,
  issueTypeForDate,
  nextIssueDate,
  parseIntakeBlock,
  PROMPT_SKELETON,
  validateIntake,
} from "../convex/lib/desk";
import { renderIssue, withUtm } from "../convex/lib/render";
import { ISSUE_COLUMNS, STORY_COLUMNS } from "../convex/lib/schema";
import { finishDraft } from "../convex/stories";

const tabs = JSON.parse(await Bun.file("/work/bots/tampa-newsletter/desk/tabs_schema.json").text());

describe("access", () => {
  test("only the exact editor email", () => {
    expect(isAllowedDeskUser("jtsaint11@gmail.com")).toBe(true);
    expect(isAllowedDeskUser("JTSaint11@Gmail.com ")).toBe(true);
    expect(isAllowedDeskUser("someone@gmail.com")).toBe(false);
    expect(isAllowedDeskUser("jtsaint11@gmail.com.evil.com")).toBe(false);
    expect(isAllowedDeskUser("")).toBe(false);
  });
});

describe("intake parsing", () => {
  test("one-line header + multi-line values", () => {
    const { fields, found } = parseIntakeBlock(`ISSUE DATE: 2026-10-20   |   TONE: Punchy
SECTION: Events
FACT BULLETS:
- Fake fest is Saturday
- 7 PM at Nowhere Park
SOURCE URLS:
https://example.com/a
https://example.com/b
READER ACTION: go
KNOWN GAPS: price
SPONSOR: no`);
    expect(fields.issueDate).toBe("2026-10-20");
    expect(fields.tone).toBe("Punchy");
    expect(fields.section).toBe("Events");
    expect(fields.factBullets).toBe("Fake fest is Saturday\n7 PM at Nowhere Park");
    expect(fields.sourceUrls).toBe("https://example.com/a\nhttps://example.com/b");
    expect(fields.readerAction).toBe("go");
    expect(fields.knownGaps).toBe("price");
    expect(fields.sponsor).toBe(false);
    expect(found).toContain("sponsor");
  });
  test("template placeholders are not guessed", () => {
    const { fields } = parseIntakeBlock(`ISSUE DATE: [date]   |   TONE: Deep / Punchy / Straight
SECTION: [Snapshot / Events / Food / Development / Sponsor]
FACT BULLETS: [one fact per line]`);
    expect(fields.issueDate).toBe("");
    expect(fields.tone).toBe("");
    expect(fields.section).toBe("");
    expect(fields.factBullets).toBe("");
  });
  test("sponsor yes with copy and url", () => {
    const { fields } = parseIntakeBlock("SPONSOR: yes; Fake Co helps you test things. Book now. https://example.com/offer");
    expect(fields.sponsor).toBe(true);
    expect(fields.sponsorUrl).toBe("https://example.com/offer");
    expect(fields.sponsorCopy).toBe("Fake Co helps you test things. Book now.");
  });
  test("validation", () => {
    const e = validateIntake({ issueDate: "", tone: "", section: "", factBullets: "", sourceUrls: "nope", readerAction: "", knownGaps: "", sponsor: false, sponsorName: "", sponsorCopy: "", sponsorUrl: "" });
    expect(Object.keys(e).sort()).toEqual(["factBullets", "issueDate", "section", "sourceUrls", "tone"]);
  });
});

describe("draft checks", () => {
  test("VERIFY flags and word count", () => {
    const t = "Doors at VERIFY: [time]. Tickets VERIFY: [price]. Bring a friend.";
    expect(findVerifyFlags(t)).toEqual(["time", "price"]);
    expect(countWords(t)).toBe(6);
  });
  test("status words are guarded", () => {
    const w = checkDraft({ draft: "The tower was approved.", facts: "The tower is proposed.", sourceUrls: ["https://a.example"], claims: [{ claim: "x", sourceUrl: "https://a.example" }], tone: "Straight", sponsor: false });
    expect(w.some(x => x.includes("“proposed”"))).toBe(true);
    expect(w.some(x => x.includes("“approved”"))).toBe(true);
  });
  test("invented numbers and unmapped claims are flagged", () => {
    const w = checkDraft({ draft: "Tickets are $25 at 8 PM.", facts: "Show at 7 PM.", sourceUrls: ["https://a.example"], claims: [{ claim: "x", sourceUrl: "https://b.example" }], tone: "Straight", sponsor: false });
    expect(w.some(x => x.includes("$25"))).toBe(true);
    expect(w.some(x => x.includes("isn't in the source list"))).toBe(true);
  });
  test("finishDraft keeps VERIFY visible and maps claims", () => {
    const d = finishDraft(
      { headline: "H", body: "Fest is Saturday. It matters because it's close.", why_it_matters: "It matters because it's close.", verify_fields: ["price"], claims: [{ claim: "Fest is Saturday", source_url: "https://a.example" }, { claim: "y", source_url: "https://evil.example" }] },
      ["https://a.example"],
    );
    expect(d.body).toContain("VERIFY: [price]");
    expect(d.claims[0].sourceUrl).toBe("https://a.example");
    expect(d.claims[1].sourceUrl.startsWith("UNMAPPED")).toBe(true);
    expect(d.notes).toEqual([]);
  });
  test("prompt skeleton is verbatim", () => {
    expect(PROMPT_SKELETON).toBe(
      "Write only from FACT BULLETS and SOURCE URLS. Use the selected tone. Preserve “proposed,” “approved,” and “open” exactly. If a required detail is missing, output VERIFY: [field]. Add a short why-it-matters sentence for a Tampa resident. Do not invent.",
    );
    expect(CHECKLIST.length).toBe(12);
  });
});

describe("dates", () => {
  test("rhythm", () => {
    expect(issueTypeForDate("2026-10-20")).toBe("Tue news");
    expect(issueTypeForDate("2026-10-22")).toBe("Thu weekend");
    expect(issueTypeForDate("2026-10-24")).toBe("Sat food");
    expect(nextIssueDate("2026-10-12")).toBe("2026-10-13");
    expect(eventWindow("2026-10-22", "Thu weekend").end).toBe("2026-10-25");
  });
});

describe("render", () => {
  const base = {
    issueId: "2026-10-20-tue",
    issueDate: "2026-10-20",
    issueType: "Tue news" as const,
    subject: "Tampa in 5: test",
    previewText: "preview",
    opening: "Opening line.",
    eventPicks: [],
    business: null,
  };
  test("module order, sponsor label, UTM, escaping", () => {
    const r = renderIssue({
      ...base,
      stories: [
        { storyId: "s3", section: "Sponsor", tone: "Punchy", sponsor: true, sponsorName: "Fake Co", sponsorUrl: "https://example.com/offer", headline: "", draft: "Buy <b>now</b>.", sourceUrls: [] },
        { storyId: "s2", section: "Development", tone: "Deep", sponsor: false, sponsorName: "", sponsorUrl: "", headline: "Dev", draft: "Proposed tower.", sourceUrls: ["https://src.example/d"] },
        { storyId: "s1", section: "Snapshot", tone: "Straight", sponsor: false, sponsorName: "", sponsorUrl: "", headline: "Straight one", draft: "Road closes VERIFY: [date].", sourceUrls: ["https://src.example/s"] },
        { storyId: "s0", section: "Snapshot", tone: "Deep", sponsor: false, sponsorName: "", sponsorUrl: "", headline: "Deep one", draft: "Deep copy.", sourceUrls: ["https://src.example/x"] },
      ],
    });
    expect(r.modules).toEqual(["Opening", "Tampa Snapshot", "Development watch", "Sponsor", "Close"]);
    expect(r.html.indexOf("Deep one")).toBeLessThan(r.html.indexOf("Straight one"));
    expect(r.html).toContain("Sponsored by Fake Co");
    expect(r.html).toContain("&lt;b&gt;now&lt;/b&gt;");
    expect(r.verifyFlags).toEqual([{ where: "Straight one", field: "date" }]);
    expect(r.links.every(l => l.url.includes("utm_source=tampascoop") && l.url.includes("utm_campaign=2026-10-20-tue"))).toBe(true);
    expect(r.text).toContain("Know an event, opening, or neighborhood change? Send it here.");
  });
  test("utm keeps existing tags", () => {
    expect(withUtm("https://x.example/?utm_source=a", "c", "d")).toBe("https://x.example/?utm_source=a");
  });
});

describe("tab schema", () => {
  test("app columns match tabs_batch.json", () => {
    expect([...STORY_COLUMNS]).toEqual(tabs.storyQueue);
    // The Issues sheet gained "Sections JSON" and "Subject Options" (section writer, added in Smartsheet).
    expect([...ISSUE_COLUMNS]).toEqual([...tabs.issues, "Sections JSON", "Subject Options"]);
  });
});
