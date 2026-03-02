# Steel Convex Component

Sessions-focused Convex Component for Steel (`v0.1` scope).

## Scope

- Implemented: sessions lifecycle and cache
  - `create`, `refresh`, `refreshMany`, `release`, `releaseAll`
  - `get`, `getByExternalId`, `list`
- Required for all public calls: `ownerId`
- Out of scope in `v0.1`: files, captchas, profiles, credentials, extensions, top-level utilities

## Install

```bash
npm i steel-convex-component
```

Peer dependency: `convex@^1.32.0`  
Runtime dependency: `steel-sdk@^0.17.0`

## Quick Start

```ts
import { defineApp } from "convex/server";
import steel from "steel-convex-component/convex.config";

const app = defineApp();
app.use(steel);
export default app;
```

```ts
import { action } from "./_generated/server";
import { components } from "./_generated/server";
import { SteelComponent } from "steel-convex-component";

const steel = new SteelComponent(components.steel, {
  STEEL_API_KEY: process.env.STEEL_API_KEY,
});

export const createSession = action({
  args: {},
  handler: async (ctx) =>
    steel.sessions.create(
      ctx,
      { sessionArgs: { timeout: 120000 } },
      { ownerId: "tenant-a" },
    ),
});
```

## Data Model

Component table:

- `sessions`
  - indexed by `externalId`, `status`, `createdAt`, `ownerId`
  - `ownerId` is required

## Development

```bash
npm run typecheck
npm run test
npm run build
```

Live integration smoke test is opt-in:

```bash
STEEL_API_KEY=... STEEL_LIVE_TEST=1 npm test
```

## API Docs

See [`API.md`](./API.md).
