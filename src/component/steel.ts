import Steel from "steel-sdk";
import { normalizeError } from "./normalize";

export type { Steel };

export interface SteelClientOptions {
  operation?: string;
}

export type SteelClientFactory = (
  apiKey: string,
  options?: SteelClientOptions,
) => Steel;

const TEST_STEEL_CLIENT_FACTORY_KEY = "__steelComponentTestSteelClientFactory";

const getGlobalTestFactory = (): SteelClientFactory | undefined => {
  const globalContext = globalThis as { [key: string]: unknown };
  const current = globalContext[TEST_STEEL_CLIENT_FACTORY_KEY];

  if (typeof current === "function") {
    return current as SteelClientFactory;
  }

  return undefined;
};

export const __setTestSteelClientFactory = (
  factory?: SteelClientFactory,
): void => {
  const globalContext = globalThis as { [key: string]: unknown };
  if (factory === undefined) {
    delete globalContext[TEST_STEEL_CLIENT_FACTORY_KEY];
    return;
  }

  globalContext[TEST_STEEL_CLIENT_FACTORY_KEY] = factory;
};

export const createSteelClient = (
  apiKey: string,
  options: SteelClientOptions = {},
): Steel => {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw normalizeError(
      "Missing STEEL API key: pass `apiKey` in action arguments from the app wrapper context.",
      options.operation ?? "steel.client",
    );
  }

  const testFactory = getGlobalTestFactory();
  if (testFactory) {
    return testFactory(trimmed, options);
  }

  return new Steel({ steelAPIKey: trimmed });
};
