# Project Nova — Implementation Plan

Status: **proposal, awaiting the owner's answers to the open questions in `PROJECT_STATUS.md`.** Architecture is in `TECHNICAL_ARCHITECTURE.md`.

## How verification works here

| Tier           | Where                          | What it can prove                                            |
| -------------- | ------------------------------ | ------------------------------------------------------------ |
| **L** — local  | This cloud sandbox             | Type-check, lint, unit tests, Metro bundling                 |
| **C** — CI     | GitHub Actions runner          | Gradle build, APK produced, (optionally) emulator smoke test |
| **D** — device | Owner's physical Android phone | Everything a user would experience                           |

The sandbox cannot build an Android app (SDK and Gradle hosts are blocked; see `PROJECT_STATUS.md`). A milestone's exit criteria say which tier proves each point. **No milestone claims a build or device result until that tier has actually run.**

Each milestone follows `AGENTS.md` §15: inspect → list gaps → plan → implement → check → fix → update docs (`PROJECT_STATUS.md`, `DEVELOPMENT_LOG.md`) → report.

## Milestone 1 — Foundation (current)

Scope: configuration, tooling, skeleton. No product features.

Steps:

1. **Configuration and bundling check** _(exact next step)_: `app.json` (name, slug, dark, package ID, plugins with all four `androidExtensions` keys and PiP flag), NativeWind wiring, minimal dark `App.tsx`. Run `tsc` and `expo export --platform android`.
2. Folder skeleton from the architecture doc, theme tokens, navigation shell with the eight placeholder screens.
3. Jest, ESLint and Prettier configured; first meaningful tests (theme/navigation smoke, a placeholder store).
4. `README.md` written; docs updated.
5. CI workflow `ci.yml` (typecheck, lint, test, bundle) and `build-apk.yml` modelled on the owner's `study-planner1` pipeline (Node 22, JDK 21 Temurin, `expo prebuild`, `./gradlew assembleDebug`, upload APK artifact, GitHub release). Trigger the build by `workflow_dispatch` on the milestone branch first.

Exit criteria:

- L: `tsc`, lint, tests, `expo export` all pass. Recorded in the log, with output.
- C: the APK workflow completes **and** the APK artifact exists. _If NativeWind, Reanimated or MMKV fail to build, this is where it shows (risks R3, R4); fix before moving on._
- D: owner installs the APK and confirms the app launches to the dark shell. Until then, "launches" is unverified.

## Milestone 2 — Storage and state

- `services/storage`: MMKV instance, typed repositories (library, watchlist, history, progress, remote sources, settings), `schemaVersion` + migration runner.
- Zustand stores hydrated synchronously from MMKV.
- Tests (L): repository round-trips, migrations, store behaviour, corrupted-JSON recovery.
- Exit: all L checks pass; C build still green. D: add an item, force-stop the app, reopen, item still present.

## Milestone 3 — Local playback

- `modules/nova-saf` Kotlin module (persistable URI access) and its JS wrapper.
- Picker flow with `copyToCacheDirectory: false`; library records for local items.
- Player screen: play/pause, seek, speed, buffering indicator, fullscreen (library ref methods first, Nova-built landscape mode as fallback), keep-awake.
- Resume and history recording in `services/playback`.
- Tests (L): resume logic, progress throttling, history rules.
- Exit: C builds the native module. **D is required for the real questions**: does a picked video play, does it still open after a restart and a device reboot (risk R2), does resume work. If persistence fails, apply the "copy to app storage" fallback and document it.

## Milestone 4 — Remote sources

- URL validation, format detection, Remote Sources screen, add/remove/check.
- Error mapper (invalid URL, offline, unsupported, HTTP, generic) driven by `errorString/errorException/errorCode`.
- Cleartext policy per the owner's answer.
- Tests (L): validator and mapper with a table of URLs and error shapes.
- Exit: D with **authorised** sample streams the owner supplies or approves: progressive MP4, HLS, DASH. Each format is reported as supported only if it played on the device.

## Milestone 5 — Library experience

