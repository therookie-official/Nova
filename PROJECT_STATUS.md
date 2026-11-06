# Project Nova — Status

Last updated: 2026-11-06 · Branch: `milestone-1-scaffold` · Phase: **Milestone 0 (inspection and planning) complete; no app features implemented**

Legend used in every planning document:

- **[VERIFIED]** I observed it directly in this session (command output, package source, or a fetched page). The evidence is named.
- **[ASSUMPTION]** Believed true from general platform knowledge but not checked here. Must be confirmed before relying on it.
- **[UNVERIFIED]** Cannot be checked in this cloud environment at all (needs CI or a physical device).

## 1. What has and has not been done

| Item | State |
|---|---|
| Repository inspected | Done |
| Environment and Android tooling inspected | Done |
| Dependency compatibility checked (from package metadata and source) | Done |
| Vega license re-checked | Done |
| Planning documents | This file, `DEVELOPMENT_LOG.md`, `docs/TECHNICAL_ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md` |
| Application features (library, player, ads, support) | **Not started** |
| Android build (any kind) | **Never run. No APK exists.** |
| Device or emulator test | **Never run.** |
| Unit tests / lint | **None written yet.** Jest, ESLint and Prettier are installed but not configured. |
| GitHub Actions workflow | **Not created yet.** |

## 2. Verified facts

### Repository
- **[VERIFIED]** This is a **new project**. `main` contains only `AGENTS.md` (the master instructions, 327 lines, read in full) and an empty-looking `README.md` (6 bytes, just `# Nova`). Evidence: `git ls-files`, `git log`.
- **[VERIFIED]** Branch `milestone-1-scaffold` adds a blank Expo SDK 58 TypeScript template plus installed dependencies (commit `1632da7`). Nothing is merged to `main`.
- **[VERIFIED]** The repository is public (`therookie-official/Nova`), and this session has push access.

### Environment (cloud sandbox)
| Tool | Result |
|---|---|
| Node.js | v22.23.4 |
| npm | 10.9.9 |
| Java / javac | OpenJDK 21.0.12.1 |
| Gradle | 8.14.3 at `/opt/gradle` |
| Docker | client 29.9.2 present; **daemon not verified** |
| GitHub CLI | 2.89.0 |
| CPU / RAM | 2 vCPU / 7 GB |
| Android SDK | **Absent.** `ANDROID_HOME` and `ANDROID_SDK_ROOT` are empty; no `adb`, `sdkmanager` or `aapt2` on PATH. |
| EAS CLI | Not installed |

- **[VERIFIED] No Android build is possible in this sandbox.** The network proxy answers HTTP 403 to `dl.google.com` (Android SDK downloads), `services.gradle.org`, `cdp.expo.dev` and `repo.maven.apache.org` (Maven Central). `maven.google.com`, `plugins.gradle.org`, `jitpack.io` and `api.expo.dev` also failed to connect. Only `registry.npmjs.org` and `api.github.com` were reachable. Evidence: `curl` probes and the proxy status endpoint.
- **[VERIFIED]** Consequence: JavaScript and TypeScript checks (type-check, lint, Jest, Metro bundling) can run here. Gradle/APK builds must run on a GitHub-hosted runner, and device behaviour can only be checked on a physical phone.
- **[VERIFIED]** The same blocking made `expo install` and two `expo-doctor` checks fail (Expo config schema and React Native Directory). `expo-doctor` passed 18 of 20 checks; the 2 failures were network failures, not project errors.
- **[VERIFIED]** `tsc --noEmit` printed no errors on the scaffold. (The exit status was not captured directly, so treat this as "no diagnostics printed".)

### Versions in the project now
Expo `58.0.23` (the current `latest` tag), React Native `0.88.1`, React `19.3.0`, TypeScript `~6.0.3`. All SDK-bound packages use the versions in Expo's own `bundledNativeModules.json`.

### React Native 0.88 Android toolchain (from `react-native/gradle/libs.versions.toml`)
- **[VERIFIED]** minSdk 24, targetSdk 36, compileSdk 37, buildTools 37.0.0, NDK 27.1.12297006, Android Gradle Plugin 9.2.1, Kotlin 2.2.0.

### Vega reference
- **[VERIFIED]** Current Vega `HEAD` is `073d47e` (2026-11-03). Its `LICENSE` states that everything **after commit `9ccc0c8` (2026-10-02)** is under the **PolyForm Noncommercial License 1.0.0**, and says in plain words that "showing ads" counts as commercial use needing a separate licence. Earlier commits are Apache-2.0, and third-party contributions are Apache-2.0 per `NOTICE`. The licensor name and contact fields are still unfilled placeholders (`[LICENSOR NAME]`).
- **Decision:** Nova copies **no** Vega code, assets, names or branding, including the Apache-era code. Vega is used only as a feature reference (see `docs/TECHNICAL_ARCHITECTURE.md` §9).

## 3. Dependencies

