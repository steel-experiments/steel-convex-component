import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import { normalizeError, normalizeOwnerId } from "./normalize";

type JsonObject = Record<string, unknown>;

type SteelSessionFilesClient = {
  sessionFiles?: {
    list?: (args?: Record<string, unknown>) => Promise<unknown>;
    uploadFromUrl?: (args: Record<string, unknown>) => Promise<unknown>;
    delete?: (args: Record<string, unknown>) => Promise<unknown>;
    deleteAll?: (args: Record<string, unknown>) => Promise<unknown>;
  };
};

const requireOwnerId = (ownerId: string | undefined, operation: string): string => {
  const normalized = normalizeOwnerId(ownerId);
  if (!normalized) {
    throw normalizeError(`Missing ownerId: ownerId is required for ${operation}`, operation);
  }

  return normalized;
};

const runWithNormalizedError = async <T>(
  operation: string,
  handler: () => Promise<T>,
): Promise<T> => {
  try {
    return await handler();
  } catch (error) {
    throw normalizeError(error, operation);
  }
};

const pickFirstString = (value: JsonObject, keys: string[]): string | undefined => {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string") {
      const normalized = candidate.trim();
      if (normalized.length > 0) {
        return normalized;
      }
    }
  }

  return undefined;
};

const pickFirstNumber = (value: JsonObject, keys: string[]): number | undefined => {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }

  return undefined;
};

const normalizeSessionFileMetadata = (
  raw: JsonObject,
  sessionExternalId: string,
  ownerId: string,
  syncedAt: number,
): { sessionExternalId: string; path: string; size: number; lastModified: number; ownerId: string; lastSyncedAt: number } => {
  const fileSessionExternalId =
    pickFirstString(raw, ["sessionExternalId", "sessionId", "session_id"]) ?? sessionExternalId;
  const path = pickFirstString(raw, ["path", "filePath", "file_path", "name", "filename"]);
  if (!path) {
    throw normalizeError("Session file metadata missing path", "sessionFiles.normalizeMetadata");
  }

  const size = pickFirstNumber(raw, ["size", "byteCount", "bytes"]) ?? 0;
  const lastModified =
    pickFirstNumber(raw, ["lastModified", "last_modified", "modifiedAt", "modified_at"]) ?? syncedAt;

  return {
    sessionExternalId: fileSessionExternalId,
    path,
    size,
    lastModified,
    ownerId,
    lastSyncedAt: syncedAt,
  };
};

const normalizeListResponse = (
  operation: string,
  response: unknown,
): { items: JsonObject[]; hasMore: boolean; continuation?: string } => {
  if (!response) {
    throw normalizeError(`Invalid response from Steel sessionFiles.list`, operation);
  }

  if (Array.isArray(response)) {
    return {
      items: response,
      hasMore: false,
    };
  }

  const envelope = response as JsonObject;
  let items: unknown;
  if (Array.isArray(envelope.items)) {
    items = envelope.items;
  } else if (Array.isArray(envelope.files)) {
    items = envelope.files;
  } else if (Array.isArray(envelope.results)) {
    items = envelope.results;
  } else {
    throw normalizeError(`Invalid response from Steel sessionFiles.list`, operation);
  }

  const continuation = pickFirstString(envelope, [
    "continueCursor",
    "nextCursor",
    "cursor",
    "pageCursor",
  ]);

  const hasMore =
    typeof envelope.hasMore === "boolean"
      ? envelope.hasMore
      : continuation !== undefined;

  return {
    items: items as JsonObject[],
    hasMore,
    continuation,
  };
};

const upsertSessionFileMetadata = internalMutation({
  args: {
    sessionExternalId: v.string(),
    path: v.string(),
    size: v.number(),
    lastModified: v.number(),
    ownerId: v.string(),
    lastSyncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("sessionFileMetadata")
      .withIndex("bySessionExternalIdAndPath", (q) =>
        q
          .eq("sessionExternalId", args.sessionExternalId)
          .eq("path", args.path),
      )
      .unique();

    if (current && current.ownerId && current.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for existing local session file record",
        "sessionFiles.upsert",
      );
    }

    if (current !== null) {
      await ctx.db.patch(current._id, {
        sessionExternalId: args.sessionExternalId,
        path: args.path,
        size: args.size,
        lastModified: args.lastModified,
        ownerId: args.ownerId,
        lastSyncedAt: args.lastSyncedAt,
      });
      return;
    }

    await ctx.db.insert("sessionFileMetadata", args);
  },
});

const deleteSessionFileMetadata = internalMutation({
  args: {
    sessionExternalId: v.string(),
    path: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("sessionFileMetadata")
      .withIndex("bySessionExternalIdAndPath", (q) =>
        q
          .eq("sessionExternalId", args.sessionExternalId)
          .eq("path", args.path),
      )
      .unique();

    if (!record) {
      return;
    }

    if (record.ownerId && record.ownerId !== args.ownerId) {
      throw normalizeError("ownerId mismatch for session file delete", "sessionFiles.delete");
    }

    await ctx.db.delete(record._id);
  },
});

