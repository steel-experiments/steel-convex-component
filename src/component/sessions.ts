import { action, internal, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import {
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
): UpsertSessionArgs => {
  const now = Date.now();
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
      now,
    updatedAt:
      pickFirstNumber(payload, ["updatedAt", "updated_at"]) ??
      pickFirstNumber(payload, ["updated"]) ??
      now,
    lastSyncedAt: now,
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

const normalizeListLimit = (limit: number | undefined): number => {
  const parsedLimit = Number.isFinite(limit) ? Math.floor(limit) : DEFAULT_LIST_LIMIT;
  return Math.max(1, Math.min(parsedLimit, MAX_LIST_LIMIT));
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
      const ownerId = normalizeOwnerId(args.ownerId);
      if (!ownerId) {
        throw normalizeError(
          "Missing ownerId: ownerId is required for sessions.create",
          "sessions.create",
        );
      }

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
      const ownerId = normalizeOwnerId(args.ownerId);
      if (!ownerId) {
        throw normalizeError(
          "Missing ownerId: ownerId is required for sessions.refresh",
          "sessions.refresh",
        );
      }

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
  upsert: upsertSession,
};
