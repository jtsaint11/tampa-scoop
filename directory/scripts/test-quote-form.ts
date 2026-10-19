/**
 * Profile + quote form. Needs the SCREENSHOT FIXTURE build
 * (VITE_DIRECTORY_FIXTURE=1 bun run build) because the Businesses tab is empty.
 * Never sends a write: covers client validation, the honeypot path (server
 * drops it), and the server's "listing not in the sheet" refusal.
 */
import { assert, runPublicTest } from "./publicTest";

const fill = async (page: import("playwright").Page) => {
  await page.fill("#q-serviceZip", "33606");
  await page.selectOption("#q-timing", "This week");
  await page.fill("#q-jobDescription", "Automated test. Pool pump is making a grinding noise, need someone to look at it.");
  await page.fill("#q-name", "Test Person");
  await page.fill("#q-email", "test@example.com");
  await page.check("#q-termsAccepted");
};

await runPublicTest("Profile + quote form validation", async ({ page, goto, shot }) => {
  await goto("/business/sample-pool-co");
  await page.getByRole("heading", { level: 1, name: /Sample Pool Co/ }).waitFor({ timeout: 30000 });
  assert(await page.getByTestId("claimed-badge").count() >= 1, "claimed badge");
  await page.getByTestId("quote-form").waitFor();
  await shot("profile-desktop.png");
  await page.getByRole("button", { name: "Send quote request" }).click();
  await page.getByTestId("quote-banner").waitFor();
  for (const id of ["serviceZip", "timing", "jobDescription", "name", "email", "termsAccepted"]) {
    assert(await page.locator(`#q-${id}-error`).count() === 1, `error shown for ${id}`);
  }
  await page.fill("#q-phone", "813");
  await page.getByText("Phone", { exact: true }).last().click();
  await page.getByRole("button", { name: "Send quote request" }).click();
  await page.locator("#q-phone-error").waitFor();
  await shot("profile-validation.png");
});

await runPublicTest("Quote form: honeypot dropped by server (no write)", async ({ page, goto }) => {
  await goto("/business/sample-pool-co");
  await page.getByTestId("quote-form").waitFor({ timeout: 30000 });
  await fill(page);
  await page.evaluate(() => {
    const el = document.getElementById("q-website") as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, "http://spam.example");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(3200);
  await page.getByRole("button", { name: "Send quote request" }).click();
  await page.getByTestId("quote-success").waitFor({ timeout: 30000 });
});

await runPublicTest("Quote form: server refuses a listing that is not in the sheet (no write)", async ({ page, goto }) => {
  await goto("/business/sample-pool-co");
  await page.getByTestId("quote-form").waitFor({ timeout: 30000 });
  await fill(page);
  await page.waitForTimeout(3200);
  await page.getByRole("button", { name: "Send quote request" }).click();
  await page.getByTestId("quote-banner").getByText("isn't taking quote requests").waitFor({ timeout: 30000 });
});

await runPublicTest(
  "Profile (mobile)",
  async ({ page, goto, shot }) => {
    await goto("/business/sample-pool-co");
    await page.getByTestId("quote-form").waitFor({ timeout: 30000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 1, `no horizontal overflow (got ${overflow}px)`);
    await shot("profile-mobile.png");
    await goto("/category/pool-services");
    await page.getByTestId("business-card").first().waitFor();
    await shot("category-fixture-mobile.png");
  },
  { width: 390, height: 844 },
);

await runPublicTest("Category with listings (fixture): featured first", async ({ page, goto, shot }) => {
  await goto("/category/pool-services");
  await page.getByTestId("business-card").first().waitFor({ timeout: 30000 });
  await page.getByTestId("business-row").first().waitFor();
  await shot("category-fixture-desktop.png");
});
