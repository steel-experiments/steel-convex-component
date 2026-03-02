import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import { normalizeError, normalizeOwnerId } from "./normalize";

type JsonObject = Record<string, unknown>;

type SteelCredentialsClient = {
  credentials?: {
    create?: (args: Record<string, unknown>) => Promise<unknown>;
    update?: (args: Record<string, unknown>) => Promise<unknown>;
    list?: (query?: Record<string, unknown>) => Promise<unknown>;
    delete?: (id: string) => Promise<unknown>;
  };
};

interface CredentialMetadata {
  externalId: string;
  name?: string;
  service?: string;
  type?: string;
  username?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt?: number;
  updatedAt?: number;
  ownerId: string;
  lastSyncedAt: number;
}

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;
const SECRET_KEY_MARKERS = [
  "secret",
  "password",
  "token",
  "apikey",
  "api_key",
  "access_token",
  "refresh_token",
  "private_key",
  "client_secret",
  "credential",
];

const requireOwnerId = (ownerId: string | undefined, operation: string): string => {
  const normalized = normalizeOwnerId(ownerId);
  if (!normalized) {
    throw normalizeError(`Missing ownerId: ownerId is required for ${operation}`, operation);
  }

  return normalized;
};

const normalizeWithError = <T>(operation: string, handler: () => T): T => {
  try {
    return handler();
  } catch (error) {
    throw normalizeError(error, operation);
  }
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

const isSecretKey = (key: string): boolean => {
  const normalized = key.toLowerCase();
  const withoutSeparators = normalized.replace(/[-_]/g, "");
  return SECRET_KEY_MARKERS.some(
    (marker) => normalized.includes(marker) || withoutSeparators.includes(marker),
  );
};

const sanitizeSecretValues = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSecretValues(item));
  }

  if (value !== null && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(objectValue)) {
      if (isSecretKey(key)) {
        continue;
      }
      sanitized[key] = sanitizeSecretValues(objectValue[key]);
    }
    return sanitized;
  }

  return value;
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

