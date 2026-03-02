import { action, query } from "./_generated/server";
import { v } from "convex/values";

import { components } from "./_generated/server";
import { SteelComponent } from "../../src/client/index.js";

const componentDefault = new SteelComponent(components.steel, {
  ownerId: "tenant-default",
});

const sessionStatus = v.union(v.literal("live"), v.literal("released"), v.literal("failed"));

const normalizeOwnerId = (ownerId: string | undefined): string => {
  const normalized = ownerId?.trim();
  if (!normalized) {
    throw new Error("ownerId is required for tenant-scoped Steel calls");
  }

  return normalized;
};

export const steelExample = {
  createSession: action({
    args: {
      ownerId: v.string(),
      sessionArgs: v.optional(v.record(v.string(), v.any())),
      includeRaw: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
      const ownerId = normalizeOwnerId(args.ownerId);
      return componentDefault.sessions.create(
        ctx,
        {
          sessionArgs: args.sessionArgs,
          includeRaw: args.includeRaw,
        },
        { ownerId },
      );
    },
  }),

  refreshSession: action({
    args: {
      ownerId: v.string(),
      externalId: v.string(),
      includeRaw: v.optional(v.boolean()),
    },
    handler: async (ctx, args) =>
      componentDefault.sessions.refresh(
        ctx,
        {
          externalId: args.externalId,
          includeRaw: args.includeRaw,
        },
        { ownerId: normalizeOwnerId(args.ownerId) },
      ),
  }),

  releaseSession: action({
    args: {
      ownerId: v.string(),
      externalId: v.string(),
    },
    handler: async (ctx, args) =>
      componentDefault.sessions.release(
        ctx,
        {
          externalId: args.externalId,
        },
        { ownerId: normalizeOwnerId(args.ownerId) },
      ),
  }),

  getSessionByExternalId: query({
    args: {
      ownerId: v.string(),
      externalId: v.string(),
    },
    handler: async (ctx, args) =>
      componentDefault.sessions.getByExternalId(
        ctx,
        {
          externalId: args.externalId,
        },
        { ownerId: normalizeOwnerId(args.ownerId) },
      ),
  }),

  listSessions: query({
    args: {
      ownerId: v.string(),
      status: v.optional(sessionStatus),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) =>
      componentDefault.sessions.list(
        ctx,
        {
          ownerId: args.ownerId,
          status: args.status,
          cursor: args.cursor,
          limit: args.limit,
        },
        { ownerId: normalizeOwnerId(args.ownerId) },
      ),
  }),

  runLifecycle: action({
    args: {
      ownerId: v.string(),
      sessionArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      const ownerId = normalizeOwnerId(args.ownerId);

      const created = await componentDefault.sessions.create(
        ctx,
        {
          sessionArgs: args.sessionArgs,
          includeRaw: false,
        },
        { ownerId },
      );

      const refreshed = await componentDefault.sessions.refresh(
        ctx,
        {
          externalId: created.externalId,
          includeRaw: false,
        },
        { ownerId },
      );

      const released = await componentDefault.sessions.release(
        ctx,
        {
          externalId: created.externalId,
        },
        { ownerId },
      );

      return {
        created,
        refreshed,
        released,
      };
    },
  }),
};
