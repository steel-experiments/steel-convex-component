// Placeholder module for captcha actions.
import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import { normalizeError, normalizeOwnerId } from "./normalize";

type JsonObject = Record<string, unknown>;

type SteelCaptchasClient = {
  captcha?: {
    status?: (args: Record<string, unknown>) => Promise<unknown>;
    solve?: (args: Record<string, unknown>) => Promise<unknown>;
    solveImage?: (args: Record<string, unknown>) => Promise<unknown>;
  };
};

interface CaptchaStatusArgs {
  sessionExternalId: string;
  pageId: string;
  url: string;
  isSolvingCaptcha: boolean;
  lastUpdated: number;
  ownerId: string;
}

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

const normalizeWithError = <T>(operation: string, handler: () => T): T => {
  try {
    return handler();
  } catch (error) {
    throw normalizeError(error, operation);
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

const normalizeCaptchaStatusPayload = (
  payload: JsonObject,
  sessionExternalId: string,
  pageId: string,
  syncedAt: number,
): CaptchaStatusArgs => {
  const resolvedSessionExternalId =
    pickFirstString(payload, ["sessionExternalId", "sessionId", "session_id", "externalId"]) ??
    sessionExternalId;
  if (!resolvedSessionExternalId) {
    throw normalizeError("Captcha status payload missing sessionExternalId", "captchas.status");
  }

  const resolvedPageId =
    pickFirstString(payload, ["pageId", "page_id", "pageId"]) ?? pageId;
  if (!resolvedPageId) {
    throw normalizeError("Captcha status payload missing pageId", "captchas.status");
  }

  const url = pickFirstString(payload, ["url", "captchaUrl", "pageUrl", "page_url"]) ?? "";

  return {
    sessionExternalId: resolvedSessionExternalId,
    pageId: resolvedPageId,
    url,
    isSolvingCaptcha: pickFirstBoolean(payload, [
      "isSolvingCaptcha",
      "is_solving_captcha",
      "solving",
      "isSolving",
    ]) ?? false,
    lastUpdated:
      pickFirstNumber(payload, [
        "lastUpdated",
        "last_updated",
        "updatedAt",
        "updated_at",
        "timestamp",
      ]) ?? syncedAt,
  };
};

const runCaptchaMethod = async (
  operation: "captchas.status" | "captchas.solve" | "captchas.solveImage",
  method: "status" | "solve" | "solveImage",
  steel: ReturnType<typeof createSteelClient>,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelCaptchasClient;
  const target = client.captcha?.[method];
  if (!target) {
    throw normalizeError(`Steel captcha.${method} is not available`, operation);
  }

  return runWithNormalizedError(operation, () => target(payload));
};

const upsertCaptchaState = internalMutation({
  args: {
    sessionExternalId: v.string(),
    pageId: v.string(),
    url: v.string(),
    isSolvingCaptcha: v.boolean(),
    lastUpdated: v.number(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("captchaStates")
      .withIndex("bySessionExternalIdAndPageId", (q) =>
        q.eq("sessionExternalId", args.sessionExternalId).eq("pageId", args.pageId),
      )
      .unique();

    if (current && current.ownerId && current.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for existing captcha state record",
        "captchas.upsert",
      );
    }

    if (current !== null) {
      await ctx.db.patch(current._id, args);
      return;
    }

    await ctx.db.insert("captchaStates", args);
  },
});

export const captchas = {
  status: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
      pageId: v.string(),
      persistSnapshot: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "captchas.status");
      const syncedAt = Date.now();
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "captchas.status" },
      );

      const payload = await runCaptchaMethod(
        "captchas.status",
        "status",
        steel,
        {
          sessionExternalId: args.sessionExternalId,
          pageId: args.pageId,
        },
      );

      if (!payload || typeof payload !== "object") {
        throw normalizeError("Invalid response from Steel captcha.status", "captchas.status");
      }

      if (args.persistSnapshot) {
        const snapshot = normalizeWithError("captchas.status", () =>
          normalizeCaptchaStatusPayload(
            payload as JsonObject,
            args.sessionExternalId,
            args.pageId,
            syncedAt,
          ),
        );
        await runWithNormalizedError("captchas.upsert", () =>
          ctx.runMutation(internal.captchas.upsert, {
            ...snapshot,
            ownerId,
          }),
        );
      }

      return payload;
    },
  }),
  solve: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
      pageId: v.string(),
      commandArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      requireOwnerId(args.ownerId, "captchas.solve");

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "captchas.solve" },
      );

      return await runCaptchaMethod(
        "captchas.solve",
        "solve",
        steel,
        {
          sessionExternalId: args.sessionExternalId,
          pageId: args.pageId,
          ...(args.commandArgs ?? {}),
        },
      );
    },
  }),
  solveImage: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
      pageId: v.string(),
      commandArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      requireOwnerId(args.ownerId, "captchas.solveImage");

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "captchas.solveImage" },
      );

      return await runCaptchaMethod(
        "captchas.solveImage",
        "solveImage",
        steel,
        {
          sessionExternalId: args.sessionExternalId,
          pageId: args.pageId,
          ...(args.commandArgs ?? {}),
        },
      );
    },
  }),
  upsert: upsertCaptchaState,
};
