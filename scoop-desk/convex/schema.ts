import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** Where a record stands against Smartsheet (the source of truth). */
export const syncFields = {
  sheetRow: v.optional(v.number()),
  syncState: v.union(v.literal("pending"), v.literal("synced"), v.literal("paused"), v.literal("error")),
  syncMessage: v.optional(v.string()),
  syncedAt: v.optional(v.number()),
};

export const claimValidator = v.object({ claim: v.string(), sourceUrl: v.string() });

export const eventPickValidator = v.object({
  key: v.string(),
  slot: v.string(),
  name: v.string(),
  startDate: v.string(),
  time: v.string(),
  venue: v.string(),
  neighborhood: v.string(),
  price: v.string(),
  note: v.string(),
  dateVerified: v.string(),
});

export const businessPickValidator = v.object({
  slug: v.string(),
  name: v.string(),
  category: v.string(),
  neighborhood: v.string(),
  note: v.string(),
});

const toneTexts = v.object({ Deep: v.string(), Punchy: v.string(), Straight: v.string() });

/** One section of an issue in the section-by-section writer. */
export const sectionValidator = v.object({
  key: v.string(),
  command: v.string(),
  outline: v.string(),
  notes: v.string(),
  storyIds: v.array(v.string()),
  drafts: toneTexts,
  draftNotes: toneTexts,
  approvedTone: v.string(),
  approvedText: v.string(),
  updatedAt: v.number(),
});

export const subjectOptionValidator = v.object({ subject: v.string(), preview: v.string(), why: v.string() });

const schema = defineSchema({
  ...authTables,

  /** Local working copy of the "Story Queue" tab (synced to the sheet). */
  stories: defineTable({
    storyId: v.string(),
    issueDate: v.string(),
    tone: v.string(),
    section: v.string(),
    factBullets: v.string(),
    sourceUrls: v.string(),
    readerAction: v.string(),
    knownGaps: v.string(),
    sponsor: v.boolean(),
    sponsorName: v.string(),
    sponsorCopy: v.string(),
    sponsorUrl: v.string(),
    state: v.union(v.literal("queued"), v.literal("drafted"), v.literal("verified"), v.literal("cut")),
    headline: v.string(),
    draft: v.string(),
    claims: v.array(claimValidator),
    warnings: v.array(v.string()),
    editorNotes: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    draftCount: v.number(),
    lastDraftAt: v.optional(v.number()),
    lastDraftModel: v.optional(v.string()),
    /** Set when the editor typed into the draft after the last AI run. */
    editedByHand: v.optional(v.boolean()),
    ...syncFields,
  })
    .index("by_storyId", ["storyId"])
    .index("by_issueDate", ["issueDate"])
    .index("by_updatedAt", ["updatedAt"])
    .index("by_syncState", ["syncState"]),

  /** Local working copy of the "Issues" tab (synced to the sheet). */
  issues: defineTable({
    issueId: v.string(),
    issueDate: v.string(),
    issueType: v.union(v.literal("Tue news"), v.literal("Thu weekend"), v.literal("Sat food")),
    subject: v.string(),
    previewText: v.string(),
    opening: v.string(),
    storyIds: v.array(v.string()),
    eventPicks: v.array(eventPickValidator),
    business: v.union(v.null(), businessPickValidator),
    checklist: v.array(v.boolean()),
    status: v.union(v.literal("Draft"), v.literal("Approved"), v.literal("Exported"), v.literal("Sent")),
    exportedAt: v.optional(v.number()),
    exportedText: v.optional(v.string()),
    exportedHtml: v.optional(v.string()),
    sections: v.optional(v.array(sectionValidator)),
    subjectOptions: v.optional(v.array(subjectOptionValidator)),
    beehiivPostId: v.optional(v.string()),
    updatedAt: v.number(),
    ...syncFields,
  })
    .index("by_issueId", ["issueId"])
    .index("by_issueDate", ["issueDate"])
    .index("by_syncState", ["syncState"]),

  /** Permanently deleted stories. Pull skips these so a deleted story never comes back. */
  tombstones: defineTable({
    storyId: v.string(),
    sheetRowId: v.optional(v.string()),
    deletedAt: v.number(),
    /** pending: row still in the sheet; marked: row's State says Deleted; done: row is gone. */
    status: v.union(v.literal("pending"), v.literal("marked"), v.literal("done")),
    lastTryAt: v.optional(v.number()),
    message: v.optional(v.string()),
  })
    .index("by_storyId", ["storyId"])
    .index("by_status", ["status"]),

  /** Short-lived copies of the Events / Businesses tabs (5-minute cache). */
  feedCache: defineTable({ key: v.string(), fetchedAt: v.number(), payload: v.string() }).index("by_key", ["key"]),

  /** Row reservations so two saves never land on the same sheet row. */
  rowClaims: defineTable({ tab: v.string(), row: v.number(), at: v.number() }).index("by_tab_at", ["tab", "at"]),

  /** Sheet-sync status shown in the banner (single doc, key "sheets"). */
  syncMeta: defineTable({
    key: v.string(),
    status: v.union(v.literal("ok"), v.literal("paused"), v.literal("no_tabs"), v.literal("error"), v.literal("unknown")),
    message: v.string(),
    checkedAt: v.number(),
  }).index("by_key", ["key"]),
});

export default schema;
