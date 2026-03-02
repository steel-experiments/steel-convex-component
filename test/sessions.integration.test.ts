import { beforeEach, describe, expect, test } from "vitest";

import {
  createMockSteelClient,
  createSteelTestHarness,
  resetSteelClientMock,
  steelFunction,
} from "./sessionTestUtils";

const liveApiKey = typeof process !== "undefined" ? process.env.STEEL_API_KEY : undefined;
const hasLiveMode =
  typeof liveApiKey === "string" &&
  liveApiKey.trim().length > 0 &&
  process.env.STEEL_LIVE_TEST === "1";

describe("steel sessions integration smoke tests", () => {
  beforeEach(() => {
    createMockSteelClient();
  });

  test("runs create, refresh, and release flow for a single tenant", async () => {
    const t = createSteelTestHarness();
    const ownerId = "tenant-integration-primary";

    const created = await t.fun(steelFunction("sessions:create"), {
      ownerId,
      apiKey: "unit-test-key",
      includeRaw: true,
      sessionArgs: {
        image: "chrome",
        timeout: 240,
      },
    });
    expect(created.ownerId).toBe(ownerId);

    const refreshed = await t.fun(steelFunction("sessions:refresh"), {
      externalId: created.externalId,
      ownerId,
      apiKey: "unit-test-key",
    });
    expect(refreshed.externalId).toBe(created.externalId);

    const released = await t.fun(steelFunction("sessions:release"), {
      externalId: created.externalId,
      ownerId,
      apiKey: "unit-test-key",
    });
    expect(released.status).toBe("released");

    const listAfterRelease = await t.fun(steelFunction("sessions:list"), {
      ownerId,
      status: "released",
    });
    expect(listAfterRelease.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          externalId: created.externalId,
          status: "released",
          ownerId,
        }),
      ]),
    );
  });

  test("keeps tenant-specific visibility separate", async () => {
    const t = createSteelTestHarness();
    const ownerOne = "tenant-integration-one";
    const ownerTwo = "tenant-integration-two";

    const tenantOneSession = await t.fun(steelFunction("sessions:create"), {
      ownerId: ownerOne,
      apiKey: "unit-test-key",
      sessionArgs: { image: "chrome", timeout: 120 },
    });

    const tenantTwoSession = await t.fun(steelFunction("sessions:create"), {
      ownerId: ownerTwo,
      apiKey: "unit-test-key",
      sessionArgs: { image: "firefox", timeout: 120 },
    });

    const ownerOneList = await t.fun(steelFunction("sessions:list"), { ownerId: ownerOne });
    expect(ownerOneList.items).toHaveLength(1);
    expect(ownerOneList.items[0].ownerId).toBe(ownerOne);
    expect(ownerOneList.items[0].externalId).toBe(tenantOneSession.externalId);

    const ownerTwoList = await t.fun(steelFunction("sessions:list"), { ownerId: ownerTwo });
    expect(ownerTwoList.items).toHaveLength(1);
    expect(ownerTwoList.items[0].ownerId).toBe(ownerTwo);
    expect(ownerTwoList.items[0].externalId).toBe(tenantTwoSession.externalId);

    const crossTenantRead = t.fun(steelFunction("sessions:getByExternalId"), {
      externalId: tenantOneSession.externalId,
      ownerId: ownerTwo,
    });
    await expect(crossTenantRead).rejects.toThrow(
      /ownerId mismatch for session query|Missing ownerId/i,
    );
  });
});

describe.runIf(hasLiveMode)("steel sessions live smoke tests", () => {
  beforeEach(() => {
    resetSteelClientMock();
  });

  test("performs live smoke check when STEEL_API_KEY is provided", async () => {
    const t = createSteelTestHarness();
    const ownerId = `tenant-live-${Math.random().toString(36).slice(2, 10)}`;
    const apiKey = liveApiKey!.trim();

    const created = await t.fun(steelFunction("sessions:create"), {
      ownerId,
      apiKey,
      sessionArgs: { image: "chrome", timeout: 120 },
    });
    expect(created.externalId).toEqual(expect.any(String));

    const refreshed = await t.fun(steelFunction("sessions:refresh"), {
      externalId: created.externalId,
      ownerId,
      apiKey,
    });
    expect(refreshed.externalId).toBe(created.externalId);

    const released = await t.fun(steelFunction("sessions:release"), {
      externalId: created.externalId,
      ownerId,
      apiKey,
    });
    expect(released.status).toBe("released");
  });
});
