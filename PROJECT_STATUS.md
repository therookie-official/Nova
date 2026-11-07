# Project Nova — Status

Last updated: 2026-11-07 · Branch: `milestone-1-scaffold` · Phase: **Phase 2 (core media functionality) implemented in code; sandbox checks pass; NOT built into an APK and NOT run on any device. No playback, format or persistence claim below has been tested on Android.**

Legend used in every document:

- **[VERIFIED]** I observed it directly (command output, package source, generated files). The evidence is named.
- **[ASSUMPTION]** Believed true from general platform knowledge but not checked here.
- **[UNVERIFIED]** Cannot be checked in this cloud environment (needs CI or a physical device).

## 0. Phase 2 — core media functionality (2026-11-07)

### What was built

| Area          | What exists in code                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unified model | `MediaItem = { source, metadata }`. `source` is `local` (content:// URI, file name, MIME, size, `persisted` flag) or `remote` (https URI + `progressive` / `hls` / `dash`). `metadata` holds title, description, year, categories, poster link, duration. Playback reads only `source`. Library storage moved to schema v2 with a tested v1 → v2 migration. Progress and a new watch-history store sit beside it. |
| Local videos  | Android document picker (`expo-document-picker`, `video/*`, multiple, no copying). Only the URI and basic facts are stored. A small local native module (`modules/nova-saf`, Kotlin) asks Android to keep read access after restart. If Android refuses, the item is flagged `persisted: false` and the user is told it may need re-selecting; if access is later lost the player says so plainly.                |
| Remote videos | Add Link screen: validation (https only, no embedded credentials, not obviously a web page/picture, `.m3u8` → HLS, `.mpd` → DASH only if the experimental flag is on), a server check (HEAD, ranged-GET fallback, timeout) that is advisory with "Save anyway", and saving to the library plus the Sources list.                                                                                                  |
| Library       | Media cards, search (title/category), category chips, manual metadata editing (title, year, categories, description, poster link), watchlist, continue watching, recently watched (Home), remove from library (never deletes the file).                                                                                                                                                                           |
| Player        | `react-native-video`: play/pause, touch seek bar, ±10 s, speed (0.5–2×), landscape "full screen" toggle, resume (setting-controlled), progress saved every ~5 s and on leaving, loading/buffering indicator, mapped playback errors with Try again, keep-screen-awake.                                                                                                                                            |
| Errors        | Media3 error names mapped to plain messages: no connection, timeout, not found, refused/expired link, blocked http, unsupported format, decoder failure, lost local access, unknown.                                                                                                                                                                                                                              |

### What was verified (sandbox, 2026-11-07, after the last code change)

- `tsc --noEmit`, `eslint .`, `prettier --check .`: all clean.
- `jest`: 10 suites, 118 tests passed. Covers URL validation and probe (mocked fetch), error mapping, resume/seek/persist logic, player-source building, v1 → v2 migration, history store, picker import (mocked picker), media actions, library filtering/categories/recently-watched, and the Player screen for **remote and local sources independently** (same suite run per source kind) plus UI flows for add-link, edit-metadata, category filter and navigation.
- `expo export --platform android` bundled successfully with Hermes.
- `expo prebuild` generated the Android project; `expo-modules-autolinking` lists `nova-saf` (`expo.modules.novasaf.NovaSafModule`) and the ExoPlayer HLS/DASH flags are `true` in the generated `gradle.properties`. The generated `android/` folder was deleted afterwards.

### What is NOT verified — do not treat as working

- **Any Gradle/APK build.** The Kotlin module has never been compiled.
- **Playback of any format on a device**: progressive MP4/WebM/MKV, HLS and local content:// files are all **untested**. The Jest player tests use a stand-in for `react-native-video` and only prove Nova's own wiring (props passed, events handled, state saved); they say nothing about whether video plays.
- **DASH**: the ExoPlayer module is compiled in but nothing was played. DASH links are rejected unless a build sets `EXPO_PUBLIC_NOVA_EXPERIMENTAL_DASH=1` (workflow input `experimental_dash`).
- **Persistent access to picked files across restarts.** `expo-document-picker` may not request a _persistable_ grant, in which case Android refuses and the item falls back to `persisted: false` (re-select after restart). Which happens on a real phone is unknown.
- **Error-name mapping** was written from the library's source and Media3 naming, not from errors observed on a device.
- Full-screen is a landscape lock plus hidden status bar; a true immersive (hidden navigation bar) mode is not implemented.
- The server check can be wrong in both directions (some servers refuse HEAD but play fine; some answer 200 for a non-video).
- Sample entries still point at `example.com` and cannot play.

### Not done in this phase (by design or deferred)

Subtitles, audio-track selection, picture-in-picture UI, casting, TMDB metadata, ads, payments, poster picking from the device (poster is a typed https link), re-link flow that lets the user re-select a lost local file directly from the error screen, authorized/header-based remote URLs beyond what is in the URL itself.

### Next step for Phase 2 to count as done

Build an APK (merge to `main` first so **Build APK** can be run, tick `experimental_dash` only if you want to test DASH) and test on a phone, one source type at a time: (1) pick a local MP4, play, seek, change speed, resume, close and reopen the app and play again; (2) add an https MP4 link; (3) add an https HLS link; (4) try a dead link, an http link, and a web-page link and read the messages; (5) optionally a DASH link. Report what happens and I will fix what fails and then update this document with the device results.

## 1. Where things stand (Phase 1 section, written 2026-11-06; still accurate for what it covers)

| Item                                                                                                   | State                                                                                              |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| App configuration (`app.json`, Babel, Metro, NativeWind, Jest, ESLint, Prettier)                       | Done                                                                                               |
| Storage layer (key-value interface, MMKV + in-memory, versioned repositories with corruption recovery) | Done                                                                                               |
| Zustand stores (library, remote sources, watchlist, playback progress, settings)                       | Done                                                                                               |
| Dark theme and design tokens                                                                           | Done                                                                                               |
| Reusable components (Button, Card, Chip, MediaCard, Screen, Loading / Empty / Error states, Skeleton)  | Done                                                                                               |
| Eight screens and bottom navigation (5 tabs + 3 stack screens)                                         | Done (Player and Support are placeholders by design)                                               |
| Placeholder data for development                                                                       | Done                                                                                               |
| Navigation and storage tests                                                                           | Done: 36 tests                                                                                     |
| CI workflows (`ci.yml`, `build-apk.yml`)                                                               | `ci.yml` ran on GitHub for commit `290ee00` and passed (see §2). `build-apk.yml` has **never run** |
| Ads, payments, real playback, adding videos or links                                                   | **Not started, on purpose** (later phases)                                                         |
| Android build (Gradle / APK)                                                                           | **Never run. No APK exists.**                                                                      |
| App launch on an emulator or phone, visual check                                                       | **Never done.**                                                                                    |

## 2. What was verified in Phase 1, and how

All run in the cloud sandbox on 2026-11-06, after the final code change.

| Check                              | Command                                             | Result                                                                                                        |
| ---------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Type-check                         | `npx tsc --noEmit`                                  | Exit 0, strict mode, tests included                                                                           |
| Lint                               | `npx eslint .`                                      | Exit 0                                                                                                        |
| Formatting                         | `npx prettier --check .`                            | Exit 0                                                                                                        |
| Tests                              | `npx jest`                                          | 4 suites, **36 tests passed**, 0 failed, no console warnings                                                  |
| JavaScript bundle                  | `npx expo export --platform android` (offline)      | Succeeded: 1,347 modules compiled to a 3.3 MB Hermes bytecode bundle; only the Ionicons font is included      |
| Native project generation          | `npx expo prebuild --platform android --no-install` | Succeeded; generated files inspected (see below)                                                              |
| Colour contrast                    | WCAG formula in a script                            | Every text/background pair used is ≥ 5.1:1 (AA needs 4.5:1); body text 16–17.6:1                              |
| CI on GitHub (clean Ubuntu runner) | `ci.yml`, run 42209392549, commit `290ee00`         | All steps succeeded: `npm ci`, type-check, lint, formatting, tests, Metro bundle. Independent of the sandbox. |
| Workflow files                     | YAML parse                                          | Both files parse. **Not executed.**                                                                           |

What the generated Android project shows [VERIFIED by reading it]:

- `RNVideo_useExoplayerHls=true`, `RNVideo_useExoplayerDash=true`, `RNVideo_useExoplayerSmoothStreaming=true`, `RNVideo_useExoplayerRtsp=false`.
- `android:supportsPictureInPicture="true"` on `MainActivity`.
- `applicationId` and namespace `com.therookieofficial.nova`.
- `newArchEnabled=true`, `hermesEnabled=true`, `edgeToEdgeEnabled=true`.
- Gradle wrapper 9.4.1. Release **and** debug builds use the debug signing config, so a release APK is installable but is **not** store-signed.
- Main-manifest permissions after my change: `INTERNET`, `READ_EXTERNAL_STORAGE` (API ≤ 32 only), `VIBRATE`. `SYSTEM_ALERT_WINDOW` and `WRITE_EXTERNAL_STORAGE` are marked for removal via `blockedPermissions`.
- The main manifest does not enable cleartext HTTP; only the debug manifest does.

### What these checks do NOT prove

- **The app launches.** Nothing ran on Android. Jest renders screens in a test renderer, which proves the screens mount and the navigation wiring works, not that they look right or start on a phone.
- **Styling.** NativeWind compiles and bundles. Whether classes render as intended (spacing, colours, large text) is unchecked until someone looks at it on a device.
- **Real persistence.** In Jest, MMKV is replaced by an in-memory stand-in (`jest.setup.js`), so storage logic is tested but the **native MMKV module has never run** here.
- **Reanimated / Worklets / Nitro at runtime**, and the Gradle build of all native modules.
- **The APK build.** `build-apk.yml` has never run: GitHub only allows a manual run once the workflow file is on `main`, and nothing is merged. The CI that did run covers only JavaScript checks and a Metro bundle, not Gradle.
- **Release behaviour.** Whether `expo-dev-client` stays out of the release variant is [ASSUMPTION].
- **Accessibility with TalkBack.** Labels and roles are set in code; nobody has listened to it.

## 3. Environment facts (unchanged from Milestone 0)

- **[VERIFIED]** Node v22.23.4, npm 10.9.9, OpenJDK 21.0.12.1, Gradle 8.14.3, GitHub CLI 2.89.0, 2 vCPU / 7 GB. **No Android SDK** (`ANDROID_HOME` empty; no `adb`, `sdkmanager`, `aapt2`).
- **[VERIFIED]** The proxy blocks `dl.google.com`, `services.gradle.org`, `cdp.expo.dev` and Maven Central, so **no Android build is possible in this sandbox**. Only npm and the GitHub API are reachable. APKs must come from a GitHub-hosted runner.
- **[VERIFIED]** React Native 0.88.1 Android toolchain: minSdk 24, targetSdk 36, compileSdk 37, buildTools 37.0.0, NDK 27.1.12297006, AGP 9.2.1, Kotlin 2.2.0.
- **[VERIFIED]** Vega's licence after commit `9ccc0c8` is PolyForm Noncommercial and names ads as commercial use. Nova copies nothing from Vega.

## 4. Issues found and fixed during Phase 1

| Problem                                                                                    | Cause                                                 | Fix                                                                             |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| `babel-preset-expo`, `expo-font`, `expo-asset` could not be resolved from the project root | npm nested them under `expo/node_modules`             | Installed each at the root, pinned to the SDK version. Found by Jest.           |
| `tsc` error: `baseUrl` deprecated                                                          | TypeScript 6                                          | Removed it; `paths` works without it                                            |
| `tsc` error on `import './global.css'`                                                     | TypeScript 6 checks side-effect imports               | `declare module '*.css'` in `nativewind-env.d.ts`                               |
| `tsc` error: `describe` / `it` / `expect` not found                                        | TypeScript 6 no longer loads `@types/*` automatically | `"types": ["jest"]` in `tsconfig.json`                                          |
| All 19 icon fonts bundled (36 assets)                                                      | Imported icons from the package root                  | Import `@expo/vector-icons/Ionicons` directly: 18 assets, bundle 3.6 → 3.3 MB   |
| Contrast comment in the design tokens was wrong (said 5.6:1)                               | Written from memory                                   | Replaced with computed values (5.1:1)                                           |
| A release build would have shown empty screens with no way to load sample data             | Sample data was tied to `__DEV__`                     | One flag, `SAMPLE_DATA_ENABLED` (`__DEV__` or `EXPO_PUBLIC_NOVA_SAMPLE_DATA=1`) |
| Overlay and legacy-storage permissions in the shipping manifest                            | Expo defaults                                         | `blockedPermissions` in `app.json`; verified by re-running prebuild             |
| `userInterfaceStyle: "dark"` ignored on Android                                            | Needs `expo-system-ui`                                | Installed `expo-system-ui` ~58.0.7                                              |
| `act()` warnings in a test                                                                 | Store updated outside React's `act`                   | Wrapped the call                                                                |

## 5. Dependencies

Runtime: `expo ~58.0.23`, `react-native 0.88.1`, `react 19.3.0`, `react-native-video ^6.19.3`, `react-native-mmkv ^4.3.2`, `react-native-nitro-modules ^0.37.2`, `zustand ^5.0.16`, `nativewind ^4.2.7`, `react-native-reanimated ^4.7.1`, `react-native-worklets ^0.13.0`, `react-native-safe-area-context ~5.11.1`, `react-native-screens ~4.30.1`, `@react-navigation/{native,native-stack,bottom-tabs} ^7`, `@expo/vector-icons ^15.1.1`, `expo-font`, `expo-asset`, `expo-system-ui`, `expo-status-bar`, `expo-dev-client`, `expo-build-properties`, `expo-document-picker`, `expo-keep-awake`, `expo-screen-orientation`.

Dev: `typescript ~6.0.3`, `tailwindcss ^3.4.19`, `babel-preset-expo`, `jest ^29`, `jest-expo`, `@testing-library/react-native ^14`, `@types/jest`, `eslint ^9`, `eslint-config-expo`, `prettier`.

Installed but **not yet used by any screen**: `react-native-video`, `expo-document-picker`, `expo-keep-awake`, `expo-screen-orientation`, `expo-build-properties`. They are there so the native build includes them from the start; each is first used in the phase named in `docs/IMPLEMENTATION_PLAN.md`.

Planned, not installed: `react-native-google-mobile-ads` 17.4.0 (Milestone 6); a local Kotlin module for persistable file access (Milestone 3).

## 6. Risks

| #   | Risk                                                                                                                                                                                                                 | State after Phase 1                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| R1  | No local Android build, so each native change needs a CI round trip                                                                                                                                                  | Unchanged. `build-apk.yml` exists but has never run.                                                 |
| R2  | Picked local-video URIs may not survive an app restart (`expo-document-picker` never takes a persistable permission [VERIFIED])                                                                                      | Unchanged; addressed in Milestone 3                                                                  |
| R3  | NativeWind 4 + Reanimated 4 + RN 0.88                                                                                                                                                                                | **Reduced:** bundles and renders in tests. Runtime look is unverified.                               |
| R4  | MMKV 4 (Nitro) and the New Architecture                                                                                                                                                                              | **Reduced:** generated project has `newArchEnabled=true` [VERIFIED]. Native MMKV has not run.        |
| R5  | `react-native-video` PiP, fullscreen and subtitles on Android                                                                                                                                                        | Unchanged; the PiP manifest flag is confirmed, behaviour is not. Not used until Milestone 3/8.       |
| R6  | Cleartext `http://` blocked in release builds                                                                                                                                                                        | Manifest confirmed [VERIFIED]; the runtime effect is still [ASSUMPTION]. Policy decision still open. |
| R7  | AdMob and Play accounts                                                                                                                                                                                              | Unchanged                                                                                            |
| R8  | Expo and Google services blocked in the sandbox                                                                                                                                                                      | Unchanged. `expo prebuild` and `expo export` work offline.                                           |
| R9  | Vega licence                                                                                                                                                                                                         | Handled                                                                                              |
| R10 | **The APK workflow is untested** (`ci.yml` passed; `build-apk.yml` has not run). The runner may need to download compileSdk 37 / build-tools 37 / NDK 27.1; Gradle 9.4.1 with AGP 9.2.1 has not been exercised by me | New. First run will tell.                                                                            |
| R11 | App icon and splash are still the Expo template images                                                                                                                                                               | New. Replace before any release.                                                                     |
| R12 | Permissions: `READ_EXTERNAL_STORAGE` and `VIBRATE` still ship; Google Play reviews storage permissions                                                                                                               | New. Audit in Milestone 9.                                                                           |

## 7. Decisions made without an owner answer

The four open questions from Milestone 0 are still unanswered, so I applied the stated defaults. Tell me if any is wrong.

1. **Application ID** `com.therookieofficial.nova` (placeholder). Changing it after release breaks upgrades.
2. **Cleartext `http://`**: not allowed (manifest default). No URL entry exists yet, so nothing depends on this.
3. **Merge policy**: work stays on `milestone-1-scaffold`; merging to `main` is your call.
4. **GitHub Actions** is assumed enabled on the repo. Not confirmed.

## 8. Exact next step

Phase 1 is not "stable" until it has launched on a real Android device. Nothing later should start before that.

1. ~~Check the CI run~~ Done: `ci.yml` passed on GitHub for `290ee00`.
2. Merge the branch into `main` (GitHub only lets "Run workflow" start a manual workflow once the file is on the default branch), then run **Build APK** with "Include invented sample data" ticked and "publish release" left off.
3. Download `Nova-preview.apk` from that run's artifacts, install it, and report: does it open, do the five tabs switch, do cards open Details and Player, does Settings → Support Nova open, does the watchlist survive closing and reopening the app.
4. Fix whatever step 1 or step 3 turns up. Only then start Milestone 2 follow-ups (progress/history repositories) and Milestone 3.