const pickFirstObject = (
  value: JsonObject,
  keys: string[],
): Record<string, unknown> | undefined => {
  for (const key of keys) {
    const candidate = value[key];
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
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

const normalizeCredentialMetadata = (
  payload: JsonObject,
  ownerId: string,
  syncedAt: number,
): CredentialMetadata => {
  const externalId = pickFirstString(payload, ["externalId", "credentialId", "id", "_id"]);
  if (!externalId) {
    throw normalizeError("Credential payload missing externalId", "credentials.normalize");
  }

  const rawMetadata = pickFirstObject(payload, ["metadata", "meta", "details"]) ??
    (pickFirstObject(payload, ["extra"]) as Record<string, unknown> | undefined);

  const sanitizedMetadata = rawMetadata && Object.keys(rawMetadata).length > 0
    ? (sanitizeSecretValues(rawMetadata) as Record<string, unknown>)
    : undefined;

  return {
    externalId,
    name: pickFirstString(payload, ["name", "credentialName"]),
    service: pickFirstString(payload, ["service", "provider", "site"]),
    type: pickFirstString(payload, ["type", "kind"]),
    username: pickFirstString(payload, ["username", "user", "login"]),
    description: pickFirstString(payload, ["description", "summary"]),
    metadata: sanitizedMetadata,
    createdAt: pickFirstNumber(payload, ["createdAt", "created_at", "created"]),
    updatedAt: pickFirstNumber(payload, ["updatedAt", "updated_at", "updated"]),
    ownerId,
    lastSyncedAt: syncedAt,
  };
};

const normalizeListResponse = (
  operation: string,
  response: unknown,
): { items: JsonObject[]; hasMore: boolean; continuation?: string } => {
  if (!response) {
    throw normalizeError(`Invalid response from Steel credentials.list`, operation);
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
  } else if (Array.isArray(envelope.credentials)) {
    items = envelope.credentials;
  } else if (Array.isArray(envelope.results)) {
    items = envelope.results;
  } else if (Array.isArray(envelope.data)) {
    items = envelope.data;
  } else {
    throw normalizeError(`Invalid response from Steel credentials.list`, operation);
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

const normalizeCredentialArgs = (args: Record<string, unknown> | undefined, operation: string) => {
  if (!args) {
    return {};
  }

  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw normalizeError(`Invalid credential args for ${operation}`, operation);
  }

  return { ...args };
};

const buildCredentialUpdatePayload = (
  externalId: string,
  credentialArgs: Record<string, unknown> | undefined,
) => {
  return {
    ...normalizeCredentialArgs(credentialArgs, "credentials.update"),
    id: externalId,
    credentialId: externalId,
    externalId,
  };
};

const callCredentialsCreate = async (
  steel: ReturnType<typeof createSteelClient>,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelCredentialsClient;
  const createMethod = client.credentials?.create;
  if (!createMethod) {
    throw normalizeError("Steel credentials.create is not available", "credentials.create");
  }

  return runWithNormalizedError("credentials.create", () => createMethod(payload));
};

const callCredentialsUpdate = async (
  steel: ReturnType<typeof createSteelClient>,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelCredentialsClient;
  const updateMethod = client.credentials?.update;
  if (!updateMethod) {
    throw normalizeError("Steel credentials.update is not available", "credentials.update");
  }

  return runWithNormalizedError("credentials.update", () => updateMethod(payload));
};

const callCredentialsList = async (
  steel: ReturnType<typeof createSteelClient>,
  cursor: string | undefined,
  limit: number | undefined,
) => {
  const client = steel as SteelCredentialsClient;
  const listMethod = client.credentials?.list;
  if (!listMethod) {
    throw normalizeError("Steel credentials.list is not available", "credentials.list");
  }

  return runWithNormalizedError("credentials.list", () =>
    listMethod({
      ...(cursor ? { cursor } : {}),
      ...(limit !== undefined ? { limit } : {}),
    }),
  );
};

const callCredentialsDelete = async (
  steel: ReturnType<typeof createSteelClient>,
  externalId: string,
) => {
  const client = steel as SteelCredentialsClient;
  const deleteMethod = client.credentials?.delete;
  if (!deleteMethod) {
    throw normalizeError("Steel credentials.delete is not available", "credentials.delete");
  }

  return runWithNormalizedError("credentials.delete", () => deleteMethod(externalId));
};

const upsertCredentialMetadata = internalMutation({
  args: {
    externalId: v.string(),
    name: v.optional(v.string()),
    service: v.optional(v.string()),
    type: v.optional(v.string()),
    username: v.optional(v.string()),
    description: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    ownerId: v.string(),
    lastSyncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("credentials")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (existing && existing.ownerId && existing.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for existing local credential record",
        "credentials.upsert",
      );
    }

    if (existing !== null) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return ctx.db.insert("credentials", args);
  },
});

const deleteCredentialMetadata = internalMutation({
  args: {
    externalId: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("credentials")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (!existing) {
      return;
    }

    if (existing.ownerId && existing.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for credential delete",
        "credentials.delete",
      );
    }

    await ctx.db.delete(existing._id);
  },
});

export const credentials = {
  create: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      credentialArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "credentials.create");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "credentials.create" },
      );

      const payload = normalizeCredentialArgs(args.credentialArgs, "credentials.create");
      const raw = await callCredentialsCreate(steel, payload);
      if (!raw || typeof raw !== "object") {
        throw normalizeError("Invalid response from Steel credentials.create", "credentials.create");
      }

      const metadata = normalizeWithError("credentials.create", () =>
        normalizeCredentialMetadata(raw as JsonObject, ownerId, Date.now()),
      );

      await runWithNormalizedError("credentials.upsert", () =>
        ctx.runMutation(internal.credentials.upsert, metadata),
      );

      return metadata;
    },
  }),
  update: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      externalId: v.string(),
      credentialArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "credentials.update");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "credentials.update" },
      );

      const payload = buildCredentialUpdatePayload(
        args.externalId,
        normalizeCredentialArgs(args.credentialArgs, "credentials.update"),
      );
      const raw = await callCredentialsUpdate(steel, payload);
      if (!raw || typeof raw !== "object") {
        throw normalizeError("Invalid response from Steel credentials.update", "credentials.update");
      }

      const metadata = normalizeWithError("credentials.update", () =>
        normalizeCredentialMetadata(raw as JsonObject, ownerId, Date.now()),
      );

      await runWithNormalizedError("credentials.upsert", () =>
        ctx.runMutation(internal.credentials.upsert, metadata),
      );

      return metadata;
    },
  }),
  list: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "credentials.list");
      const limit = normalizeListLimit(args.limit);
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "credentials.list" },
      );

      const raw = await callCredentialsList(steel, args.cursor, limit);
      const normalizedList = normalizeListResponse("credentials.list", raw);
      const syncedAt = Date.now();

      const items: CredentialMetadata[] = [];
      for (const item of normalizedList.items) {
        if (!item || typeof item !== "object") {
          continue;
        }

        const metadata = normalizeWithError("credentials.list", () =>
          normalizeCredentialMetadata(item, ownerId, syncedAt),
        );
        await runWithNormalizedError("credentials.upsert", () =>
          ctx.runMutation(internal.credentials.upsert, metadata),
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
  delete: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      externalId: v.string(),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "credentials.delete");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "credentials.delete" },
      );

      const result = await callCredentialsDelete(steel, args.externalId);
      await runWithNormalizedError("credentials.deleteLocal", () =>
        ctx.runMutation(internal.credentials.remove, {
          externalId: args.externalId,
          ownerId,
        }),
      );

      return result;
    },
  }),
  upsert: upsertCredentialMetadata,
  remove: deleteCredentialMetadata,
};

const credentialsDelete = credentials.delete;

export const create = credentials.create;
export const update = credentials.update;
export const list = credentials.list;
export { credentialsDelete as delete };
export const upsert = credentials.upsert;
export const remove = credentials.remove;
