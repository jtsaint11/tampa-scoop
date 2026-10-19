/**
 * Access check. Run with DESK_ALLOW_AUTOMATION unset on the backend:
 * a signed-in account that is not the editor's email must see only the "private" screen,
 * and sign-up with any other email must be refused before a code is sent.
 */
import { chromium } from "playwright";
import { runTest } from "./auth";

runTest("Desk is private", async helper => {
  const { page } = helper;
  await helper.goto("/queue");
  await page.getByTestId("desk-private").waitFor({ timeout: 15000 });
  const t = await page.locator("body").innerText();
  if (t.includes("Add to the queue")) throw new Error("Queue visible to a non-editor account");
  await page.screenshot({ path: "/work/bots/tampa-newsletter/desk/09-private-for-others.png" });
  console.log("   ✓ non-editor account sees only the private screen");

  // Anonymous sign-up with another address is refused.
  const browser = await chromium.launch();
  const p2 = await (await browser.newContext()).newPage();
  await p2.goto(`${process.env.APP_URL}/signup`, { waitUntil: "networkidle" });
  await p2.locator("#name").fill("Not Justin");
  await p2.locator("#email").fill("someone.else@gmail.com");
  await p2.locator("#password").fill("a-long-test-password-123");
  await p2.locator('button[type="submit"]').first().click();
  await p2.waitForTimeout(4000);
  const t2 = await p2.locator("body").innerText();
  await browser.close();
  if (/Enter code|verification code/i.test(t2) && !/Could not create account/i.test(t2)) throw new Error("Sign-up for another email reached the code step");
  if (!/Could not create account/i.test(t2)) throw new Error(`Unexpected sign-up result: ${t2.slice(0, 300)}`);
  console.log("   ✓ sign-up with another email refused");
}).catch(e => {
  console.error("FATAL", e);
  process.exit(1);
});
