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

**Not verified:** any Gradle or APK build; launch on an emulator or phone; how the screens look; native MMKV (tests use an in-memory stand-in); CI runs.

**Decisions taken without an owner answer:** keep the placeholder application ID; no cleartext HTTP; no merge to `main`.

**Not done on purpose:** playback, adding videos or links, ads, consent, payments, subtitles, PiP, casting.
