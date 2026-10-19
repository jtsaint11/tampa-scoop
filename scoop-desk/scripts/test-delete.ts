/** E2E: permanent Delete on a throwaway story (ZZTEST-DELETE-1) only. */
import { runTest } from "./auth";
const SHOTS = "/work/bots/tampa-newsletter/desk/v2";

runTest("Delete story", async helper => {
  const { page } = helper;
  await page.setViewportSize({ width: 1440, height: 1000 });
  let dialog = "";
  page.on("dialog", async d => {
    dialog = d.message();
    await d.accept();
  });
  await page.goto(`${process.env.APP_URL}/story/ZZTEST-DELETE-1`, { waitUntil: "networkidle" });
  await page.getByTestId("delete-story").waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/08-delete-button.png` });
  await page.getByTestId("delete-story").click();
  await page.waitForURL(/\/queue/, { timeout: 60000 });
  await page.locator("[data-sonner-toast]").first().waitFor({ timeout: 10000 });
  const toastText = await page.locator("[data-sonner-toast]").first().innerText();
  await page.screenshot({ path: `${SHOTS}/09-delete-toast.png` });
  console.log(`DIALOG: ${dialog}`);
  console.log(`TOAST: ${toastText}`);
  if (!dialog.startsWith("Delete permanently?")) throw new Error("no confirm dialog");
});
