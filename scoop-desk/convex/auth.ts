import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { isAllowedDeskUser } from "./lib/access";

/**
 * Email + password sign-in (Convex Auth). Sign-up and sign-in are refused for
 * any address not on the Desk allowlist. No email verification or reset: there
 * is no mail sender; reset a forgotten password from the Convex dashboard by
 * deleting the user's authAccounts row and signing up again.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email ?? "").trim().toLowerCase();
        if (!isAllowedDeskUser(email)) {
          throw new Error("This desk is private. Only the editor's email can sign in.");
        }
        return { email, ...(typeof params.name === "string" && params.name ? { name: params.name } : {}) };
      },
    }),
  ],
});

export const currentUser = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});
