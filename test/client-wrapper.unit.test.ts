import { describe, expect, test } from "vitest";

import { SteelComponent } from "../src/client/index";

const SENTINEL = (path: string) => ({ __ref: path });

const makeComponentHandle = () => ({
  sessions: { create: SENTINEL("sessions.create") },
  topLevel: {
    screenshot: SENTINEL("topLevel.screenshot"),
    scrape: SENTINEL("topLevel.scrape"),
    pdf: SENTINEL("topLevel.pdf"),
  },
});

const makeCtx = () => {
  const calls: Array<{ ref: unknown; args: unknown }> = [];
  return {
    calls,
    ctx: {
      runAction: async (ref: unknown, args: unknown) => {
        calls.push({ ref, args });
        return undefined;
      },
      runQuery: async (ref: unknown, args: unknown) => {
        calls.push({ ref, args });
        return undefined;
      },
    },
  };
};

describe("SteelComponent top-level dispatch", () => {
  const component = new SteelComponent(makeComponentHandle() as any, {
    STEEL_API_KEY: "test-key",
    ownerId: "owner-1",
  });
  const handle = component.component as ReturnType<typeof makeComponentHandle>;

  test("scrape dispatches to topLevel.scrape, not steel.scrape", async () => {
    const { ctx, calls } = makeCtx();
    await component.steel.scrape(ctx, { url: "https://example.com" });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.ref).toBe(handle.topLevel.scrape);
  });

  test("screenshot dispatches to topLevel.screenshot", async () => {
    const { ctx, calls } = makeCtx();
    await component.steel.screenshot(ctx, { url: "https://example.com" });
    expect(calls[0]!.ref).toBe(handle.topLevel.screenshot);
  });

  test("pdf dispatches to topLevel.pdf", async () => {
    const { ctx, calls } = makeCtx();
    await component.steel.pdf(ctx, { url: "https://example.com" });
    expect(calls[0]!.ref).toBe(handle.topLevel.pdf);
  });
});
