# Project Nova — Technical Architecture

Status: **proposal.** Nothing here is implemented yet. Labels: **[VERIFIED]** observed in this session, **[ASSUMPTION]** believed but unchecked, **[UNVERIFIED]** only testable in CI or on a device. See `PROJECT_STATUS.md` for the evidence behind each verified item.

## 1. Project type and stack

New project (no existing application code). Android first.

| Layer       | Choice                                                                         | Basis                                                                                                    |
| ----------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Runtime     | React Native 0.88.1, React 19.3.0, TypeScript ~6.0.3                           | [VERIFIED] installed; Expo SDK 58 pins these                                                             |
| Platform    | Expo SDK 58 (`expo@58.0.23`) using a **development build** and `expo prebuild` | [VERIFIED] SDK 58 is the `latest` tag                                                                    |
| Not Expo Go | Nova uses native modules (video, MMKV/Nitro, ads, a local module)              | [ASSUMPTION] Expo Go does not bundle these; a dev build is required either way, as `AGENTS.md` instructs |
| Styling     | NativeWind 4.2.7 on Tailwind 3.4                                               | [VERIFIED] installed; **compatibility with RN 0.88 + Reanimated 4 untested** (risk R3)                   |
| Navigation  | React Navigation 7 (native-stack + bottom-tabs)                                | [VERIFIED] installed                                                                                     |
| Player      | `react-native-video` 6.19.3 (Media3/ExoPlayer 1.8.0)                           | [VERIFIED] v6.19.3 is `latest`; v7 is `beta`                                                             |
| State       | Zustand 5                                                                      | [VERIFIED] installed                                                                                     |
| Persistence | `react-native-mmkv` 4.3.2 (+ `react-native-nitro-modules`)                     | [VERIFIED] installed; New Architecture requirement unverified (R4)                                       |
| Ads         | `react-native-google-mobile-ads` 17.4.0                                        | [VERIFIED] exists, Apache-2.0; not installed yet                                                         |

Why `react-native-video` v6 and not v7: v7 is still published only under the `beta` tag and its README warns of expected breaking changes and missing features [VERIFIED]. v6 is the stable `latest`. Revisit after Nova's first stable release.

## 2. Android native configuration required

All of this is **planned**, none of it applied or built yet.

1. **Config plugin for `react-native-video`**, written out in full in `app.json`:
   - `androidExtensions`: `useExoplayerHls: true`, `useExoplayerDash: true`, `useExoplayerSmoothStreaming: true`, `useExoplayerRtsp: false`. **Every key must be listed** because the plugin writes any omitted key as `false` [VERIFIED in `withAndroidExtensions.ts`]. Library defaults without the plugin are HLS, DASH and SmoothStreaming on, RTSP and IMA off [VERIFIED in `android/gradle.properties`].
   - `enableAndroidPictureInPicture: true`, which sets `android:supportsPictureInPicture="true"` on the main activity [VERIFIED in `withAndroidPictureInPicture.ts`].
   - `enableNotificationControls` stays off for v1 (no background playback requirement in `AGENTS.md`).
2. **`expo-build-properties`**: set Android SDK levels only if the defaults from React Native (minSdk 24, targetSdk 36, compileSdk 37, buildTools 37.0.0, NDK 27.1.12297006, AGP 9.2.1, Kotlin 2.2.0 [VERIFIED]) need overriding. Default: keep them.
3. **Cleartext traffic**: decide policy (open question 3). If `http://` is allowed it needs `usesCleartextTraffic`; otherwise show an error. Android blocking cleartext by default is [ASSUMPTION].
4. **AdMob** (`react-native-google-mobile-ads`): plugin parameters `androidAppId` and optional `delayAppMeasurementInit`, `optimizeInitialization`, `optimizeAdLoading`, plus an `androidSdk` selector with values `classic | legacy | nextgen` [VERIFIED in `plugin/src/index.ts`]. What the three SDK values mean has not been read yet and must be decided in Milestone 6. Development uses Google's **test** app and unit IDs only (`TestIds` is exported [VERIFIED]).
5. **Local persistable-URI module** (`modules/nova-saf`, Kotlin): see §5.
6. **Orientation**: `expo-screen-orientation` for Nova's own landscape player mode.

## 3. Folder architecture

