/**
 * Rate-guarded write flow for submissions (pure, no Convex imports so it can
 * be unit tested).
 *
 * 1. reserve(): atomically checks every limit and records the attempt, so two
 *    identical submissions racing each other cannot both get through.
 * 2. write(): the Google Sheets append.
 * 3. If write() throws, release() deletes the duplicate / email / client
 *    records made in step 1. A failed write therefore never blocks a retry as
 *    a "duplicate" and never counts toward the per-email or per-browser
 *    limits. (The site-wide record is kept on purpose: it protects the Sheets
 *    quota during an outage.)
 */
export type Reservation<Id = string> = {
  blocked: string | null;
  releaseIds: Id[];
};

export type GuardedResult<T> =
  | { kind: "blocked"; by: string }
  | { kind: "ok"; value: T }
  | { kind: "failed"; error: unknown };

export async function guardedWrite<T, Id = string>(deps: {
  reserve: () => Promise<Reservation<Id>>;
  release: (ids: Id[]) => Promise<void>;
  write: () => Promise<T>;
}): Promise<GuardedResult<T>> {
  const res = await deps.reserve();
  if (res.blocked) return { kind: "blocked", by: res.blocked };
  try {
    return { kind: "ok", value: await deps.write() };
  } catch (error) {
    try {
      await deps.release(res.releaseIds);
    } catch (releaseError) {
      console.error(
        "Could not release rate records after a failed write",
        releaseError,
      );
    }
    return { kind: "failed", error };
  }
}
