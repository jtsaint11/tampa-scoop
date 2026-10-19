/**
 * Submit form. Per the Spaces rules, writes are NOT run as tests: this test
 * never sends a valid, non-spam submission. It covers client + server
 * validation and the honeypot path (which returns success and writes nothing).
 */
import { assert, runPublicTest } from "./publicTest";

const tomorrow = (() => {
  const d = new Date(Date.now() + 2 * 86400000);
  return d.toISOString().slice(0, 10);
})();

await runPublicTest("Submit form: validation", async ({ page, goto, shot }) => {
  await goto("/submit-event");
  await page.getByRole("heading", { name: "Submit Your Tampa Event" }).waitFor();
  await shot("submit-desktop.png");
  await page.getByRole("button", { name: "Submit event for review" }).click();
  await page.getByTestId("form-banner").waitFor();
  for (const id of ["submitterName", "submitterEmail", "organizer", "title", "startDate", "startTime", "venue", "address", "ticketUrl", "category", "ageRule", "description"]) {
    assert(await page.locator(`#${id}-error`).count() === 1, `required error shown for ${id}`);
  }
  assert(await page.getByText("Please confirm the details are accurate").count() === 1, "consent required");
  await page.fill("#submitterEmail", "not-an-email");
  await page.fill("#ticketUrl", "example");
  await page.getByRole("button", { name: "Submit event for review" }).click();
  await page.getByText("Enter a valid email address.").waitFor();
  await page.getByText("Enter a full link starting with https://").waitFor();
  await page.getByText("paid", { exact: true }).click();
  await page.getByRole("button", { name: "Submit event for review" }).click();
  await page.locator("#price-error").waitFor();
  await shot("submit-validation.png");
});

await runPublicTest("Submit form: honeypot is silently dropped (no sheet write)", async ({ page, goto }) => {
  await goto("/submit-event");
  await page.fill("#submitterName", "Test Bot");
  await page.fill("#submitterEmail", "bot@example.com");
  await page.fill("#organizer", "Bot Org");
  await page.fill("#title", "Spam Event Should Never Be Written");
  await page.fill("#startDate", tomorrow);
  await page.fill("#startTime", "18:30");
  await page.selectOption("#category", "Community");
  await page.selectOption("#ageRule", "All ages");
  await page.fill("#description", "This is an automated honeypot test. It must be dropped by the server before any write.");
  await page.fill("#venue", "Nowhere Hall");
  await page.fill("#address", "1 Test St, Tampa, FL 33602");
  await page.fill("#ticketUrl", "https://example.com/event");
  await page.check("#accuracyConfirmed");
  // Fill the hidden honeypot like a bot would.
  await page.evaluate(() => {
    const el = document.getElementById("website") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(el, "http://spam.example");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(3200); // pass the minimum-fill-time check so only the honeypot triggers
  await page.getByRole("button", { name: "Submit event for review" }).click();
  await page.getByTestId("submit-success").waitFor({ timeout: 30000 });
});

await runPublicTest(
  "Submit form (mobile)",
  async ({ page, goto, shot }) => {
    await goto("/submit-event");
    await page.getByRole("heading", { name: "Submit Your Tampa Event" }).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 1, `no horizontal overflow (got ${overflow}px)`);
    await shot("submit-mobile.png");
  },
  { width: 390, height: 844 },
);