```
nova/
├─ app.json                    # later: app.config.ts
├─ App.tsx  index.ts
├─ babel.config.js  metro.config.js  tailwind.config.js  global.css
├─ modules/
│  └─ nova-saf/                # local Expo module (Kotlin): persist content:// access
├─ src/
│  ├─ navigation/              # RootNavigator, TabNavigator, route param types
│  ├─ screens/                 # Home, Library, RemoteSources, MovieDetails,
│  │                           #   Player, Watchlist, Settings, SupportNova
│  ├─ components/              # MediaCard, Shelf, EmptyState, ErrorState, Skeleton,
│  │                           #   player/ (controls, seek bar, track menu), ads/ (labelled wrappers)
│  ├─ services/
│  │  ├─ media/                # MediaSource model, URL validation, format detection, local picker
│  │  ├─ playback/             # PlaybackSession, resume, history recording, error mapping
│  │  ├─ storage/              # MMKV instance, repositories, schema migrations
│  │  ├─ ads/                  # AdService, ads config (test IDs), ad-unit registry
│  │  ├─ consent/              # ConsentService (UMP wrapper)  — separate from ads
│  │  ├─ support/              # SupportService + provider adapters (optional contributions)
│  │  ├─ metadata/             # optional TMDB client, manual-entry fallback
│  │  └─ cast/                 # CastService interface + NoopCastService (future)
│  ├─ store/                   # Zustand stores: library, watchlist, history, settings, sources
│  ├─ hooks/                   # usePlayer, useResume, useConnectivity, useAdsEnabled …
│  ├─ types/                   # shared domain types
│  ├─ utils/                   # formatTime, ids, result helpers
│  ├─ config/                  # feature flags, ad unit IDs (test), limits
│  └─ theme/                   # colour/spacing/type tokens
├─ __tests__/                  # mirrors src/
├─ docs/
└─ .github/workflows/          # CI (lint/test/bundle) and APK build
```

`AGENTS.md` suggests the module list without a `src/` prefix; using `src/` is a repository-layout choice only. Added beyond the suggested list: `consent/` (kept apart from `ads/` so consent logic is testable and reusable), `metadata/`, `cast/`, `theme/`, and `modules/nova-saf/`.

### Dependency rules (enforced by review and lint rules)

- `screens` and `components` depend on `store`, `hooks`, `types`; **never** import `services/*` directly except through hooks.
- `services/*` never import React components.
- `services/ads` and `services/consent` are the only code that imports `react-native-google-mobile-ads`. The rest of the app sees an interface, so ads can be switched off or fail without affecting playback.
- `services/playback` is the only code that interprets player events; screens receive a simplified state.

## 4. Core domain model (draft)

```ts
type MediaSource =
  | { kind: 'local'; uri: string; persisted: boolean } // content:// or file://
  | {
      kind: 'remote';
      url: string;
      format: 'progressive' | 'hls' | 'dash';
      headers?: Record<string, string>;
    };

interface LibraryItem {
  id;
  title;
  year?;
  genres: string[];
  posterUri?;
  source: MediaSource;
  addedAt;
  metadata: 'manual' | 'tmdb';
}
interface PlaybackProgress {
  itemId;
  positionMs;
  durationMs;
  updatedAt;
  completed: boolean;
}
interface HistoryEntry {
  itemId;
  watchedAt;
  positionMs;
}
interface RemoteSourceRecord {
  id;
  label;
  url;
  addedAt;
  lastCheckedAt?;
  lastStatus?;
}
interface Settings {
  adsEnabled: boolean;
  defaultSpeed: number;
  resumeEnabled: boolean;
  tmdbEnabled: boolean;
}
```

Storage: MMKV, one namespaced key per repository, each value JSON with a `schemaVersion`; migrations live in `services/storage`. Zustand stores hydrate from MMKV synchronously at startup (MMKV is synchronous), so local browsing needs no network [satisfies `AGENTS.md` §9]. The shape above is a proposal, not an implemented schema.

## 5. Local media (Android content URIs)

- **[VERIFIED]** `expo-document-picker` 58.0.4 launches `ACTION_OPEN_DOCUMENT`, and `copyToCacheDirectory` defaults to `true`. Its Android source contains **no** `takePersistableUriPermission` call.
- **[VERIFIED]** `react-native-video`'s Android `Source.kt` references the `content` URI scheme, and ExoPlayer is built on `DefaultDataSource`. Whether a `content://` URI plays correctly through Nova's exact player setup is **[UNVERIFIED]** until device testing.
- **[ASSUMPTION]** Grants from `ACTION_OPEN_DOCUMENT` last only until reboot unless persisted with `takePersistableUriPermission`, so a library of picked videos would silently break.

Design:

1. Call the picker with `copyToCacheDirectory: false` (never copy multi-gigabyte videos).
2. Pass the URI to `nova-saf`, a ~50-line Kotlin Expo module that calls `contentResolver.takePersistableUriPermission` and exposes `hasAccess(uri)`.
3. Store `persisted: true/false`. On open, check `hasAccess`; if it failed, show "Video no longer accessible — locate it again" and keep the library record (do not delete).
4. **Fallback** if the module cannot be built or the grant is refused: offer an explicit, user-visible "copy into Nova's storage" option for small files.

