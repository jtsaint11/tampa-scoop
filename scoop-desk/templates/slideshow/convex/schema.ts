import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  presentations: defineTable({
    owner: v.id("users"),
    controller: v.string(),
    version: v.string(),
    title: v.string(),
    slides: v.array(
      v.object({
        title: v.string(),
        body: v.string(),
        notes: v.array(v.string()),
      }),
    ),
    slide: v.number(),
    revision: v.number(),
    expiresAt: v.number(),
  }),
});
