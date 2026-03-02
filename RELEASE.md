# Release Checklist

## Pre-release

- [ ] Confirm `v0.1` sessions-only scope is still accurate.
- [ ] Run verification locally:
  - `npm run typecheck`
  - `npm run build`
  - `npm run test`
  - `npm run release:verify`

## Publish Safety

- [ ] Confirm package exports are valid and artifacts exist:
  - `dist/index.js`, `dist/index.d.ts`
  - `dist/component/convex.config.js`, `dist/component/convex.config.d.ts`
  - `_generated/component.js`
- [ ] Dry run:
  - `npm run publish:dry-run`

## Publish

- [ ] Publish package:
  - `npm run release:publish`
- [ ] Tag release in Git.