Never assume a filesystem path; the model stores `uri` as an opaque string.

## 6. Remote media

- Accept `http(s)` URLs the user adds themselves. Detect format from the path extension (`.m3u8` → HLS, `.mpd` → DASH, otherwise progressive). Extension-less URLs may need an explicit type hint to the player [UNVERIFIED].
- HLS and DASH are enabled in the Android build (§2), but **no stream has been played** yet. Support is confirmed only after a device test with an authorised sample stream.
- Error mapping in `services/playback`: the Android error event carries `errorString`, `errorException` and `errorCode` [VERIFIED in `OnVideoErrorData`]. Nova maps these, plus URL validation and a connectivity check, to messages: invalid URL, offline, unsupported format, HTTP failure, generic playback failure.
- No catalogue, no scraping, no DRM circumvention. The `drm` prop exists in the library [VERIFIED] but Nova does not use it.

## 7. Player

| Feature                            | Plan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Library evidence                 | Device-verified |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------- |
| Play/pause, seek, speed, buffering | Standard props/events                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Core v6 API                      | No              |
| Resume, history                    | `services/playback` writes position on interval, pause and exit                                                                                                                                                                                                                                                                                                                                                                                                                                     | n/a (app logic)                  | No              |
| Subtitles                          | `selectedTextTrack` (`system`/`disabled`/`title`/`language`/`index`) and sidecar `source.textTracks`                                                                                                                                                                                                                                                                                                                                                                                                | [VERIFIED] types                 | No              |
| Audio tracks                       | `selectedAudioTrack` (same selector types)                                                                                                                                                                                                                                                                                                                                                                                                                                                          | [VERIFIED] types                 | No              |
| Fullscreen                         | **First choice:** the library's `presentFullscreenPlayer()` / `dismissFullscreenPlayer()` ref methods, which exist and reach `setFullscreen` in the Android player view [VERIFIED in `Video.tsx`, `VideoManagerModule.kt`, `ReactExoplayerView.java`]. The `fullscreen`, `fullscreenAutorotate` and `fullscreenOrientation` _props_ are marked iOS. **Fallback:** Nova-built landscape + immersive mode via `expo-screen-orientation` if the library version misbehaves with Nova's custom controls | Methods exist; behaviour not run | No              |
| Picture-in-picture                 | Plugin flag + `enterPictureInPictureOnLeave` and `enterPictureInPicture()`/`exitPictureInPicture()` refs, `onPictureInPictureStatusChanged`                                                                                                                                                                                                                                                                                                                                                         | [VERIFIED] present in source     | No              |

Best-effort rule (from `AGENTS.md` §7): a control appears only if the loaded media reports that capability. Missing capability means a hidden control, never a fake one.

## 8. Ads and consent

- `ConsentService` wraps `AdsConsent`. The package exposes `requestInfoUpdate`, `showForm`, `showPrivacyOptionsForm` and `loadAndShowConsentFormIfRequired` [VERIFIED]. Flow: on launch call `requestInfoUpdate`, then `loadAndShowConsentFormIfRequired`; only then may `AdService` initialise the SDK.
- `AdService` owns initialisation, test-ID selection, and an `adsEnabled` switch. Every placement component renders `null` when ads are disabled, not initialised, or failed to load, so layout stays intact and the app keeps working [`AGENTS.md` §10].
- Formats: banner (`BannerAd`) and native ads (the package ships a native-ad implementation marked complete for Android [VERIFIED in its README table]).
- Placements: Home banner + native; Library banner; Movie Details optional native; Watchlist optional banner; **Player none; Settings none**. Every ad carries a visible "Ad" label.
- Development uses `TestIds` only. Real IDs are supplied through config the owner provides; they are never hard-coded or committed [`AGENTS.md` §13].
- Ads must never cover player controls or interrupt playback, and Nova never prompts or nudges taps.

## 9. Vega reference: functionality only

Features Vega advertises, from its README [VERIFIED]: stream and download; Google Cast and DLNA with a custom remuxer; watchlist; external-player support; desktop sync; custom plugins. Its stack overlaps with Nova's (React Native, Expo, NativeWind, React Navigation, `react-native-video`, Zustand) [VERIFIED from its `package.json`]; it uses a TV-oriented React Native fork (`react-native-tvos`) rather than stock React Native. MMKV use was only seen on the repository's web page, not in `package.json`.

