<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Temporary backend — slated for removal

This app is a stopgap backend for the mobile app while endpoints migrate to the hosted Laravel API. Do not build new features here; only maintain existing endpoints that not-yet-migrated mobile screens (via `legacyFetch` in `apps/mobile/api/legacy.ts`) still depend on. `docs/index.md` at the repo root documents every endpoint and the schema — keep response shapes stable.
