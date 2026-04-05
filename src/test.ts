import { __setTestSteelClientFactory } from "./component/steel";

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
    retrieve: (externalId: string) => Promise<SteelSessionRecord>;
    get: (externalId: string) => Promise<SteelSessionRecord>;
    list: (
      query: Record<string, unknown>,
    ) => Promise<{ items: unknown[]; hasMore: boolean; continuation?: string }>;
    release: (externalId: string) => Promise<SteelSessionRecord>;
    computer: (externalId: string, commandArgs: Record<string, unknown>) => Promise<unknown>;
    context: (externalId: string) => Promise<unknown>;
    liveDetails: (externalId: string) => Promise<Record<string, unknown>>;
    events: (externalId: string) => Promise<unknown>;
    files: {
      list: (sessionId: string) => Promise<{ data: unknown[] }>;
      upload: (sessionId: string, args: Record<string, unknown>) => Promise<unknown>;
      delete: (sessionId: string, path: string) => Promise<unknown>;
      deleteAll: (sessionId: string) => Promise<unknown>;
    };
    captchas: {
      status: (sessionId: string) => Promise<unknown>;
      solve: (sessionId: string, args?: Record<string, unknown>) => Promise<unknown>;
      solveImage: (sessionId: string, args: Record<string, unknown>) => Promise<unknown>;
    };
  };
  profiles?: {
    list: () => Promise<unknown>;
    get: (externalId: string) => Promise<unknown>;
    create: (payload: Record<string, unknown>) => Promise<unknown>;
    update: (externalId: string, payload: Record<string, unknown>) => Promise<unknown>;
  };
  credentials?: {
    create: (payload: Record<string, unknown>) => Promise<unknown>;
    update: (payload: Record<string, unknown>) => Promise<unknown>;
    list: (query: Record<string, unknown>) => Promise<unknown>;
    delete: (payload: Record<string, unknown>) => Promise<unknown>;
  };
  extensions?: {
    list: () => Promise<unknown>;
    upload: (payload: Record<string, unknown>) => Promise<unknown>;
    update: (externalId: string, payload: Record<string, unknown>) => Promise<unknown>;
    delete: (externalId: string) => Promise<unknown>;
    deleteAll: () => Promise<unknown>;
    download: (externalId: string) => Promise<unknown>;
  };
  files?: {
    list: () => Promise<unknown>;
    upload: (payload: Record<string, unknown>) => Promise<unknown>;
    delete: (path: string) => Promise<unknown>;
    download: (path: string) => Promise<unknown>;
  };
  screenshot?: (args: Record<string, unknown>) => Promise<unknown>;
  scrape?: (args: Record<string, unknown>) => Promise<unknown>;
  pdf?: (args: Record<string, unknown>) => Promise<unknown>;
  steel?: {
    screenshot?: (args: Record<string, unknown>) => Promise<unknown>;
    scrape?: (args: Record<string, unknown>) => Promise<unknown>;
    pdf?: (args: Record<string, unknown>) => Promise<unknown>;
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
  Math.max(
    1,
    Math.min(
      typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : 50,
      100,
    ),
  );

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
  const calls: MockSteelClientCalls = {
    sessions: [],
    sessionFiles: [],
    captchas: [],
    profiles: [],
    credentials: [],
    extensions: [],
    files: [],
    steel: [],
  };
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
      const externalId =
        typeof request.externalId === "string" && request.externalId.trim().length > 0
          ? request.externalId.trim()
          : `${incoming.externalId}-${sequence + 1}`;
      const record: SteelSessionRecord = {
        ...incoming,
        externalId,
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
    retrieve: async (externalId: string) => {
      calls.sessions.push({ method: "retrieve", args: [externalId] });
      return sessionNamespace.get(externalId);
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
    computer: async (externalId: string, commandArgs: Record<string, unknown>) => {
      calls.sessions.push({ method: "computer", args: [externalId, commandArgs] });
      return {
        action: "computer",
        sessionId: externalId,
        payload: clone(commandArgs),
        ...sessionFixtures.commandPayload.response,
      };
    },
    context: async (externalId: string) => {
      calls.sessions.push({ method: "context", args: [externalId] });
      return {
        action: "context",
        sessionId: externalId,
        ...sessionFixtures.commandPayload.response,
      };
    },
    liveDetails: async (externalId: string) => {
      calls.sessions.push({ method: "liveDetails", args: [externalId] });
      const current = store.get(externalId) ?? store.values().next().value ?? {
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
    events: async (externalId: string) => {
      calls.sessions.push({ method: "events", args: [externalId] });
      return [{ type: "event", sessionId: externalId }];
    },
    files: {
      list: async (sessionId: string) => {
        calls.sessionFiles.push({ method: "list", args: [sessionId] });
        return { data: [] };
      },
      upload: async (sessionId: string, args: Record<string, unknown>) => {
        calls.sessionFiles.push({ method: "upload", args: [sessionId, args] });
        return {
          sessionExternalId: sessionId,
          path: String(args.path ?? "uploaded-file"),
          size: 0,
          lastModified: now(),
        };
      },
      delete: async (sessionId: string, path: string) => {
        calls.sessionFiles.push({ method: "delete", args: [sessionId, path] });
        return { ok: true, deleted: true };
      },
      deleteAll: async (sessionId: string) => {
        calls.sessionFiles.push({ method: "deleteAll", args: [sessionId] });
        return { ok: true, deletedCount: 0 };
      },
    },
    captchas: {
      status: async (sessionId: string) => {
        calls.captchas.push({ method: "status", args: [sessionId] });
        return [
          {
            pageId: "page-1",
            url: "https://captcha.example.com",
            isSolvingCaptcha: false,
            lastUpdated: now(),
          },
        ];
      },
      solve: async (sessionId: string, args?: Record<string, unknown>) => {
        calls.captchas.push({ method: "solve", args: [sessionId, args] });
        return { solved: true };
      },
      solveImage: async (sessionId: string, args: Record<string, unknown>) => {
        calls.captchas.push({ method: "solveImage", args: [sessionId, args] });
        return { solved: true };
      },
    },
  };

  return {
    sessions: sessionNamespace,
    profiles: {
      list: async () => {
        calls.profiles.push({ method: "list", args: [] });
        return { profiles: [] };
      },
      get: async (externalId) => {
        calls.profiles.push({ method: "get", args: [externalId] });
        return { id: externalId, userDataDir: "https://storage.example.com/profile.json" };
      },
      create: async (payload) => {
        calls.profiles.push({ method: "create", args: [payload] });
        return { id: "profile-new", ...(payload as Record<string, unknown>) };
      },
      update: async (externalId, payload) => {
        calls.profiles.push({ method: "update", args: [externalId, payload] });
        return { id: externalId, ...(payload as Record<string, unknown>) };
      },
    },
    credentials: {
      create: async (payload) => {
        calls.credentials.push({ method: "create", args: [payload] });
        return {
          label: typeof payload.label === "string" ? payload.label : "credential",
          origin: typeof payload.origin === "string" ? payload.origin : "https://example.com",
          namespace: typeof payload.namespace === "string" ? payload.namespace : "default",
          createdAt: new Date(now()).toISOString(),
          updatedAt: new Date(now()).toISOString(),
        };
      },
      update: async (payload) => {
        calls.credentials.push({ method: "update", args: [payload] });
        return {
          label: typeof payload.label === "string" ? payload.label : "credential",
          origin: typeof payload.origin === "string" ? payload.origin : "https://example.com",
          namespace: typeof payload.namespace === "string" ? payload.namespace : "default",
          createdAt: new Date(now()).toISOString(),
          updatedAt: new Date(now()).toISOString(),
        };
      },
      list: async (query) => {
        calls.credentials.push({ method: "list", args: [query] });
        return {
          credentials: [
            {
              label: "credential",
              origin: "https://example.com",
              namespace: "default",
              createdAt: new Date(now()).toISOString(),
              updatedAt: new Date(now()).toISOString(),
            },
          ],
        };
      },
      delete: async (payload) => {
        calls.credentials.push({ method: "delete", args: [payload] });
        return { success: true };
      },
    },
    extensions: {
      list: async () => {
        calls.extensions.push({ method: "list", args: [] });
        return { count: 0, extensions: [] };
      },
      upload: async (payload) => {
        calls.extensions.push({ method: "upload", args: [payload] });
        return {
          id: "ext-new",
          name: "Mock extension",
          createdAt: new Date(now()).toISOString(),
          updatedAt: new Date(now()).toISOString(),
        };
      },
      update: async (externalId, payload) => {
        calls.extensions.push({ method: "update", args: [externalId, payload] });
        return {
          id: externalId,
          name: "Mock extension",
          createdAt: new Date(now()).toISOString(),
          updatedAt: new Date(now()).toISOString(),
        };
      },
      delete: async (externalId) => {
        calls.extensions.push({ method: "delete", args: [externalId] });
        return { message: "deleted" };
      },
      deleteAll: async () => {
        calls.extensions.push({ method: "deleteAll", args: [] });
        return { message: "deleted" };
      },
      download: async (externalId) => {
        calls.extensions.push({ method: "download", args: [externalId] });
        return "extension-binary";
      },
    },
    files: {
      list: async () => {
        calls.files.push({ method: "list", args: [] });
        return { data: [] };
      },
      upload: async (payload) => {
        calls.files.push({ method: "upload", args: [payload] });
        return {
          path: typeof payload.path === "string" ? payload.path : "uploaded-file",
          size: 0,
          lastModified: new Date(now()).toISOString(),
        };
      },
      delete: async (path) => {
        calls.files.push({ method: "delete", args: [path] });
        return { ok: true };
      },
      download: async (path) => {
        calls.files.push({ method: "download", args: [path] });
        return new Response("mock-file");
      },
    },
    screenshot: async (args) => {
      calls.steel.push({ method: "screenshot", args: [args] });
      return { url: "https://example.com/screenshot.png" };
    },
    scrape: async (args) => {
      calls.steel.push({ method: "scrape", args: [args] });
      return { content: { html: "<html></html>" }, links: [], metadata: { statusCode: 200 } };
    },
    pdf: async (args) => {
      calls.steel.push({ method: "pdf", args: [args] });
      return { url: "https://example.com/page.pdf" };
    },
    steel: {
      screenshot: async (args) => {
        calls.steel.push({ method: "steel.screenshot", args: [args] });
        return { url: "https://example.com/screenshot.png" };
      },
      scrape: async (args) => {
        calls.steel.push({ method: "steel.scrape", args: [args] });
        return { content: { html: "<html></html>" }, links: [], metadata: { statusCode: 200 } };
      },
      pdf: async (args) => {
        calls.steel.push({ method: "steel.pdf", args: [args] });
        return { url: "https://example.com/page.pdf" };
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
  "./convex.config.ts": () => import("./component/convex.config.js"),
  "./schema.ts": () => import("./component/schema.js"),
  "./sessions.ts": () => import("./component/sessions.js"),
  "./sessionFiles.ts": () => import("./component/sessionFiles.js"),
  "./captchas.ts": () => import("./component/captchas.js"),
  "./profiles.ts": () => import("./component/profiles.js"),
  "./credentials.ts": () => import("./component/credentials.js"),
  "./extensions.ts": () => import("./component/extensions.js"),
  "./files.ts": () => import("./component/files.js"),
  "./topLevel.ts": () => import("./component/topLevel.js"),
  "./_generated/api.ts": () => import("./component/_generated/api.js"),
  "./_generated/server.ts": () => import("./component/_generated/server.js"),
  "./_generated/dataModel.ts": () => import("./component/_generated/dataModel.js"),
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
