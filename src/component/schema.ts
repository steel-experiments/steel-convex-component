import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const sessionStatusValues = ["live", "released", "failed"] as const;
export type SessionStatus = (typeof sessionStatusValues)[number];

export const sessionStatus = v.union(
  v.literal("live"),
  v.literal("released"),
  v.literal("failed"),
);

export const vString = v.string();
export const vOptionalString = v.optional(v.string());
export const vNumber = v.number();
export const vOptionalNumber = v.optional(v.number());
export const vBoolean = v.boolean();
export const vOptionalBoolean = v.optional(v.boolean());
export const vOwnerId = vOptionalString;
export const vIncludeRaw = vOptionalBoolean;

export const schema = defineSchema({
  sessions: defineTable({
    externalId: vString,
    status: sessionStatus,
    createdAt: vNumber,
    updatedAt: vNumber,
    lastSyncedAt: vNumber,
    debugUrl: vOptionalString,
    sessionViewerUrl: vOptionalString,
    websocketUrl: vOptionalString,
    timeout: vOptionalNumber,
    duration: vOptionalNumber,
    creditsUsed: vOptionalNumber,
    eventCount: vOptionalNumber,
    proxyBytesUsed: vOptionalNumber,
    profileId: vOptionalString,
    region: vOptionalString,
    headless: vOptionalBoolean,
    isSelenium: vOptionalBoolean,
    userAgent: vOptionalString,
    raw: v.optional(v.any()),
    ownerId: vOwnerId,
  })
    .index("byExternalId", ["externalId"])
    .index("byStatus", ["status"])
    .index("byCreatedAt", ["createdAt"])
    .index("byOwnerId", ["ownerId"]),
  sessionFileMetadata: defineTable({
    sessionExternalId: vString,
    path: vString,
    size: vNumber,
    lastModified: vNumber,
    lastSyncedAt: vNumber,
    ownerId: vOwnerId,
  })
    .index("bySessionExternalId", ["sessionExternalId"])
    .index("bySessionExternalIdAndPath", ["sessionExternalId", "path"]),
  captchaStates: defineTable({
    sessionExternalId: vString,
    pageId: vString,
    url: vString,
    isSolvingCaptcha: vBoolean,
    lastUpdated: vOptionalNumber,
    ownerId: vOwnerId,
  })
    .index("bySessionExternalId", ["sessionExternalId"])
    .index("bySessionExternalIdAndPageId", ["sessionExternalId", "pageId"]),
});