const deleteAllSessionFileMetadata = internalMutation({
  args: {
    sessionExternalId: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("sessionFileMetadata")
      .withIndex("bySessionExternalId", (q) =>
        q.eq("sessionExternalId", args.sessionExternalId),
      )
      .collect();

    for (const record of records) {
      if (record.ownerId && record.ownerId !== args.ownerId) {
        throw normalizeError(
          "ownerId mismatch for session file bulk delete",
          "sessionFiles.deleteAll",
        );
      }

      await ctx.db.delete(record._id);
    }
  },
});

const runSessionFilesList = async (
  steel: ReturnType<typeof createSteelClient>,
  sessionExternalId: string,
  cursor?: string,
  limit?: number,
) => {
  const client = steel as SteelSessionFilesClient;
  const listMethod = client.sessionFiles?.list;
  if (!listMethod) {
    throw normalizeError("Steel sessionFiles.list is not available", "sessionFiles.list");
  }

  return runWithNormalizedError("sessionFiles.list", () =>
    listMethod({
      sessionExternalId,
      ...(cursor ? { cursor } : {}),
      ...(limit !== undefined ? { limit } : {}),
    }),
  );
};

export const sessionFiles = {
  list: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessionFiles.list");
      const syncedAt = Date.now();

      const steel = createSteelClient({ apiKey: args.apiKey }, { operation: "sessionFiles.list" });
      const raw = await runSessionFilesList(steel, args.sessionExternalId, args.cursor, args.limit);
      const normalizedList = normalizeListResponse("sessionFiles.list", raw);

      const items = [] as ReturnType<typeof normalizeSessionFileMetadata>[];
      for (const item of normalizedList.items) {
        if (typeof item !== "object" || item === null) {
          continue;
        }

        const metadata = normalizeSessionFileMetadata(item, args.sessionExternalId, ownerId, syncedAt);
        await runWithNormalizedError("sessionFiles.upsert", () =>
          ctx.runMutation(internal.sessionFiles.upsert, metadata),
        );
        items.push(metadata);
      }

      return {
        items,
        hasMore: normalizedList.hasMore,
        continuation: normalizedList.continuation,
      };
    },
  }),
  uploadFromUrl: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
      url: v.string(),
      path: v.optional(v.string()),
      fileArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessionFiles.uploadFromUrl");
      const syncedAt = Date.now();

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "sessionFiles.uploadFromUrl" },
      );
      const client = steel as SteelSessionFilesClient;
      const uploadMethod = client.sessionFiles?.uploadFromUrl;
      if (!uploadMethod) {
        throw normalizeError(
          "Steel sessionFiles.uploadFromUrl is not available",
          "sessionFiles.uploadFromUrl",
        );
      }

      const payload = {
        sessionExternalId: args.sessionExternalId,
        url: args.url,
        ...(args.path ? { path: args.path } : {}),
        ...(args.fileArgs ?? {}),
      };

      const rawResult = await runWithNormalizedError("sessionFiles.uploadFromUrl", () =>
        uploadMethod(payload),
      );

      if (rawResult && typeof rawResult === "object") {
        const metadata = normalizeSessionFileMetadata(
          rawResult as JsonObject,
          args.sessionExternalId,
          ownerId,
          syncedAt,
        );

        await runWithNormalizedError("sessionFiles.upsert", () =>
          ctx.runMutation(internal.sessionFiles.upsert, metadata),
        );

        return metadata;
      }

      return rawResult;
    },
  }),
  delete: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
      path: v.string(),
    },
    handler: async (_ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessionFiles.delete");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "sessionFiles.delete" },
      );
      const client = steel as SteelSessionFilesClient;
      const deleteMethod = client.sessionFiles?.delete;
      if (!deleteMethod) {
        throw normalizeError("Steel sessionFiles.delete is not available", "sessionFiles.delete");
      }

      const result = await runWithNormalizedError("sessionFiles.delete", () =>
        deleteMethod({
          sessionExternalId: args.sessionExternalId,
          path: args.path,
        }),
      );

      await runWithNormalizedError("sessionFiles.delete", () =>
        _ctx.runMutation(internal.sessionFiles.delete, {
          sessionExternalId: args.sessionExternalId,
          path: args.path,
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
      sessionExternalId: v.string(),
    },
    handler: async (_ctx, args) => {
      requireOwnerId(args.ownerId, "sessionFiles.deleteAll");
      const ownerId = normalizeOwnerId(args.ownerId) ?? "";

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "sessionFiles.deleteAll" },
      );
      const client = steel as SteelSessionFilesClient;
      const deleteAllMethod = client.sessionFiles?.deleteAll;
      if (!deleteAllMethod) {
        throw normalizeError("Steel sessionFiles.deleteAll is not available", "sessionFiles.deleteAll");
      }

      const result = await runWithNormalizedError("sessionFiles.deleteAll", () =>
        deleteAllMethod({
          sessionExternalId: args.sessionExternalId,
        }),
      );

      await runWithNormalizedError("sessionFiles.deleteAll", () =>
        _ctx.runMutation(internal.sessionFiles.deleteAll, {
          sessionExternalId: args.sessionExternalId,
          ownerId,
        }),
      );

      return result;
    },
  }),
  upsert: upsertSessionFileMetadata,
  deleteOne: deleteSessionFileMetadata,
  deleteAllForSession: deleteAllSessionFileMetadata,
};
