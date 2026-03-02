# API Reference (`v0.1`)

## Wrapper

Use `SteelComponent` from [src/client/index.ts](/home/agent/steel-convex-component/src/client/index.ts).

Constructor:

```ts
new SteelComponent(components.steel, {
  STEEL_API_KEY?: string,
  ownerId?: string,
})
```

All wrapper methods require `ownerId` (from method args, options override, or constructor default).  
All action methods require `apiKey` (resolved from method args, options override, constructor, or `process.env.STEEL_API_KEY`).

## Sessions

### Actions

- `sessions.create(ctx, { sessionArgs?, includeRaw?, ownerId? }, options?)`
- `sessions.refresh(ctx, { externalId, includeRaw?, ownerId? }, options?)`
- `sessions.refreshMany(ctx, { status?, cursor?, limit?, includeRaw?, ownerId? }, options?)`
- `sessions.release(ctx, { externalId, ownerId? }, options?)`
- `sessions.releaseAll(ctx, { status?, cursor?, limit?, ownerId? }, options?)`

### Queries

- `sessions.get(ctx, { id, ownerId? }, options?)`
- `sessions.getByExternalId(ctx, { externalId, ownerId? }, options?)`
- `sessions.list(ctx, { status?, cursor?, limit?, ownerId? }, options?)`

### Return Types

- `SteelSessionRecord`
- `SteelListResult`
- `SteelRefreshManyResult`
- `SteelReleaseAllResult`

## Component Internals

Internal functions in [src/component/sessions.ts](/home/agent/steel-convex-component/src/component/sessions.ts):

- `upsert`
- `getInternalByExternalId`
- `listInternalByOwner`

These are used by public actions for local cache reconciliation and release batching.
