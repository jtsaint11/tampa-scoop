import { ALLOWED_EMAILS } from "./desk";

declare const process: { env: Record<string, string | undefined> };

/**
 * The Desk is private: only these exact email addresses may sign up or sign in.
 * Defaults to ALLOWED_EMAILS; DESK_ALLOWED_EMAILS (comma-separated) on the
 * Convex deployment overrides it.
 */
export function allowedDeskEmails(): string[] {
  const fromEnv = (process.env.DESK_ALLOWED_EMAILS ?? "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : [...ALLOWED_EMAILS];
}

export function isAllowedDeskUser(email: string | undefined | null): boolean {
  const e = (email ?? "").trim().toLowerCase();
  return !!e && allowedDeskEmails().includes(e);
}
