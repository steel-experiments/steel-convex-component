export interface SteelComponentOptions {
  STEEL_API_KEY?: string;
}

export interface SteelComponentApiArgs {
  apiKey?: string;
}

export interface SteelComponentContext {
  readonly component: unknown;
  readonly options?: SteelComponentOptions;
}

export class SteelComponent {
  constructor(
    public readonly component: unknown,
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

  // Placeholder for future app-facing wrapper methods.
}
