import { action } from "./_generated/server";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import {
  normalizeError,
  requireOwnerId,
  runWithNormalizedError,
} from "./normalize";

const MIN_DELAY_MS = 0;
const MAX_DELAY_MS = 120000;

const normalizeUrl = (value: unknown, operation: string): string => {
  if (typeof value !== "string") {
    throw normalizeError(`URL must be a string for ${operation}`, operation);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw normalizeError(
      `URL must be a non-empty string for ${operation}`,
      operation,
    );
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }

    return parsed.toString();
  } catch {
    throw normalizeError(
      `URL must be a valid HTTP(S) URL for ${operation}`,
      operation,
    );
  }
};

const normalizeDelay = (
  delay: number | undefined,
  timeout: number | undefined,
  operation: string,
): number | undefined => {
  const value = delay ?? timeout;
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value)) {
    throw normalizeError(
      `delay must be a finite number for ${operation}`,
      operation,
    );
  }

  const normalized = Math.floor(value);
  if (normalized < MIN_DELAY_MS || normalized > MAX_DELAY_MS) {
    throw normalizeError(
      `delay must be between ${MIN_DELAY_MS} and ${MAX_DELAY_MS} for ${operation}`,
      operation,
    );
  }

  return normalized;
};

export const steel = {
  screenshot: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      url: v.string(),
      delay: v.optional(v.number()),
      timeout: v.optional(v.number()),
      commandArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (_ctx, args) => {
      requireOwnerId(args.ownerId, "steel.screenshot");

      const normalizedUrl = normalizeUrl(args.url, "steel.screenshot");
      const delay = normalizeDelay(
        args.delay,
        args.timeout,
        "steel.screenshot",
      );

      const client = createSteelClient(args.apiKey, {
        operation: "steel.screenshot",
      });

      return runWithNormalizedError("steel.screenshot", () =>
        client.screenshot({
          url: normalizedUrl,
          ...(args.commandArgs ?? {}),
          ...(delay !== undefined ? { delay } : {}),
        }),
      );
    },
  }),
  scrape: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      url: v.string(),
      delay: v.optional(v.number()),
      timeout: v.optional(v.number()),
      commandArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (_ctx, args) => {
      requireOwnerId(args.ownerId, "steel.scrape");

      const normalizedUrl = normalizeUrl(args.url, "steel.scrape");
      const delay = normalizeDelay(args.delay, args.timeout, "steel.scrape");

      const client = createSteelClient(args.apiKey, {
        operation: "steel.scrape",
      });

      return runWithNormalizedError("steel.scrape", () =>
        client.scrape({
          url: normalizedUrl,
          ...(args.commandArgs ?? {}),
          ...(delay !== undefined ? { delay } : {}),
        }),
      );
    },
  }),
  pdf: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      url: v.string(),
      delay: v.optional(v.number()),
      timeout: v.optional(v.number()),
      commandArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (_ctx, args) => {
      requireOwnerId(args.ownerId, "steel.pdf");

      const normalizedUrl = normalizeUrl(args.url, "steel.pdf");
      const delay = normalizeDelay(args.delay, args.timeout, "steel.pdf");

      const client = createSteelClient(args.apiKey, { operation: "steel.pdf" });

      return runWithNormalizedError("steel.pdf", () =>
        client.pdf({
          url: normalizedUrl,
          ...(args.commandArgs ?? {}),
          ...(delay !== undefined ? { delay } : {}),
        }),
      );
    },
  }),
};

export const screenshot = steel.screenshot;
export const scrape = steel.scrape;
export const pdf = steel.pdf;
