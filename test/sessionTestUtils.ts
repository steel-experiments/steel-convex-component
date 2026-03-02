import { convexTest } from "convex-test";
import type { SchemaDefinition, GenericSchema } from "convex/server";
import { schema as appSchema } from "../example/convex/schema";
import { schema as componentSchema } from "../src/component/schema";
import {
  registerMockSteelClient,
  resetMockSteelClient,
  type MockSteelClientOptions,
} from "../src/test";

import type { TestConvex } from "convex-test";

export type FunctionPath = {
  componentPath: string;
  udfPath: string;
};

const componentModules = import.meta.glob(
  "../src/component/{sessions,schema,convex.config,_generated/api,_generated/server,_generated/dataModel}.ts",
);
const appModules = import.meta.glob("../example/convex/**/*.ts");
const testModules = { ...appModules, ...componentModules };

export const createSteelTestHarness = (): TestConvex<
  SchemaDefinition<GenericSchema, boolean>
> => {
  const t = convexTest<SchemaDefinition<GenericSchema, boolean>>(
    appSchema as SchemaDefinition<GenericSchema, boolean>,
    testModules,
  );
  t.registerComponent("steel", componentSchema, componentModules);
  return t;
};

export const steelFunction = (udfPath: string): FunctionPath => ({
  componentPath: "steel",
  udfPath,
});

export const resetSteelClientMock = (): void => resetMockSteelClient();

export const createMockSteelClient = (options: MockSteelClientOptions = { sessions: [] }) => {
  resetMockSteelClient();
  return registerMockSteelClient(options);
};
