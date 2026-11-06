/**
 * Sample data is for development and preview builds only.
 *
 * It is on in development (`__DEV__`) and in any build made with
 * `EXPO_PUBLIC_NOVA_SAMPLE_DATA=1` (Metro inlines `EXPO_PUBLIC_*` variables when it bundles).
 * A normal production build sets neither, so it never contains or offers sample data.
 */
export const SAMPLE_DATA_ENABLED: boolean =
  __DEV__ || process.env.EXPO_PUBLIC_NOVA_SAMPLE_DATA === '1';
