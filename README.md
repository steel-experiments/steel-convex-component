# Steel Convex Component

This package exposes a Convex Component wrapper for the Steel API and a typed
Convex-side client helper for easy app integration.

- Source project scope: multi-tenant session lifecycle + optional adjacent
  resource modules.
- Runtime boundary: Component actions/queries run in the Convex component and call
  Steel through `steel-sdk`.
- Wrapper boundary: App code consumes the component via `SteelComponent` in
  `src/client/index.ts`.

## Install

```bash
npm i steel-convex-component
```

Peer dependency:

- `convex` `^1.32.0`

Runtime dependency:

- `steel-sdk` `^0.17.0`

## Quick start

1. Add the component to your Convex app config.
2. Create a thin app module that normalizes tenant identity and API key handling.
3. Call the wrapper methods from app-side Convex functions.

### 1) Add component to app Convex config

`src/convex/convex.config.ts`:

```ts
import { defineApp } from "convex/server";
import steel from "steel-convex-component/convex.config";

const app = defineApp();
app.use(steel);
export default app;
```

### 2) Use the app wrapper in Convex functions

```ts
import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { components } from "./_generated/server";
import { SteelComponent } from "steel-convex-component";

const steel = new SteelComponent(components.steel, {
  STEEL_API_KEY: process.env.STEEL_API_KEY,
});

const requireOwner = (ownerId: string) => {
  const normalized = ownerId?.trim();
  if (!normalized) {
    throw new Error("ownerId is required");
  }
  return normalized;
};

export const createSession = action({
  args: {
    ownerId: v.string(),
    sessionArgs: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) =>
    steel.sessions.create(
      ctx,
      {
        sessionArgs: args.sessionArgs,
      },
      { ownerId: requireOwner(args.ownerId) },
    ),
});

export const getSession = query({
  args: {
    ownerId: v.string(),
    externalId: v.string(),
  },
  handler: async (ctx, args) =>
    steel.sessions.getByExternalId(
      ctx,
      {
        externalId: args.externalId,
      },
      { ownerId: requireOwner(args.ownerId) },
    ),
});
```

### 3) Optional constructor defaults

The wrapper supports default options for every call:

- `new SteelComponent(components.steel, { STEEL_API_KEY, ownerId })`
- per-call overrides:
  - `steel.sessions.list(ctx, args, { STEEL_API_KEY, ownerId })`

## Core model

### What lives locally in Convex

The component keeps local, reactive metadata for major resources:

- `sessions`
- `sessionFileMetadata`
- `globalFiles`
- `captchaStates`
- `profiles`
- `credentials`
- `extensions`

These are persisted as normalized metadata for queryability and reconciliation.
Raw binary payloads are not stored by default.

### Write-through and sync behavior

- Mutating session operations (`create`, `refresh`, `release`, `releaseAll`) pull
  remote responses and upsert local session rows.
- Reconcile operations (`refresh` / `refreshMany`) can normalize remote state back
  into local tables.
- List/get queries are local, reactive, and owner-filtered.

## Security and tenant scoping

Security is tenant-aware and explicit:

- `ownerId` is enforced by the wrapper for all public methods.
- `Steel` API key is never read from component runtime environment.
  It is injected by `SteelComponent` from:
  - method option
  - wrapper constructor option `STEEL_API_KEY`
  - `process.env.STEEL_API_KEY` in app execution context.
- If `ownerId` is missing, the wrapper throws before remote calls are made.
- Session/action queries that receive an `ownerId` mismatch throw `ownerId mismatch`
  errors.

`STEEL_API_KEY` is treated as a secret and injected only when operations are
invoked.

## Component API reference

See [`API.md`](API.md) for a module-by-module matrix and typed method signatures.

## Actions vs queries

- Sessions: `get`, `getByExternalId`, `list` are queries.
- Most other public surfaces are actions that call Steel and may write normalized
  metadata into local tables.
- Internal reconciliation helpers are component-private and used by public
  operations.

## Error model

Component wrappers normalize errors into a structured contract from `src/component/normalize.ts`:

- `provider: "steel"`
- `message`
- `status?`
- `code?`
- `retryable`
- `operation`

## Pagination model

List-style methods for sessions/files/profiles/captchas/extensions/resources use:

- `cursor?: string`
- `limit?: number`
- `hasMore` and optional `continuation` response fields

Default `limit` is `50`, maximum is `100`.

## Development

```bash
npm run build
npm run codegen
npm run test
```

### Release workflow

```bash
npm run release:verify
npm run release
npm run publish:dry-run
npm run release:publish
```

For the full checklist and Convex submission hardening steps, use
[`RELEASE.md`](RELEASE.md).

The package exports the component config and generated component entry:

- `.` (main library exports, includes `SteelComponent`)
- `./convex.config.js`
- `./convex.config`
- `./_generated/component.js`
- `./_generated/component`
- `./test`

## Version and dependency notes

Built against:

- `steel-sdk`: `^0.17.0`
- `convex`: `^1.32.0`
- Node style modules with TypeScript declarations

## Contributing

This repository includes unit and integration tests for session lifecycle and tenant
isolation under `test/`.
