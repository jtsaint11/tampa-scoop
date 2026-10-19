/**
 * Live-data e2e (normal build): home, category, search, empty state, events
 * cross-links, mobile. Reads the real sheet through the dev backend.
 */
import { assert, runPublicTest } from "./publicTest";

const EVENTS = "https://tampa-events-justin-s-team.viktor.space";

await runPublicTest("Home: live counts, category grid, events links", async ({ page, goto, shot, errors }) => {
  await goto("/");
  const hero = page.getByTestId("hero-count");
  await hero.getByText(/Browse \d+ business(es)? across \d+ categor(y|ies)\./).waitFor({ timeout: 30000 });
  const text = (await hero.textContent()) ?? "";
  assert(text.startsWith("Find trusted local businesses in Tampa, FL."), `hero copy: ${text}`);
  const m = Number(text.match(/across (\d+)/)?.[1]);
  const tiles = await page.getByTestId("category-tile").count();
  assert(tiles === m && m >= 16, `category tiles (${tiles}) match M (${m})`);
  assert(await page.getByTestId("nav-events").getAttribute("href") === EVENTS, "nav links to events calendar");
  assert(await page.getByTestId("events-module").locator(`a[href^="${EVENTS}"]`).count() === 3, "events module links");
  const n = Number(text.match(/Browse (\d+)/)?.[1]);
  if (n === 0) {
    await page.getByTestId("add-business-note").getByText("No listings yet").waitFor();
    const counts = await page.getByTestId("category-count").allTextContents();
    assert(counts.every(c => c === "0 businesses"), "all categories show 0");
  }
  await shot("home-desktop.png");
  assert(errors.length === 0, `console errors: ${errors.join(" | ")}`);
});

await runPublicTest("Search", async ({ page, goto }) => {
  await goto("/");
  await page.getByTestId("category-tile").first().waitFor({ timeout: 30000 });
  await page.fill("#directory-search", "pool");
  await page.getByTestId("search-results").getByRole("link", { name: /Pool Services/ }).waitFor();
});

await runPublicTest("Category page + empty state", async ({ page, goto, shot }) => {
  await goto("/category/hvac");
  await page.getByRole("heading", { name: "Best HVAC in Tampa, FL" }).waitFor({ timeout: 30000 });
  await page.getByTestId("category-summary").getByText(/\d+ business(es)? · \d+ featured/).waitFor();
  if ((await page.getByTestId("category-summary").textContent())?.startsWith("0 ")) {
    await page.getByTestId("category-empty").getByRole("link", { name: /Add your business/ }).waitFor();
  }
  await shot("category-desktop.png");
});

await runPublicTest("Unknown business shows a clean message", async ({ page, goto }) => {
  await goto("/business/does-not-exist");
  await page.getByTestId("business-missing").waitFor({ timeout: 30000 });
});

await runPublicTest(
  "Home (mobile)",
  async ({ page, goto, shot }) => {
    await goto("/");
    await page.getByTestId("category-tile").first().waitFor({ timeout: 30000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 1, `no horizontal overflow (got ${overflow}px)`);
    await shot("home-mobile.png");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: /Tampa events calendar/ }).waitFor();
  },
  { width: 390, height: 844 },
);
