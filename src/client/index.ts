export interface SteelComponentOptions {
  STEEL_API_KEY?: string;
  ownerId?: string;
}

export interface SteelComponentApiArgs {
  apiKey?: string;
  ownerId?: string;
}

export interface SteelComponentContext {
  runAction<TArgs, TResult>(action: unknown, args: TArgs): Promise<TResult>;
  runQuery<TArgs, TResult>(query: unknown, args: TArgs): Promise<TResult>;
}

interface SteelComponentFunctions {
  sessions: {
    create: unknown;
    refresh: unknown;
    refreshMany: unknown;
    release: unknown;
    releaseAll: unknown;
    get: unknown;
    getByExternalId: unknown;
    list: unknown;
  };
}

export type SteelSessionStatus = "live" | "released" | "failed";

export interface SteelSessionRecord {
  externalId: string;
  status: SteelSessionStatus;
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

export interface SteelFailureResult {
  externalId?: string;
  operation: string;
  message: string;
}

export interface SteelRefreshManyResult {
  items: SteelSessionRecord[];
  failures: SteelFailureResult[];
  hasMore: boolean;
  continuation?: string;
}

export interface SteelReleaseAllResult {
  items: SteelSessionRecord[];
  failures: SteelFailureResult[];
  hasMore: boolean;
  continuation?: string;
}

export interface SteelListResult {
  items: SteelSessionRecord[];
  hasMore: boolean;
  continuation?: string;
}

export interface SteelComponentSessionCreateArgs {
  sessionArgs?: Record<string, unknown>;
  includeRaw?: boolean;
  ownerId?: string;
}

export interface SteelComponentSessionGetArgs {
  id: string;
  ownerId?: string;
}

export interface SteelComponentSessionGetByExternalIdArgs {
  externalId: string;
  ownerId?: string;
}

export interface SteelComponentSessionListArgs {
  status?: SteelSessionStatus;
  ownerId?: string;
  cursor?: string;
  limit?: number;
}

export interface SteelComponentSessionRefreshArgs {
  externalId: string;
  ownerId?: string;
  includeRaw?: boolean;
}

export interface SteelComponentSessionRefreshManyArgs {
  ownerId?: string;
  status?: SteelSessionStatus;
  cursor?: string;
  limit?: number;
  includeRaw?: boolean;
}

export interface SteelComponentSessionReleaseArgs {
  externalId: string;
  ownerId?: string;
}

export interface SteelComponentSessionReleaseAllArgs {
  ownerId?: string;
  status?: SteelSessionStatus;
  cursor?: string;
  limit?: number;
}

export class SteelComponent {
  constructor(
    public readonly component: SteelComponentFunctions,
    public readonly options: SteelComponentOptions = {},
  ) {}

  protected resolveApiKey(apiKey?: string): string {
    const wrapperOption = this.options.STEEL_API_KEY;
    const envOption =
      (globalThis as { process?: { env?: { STEEL_API_KEY?: string } } }).process
        ?.env?.STEEL_API_KEY;

    const resolved = apiKey ?? wrapperOption ?? envOption;
    if (!resolved || !resolved.trim()) {
      throw new Error(
        "Missing STEEL_API_KEY: pass via constructor options, env var, or method override.",
      );
    }

    return resolved.trim();
  }

  protected resolveOwnerId(argsOwnerId?: string, overrideOwnerId?: string): string {
    const candidate = overrideOwnerId ?? argsOwnerId ?? this.options.ownerId;
    const normalized = candidate?.trim();
    if (!normalized) {
      throw new Error(
        "Missing ownerId: supply ownerId in method args, constructor options, or call options.",
      );
    }

    return normalized;
  }

  protected runAction<TArgs extends object, TResult>(
    ctx: SteelComponentContext,
    actionRef: unknown,
    args: TArgs & SteelComponentApiArgs,
    options?: SteelComponentOptions,
  ): Promise<TResult> {
    const ownerId = this.resolveOwnerId(args.ownerId, options?.ownerId);
    return ctx.runAction<TArgs & { apiKey: string; ownerId: string }, TResult>(actionRef, {
      ...(args as TArgs),
      ownerId,
      apiKey: this.resolveApiKey(options?.STEEL_API_KEY ?? args.apiKey),
    });
  }

  protected runQuery<TArgs extends object, TResult>(
    ctx: SteelComponentContext,
    queryRef: unknown,
    args: TArgs & SteelComponentApiArgs,
    options?: SteelComponentOptions,
  ): Promise<TResult> {
    const ownerId = this.resolveOwnerId(args.ownerId, options?.ownerId);
    return ctx.runQuery<TArgs & { ownerId: string }, TResult>(queryRef, {
      ...(args as TArgs),
      ownerId,
    });
  }

  public readonly sessions = {
    create: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionCreateArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionCreateArgs, SteelSessionRecord>(
        ctx,
        this.component.sessions.create,
        args,
        options,
      ),
    refresh: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionRefreshArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionRefreshArgs, SteelSessionRecord>(
        ctx,
        this.component.sessions.refresh,
        args,
        options,
      ),
    refreshMany: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionRefreshManyArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionRefreshManyArgs, SteelRefreshManyResult>(
        ctx,
        this.component.sessions.refreshMany,
        args,
        options,
      ),
    release: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionReleaseArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionReleaseArgs, SteelSessionRecord>(
        ctx,
        this.component.sessions.release,
        args,
        options,
      ),
    releaseAll: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionReleaseAllArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionReleaseAllArgs, SteelReleaseAllResult>(
        ctx,
        this.component.sessions.releaseAll,
        args,
        options,
      ),
    get: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionGetArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runQuery<SteelComponentSessionGetArgs, SteelSessionRecord | null>(
        ctx,
        this.component.sessions.get,
        args,
        options,
      ),
    getByExternalId: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionGetByExternalIdArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runQuery<SteelComponentSessionGetByExternalIdArgs, SteelSessionRecord | null>(
        ctx,
        this.component.sessions.getByExternalId,
        args,
        options,
      ),
    list: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionListArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runQuery<SteelComponentSessionListArgs, SteelListResult>(
        ctx,
        this.component.sessions.list,
        args,
        options,
      ),
  };
}
