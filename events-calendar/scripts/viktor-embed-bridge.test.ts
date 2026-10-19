import { describe, expect, test } from "bun:test";
import {
  type EmbedEnvironment,
  isShellMessage,
  resolveShellOrigin,
  routeMessage,
  safeAppPath,
  SHELL_ORIGIN_STORAGE_KEY,
  shellOriginFromHash,
} from "../src/lib/viktor-embed/bridge";

const SHELL = "https://app.viktor.com";
const OWN = "https://acme.viktor.space";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function env(overrides: Partial<EmbedEnvironment> = {}): EmbedEnvironment {
  return {
    framed: true,
    ownOrigin: OWN,
    hash: "",
    referrer: "",
    storage: new MemoryStorage(),
    ...overrides,
  };
}

describe("resolveShellOrigin", () => {
  test("first entry: framed, referrer is the shell (strip redirect keeps its origin)", () => {
    const storage = new MemoryStorage();
    expect(resolveShellOrigin(env({ referrer: `${SHELL}/knowledge`, storage }))).toBe(SHELL);
    // Remembered for the next document in this tab.
    expect(storage.getItem(SHELL_ORIGIN_STORAGE_KEY)).toBe(SHELL);
  });

  test("post-navigation document: no referrer, the remembered origin still talks to the shell", () => {
    // A full-page navigation or reload inside the frame arrives with an empty
    // referrer (pages send `referrer-policy: no-referrer`); the frame must not
    // fall silent, or breadcrumb navigation looks like a stalled embed.
    const storage = new MemoryStorage();
    storage.setItem(SHELL_ORIGIN_STORAGE_KEY, SHELL);
    expect(resolveShellOrigin(env({ referrer: "", storage }))).toBe(SHELL);
  });

  test("post-navigation document: the fragment carries the origin even without storage", () => {
    expect(
      resolveShellOrigin(
        env({ referrer: "", storage: null, hash: `#viktor-shell=${encodeURIComponent(SHELL)}` }),
      ),
    ).toBe(SHELL);
    expect(
      resolveShellOrigin(
        env({ referrer: "", storage: null, hash: `#section&viktor-shell=${encodeURIComponent(SHELL)}` }),
      ),
    ).toBe(SHELL);
  });

  test("framed-ness comes from the window tree, not the referrer", () => {
    // Not framed: silent even with a cross-origin referrer.
    expect(resolveShellOrigin(env({ framed: false, referrer: `${SHELL}/` }))).toBeNull();
    // Framed by a page on our own origin: not the dashboard shell.
    expect(resolveShellOrigin(env({ referrer: `${OWN}/other` }))).toBeNull();
    // Framed, nothing to learn the origin from: silent, never a wildcard.
    expect(resolveShellOrigin(env({ referrer: "", storage: null }))).toBeNull();
  });

  test("a fresh referrer wins over a stale remembered origin", () => {
    const storage = new MemoryStorage();
    storage.setItem(SHELL_ORIGIN_STORAGE_KEY, "https://old.example");
    expect(resolveShellOrigin(env({ referrer: `${SHELL}/`, storage }))).toBe(SHELL);
    expect(storage.getItem(SHELL_ORIGIN_STORAGE_KEY)).toBe(SHELL);
  });

  test("storage that throws is tolerated", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(resolveShellOrigin(env({ referrer: `${SHELL}/`, storage: broken }))).toBe(SHELL);
    expect(resolveShellOrigin(env({ referrer: "", storage: broken }))).toBeNull();
  });
});

describe("shellOriginFromHash", () => {
  test("reads only a well-formed origin", () => {
    expect(shellOriginFromHash(`#viktor-shell=${encodeURIComponent("https://app.viktor.com/x")}`)).toBe(
      SHELL,
    );
    expect(shellOriginFromHash("#viktor-shell=not-a-url")).toBeNull();
    expect(shellOriginFromHash("#viktor-shell=%E0%A4%A")).toBeNull();
    expect(shellOriginFromHash("#other=1")).toBeNull();
    expect(shellOriginFromHash("")).toBeNull();
  });
});

describe("envelopes", () => {
  test("safeAppPath keeps app-relative paths only", () => {
    expect(safeAppPath("/orders?tab=open")).toBe("/orders?tab=open");
    expect(safeAppPath("//evil.example/x")).toBeNull();
    expect(safeAppPath("https://evil.example/x")).toBeNull();
    expect(safeAppPath("/a\\b")).toBeNull();
    expect(safeAppPath(42)).toBeNull();
  });

  test("isShellMessage accepts only the pinned shell envelopes", () => {
    expect(isShellMessage({ source: "viktor-shell", version: 1, type: "theme", theme: "dark" })).toBe(
      true,
    );
    expect(isShellMessage({ source: "viktor-shell", version: 1, type: "navigate", path: "/x" })).toBe(
      true,
    );
    expect(isShellMessage({ source: "viktor-shell", version: 2, type: "theme", theme: "dark" })).toBe(
      false,
    );
    expect(isShellMessage({ source: "viktor-embed", version: 1, type: "ready" })).toBe(false);
    expect(isShellMessage(null)).toBe(false);
  });

  test("routeMessage drops an empty title", () => {
    expect(routeMessage("/x", "  ")).toEqual({
      source: "viktor-embed",
      version: 1,
      type: "route",
      path: "/x",
    });
    expect(routeMessage("/x", " Orders ").title).toBe("Orders");
  });
});
