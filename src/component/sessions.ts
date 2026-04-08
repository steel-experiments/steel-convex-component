import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import type Steel from "steel-sdk";
import type {
  Session,
  SessionCreateParams,
  SessionComputerParams,
} from "steel-sdk/resources/sessions/sessions";
import { createSteelClient } from "./steel";
import {
  StructuredError,
  normalizeError,
  normalizeIncludeRaw,
  requireOwnerId,
  runWithNormalizedError,
  toTimestamp,
} from "./normalize";
import type { SessionStatus } from "./schema";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

interface UpsertSessionArgs {
  externalId: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  lastSyncedAt: number;
  debugUrl?: string;
  sessionViewerUrl?: string;
  websocketUrl?: string;
  timeout?: number;
  duration?: number;
  creditsUsed?: number;
  eventCount?: number;
  proxyBytesUsed?: number;
  profileId?: string;
  region?: string;
  headless?: boolean;
  isSelenium?: boolean;
  userAgent?: string;
  raw?: unknown;
  ownerId: string;
}

interface FailureResult {
  externalId?: string;
  message: string;
  operation: string;
}

interface RawSessionRecord {
  _id: string;
  _creationTime?: number;
  externalId: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  lastSyncedAt: number;
  debugUrl?: string;
  sessionViewerUrl?: string;
  websocketUrl?: string;
  timeout?: number;
  duration?: number;
  creditsUsed?: number;
  eventCount?: number;
  proxyBytesUsed?: number;
  profileId?: string;
  region?: string;
  headless?: boolean;
  isSelenium?: boolean;
  userAgent?: string;
  raw?: unknown;
  ownerId?: string;
}

const toSessionRecord = (
  session: Session,
  ownerId: string,
  syncedAt: number,
  includeRaw: boolean,
): UpsertSessionArgs => ({
  externalId: session.id,
  status: session.status,
  createdAt: toTimestamp(session.createdAt) ?? syncedAt,
  updatedAt: syncedAt,
  lastSyncedAt: syncedAt,
  debugUrl: session.debugUrl,
  sessionViewerUrl: session.sessionViewerUrl,
  websocketUrl: session.websocketUrl,
  timeout: session.timeout,
  duration: session.duration,
  creditsUsed: session.creditsUsed,
  eventCount: session.eventCount,
  proxyBytesUsed: session.proxyBytesUsed,
  profileId: session.profileId,
  region: session.region as string | undefined,
  headless: session.headless,
  isSelenium: session.isSelenium,
  userAgent: session.userAgent,
  ownerId,
  ...(includeRaw ? { raw: session as unknown } : {}),
});

const dbRecordToUpsertArgs = (session: RawSessionRecord): UpsertSessionArgs => {
  const ownerId = session.ownerId?.trim();
  if (!ownerId) {
    throw normalizeError("Session record missing ownerId", "sessions.record");
  }
  return {
    externalId: session.externalId,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    lastSyncedAt: session.lastSyncedAt,
    debugUrl: session.debugUrl,
    sessionViewerUrl: session.sessionViewerUrl,
    websocketUrl: session.websocketUrl,
    timeout: session.timeout,
    duration: session.duration,
    creditsUsed: session.creditsUsed,
    eventCount: session.eventCount,
    proxyBytesUsed: session.proxyBytesUsed,
    profileId: session.profileId,
    region: session.region,
    headless: session.headless,
    isSelenium: session.isSelenium,
    userAgent: session.userAgent,
    raw: session.raw,
    ownerId,
  };
};

const hasReleaseAlreadyDoneError = (error: unknown): boolean => {
  if (!(error instanceof StructuredError)) return false;
  if (
    error.code === "SESSION_ALREADY_RELEASED" ||
    error.code === "SESSION_ALREADY_RELEASING"
  )
    return true;
  if (error.status === 409) return true;
  const msg = error.message.toLowerCase();
  return ["already released", "already in released", "already not live"].some(
    (m) => msg.includes(m),
  );
};

const normalizeListLimit = (limit: number | undefined): number => {
  const n =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.floor(limit)
      : DEFAULT_LIST_LIMIT;
  return Math.max(1, Math.min(n, MAX_LIST_LIMIT));
};

const buildReleasedPayload = (
  session: RawSessionRecord,
  syncedAt: number,
): UpsertSessionArgs => ({
  ...dbRecordToUpsertArgs(session),
  status: "released",
  updatedAt: syncedAt,
  lastSyncedAt: syncedAt,
});