| Vega capability              | Nova v1               | Note                                                                                                     |
| ---------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------- |
| Watchlist                    | Yes                   | Original implementation                                                                                  |
| Local playback               | Yes                   | Vega's focus is streaming; this is Nova's own scope                                                      |
| Download                     | No                    | Not in `AGENTS.md` v1 scope                                                                              |
| Cast / DLNA                  | Later                 | Interface only (§10)                                                                                     |
| Desktop sync                 | Later                 | Not in v1                                                                                                |
| Plugins and provider sources | **Never as designed** | `AGENTS.md` bans unauthorised catalogues and untrusted plugin code; Nova accepts only URLs the user adds |

Licence position [VERIFIED]: PolyForm Noncommercial 1.0.0 after commit `9ccc0c8`, explicitly treating ads as commercial use. Nova copies no Vega code, assets, logos or names, and does not mimic its interface.

## 10. Designing for future features

- **Casting.** `services/cast` defines `CastService { isAvailable(); start(source); stop() }` with a `NoopCastService` default; the player UI shows a cast button only when `isAvailable()` is true. Known constraints for a later milestone [ASSUMPTION, from general Cast/DLNA behaviour]: a receiver needs a network-reachable HTTP(S) URL, so a local `content://` file cannot be cast without an on-device HTTP server; receivers support a limited set of containers/codecs, which is why Vega built a remuxer. None of this is built.
- **Desktop sync.** Storage repositories sit behind interfaces with a `schemaVersion`, so a sync layer can be added without changing screens.
- **Plugins.** Not implemented. If ever added, it would be a declarative, data-only format (no execution of third-party code), per `AGENTS.md` §11.
- **Metadata.** `services/metadata` defines a `MetadataProvider` interface; manual entry is the default, TMDB is optional and off unless the owner supplies a key, subject to TMDB's terms.

## 11. Support Nova screen

`SupportService` exposes `listOptions()` and `open(option)`. Contributions are optional, nothing is gated, no recurring payment without explicit consent, no payment credentials stored. **Provider not chosen.** Google Play has rules on in-app payments and donations; the provider must be selected only after checking those rules (Milestone 7). Until then the screen shows explanatory text and a disabled state.

## 12. Testing strategy

| Where                   | What                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local (this sandbox)    | `tsc --noEmit`, ESLint, Jest (storage repositories, URL validator, format detector, error mapper, resume logic, stores), Metro bundle via `expo export`                           |
| GitHub Actions          | The same checks on every push, plus `expo prebuild` and `gradlew assembleDebug`                                                                                                   |
| Physical device (owner) | All items in `AGENTS.md` §14: launch, picker, local and remote playback, formats, persistence, history, resume, offline, ad placement and consent, support screen, error handling |

A feature is described as working only after the row that can actually test it has passed.

## 13. Phase 1 implementation notes (2026-11-06)

What was built, and where it differs from the proposal above.

- **Tabs:** five bottom tabs (Home, Library, Sources, Watchlist, Settings). Movie Details, Player and Support Nova are stack screens above the tabs. Remote Sources is a tab rather than a stack screen.
- **Storage:** `KeyValueStore` (MMKV and in-memory implementations) and `createRepository` (versioned envelope `{ v, data }`, reads never throw, unreadable data is kept in `<key>.corrupt`). Concrete repositories: library, remote sources, watchlist, progress, settings. History is not built yet.
- **Stores:** one generic `createListStore` serves the library and remote sources. Every store takes its repository as an argument, so tests create fresh ones on an in-memory store.
- **Sample data:** `src/config/placeholderData.ts` (invented titles, reserved `example.com` URLs, every record flagged `isPlaceholder`) and `src/services/dev/placeholders.ts` (load, clear, first-run seed). Gated by `SAMPLE_DATA_ENABLED` in `src/config/flags.ts`: on in development and in builds made with `EXPO_PUBLIC_NOVA_SAMPLE_DATA=1`.
- **Design tokens:** `src/theme/tokens.js` feeds `tailwind.config.js` and is typed by `tokens.d.ts`. Contrast values are computed and recorded in that file.
- **Player screen:** a placeholder with no video component; it says so on screen. `react-native-video` is installed and configured natively but not yet used by any screen.
- **Not built:** `services/media`, `services/playback`, `services/ads`, `services/consent`, `services/support`, `services/metadata`, `services/cast`, `modules/nova-saf`. They appear in the plan for later milestones.
- **TypeScript 6 settings:** no `baseUrl`; `paths` only; `"types": ["jest"]`; CSS modules declared in `nativewind-env.d.ts`.
- **Dependency note:** `expo-font`, `expo-asset` and `babel-preset-expo` are installed at the project root because npm otherwise nests them out of reach.
- **Unchanged and still unverified on a device:** everything in §7 (player features), §5 (local media), and §8 (ads).
