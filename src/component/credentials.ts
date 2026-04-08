import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import { type Steel, createSteelClient } from "./steel";
import {
  normalizeError,
  requireOwnerId,
  runWithNormalizedError,
  toTimestamp,
} from "./normalize";

import type {
  CredentialCreateResponse,
  CredentialUpdateResponse,
  CredentialListResponse,
  CredentialDeleteResponse,
  CredentialCreateParams,
  CredentialUpdateParams,
  CredentialListParams,
  CredentialDeleteParams,
} from "steel-sdk/resources/credentials";

interface CredentialMetadata {
  externalId: string;
  name?: string;
  service?: string;
  origin?: string;
  namespace?: string;
  createdAt?: number;
  updatedAt?: number;
  ownerId: string;
  lastSyncedAt: number;
}

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
  "value",
];

const isSecretKey = (key: string): boolean => {
  const normalized = key.toLowerCase();
  const withoutSeparators = normalized.replace(/[-_]/g, "");
  return SECRET_KEY_MARKERS.some(
    (marker) =>
      normalized.includes(marker) || withoutSeparators.includes(marker),
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

const normalizeCredentialExternalId = (
  namespace: string | undefined,
  origin: string | undefined,
  label: string | undefined,
): string => {
  return `${namespace ?? "default"}::${origin ?? "*"}::${label ?? "*"}`;
};

const parseCredentialExternalId = (
  externalId: string,
): { namespace?: string; origin?: string; label?: string } => {
  const [namespace, origin, label] = externalId.split("::");
  return {
    namespace: namespace && namespace !== "default" ? namespace : undefined,
    origin: origin && origin !== "*" ? origin : undefined,
    label: label && label !== "*" ? label : undefined,
  };
};

type CredentialResponseFields = Pick<
  CredentialCreateResponse,
  "createdAt" | "updatedAt" | "label" | "namespace" | "origin"
>;

const normalizeCredentialMetadata = (
  payload: CredentialResponseFields,
  ownerId: string,
  syncedAt: number,
  fallback?: {
    namespace?: string;
    origin?: string;
    label?: string;
  },
): CredentialMetadata => {
  const namespace = payload.namespace ?? fallback?.namespace;
  const origin = payload.origin ?? fallback?.origin;
  const label = payload.label ?? fallback?.label;

  const externalId = normalizeCredentialExternalId(namespace, origin, label);

  return {
    externalId,
    name: label,
    service: origin,
    origin,
    namespace,
    createdAt: toTimestamp(payload.createdAt),
    updatedAt: toTimestamp(payload.updatedAt),
    ownerId,
    lastSyncedAt: syncedAt,
  };
};

const upsertCredentialMetadata = internalMutation({
  args: {
    externalId: v.string(),
    name: v.optional(v.string()),
    service: v.optional(v.string()),
    origin: v.optional(v.string()),
    namespace: v.optional(v.string()),
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

const deleteCredentialMetadataByOriginNamespace = internalMutation({
  args: {
    ownerId: v.string(),
    origin: v.string(),
    namespace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("credentials")
      .withIndex("byOwnerId", (q) => q.eq("ownerId", args.ownerId))
      .collect();

    const targetNamespace = args.namespace ?? "default";

    for (const record of records) {
      if (record.ownerId && record.ownerId !== args.ownerId) {
        throw normalizeError(
          "ownerId mismatch for credential delete",
          "credentials.delete",
        );
      }

      const recordOrigin = record.origin;
      const recordNamespace = record.namespace ?? "default";
      if (recordOrigin === args.origin && recordNamespace === targetNamespace) {
        await ctx.db.delete(record._id);
      }
    }
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
      const steel: Steel = createSteelClient(args.apiKey, {
        operation: "credentials.create",
      });

      const input = (args.credentialArgs ?? {}) as CredentialCreateParams;
      const raw: CredentialCreateResponse = await runWithNormalizedError(
        "credentials.create",
        () => steel.credentials.create(input),
      );

      const metadata = normalizeCredentialMetadata(raw, ownerId, Date.now(), {
        namespace: input.namespace,
        origin: input.origin,
        label: input.label,
      });

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
      credentialArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "credentials.update");
      const steel: Steel = createSteelClient(args.apiKey, {
        operation: "credentials.update",
      });

      const input = (args.credentialArgs ?? {}) as CredentialUpdateParams;
      const raw: CredentialUpdateResponse = await runWithNormalizedError(
        "credentials.update",
        () => steel.credentials.update(input),
      );

      const metadata = normalizeCredentialMetadata(raw, ownerId, Date.now(), {
        namespace: input.namespace,
        origin: input.origin,
        label: input.label,
      });

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
      queryArgs: v.optional(v.record(v.string(), v.any())),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "credentials.list");
      const steel: Steel = createSteelClient(args.apiKey, {
        operation: "credentials.list",
      });

      const query = (args.queryArgs ?? {}) as CredentialListParams;
      const raw: CredentialListResponse = await runWithNormalizedError(
        "credentials.list",
        () => steel.credentials.list(query),
      );

      const syncedAt = Date.now();
      const normalizedItems: CredentialMetadata[] = [];

      for (const item of raw.credentials) {
        const metadata = normalizeCredentialMetadata(item, ownerId, syncedAt);
        await runWithNormalizedError("credentials.upsert", () =>
          ctx.runMutation(internal.credentials.upsert, metadata),
        );
        normalizedItems.push(metadata);
      }

      return {
        items: normalizedItems,
        hasMore: false,
      };
    },
  }),
  delete: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      origin: v.optional(v.string()),
      namespace: v.optional(v.string()),
      externalId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "credentials.delete");
      const steel: Steel = createSteelClient(args.apiKey, {
        operation: "credentials.delete",
      });

      const derived = args.externalId
        ? parseCredentialExternalId(args.externalId)
        : {};
      const origin = (args.origin ?? derived.origin)?.trim();
      if (!origin) {
        throw normalizeError(
          "credentials.delete requires origin",
          "credentials.delete",
        );
      }

      const namespace =
        (args.namespace ?? derived.namespace)?.trim() || undefined;
      const payload: CredentialDeleteParams = {
        origin,
        ...(namespace ? { namespace } : {}),
      };

      const result: CredentialDeleteResponse = await runWithNormalizedError(
        "credentials.delete",
        () => steel.credentials.delete(payload),
      );

      await runWithNormalizedError("credentials.deleteLocal", () =>
        ctx.runMutation(internal.credentials.removeByOriginNamespace, {
          ownerId,
          origin,
          ...(namespace ? { namespace } : {}),
        }),
      );

      return result;
    },
  }),
  upsert: upsertCredentialMetadata,
  remove: deleteCredentialMetadata,
  removeByOriginNamespace: deleteCredentialMetadataByOriginNamespace,
};

const credentialsDelete = credentials.delete;

export const create = credentials.create;
export const update = credentials.update;
export const list = credentials.list;
export { credentialsDelete as delete };
export const upsert = credentials.upsert;
export const remove = credentials.remove;
export const removeByOriginNamespace = credentials.removeByOriginNamespace;
