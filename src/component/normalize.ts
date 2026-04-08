import { sessionStatusValues, type SessionStatus } from "./schema";

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
]);

type ErrorLike = Record<string, unknown>;

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
};

const extractErrorStatus = (error: ErrorLike): number | undefined => {
  for (const candidate of [
    toNumber(error.status),
    toNumber(error.statusCode),
    error.response && typeof error.response === "object"
      ? toNumber((error.response as ErrorLike).status)
      : undefined,
  ]) {
    if (candidate !== undefined) return candidate;
  }
  return undefined;
};

const extractErrorCode = (error: ErrorLike): string | undefined => {
  for (const source of [error, error.cause]) {
    if (source && typeof source === "object") {
      const code = (source as ErrorLike).code;
      if (typeof code === "string" && code.trim()) {
        return code.trim().toUpperCase();
      }
    }
  }
  return undefined;
};

const isRetryableMessage = (message: string): boolean =>
  ["timeout", "timed out", "network", "temporary", "retry"].some((s) =>
    message.toLowerCase().includes(s),
  );

const shouldRetry = (
  status: number | undefined,
  code: string | undefined,
  message: string,
): boolean => {
  if (status !== undefined && RETRYABLE_HTTP_STATUSES.has(status)) return true;
  if (code && RETRYABLE_ERROR_CODES.has(code)) return true;
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

  toJSON() {
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

export const normalizeError = (
  error: unknown,
  operation: string,
): StructuredError => {
  if (error instanceof StructuredError) {
    return error;
  }

  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : undefined;
  const message = rawMessage?.trim() || `steel operation failed: ${operation}`;
  const errorRecord =
    typeof error === "object" && error !== null ? (error as ErrorLike) : {};

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

export function requireOwnerId(
  ownerId: string | undefined,
  operation: string,
): string {
  const normalized = ownerId?.trim();
  if (!normalized) {
    throw normalizeError(
      `Missing ownerId: ownerId is required for ${operation}`,
      operation,
    );
  }
  return normalized;
}

export async function runWithNormalizedError<T>(
  operation: string,
  handler: () => Promise<T>,
): Promise<T> {
  try {
    return await handler();
  } catch (error) {
    throw normalizeError(error, operation);
  }
}

const sessionStatusLookup = new Set(sessionStatusValues);

export function normalizeSessionStatus(status: string): SessionStatus {
  if (!sessionStatusLookup.has(status as SessionStatus)) {
    throw new Error(`Invalid session status: ${status}`);
  }
  return status as SessionStatus;
}

export function normalizeIncludeRaw(includeRaw: boolean | undefined): boolean {
  return includeRaw ?? false;
}

export function toTimestamp(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}
