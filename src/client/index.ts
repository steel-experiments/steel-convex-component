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
    computer: unknown;
    context: unknown;
    events: unknown;
    liveDetails: unknown;
  };
  sessionFiles: {
    list: unknown;
    upload: unknown;
    uploadFromUrl: unknown;
    delete: unknown;
    deleteAll: unknown;
  };
  captchas: {
    status: unknown;
    solve: unknown;
    solveImage: unknown;
  };
  profiles: {
    list: unknown;
    get: unknown;
    create: unknown;
    update: unknown;
    createFromUrl: unknown;
    updateFromUrl: unknown;
  };
  credentials: {
    create: unknown;
    update: unknown;
    list: unknown;
    delete: unknown;
  };
  extensions: {
    list: unknown;
    upload: unknown;
    update: unknown;
    uploadFromUrl: unknown;
    updateFromUrl: unknown;
    delete: unknown;
    deleteAll: unknown;
    download: unknown;
  };
  files: {
    list: unknown;
    upload: unknown;
    uploadFromUrl: unknown;
    delete: unknown;
    download: unknown;
    downloadToStorage: unknown;
  };
  steel: {
    screenshot: unknown;
    scrape: unknown;
    pdf: unknown;
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

export interface SteelSessionFileRecord {
  sessionExternalId: string;
  path: string;
  size: number;
  lastModified: number;
  ownerId: string;
  lastSyncedAt: number;
}

export interface SteelProfileRecord {
  externalId: string;
  ownerId: string;
  lastSyncedAt: number;
  name?: string;
  userDataDir?: string;
  description?: string;
  raw?: unknown;
}

export interface SteelCredentialRecord {
  externalId: string;
  ownerId: string;
  lastSyncedAt: number;
  name?: string;
  service?: string;
  type?: string;
  username?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  origin?: string;
  namespace?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface SteelExtensionRecord {
  externalId: string;
  ownerId: string;
  lastSyncedAt: number;
  name?: string;
  version?: string;
  description?: string;
  sourceUrl?: string;
  checksum?: string;
  enabled?: boolean;
}

export interface SteelFileRecord {
  externalId: string;
  ownerId: string;
  path: string;
  lastSyncedAt: number;
  name?: string;
  size?: number;
  lastModified?: number;
  sourceUrl?: string;
  mimeType?: string;
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

export interface SteelPaginatedResult<T> {
  items: T[];
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

export interface SteelComponentSessionComputerArgs {
  externalId: string;
  commandArgs: Record<string, unknown>;
  ownerId?: string;
}

export interface SteelComponentSessionSimpleArgs {
  externalId: string;
  ownerId?: string;
}

export interface SteelComponentSessionFileListArgs {
  sessionExternalId: string;
  ownerId?: string;
}

export interface SteelComponentSessionFileUploadArgs {
  sessionExternalId: string;
  file?: string;
  url?: string;
  path?: string;
  fileArgs?: Record<string, unknown>;
  ownerId?: string;
}

export interface SteelComponentSessionFileDeleteArgs {
  sessionExternalId: string;
  path: string;
  ownerId?: string;
}

export interface SteelComponentCaptchaStatusArgs {
  sessionExternalId: string;
  pageId?: string;
  persistSnapshot?: boolean;
  ownerId?: string;
}

export interface SteelComponentCaptchaSolveArgs {
  sessionExternalId: string;
  pageId?: string;
  url?: string;
  taskId?: string;
  commandArgs?: Record<string, unknown>;
  ownerId?: string;
}

export interface SteelComponentCaptchaSolveImageArgs {
  sessionExternalId: string;
  imageXPath: string;
  inputXPath: string;
  url?: string;
  commandArgs?: Record<string, unknown>;
  ownerId?: string;
}

export interface SteelComponentProfileCreateArgs {
  profileArgs?: Record<string, unknown>;
  userDataDirUrl?: string;
  ownerId?: string;
}

export interface SteelComponentProfileUpdateArgs {
  externalId: string;
  profileArgs?: Record<string, unknown>;
  userDataDirUrl?: string;
  ownerId?: string;
}

export interface SteelComponentProfileGetArgs {
  externalId: string;
  ownerId?: string;
}

export interface SteelComponentCredentialCreateArgs {
  credentialArgs?: Record<string, unknown>;
  ownerId?: string;
}

export interface SteelComponentCredentialUpdateArgs {
  credentialArgs?: Record<string, unknown>;
  ownerId?: string;
}

export interface SteelComponentCredentialListArgs {
  queryArgs?: Record<string, unknown>;
  ownerId?: string;
}

export interface SteelComponentCredentialDeleteArgs {
  origin?: string;
  namespace?: string;
  externalId?: string;
  ownerId?: string;
}

export interface SteelComponentExtensionUploadArgs {
  extensionArgs?: Record<string, unknown>;
  url?: string;
  file?: string;
  ownerId?: string;
}

export interface SteelComponentExtensionUpdateArgs {
  externalId: string;
  extensionArgs?: Record<string, unknown>;
  url?: string;
  file?: string;
  ownerId?: string;
}

export interface SteelComponentExtensionDeleteArgs {
  externalId: string;
  ownerId?: string;
}

export interface SteelComponentFileUploadArgs {
  file?: string;
  url?: string;
  path?: string;
  fileArgs?: Record<string, unknown>;
  ownerId?: string;
}

export interface SteelComponentFileDeleteArgs {
  path?: string;
  externalId?: string;
  ownerId?: string;
}

export interface SteelComponentFileDownloadArgs {
  path?: string;
  externalId?: string;
  ownerId?: string;
}

export interface SteelComponentTopLevelArgs {
  url: string;
  delay?: number;
  timeout?: number;
  commandArgs?: Record<string, unknown>;
  ownerId?: string;
}

export class SteelComponent {
  constructor(
    public readonly component: SteelComponentFunctions | Record<string, any>,
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
      this.runQuery<SteelComponentSessionListArgs, SteelPaginatedResult<SteelSessionRecord>>(
        ctx,
        this.component.sessions.list,
        args,
        options,
      ),
    computer: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionComputerArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionComputerArgs, unknown>(
        ctx,
        this.component.sessions.computer,
        args,
        options,
      ),
    context: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionSimpleArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionSimpleArgs, unknown>(
        ctx,
        this.component.sessions.context,
        args,
        options,
      ),
    events: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionSimpleArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionSimpleArgs, unknown>(
        ctx,
        this.component.sessions.events,
        args,
        options,
      ),
    liveDetails: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionSimpleArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionSimpleArgs, unknown>(
        ctx,
        this.component.sessions.liveDetails,
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
      this.runAction<SteelComponentSessionFileListArgs, SteelPaginatedResult<SteelSessionFileRecord>>(
        ctx,
        this.component.sessionFiles.list,
        args,
        options,
      ),
    upload: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionFileUploadArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionFileUploadArgs, SteelSessionFileRecord>(
        ctx,
        this.component.sessionFiles.upload,
        args,
        options,
      ),
    uploadFromUrl: (
      ctx: SteelComponentContext,
      args: SteelComponentSessionFileUploadArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionFileUploadArgs, SteelSessionFileRecord>(
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
      args: SteelComponentSessionFileListArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentSessionFileListArgs, unknown>(
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
      args: SteelComponentCaptchaSolveImageArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentCaptchaSolveImageArgs, unknown>(
        ctx,
        this.component.captchas.solveImage,
        args,
        options,
      ),
  };

  public readonly profiles = {
    list: (
      ctx: SteelComponentContext,
      args: { ownerId?: string },
      options?: SteelComponentOptions,
    ) =>
      this.runAction<{ ownerId?: string }, SteelPaginatedResult<SteelProfileRecord>>(
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
      this.runAction<SteelComponentProfileGetArgs, SteelProfileRecord>(
        ctx,
        this.component.profiles.get,
        args,
        options,
      ),
    create: (
      ctx: SteelComponentContext,
      args: SteelComponentProfileCreateArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentProfileCreateArgs, SteelProfileRecord>(
        ctx,
        this.component.profiles.create,
        args,
        options,
      ),
    update: (
      ctx: SteelComponentContext,
      args: SteelComponentProfileUpdateArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentProfileUpdateArgs, SteelProfileRecord>(
        ctx,
        this.component.profiles.update,
        args,
        options,
      ),
    createFromUrl: (
      ctx: SteelComponentContext,
      args: SteelComponentProfileCreateArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentProfileCreateArgs, SteelProfileRecord>(
        ctx,
        this.component.profiles.createFromUrl,
        args,
        options,
      ),
    updateFromUrl: (
      ctx: SteelComponentContext,
      args: SteelComponentProfileUpdateArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentProfileUpdateArgs, SteelProfileRecord>(
        ctx,
        this.component.profiles.updateFromUrl,
        args,
        options,
      ),
  };

  public readonly credentials = {
    create: (
      ctx: SteelComponentContext,
      args: SteelComponentCredentialCreateArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentCredentialCreateArgs, SteelCredentialRecord>(
        ctx,
        this.component.credentials.create,
        args,
        options,
      ),
    update: (
      ctx: SteelComponentContext,
      args: SteelComponentCredentialUpdateArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentCredentialUpdateArgs, SteelCredentialRecord>(
        ctx,
        this.component.credentials.update,
        args,
        options,
      ),
    list: (
      ctx: SteelComponentContext,
      args: SteelComponentCredentialListArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentCredentialListArgs, SteelPaginatedResult<SteelCredentialRecord>>(
        ctx,
        this.component.credentials.list,
        args,
        options,
      ),
    delete: (
      ctx: SteelComponentContext,
      args: SteelComponentCredentialDeleteArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentCredentialDeleteArgs, unknown>(
        ctx,
        this.component.credentials.delete,
        args,
        options,
      ),
  };

  public readonly extensions = {
    list: (
      ctx: SteelComponentContext,
      args: { ownerId?: string },
      options?: SteelComponentOptions,
    ) =>
      this.runAction<{ ownerId?: string }, SteelPaginatedResult<SteelExtensionRecord>>(
        ctx,
        this.component.extensions.list,
        args,
        options,
      ),
    upload: (
      ctx: SteelComponentContext,
      args: SteelComponentExtensionUploadArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentExtensionUploadArgs, SteelExtensionRecord>(
        ctx,
        this.component.extensions.upload,
        args,
        options,
      ),
    update: (
      ctx: SteelComponentContext,
      args: SteelComponentExtensionUpdateArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentExtensionUpdateArgs, SteelExtensionRecord>(
        ctx,
        this.component.extensions.update,
        args,
        options,
      ),
    uploadFromUrl: (
      ctx: SteelComponentContext,
      args: SteelComponentExtensionUploadArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentExtensionUploadArgs, SteelExtensionRecord>(
        ctx,
        this.component.extensions.uploadFromUrl,
        args,
        options,
      ),
    updateFromUrl: (
      ctx: SteelComponentContext,
      args: SteelComponentExtensionUpdateArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentExtensionUpdateArgs, SteelExtensionRecord>(
        ctx,
        this.component.extensions.updateFromUrl,
        args,
        options,
      ),
    delete: (
      ctx: SteelComponentContext,
      args: SteelComponentExtensionDeleteArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentExtensionDeleteArgs, unknown>(
        ctx,
        this.component.extensions.delete,
        args,
        options,
      ),
    deleteAll: (
      ctx: SteelComponentContext,
      args: { ownerId?: string },
      options?: SteelComponentOptions,
    ) =>
      this.runAction<{ ownerId?: string }, unknown>(
        ctx,
        this.component.extensions.deleteAll,
        args,
        options,
      ),
    download: (
      ctx: SteelComponentContext,
      args: SteelComponentExtensionDeleteArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentExtensionDeleteArgs, unknown>(
        ctx,
        this.component.extensions.download,
        args,
        options,
      ),
  };

  public readonly files = {
    list: (
      ctx: SteelComponentContext,
      args: { ownerId?: string },
      options?: SteelComponentOptions,
    ) =>
      this.runAction<{ ownerId?: string }, SteelPaginatedResult<SteelFileRecord>>(
        ctx,
        this.component.files.list,
        args,
        options,
      ),
    upload: (
      ctx: SteelComponentContext,
      args: SteelComponentFileUploadArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentFileUploadArgs, SteelFileRecord>(
        ctx,
        this.component.files.upload,
        args,
        options,
      ),
    uploadFromUrl: (
      ctx: SteelComponentContext,
      args: SteelComponentFileUploadArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentFileUploadArgs, SteelFileRecord>(
        ctx,
        this.component.files.uploadFromUrl,
        args,
        options,
      ),
    delete: (
      ctx: SteelComponentContext,
      args: SteelComponentFileDeleteArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentFileDeleteArgs, unknown>(
        ctx,
        this.component.files.delete,
        args,
        options,
      ),
    download: (
      ctx: SteelComponentContext,
      args: SteelComponentFileDownloadArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentFileDownloadArgs, unknown>(
        ctx,
        this.component.files.download,
        args,
        options,
      ),
    downloadToStorage: (
      ctx: SteelComponentContext,
      args: SteelComponentFileDownloadArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentFileDownloadArgs, unknown>(
        ctx,
        this.component.files.downloadToStorage,
        args,
        options,
      ),
  };

  public readonly steel = {
    screenshot: (
      ctx: SteelComponentContext,
      args: SteelComponentTopLevelArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentTopLevelArgs, unknown>(
        ctx,
        this.component.steel.screenshot,
        args,
        options,
      ),
    scrape: (
      ctx: SteelComponentContext,
      args: SteelComponentTopLevelArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentTopLevelArgs, unknown>(
        ctx,
        this.component.steel.scrape,
        args,
        options,
      ),
    pdf: (
      ctx: SteelComponentContext,
      args: SteelComponentTopLevelArgs,
      options?: SteelComponentOptions,
    ) =>
      this.runAction<SteelComponentTopLevelArgs, unknown>(
        ctx,
        this.component.steel.pdf,
        args,
        options,
      ),
  };
}
