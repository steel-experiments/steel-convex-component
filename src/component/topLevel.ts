import { action } from "./_generated/server";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import {
  normalizeError,
  normalizeOwnerId,
} from "./normalize";

type JsonObject = Record<string, unknown>;

type SteelTopLevelClient = {
  screenshot?: (args: Record<string, unknown>) => Promise<unknown>;
  scrape?: (args: Record<string, unknown>) => Promise<unknown>;
  pdf?: (args: Record<string, unknown>) => Promise<unknown>;
};

const MIN_TIMEOUT_MS = 1;
const MAX_TIMEOUT_MS = 120000;

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

const normalizeUrl = (value: unknown, operation: string): string => {
  if (typeof value !== "string") {
    throw normalizeError(`URL must be a string for ${operation}`, operation);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw normalizeError(`URL must be a non-empty string for ${operation}`, operation);
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }

    return parsed.toString();
  } catch {
    throw normalizeError(`URL must be a valid HTTP(S) URL for ${operation}`, operation);
  }
};

const normalizeTimeout = (value: number | undefined, operation: string): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value)) {
    throw normalizeError(`timeout must be a finite number for ${operation}`, operation);
  }

  const normalizedTimeout = Math.floor(value);
  if (normalizedTimeout < MIN_TIMEOUT_MS || normalizedTimeout > MAX_TIMEOUT_MS) {
    throw normalizeError(
      `timeout must be between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS} for ${operation}`,
      operation,
    );
  }

  return normalizedTimeout;
};

const normalizeUtilityArgs = (
  args: Record<string, unknown> | undefined,
  operation: string,
): JsonObject => {
  if (!args) {
    return {};
  }

  if (typeof args !== "object" || Array.isArray(args)) {
    throw normalizeError(`Invalid utility arguments for ${operation}`, operation);
  }

  return { ...args };
};

const buildPayload = (
  url: string,
  timeout: number | undefined,
  commandArgs: Record<string, unknown> | undefined,
): JsonObject => {
  return {
    ...(commandArgs ?? {}),
    url,
    ...(timeout !== undefined ? { timeout } : {}),
  };
};

const callSteelTopLevel = async (
  operation: "steel.screenshot" | "steel.scrape" | "steel.pdf",
  method: "screenshot" | "scrape" | "pdf",
  steel: ReturnType<typeof createSteelClient>,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelTopLevelClient;
  const target = client[method];
  if (!target) {
    throw normalizeError(`Steel ${method} is not available`, operation);
  }

  return runWithNormalizedError(operation, () => target(payload));
};

export const steel = {
  screenshot: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      url: v.string(),
      timeout: v.optional(v.number()),
      commandArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      requireOwnerId(args.ownerId, "steel.screenshot");

      const normalizedUrl = normalizeUrl(args.url, "steel.screenshot");
      const timeout = normalizeTimeout(args.timeout, "steel.screenshot");
      const commandArgs = normalizeUtilityArgs(args.commandArgs, "steel.screenshot");
      const payload = buildPayload(normalizedUrl, timeout, commandArgs);

      const client = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "steel.screenshot" },
      );

      return await callSteelTopLevel("steel.screenshot", "screenshot", client, payload);
    },
  }),
  scrape: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      url: v.string(),
      timeout: v.optional(v.number()),
      commandArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      requireOwnerId(args.ownerId, "steel.scrape");

      const normalizedUrl = normalizeUrl(args.url, "steel.scrape");
      const timeout = normalizeTimeout(args.timeout, "steel.scrape");
      const commandArgs = normalizeUtilityArgs(args.commandArgs, "steel.scrape");
      const payload = buildPayload(normalizedUrl, timeout, commandArgs);

      const client = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "steel.scrape" },
      );

      return await callSteelTopLevel("steel.scrape", "scrape", client, payload);
    },
  }),
  pdf: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      url: v.string(),
      timeout: v.optional(v.number()),
      commandArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      requireOwnerId(args.ownerId, "steel.pdf");

      const normalizedUrl = normalizeUrl(args.url, "steel.pdf");
      const timeout = normalizeTimeout(args.timeout, "steel.pdf");
      const commandArgs = normalizeUtilityArgs(args.commandArgs, "steel.pdf");
      const payload = buildPayload(normalizedUrl, timeout, commandArgs);

      const client = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "steel.pdf" },
      );

      return await callSteelTopLevel("steel.pdf", "pdf", client, payload);
    },
  }),
};

export const screenshot = steel.screenshot;
export const scrape = steel.scrape;
export const pdf = steel.pdf;
