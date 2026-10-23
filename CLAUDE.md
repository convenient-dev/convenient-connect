# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ConvenientConnect — a repo with two independent apps (no root `package.json`; each app has its own `node_modules` and lockfile):

- `apps/mobile` — the product: an Expo (React Native) app using Expo Router. Uses `expo-dev-client`, so it runs as a native development build, not Expo Go.
- `apps/web` — a **temporary** Next.js backend (Prisma + Supabase + Stripe Connect) that will eventually be removed. The mobile app no longer calls it: every mobile API call goes to the hosted Laravel API. Screens whose endpoints the Laravel contract does not cover yet (earnings, support tickets, FAQ, share, calendar) are static placeholders, not legacy-backed.

`apps/mobile/package.json` pins `react` 19.1.0 and `react-native` 0.81.5 via `overrides`. There is no test suite.

## Commands

Install per app: run `npm install` inside `apps/mobile` (and inside `apps/web` if you need the legacy backend). Do not run npm from the repo root.

### Mobile (`apps/mobile`)

```bash
npm run android        # expo run:android (needs a running/created AVD)
npm run ios            # expo run:ios (macOS only)
npx expo start         # reopen an already-installed dev build
npm run lint           # expo lint
npm run generate:api   # regenerate api/generated/api-types.ts from api-doc.json (openapi-typescript)
```

- **Android requires JDK 17** — newer JDKs fail the Gradle build. `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`.
- `EXPO_PUBLIC_*` env vars are inlined at bundle time — after changing `.env`, restart Metro with `npx expo start --clear`.
- `apps/mobile/.env` is committed; machine-specific values (e.g. `EXPO_PUBLIC_LARAVEL_API_URL` pointing at a different Laravel host) belong in untracked `.env.local`, which overrides it.
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

### API layer (key thing to understand)

`apps/mobile/api-doc.json` is the OpenAPI contract for the hosted Laravel API and the single source of truth for every request/response shape. Never edit it; read it before touching API code and report any mismatch between it and the implementation.

`apps/mobile/api/client.ts` is the only fetch layer:

- **`laravelFetch`** → the Laravel API (`EXPO_PUBLIC_LARAVEL_API_URL`, `/api/v1`). Sends a bearer token, unwraps the Laravel envelope `{ status, message, data, meta }` and returns `data`; `laravelFetchWithMeta` keeps `meta` for paginated lists. A 401 clears the stored token and fires the `setOnUnauthorized` callback (wired up in `AuthContext` to log out). A 403 whose `data.code` is `PROVIDER_ACCOUNT_SUSPENDED` fires `setOnSuspended` so `AuthContext` can update the session's `accountStatus` without a refetch. `toAbsoluteUrl()` resolves relative `/storage/...` paths against the Laravel host.
- Errors are thrown as `ApiError` (message, statusCode, and the envelope's `data`). Helpers such as `isCommercialPublishabilityError` and `getValidationIssues` read structured 422 payloads.
- Typed shapes are generated into `apps/mobile/api/generated/api-types.ts` from `api-doc.json` — regenerate with `npm run generate:api` rather than hand-writing types.

### Mobile app structure

- **Routing**: Expo Router file-based routing under `apps/mobile/app/`, organized into route groups: `(onboarding)` (signup/OTP flows), `(tabs)` (main nav), `(services)`, `(account)`, `(earnings)`, `(support)`.
- **Auth**: `apps/mobile/auth/` — `token-store.ts` persists the bearer token in `expo-secure-store` (with an in-memory fallback when the native module isn't linked, e.g. stale dev build); `AuthContext.tsx` holds the session (`AuthUserProfile`, including `accountStatus` and an `isSuspended` flag), handles login/logout, exposes `refreshAccountStatus()`, and uses router segments to gate navigation. Suspended providers stay signed in with read access; `components/SuspendedBanner.tsx` shows the reason on the home and services tabs, and marketplace writes surface the API's 403 message.
- **Domain API modules**: `apps/mobile/api/` (`auth.ts`, `profile.ts`, `account-status.ts`, `address.ts`, `location.ts`, `business.ts`, `business-members.ts`, `availability.ts`, `home.ts`, `services.ts` for the business-wizard category picker, `service-management.ts` for My Services) wrap `laravelFetch` — screens call these, not `fetch` directly. `multipart.ts` builds the multipart bodies the service endpoints expect. `invite-codes.ts` is an in-memory placeholder; the contract has no invite-code endpoints yet.
- **Service forms**: `services/template/` and `hooks/use-template-form.ts` render the API-driven service form template (visibility predicates, validation, prefill, payload routing by `submit_as`) used by create, edit-information and candidate saves.
- **Not yet integrated** (endpoints exist in the contract, no app code): `/requests/*`, `/chats/*`, `/account-settings/verify-id`, Apple login.
- **Business management** (`apps/mobile/app/(account)/business-management/`): `index.tsx` lists businesses; `[id]/` holds the per-business hub (`index`), read-only `details`, and `edit`; `create/index.tsx` is step 1 of the create wizard; `steps/` holds the wizard steps shared by both flows (`select-category`, `select-subcategories`, `documents`, `bank-account`). Steps run in edit mode when given `flow=edit-business` and `businessId` params, and the final step calls the update endpoint instead of create when `businessId` is present.
- **Theming**: tokens (colors, fonts) in `apps/mobile/constants/theme.ts`; shared UI in `apps/mobile/components/`.

### Temporary web backend

- Unused by the mobile app. Kept only until it is removed; do not add mobile features against it.
- API routes: `apps/web/app/api/**/route.ts`; Prisma schema: `apps/web/prisma/schema.prisma`; clients in `apps/web/lib/` (`prisma.ts`, `supabase.ts`, `stripe.ts`, `stripe-verification.ts`).
- `docs/index.md` is the full reference for its database design and every endpoint (services, availability, uploads, support tickets, Stripe Connect).
- Stripe Connect uses the V2 Accounts API with destination charges; user verification flags are reconciled both via the status endpoint and V2 thin-event webhooks (local forwarding command is in `docs/index.md`).
