/** Events page: live read from the Events tab (via the tool gateway), empty state, filters, guides. */
import { assert, runPublicTest } from "./publicTest";

await runPublicTest("Events page (desktop)", async ({ page, goto, shot, errors }) => {
  await goto("/");
  // Count line comes from the real Convex action -> Google Sheets read.
  await page.getByTestId("event-count").getByText(/upcoming event/).waitFor({ timeout: 30000 });
  const countText = (await page.getByTestId("event-count").textContent()) ?? "";
  console.log("count line:", countText);
  const n = Number(countText.match(/(\d+) upcoming/)?.[1] ?? NaN);
  assert(!Number.isNaN(n), "headline shows a numeric live count");
  assert(await page.getByTestId("load-error").count() === 0, "no load error");

  if (n === 0) {
    await page.getByTestId("empty-calendar").waitFor();
    assert(await page.getByTestId("event-card").count() === 0, "no invented events");
  } else {
    assert(await page.getByTestId("event-card").count() > 0, "cards rendered");
  }
  assert(await page.getByTestId("submit-cta").first().isVisible(), "submit CTA visible above the fold");

  // Filters update the URL and survive reload.
  await page.getByRole("button", { name: "This weekend" }).click();
  await page.getByRole("button", { name: "Live Music" }).click();
  await page.getByTestId("neighborhood-select").selectOption("Ybor City");
  await page.getByRole("button", { name: /Free only/ }).click();
  await page.getByRole("searchbox").fill("jazz");
  await page.waitForTimeout(300);
  const url = new URL(page.url());
  assert(url.searchParams.get("date") === "weekend", "date filter in URL");
  assert(url.searchParams.get("category") === "Live Music", "category in URL");
  assert(url.searchParams.get("neighborhood") === "Ybor City", "neighborhood in URL");
  assert(url.searchParams.get("free") === "1", "free in URL");
  assert(url.searchParams.get("q") === "jazz", "search in URL");
  await page.getByRole("button", { name: "Clear filters" }).first().click();
  await page.waitForTimeout(300);
  assert(new URL(page.url()).search === "", "clear filters resets URL");

  // Guides section links into filtered views.
  await page.locator("#guides").scrollIntoViewIfNeeded();
  assert(await page.locator("#guides a").count() === 6, "6 guide cards");
  await page.getByRole("link", { name: /Live music in Tampa/ }).click();
  await page.waitForTimeout(400);
  assert(new URL(page.url()).searchParams.get("category") === "Live Music", "guide applies filter");
  await goto("/");
  await page.getByTestId("event-count").getByText(/upcoming event/).waitFor({ timeout: 30000 });
  await shot("events-desktop.png");

  // Submit entry point navigates to the form.
  await page.getByTestId("submit-cta").first().click();
  await page.getByRole("heading", { name: "Submit Your Tampa Event" }).waitFor();

  // Unknown event key shows a friendly not-found, never a fake event.
  await goto("/events/does-not-exist");
  await page.getByTestId("event-not-found").waitFor({ timeout: 30000 });

  const real = errors.filter(e => !/favicon|ERR_BLOCKED/.test(e));
  assert(real.length === 0, `no console errors: ${real.join(" | ")}`);
});

await runPublicTest(
  "Events page (mobile)",
  async ({ page, goto, shot }) => {
    await goto("/");
    await page.getByTestId("event-count").getByText(/upcoming event/).waitFor({ timeout: 30000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 1, `no horizontal page overflow on mobile (got ${overflow}px)`);
    assert(await page.getByRole("link", { name: "Submit", exact: true }).isVisible(), "submit button in mobile header");
    await page.getByRole("button", { name: "Open menu" }).click();
    assert(await page.getByRole("navigation", { name: "Mobile" }).isVisible(), "mobile menu opens");
    await page.getByRole("button", { name: "Close menu" }).click();
    await shot("events-mobile.png");
  },
  { width: 390, height: 844 },
);
