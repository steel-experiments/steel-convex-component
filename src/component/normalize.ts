export interface StructuredErrorContract {
  provider: "steel";
  message: string;
  status?: number;
  code?: string;
  retryable: boolean;
  operation: string;
}

const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set([
  "ECONNABORTED",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "NETWORK_ERROR",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_CONNECT_TIMEOUT",
]);

type ErrorLike = Record<string, unknown>;

const toString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return undefined;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return undefined;
};

const normalizeErrorCode = (value: unknown): string | undefined => {
  const normalized = toString(value)?.toUpperCase();
  if (!normalized) {
    return undefined;
  }

  return normalized;
};

const extractErrorStatus = (error: ErrorLike): number | undefined => {
  const candidates = [
    toNumber(error.status),
    toNumber(error.statusCode),
    error.response && typeof error.response === "object"
      ? toNumber((error.response as ErrorLike).status)
      : undefined,
    error.response && typeof error.response === "object"
      ? toNumber((error.response as ErrorLike).statusCode)
      : undefined,
  ];

  for (const candidate of candidates) {
    if (candidate !== undefined) {
      return candidate;
    }
  }

  return undefined;
};

const extractErrorCode = (error: ErrorLike): string | undefined => {
  const candidates = [
    normalizeErrorCode(error.code),
    error.cause && typeof error.cause === "object"
      ? normalizeErrorCode((error.cause as ErrorLike).code)
      : undefined,
  ];

  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  return undefined;
};

const isRetryableMessage = (message: string | undefined): boolean => {
  if (!message) {
    return false;
  }

  return ["timeout", "timed out", "network", "temporary", "retry"].some((segment) =>
    message.toLowerCase().includes(segment),
  );
};

const shouldRetry = (status: number | undefined, code: string | undefined, message: string): boolean => {
  if (status !== undefined && RETRYABLE_HTTP_STATUSES.has(status)) {
    return true;
  }

  if (code && (RETRYABLE_ERROR_CODES.has(code) || code.startsWith("E"))) {
    return true;
  }

  return isRetryableMessage(message);
};

export class StructuredError extends Error {
  readonly provider: "steel";
  readonly status?: number;
  readonly code?: string;
  readonly retryable: boolean;
  readonly operation: string;

  constructor(details: StructuredErrorContract) {
    super(details.message);
    this.name = "StructuredError";
    this.provider = details.provider;
    this.status = details.status;
    this.code = details.code;
    this.retryable = details.retryable;
    this.operation = details.operation;
  }

  override toJSON() {
    return {
      provider: this.provider,
      message: this.message,
      status: this.status,
      code: this.code,
      retryable: this.retryable,
      operation: this.operation,
    };
  }
}

export const normalizeError = (error: unknown, operation: string): StructuredError => {
  if (error instanceof StructuredError) {
    return error;
  }

  const message = toString(error instanceof Error ? error.message : error) ?? `steel operation failed: ${operation}`;
  const structuredError = error instanceof Error ? error as Error & ErrorLike : error;
  const errorRecord = typeof structuredError === "object" && structuredError !== null
    ? (structuredError as ErrorLike)
    : {};

  const status = extractErrorStatus(errorRecord);
  const code = extractErrorCode(errorRecord);

  return new StructuredError({
    provider: "steel",
    message,
    status,
    code,
    retryable: shouldRetry(status, code, message),
    operation,
  });
};

import { sessionStatusValues, type SessionStatus } from "./schema";

const sessionStatusLookup = new Set(sessionStatusValues);

export function normalizeSessionStatus(status: string): SessionStatus {
  if (!sessionStatusLookup.has(status)) {
    throw new Error(`Invalid session status: ${status}`);
  }

  return status as SessionStatus;
}

export function normalizeOwnerId(ownerId?: string): string | undefined {
  const normalized = ownerId?.trim();
  if (!normalized) {
    return undefined;
  }

  return normalized;
}

export function normalizeIncludeRaw(includeRaw: boolean | undefined): boolean {
  return includeRaw ?? false;
}
