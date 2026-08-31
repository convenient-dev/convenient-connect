# ConvenientConnect

A monorepo containing a React Native mobile app and a Next.js web app.

## Structure

```
my-app/
├── apps/
│   ├── mobile/   # Expo (React Native) app
│   └── web/      # Next.js app
└── packages/     # Shared packages
```

## Prerequisites

- **Node.js 20+** and **npm 10+**
- **JDK 17** — required for the Android build. Newer JDKs (21, 24, 25) are **not** supported by React Native 0.81 / Expo SDK 54 and will fail the Gradle build. ([Temurin 17](https://adoptium.net/temurin/releases/?version=17) or `brew install --cask zulu@17`)
  - **Configure your shell:** Add to `~/.zshrc` (or `~/.bashrc`):
    ```bash
    export JAVA_HOME=$(/usr/libexec/java_home -v 17)
    ```
  - **For existing sessions:** Run `source ~/.zshrc` or open a new terminal
- **Android** — [Android Studio](https://developer.android.com/studio) with an SDK platform + an AVD (Android Virtual Device) created via the Device Manager
- **iOS** (macOS only) — [Xcode](https://apps.apple.com/app/xcode/id497799835) with Command Line Tools, plus CocoaPods (`brew install cocoapods` or `sudo gem install cocoapods`)

> This app uses `expo-dev-client`, so you run a **native development build** (`expo run:android` / `expo run:ios`) rather than the standard Expo Go app.

## Getting Started

Install dependencies from the repo root:

```bash
npm install
```

## Environment Variables

Each app ships a `.env.example` template. Copy it to `.env` and fill in your values before running anything:

```bash
cp apps/web/.env.example    apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
```

### `apps/web/.env`

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Supabase pooled connection string (used at runtime via PgBouncer) |
| `DIRECT_URL` | Supabase direct connection string (used by Prisma migrations) |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the web app (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role JWT (server-side only — never expose to the client) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` for dev, `sk_live_…` for prod) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (safe to expose to the browser) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_…`) from the Stripe dashboard |

### `apps/mobile/.env`

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_LARAVEL_API_URL` | Base URL of the hosted Laravel API (including `/api/v1`) |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Sign-In web client ID |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google Sign-In iOS client ID |

### Mobile (Expo)

> `.env` is committed, so changing it will show up in `git status`. To keep
> machine-specific values out of commits, put them in an untracked
> `apps/mobile/.env.local` instead — it overrides `.env`.

#### Build and launch

```bash
cd apps/mobile

# Android emulator (start an AVD in Android Studio first, or it'll boot one)
npm run android      # = npx expo run:android

# iOS simulator (macOS only)
npm run ios          # = npx expo run:ios
```

The first build is slow (it compiles the native project); subsequent launches are
fast. After the dev build is installed, you can also just run `npx expo start` and
press `a` (Android) or `i` (iOS) to reopen it.

> **After changing `.env`,** restart Metro so the new value is picked up —
> `EXPO_PUBLIC_*` vars are inlined at bundle time, not read at runtime:
> `npx expo start --clear`.

#### Mobile builds (release / stores)

```bash
# Create a build
eas build

# Submit to app stores
eas submit
```

#### Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Error resolving plugin [id: 'com.facebook.react.settings'] > 25.0.2` (or another JDK version) | Wrong JDK. Use 17: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` then rebuild. |
| `No matching variant ... No variants exist` for `react-native-*` projects | Stale Gradle state. `cd android && ./gradlew --stop && rm -rf .gradle build app/build && ./gradlew clean`, then rebuild. |
| `resource drawable/splashscreen_logo not found` or other out-of-sync native errors | Native folder drifted from `app.json`. Regenerate: `npx expo prebuild --platform android` (add `--clean` if needed). |
| `package com.… does not exist` referencing `BuildConfig` after a package rename | Stale Gradle **build cache**. `./gradlew --stop && rm -rf ~/.gradle/caches/build-cache-*`, then rebuild. |
| App loads but can't reach the backend (network errors) | API URL is wrong for your platform — see the table in step 1, and confirm the backend is running on `:3000`. |

### Web (Next.js)

```bash
cd apps/web
npm run dev
```

### RESET DATABASE:

```
npx prisma db push --force-reset
npx prisma db push
npx prisma db seed
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

### Mobile

- Edit files inside `apps/mobile/app/` — the project uses [file-based routing](https://docs.expo.dev/router/introduction) via Expo Router
- Theme tokens (colors, fonts) live in `apps/mobile/constants/theme.ts`
- Shared UI components live in `apps/mobile/components/`

### Web

- Edit `apps/web/app/page.tsx` — the page auto-updates as you save
- Uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) with [Geist](https://vercel.com/font)

## Deployment

### Web — Vercel

```bash
# From apps/web
npx vercel
```

See the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.

### Mobile — EAS

```bash
eas build --platform all
eas submit
```

## Resources

- [Expo documentation](https://docs.expo.dev/)
- [Next.js documentation](https://nextjs.org/docs)
- [Expo Router](https://docs.expo.dev/router/introduction/)
