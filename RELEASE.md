# Release checklist

## Pre-release hardening

- [ ] Confirm version bump and changelog impact are intentional.
- [ ] Run local build and typecheck validation:
  - `npm run release:verify`
- [ ] Run tests:
  - `npm run test`
- [ ] Validate generated component artifacts are refreshed:
  - `npm run codegen`
  - ensure `dist/` contains updated declarations and entrypoints.

## NPM publish

- [ ] Verify `package.json` metadata is correct for the release:
  - `name`, `version`, `peerDependencies`, `dependencies`, and `exports`.
- [ ] Confirm release artifacts are expected:
  - `dist/index.js`, `dist/index.d.ts`
  - `dist/component/convex.config.js`, `dist/component/convex.config.d.ts`
  - `./_generated/component.js`
- [ ] Run a dry run:
  - `npm run publish:dry-run`
- [ ] Publish to npm:
  - `npm run release:publish`

## Convex component submission

- [ ] Confirm package exports include component entry points:
  - `./convex.config.js`, `./convex.config`
  - `./_generated/component.js`, `./_generated/component`
  - `./test`
- [ ] Verify component authoring assumptions in repo docs and source:
  - `src/component/convex.config.ts`
  - `src/client/index.ts`
  - `src/component/steel.ts`
- [ ] Tag and publish release once npm artifacts are available.
- [ ] Update `README.md`/`API.md` links and examples if needed for the new version.
