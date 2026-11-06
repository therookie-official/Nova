# Nova

A free Android video player and personal movie library. Built with React Native (Expo), TypeScript, NativeWind, React Navigation, Zustand and MMKV.

**Status: early development (Phase 1, project foundation).** The app has its navigation, dark theme, storage and eight screens, with placeholder content. It cannot play video yet, cannot add videos or links yet, and has no ads or payments yet. See [PROJECT_STATUS.md](PROJECT_STATUS.md) for exactly what has and has not been verified.

## What is here

- Five tabs (Home, Library, Sources, Watchlist, Settings) and three stack screens (Movie Details, Player, Support Nova).
- Offline-first storage: library, remote-source records, watchlist, playback progress and settings persist on the device.
- Invented sample data for development and preview builds only. It points at no real media.

## Requirements

- Node.js 22 and npm
- For a real build: JDK 21 and the Android SDK (or use the GitHub Actions workflow below)

## Commands

| Command                  | What it does                                        |
| ------------------------ | --------------------------------------------------- |
| `npm ci`                 | Install exact dependencies                          |
| `npm run typecheck`      | TypeScript check                                    |
| `npm run lint`           | ESLint                                              |
| `npm test`               | Jest tests                                          |
| `npm run check`          | Type-check, lint and tests together                 |
| `npm run bundle:android` | Bundle the JavaScript with Metro (no Android SDK)   |
| `npm run android`        | Build and run on a connected device (needs the SDK) |

## Building an APK

Nova uses native modules, so it needs a development build or a release build; **Expo Go will not work.**

On GitHub: open **Actions → Build APK → Run workflow**. The workflow must be on the default branch to appear there. The APK is attached to the run as the `nova-apk` artifact. Options:

- **Include invented sample data**: on by default, so the screens have something to show on a phone.
- **Publish release**: off by default. Turning it on creates a GitHub pre-release.

The resulting APK is signed with a debug key. It is for testing, not for the Play Store.

## Project layout

```
src/
  navigation/   tabs and stack, typed routes
  screens/      the eight screens
  components/   reusable UI (Button, Card, MediaCard, loading / empty / error states)
  services/     storage (key-value + versioned repositories), dev sample data
  store/        Zustand stores
  config/       flags and sample data
  theme/        design tokens (also feed Tailwind)
  hooks/ types/ utils/
__tests__/      navigation, storage and utility tests
docs/           architecture and implementation plan
```

## Documents

- [AGENTS.md](AGENTS.md): the project's master instructions
- [PROJECT_STATUS.md](PROJECT_STATUS.md): current state, verified facts, risks, next step
- [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md): dated record of what was done
- [docs/TECHNICAL_ARCHITECTURE.md](docs/TECHNICAL_ARCHITECTURE.md)
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)

## Licence

Not chosen yet.
