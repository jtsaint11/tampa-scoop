import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { presentation } from "../presentation/content";
import { authenticatedMutation, authenticatedQuery } from "./functions";

const TTL = 4 * 60 * 60 * 1000;

async function ownedSession(
  ctx: QueryCtx & { userId: Id<"users"> },
  sessionId: string,
) {
  const id = ctx.db.normalizeId("presentations", sessionId);
  const session = id ? await ctx.db.get(id) : null;
  return session?.owner === ctx.userId && session.expiresAt > Date.now()
    ? session
    : null;
}

export const start = authenticatedMutation({
  args: { controller: v.string() },
  handler: async (ctx, args) => {
    if (!presentation.slides.length || presentation.slides.length > 200) {
      throw new Error("Presentation must have 1–200 slides");
    }
    if (!/^[0-9a-f-]{36}$/.test(args.controller)) {
      throw new Error("Invalid controller");
    }
    const sessionId = await ctx.db.insert("presentations", {
      owner: ctx.userId,
      controller: args.controller,
      version: presentation.version,
      title: presentation.title,
      slides: presentation.slides,
      slide: 0,
      revision: 0,
      expiresAt: Date.now() + TTL,
    });
    await ctx.scheduler.runAfter(TTL, internal.presentations.expire, {
      sessionId,
    });
    return sessionId;
  },
});

export const read = authenticatedQuery({
  args: {
    sessionId: v.string(),
    controller: v.optional(v.string()),
    mode: v.union(v.literal("present"), v.literal("display")),
  },
  handler: async (ctx, args) => {
    const session = await ownedSession(ctx, args.sessionId);
    if (!session) return null;
    return {
      title: session.title,
      version: session.version,
      slide: session.slide,
      revision: session.revision,
      expiresAt: session.expiresAt,
      slides: session.slides.map(({ title, body }) => ({ title, body })),
      canControl: args.controller === session.controller,
      notes:
        args.mode === "present" && args.controller === session.controller
          ? session.slides[session.slide].notes
          : null,
    };
  },
});

export const takeControl = authenticatedMutation({
  args: { sessionId: v.string(), controller: v.string(), revision: v.number() },
  handler: async (ctx, args) => {
    const session = await ownedSession(ctx, args.sessionId);
    if (!session) {
      throw new Error("Presentation unavailable or control denied");
    }
    if (!/^[0-9a-f-]{36}$/.test(args.controller)) {
      throw new Error("Invalid controller");
    }
    if (args.revision !== session.revision) {
      throw new Error("Slide changed. Try again.");
    }
    await ctx.db.patch(session._id, {
      controller: args.controller,
      revision: session.revision + 1,
    });
  },
});

export const control = authenticatedMutation({
  args: {
    sessionId: v.string(),
    controller: v.string(),
    revision: v.number(),
    action: v.union(v.literal("next"), v.literal("previous"), v.literal("end")),
  },
  handler: async (ctx, args) => {
    const session = await ownedSession(ctx, args.sessionId);
    if (!session || session.controller !== args.controller) {
      throw new Error("Presentation unavailable or control denied");
    }
    if (args.revision !== session.revision) {
      throw new Error("Slide changed. Try again.");
    }
    if (args.action === "end") {
      await ctx.db.delete(session._id);
      return;
    }
    const slide = Math.max(
      0,
      Math.min(
        session.slides.length - 1,
        session.slide + (args.action === "next" ? 1 : -1),
      ),
    );
    if (slide !== session.slide) {
      await ctx.db.patch(session._id, {
        slide,
        revision: session.revision + 1,
      });
    }
  },
});

export const expire = internalMutation({
  args: { sessionId: v.id("presentations") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (session && session.expiresAt <= Date.now()) {
      await ctx.db.delete(sessionId);
    }
  },
});
