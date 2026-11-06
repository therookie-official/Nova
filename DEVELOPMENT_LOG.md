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
