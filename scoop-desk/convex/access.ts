import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import { isAllowedDeskUser } from "./lib/access";

declare const process: { env: Record<string, string | undefined> };

export const emailOf = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { userId }) => (await ctx.db.get(userId))?.email ?? null,
});

/** For the UI: is the signed-in person allowed into the Desk? (No data exposed.) */
export const myAccess = query({
  args: {},
  returns: v.object({ signedIn: v.boolean(), allowed: v.boolean(), email: v.string() }),
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { signedIn: false, allowed: false, email: "" };
    const email = (await ctx.db.get(userId))?.email ?? "";
    return {
      signedIn: true,
      allowed: isAllowedDeskUser(email, process.env.DESK_ALLOW_AUTOMATION === "1"),
      email,
    };
  },
});
