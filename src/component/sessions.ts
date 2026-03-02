import { action, internal, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import {
  StructuredError,
  normalizeError,
  normalizeIncludeRaw,
  normalizeOwnerId,
  normalizeSessionStatus,
} from "./normalize";
import type { SessionStatus } from "./schema";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

type JsonObject = Record<string, unknown>;

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

interface RefreshManyFailure {
  externalId?: string;
  message: string;
  operation: string;
}

interface ReleaseAllFailure {
  externalId: string;
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

type SteelSessionsClient = {
  sessions?: {
    create?: (args: Record<string, unknown>) => Promise<unknown>;
    get?: (id: string) => Promise<unknown>;
    list?: (query?: Record<string, unknown>) => Promise<unknown>;
    release?: (id: string) => Promise<unknown>;
  };
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

const pickFirstBoolean = (value: JsonObject, keys: string[]): boolean | undefined => {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "boolean") {
      return candidate;
    }
  }

  return undefined;
};

const requireOwnerId = (ownerId: string | undefined, operation: string): string => {
  const normalized = normalizeOwnerId(ownerId);
  if (!normalized) {
    throw normalizeError(
      `Missing ownerId: ownerId is required for ${operation}`,
      operation,
    );
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

const normalizeCreatePayload = (
  payload: JsonObject,
  ownerId: string,
  includeRaw: boolean,
  syncedAt: number,
): UpsertSessionArgs => {
  const externalId =
    pickFirstString(payload, ["externalId", "sessionExternalId", "sessionId", "id"]) ??
    undefined;
  if (!externalId) {
    throw normalizeError("Create response missing externalId", "sessions.create");
  }

  const status = normalizeSessionStatus(
    pickFirstString(payload, ["status"]) ?? "live",
  );

  return {
    externalId,
    status,
    createdAt:
      pickFirstNumber(payload, ["createdAt", "created_at"]) ??
      pickFirstNumber(payload, ["created"]) ??
      syncedAt,
    updatedAt:
      pickFirstNumber(payload, ["updatedAt", "updated_at"]) ??
      pickFirstNumber(payload, ["updated"]) ??
      syncedAt,
    lastSyncedAt: syncedAt,
    debugUrl: pickFirstString(payload, ["debugUrl", "debug_url"]),
    sessionViewerUrl: pickFirstString(payload, [
      "sessionViewerUrl",
      "session_viewer_url",
      "viewerUrl",
      "viewer_url",
    ]),
    websocketUrl: pickFirstString(payload, ["websocketUrl", "websocket_url"]),
    timeout: pickFirstNumber(payload, ["timeout"]),
    duration: pickFirstNumber(payload, ["duration"]),
    creditsUsed: pickFirstNumber(payload, ["creditsUsed", "credits_used"]),
    eventCount: pickFirstNumber(payload, ["eventCount", "event_count"]),
    proxyBytesUsed: pickFirstNumber(payload, ["proxyBytesUsed", "proxy_bytes_used"]),
    profileId: pickFirstString(payload, ["profileId", "profile_id"]),
    region: pickFirstString(payload, ["region"]),
    headless: pickFirstBoolean(payload, ["headless"]),
    isSelenium: pickFirstBoolean(payload, ["isSelenium", "is_selenium"]),
    userAgent: pickFirstString(payload, ["userAgent", "user_agent"]),
    ownerId,
    ...(includeRaw ? { raw: payload } : {}),
  };
};

const normalizeSessionRecord = (session: RawSessionRecord): UpsertSessionArgs => {
  const ownerId = normalizeOwnerId(session.ownerId);
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
  if (!(error instanceof StructuredError)) {
    return false;
  }

  if (error.code === "SESSION_ALREADY_RELEASED" || error.code === "SESSION_ALREADY_RELEASING") {
    return true;
  }

  if (error.status === 409) {
    return true;
  }

  const message = error.message.toLowerCase();
  return ["already released", "already released", "already in released", "already not live"].some(
    (marker) => message.includes(marker),
  );
};

const getSessionSyncTime = (): number => Date.now();

const getInternalByExternalId = internalQuery({
  args: {
    externalId: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (!session) {
      return null;
    }

    if (session.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for session lookup",
        "sessions.getInternalByExternalId",
      );
    }

    return session;
  },
});

const buildReleasedSessionPayload = (
  session: RawSessionRecord,
  syncedAt: number,
): UpsertSessionArgs => {
  const normalized = normalizeSessionRecord(session);
  return {
    ...normalized,
    status: "released",
    updatedAt: syncedAt,
    lastSyncedAt: syncedAt,
  };
};

const remoteRelease = async (
  steel: ReturnType<typeof createSteelClient>,
  externalId: string,
) => {
  const sessionClient = steel as SteelSessionsClient;
  if (!sessionClient.sessions?.release) {
    throw normalizeError("Steel sessions.release is not available", "sessions.release");
  }

  return runWithNormalizedError("sessions.release", () => sessionClient.sessions!.release!(externalId));
};

const remoteGetSession = async (steel: ReturnType<typeof createSteelClient>, externalId: string) => {
  const sessionClient = steel as SteelSessionsClient;
  if (!sessionClient.sessions?.get) {
    throw normalizeError("Steel sessions.get is not available", "sessions.release");
  }

  return runWithNormalizedError("sessions.get", () => sessionClient.sessions!.get!(externalId));
};

const normalizeListLimit = (limit: number | undefined): number => {
  const parsedLimit = Number.isFinite(limit) ? Math.floor(limit) : DEFAULT_LIST_LIMIT;
  return Math.max(1, Math.min(parsedLimit, MAX_LIST_LIMIT));
};

const normalizeListResponse = (
  operation: string,
  response: unknown,
): { items: JsonObject[]; hasMore: boolean; continuation?: string } => {
  if (!response) {
    throw normalizeError(`Invalid response from Steel sessions.list`, operation);
  }

  const envelope = response as JsonObject;
  if (Array.isArray(response)) {
    return {
      items: response,
      hasMore: false,
    };
  }

  let items: unknown;
  if (Array.isArray(envelope.items)) {
    items = envelope.items;
  } else if (Array.isArray(envelope.sessions)) {
    items = envelope.sessions;
  } else if (Array.isArray(envelope.results)) {
    items = envelope.results;
  } else if (Array.isArray(envelope.data)) {
    items = envelope.data;
  } else {
    throw normalizeError(`Invalid response from Steel sessions.list`, operation);
  }

  const continuation = pickFirstString(envelope, [
    "continueCursor",
    "nextCursor",
    "cursor",
    "pageCursor",
  ]);

  let hasMore: boolean;
  if (typeof envelope.hasMore === "boolean") {
    hasMore = envelope.hasMore;
  } else if (typeof envelope.isDone === "boolean") {
    hasMore = !envelope.isDone;
  } else {
    hasMore = continuation !== undefined;
  }

  return {
    items: items as JsonObject[],
    hasMore,
    continuation,
  };
};

const upsertSession = internalMutation({
  args: {
    externalId: v.string(),
    status: v.union(v.literal("live"), v.literal("released"), v.literal("failed")),
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

export const sessions = {
  create: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      includeRaw: v.optional(v.boolean()),
      sessionArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessions.create");
      const syncedAt = getSessionSyncTime();

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "sessions.create" },
      );
      const sessionInput = args.sessionArgs ?? {};

      const rawSession = await runWithNormalizedError("sessions.create", () =>
        steel.sessions.create(sessionInput as Record<string, unknown>),
      );
      if (!rawSession || typeof rawSession !== "object") {
        throw normalizeError("Invalid response from Steel sessions.create", "sessions.create");
      }

      const normalizedSession = normalizeWithError("sessions.create", () =>
        normalizeCreatePayload(
          rawSession as JsonObject,
          ownerId,
          normalizeIncludeRaw(args.includeRaw),
          syncedAt,
        ),
      );
      await runWithNormalizedError("sessions.upsert", () =>
        ctx.runMutation(internal.sessions.upsert, normalizedSession),
      );

      return normalizedSession;
    },
  }),
  refresh: action({
    args: {
      apiKey: v.string(),
      externalId: v.string(),
      ownerId: v.optional(v.string()),
      includeRaw: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessions.refresh");
      const syncedAt = getSessionSyncTime();

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "sessions.refresh" },
      );
      const rawSession = await runWithNormalizedError("sessions.refresh", () =>
        steel.sessions.get(args.externalId),
      );
      if (!rawSession || typeof rawSession !== "object") {
        throw normalizeError("Invalid response from Steel sessions.get", "sessions.refresh");
      }

      const normalizedSession = normalizeWithError("sessions.refresh", () =>
        normalizeCreatePayload(
          rawSession as JsonObject,
          ownerId,
          normalizeIncludeRaw(args.includeRaw),
          syncedAt,
        ),
      );
      await runWithNormalizedError("sessions.upsert", () =>
        ctx.runMutation(internal.sessions.upsert, normalizedSession),
      );

      return normalizedSession;
    },
  }),
  get: query({
    args: {
      id: v.string(),
      ownerId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      const session = await ctx.db.get(args.id);
      if (!session) {
        return null;
      }

      if (args.ownerId) {
        const ownerId = normalizeOwnerId(args.ownerId);
        if (!ownerId || session.ownerId !== ownerId) {
          throw normalizeError("ownerId mismatch for session query", "sessions.get");
        }
      }

      return normalizeWithError("sessions.get", () => normalizeSessionRecord(session));
    },
  }),
  getByExternalId: query({
    args: {
      externalId: v.string(),
      ownerId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      const session = await ctx.db
        .query("sessions")
        .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
        .unique();

      if (!session) {
        return null;
      }

      if (args.ownerId) {
        const ownerId = normalizeOwnerId(args.ownerId);
        if (!ownerId || session.ownerId !== ownerId) {
          throw normalizeError(
            "ownerId mismatch for session query",
            "sessions.getByExternalId",
          );
        }
      }

      return normalizeWithError("sessions.getByExternalId", () =>
        normalizeSessionRecord(session),
      );
    },
  }),
  refreshMany: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      status: v.optional(v.union(v.literal("live"), v.literal("released"), v.literal("failed"))),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
      includeRaw: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessions.refreshMany");

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "sessions.refreshMany" },
      );
      const limit = normalizeListLimit(args.limit);
      const includeRaw = normalizeIncludeRaw(args.includeRaw);

      const listArgs = {
        ...(args.status ? { status: args.status } : {}),
        ...(args.cursor ? { cursor: args.cursor } : {}),
        limit,
      };
      const listResponse = await runWithNormalizedError("sessions.refreshMany", () =>
        (steel as { sessions?: { list?: (query?: Record<string, unknown>) => Promise<unknown> } }).sessions
          ?.list?.(listArgs),
      );
      if (typeof listResponse !== "object") {
        throw normalizeError("Invalid response from Steel sessions.list", "sessions.refreshMany");
      }

      const { items, hasMore, continuation } = normalizeListResponse(
        "sessions.refreshMany",
        listResponse,
      );

      const results: UpsertSessionArgs[] = [];
      const failures: RefreshManyFailure[] = [];

      for (const raw of items) {
        const externalId = pickFirstString(raw, [
          "externalId",
          "sessionExternalId",
          "sessionId",
          "id",
        ]);
        if (!externalId) {
          failures.push({
            operation: "sessions.refreshMany.item",
            message: "Item missing externalId",
          });
          continue;
        }

        try {
          const syncedAt = getSessionSyncTime();
          const remoteSession = await runWithNormalizedError("sessions.refreshMany.item", () =>
            (steel as { sessions?: { get?: (id: string) => Promise<unknown> } }).sessions?.get?.(
              externalId,
            ),
          );
          if (!remoteSession || typeof remoteSession !== "object") {
            throw normalizeError("Invalid response from Steel sessions.get", "sessions.refreshMany.item");
          }

          const normalizedSession = normalizeWithError("sessions.refreshMany.item", () =>
            normalizeCreatePayload(remoteSession as JsonObject, ownerId, includeRaw, syncedAt),
          );
          const normalizedWithTimestamp = {
            ...normalizedSession,
            lastSyncedAt: syncedAt,
          };
          await runWithNormalizedError("sessions.upsert", () =>
            ctx.runMutation(internal.sessions.upsert, normalizedWithTimestamp),
          );
          results.push(normalizedWithTimestamp);
        } catch (error) {
          const structured = error instanceof Error ? error.message : "Session refresh failed";
          failures.push({ externalId, operation: "sessions.refreshMany.item", message: structured });
        }
      }

      return {
        items: results,
        failures,
        hasMore,
        continuation,
      };
    },
  }),
  list: query({
    args: {
      status: v.optional(v.union(v.literal("live"), v.literal("released"), v.literal("failed"))),
      ownerId: v.optional(v.string()),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const limit = normalizeListLimit(args.limit);
      const ownerId = normalizeOwnerId(args.ownerId);

      let sessionQuery = ctx.db.query("sessions").order("desc");

      if (args.status) {
        sessionQuery = sessionQuery.filter((q) => q.eq(q.field("status"), args.status));
      }

      if (ownerId) {
        sessionQuery = sessionQuery.filter((q) => q.eq(q.field("ownerId"), ownerId));
      }

      const page = await sessionQuery.paginate({
        numItems: limit,
        cursor: args.cursor,
      });

      return {
        items: page.page.map((session) =>
          normalizeWithError("sessions.list", () => normalizeSessionRecord(session)),
        ),
        hasMore: !page.isDone,
        continuation: page.isDone ? undefined : page.continueCursor,
      };
    },
  }),
  release: action({
    args: {
      apiKey: v.string(),
      externalId: v.string(),
      ownerId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessions.release");

      const now = getSessionSyncTime();
      const existing = await runWithNormalizedError("sessions.getInternalByExternalId", () =>
        ctx.runQuery(internal.sessions.getInternalByExternalId, {
          externalId: args.externalId,
          ownerId,
        }),
      );

      if (existing?.status === "released") {
        const released = buildReleasedSessionPayload(existing, now);
        await runWithNormalizedError("sessions.upsert", () =>
          ctx.runMutation(internal.sessions.upsert, released),
        );
        return released;
      }

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "sessions.release" },
      );

      try {
        await remoteRelease(steel, args.externalId);
      } catch (error) {
        const normalizedError = error instanceof StructuredError
          ? error
          : normalizeError(error, "sessions.release");
        if (!hasReleaseAlreadyDoneError(normalizedError)) {
          throw normalizedError;
        }
      }

      const remoteSession = await remoteGetSession(steel, args.externalId);
      if (remoteSession && typeof remoteSession === "object") {
        const normalizedSession = normalizeWithError("sessions.release", () =>
          normalizeCreatePayload(
            remoteSession as JsonObject,
            ownerId,
            false,
            now,
          ),
        );
        const released = {
          ...normalizedSession,
          status: "released" as const,
          updatedAt: now,
          lastSyncedAt: now,
        };
        await runWithNormalizedError("sessions.upsert", () =>
          ctx.runMutation(internal.sessions.upsert, released),
        );
        return released;
      }

      if (!existing) {
        throw normalizeError(
          "Invalid response from Steel sessions.get during release sync",
          "sessions.release",
        );
      }

      const released = buildReleasedSessionPayload(existing, now);
      await runWithNormalizedError("sessions.upsert", () =>
        ctx.runMutation(internal.sessions.upsert, released),
      );
      return released;
    },
  }),
  releaseAll: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      status: v.optional(
        v.union(v.literal("live"), v.literal("released"), v.literal("failed")),
      ),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessions.releaseAll");

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "sessions.releaseAll" },
      );
      const limit = normalizeListLimit(args.limit);

      let sessionQuery = ctx.db.query("sessions").order("desc");
      sessionQuery = sessionQuery.filter((q) => q.eq(q.field("ownerId"), ownerId));
      if (args.status) {
        sessionQuery = sessionQuery.filter((q) => q.eq(q.field("status"), args.status));
      }

      const page = await sessionQuery.paginate({ numItems: limit, cursor: args.cursor });
      const results: UpsertSessionArgs[] = [];
      const failures: ReleaseAllFailure[] = [];

      for (const session of page.page) {
        const releaseNow = Date.now();
        if (session.status === "released") {
          const released = buildReleasedSessionPayload(session, releaseNow);
          await runWithNormalizedError("sessions.upsert", () =>
            ctx.runMutation(internal.sessions.upsert, released),
          );
          results.push(released);
          continue;
        }

        try {
          await remoteRelease(steel, session.externalId);
          const remoteSession = await remoteGetSession(steel, session.externalId);
          if (remoteSession && typeof remoteSession === "object") {
            const normalizedSession = normalizeWithError("sessions.releaseAll.item", () =>
              normalizeCreatePayload(
                remoteSession as JsonObject,
                ownerId,
                false,
                releaseNow,
              ),
            );
            const released = {
              ...normalizedSession,
              status: "released" as const,
              updatedAt: releaseNow,
              lastSyncedAt: releaseNow,
            };
            await runWithNormalizedError("sessions.upsert", () =>
              ctx.runMutation(internal.sessions.upsert, released),
            );
            results.push(released);
            continue;
          }

          const fallback = buildReleasedSessionPayload(session, releaseNow);
          await runWithNormalizedError("sessions.upsert", () =>
            ctx.runMutation(internal.sessions.upsert, fallback),
          );
          results.push(fallback);
        } catch (error) {
          const normalizedError = error instanceof StructuredError
            ? error
            : normalizeError(error, "sessions.releaseAll.item");
          if (hasReleaseAlreadyDoneError(normalizedError)) {
            const released = buildReleasedSessionPayload(session, releaseNow);
            await runWithNormalizedError("sessions.upsert", () =>
              ctx.runMutation(internal.sessions.upsert, released),
            );
            results.push(released);
            continue;
          }

          failures.push({
            externalId: session.externalId,
            operation: "sessions.releaseAll.item",
            message: normalizedError.message,
          });
        }
      }

      return {
        items: results,
        failures,
        hasMore: !page.isDone,
        continuation: page.isDone ? undefined : page.continueCursor,
      };
    },
  }),
  getInternalByExternalId: getInternalByExternalId,
  upsert: upsertSession,
};
