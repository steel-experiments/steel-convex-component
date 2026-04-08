import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import {
  normalizeError,
  requireOwnerId,
  runWithNormalizedError,
} from "./normalize";

import type {
  ExtensionListResponse,
  ExtensionUploadResponse,
  ExtensionUpdateResponse,
  ExtensionDeleteResponse,
  ExtensionDeleteAllResponse,
  ExtensionDownloadResponse,
  ExtensionUploadParams,
  ExtensionUpdateParams,
} from "steel-sdk/resources/extensions";

interface ExtensionMetadata {
  externalId: string;
  ownerId: string;
  lastSyncedAt: number;
  name?: string;
  version?: string;
  description?: string;
  sourceUrl?: string;
  checksum?: string;
  enabled?: boolean;
}

const normalizeExtensionMetadata = (
  response: {
    id: string;
    name?: string;
    createdAt?: string;
    updatedAt?: string;
  },
  ownerId: string,
  syncedAt: number,
): ExtensionMetadata => {
  if (!response.id) {
    throw normalizeError(
      "Extension response missing id",
      "extensions.normalize",
    );
  }

  return {
    externalId: response.id,
    ownerId,
    lastSyncedAt: syncedAt,
    name: response.name,
  };
};

const upsertExtensionMetadata = internalMutation({
  args: {
    externalId: v.string(),
    name: v.optional(v.string()),
    version: v.optional(v.string()),
    description: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    checksum: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    ownerId: v.string(),
    lastSyncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("extensions")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (existing && existing.ownerId && existing.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for existing extension metadata",
        "extensions.upsert",
      );
    }

    if (existing !== null) {
      await ctx.db.patch(existing._id, args);
      return;
    }

    await ctx.db.insert("extensions", args);
  },
});

const deleteExtensionMetadata = internalMutation({
  args: {
    externalId: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("extensions")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (!existing) {
      return;
    }

    if (existing.ownerId && existing.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for extension delete",
        "extensions.delete",
      );
    }

    await ctx.db.delete(existing._id);
  },
});

const deleteAllExtensionMetadata = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("extensions")
      .withIndex("byOwnerId", (q) => q.eq("ownerId", args.ownerId))
      .collect();

    for (const record of records) {
      if (record.ownerId && record.ownerId !== args.ownerId) {
        throw normalizeError(
          "ownerId mismatch for extension bulk delete",
          "extensions.deleteAll",
        );
      }

      await ctx.db.delete(record._id);
    }
  },
});

const uploadAction = action({
  args: {
    apiKey: v.string(),
    ownerId: v.optional(v.string()),
    url: v.optional(v.string()),
    file: v.optional(v.string()),
    extensionArgs: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const ownerId = requireOwnerId(args.ownerId, "extensions.upload");
    const steel = createSteelClient(args.apiKey, {
      operation: "extensions.upload",
    });

    const params: ExtensionUploadParams = {};
    if (args.url !== undefined) {
      params.url = args.url;
    }

    const result: ExtensionUploadResponse = await runWithNormalizedError(
      "extensions.upload",
      () => steel.extensions.upload(params),
    );

    const metadata = normalizeExtensionMetadata(result, ownerId, Date.now());
    await runWithNormalizedError("extensions.upsert", () =>
      ctx.runMutation(internal.extensions.upsert, metadata),
    );

    return metadata;
  },
});

const updateAction = action({
  args: {
    apiKey: v.string(),
    ownerId: v.optional(v.string()),
    externalId: v.string(),
    url: v.optional(v.string()),
    file: v.optional(v.string()),
    extensionArgs: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const ownerId = requireOwnerId(args.ownerId, "extensions.update");
    const steel = createSteelClient(args.apiKey, {
      operation: "extensions.update",
    });

    const params: ExtensionUpdateParams = {};
    if (args.url !== undefined) {
      params.url = args.url;
    }

    const result: ExtensionUpdateResponse = await runWithNormalizedError(
      "extensions.update",
      () => steel.extensions.update(args.externalId, params),
    );

    const metadata = normalizeExtensionMetadata(result, ownerId, Date.now());
    await runWithNormalizedError("extensions.upsert", () =>
      ctx.runMutation(internal.extensions.upsert, metadata),
    );

    return metadata;
  },
});

export const extensions = {
  list: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "extensions.list");
      const syncedAt = Date.now();

      const steel = createSteelClient(args.apiKey, {
        operation: "extensions.list",
      });

      const response: ExtensionListResponse = await runWithNormalizedError(
        "extensions.list",
        () => steel.extensions.list(),
      );

      const items: ExtensionMetadata[] = [];
      for (const ext of response.extensions) {
        const metadata = normalizeExtensionMetadata(ext, ownerId, syncedAt);
        await runWithNormalizedError("extensions.upsert", () =>
          ctx.runMutation(internal.extensions.upsert, metadata),
        );
        items.push(metadata);
      }

      return {
        items,
        hasMore: false,
        continuation: undefined,
      };
    },
  }),
  upload: uploadAction,
  update: updateAction,
  // Backwards-compatible aliases.
  uploadFromUrl: uploadAction,
  updateFromUrl: updateAction,
  delete: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      externalId: v.string(),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "extensions.delete");
      const steel = createSteelClient(args.apiKey, {
        operation: "extensions.delete",
      });

      const result: ExtensionDeleteResponse = await runWithNormalizedError(
        "extensions.delete",
        () => steel.extensions.delete(args.externalId),
      );

      await runWithNormalizedError("extensions.delete", () =>
        ctx.runMutation(internal.extensions.deleteOne, {
          externalId: args.externalId,
          ownerId,
        }),
      );

      return result;
    },
  }),
  deleteAll: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "extensions.deleteAll");

      const steel = createSteelClient(args.apiKey, {
        operation: "extensions.deleteAll",
      });

      const result: ExtensionDeleteAllResponse = await runWithNormalizedError(
        "extensions.deleteAll",
        () => steel.extensions.deleteAll(),
      );

      await runWithNormalizedError("extensions.deleteAll", () =>
        ctx.runMutation(internal.extensions.deleteAllForOwner, {
          ownerId,
        }),
      );

      return result;
    },
  }),
  download: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      externalId: v.string(),
    },
    handler: async (_ctx, args) => {
      requireOwnerId(args.ownerId, "extensions.download");
      const steel = createSteelClient(args.apiKey, {
        operation: "extensions.download",
      });

      const result = await runWithNormalizedError("extensions.download", () =>
        steel.extensions.download(args.externalId),
      );

      return result as unknown as ExtensionDownloadResponse;
    },
  }),
  upsert: upsertExtensionMetadata,
  deleteOne: deleteExtensionMetadata,
  deleteAllForOwner: deleteAllExtensionMetadata,
};

const extensionsDelete = extensions.delete;

export const list = extensions.list;
export const upload = extensions.upload;
export const update = extensions.update;
export const uploadFromUrl = extensions.uploadFromUrl;
export const updateFromUrl = extensions.updateFromUrl;
export { extensionsDelete as delete };
export const deleteAll = extensions.deleteAll;
export const download = extensions.download;
export const upsert = extensions.upsert;
export const deleteOne = extensions.deleteOne;
export const deleteAllForOwner = extensions.deleteAllForOwner;
