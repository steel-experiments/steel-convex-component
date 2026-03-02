import { __setTestSteelClientFactory } from "./component/steel";
import { schema as componentSchema } from "./component/schema";
import * as convexConfig from "./component/convex.config";
import * as sessions from "./component/sessions";
import * as sessionFiles from "./component/sessionFiles";
import * as captchas from "./component/captchas";
import * as profiles from "./component/profiles";
import * as credentials from "./component/credentials";
import * as extensions from "./component/extensions";
import * as files from "./component/files";
import * as topLevel from "./component/topLevel";

type SessionStatus = "live" | "released" | "failed";

interface SteelSessionRecord {
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
  raw?: Record<string, unknown>;
}

export type MockSteelCall = { method: string; args: unknown[] };

interface MockSteelClientCalls {
  [namespace: string]: MockSteelCall[];
}

interface MockSteelClient {
  sessions: {
    create: (args: Record<string, unknown>) => Promise<SteelSessionRecord>;
    get: (externalId: string) => Promise<SteelSessionRecord>;
    list: (query: Record<string, unknown>) => Promise<{ items: unknown[]; hasMore: boolean; continuation?: string }>;
    release: (externalId: string) => Promise<SteelSessionRecord>;
    computer: (commandArgs: Record<string, unknown>) => Promise<unknown>;
    context: (commandArgs: Record<string, unknown>) => Promise<unknown>;
    liveDetails: (commandArgs: Record<string, unknown>) => Promise<Record<string, unknown>>;
    events: (commandArgs: Record<string, unknown>) => Promise<unknown>;
  };
  sessionFiles?: {
    list: (query: Record<string, unknown>) => Promise<{ items: unknown[]; hasMore: boolean; continuation?: string }>;
    uploadFromUrl: (args: Record<string, unknown>) => Promise<unknown>;
    delete: (args: Record<string, unknown>) => Promise<unknown>;
    deleteAll: (args: Record<string, unknown>) => Promise<unknown>;
  };
  captcha?: {
    status: (args: Record<string, unknown>) => Promise<unknown>;
    solve: (args: Record<string, unknown>) => Promise<unknown>;
    solveImage: (args: Record<string, unknown>) => Promise<unknown>;
  };
  profiles?: {
    list: (query: Record<string, unknown>) => Promise<unknown>;
    get: (externalId: string) => Promise<unknown>;
    createFromUrl: (payload: Record<string, unknown>) => Promise<unknown>;
    updateFromUrl: (payload: Record<string, unknown>) => Promise<unknown>;
  };
  __calls: MockSteelClientCalls;
}

export interface SessionsFixture {
  externalId: string;
  ownerId?: string;
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
  raw?: Record<string, unknown>;
}

export interface MockSteelClientOptions {
  sessions?: SessionsFixture[];
}

export const sessionFixtures = {
  now: 1_700_000_000_000,
  ownerId: "test-owner-id",
  create: {
    externalId: "session-live-001",
    status: "live" as SessionStatus,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_010_000,
    lastSyncedAt: 1_700_000_010_000,
    debugUrl: "https://debug.example.com/session-live-001",
    sessionViewerUrl: "https://viewer.example.com/session-live-001",
    websocketUrl: "wss://ws.example.com/session-live-001",
    timeout: 1200,
    duration: 42,
    creditsUsed: 15,
    eventCount: 12,
    proxyBytesUsed: 4000,
    profileId: "profile-1",
    region: "us-east-1",
    headless: true,
    isSelenium: false,
    userAgent: "test-agent/0.1",
    raw: { source: "fixture" },
  },
  released: {
    externalId: "session-released-001",
    status: "released" as SessionStatus,
    createdAt: 1_700_000_020_000,
    updatedAt: 1_700_000_030_000,
    lastSyncedAt: 1_700_000_030_000,
    debugUrl: "https://debug.example.com/session-released-001",
    sessionViewerUrl: "https://viewer.example.com/session-released-001",
    websocketUrl: "wss://ws.example.com/session-released-001",
    timeout: 300,
    duration: 120,
    creditsUsed: 33,
    eventCount: 99,
    proxyBytesUsed: 9100,
    profileId: "profile-1",
    region: "us-east-1",
    headless: false,
    isSelenium: true,
    userAgent: "test-agent/0.1",
    raw: { source: "fixture" },
  },
  list: [
    {
      externalId: "session-live-001",
      status: "live" as SessionStatus,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_010_000,
      lastSyncedAt: 1_700_000_010_000,
    },
    {
      externalId: "session-released-001",
      status: "released" as SessionStatus,
      createdAt: 1_700_000_020_000,
      updatedAt: 1_700_000_030_000,
      lastSyncedAt: 1_700_000_030_000,
    },
  ],
  validation: {
    missingOwnerId: {
      actionArgs: {
        sessionArgs: { image: "chrome" },
        ownerId: "",
        includeRaw: true,
      },
      expectedErrorContains: "Missing ownerId",
    },
    invalidRemoteStatus: {
      externalId: "session-live-001",
      payload: { status: "invalid", externalId: "session-live-001", createdAt: 1, updatedAt: 1, lastSyncedAt: 1 },
      expectedErrorContains: "Invalid session status",
    },
  },
  commandPayload: {
    commandArgs: { tool: "browser", timeout: 1000 },
    response: { ok: true, tool: "browser", timestamp: 1_700_000_040_000 },
  },
} as const;

