import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import { normalizeError, normalizeOwnerId } from "./normalize";

type JsonObject = Record<string, unknown>;

type SteelExtensionsClient = {
  extensions?: {
    list?: (query?: Record<string, unknown>) => Promise<unknown>;
    uploadFromUrl?: (payload: Record<string, unknown>) => Promise<unknown>;
    updateFromUrl?: (payload: Record<string, unknown>) => Promise<unknown>;
    delete?: (id: string | Record<string, unknown>) => Promise<unknown>;
    deleteAll?: () => Promise<unknown>;
  };
};

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
  const parsedLimit = Number.isFinite(limit) ? Math.floor(limit) : DEFAULT_LIST_LIMIT;
  return Math.max(1, Math.min(parsedLimit, MAX_LIST_LIMIT));
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

const pickFirstBoolean = (value: JsonObject, keys: string[]): boolean | undefined => {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "boolean") {
      return candidate;
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

const normalizeUrlInput = (value: unknown, operation: string): string => {
  if (typeof value !== "string") {
    throw normalizeError(`URL must be a string for ${operation}`, operation);
  }

  const trimmed = value.trim();
  if (!trimmed.length) {
    throw normalizeError(`URL must be a non-empty string for ${operation}`, operation);
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }

    return parsed.toString();
  } catch {
    throw normalizeError(`URL must be a valid HTTP(S) URL for ${operation}`, operation);
  }
};

const normalizeExtensionArgs = (
  args: Record<string, unknown> | undefined,
  operation: string,
): Record<string, unknown> => {
  if (!args) {
    return {};
  }

  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw normalizeError(`Invalid extension args for ${operation}`, operation);
  }

  return { ...args };
};

const normalizeExtensionMetadata = (
  payload: JsonObject,
  ownerId: string,
  syncedAt: number,
): ExtensionMetadata => {
  const externalId = pickFirstString(payload, ["externalId", "extensionId", "id", "_id"]);
  if (!externalId) {
    throw normalizeError("Extension payload missing externalId", "extensions.normalize");
  }

  const sourceUrl = pickFirstString(payload, [
    "url",
    "sourceUrl",
    "source_url",
    "downloadUrl",
    "download_url",
  ]);

  return {
    externalId,
    ownerId,
    lastSyncedAt: syncedAt,
    name: pickFirstString(payload, ["name", "extensionName", "title"]),
    version: pickFirstString(payload, ["version", "versionName"]),
    description: pickFirstString(payload, ["description", "summary", "notes"]),
    sourceUrl,
    checksum: pickFirstString(payload, ["checksum", "hash", "digest"]),
    enabled: pickFirstBoolean(payload, ["enabled", "isEnabled"]),
  };
};

const normalizeListResponse = (
  operation: string,
  response: unknown,
): { items: JsonObject[]; hasMore: boolean; continuation?: string } => {
  if (!response) {
    throw normalizeError(`Invalid response from Steel extensions.list`, operation);
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
  } else if (Array.isArray(envelope.extensions)) {
    items = envelope.extensions;
  } else if (Array.isArray(envelope.results)) {
    items = envelope.results;
  } else if (Array.isArray(envelope.data)) {
    items = envelope.data;
  } else {
    throw normalizeError(`Invalid response from Steel extensions.list`, operation);
  }

  const continuation = (() => {
    const candidate = [
      "continueCursor",
      "nextCursor",
      "cursor",
      "pageCursor",
    ].find((key) => typeof (envelope as JsonObject)[key] === "string");
    return candidate ? String((envelope as JsonObject)[candidate]) : undefined;
  })();

  const hasMore = typeof envelope.hasMore === "boolean"
    ? envelope.hasMore
    : continuation !== undefined;

  return {
    items: items as JsonObject[],
    hasMore,
    continuation,
  };
};

const runExtensionsList = async (
  steel: ReturnType<typeof createSteelClient>,
  cursor: string | undefined,
  limit: number | undefined,
) => {
  const client = steel as SteelExtensionsClient;
  const listMethod = client.extensions?.list;
  if (!listMethod) {
    throw normalizeError("Steel extensions.list is not available", "extensions.list");
  }

  return runWithNormalizedError("extensions.list", () =>
    listMethod({
      ...(cursor ? { cursor } : {}),
      ...(limit !== undefined ? { limit } : {}),
    }),
  );
};

const callExtensionsUpload = async (
  steel: ReturnType<typeof createSteelClient>,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelExtensionsClient;
  const uploadMethod = client.extensions?.uploadFromUrl;
  if (!uploadMethod) {
    throw normalizeError("Steel extensions.uploadFromUrl is not available", "extensions.uploadFromUrl");
  }

  return runWithNormalizedError("extensions.uploadFromUrl", () => uploadMethod(payload));
};

const callExtensionsUpdate = async (
  steel: ReturnType<typeof createSteelClient>,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelExtensionsClient;
  const updateMethod = client.extensions?.updateFromUrl;
  if (!updateMethod) {
    throw normalizeError("Steel extensions.updateFromUrl is not available", "extensions.updateFromUrl");
  }

  return runWithNormalizedError("extensions.updateFromUrl", () => updateMethod(payload));
};

