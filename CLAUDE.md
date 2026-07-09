# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ConvenientConnect — an npm-workspaces monorepo:

- `apps/mobile` — the product: an Expo (React Native) app using Expo Router. Uses `expo-dev-client`, so it runs as a native development build, not Expo Go.
- `apps/web` — a **temporary** Next.js backend (Prisma + Supabase + Stripe Connect) that will eventually be removed. The real backend is a hosted Laravel API. Prefer the Laravel API for new mobile work; only touch `apps/web` to keep not-yet-migrated screens working.

Root `package.json` pins `react` 19.1.0 and `react-native` 0.81.5 via `overrides`. There is no test suite.

## Commands

Install from the repo root: `npm install`.

### Mobile (`apps/mobile`)

```bash
npm run android        # expo run:android (needs a running/created AVD)
npm run ios            # expo run:ios (macOS only)
npx expo start         # reopen an already-installed dev build
npm run lint           # expo lint
npm run generate:api   # regenerate api/generated/api-types.ts from api-docs.json (openapi-typescript)
```

- **Android requires JDK 17** — newer JDKs fail the Gradle build. `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`.
- `EXPO_PUBLIC_*` env vars are inlined at bundle time — after changing `.env`, restart Metro with `npx expo start --clear`.
- `apps/mobile/.env` is committed; machine-specific values (e.g. `EXPO_PUBLIC_API_URL` pointing at your LAN IP) belong in untracked `.env.local`, which overrides it.
- README.md has a troubleshooting table for Gradle/native build failures.

### Web (`apps/web`)

```bash
npm run dev            # next dev --webpack (serves the legacy API on :3000)
npm run build          # prisma generate && next build --webpack
npm run lint           # eslint
```

Database reset/seed (from `apps/web`):

```bash
npx prisma db push --force-reset && npx prisma db push && npx prisma db seed
```

`apps/web` has its own CLAUDE.md/AGENTS.md: the installed Next.js (16.x) has breaking changes — read `node_modules/next/dist/docs/` before writing Next.js code there.

## Architecture

### Two backends (key thing to understand)

`apps/mobile/api/client.ts` defines two fetch layers the app uses side by side during the migration:

- **`laravelFetch`** → the primary hosted Laravel API (`EXPO_PUBLIC_LARAVEL_API_URL`, `/api/v1`). Sends a bearer token, unwraps the Laravel envelope `{ status, message, data, meta }` and returns `data`. A 401 clears the stored token and fires the `setOnUnauthorized` callback (wired up in `AuthContext` to redirect to login). `toAbsoluteUrl()` resolves relative `/storage/...` paths against the Laravel host.
- **`legacyFetch`** → the temporary Next.js backend (`EXPO_PUBLIC_API_URL`, `apps/web`). No auth; errors are `{ error: string }`. Endpoints live in `apps/mobile/api/legacy.ts` and are still used by the edit-service screens. Don't build new features against it.

Both throw `ApiError` (message + statusCode). Typed request/response shapes for the Laravel API are generated into `apps/mobile/api/generated/api-types.ts` from `api-docs.json` — regenerate with `npm run generate:api` rather than hand-writing types.

### Mobile app structure

- **Routing**: Expo Router file-based routing under `apps/mobile/app/`, organized into route groups: `(onboarding)` (signup/OTP flows), `(tabs)` (main nav), `(services)`, `(account)`, `(earnings)`, `(support)`.
- **Auth**: `apps/mobile/auth/` — `token-store.ts` persists the bearer token in `expo-secure-store` (with an in-memory fallback when the native module isn't linked, e.g. stale dev build); `AuthContext.tsx` holds the session (`AuthUserProfile`), handles login/logout, and uses router segments to gate navigation.
- **Domain API modules**: `apps/mobile/api/` (`auth.ts`, `profile.ts`, `business.ts`, `address.ts`, `location.ts`, `legacy.ts`) wrap the fetch layers — screens call these, not `fetch` directly.
- **Theming**: tokens (colors, fonts) in `apps/mobile/constants/theme.ts`; shared UI in `apps/mobile/components/`.

### Temporary web backend

- API routes: `apps/web/app/api/**/route.ts`; Prisma schema: `apps/web/prisma/schema.prisma`; clients in `apps/web/lib/` (`prisma.ts`, `supabase.ts`, `stripe.ts`, `stripe-verification.ts`).
- `docs/index.md` is the full reference for its database design and every endpoint (services, availability, uploads, support tickets, Stripe Connect) — consult it before changing legacy endpoints, since the mobile app depends on those shapes.
- Stripe Connect uses the V2 Accounts API with destination charges; user verification flags are reconciled both via the status endpoint and V2 thin-event webhooks (local forwarding command is in `docs/index.md`).