- Cards, search, genres/categories, manual metadata entry, poster management, watchlist, continue watching, recently watched, Movie Details screen.
- Loading, empty and error states. Accessible contrast checked against the theme tokens.
- Optional TMDB provider behind `MetadataProvider`, off unless a key is configured, only after reading TMDB's terms. App fully works without it.
- Tests (L): search/filter logic, watchlist/continue-watching selectors.
- Exit: L green; D walkthrough of every library flow offline (airplane mode).

## Milestone 6 — Ads and consent

- Install `react-native-google-mobile-ads` 17.4.0; read the `androidSdk` options (`classic | legacy | nextgen`) and choose with a written reason.
- `ConsentService` then `AdService`; placements exactly as in `AGENTS.md` §10; "Ad" labels; settings switch; privacy-options entry.
- **Test ad units only.** Real AdMob IDs need an account the owner creates; Nova asks before any account or publishing step.
- Tests (L): service state machine (consent → init → show), "ads failed" renders nothing, no ad import outside `services/ads` and `services/consent`.
- Exit: C builds with the plugin. D: consent form appears, banners/native ads appear on the intended screens only, never on Player or Settings, playback is never interrupted, the app works with ads blocked or airplane mode.

## Milestone 7 — Support Nova

- Research Google Play's rules for donations and in-app payments and each candidate provider's terms; present a short recommendation and **ask the owner** before choosing (it may involve accounts and payments).
- Implement the screen and `SupportService` for the chosen provider; strictly optional, nothing gated, no stored credentials, no recurring payment without explicit consent.
- Exit: L tests for the service; D walkthrough.

## Milestone 8 — Player completion

- Subtitle selection (embedded and sidecar), audio-track selection, picture-in-picture, shown only when the loaded media supports them.
- Tests (L): capability-gating logic.
- Exit: D, per format and per feature. Any feature that does not work on the device is documented as a limitation with an alternative, not shipped as a broken control.

## Milestone 9 — Hardening and release candidate

- Accessibility and responsive-layout pass, error boundaries, crash-safe storage handling, performance check on long libraries.
- Release signing: owner-provided keystore via CI secrets; nothing committed. Release APK through the verified workflow. Publishing to Google Play is a separate, owner-approved step.
- Exit: complete the `AGENTS.md` §14 checklist on a physical device. Every item recorded pass/fail in `PROJECT_STATUS.md`.

## Deferred (not before the first stable release)

Google Cast, DLNA, desktop sync, advanced media-source integrations, plugin system. Only the interfaces from `TECHNICAL_ARCHITECTURE.md` §10 are in scope.

## Dependencies by milestone

| Milestone | New packages                                                      |
| --------- | ----------------------------------------------------------------- |
| 1         | none (already installed); config only                             |
| 2         | none                                                              |
| 3         | local module `nova-saf`                                           |
| 4         | none                                                              |
| 5         | none (TMDB is plain `fetch`)                                      |
| 6         | `react-native-google-mobile-ads@17.4.0`                           |
| 7         | a support-provider SDK, **only if** the chosen provider needs one |
| 8         | none                                                              |
| 9         | none                                                              |

## Risks to watch while building

R1 slow CI loop · R2 URI persistence · R3 NativeWind compatibility · R4 MMKV/Nitro and architecture · R5 PiP/fullscreen/subtitles on device · R6 cleartext · R7 AdMob/Play accounts · R8 blocked Expo services · R9 Vega licence. Details and mitigations: `PROJECT_STATUS.md` §4.

## Progress (2026-11-06)

**Milestone 1: implemented, awaiting device confirmation.** Steps 1 to 5 are done in code. The L-tier exit criteria passed (type-check, lint, format, 36 tests, Metro bundle, and a successful `expo prebuild` whose output was inspected). `ci.yml` has also passed on a GitHub runner (commit `290ee00`). The C-tier criterion (the APK workflow completes; it cannot be started until the workflow is on `main`) and the D-tier criterion (the app launches on a phone) have **not** been met: neither has been attempted. Milestone 2 must not start until both are.

Parts of Milestone 2 were pulled forward because Phase 1 needed them: the repositories for library, remote sources, watchlist, progress and settings, and their stores and tests. Still to do in Milestone 2: playback history, and the device check that data survives a force-stop.

Changes to the plan: Remote Sources is a tab; sample data is controlled by one flag so preview APKs can include it; `build-apk.yml` builds the **release** variant (JavaScript bundled in) because a debug build needs a dev server.