const callExtensionsDelete = async (
  steel: ReturnType<typeof createSteelClient>,
  externalId: string,
) => {
  const client = steel as SteelExtensionsClient;
  const deleteMethod = client.extensions?.delete;
  if (!deleteMethod) {
    throw normalizeError("Steel extensions.delete is not available", "extensions.delete");
  }

  try {
    return await runWithNormalizedError("extensions.delete", () => deleteMethod(externalId));
  } catch (error) {
    return runWithNormalizedError("extensions.delete", () => deleteMethod({ externalId }));
  }
};

const callExtensionsDeleteAll = async (steel: ReturnType<typeof createSteelClient>) => {
  const client = steel as SteelExtensionsClient;
  const deleteAllMethod = client.extensions?.deleteAll;
  if (!deleteAllMethod) {
    throw normalizeError("Steel extensions.deleteAll is not available", "extensions.deleteAll");
  }

  return runWithNormalizedError("extensions.deleteAll", () => deleteAllMethod());
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
      throw normalizeError("ownerId mismatch for extension delete", "extensions.delete");
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
      const limit = normalizeListLimit(args.limit);
      const syncedAt = Date.now();

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "extensions.list" },
      );
      const raw = await runExtensionsList(steel, args.cursor, limit);
      const normalizedList = normalizeListResponse("extensions.list", raw);

      const items = [] as ExtensionMetadata[];
      for (const item of normalizedList.items) {
        if (!item || typeof item !== "object") {
          continue;
        }

        const metadata = normalizeExtensionMetadata(item as JsonObject, ownerId, syncedAt);
        await runWithNormalizedError("extensions.upsert", () =>
          ctx.runMutation(internal.extensions.upsert, metadata),
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
      url: v.string(),
      extensionArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "extensions.uploadFromUrl");
      const url = normalizeUrlInput(args.url, "extensions.uploadFromUrl");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "extensions.uploadFromUrl" },
      );

      const payload = {
        ...normalizeExtensionArgs(args.extensionArgs, "extensions.uploadFromUrl"),
        url,
      };
      const rawResult = await callExtensionsUpload(steel, payload);

      if (!rawResult || typeof rawResult !== "object") {
        throw normalizeError(
          "Invalid response from Steel extensions.uploadFromUrl",
          "extensions.uploadFromUrl",
        );
      }

      const metadata = normalizeExtensionMetadata(rawResult as JsonObject, ownerId, Date.now());
      await runWithNormalizedError("extensions.upsert", () =>
        ctx.runMutation(internal.extensions.upsert, metadata),
      );

      return metadata;
    },
  }),
  updateFromUrl: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      externalId: v.string(),
      url: v.optional(v.string()),
      extensionArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "extensions.updateFromUrl");
      const sdkUrl = args.url === undefined ? undefined : normalizeUrlInput(args.url, "extensions.updateFromUrl");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "extensions.updateFromUrl" },
      );

      const payload = {
        ...normalizeExtensionArgs(args.extensionArgs, "extensions.updateFromUrl"),
        externalId: args.externalId,
        id: args.externalId,
        ...(sdkUrl ? { url: sdkUrl } : {}),
      };

      const rawResult = await callExtensionsUpdate(steel, payload);
      if (!rawResult || typeof rawResult !== "object") {
        throw normalizeError(
          "Invalid response from Steel extensions.updateFromUrl",
          "extensions.updateFromUrl",
        );
      }

      const metadata = normalizeExtensionMetadata(rawResult as JsonObject, ownerId, Date.now());
      await runWithNormalizedError("extensions.upsert", () =>
        ctx.runMutation(internal.extensions.upsert, metadata),
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
    handler: async (_ctx, args) => {
      requireOwnerId(args.ownerId, "extensions.delete");
      const ownerId = normalizeOwnerId(args.ownerId) ?? "";
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "extensions.delete" },
      );

      const result = await callExtensionsDelete(steel, args.externalId);
      await runWithNormalizedError("extensions.delete", () =>
        _ctx.runMutation(internal.extensions.deleteOne, {
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
    handler: async (_ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "extensions.deleteAll");

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "extensions.deleteAll" },
      );
      const result = await callExtensionsDeleteAll(steel);

      await runWithNormalizedError("extensions.deleteAll", () =>
        _ctx.runMutation(internal.extensions.deleteAllForOwner, {
          ownerId,
        }),
      );

      return result;
    },
  }),
  upsert: upsertExtensionMetadata,
  deleteOne: deleteExtensionMetadata,
  deleteAllForOwner: deleteAllExtensionMetadata,
};

const extensionsDelete = extensions.delete;

export const list = extensions.list;
export const uploadFromUrl = extensions.uploadFromUrl;
export const updateFromUrl = extensions.updateFromUrl;
export { extensionsDelete as delete };
export const deleteAll = extensions.deleteAll;
export const upsert = extensions.upsert;
export const deleteOne = extensions.deleteOne;
export const deleteAllForOwner = extensions.deleteAllForOwner;
