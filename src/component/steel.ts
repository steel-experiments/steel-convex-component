import Steel from "steel-sdk";
import { normalizeError } from "./normalize";

export interface SteelSessionArgs {
  apiKey?: string;
}

export interface SteelClient {
  [key: string]: unknown;
}

export type SteelClientFactory = (
  args: SteelSessionArgs,
  options?: SteelClientOptions,
) => SteelClient;

export interface SteelClientOptions {
  operation?: string;
}

const TEST_STEEL_CLIENT_FACTORY_KEY = "__steelComponentTestSteelClientFactory";

const getGlobalTestFactory = (): SteelClientFactory | undefined => {
  const globalContext = globalThis as { [key: string]: unknown };
  const current = globalContext[TEST_STEEL_CLIENT_FACTORY_KEY];

  if (typeof current === "function") {
    return current as SteelClientFactory;
  }

  return undefined;
};

const isNonEmptyApiKey = (apiKey: string | undefined): apiKey is string =>
  typeof apiKey === "string" && apiKey.trim().length > 0;

export const __setTestSteelClientFactory = (factory?: SteelClientFactory): void => {
  const globalContext = globalThis as { [key: string]: unknown };
  if (factory === undefined) {
    delete globalContext[TEST_STEEL_CLIENT_FACTORY_KEY];
    return;
  }

  globalContext[TEST_STEEL_CLIENT_FACTORY_KEY] = factory;
};

export const createSteelClient = (
  args: SteelSessionArgs,
  options: SteelClientOptions = {},
): SteelClient => {
  if (!isNonEmptyApiKey(args.apiKey)) {
    throw normalizeError(
      "Missing STEEL API key: pass `apiKey` in action arguments from the app wrapper context.",
      options.operation ?? "steel.client",
    );
  }

  const testFactory = getGlobalTestFactory();
  if (testFactory) {
    return testFactory(args, options);
  }

  return new Steel({ apiKey: args.apiKey.trim() }) as SteelClient;
};
