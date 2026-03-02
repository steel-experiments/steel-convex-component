import Steel from "steel-sdk";
import { normalizeError } from "./normalize";

export interface SteelSessionArgs {
  apiKey?: string;
}

export interface SteelClient {
  [key: string]: unknown;
}

export interface SteelClientOptions {
  operation?: string;
}

const isNonEmptyApiKey = (apiKey: string | undefined): apiKey is string =>
  typeof apiKey === "string" && apiKey.trim().length > 0;

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

  return new Steel({ apiKey: args.apiKey.trim() }) as SteelClient;
};
