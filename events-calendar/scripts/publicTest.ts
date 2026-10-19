/**
 * Minimal e2e harness for this PUBLIC app (auth.mode: public): no sign-in.
 * Run through `bun run test scripts/<file>.ts` so APP_URL points at the build.
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium, type Page } from "playwright";

/** Use whichever headless shell is installed if the pinned one is missing. */
function executablePath(): string | undefined {
  const root = join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(root)) return undefined;
  for (const dir of readdirSync(root).filter(d => d.startsWith("chromium_headless_shell-")).sort().reverse()) {
    const p = join(root, dir, "chrome-headless-shell-linux64", "chrome-headless-shell");
    if (existsSync(p)) return p;
  }
  return undefined;
}

export const SHOT_DIR = join(import.meta.dir, "..", "tmp", "screenshots");
mkdirSync(SHOT_DIR, { recursive: true });

export async function runPublicTest(
  name: string,
  fn: (ctx: { page: Page; goto: (path: string) => Promise<void>; shot: (file: string) => Promise<void>; errors: string[] }) => Promise<void>,
  viewport = { width: 1280, height: 900 },
) {
  console.log(`\n🧪 ${name}`);
  const browser = await chromium.launch({ executablePath: executablePath() });
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 500 ? 2 : 1 });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  const base = process.env.APP_URL || "http://localhost:4173";
  try {
    await fn({
      page,
      errors,
      goto: async (path: string) => { await page.goto(`${base}${path}`, { waitUntil: "networkidle" }); },
      shot: async (file: string) => { await page.screenshot({ path: join(SHOT_DIR, file), fullPage: true }); },
    });
    console.log(`✅ ${name} PASSED`);
  } catch (e) {
    console.error(`❌ ${name} FAILED:`, e instanceof Error ? e.message : e);
    await page.screenshot({ path: join(SHOT_DIR, `error-${Date.now()}.png`), fullPage: true }).catch(() => {});
    console.error("Console errors:", errors.join("\n"));
    console.error((await page.textContent("body").catch(() => ""))?.slice(0, 1500));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

export function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