const assertSessionOwnerIfPresent = async (
  ctx: { runQuery: (...args: any[]) => Promise<any> },
  ownerId: string,
  externalId: string,
  operation: string,
): Promise<void> => {
  await runWithNormalizedError(operation, () =>
    ctx.runQuery(internal.sessions.getInternalByExternalId, {
      externalId,
      ownerId,
    }),
  );
};

const getInternalByExternalId = internalQuery({
  args: { externalId: v.string(), ownerId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    if (!session) return null;
    if (session.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for session lookup",
        "sessions.getInternalByExternalId",
      );
    }
    return session;
  },
});

const listInternalByOwner = internalQuery({
  args: {
    ownerId: v.string(),
    status: v.optional(
      v.union(v.literal("live"), v.literal("released"), v.literal("failed")),
    ),
    cursor: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("sessions")
      .withIndex("byOwnerId", (q) => q.eq("ownerId", args.ownerId));
    if (args.status) {
      q = q.filter((q) => q.eq(q.field("status"), args.status));
    }
    const items = await q.take(args.limit);
    return {
      items: items as RawSessionRecord[],
      hasMore: items.length === args.limit,
      continuation: undefined,
    };
  },
});

const upsertSession = internalMutation({
  args: {
    externalId: v.string(),
    status: v.union(
      v.literal("live"),
      v.literal("released"),
      v.literal("failed"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSyncedAt: v.number(),
    debugUrl: v.optional(v.string()),
    sessionViewerUrl: v.optional(v.string()),
    websocketUrl: v.optional(v.string()),
    timeout: v.optional(v.number()),
    duration: v.optional(v.number()),
    creditsUsed: v.optional(v.number()),
    eventCount: v.optional(v.number()),
    proxyBytesUsed: v.optional(v.number()),
    profileId: v.optional(v.string()),
    region: v.optional(v.string()),
    headless: v.optional(v.boolean()),
    isSelenium: v.optional(v.boolean()),
    userAgent: v.optional(v.string()),
    raw: v.optional(v.any()),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("sessions")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (current && current.ownerId && current.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for existing local session record",
        "sessions.upsert",
      );
    }

    if (current !== null) {
      await ctx.db.patch(current._id, args);
      return current._id;
    }
    return ctx.db.insert("sessions", args);
  },
});

const persistSession = (
  ctx: { runMutation: (...args: any[]) => Promise<any> },
  record: UpsertSessionArgs,
) =>
  runWithNormalizedError("sessions.upsert", () =>
    ctx.runMutation(internal.sessions.upsert, record),
  );

export const sessions = {
  create: action({
    args: {
      apiKey: v.string(),
      ownerId: v.string(),
      includeRaw: v.optional(v.boolean()),
      sessionArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessions.create");
      const now = Date.now();
      const steel = createSteelClient(args.apiKey, {
        operation: "sessions.create",
      });
      const session = await runWithNormalizedError("sessions.create", () =>
        steel.sessions.create(args.sessionArgs as SessionCreateParams),
      );
      const record = toSessionRecord(
        session,
        ownerId,
        now,
        normalizeIncludeRaw(args.includeRaw),
      );
      await persistSession(ctx, record);
      return record;
    },
  }),

  refresh: action({
    args: {
      apiKey: v.string(),
      externalId: v.string(),
      ownerId: v.string(),
      includeRaw: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessions.refresh");
      const now = Date.now();
      const steel = createSteelClient(args.apiKey, {
        operation: "sessions.refresh",
      });
      const session = await runWithNormalizedError("sessions.refresh", () =>
        steel.sessions.retrieve(args.externalId),
      );
      const record = toSessionRecord(
        session,
        ownerId,
        now,
        normalizeIncludeRaw(args.includeRaw),
      );
      await persistSession(ctx, record);
      return record;
    },
  }),

  get: query({
    args: { id: v.string(), ownerId: v.string() },
    handler: async (ctx, args) => {
      const session = (await ctx.db.get(
        args.id as any,
      )) as RawSessionRecord | null;
      if (!session) return null;
      const ownerId = requireOwnerId(args.ownerId, "sessions.get");
      if (session.ownerId !== ownerId) {
        throw normalizeError(
          "ownerId mismatch for session query",
          "sessions.get",
        );
      }
      return dbRecordToUpsertArgs(session);
    },
  }),

  getByExternalId: query({
    args: { externalId: v.string(), ownerId: v.string() },
    handler: async (ctx, args) => {
      const session = await ctx.db
        .query("sessions")
        .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
        .unique();
      if (!session) return null;
      const ownerId = requireOwnerId(args.ownerId, "sessions.getByExternalId");
      if (session.ownerId !== ownerId) {
        throw normalizeError(
          "ownerId mismatch for session query",
          "sessions.getByExternalId",
        );
      }
      return dbRecordToUpsertArgs(session);
    },
  }),

  refreshMany: action({
    args: {
      apiKey: v.string(),
      ownerId: v.string(),
      status: v.optional(
        v.union(v.literal("live"), v.literal("released"), v.literal("failed")),
      ),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
      includeRaw: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessions.refreshMany");
      const steel = createSteelClient(args.apiKey, {
        operation: "sessions.refreshMany",
      });
      const includeRaw = normalizeIncludeRaw(args.includeRaw);
      const limit = normalizeListLimit(args.limit);

      const page = await runWithNormalizedError("sessions.refreshMany", () =>
        steel.sessions.list({
          ...(args.status ? { status: args.status } : {}),
          ...(args.cursor ? { cursorId: args.cursor } : {}),
          limit,
        }),
      );

      const results: UpsertSessionArgs[] = [];
      const failures: FailureResult[] = [];

      // Use list data directly instead of N+1 retrieve calls
      for (const item of page.sessions) {
        try {
          const now = Date.now();
          const record = toSessionRecord(
            item as unknown as Session,
            ownerId,
            now,
            includeRaw,
          );
          await persistSession(ctx, record);
          results.push(record);
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : "Session refresh failed";
          failures.push({
            externalId: item.id,
            operation: "sessions.refreshMany.item",
            message: msg,
          });
        }
      }

      return {
        items: results,
        failures,
        hasMore: page.hasNextPage(),
        continuation:
          (() => {
            const info = page.nextPageInfo();
            if (!info) return undefined;
            if ("params" in info && info.params) {
              return String(info.params.cursorId ?? "");
            }
            return undefined;
          })() || undefined,
      };
    },
  }),

  computer: action({
    args: {
      apiKey: v.string(),
      ownerId: v.string(),
      externalId: v.string(),
      commandArgs: v.record(v.string(), v.any()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessions.computer");
      await assertSessionOwnerIfPresent(
        ctx,
        ownerId,
        args.externalId,
        "sessions.computer",
      );
      const steel = createSteelClient(args.apiKey, {
        operation: "sessions.computer",
      });
      return runWithNormalizedError("sessions.computer", () =>
        steel.sessions.computer(
          args.externalId,
          args.commandArgs as SessionComputerParams,
        ),
      );
    },
  }),

  context: action({
    args: { apiKey: v.string(), ownerId: v.string(), externalId: v.string() },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessions.context");
      await assertSessionOwnerIfPresent(
        ctx,
        ownerId,
        args.externalId,
        "sessions.context",
      );
      const steel = createSteelClient(args.apiKey, {
        operation: "sessions.context",
      });
      return runWithNormalizedError("sessions.context", () =>
        steel.sessions.context(args.externalId),
      );
    },
  }),

  events: action({
    args: { apiKey: v.string(), ownerId: v.string(), externalId: v.string() },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessions.events");
      await assertSessionOwnerIfPresent(
        ctx,
        ownerId,
        args.externalId,
        "sessions.events",
      );
      const steel = createSteelClient(args.apiKey, {
        operation: "sessions.events",
      });
      return runWithNormalizedError("sessions.events", () =>
        steel.sessions.events(args.externalId),
      );
    },
  }),

  liveDetails: action({
    args: { apiKey: v.string(), ownerId: v.string(), externalId: v.string() },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessions.liveDetails");
      await assertSessionOwnerIfPresent(
        ctx,
        ownerId,
        args.externalId,
        "sessions.liveDetails",
      );
      const steel = createSteelClient(args.apiKey, {
        operation: "sessions.liveDetails",
      });
      return runWithNormalizedError("sessions.liveDetails", () =>
        steel.sessions.liveDetails(args.externalId),
      );
    },
  }),

  list: query({
    args: {
      status: v.optional(
        v.union(v.literal("live"), v.literal("released"), v.literal("failed")),
      ),
      ownerId: v.string(),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const limit = normalizeListLimit(args.limit);
      const ownerId = requireOwnerId(args.ownerId, "sessions.list");

      let q = ctx.db
        .query("sessions")
        .withIndex("byOwnerId", (q) => q.eq("ownerId", ownerId));
      if (args.status) {
        q = q.filter((q) => q.eq(q.field("status"), args.status));
      }

      const items = await q.take(limit);
      return {
        items: items.map((s) => dbRecordToUpsertArgs(s as RawSessionRecord)),
        hasMore: items.length === limit,
        continuation: undefined,
      };
    },
  }),

  release: action({
    args: { apiKey: v.string(), externalId: v.string(), ownerId: v.string() },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessions.release");
      const now = Date.now();

      const existing = (await runWithNormalizedError(
        "sessions.getInternalByExternalId",
        () =>
          ctx.runQuery(internal.sessions.getInternalByExternalId, {
            externalId: args.externalId,
            ownerId,
          }),
      )) as RawSessionRecord | null;

      if (existing?.status === "released") {
        const released = buildReleasedPayload(existing, now);
        await persistSession(ctx, released);
        return released;
      }

      const steel = createSteelClient(args.apiKey, {
        operation: "sessions.release",
      });

      try {
        await runWithNormalizedError("sessions.release", () =>
          steel.sessions.release(args.externalId),
        );
      } catch (error) {
        if (!hasReleaseAlreadyDoneError(error)) throw error;
      }

      // Re-fetch to get final state
      try {
        const session = await runWithNormalizedError(
          "sessions.release.sync",
          () => steel.sessions.retrieve(args.externalId),
        );
        const record: UpsertSessionArgs = {
          ...toSessionRecord(session, ownerId, now, false),
          status: "released",
          updatedAt: now,
          lastSyncedAt: now,
        };
        await persistSession(ctx, record);
        return record;
      } catch {
        // If retrieve fails, fall back to local record
        if (!existing) {
          throw normalizeError(
            "Invalid response from Steel sessions.get during release sync",
            "sessions.release",
          );
        }
        const released = buildReleasedPayload(existing, now);
        await persistSession(ctx, released);
        return released;
      }
    },
  }),

  releaseAll: action({
    args: {
      apiKey: v.string(),
      ownerId: v.string(),
      status: v.optional(
        v.union(v.literal("live"), v.literal("released"), v.literal("failed")),
      ),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessions.releaseAll");
      const steel = createSteelClient(args.apiKey, {
        operation: "sessions.releaseAll",
      });
      const limit = normalizeListLimit(args.limit);

      const page = (await runWithNormalizedError(
        "sessions.listInternalByOwner",
        () =>
          ctx.runQuery(internal.sessions.listInternalByOwner, {
            ownerId,
            status: args.status,
            cursor: args.cursor,
            limit,
          }),
      )) as {
        items: RawSessionRecord[];
        hasMore: boolean;
        continuation?: string;
      };

      const results: UpsertSessionArgs[] = [];
      const failures: FailureResult[] = [];

      for (const session of page.items) {
        const releaseNow = Date.now();

        if (session.status === "released") {
          const released = buildReleasedPayload(session, releaseNow);
          await persistSession(ctx, released);
          results.push(released);
          continue;
        }

        try {
          await runWithNormalizedError("sessions.releaseAll.item", () =>
            steel.sessions.release(session.externalId),
          );

          try {
            const remote = await runWithNormalizedError(
              "sessions.releaseAll.sync",
              () => steel.sessions.retrieve(session.externalId),
            );
            const record: UpsertSessionArgs = {
              ...toSessionRecord(remote, ownerId, releaseNow, false),
              status: "released",
              updatedAt: releaseNow,
              lastSyncedAt: releaseNow,
            };
            await persistSession(ctx, record);
            results.push(record);
          } catch {
            const fallback = buildReleasedPayload(session, releaseNow);
            await persistSession(ctx, fallback);
            results.push(fallback);
          }
        } catch (error) {
          if (hasReleaseAlreadyDoneError(error)) {
            const released = buildReleasedPayload(session, releaseNow);
            await persistSession(ctx, released);
            results.push(released);
            continue;
          }
          const msg = error instanceof Error ? error.message : "Release failed";
          failures.push({
            externalId: session.externalId,
            operation: "sessions.releaseAll.item",
            message: msg,
          });
        }
      }

      return {
        items: results,
        failures,
        hasMore: page.hasMore,
        continuation: page.continuation,
      };
    },
  }),

  getInternalByExternalId,
  listInternalByOwner,
  upsert: upsertSession,
};

export const create = sessions.create;
export const refresh = sessions.refresh;
export const get = sessions.get;
export const getByExternalId = sessions.getByExternalId;
export const refreshMany = sessions.refreshMany;
export const computer = sessions.computer;
export const context = sessions.context;
export const events = sessions.events;
export const liveDetails = sessions.liveDetails;
export const list = sessions.list;
export const release = sessions.release;
export const releaseAll = sessions.releaseAll;
export const upsert = sessions.upsert;
export { getInternalByExternalId, listInternalByOwner };
