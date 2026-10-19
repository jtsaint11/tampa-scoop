/**
 * E2E: queue -> paste intake -> AI draft (FAKE facts) -> VERIFY flag -> verify -> issue builder -> checklist -> export.
 * Runs with DESK_TEST_MODE=1 on the dev backend, so nothing is ever written to the Google Sheet.
 * All facts are clearly fictional ("TEST ONLY"); `bunx convex run sync:deleteTestData` removes them afterwards.
 */
import type { Page } from "playwright";
import { runTest } from "./auth";

const SHOTS = "/work/bots/tampa-newsletter/desk";
const DATE = "2026-12-29"; // a Tuesday, far from real issues

async function shot(page: Page, name: string) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/${name}`, fullPage: !name.includes("mobile") ? false : true });
  console.log(`   📸 ${name}`);
}

async function addStory(page: Page, block: string) {
  await page.goto(`${process.env.APP_URL}/queue`, { waitUntil: "networkidle" });
  await page.getByTestId("paste-box").fill(block);
  await page.getByRole("button", { name: "Fill the form from this block" }).click();
  await page.waitForTimeout(300);
  await page.getByTestId("story-submit").click();
  await page.waitForURL(/\/story\//, { timeout: 15000 });
  return page.url().split("/story/")[1];
}

async function draft(page: Page) {
  const t0 = Date.now();
  await page.getByTestId("draft-button").click();
  await page.waitForFunction(
    () => {
      const b = document.querySelector('[data-testid="draft-button"]');
      const t = document.querySelector('[data-testid="draft-input"]') as HTMLTextAreaElement | null;
      return !!b && !b.textContent?.includes("Drafting") && !!t && t.value.trim().length > 0;
    },
    null,
    { timeout: 120000 },
  );
  console.log(`   AI draft took ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await page.waitForTimeout(800);
}

