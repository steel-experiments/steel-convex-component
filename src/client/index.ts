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
  runMutation<TArgs, TResult>(mutation: unknown, args: TArgs): Promise<TResult>;
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
    computer: unknown;
    context: unknown;
    liveDetails: unknown;
    events: unknown;
  };
  captchas: {
    status: unknown;
    solve: unknown;
    solveImage: unknown;
  };
  profiles: {
    list: unknown;
    get: unknown;
    createFromUrl: unknown;
    updateFromUrl: unknown;
  };
  sessionFiles: {
    list: unknown;
    uploadFromUrl: unknown;
    delete: unknown;
    deleteAll: unknown;
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

export interface SteelSessionFileRecord {
  sessionExternalId: string;
  path: string;
  size: number;
  lastModified: number;
  ownerId?: string;
  lastSyncedAt: number;
}

export interface SteelCaptchaState {
  sessionExternalId: string;
  pageId: string;
  url: string;
  isSolvingCaptcha: boolean;
  lastUpdated?: number;
  ownerId: string;
}

export interface SteelProfileMetadata {
  externalId: string;
  name?: string;
  userDataDir?: string;
  description?: string;
  raw?: unknown;
  ownerId: string;
  lastSyncedAt: number;
}

export interface SteelProfileListResult {
  items: SteelProfileMetadata[];
  hasMore: boolean;
  continuation?: string;
}

export interface SteelSessionFileListResult {
  items: SteelSessionFileRecord[];
  hasMore: boolean;
  continuation?: string;
}

export interface SteelComponentSessionCreateArgs {
  sessionArgs?: Record<string, unknown>;
  includeRaw?: boolean;
  ownerId: string;
}

export interface SteelComponentSessionGetArgs {
  id: string;
  ownerId: string;
}

export interface SteelComponentSessionGetByExternalIdArgs {
  externalId: string;
  ownerId: string;
}

export interface SteelComponentSessionListArgs {
  status?: SteelSessionStatus;
  ownerId: string;
  cursor?: string;
  limit?: number;
}

export interface SteelComponentSessionRefreshArgs {
  externalId: string;
  ownerId: string;
  includeRaw?: boolean;
}

export interface SteelComponentSessionRefreshManyArgs {
  ownerId: string;
  status?: SteelSessionStatus;
  cursor?: string;
  limit?: number;
  includeRaw?: boolean;
}

export interface SteelComponentSessionReleaseArgs {
  externalId: string;
  ownerId: string;
}

export interface SteelComponentSessionReleaseAllArgs {
  ownerId: string;
  status?: SteelSessionStatus;
  cursor?: string;
  limit?: number;
}

export interface SteelComponentSessionCommandArgs {
  ownerId: string;
  commandArgs: Record<string, unknown>;
}

export interface SteelComponentSessionLiveDetailsArgs {
  ownerId: string;
  commandArgs: Record<string, unknown>;
  persistSnapshot?: boolean;
}

export interface SteelComponentSessionFileListArgs {
  ownerId: string;
  sessionExternalId: string;
  cursor?: string;
  limit?: number;
}

export interface SteelComponentSessionFileUploadArgs {
  ownerId: string;
  sessionExternalId: string;
  url: string;
  path?: string;
  fileArgs?: Record<string, unknown>;
}

export interface SteelComponentSessionFileDeleteArgs {
  ownerId: string;
  sessionExternalId: string;
  path: string;
}

export interface SteelComponentSessionFileDeleteAllArgs {
  ownerId: string;
  sessionExternalId: string;
}

export interface SteelComponentCaptchaStatusArgs {
  sessionExternalId: string;
  pageId: string;
  persistSnapshot?: boolean;
  ownerId: string;
}

export interface SteelComponentCaptchaSolveArgs {
  sessionExternalId: string;
  pageId: string;
  ownerId: string;
  commandArgs?: Record<string, unknown>;
}

export interface SteelComponentProfileListArgs {
  ownerId: string;
  cursor?: string;
  limit?: number;
}

export interface SteelComponentProfileGetArgs {
  externalId: string;
  ownerId: string;
}

export interface SteelComponentProfileCreateFromUrlArgs {
  ownerId: string;
  userDataDirUrl: string;
  profileArgs?: Record<string, unknown>;
}

export interface SteelComponentProfileUpdateFromUrlArgs {
  externalId: string;
  ownerId: string;
  userDataDirUrl?: string;
  profileArgs?: Record<string, unknown>;
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
        "Missing STEEL_API_KEY: pass a key via constructor options, `STEEL_API_KEY` env var, or method override.",
      );
    }

    return resolved;
  }

  protected injectApiKey<TArgs extends Record<string, unknown>>(
    args: TArgs,
    apiKeyOverride?: string,
  ): TArgs & { apiKey: string } {
    return {
      ...args,
      apiKey: this.resolveApiKey(apiKeyOverride),
    };
  }

  protected normalizeOwnerId(ownerId?: string): string {
    if (typeof ownerId !== "string") {
      return "";
    }

    const normalized = ownerId.trim();
    return normalized.length ? normalized : "";
  }

  protected injectOwnerId<TArgs extends Record<string, unknown>>(
    args: TArgs,
    ownerId: string | undefined,
    overrideOwnerId?: string,
  ): TArgs & { ownerId: string } {
    const resolvedOwnerId =
      this.normalizeOwnerId(overrideOwnerId) ||
      this.normalizeOwnerId(ownerId) ||
      this.normalizeOwnerId((args as SteelComponentApiArgs).ownerId);

    if (!resolvedOwnerId) {
      throw new Error(
        "Missing ownerId: supply ownerId in method arguments or constructor options.",
      );
    }

    return {
      ...args,
      ownerId: resolvedOwnerId,
    };
  }

  protected runAction<TArgs extends Record<string, unknown>, TResult>(
    ctx: SteelComponentContext,
    action: unknown,
    args: TArgs,
    options?: SteelComponentOptions,
  ): Promise<TResult> {
    const argsWithOwnerId = this.injectOwnerId(args, this.options.ownerId, options?.ownerId);
    return ctx.runAction<TArgs & SteelComponentApiArgs, TResult>(
      action,
      this.injectApiKey(argsWithOwnerId, options?.STEEL_API_KEY),
    );
  }

  protected runQuery<TArgs extends Record<string, unknown>, TResult>(
    ctx: SteelComponentContext,
    query: unknown,
    args: TArgs,
    options?: SteelComponentOptions,
  ): Promise<TResult> {
    const argsWithOwnerId = this.injectOwnerId(args, this.options.ownerId, options?.ownerId);
    return ctx.runQuery<TArgs & SteelComponentApiArgs, TResult>(query, argsWithOwnerId as TArgs);
  }

  protected runMutation<TArgs extends Record<string, unknown>, TResult>(
    ctx: SteelComponentContext,
    mutation: unknown,
    args: TArgs,
    options?: SteelComponentOptions,
  ): Promise<TResult> {
    const argsWithOwnerId = this.injectOwnerId(args, this.options.ownerId, options?.ownerId);
    return ctx.runMutation<TArgs & SteelComponentApiArgs, TResult>(mutation, argsWithOwnerId as TArgs);
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
    computer: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionCommandArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionCommandArgs, unknown>(
        ctx,
        this.component.sessions.computer,
        args,
        options,
      ),
    context: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionCommandArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionCommandArgs, unknown>(
        ctx,
        this.component.sessions.context,
        args,
        options,
      ),
    liveDetails: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionLiveDetailsArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionLiveDetailsArgs, unknown>(
        ctx,
        this.component.sessions.liveDetails,
        args,
        options,
      ),
  events: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionCommandArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionCommandArgs, unknown>(
        ctx,
        this.component.sessions.events,
        args,
        options,
      ),
  };

  public readonly sessionFiles = {
    list: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionFileListArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionFileListArgs, SteelSessionFileListResult>(
        ctx,
        this.component.sessionFiles.list,
        args,
        options,
      ),
    uploadFromUrl: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionFileUploadArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionFileUploadArgs, SteelSessionFileRecord | unknown>(
        ctx,
        this.component.sessionFiles.uploadFromUrl,
        args,
        options,
      ),
    delete: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionFileDeleteArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionFileDeleteArgs, unknown>(
        ctx,
        this.component.sessionFiles.delete,
        args,
        options,
      ),
    deleteAll: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionFileDeleteAllArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionFileDeleteAllArgs, unknown>(
        ctx,
        this.component.sessionFiles.deleteAll,
        args,
        options,
      ),
  };

  public readonly captchas = {
    status: (
      ctx: SteelComponentContext,
      args: SteelComponentCaptchaStatusArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentCaptchaStatusArgs, unknown>(
        ctx,
        this.component.captchas.status,
        args,
        options,
      ),
    solve: (
      ctx: SteelComponentContext,
      args: SteelComponentCaptchaSolveArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentCaptchaSolveArgs, unknown>(
        ctx,
        this.component.captchas.solve,
        args,
        options,
      ),
    solveImage: (
      ctx: SteelComponentContext,
      args: SteelComponentCaptchaSolveArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentCaptchaSolveArgs, unknown>(
        ctx,
        this.component.captchas.solveImage,
        args,
        options,
      ),
  };

  public readonly profiles = {
    list: (
      ctx: SteelComponentContext,
      args: SteelComponentProfileListArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentProfileListArgs, SteelProfileListResult>(
        ctx,
        this.component.profiles.list,
        args,
        options,
      ),
    get: (
      ctx: SteelComponentContext,
      args: SteelComponentProfileGetArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentProfileGetArgs, SteelProfileMetadata>(
        ctx,
        this.component.profiles.get,
        args,
        options,
      ),
    createFromUrl: (
      ctx: SteelComponentContext,
      args: SteelComponentProfileCreateFromUrlArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentProfileCreateFromUrlArgs, SteelProfileMetadata>(
        ctx,
        this.component.profiles.createFromUrl,
        args,
        options,
      ),
    updateFromUrl: (
      ctx: SteelComponentContext,
      args: SteelComponentProfileUpdateFromUrlArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentProfileUpdateFromUrlArgs, SteelProfileMetadata>(
        ctx,
        this.component.profiles.updateFromUrl,
        args,
        options,
      ),
  };
}
