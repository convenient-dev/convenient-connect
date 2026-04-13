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

- Node.js 18+
- npm 10+
- For mobile: [Expo CLI](https://docs.expo.dev/get-started/installation/) and either Xcode (iOS) or Android Studio (Android)

## Getting Started

Install dependencies from the repo root:

```bash
npm install
```

### Mobile (Expo)

```bash
cd apps/mobile
npx expo start
```

Open the app in:

- **iOS Simulator** — press `i` in the terminal
- **Android Emulator** — press `a` in the terminal
- **Physical device** — scan the QR code with [Expo Go](https://expo.dev/go)

#### Mobile builds

```bash
# Create a build
eas build

# Submit to app stores
eas submit
```

### Web (Next.js)

```bash
cd apps/web
npm run dev
```

RESET DATABASE:

```
rm -rf prisma/migrations
  npx prisma migrate reset --force
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