runTest("Scoop Desk flow", async helper => {
  const { page } = helper;
  await page.setViewportSize({ width: 1440, height: 1200 });

  // 1. Story 1: Punchy event with a known price gap -> must come back with a VERIFY flag.
  console.log("📍 Paste intake + AI draft (Punchy, Events, price gap)");
  const id1 = await addStory(
    page,
    `ISSUE DATE: ${DATE}   |   TONE: Punchy
SECTION: Events
FACT BULLETS:
TEST ONLY - fictional: Zorblax Pickle Parade is Saturday, Jan 2, 7 PM at Fakeville Park in Seminole Heights.
TEST ONLY - fictional: There is a live polka band and a pickle-tasting table.
TEST ONLY - fictional: The organizer says it is family friendly.
SOURCE URLS:
https://example.com/test-only-pickle-parade
READER ACTION: go
KNOWN GAPS: price
SPONSOR: no`,
  );
  const bodyText = await page.locator("body").innerText();
  if (!bodyText.includes("Seminole Heights")) throw new Error("Pasted facts not saved");
  await draft(page);
  const flags = await page.getByTestId("verify-flag").count();
  const draftText = await page.getByTestId("draft-input").inputValue();
  const meter = await page.getByTestId("word-meter").innerText();
  console.log(`   draft: ${draftText}`);
  console.log(`   meter: ${meter.replace(/\n/g, " ")} · VERIFY flags: ${flags}`);
  if (!draftText.trim()) throw new Error("No draft text");
  if (flags < 1 || !/VERIFY:\s*\[?price/i.test(draftText)) throw new Error("Expected a VERIFY: [price] flag for the known price gap");
  if (await page.getByTestId("mark-verified").isEnabled()) throw new Error("Mark verified must be disabled while VERIFY flags remain");
  await page.getByTestId("claims").waitFor();
  await shot(page, "02-draft-verify-flag.png");

  // Resolve the flag by hand: cut the price detail (as the editor would), then verify.
  const fixed = draftText.replace(/[^.]*VERIFY:\s*(\[[^\]]*\]|[^.\n;,]*)[^.]*\.?/g, "").replace(/\s{2,}/g, " ").trim();
  await page.getByTestId("draft-input").fill(fixed);
  await page.getByTestId("save-draft").click();
  await page.waitForTimeout(1200);
  await page.getByTestId("mark-verified").click();
  await page.waitForTimeout(1200);
  if (!(await page.locator("body").innerText()).includes("verified")) throw new Error("Story not marked verified");

  // 2. Story 2: Deep development item (proposed vs approved).
  console.log("📍 Deep development draft");
  await addStory(
    page,
    `ISSUE DATE: ${DATE}   |   TONE: Deep
SECTION: Development
FACT BULLETS:
TEST ONLY - fictional: The Zorblax Tower is a proposed 30-story residential tower at 999 Imaginary St in Tampa Heights.
TEST ONLY - fictional: The city zoning board approved the site rezoning on Oct 1.
TEST ONLY - fictional: The tower itself is still proposed; no building permits have been filed.
TEST ONLY - fictional: The plan includes 400 apartments and ground-floor retail.
TEST ONLY - fictional: Neighbors raised parking concerns at the Oct 1 meeting.
SOURCE URLS:
https://example.com/test-only-zorblax-tower
https://example.org/test-only-zoning-minutes
READER ACTION: learn
KNOWN GAPS: next hearing date
SPONSOR: no`,
  );
  await draft(page);
  const deep = await page.getByTestId("draft-input").inputValue();
  console.log(`   deep draft: ${deep}`);
  if (!/proposed/i.test(deep)) throw new Error("Deep draft dropped 'proposed'");

  // 3. Story 3: Straight snapshot, no gaps.
  console.log("📍 Straight snapshot draft");
  await addStory(
    page,
    `ISSUE DATE: ${DATE}   |   TONE: Straight
SECTION: Snapshot
FACT BULLETS:
TEST ONLY - fictional: Imaginary Ave between 1st and 3rd St in Ybor City closes Dec 28-30 for water main work.
TEST ONLY - fictional: The detour runs via Pretend Blvd.
SOURCE URLS:
https://example.com/test-only-imaginary-ave
READER ACTION: avoid
SPONSOR: no`,
  );
  await draft(page);

  // 4. Sponsor (approved copy, verbatim).
  console.log("📍 Sponsor item");
  await page.goto(`${process.env.APP_URL}/queue`, { waitUntil: "networkidle" });
  await page.locator("#issueDate").fill(DATE);
  await page.getByText("Sponsored placement").click();
  await page.locator("#sponsorName").fill("TEST ONLY Fake Pool Co");
  await page
    .locator("#sponsorCopy")
    .fill(
      "TEST ONLY fictional sponsor copy. Pool turning green after the storms? Fake Pool Co will test your water chemistry and give you a written fix-it plan on the first visit. Mention The Tampa Scoop when you book and the first test is on us. Book a visit at the link below this week.",
    );
  await page.locator("#sponsorUrl").fill("https://example.com/test-only-sponsor");
  await page.getByTestId("story-submit").click();
  await page.waitForURL(/\/story\//);

  // 5. Queue screenshot.
  await page.goto(`${process.env.APP_URL}/queue`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const items = await page.getByTestId("queue-item").count();
  if (items < 4) throw new Error(`Expected 4 queue items, got ${items}`);
  const banner = await page.getByTestId("sync-banner").innerText().catch(() => "");
  console.log(`   sync banner: ${banner.replace(/\n/g, " ")}`);
  if (!/Saving paused/i.test(banner)) throw new Error("Expected the 'Saving paused' banner (sheet writes are off)");
  await shot(page, "01-queue.png");

  // 6. Issue builder.
  console.log("📍 Issue builder");
  await page.goto(`${process.env.APP_URL}/issues`, { waitUntil: "networkidle" });
  await page.locator("#issue-date").fill(DATE);
  await page.locator("#issue-type").selectOption("Tue news");
  await page.getByTestId("open-issue").click();
  await page.waitForURL(/\/issues\/2026-12-29-tue$/);
  await page.getByTestId("module-events").waitFor();
  await page.waitForTimeout(6000); // sheet read for events/businesses
  const eventsText = await page.getByTestId("module-events").innerText();
  const bizText = await page.getByTestId("module-business").innerText();
  console.log(`   events module: ${eventsText.slice(0, 160).replace(/\n/g, " | ")}`);
  console.log(`   business module: ${bizText.slice(0, 160).replace(/\n/g, " | ")}`);
  await page.getByRole("button", { name: /Suggest from the drafts/ }).click();
  await page.waitForFunction(() => (document.querySelector("#subject") as HTMLInputElement)?.value.length > 0, null, { timeout: 90000 });
  const subject = await page.locator("#subject").inputValue();
  console.log(`   suggested subject: ${subject}`);
  await page.waitForTimeout(1500);
  const preview = await page.getByTestId("issue-preview").innerText();
  if (!preview.includes("Sponsored by TEST ONLY Fake Pool Co")) throw new Error("Sponsor not labelled in preview");
  if (!preview.includes("Know an event, opening, or neighborhood change?")) throw new Error("Standard close missing");
  await shot(page, "03-issue-builder.png");

  // 7. Checklist + export gate.
  console.log("📍 Checklist & export");
  await page.getByTestId("export-tab").click();
  await page.getByTestId("checklist").waitFor();
  if (await page.getByTestId("export-button").isEnabled()) throw new Error("Export must be locked before the checklist is done");
  for (let i = 0; i < 12; i++) {
    await page.getByTestId(`check-${i}`).check();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1200);
  const blockers = await page.getByTestId("export-blockers").innerText().catch(() => "");
  console.log(`   blockers after ticking: ${blockers.replace(/\n/g, " | ") || "none"}`);
  if (blockers && /VERIFY/.test(blockers)) {
    if (await page.getByTestId("export-button").isEnabled()) throw new Error("Export must stay locked while VERIFY flags remain");
    await shot(page, "04-checklist-blocked.png");
    // Resolve remaining flags the way an editor would: cut the unconfirmed detail.
    await page.goto(`${process.env.APP_URL}/queue`, { waitUntil: "networkidle" });
    const links = page.getByTestId("queue-item");
    const n = await links.count();
    for (let i = 0; i < n; i++) {
      await page.goto(`${process.env.APP_URL}/queue`, { waitUntil: "networkidle" });
      await page.getByTestId("queue-item").nth(i).click();
      await page.waitForURL(/\/story\//);
      await page.waitForTimeout(800);
      const input = page.getByTestId("draft-input");
      if (!(await input.count())) continue;
      const t = await input.inputValue();
      if (!/VERIFY:/.test(t)) continue;
      await input.fill(t.replace(/[^.]*VERIFY:\s*(\[[^\]]*\]|[^.\n;,]*)[^.]*\.?/g, "").replace(/\s{2,}/g, " ").trim());
      await page.getByTestId("save-draft").click();
      await page.waitForTimeout(1000);
    }
    await page.goto(`${process.env.APP_URL}/issues/${DATE}-tue/export`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
  }
  const stillBlocked = await page.getByTestId("export-blockers").innerText().catch(() => "");
  if (stillBlocked) throw new Error(`Still blocked: ${stillBlocked}`);
  await page.getByTestId("export-button").click();
  await page.getByTestId("export-output").waitFor({ timeout: 15000 });
  const html = await page.getByLabel("HTML").inputValue();
  const text = await page.getByLabel("Plain text").inputValue();
  if (!html.includes("utm_source=tampascoop") || !text.includes("utm_campaign=2026-12-29-tue")) throw new Error("UTM tags missing");
  if (!html.includes("Sponsored")) throw new Error("Sponsor label missing in HTML");
  await shot(page, "05-checklist-export.png");

  // 8. Mobile.
  console.log("📍 Mobile");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${process.env.APP_URL}/queue`, { waitUntil: "networkidle" });
  await shot(page, "06-mobile-queue.png");
  await page.goto(`${process.env.APP_URL}/story/${id1}`, { waitUntil: "networkidle" });
  await shot(page, "07-mobile-story.png");
  await page.goto(`${process.env.APP_URL}/issues/${DATE}-tue`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await shot(page, "08-mobile-issue.png");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) throw new Error("Horizontal overflow on mobile");
  console.log("✅ Desk flow passed");
}).catch(e => {
  console.error("FATAL", e);
  process.exit(1);
});
