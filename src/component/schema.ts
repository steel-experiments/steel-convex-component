import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const sessionStatus = v.union(
  v.literal("live"),
  v.literal("released"),
  v.literal("failed"),
);

export const schema = defineSchema({
  sessions: defineTable({
    externalId: v.string(),
    status: sessionStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSyncedAt: v.number(),
    debugUrl: v.optional(v.string()),
    sessionViewerUrl: v.optional(v.string()),
    websocketUrl: v.optional(v.string()),
    timeout: v.optional(v.number()),
    duration: v.optional(v.number()),
    creditsUsed: v.optional(v.number()),
    eventCount: v.optional(v.number()),
    proxyBytesUsed: v.optional(v.number()),
    profileId: v.optional(v.string()),
    region: v.optional(v.string()),
    headless: v.optional(v.boolean()),
    isSelenium: v.optional(v.boolean()),
    userAgent: v.optional(v.string()),
    raw: v.optional(v.any()),
    ownerId: v.optional(v.string()),
  })
    .index("byExternalId", ["externalId"])
    .index("byStatus", ["status"])
    .index("byCreatedAt", ["createdAt"])
    .index("byOwnerId", ["ownerId"]),
});
