# Imboni

Official notices from Rwandan institutions, turned into records you can follow, track and act on. Expo SDK 58 · React Native 0.88 · Expo Router · TypeScript strict.

## Run

Native modules (widgets, Apple sign-in, maps, Expo UI) need a development build; Expo Go is not enough.

```bash
npm install
```

```bash
npx expo run:ios
```

```bash
npx expo run:android
```

Checks:

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

## Configuration

Runtime (`EXPO_PUBLIC_*`, validated in `src/config/env.ts`) and build-time (validated in `app.config.ts`) variables are listed in `.env.example`. Android maps need `GOOGLE_MAPS_ANDROID_API_KEY`; iOS uses Apple Maps with no key.

## What is real and what is mocked

| Area | Status |
| --- | --- |
| Backend | `createMockApi` in `src/data/api.ts` behind the `ImboniApi` interface. Simulated latency, per-call timeout, offline detection and optional fault injection (`EXPO_PUBLIC_MOCK_FAILURE_RATE`). Every response is validated with the shared zod schemas. Swap the factory for an HTTP client. |
| Content | `src/data/fixtures.ts`, transcribed from the design. Square-bracket values are the design's own placeholders. Map geometry is illustrative. |
| Sign-in | Apple uses the native credential when available, then the mock backend. Google has no SDK configured; the mock accepts it. The SMS code in the demo build is shown on the code screen (no SMS is sent). |
| Reminders | Real local notifications, scheduled per plan, cancelled on done or untrack, rescheduled on snooze. Push alerts need a backend. |
| Calendar, share, clipboard, photos | Real (write-only calendar access, system share sheet, view-shot capture). |
| Widgets | Real `expo-widgets`: Lock Screen and Home Screen widgets, with an iOS timeline that ticks at each midnight. iOS only. |
| Offline | TanStack Query cache persisted to AsyncStorage; offline shows the saved copy with its time. |

## Structure

```
src/app        routes only (Expo Router)
src/features   screen logic shared across routes (setup, home, tracking, map, widgets sync)
src/data       schemas, fixtures, mock API, query definitions
src/lib        pure logic and OS services (dates, reminders, search, notifications, calendar, share)
src/state      persisted prefs (zustand + zod), session (SecureStore)
src/ui         design-system components and tokens
src/widgets    expo-widgets layouts (self-contained, SwiftUI via Expo UI)
```
