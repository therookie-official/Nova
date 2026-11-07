/**
 * Sample data is for development and preview builds only.
 *
 * It is on in development (`__DEV__`) and in any build made with
 * `EXPO_PUBLIC_NOVA_SAMPLE_DATA=1` (Metro inlines `EXPO_PUBLIC_*` variables when it bundles).
 * A normal production build sets neither, so it never contains or offers sample data.
 */
export const SAMPLE_DATA_ENABLED: boolean =
  __DEV__ || process.env.EXPO_PUBLIC_NOVA_SAMPLE_DATA === '1';

/**
 * DASH (.mpd) links are rejected unless this is on. The ExoPlayer DASH module is compiled into
 * the app, but no DASH stream has been played on a real Android build, so Nova does not claim
 * support. Preview builds can turn it on with `EXPO_PUBLIC_NOVA_EXPERIMENTAL_DASH=1` to test it.
 */
export const DASH_ENABLED: boolean = process.env.EXPO_PUBLIC_NOVA_EXPERIMENTAL_DASH === '1';
