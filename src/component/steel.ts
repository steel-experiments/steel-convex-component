import Steel from "steel-sdk";

export interface SteelSessionArgs {
  apiKey?: string;
}

export interface SteelClient {
  [key: string]: unknown;
}

const isNonEmptyApiKey = (apiKey: string | undefined): apiKey is string =>
  typeof apiKey === "string" && apiKey.trim().length > 0;

export const createSteelClient = (args: SteelSessionArgs): SteelClient => {
  if (!isNonEmptyApiKey(args.apiKey)) {
    throw new Error(
      "Missing STEEL API key: pass `apiKey` in action arguments from the app wrapper context.",
    );
  }

  return new Steel({ apiKey: args.apiKey.trim() }) as SteelClient;
};
