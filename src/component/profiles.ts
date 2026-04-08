import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import type { Steel } from "steel-sdk";
import type {
  ProfileCreateResponse,
  ProfileUpdateResponse,
  ProfileListResponse,
  ProfileGetResponse,
} from "steel-sdk/resources/profiles";
import { createSteelClient } from "./steel";
import {
  normalizeError,
  requireOwnerId,
  runWithNormalizedError,
} from "./normalize";

interface ProfileMetadata {
  externalId: string;
  ownerId: string;
  lastSyncedAt: number;
  name?: string;
  userDataDir?: string;
  description?: string;
  raw?: unknown;
}

type ProfileResponse =
  | ProfileCreateResponse
  | ProfileUpdateResponse
  | ProfileGetResponse
  | ProfileListResponse.Profile;

const normalizeProfileMetadata = (
  profile: ProfileResponse,
  ownerId: string,
  syncedAt: number,
): ProfileMetadata => {
  if (!profile.id) {
    throw normalizeError("Profile payload missing id", "profiles.normalize");
  }

  return {
    externalId: profile.id,
    ownerId,
    lastSyncedAt: syncedAt,
    raw: profile,
  };
};

const upsertProfileMetadata = internalMutation({
  args: {
    externalId: v.string(),
    name: v.optional(v.string()),
    userDataDir: v.optional(v.string()),
    description: v.optional(v.string()),
    raw: v.optional(v.any()),
    ownerId: v.string(),
    lastSyncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("profiles")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (current && current.ownerId && current.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for existing local profile metadata",
        "profiles.upsert",
      );
    }

    if (current !== null) {
      await ctx.db.patch(current._id, args);
      return;
    }

    await ctx.db.insert("profiles", args);
  },
});

const createAction = action({
  args: {
    apiKey: v.string(),
    ownerId: v.optional(v.string()),
    profileArgs: v.optional(v.record(v.string(), v.any())),
    userDataDirUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerId = requireOwnerId(args.ownerId, "profiles.create");
    const steel: Steel = createSteelClient(args.apiKey, {
      operation: "profiles.create",
    });

    const payload: Record<string, unknown> = { ...(args.profileArgs ?? {}) };
    if (args.userDataDirUrl !== undefined) {
      const url = args.userDataDirUrl.trim();
      if (!url) {
        throw normalizeError(
          "userDataDirUrl must be non-empty for profiles.create",
          "profiles.create",
        );
      }
      payload.userDataDir = url;
    }

    const result = await runWithNormalizedError("profiles.create", () =>
      steel.profiles.create(payload as any),
    );

    const metadata = normalizeProfileMetadata(result, ownerId, Date.now());
    await runWithNormalizedError("profiles.upsert", () =>
      ctx.runMutation(internal.profiles.upsert, metadata),
    );

    return metadata;
  },
});

const updateAction = action({
  args: {
    apiKey: v.string(),
    ownerId: v.optional(v.string()),
    externalId: v.string(),
    profileArgs: v.optional(v.record(v.string(), v.any())),
    userDataDirUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerId = requireOwnerId(args.ownerId, "profiles.update");
    const steel: Steel = createSteelClient(args.apiKey, {
      operation: "profiles.update",
    });

    const payload: Record<string, unknown> = { ...(args.profileArgs ?? {}) };
    if (args.userDataDirUrl !== undefined) {
      const url = args.userDataDirUrl.trim();
      if (!url) {
        throw normalizeError(
          "userDataDirUrl must be non-empty for profiles.update",
          "profiles.update",
        );
      }
      payload.userDataDir = url;
    }

    const result = await runWithNormalizedError("profiles.update", () =>
      steel.profiles.update(args.externalId, payload as any),
    );

    const metadata = normalizeProfileMetadata(result, ownerId, Date.now());
    await runWithNormalizedError("profiles.upsert", () =>
      ctx.runMutation(internal.profiles.upsert, metadata),
    );

    return metadata;
  },
});

export const profiles = {
  list: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "profiles.list");
      const steel: Steel = createSteelClient(args.apiKey, {
        operation: "profiles.list",
      });

      const result = await runWithNormalizedError("profiles.list", () =>
        steel.profiles.list(),
      );

      const items: ProfileMetadata[] = [];
      const syncedAt = Date.now();

      for (const profile of result.profiles) {
        const metadata = normalizeProfileMetadata(profile, ownerId, syncedAt);
        await runWithNormalizedError("profiles.upsert", () =>
          ctx.runMutation(internal.profiles.upsert, metadata),
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
  get: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      externalId: v.string(),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "profiles.get");
      const steel: Steel = createSteelClient(args.apiKey, {
        operation: "profiles.get",
      });

      const result = await runWithNormalizedError("profiles.get", () =>
        steel.profiles.get(args.externalId),
      );

      const syncedAt = Date.now();
      const metadata = normalizeProfileMetadata(result, ownerId, syncedAt);
      await runWithNormalizedError("profiles.upsert", () =>
        ctx.runMutation(internal.profiles.upsert, metadata),
      );

      return metadata;
    },
  }),
  create: createAction,
  update: updateAction,
  // Backwards-compatible aliases.
  createFromUrl: createAction,
  updateFromUrl: updateAction,
  upsert: upsertProfileMetadata,
};

export const list = profiles.list;
export const get = profiles.get;
export const create = profiles.create;
export const update = profiles.update;
export const createFromUrl = profiles.createFromUrl;
export const updateFromUrl = profiles.updateFromUrl;
export const upsert = profiles.upsert;
