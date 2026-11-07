# Project Nova — Development Log

Newest entries at the bottom. Each entry states what was done and what was actually verified. Failures are recorded, not hidden.

## 2026-11-04 — Orientation and scaffold

**Done**

- Read the master instructions. Listed the user's connected repositories: `study-planner1`, `Reelsguard`, `study-planner`. None was a Nova repository, so the work was paused until the user created one.
- Cloned Vega (`vega-org/vega-app`) read-only, outside the Nova working tree, to read its licence and feature list. No Vega code was copied into Nova.
- After the user created `therookie-official/Nova`, attached it with push access and cloned it. It held only `AGENTS.md` and an empty `README.md`.
- Generated a blank Expo TypeScript template (SDK 58) in a scratch directory and copied it into the Nova working tree, leaving out the template's own `AGENTS.md` and `LICENSE` so the project's `AGENTS.md` stayed intact.
- Installed dependencies, pinned to the versions in `expo/bundledNativeModules.json` where the SDK lists them.

**Problems and how they were handled**

- `npx expo install` failed because the sandbox proxy blocks Expo's version service. Used the SDK's bundled version list and each package's declared peer dependencies instead.
- `expo-doctor` passed 18 of 20 checks. The two failures were network failures (Expo API, React Native Directory), not project errors.

## 2026-11-04 — First push

- Committed the scaffold to a new branch, `milestone-1-scaffold` (commit `1632da7`), following a repository hook that asked for untracked files to be committed and pushed. `main` was not touched.

## 2026-11-06 — Milestone 0: inspection and planning

**Done**

- Re-read `AGENTS.md` in full from the repository.
- Confirmed the repository state: new project, no CI workflow, empty README.
- Inspected the toolchain: Node 22.23.4, npm 10.9.9, JDK 21.0.12.1, Gradle 8.14.3, GitHub CLI 2.89.0, Docker client present. No Android SDK.
- Probed network reachability. Result: the Android SDK, Gradle distribution, Maven and Expo hosts are blocked; npm and the GitHub API work. Conclusion: **no Android build can be produced here**; the APK has to come from a GitHub-hosted runner.
- Read `react-native-video` 6.19.3 directly from `node_modules`: Android defaults, config plugin behaviour, prop types, PiP methods, error event shape. Checked npm dist-tags: v6.19.3 is `latest`, v7 is still `beta`.
- Read React Native 0.88.1's Android toolchain versions from its own Gradle version catalogue.
- Downloaded `react-native-google-mobile-ads` 17.4.0 as a tarball into a scratch directory (not installed in the project) and read its plugin parameters, exported ad classes and consent API.
- Read `expo-document-picker` 58.0.4's Android source for how it obtains and keeps file access.
- Re-read Vega's `LICENSE`, `NOTICE` and README. Licence is PolyForm Noncommercial after commit `9ccc0c8`, with ads named as commercial use.
- Read the user's existing `study-planner1` GitHub Actions workflow as a model for Nova's build pipeline.
- Wrote `PROJECT_STATUS.md`, this log, `docs/TECHNICAL_ARCHITECTURE.md` and `docs/IMPLEMENTATION_PLAN.md`.

**Findings that change the plan**

1. `react-native-video`'s Expo plugin sets any omitted `androidExtensions` key to `false`, so Nova must list all four explicitly or HLS/DASH could be silently dropped. (Library default, without the plugin: HLS, DASH and SmoothStreaming on.)
2. `expo-document-picker` never persists URI permissions, so remembered local videos may not reopen after a restart. A small local native module is likely needed.
3. The `fullscreen`, `fullscreenAutorotate` and `fullscreenOrientation` props in `react-native-video` are marked iOS in its types, but the player ref has `presentFullscreenPlayer()` / `dismissFullscreenPlayer()` that reach an Android implementation. Plan: try those first, fall back to a Nova-built landscape mode. (An earlier draft of the plan wrongly assumed Android had no fullscreen support; corrected after reading the source.)

**Verification status**

- Nothing built, nothing run on a device. `tsc --noEmit` on the scaffold printed no errors (exit status not captured directly).
- A permission check blocked one cleanup command (`rm -rf *` in a scratch folder). It was not retried; a fresh scratch directory was used instead. No project files were affected.

**Not done on purpose**

- No application features, no `README.md` rewrite, no CI workflow. These start in Milestone 1 after the owner answers the open questions in `PROJECT_STATUS.md`.

## 2026-11-06 — Phase 1: project foundation

**Done**

- Configured the app: `app.json` (Nova, dark, Android package `com.therookieofficial.nova`, `react-native-video` plugin with all four ExoPlayer extension keys written out plus picture-in-picture, blocked overlay and legacy-storage permissions), Babel, Metro and Tailwind for NativeWind, Jest, ESLint, Prettier, npm scripts.
- Built the storage layer: a `KeyValueStore` interface with MMKV and in-memory implementations; versioned repositories that never throw on read and keep unreadable data in a `.corrupt` slot.
- Built Zustand stores for library, remote sources (one generic list store), watchlist, playback progress and settings, each saving on every change.
- Built the design tokens (feed both Tailwind and TypeScript), reusable components, five tabs and three stack screens, and invented sample data behind a single `SAMPLE_DATA_ENABLED` flag.
- Wrote 36 tests: repository behaviour (round-trip, restart, corruption, newer and older versions, migration), the stores, library helpers, and navigation through the real app tree.
- Wrote `ci.yml` (checks on every push) and `build-apk.yml` (manual APK build; publishing a release is opt-in). Neither has run.

**Problems found by the checks, and fixed** (details in `PROJECT_STATUS.md` §4)

