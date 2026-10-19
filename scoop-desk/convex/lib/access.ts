import { ALLOWED_EMAILS } from "./desk";

/**
 * True only for the Desk editor's exact email address (not the domain).
 * `allowAutomation` admits the Viktor automation identity used by e2e tests
 * and screenshots (a backend-minted, single-use session for this Space only;
 * its synthetic address can never be signed up for). It is switched on with
 * the DESK_ALLOW_AUTOMATION env var on the dev/preview backend only.
 */
export function isAllowedDeskUser(email: string | undefined | null, allowAutomation: boolean): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return false;
  if ((ALLOWED_EMAILS as readonly string[]).includes(e)) return true;
  return allowAutomation && /^space-session-[^@]+@viktor\.invalid$/.test(e);
}
