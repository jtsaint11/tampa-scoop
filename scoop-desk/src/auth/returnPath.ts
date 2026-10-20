/** Router-state key carrying the page a signed-out visitor was bounced from. */
export const BOUNCED_FROM_STATE_KEY = "bouncedFrom";

/** Where to send a visitor after sign-in: the bounced-from in-app path, else the queue. */
export function resolveSignedInReturn(routerState: unknown): string {
  if (typeof routerState === "object" && routerState !== null) {
    const from = (routerState as Record<string, unknown>)[BOUNCED_FROM_STATE_KEY];
    if (typeof from === "string" && from.startsWith("/") && !from.startsWith("//")) return from;
  }
  return "/queue";
}