- Jest exposed that `expo-asset` (and earlier `expo-font`, `babel-preset-expo`) were nested where nothing could resolve them; installed at the root.
- Three TypeScript 6 behaviour changes: `baseUrl` deprecated, side-effect imports checked, `@types/*` no longer auto-loaded.
- The icon import bundled 19 font files; switched to a direct Ionicons import.
- A contrast figure I had written from memory was wrong (5.6:1; measured 5.1:1). All pairs still pass AA.
- The shipping manifest contained an overlay permission; blocked and verified by re-running prebuild.

**Verified** (2026-11-06, after the last code change): `tsc --noEmit` exit 0; `eslint .` exit 0; `prettier --check .` exit 0; `jest` 4 suites / 36 tests passed with no warnings; `expo export --platform android` bundled 1,347 modules to a 3.3 MB Hermes bundle; `expo prebuild` generated the Android project and I read its Gradle properties, manifest and signing config.

**CI:** pushed as commit `290ee00`; GitHub Actions run 42209392549 (`ci.yml`) succeeded on every step (`npm ci`, type-check, lint, formatting, tests, Metro bundle). I then tried to start `build-apk.yml` from the branch and GitHub refused (HTTP 404: a manual workflow must be on the default branch). It has not run, and I did not merge to `main`.

**Not verified:** any Gradle or APK build; launch on an emulator or phone; how the screens look; native MMKV (tests use an in-memory stand-in).

**Decisions taken without an owner answer:** keep the placeholder application ID; no cleartext HTTP; no merge to `main`.

**Not done on purpose:** playback, adding videos or links, ads, consent, payments, subtitles, PiP, casting.

## 2026-11-07 — Phase 2: core media functionality

**Done**

- Replaced the flat library record with a unified `MediaItem` (`source` + `metadata`) for local and remote videos; library schema bumped to v2 with a migration from v1; added a watch-history store.
- Local import through the Android document picker (no copy), plus a local Expo module `nova-saf` that tries to keep read access to the picked URI. It degrades to `persisted: false` instead of failing.
- Add Link screen with URL validation, an advisory server check and "Save anyway"; DASH links rejected unless the experimental flag is on.
- Real Player screen (play/pause, seek bar, ±10 s, speed, landscape toggle, resume, progress saving, buffering indicator, mapped error messages with retry).
- Library: add from device, search, category chips, metadata editing, remove; Home: recently watched; Details: resume button, source label, edit, remove.
- Tests grew from 36 to 118 (10 suites). Player tests run once per source kind (local, remote) with a stand-in for the video component.
- `build-apk.yml`: new `experimental_dash` input.

**Verified (sandbox):** tsc, eslint, prettier clean; jest 118/118; `expo export --platform android` succeeded; `expo prebuild` generated the project and autolinking discovered `nova-saf`; ExoPlayer HLS/DASH flags present in generated Gradle properties.

**Not verified:** Gradle build of the Kotlin module; any playback on Android (progressive, HLS, DASH, local content://); persistence of picked-file access across restarts; error-name mapping against real errors. See `PROJECT_STATUS.md` §0 for the exact list and the device test steps.

**Problems found along the way:** none of the old-model screens compiled after the model change (expected; all migrated); the navigation test leaked user-added items into a later test (fixed with cleanup); one lint error (missing display name in the video stand-in).

**Decisions:** DASH off by default; http links rejected; poster is a typed https link for now; the Sources list records links in addition to library items.

## 2026-11-07 — Phase 3: advanced player features

**Done**

- Checked `react-native-video` 6.19.3 sources for what Android supports (text/audio track selection, side-loaded subtitles, PiP, buffer config); recorded in `PROJECT_STATUS.md` §00.
- Player: subtitle and audio sheets, external subtitle files (.srt/.vtt/.ttml, others refused with a message), speed list, picture size, PiP button and optional enter-on-leave setting, full-screen lock logic with hidden system bars, double-tap skip, safe-area aware controls.
- Recovery: online videos get buffer tuning and 5 load retries; automatic reconnect up to 4 times from the same position; hint after 8 s of buffering. Local files and non-network errors never auto-retry.
- Position: also saved when the app goes to the background.
- Per-video preferences store (audio, subtitles, added subtitle files, picture size); settings saved by older versions now gain new fields from the defaults.
- Native module `nova-saf` gained a PiP-support check (uncompiled). New dependency: `expo-navigation-bar`.
- Tests: 118 -> 169 (12 suites).

**Bug found by tests and fixed:** the player's unmount cleanup depended on a function that changes when the library item is edited, so it ran mid-playback (resetting orientation and bars, saving early). Now read through a ref.

**Verified (sandbox):** tsc, eslint, prettier clean; jest 169/169; Android bundle exported; prebuild manifest has PiP and rotation `configChanges`; autolinking finds all native modules.

**Not verified:** everything on a physical device. The request asked for physical-hardware testing; the sandbox has no device, so that step is **not done**. A device checklist is in `PROJECT_STATUS.md` §00. Gradle build of the Kotlin module also never ran.

**Not done on purpose:** Google Cast, DLNA, subtitle styling, resolution selection, background audio.

**Correction (found while committing Phase 3):** `.gitignore` had `android/`, which also matched the native module's own folder `modules/nova-saf/android/`. The Kotlin module and its Gradle/manifest files were therefore **never committed** in Phase 2 (only `package.json`, `expo-module.config.json` and `src/index.ts` were). The rule is now `/android/` (root only) and the module files are committed. Until this commit, a fresh clone or CI build would have had no native code for `nova-saf`; the Phase 2 note saying the module was part of the push was wrong. The module has still never been compiled.
