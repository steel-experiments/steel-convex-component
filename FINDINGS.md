# Findings

## Production Blockers

1. `Critical`: Session listing is functionally broken; tenant lists are empty even after successful upserts.
- Query path: [sessions.ts:683](/home/agent/steel-convex-component/src/component/sessions.ts:683), [sessions.ts:695](/home/agent/steel-convex-component/src/component/sessions.ts:695)
- Failing expectations: [sessions.unit.test.ts:134](/home/agent/steel-convex-component/test/sessions.unit.test.ts:134), [sessions.integration.test.ts:80](/home/agent/steel-convex-component/test/sessions.integration.test.ts:80), [sessions.integration.test.ts:51](/home/agent/steel-convex-component/test/sessions.integration.test.ts:51)
- Impact: tenant isolation and lifecycle UX are not reliable in production.

2. `Critical`: Steel SDK integration is still incompatible at runtime.
- `retrieve/get` is invoked unbound, causing runtime failure (`Cannot read properties of undefined (reading '_client')`): [sessions.ts:325](/home/agent/steel-convex-component/src/component/sessions.ts:325), [sessions.ts:332](/home/agent/steel-convex-component/src/component/sessions.ts:332)
- Component calls methods not present in the SDK surface:
  - files: `uploadFromUrl`, `downloadToStorage` in [files.ts:184](/home/agent/steel-convex-component/src/component/files.ts:184), [files.ts:215](/home/agent/steel-convex-component/src/component/files.ts:215) vs SDK methods in [files.d.ts:3](/home/agent/steel-convex-component/node_modules/steel-sdk/resources/files.d.ts:3)
  - extensions: `uploadFromUrl`, `updateFromUrl` in [extensions.ts:233](/home/agent/steel-convex-component/src/component/extensions.ts:233), [extensions.ts:246](/home/agent/steel-convex-component/src/component/extensions.ts:246) vs SDK in [extensions.d.ts:3](/home/agent/steel-convex-component/node_modules/steel-sdk/resources/extensions.d.ts:3)
  - profiles: `createFromUrl`, `updateFromUrl` in [profiles.ts:270](/home/agent/steel-convex-component/src/component/profiles.ts:270), [profiles.ts:283](/home/agent/steel-convex-component/src/component/profiles.ts:283) vs SDK in [profiles.d.ts:3](/home/agent/steel-convex-component/node_modules/steel-sdk/resources/profiles.d.ts:3)

3. `Critical`: Release pipeline can publish a package with missing runtime artifacts.
- Exports point to `dist/*`: [package.json:22](/home/agent/steel-convex-component/package.json:22)
- `prepublishOnly` does not run `build`: [package.json:20](/home/agent/steel-convex-component/package.json:20)
- `build` requires Convex deployment context and currently fails in clean env (`No CONVEX_DEPLOYMENT set`): [package.json:9](/home/agent/steel-convex-component/package.json:9)

4. `High`: TypeScript typecheck is failing, so compile-time safety is not production-ready.
- `npm run typecheck` currently errors across component modules (index range typing, ambiguous re-exports, action/query typing).
- Example ambiguity source: [src/component/index.ts:1](/home/agent/steel-convex-component/src/component/index.ts:1)

5. `High`: Module barrel now has conflicting star exports for common names (`list`, `upsert`, `delete`, etc.), which breaks strict TS builds.
- Source: [src/component/index.ts:1](/home/agent/steel-convex-component/src/component/index.ts:1)

## Open Questions / Assumptions

1. Do you want the package to support only `v0.1` sessions now (as spec says), and defer all non-session modules until SDK parity is implemented?
2. Should releases require Convex-authenticated CI, or should generated artifacts be committed so `npm publish` is deterministic without deployment auth?

## Change Summary

Partial hardening was applied (server binding fix, added `_generated/api`, corrected Steel API key option, tenant enforcement tightening, test harness module loading fix), but the blockers above remain and the codebase is not production-ready yet.
