# Nova

A free Android video player and personal movie library. Built with React Native (Expo), TypeScript, NativeWind, React Navigation, Zustand and MMKV.

**Status: early development (Phases 1-3 written; nothing yet tested on a phone).** The code covers navigation, storage, adding local videos and online links, a library with search, categories and editing, and a player with subtitles, audio tracks, speed, picture-in-picture, full screen, resume and automatic reconnect. All of it is checked by automated tests only. **No APK has been built and no video has been played on a real Android device, so none of the playback features should be treated as working yet.** There are no ads or payments yet. See [PROJECT_STATUS.md](PROJECT_STATUS.md) for exactly what has and has not been verified.

## What is here

- Five tabs (Home, Library, Sources, Watchlist, Settings) and five stack screens (Movie Details, Player, Add link, Edit details, Support Nova).
- Local videos through Android's file picker (stored by address, never copied) and online https links (progressive files and HLS; DASH is off unless a build turns it on).
- Library: search, categories, manual metadata editing, watchlist, continue watching, recently watched.
- Player: play/pause, seeking, speed, subtitles (embedded and `.srt`/`.vtt`/`.ttml` files), audio tracks, picture-in-picture, full screen and rotation, resume, reconnect on lost connection.
- Offline-first storage on the device.
- Invented sample data for development and preview builds only. It points at no real media.
- Not built: ads, payments, casting (Google Cast, DLNA), subtitle styling, background audio.

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
- **Experimental DASH**: off by default; turns on `.mpd` links for testing. DASH has not been verified.
- **Publish release**: off by default. Turning it on creates a GitHub pre-release. **This repository is public, so a pre-release can be downloaded by anyone.**

The resulting APK is signed with a debug key. It is **for private testing only**: do not distribute it publicly and do not upload it to the Play Store. A store release will need its own signing key and a final application ID.

## Project layout

```
src/
  navigation/   tabs and stack, typed routes
  screens/      the app's screens
  components/   reusable UI and player controls
  services/     storage, media import and URL checks, playback logic, dev sample data
modules/        nova-saf: small Android (Kotlin) module that keeps access to picked files
  store/        Zustand stores
  config/       flags and sample data
  theme/        design tokens (also feed Tailwind)
  hooks/ types/ utils/
__tests__/      navigation, storage, media, playback and player tests
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