### Installed on `milestone-1-scaffold`
| Package | Version | Purpose |
|---|---|---|
| expo | ~58.0.23 | Framework |
| react-native | 0.88.1 | Runtime |
| react | 19.3.0 | UI |
| react-native-video | ^6.19.3 | Player (stable line; v7 is still beta) |
| react-native-mmkv | ^4.3.2 | Persistence |
| react-native-nitro-modules | ^0.37.2 | Required by MMKV 4 |
| zustand | ^5.0.16 | State |
| nativewind | ^4.2.7 | Styling |
| tailwindcss (dev) | ^3.4.19 | NativeWind peer |
| react-native-reanimated | ^4.7.1 | Animation (peer range RN 0.86–0.88, Worklets 0.13.x: satisfied) |
| react-native-worklets | ^0.13.0 | Reanimated peer |
| react-native-safe-area-context | ~5.11.1 | Insets |
| react-native-screens | ~4.30.1 | Navigation |
| @react-navigation/native, native-stack, bottom-tabs | ^7.x | Navigation |
| expo-document-picker | ~58.0.4 | Local video selection |
| expo-dev-client | ~58.0.18 | Development build |
| expo-build-properties | ~58.0.12 | Android build properties |
| expo-keep-awake, expo-screen-orientation | ~58.0.x | Player screen behaviour |
| jest, jest-expo, @testing-library/react-native, eslint, eslint-config-expo, prettier, @types/jest | various | Tooling (installed, **not yet configured**) |

### Planned, not installed
| Package | Version checked | Note |
|---|---|---|
| react-native-google-mobile-ads | 17.4.0 (Apache-2.0) | Peers: `expo >=47`, `react-native >=0.86`. Inspected from a downloaded tarball only. |
| Local Expo module for persistable URI access | n/a | See risk R2. |

## 4. Risks (ranked)

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| R1 | **No local Android build.** Every native change needs a CI round trip, which slows the loop. | Certain / Medium | Keep native surface small; cache Gradle in CI; verify JS locally with `expo export`. |
| R2 | **Local-file URIs may not survive an app restart.** `expo-document-picker` uses `ACTION_OPEN_DOCUMENT` and copies to cache by default; its source contains **no** `takePersistableUriPermission` call [VERIFIED]. Android only keeps such grants across restarts if they are persisted [ASSUMPTION]. | High / High (breaks "library persistence") | Spike a small local Expo module that persists the grant. Device test required. |
| R3 | **NativeWind 4 + Reanimated 4 + RN 0.88 compatibility is untested.** NativeWind's declared peer is only `tailwindcss >3.3.0` [VERIFIED]; real-world compatibility is unknown. | Medium / Medium | First CI build and `expo export` act as the check. Fallback: a typed `StyleSheet` theme. |
| R4 | **MMKV 4 is Nitro-based**; whether it needs the New Architecture, and whether RN 0.88 makes that moot, was not verified. | Medium / High | Confirm at first build; do not enable or disable architecture flags blindly. |
| R5 | **`react-native-video` Android picture-in-picture, fullscreen and subtitle behaviour is unverified on device.** The `fullscreen*` props are marked iOS in the types, but Android has `presentFullscreenPlayer()`/`dismissFullscreenPlayer()` ref methods [VERIFIED in source]. | Medium / Medium | Try the library's fullscreen methods first; fall back to Nova's own landscape mode via `expo-screen-orientation`. Treat PiP as best-effort until device-tested. |
| R6 | **Cleartext `http://` URLs** are blocked by default on modern Android [ASSUMPTION]. | High / Low | Decide policy (see open questions); show a clear error either way. |
| R7 | **AdMob account, Google Play listing and consent configuration** need accounts the user must create. | Certain / Medium | Test ad units only until the user supplies real IDs. No account creation without approval. |
| R8 | **Expo/Google service blocks** make `expo install`, `expo-doctor` and EAS unusable here. | Certain / Low | Use `bundledNativeModules.json`; build on GitHub Actions. |
| R9 | **Vega licence** forbids reuse in an ad-supported app. | Certain / Low (already handled) | Clean-room implementation; no code or asset copying. |

## 5. Open questions for the owner
1. **Android application ID.** Proposed placeholder: `com.therookieofficial.nova`. Changing it later breaks upgrade-in-place, so please confirm or replace it before the first release.
2. **Is GitHub Actions enabled on the Nova repo?** The workflow will be modelled on your working `study-planner1` pipeline, but I have not confirmed that it runs for Nova.
3. **Cleartext `http://` video URLs:** allow, or HTTPS only? (Default proposal: HTTPS only with a clear error message.)
4. **Merge policy:** keep working on `milestone-1-scaffold` and open a pull request, or merge each milestone straight to `main`? (Default proposal: pull request.)

## 6. Exact next implementation step

**Milestone 1, step 1: configuration and a bundling check (no features).**
1. In `app.json`: set name `Nova`, slug `nova`, `userInterfaceStyle: "dark"`, Android package from open question 1, and register the plugins `expo-dev-client`, `expo-build-properties` and `react-native-video` with **all four** `androidExtensions` keys written out (HLS true, DASH true, SmoothStreaming true, RTSP false) plus `enableAndroidPictureInPicture: true`. All four keys are needed because the plugin sets any omitted key to `false` [VERIFIED in its source].
2. Add the NativeWind wiring (`babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, type declarations).
3. Replace the template `App.tsx` with a minimal dark screen that proves styling works.
4. Run `npx tsc --noEmit` and `npx expo export --platform android` (Metro bundling needs no Android SDK). Record the results here, including failures.

Only after that passes does the folder skeleton and navigation shell begin. Full milestone list: `docs/IMPLEMENTATION_PLAN.md`.
