/** Unit test: a failed quote write must not block the retry (no network). */
import { expect, test } from "bun:test";
import { guardedWrite } from "../convex/lib/guardedWrite";
import { LIMITS, RELEASE_ON_FAILURE } from "../convex/quotes";

/** In-memory copy of checkAndRecordRate / releaseRate semantics. */
function fakeRateStore() {
  const log: { id: number; kind: string; keyHash: string; at: number }[] = [];
  let next = 1;
  return {
    log,
    reserve: async (keys: { kind: string; keyHash: string }[]) => {
      const now = Date.now();
      for (const { kind, keyHash } of keys) {
        const limit = LIMITS[kind as keyof typeof LIMITS];
        const n = log.filter(
          e =>
            e.kind === kind &&
            e.keyHash === keyHash &&
            e.at > now - limit.windowMs,
        ).length;
        if (n >= limit.max)
          return { blocked: kind, releaseIds: [] as number[] };
      }
      const releaseIds: number[] = [];
      for (const { kind, keyHash } of keys) {
        const id = next++;
        log.push({ id, kind, keyHash, at: now });
        if (RELEASE_ON_FAILURE.has(kind)) releaseIds.push(id);
      }
      return { blocked: null, releaseIds };
    },
    release: async (ids: number[]) => {
      for (const id of ids) {
        const i = log.findIndex(e => e.id === id);
        if (i >= 0) log.splice(i, 1);
      }
    },
  };
}

const KEYS = [
  { kind: "duplicate:v2", keyHash: "me@example.com|acme-roofing" },
  { kind: "client:v2", keyHash: "browser" },
  { kind: "email:v2", keyHash: "me@example.com" },
  { kind: "global:v2", keyHash: "all" },
];

test("first quote write fails, retry succeeds (not blocked as duplicate)", async () => {
  const store = fakeRateStore();
  let attempts = 0;
  const write = async () => {
    attempts++;
    if (attempts === 1) throw new Error("needs_approval");
    return 12;
  };
  const first = await guardedWrite({
    reserve: () => store.reserve(KEYS),
    release: store.release,
    write,
  });
  expect(first.kind).toBe("failed");
  // Only the site-wide record survives the failed write.
  expect(store.log.map(e => e.kind)).toEqual(["global:v2"]);
  const retry = await guardedWrite({
    reserve: () => store.reserve(KEYS),
    release: store.release,
    write,
  });
  expect(retry).toEqual({ kind: "ok", value: 12 });
  // A real duplicate after a successful write is still blocked.
  const again = await guardedWrite({
    reserve: () => store.reserve(KEYS),
    release: store.release,
    write,
  });
  expect(again).toEqual({ kind: "blocked", by: "duplicate:v2" });
});

test("repeated failures never trip the per-browser limit", async () => {
  const store = fakeRateStore();
  const fail = async (): Promise<number> => {
    throw new Error("down");
  };
  for (let i = 0; i < 5; i++) {
    const r = await guardedWrite({
      reserve: () => store.reserve(KEYS),
      release: store.release,
      write: fail,
    });
    expect(r.kind).toBe("failed");
  }
  expect(store.log.filter(e => e.kind !== "global:v2")).toHaveLength(0);
  expect(store.log.filter(e => e.kind === "global:v2")).toHaveLength(5);
});
