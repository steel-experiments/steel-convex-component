import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import {
  normalizeError,
  requireOwnerId,
  runWithNormalizedError,
  toTimestamp,
} from "./normalize";

import type {
  CaptchaStatusResponse,
  CaptchaSolveResponse,
  CaptchaSolveImageResponse,
  CaptchaSolveParams,
  CaptchaSolveImageParams,
} from "steel-sdk/resources/sessions/captchas";

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
        q
          .eq("sessionExternalId", args.sessionExternalId)
          .eq("pageId", args.pageId),
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

const runCaptchaStatus = async (
  steel: ReturnType<typeof createSteelClient>,
  sessionExternalId: string,
): Promise<CaptchaStatusResponse> => {
  return runWithNormalizedError("captchas.status", () =>
    steel.sessions.captchas.status(sessionExternalId),
  );
};

const runCaptchaSolve = async (
  steel: ReturnType<typeof createSteelClient>,
  sessionExternalId: string,
  params: CaptchaSolveParams,
): Promise<CaptchaSolveResponse> => {
  return runWithNormalizedError("captchas.solve", () =>
    steel.sessions.captchas.solve(sessionExternalId, params),
  );
};

const runCaptchaSolveImage = async (
  steel: ReturnType<typeof createSteelClient>,
  sessionExternalId: string,
  params: CaptchaSolveImageParams,
): Promise<CaptchaSolveImageResponse> => {
  return runWithNormalizedError("captchas.solveImage", () =>
    steel.sessions.captchas.solveImage(sessionExternalId, params),
  );
};

export const captchas = {
  status: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
      pageId: v.optional(v.string()),
      persistSnapshot: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "captchas.status");
      const syncedAt = Date.now();
      const steel = createSteelClient(args.apiKey, {
        operation: "captchas.status",
      });

      const states = await runCaptchaStatus(steel, args.sessionExternalId);

      if (args.persistSnapshot) {
        for (const state of states) {
          if (args.pageId && state.pageId !== args.pageId) {
            continue;
          }

          await runWithNormalizedError("captchas.upsert", () =>
            ctx.runMutation(internal.captchas.upsert, {
              sessionExternalId: args.sessionExternalId,
              pageId: state.pageId,
              url: state.url,
              isSolvingCaptcha: state.isSolvingCaptcha,
              lastUpdated:
                toTimestamp(state.lastUpdated) ??
                toTimestamp(state.created) ??
                syncedAt,
              ownerId,
            }),
          );
        }
      }

      if (args.pageId) {
        return states.find((state) => state.pageId === args.pageId) ?? null;
      }

      return states;
    },
  }),
  solve: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
      pageId: v.optional(v.string()),
      url: v.optional(v.string()),
      taskId: v.optional(v.string()),
      commandArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (_ctx, args) => {
      requireOwnerId(args.ownerId, "captchas.solve");

      const steel = createSteelClient(args.apiKey, {
        operation: "captchas.solve",
      });

      const params: CaptchaSolveParams = {
        ...(args.commandArgs ?? {}),
        ...(args.pageId ? { pageId: args.pageId } : {}),
        ...(args.url ? { url: args.url } : {}),
        ...(args.taskId ? { taskId: args.taskId } : {}),
      };

      return runCaptchaSolve(steel, args.sessionExternalId, params);
    },
  }),
  solveImage: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
      imageXPath: v.string(),
      inputXPath: v.string(),
      url: v.optional(v.string()),
      commandArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (_ctx, args) => {
      requireOwnerId(args.ownerId, "captchas.solveImage");

      const steel = createSteelClient(args.apiKey, {
        operation: "captchas.solveImage",
      });

      const params: CaptchaSolveImageParams = {
        ...(args.commandArgs ?? {}),
        imageXPath: args.imageXPath,
        inputXPath: args.inputXPath,
        ...(args.url ? { url: args.url } : {}),
      };

      return runCaptchaSolveImage(steel, args.sessionExternalId, params);
    },
  }),
  upsert: upsertCaptchaState,
};

export const status = captchas.status;
export const solve = captchas.solve;
export const solveImage = captchas.solveImage;
export const upsert = captchas.upsert;