type SessionFixture = Omit<SessionsFixture, "ownerId">;

export const validationFixtures = {
  sessions: {
    createRequiresOwnerId: {
      args: { sessionArgs: { timeout: 120 }, ownerId: "", apiKey: "k" },
      expectedError: "Missing ownerId: ownerId is required for sessions.create",
    },
    getRequiresOwnerIdInActions: {
      args: { externalId: "session-live-001", ownerId: "", apiKey: "k" },
      expectedError: "Missing ownerId: ownerId is required for sessions.refresh",
    },
    refreshManyInvalidLimit: {
      args: { status: "live", ownerId: "owner", apiKey: "k", limit: 99999 },
      expectedBehavior: "list pagination caps to MAX_LIST_LIMIT",
    },
  },
};

type RegisterHarness = {
  registerComponent?: (componentName: string, modules: Record<string, unknown>) => unknown;
  register?: (modules: Record<string, unknown>) => unknown;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const clampListLimit = (value: number | undefined): number =>
  Math.max(1, Math.min(Number.isFinite(value) ? Math.floor(value) : 50, 100));

const createSession = (
  request: Record<string, unknown>,
  base: SessionFixture,
): SessionFixture => {
  const status =
    request.status === "live" || request.status === "released" || request.status === "failed"
      ? request.status
      : base.status;
  const externalId = typeof request.externalId === "string" && request.externalId.trim().length > 0
    ? request.externalId.trim()
    : base.externalId;

  return {
    ...base,
    externalId,
    status,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    lastSyncedAt: base.lastSyncedAt,
    raw: {
      ...base.raw,
      ...(typeof request.sessionArgs === "object" &&
      request.sessionArgs &&
      !Array.isArray(request.sessionArgs)
        ? (request.sessionArgs as Record<string, unknown>)
        : {}),
    },
  };
};

export const createMockSteelClient = (
  options: MockSteelClientOptions = {},
): MockSteelClient => {
  const baselineNow = sessionFixtures.now;
  const store = new Map<string, SteelSessionRecord>();
  const calls: MockSteelClientCalls = { sessions: [], sessionFiles: [], captcha: [], profiles: [] };
  let sequence = 0;

  const now = () => baselineNow + sequence++ * 1000;

  const buildRecord = (record: SessionFixture): SteelSessionRecord => ({
    externalId: record.externalId,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastSyncedAt: record.lastSyncedAt,
    ...(record as Record<string, unknown>),
  });

  const seedSessions = (options.sessions ?? sessionFixtures.list).map((session) => {
    const seeded = {
      ...buildRecord(session),
      ownerId: sessionFixtures.ownerId,
    };
    store.set(session.externalId, seeded);
    return session.externalId;
  });

  if (!seedSessions.length) {
    const live = {
      ...buildRecord(sessionFixtures.create),
      ownerId: sessionFixtures.ownerId,
    };
    store.set(live.externalId, live);
  }

  const sessionNamespace = {
    create: async (request: Record<string, unknown>) => {
      calls.sessions.push({ method: "create", args: [request] });
      const incoming = createSession(request, sessionFixtures.create);
      const externalId = incoming.externalId;
      const record: SteelSessionRecord = {
        ...incoming,
        createdAt: now(),
        updatedAt: now(),
        lastSyncedAt: now(),
      };
      store.set(externalId, record);
      return clone(record);
    },
    get: async (externalId: string) => {
      calls.sessions.push({ method: "get", args: [externalId] });
      const found = store.get(externalId);
      if (found) {
        return clone(found);
      }

      const fallback = {
        ...buildRecord(sessionFixtures.create),
        externalId,
        createdAt: now(),
        updatedAt: now(),
        lastSyncedAt: now(),
      };
      store.set(externalId, fallback);
      return clone(fallback);
    },
    list: async (query: Record<string, unknown>) => {
      calls.sessions.push({ method: "list", args: [query] });
      const status = query.status as SessionStatus | undefined;
      const limit = clampListLimit(typeof query.limit === "number" ? query.limit : undefined);
      const cursor = typeof query.cursor === "string" ? Number.parseInt(query.cursor, 10) : 0;
      const all = [...store.values()]
        .filter((record) => (status ? record.status === status : true))
        .sort((a, b) => b.updatedAt - a.updatedAt);

      const page = all.slice(cursor, cursor + limit);
      return {
        items: page.map((item) => clone(item)),
        hasMore: cursor + limit < all.length,
        continuation: cursor + limit < all.length ? String(cursor + limit) : undefined,
      };
    },
    release: async (externalId: string) => {
      calls.sessions.push({ method: "release", args: [externalId] });
      const existing = store.get(externalId) ?? {
        ...buildRecord(sessionFixtures.released),
        externalId,
        createdAt: now(),
      };
      const released: SteelSessionRecord = {
        ...existing,
        status: "released",
        updatedAt: now(),
        lastSyncedAt: now(),
      };
      store.set(externalId, released);
      return clone(released);
    },
    computer: async (commandArgs: Record<string, unknown>) => {
      calls.sessions.push({ method: "computer", args: [commandArgs] });
      return { action: "computer", payload: clone(commandArgs), ...sessionFixtures.commandPayload.response };
    },
    context: async (commandArgs: Record<string, unknown>) => {
      calls.sessions.push({ method: "context", args: [commandArgs] });
      return { action: "context", payload: clone(commandArgs), ...sessionFixtures.commandPayload.response };
    },
    liveDetails: async (commandArgs: Record<string, unknown>) => {
      calls.sessions.push({ method: "liveDetails", args: [commandArgs] });
      const current = store.values().next().value ?? {
        ...buildRecord(sessionFixtures.create),
        ownerId: sessionFixtures.ownerId,
      };
      return clone({
        externalId: current.externalId,
        sessionId: current.externalId,
        status: current.status,
        sessionViewerUrl: current.sessionViewerUrl,
      });
    },
    events: async (commandArgs: Record<string, unknown>) => {
      calls.sessions.push({ method: "events", args: [commandArgs] });
      return [{ type: "event", payload: clone(commandArgs) }];
    },
  };

  return {
    sessions: sessionNamespace,
    sessionFiles: {
      list: async (query) => {
        calls.sessionFiles.push({ method: "list", args: [query] });
        return { items: [], hasMore: false };
      },
      uploadFromUrl: async (args) => {
        calls.sessionFiles.push({ method: "uploadFromUrl", args: [args] });
        return {
          sessionExternalId: args.sessionExternalId,
          path: String(args.path ?? "uploaded-file"),
          size: 0,
          lastModified: now(),
        };
      },
      delete: async (args) => {
        calls.sessionFiles.push({ method: "delete", args: [args] });
        return { ok: true, deleted: true };
      },
      deleteAll: async (args) => {
        calls.sessionFiles.push({ method: "deleteAll", args: [args] });
        return { ok: true, deletedCount: 0 };
      },
    },
    captcha: {
      status: async (args) => {
        calls.captcha.push({ method: "status", args: [args] });
        return {
          sessionExternalId: String(args.sessionExternalId),
          pageId: String(args.pageId),
          url: "https://captcha.example.com",
          isSolvingCaptcha: false,
          lastUpdated: now(),
        };
      },
      solve: async (args) => {
        calls.captcha.push({ method: "solve", args: [args] });
        return { solved: true };
      },
      solveImage: async (args) => {
        calls.captcha.push({ method: "solveImage", args: [args] });
        return { solved: true };
      },
    },
    profiles: {
      list: async () => {
        calls.profiles.push({ method: "list", args: [] });
        return [];
      },
      get: async (externalId) => {
        calls.profiles.push({ method: "get", args: [externalId] });
        return { externalId, userDataDir: "https://storage.example.com/profile.json" };
      },
      createFromUrl: async (payload) => {
        calls.profiles.push({ method: "createFromUrl", args: [payload] });
        return { externalId: "profile-new", ...(payload as Record<string, unknown>) };
      },
      updateFromUrl: async (payload) => {
        calls.profiles.push({ method: "updateFromUrl", args: [payload] });
        return payload;
      },
    },
    __calls: calls,
  };
};

let currentMockClient: MockSteelClient | null = null;

export const registerMockSteelClient = (
  options: MockSteelClientOptions = {},
): MockSteelClient => {
  const client = createMockSteelClient(options);
  currentMockClient = client;
  __setTestSteelClientFactory(() => client);
  return client;
};

export const resetMockSteelClient = (): void => {
  currentMockClient = null;
  __setTestSteelClientFactory(undefined);
};

export const componentModules = {
  "./convex.config.ts": convexConfig,
  "./schema.ts": { schema: componentSchema },
  "./sessions.ts": sessions,
  "./sessionFiles.ts": sessionFiles,
  "./captchas.ts": captchas,
  "./profiles.ts": profiles,
  "./credentials.ts": credentials,
  "./extensions.ts": extensions,
  "./files.ts": files,
  "./topLevel.ts": topLevel,
};

export const register = (
  harness: RegisterHarness,
  modules: Record<string, unknown> = componentModules,
): unknown => {
  if (typeof harness.registerComponent === "function") {
    return harness.registerComponent("steel", modules);
  }

  if (typeof harness.register === "function") {
    return harness.register(modules);
  }

  throw new Error(
    "Invalid test harness: expected registerComponent(name, modules) or register(modules).",
  );
};

export const testRegistration = {
  componentModules,
  register,
  createMockSteelClient,
  registerMockSteelClient,
  resetMockSteelClient,
  sessionFixtures,
  validationFixtures,
};

export default testRegistration;
