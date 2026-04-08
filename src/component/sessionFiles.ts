import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import type Steel from "steel-sdk";
import type { Fileslist, File as SteelFile } from "steel-sdk/resources/files";

import { createSteelClient } from "./steel";
import {
  normalizeError,
  requireOwnerId,
  runWithNormalizedError,
  toTimestamp,
} from "./normalize";

interface SessionFileMetadata {
  sessionExternalId: string;
  path: string;
  size: number;
  lastModified: number;
  ownerId: string;
  lastSyncedAt: number;
}

const toSessionFileMetadata = (
  file: Fileslist.Data | SteelFile,
  sessionExternalId: string,
  ownerId: string,
  syncedAt: number,
): SessionFileMetadata => {
  if (!file.path) {
    throw normalizeError(
      "Session file metadata missing path",
      "sessionFiles.normalizeMetadata",
    );
  }

  return {
    sessionExternalId,
    path: file.path,
    size: file.size ?? 0,
    lastModified: toTimestamp(file.lastModified) ?? syncedAt,
    ownerId,
    lastSyncedAt: syncedAt,
  };
};

const buildUploadPayload = (
  args: {
    file?: string;
    url?: string;
    path?: string;
    fileArgs?: Record<string, unknown>;
  },
  operation: string,
): { file: unknown; path?: string } => {
  const file =
    typeof args.file === "string" && args.file.trim().length > 0
      ? args.file.trim()
      : undefined;
  const url =
    typeof args.url === "string" && args.url.trim().length > 0
      ? args.url.trim()
      : undefined;
  const source = file ?? url;

  if (!source) {
    throw normalizeError(`${operation} requires either file or url`, operation);
  }

  return {
    ...(args.fileArgs ?? {}),
    file: source,
    ...(args.path ? { path: args.path } : {}),
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
        q.eq("sessionExternalId", args.sessionExternalId).eq("path", args.path),
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
        q.eq("sessionExternalId", args.sessionExternalId).eq("path", args.path),
      )
      .unique();

    if (!record) {
      return;
    }

    if (record.ownerId && record.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for session file delete",
        "sessionFiles.delete",
      );
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

const uploadAction = action({
  args: {
    apiKey: v.string(),
    ownerId: v.optional(v.string()),
    sessionExternalId: v.string(),
    file: v.optional(v.string()),
    url: v.optional(v.string()),
    path: v.optional(v.string()),
    fileArgs: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const ownerId = requireOwnerId(args.ownerId, "sessionFiles.upload");
    const syncedAt = Date.now();

    const steel: Steel = createSteelClient(args.apiKey, {
      operation: "sessionFiles.upload",
    });

    const payload = buildUploadPayload(
      {
        file: args.file,
        url: args.url,
        path: args.path,
        fileArgs: args.fileArgs,
      },
      "sessionFiles.upload",
    );

    const result = await runWithNormalizedError("sessionFiles.upload", () =>
      // Cast payload — the SDK types expect Uploadable for `file`, but the
      // Convex action receives a plain string (URL / base64).
      steel.sessions.files.upload(
        args.sessionExternalId,
        payload as Parameters<typeof steel.sessions.files.upload>[1],
      ),
    );

    const metadata = toSessionFileMetadata(
      result,
      args.sessionExternalId,
      ownerId,
      syncedAt,
    );

    await runWithNormalizedError("sessionFiles.upsert", () =>
      ctx.runMutation(internal.sessionFiles.upsert, metadata),
    );

    return metadata;
  },
});

export const sessionFiles = {
  list: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessionFiles.list");
      const syncedAt = Date.now();

      const steel: Steel = createSteelClient(args.apiKey, {
        operation: "sessionFiles.list",
      });

      const response = await runWithNormalizedError("sessionFiles.list", () =>
        steel.sessions.files.list(args.sessionExternalId),
      );

      const items: SessionFileMetadata[] = [];
      for (const entry of response.data) {
        const metadata = toSessionFileMetadata(
          entry,
          args.sessionExternalId,
          ownerId,
          syncedAt,
        );
        await runWithNormalizedError("sessionFiles.upsert", () =>
          ctx.runMutation(internal.sessionFiles.upsert, metadata),
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
  // Backwards-compatible alias.
  uploadFromUrl: uploadAction,
  delete: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
      path: v.string(),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessionFiles.delete");
      const steel: Steel = createSteelClient(args.apiKey, {
        operation: "sessionFiles.delete",
      });

      await runWithNormalizedError("sessionFiles.delete", () =>
        steel.sessions.files.delete(args.sessionExternalId, args.path),
      );

      await runWithNormalizedError("sessionFiles.delete", () =>
        ctx.runMutation(internal.sessionFiles.deleteOne, {
          sessionExternalId: args.sessionExternalId,
          path: args.path,
          ownerId,
        }),
      );
    },
  }),
  deleteAll: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessionFiles.deleteAll");

      const steel: Steel = createSteelClient(args.apiKey, {
        operation: "sessionFiles.deleteAll",
      });

      await runWithNormalizedError("sessionFiles.deleteAll", () =>
        steel.sessions.files.deleteAll(args.sessionExternalId),
      );

      await runWithNormalizedError("sessionFiles.deleteAll", () =>
        ctx.runMutation(internal.sessionFiles.deleteAllForSession, {
          sessionExternalId: args.sessionExternalId,
          ownerId,
        }),
      );
    },
  }),
  upsert: upsertSessionFileMetadata,
  deleteOne: deleteSessionFileMetadata,
  deleteAllForSession: deleteAllSessionFileMetadata,
};

const sessionFilesDelete = sessionFiles.delete;

export const list = sessionFiles.list;
export const upload = sessionFiles.upload;
export const uploadFromUrl = sessionFiles.uploadFromUrl;
export { sessionFilesDelete as delete };
export const deleteAll = sessionFiles.deleteAll;
export const upsert = sessionFiles.upsert;
export const deleteOne = sessionFiles.deleteOne;
export const deleteAllForSession = sessionFiles.deleteAllForSession;
