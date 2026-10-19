import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { beehiivPayload, checkRules, issueLayout, type LayoutInput, LINKS_HEADING, toBlocks, toHtml } from "../convex/lib/sections";

const ref = JSON.parse(readFileSync("/work/bots/tampa-newsletter/issues/2026-10-13/issue-01-blocks.json", "utf8"));
const input = JSON.parse(readFileSync(new URL("./fixtures/issue-01-layout-input.json", import.meta.url), "utf8")) as LayoutInput;

describe("issue layout", () => {
  test("issue #1's own copy rebuilds issue-01-blocks.json exactly", () => {
    expect(issueLayout(input)).toEqual(ref);
  });
  test("links block sits before the sign-off", () => {
    const b = issueLayout({ ...input, links: true });
    const i = b.findIndex(x => x.type === "heading" && x.level === "2" && x.formattedText[0].text === LINKS_HEADING);
    expect(i).toBeGreaterThan(0);
    expect(JSON.stringify(b.slice(i))).toContain("Local Business Directory");
    expect(b[b.length - 1].type).toBe("paragraph");
  });
  test("payload is a draft with blocks and the template, never body_content", () => {
    const p = beehiivPayload({ subject: "S", previewText: "P", sponsorName: "", sections: [{ key: "intro", text: "**Good morning, Tampa.** Hi." }, { key: "snapshot", text: "### A thing\nIt's here.\n[Read more →](https://x.com)" }] });
    expect(p.status).toBe("draft");
    expect(p.post_template_id).toBe("post_template_18dad33c-1ef9-4730-980a-eded3c7e114d");
    expect("body_content" in p).toBe(false);
    expect(JSON.stringify(p.blocks)).toContain("PHOTO HERE");
    expect(toHtml({ subject: "S", previewText: "", sponsorName: "", sections: [] })).toContain("Events Calendar");
    // every block type/key is one issue #1 uses
    const keys = (o: object) => Object.keys(o).sort().join(",");
    const refKeys = new Set(ref.map((x: object) => keys(x)));
    for (const b of toBlocks({ subject: "", previewText: "", sponsorName: "", sections: [{ key: "events", text: "**Mon**\n[[FREE PICK]] 🎃 [E](https://e.com) | V | 1 PM\n> note" }] })) expect(refKeys.has(keys(b))).toBe(true);
  });
  test("hard rules", () => {
    const r = checkRules("It is great — tacos, birria, and bowls. What is new?", "goodlife");
    expect(r.problems.join("|")).toContain("dash");
    expect(r.problems.join("|")).toContain("Oxford");
    expect(r.problems.join("|")).toContain("what is");
    expect(r.problems.join("|")).toContain("Too short");
  });
});
