import { runTest } from "./auth";
runTest("model", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`${process.env.APP_URL}/issues/2026-10-20-tue`, { waitUntil: "networkidle" });
  const sec = page.getByTestId("section-datespot");
  await sec.getByTestId("rewrite").click();
  await page.waitForTimeout(2000);
  await page.waitForFunction(() => !document.querySelector('[data-testid="section-datespot"] [data-testid="rewrite"]')?.textContent?.includes("Writing"), null, { timeout: 180000 });
  for (const t of ["Deep","Punchy","Straight"]) console.log(`[${t}]`, (await sec.getByTestId(`draft-${t}`).innerText()).replace(/\n+/g," ").slice(0,600));
});
