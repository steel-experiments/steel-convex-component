import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import { normalizeError, normalizeOwnerId } from "./normalize";

type JsonObject = Record<string, unknown>;

type SteelFilesClient = {
  files?: {
    list?: (query?: Record<string, unknown>) => Promise<unknown>;
    uploadFromUrl?: (payload: Record<string, unknown>) => Promise<unknown>;
    delete?: (idOrPayload: string | Record<string, unknown>) => Promise<unknown>;
    downloadToStorage?: (payload: Record<string, unknown>) => Promise<unknown>;
  };
};

interface GlobalFileMetadata {
  externalId: string;
  ownerId: string;
  name?: string;
  path?: string;
  size?: number;
  lastModified?: number;
  sourceUrl?: string;
  mimeType?: string;
  lastSyncedAt: number;
}

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

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

const normalizeListLimit = (limit: number | undefined): number => {
  const parsed = Number.isFinite(limit) ? Math.floor(limit) : DEFAULT_LIST_LIMIT;
  return Math.max(1, Math.min(parsed, MAX_LIST_LIMIT));
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

const normalizeFileMetadata = (
  raw: JsonObject,
  ownerId: string,
  syncedAt: number,
): GlobalFileMetadata => {
  const externalId =
    pickFirstString(raw, ["externalId", "fileId", "id", "_id", "path"]) ?? "";
  if (!externalId) {
    throw normalizeError("Global file payload missing externalId", "files.normalizeMetadata");
  }

  return {
    externalId,
    ownerId,
    name: pickFirstString(raw, ["name", "fileName", "filename"]),
    path: pickFirstString(raw, ["path", "filePath", "file_path"]),
    size: pickFirstNumber(raw, ["size", "byteCount", "bytes"]),
    lastModified: pickFirstNumber(raw, [
      "lastModified",
      "last_modified",
      "modifiedAt",
      "modified_at",
      "updatedAt",
      "updated_at",
    ]),
    sourceUrl: pickFirstString(raw, [
      "url",
      "sourceUrl",
      "source_url",
      "downloadUrl",
      "download_url",
      "href",
    ]),
    mimeType: pickFirstString(raw, ["mimeType", "mime_type", "contentType", "content_type"]),
    lastSyncedAt: syncedAt,
  };
};

const normalizeListResponse = (
  operation: string,
  response: unknown,
): { items: JsonObject[]; hasMore: boolean; continuation?: string } => {
  if (!response) {
    throw normalizeError(`Invalid response from Steel files.list`, operation);
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
    throw normalizeError(`Invalid response from Steel files.list`, operation);
  }

  const continuation = ["continueCursor", "nextCursor", "cursor", "pageCursor"]
    .map((key) => (typeof envelope[key] === "string" ? String(envelope[key]) : undefined))
    .find((candidate) => candidate !== undefined);

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

const callFilesList = async (
  steel: ReturnType<typeof createSteelClient>,
  cursor: string | undefined,
  limit: number | undefined,
) => {
  const client = steel as SteelFilesClient;
  const listMethod = client.files?.list;
  if (!listMethod) {
    throw normalizeError("Steel files.list is not available", "files.list");
  }

  return runWithNormalizedError("files.list", () =>
    listMethod({
      ...(cursor ? { cursor } : {}),
      ...(limit !== undefined ? { limit } : {}),
    }),
  );
};

const callFilesUploadFromUrl = async (
  steel: ReturnType<typeof createSteelClient>,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelFilesClient;
  const uploadMethod = client.files?.uploadFromUrl;
  if (!uploadMethod) {
    throw normalizeError("Steel files.uploadFromUrl is not available", "files.uploadFromUrl");
  }

  return runWithNormalizedError("files.uploadFromUrl", () => uploadMethod(payload));
};

const callFilesDelete = async (
  steel: ReturnType<typeof createSteelClient>,
  fileIdentifier: string,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelFilesClient;
  const deleteMethod = client.files?.delete;
  if (!deleteMethod) {
    throw normalizeError("Steel files.delete is not available", "files.delete");
  }

  try {
    return await runWithNormalizedError("files.delete", () => deleteMethod(fileIdentifier));
  } catch {
    return runWithNormalizedError("files.delete", () => deleteMethod(payload));
  }
};

const callFilesDownloadToStorage = async (
  steel: ReturnType<typeof createSteelClient>,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelFilesClient;
  const downloadMethod = client.files?.downloadToStorage;
  if (!downloadMethod) {
    throw normalizeError(
      "Steel files.downloadToStorage is not available",
      "files.downloadToStorage",
    );
  }

  return runWithNormalizedError("files.downloadToStorage", () => downloadMethod(payload));
};

const buildDownloadPayload = (
  externalId: string | undefined,
  url: string | undefined,
  fileArgs: Record<string, unknown> | undefined,
) => {
  if (!externalId && !url) {
    throw normalizeError(
      "files.downloadToStorage requires either externalId or url",
      "files.downloadToStorage",
    );
  }

  return {
    ...(externalId ? { externalId } : {}),
    ...(url ? { url } : {}),
    ...(fileArgs ?? {}),
  };
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
      throw normalizeError("ownerId mismatch for global file delete", "files.delete");
    }

    await ctx.db.delete(existing._id);
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
      const limit = normalizeListLimit(args.limit);
      const steel = createSteelClient({ apiKey: args.apiKey }, { operation: "files.list" });
      const raw = await callFilesList(steel, args.cursor, limit);
      const normalizedList = normalizeListResponse("files.list", raw);
      const syncedAt = Date.now();

      const items = [] as GlobalFileMetadata[];
      for (const item of normalizedList.items) {
        if (!item || typeof item !== "object") {
          continue;
        }

        const normalized = normalizeFileMetadata(item as JsonObject, ownerId, syncedAt);
        await runWithNormalizedError("files.upsert", () =>
          ctx.runMutation(internal.files.upsert, normalized),
        );
        items.push(normalized);
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
      url: v.string(),
      path: v.optional(v.string()),
      name: v.optional(v.string()),
      fileArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "files.uploadFromUrl");
      const syncedAt = Date.now();
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "files.uploadFromUrl" },
      );

      const payload = {
        url: args.url,
        ...(args.path ? { path: args.path } : {}),
        ...(args.name ? { name: args.name } : {}),
        ...(args.fileArgs ?? {}),
      };

      const rawResult = await callFilesUploadFromUrl(steel, payload);
      if (!rawResult || typeof rawResult !== "object") {
        throw normalizeError(
          "Invalid response from Steel files.uploadFromUrl",
          "files.uploadFromUrl",
        );
      }

      const metadata = normalizeFileMetadata(rawResult as JsonObject, ownerId, syncedAt);
      await runWithNormalizedError("files.upsert", () =>
        ctx.runMutation(internal.files.upsert, metadata),
      );

      return metadata;
    },
  }),
  delete: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      externalId: v.string(),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "files.delete");
      const steel = createSteelClient({ apiKey: args.apiKey }, { operation: "files.delete" });
      const result = await callFilesDelete(steel, args.externalId, { externalId: args.externalId });

      await runWithNormalizedError("files.delete", () =>
        ctx.runMutation(internal.files.deleteOne, {
          externalId: args.externalId,
          ownerId,
        }),
      );

      return result;
    },
  }),
  downloadToStorage: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      externalId: v.optional(v.string()),
      url: v.optional(v.string()),
      fileArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "files.downloadToStorage");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "files.downloadToStorage" },
      );

      const payload = buildDownloadPayload(
        args.externalId,
        typeof args.url === "string" ? args.url : undefined,
        args.fileArgs,
      );

      const result = await callFilesDownloadToStorage(steel, payload);
      if (result && typeof result === "object") {
        const syncedAt = Date.now();
        try {
          const metadata = normalizeFileMetadata(result as JsonObject, ownerId, syncedAt);
          await runWithNormalizedError("files.upsert", () =>
            ctx.runMutation(internal.files.upsert, metadata),
          );
        } catch {
          // Best-effort metadata persistence when response includes recognized fields.
        }
      }

      return result;
    },
  }),
  upsert: upsertGlobalFileMetadata,
  deleteOne: deleteGlobalFileMetadata,
};

const filesDelete = files.delete;

export const list = files.list;
export const uploadFromUrl = files.uploadFromUrl;
export { filesDelete as delete };
export const downloadToStorage = files.downloadToStorage;
export const upsert = files.upsert;
export const deleteOne = files.deleteOne;
