import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import { createSteelClient, type Steel } from "./steel";
import {
  normalizeError,
  requireOwnerId,
  runWithNormalizedError,
  toTimestamp,
} from "./normalize";

interface GlobalFileMetadata {
  externalId: string;
  ownerId: string;
  path: string;
  name?: string;
  size?: number;
  lastModified?: number;
  sourceUrl?: string;
  mimeType?: string;
  lastSyncedAt: number;
}

const resolveFilePath = (
  path: string | undefined,
  externalId: string | undefined,
  operation: string,
): string => {
  const resolved = (path ?? externalId)?.trim();
  if (!resolved) {
    throw normalizeError(`${operation} requires path`, operation);
  }

  return resolved;
};

const upsertGlobalFileMetadata = internalMutation({
  args: {
    externalId: v.string(),
    ownerId: v.string(),
    name: v.optional(v.string()),
    path: v.optional(v.string()),
    size: v.optional(v.number()),
    lastModified: v.optional(v.number()),
    sourceUrl: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    lastSyncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("globalFiles")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (current && current.ownerId && current.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for existing global file record",
        "files.upsert",
      );
    }

    if (current !== null) {
      await ctx.db.patch(current._id, args);
      return;
    }

    await ctx.db.insert("globalFiles", args);
  },
});

const deleteGlobalFileMetadata = internalMutation({
  args: {
    externalId: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("globalFiles")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (!existing) {
      return;
    }

    if (existing.ownerId && existing.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for global file delete",
        "files.delete",
      );
    }

    await ctx.db.delete(existing._id);
  },
});

const toBase64 = (arrayBuffer: ArrayBuffer): string => {
  const globalBuffer = globalThis as unknown as {
    Buffer?: {
      from: (buffer: ArrayBuffer) => { toString: (encoding: string) => string };
    };
  };
  if (globalBuffer.Buffer) {
    return globalBuffer.Buffer.from(arrayBuffer).toString("base64");
  }

  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  if (typeof btoa === "function") {
    return btoa(binary);
  }

  throw normalizeError(
    "No base64 encoder available for files.download",
    "files.download",
  );
};

const normalizeDownloadResponse = async (
  response: Response,
): Promise<{
  base64: string;
  contentType?: string;
  status?: number;
  ok?: boolean;
}> => {
  const bytes = await response.arrayBuffer();
  const contentType = response.headers?.get?.("content-type") ?? undefined;

  return {
    base64: toBase64(bytes),
    ...(typeof contentType === "string" ? { contentType } : {}),
    ...(typeof response.status === "number" ? { status: response.status } : {}),
    ...(typeof response.ok === "boolean" ? { ok: response.ok } : {}),
  };
};

const uploadAction = action({
  args: {
    apiKey: v.string(),
    ownerId: v.optional(v.string()),
    file: v.optional(v.string()),
    url: v.optional(v.string()),
    path: v.optional(v.string()),
    fileArgs: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const ownerId = requireOwnerId(args.ownerId, "files.upload");
    const syncedAt = Date.now();
    const steel = createSteelClient(args.apiKey, { operation: "files.upload" });

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
      throw normalizeError(
        "files.upload requires either file or url",
        "files.upload",
      );
    }

    const result = await runWithNormalizedError("files.upload", () =>
      steel.files.upload({
        file: source as unknown as import("steel-sdk/uploads").Uploadable,
        ...(args.path ? { path: args.path } : {}),
      }),
    );

    const metadata: GlobalFileMetadata = {
      externalId: result.path,
      ownerId,
      path: result.path,
      size: result.size,
      lastModified: toTimestamp(result.lastModified),
      lastSyncedAt: syncedAt,
    };

    await runWithNormalizedError("files.upsert", () =>
      ctx.runMutation(internal.files.upsert, metadata),
    );

    return metadata;
  },
});

const downloadAction = action({
  args: {
    apiKey: v.string(),
    ownerId: v.optional(v.string()),
    path: v.optional(v.string()),
    externalId: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    requireOwnerId(args.ownerId, "files.download");
    const steel = createSteelClient(args.apiKey, {
      operation: "files.download",
    });

    const path = resolveFilePath(args.path, args.externalId, "files.download");
    const raw = await runWithNormalizedError("files.download", () =>
      steel.files.download(path),
    );
    return normalizeDownloadResponse(raw);
  },
});

export const files = {
  list: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "files.list");
      const steel = createSteelClient(args.apiKey, { operation: "files.list" });

      const response = await runWithNormalizedError("files.list", () =>
        steel.files.list(),
      );

      const syncedAt = Date.now();
      const items: GlobalFileMetadata[] = [];

      for (const file of response.data) {
        const metadata: GlobalFileMetadata = {
          externalId: file.path,
          ownerId,
          path: file.path,
          size: file.size,
          lastModified: toTimestamp(file.lastModified),
          lastSyncedAt: syncedAt,
        };

        await runWithNormalizedError("files.upsert", () =>
          ctx.runMutation(internal.files.upsert, metadata),
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
      path: v.optional(v.string()),
      externalId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "files.delete");
      const path = resolveFilePath(args.path, args.externalId, "files.delete");

      const steel = createSteelClient(args.apiKey, {
        operation: "files.delete",
      });
      await runWithNormalizedError("files.delete", () =>
        steel.files.delete(path),
      );

      await runWithNormalizedError("files.delete", () =>
        ctx.runMutation(internal.files.deleteOne, {
          externalId: path,
          ownerId,
        }),
      );
    },
  }),
  download: downloadAction,
  // Backwards-compatible alias.
  downloadToStorage: downloadAction,
  upsert: upsertGlobalFileMetadata,
  deleteOne: deleteGlobalFileMetadata,
};

const filesDelete = files.delete;

export const list = files.list;
export const upload = files.upload;
export const uploadFromUrl = files.uploadFromUrl;
export { filesDelete as delete };
export const download = files.download;
export const downloadToStorage = files.downloadToStorage;
export const upsert = files.upsert;
export const deleteOne = files.deleteOne;
