/**
 * E2E: section writer on a sample issue (2026-10-20 Tue) built from real Story Queue rows.
 * Runs on the dev backend with DESK_TEST_MODE=1: no sheet writes, no beehiiv post.
 */
import type { Page } from "playwright";
import { runTest } from "./auth";

const SHOTS = "/work/bots/tampa-newsletter/desk/v2";

async function shot(page: Page, name: string, full = false) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/${name}`, fullPage: full });
  console.log(`   📸 ${name}`);
}

async function writeAndApprove(page: Page, key: string, tone: "Deep" | "Punchy" | "Straight", pick?: string) {
  const sec = page.getByTestId(`section-${key}`);
  await sec.scrollIntoViewIfNeeded();
  if (pick) {
    await sec.getByTestId("add-context").click();
    await sec.getByTestId("context-panel").getByText(pick).click();
    await sec.getByTestId("save-context").click();
  }
  const t0 = Date.now();
  await sec.getByTestId("rewrite").click();
  await sec.getByTestId(`draft-${tone}`).waitFor({ timeout: 180000 });
  await page.waitForFunction(
    k => !document.querySelector(`[data-testid="section-${k}"] [data-testid="rewrite"]`)?.textContent?.includes("Writing"),
    key,
    { timeout: 180000 },
  );
  console.log(`   ${key}: drafts in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  for (const t of ["Deep", "Punchy", "Straight"]) {
    const txt = (await sec.getByTestId(`draft-${t}`).innerText()).slice(0, 400).replace(/\n+/g, " ");
    console.log(`     [${t}] ${txt}`);
  }
  await sec.getByTestId(`draft-${tone}`).getByTestId("approve").click();
  await sec.getByTestId("approved-box").waitFor({ timeout: 15000 });
}

runTest("Section writer", async helper => {
  const { page } = helper;
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`${process.env.APP_URL}/issues`, { waitUntil: "networkidle" });
  await page.locator("#issue-date").fill("2026-10-20");
  await page.getByTestId("open-issue").click();
  await page.waitForURL(/\/issues\/2026-10-20/, { timeout: 20000 });
  await page.getByTestId("section-writer").waitFor();
  await shot(page, "01-writer-empty.png");

  await writeAndApprove(page, "snapshot", "Deep");
  await shot(page, "02-snapshot-drafts.png");
  await page.getByTestId("section-snapshot").screenshot({ path: `${SHOTS}/03-snapshot-section.png` });
  await writeAndApprove(page, "events", "Punchy", "Lantern Walk Lights Up Hyde Park");
  await writeAndApprove(page, "datespot", "Punchy", "Mango & Mortar Opens on Howard Ave");
  await writeAndApprove(page, "intro", "Deep");
  await page.getByTestId("section-intro").screenshot({ path: `${SHOTS}/04-intro-approved.png` });

  // Edit approved copy and save.
  const intro = page.getByTestId("section-intro");
  const ta = intro.getByTestId("approved-text");
  await ta.fill(`${await ta.inputValue()}\n\nSee you Thursday.`);
  await intro.getByTestId("save-approved").click();
  await page.waitForTimeout(1500);

  // Subject options.
  await page.getByTestId("regen-subjects").click();
  await page.getByTestId("subject-options").waitFor({ timeout: 180000 });
  await page.getByTestId("use-subject").first().click();
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "05-subject-options.png");

  // Persistence across reload.
  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("approved-count").waitFor();
  const count = await page.getByTestId("approved-count").innerText();
  const subj = await page.getByTestId("subject-input").inputValue();
  const introText = await page.getByTestId("section-intro").getByTestId("approved-text").inputValue();
  console.log(`   after reload: "${count}", subject "${subj}", intro edit kept: ${introText.includes("See you Thursday.")}`);
  if (!count.startsWith("4 of 7") || !subj || !introText.includes("See you Thursday.")) throw new Error("Persistence failed");
  const violations = await page.getByTestId("rule-violation").count();
  console.log(`   rule violations flagged on page: ${violations}`);

  // Send to beehiiv: test mode never calls beehiiv.
  await page.getByTestId("send-beehiiv").click();
  await page.getByTestId("beehiiv-msg").waitFor({ timeout: 30000 });
  console.log(`   beehiiv: ${await page.getByTestId("beehiiv-msg").innerText()}`);
  await shot(page, "06-top-bar.png");
  await shot(page, "07-full-page.png", true);
});
