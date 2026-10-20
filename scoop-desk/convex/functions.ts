import { getAuthUserId } from "@convex-dev/auth/server";
import {
  customAction,
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, mutation, query } from "./_generated/server";
import { isAllowedDeskUser } from "./lib/access";

type AuthCtx = Parameters<typeof getAuthUserId>[0];

/**
 * Signed in AND on the Desk allowlist (one email). Everyone else is refused,
 * even with a valid session: the Desk is private to the editor.
 */
async function authenticatedContext(ctx: AuthCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  let email: string | undefined;
  if ("db" in ctx) {
    const user = await (ctx as unknown as { db: { get: (id: Id<"users">) => Promise<{ email?: string } | null> } }).db.get(userId);
    email = user?.email;
  } else {
    email = (await (ctx as unknown as { runQuery: (r: unknown, a: unknown) => Promise<string | null> }).runQuery(
      internal.access.emailOf,
      { userId },
    )) ?? undefined;
  }
  if (!isAllowedDeskUser(email)) {
    throw new Error("Not allowed: the Scoop Desk is private to its editor.");
  }
  return { userId };
}

/**
 * Public Convex functions that require a signed-in user.
 *
 * Use these builders for app-facing functions in authenticated Spaces.
 * `ctx.userId` is derived from the verified Convex Auth session.
 */
export const authenticatedQuery = customQuery(
  query,
  customCtx(authenticatedContext),
);

export const authenticatedMutation = customMutation(
  mutation,
  customCtx(authenticatedContext),
);

export const authenticatedAction = customAction(
  action,
  customCtx(authenticatedContext),
);
