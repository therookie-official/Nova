import type {
  HistoryEntry,
  MediaItem,
  PlaybackProgress,
  RemoteSourceRecord,
  Settings,
} from '@/types/media';
import { createRepository } from './repository';
import { getStorage } from './index';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isArrayOf =
  <T>(check: (item: unknown) => boolean) =>
  (data: unknown): data is T[] =>
    Array.isArray(data) && data.every(check);

const hasStringId = (item: unknown) => isRecord(item) && typeof item.id === 'string';

export const DEFAULT_SETTINGS: Settings = {
  resumeEnabled: true,
  defaultSpeed: 1,
  placeholdersSeeded: false,
};

/**
 * Library schema v1 mixed source and display fields in one object (`title`, `durationMin`,
 * `source.url`). v2 separates them into `source` and `metadata`. Returns `undefined` if the
 * stored data is not an array, which makes the repository fall back to defaults.
 */
export function migrateLibraryV1(data: unknown): unknown {
  if (!Array.isArray(data)) return undefined;
  return data.map((raw) => {
    if (!isRecord(raw)) return raw;
    const old = isRecord(raw.source) ? raw.source : {};
    const source =
      old.kind === 'local'
        ? { kind: 'local', uri: old.uri, persisted: old.persisted === true }
        : { kind: 'remote', uri: old.url ?? old.uri, format: old.format ?? 'progressive' };
    return {
      id: raw.id,
      addedAt: raw.addedAt,
      isPlaceholder: raw.isPlaceholder,
      source,
      metadata: {
        title: raw.title,
        year: raw.year,
        genres: raw.genres,
        description: raw.description,
        posterUri: raw.posterUri,
        durationMs: typeof raw.durationMin === 'number' ? raw.durationMin * 60_000 : undefined,
        origin: raw.metadata === 'tmdb' ? 'tmdb' : 'manual',
      },
    };
  });
}

export const libraryRepository = createRepository<MediaItem[]>({
  key: 'nova.library',
  version: 2,
  defaults: () => [],
  migrate: (data, fromVersion) => (fromVersion === 1 ? migrateLibraryV1(data) : undefined),
  validate: isArrayOf<MediaItem>((item) => {
    if (!hasStringId(item)) return false;
    const { source, metadata } = item as MediaItem;
    return (
      isRecord(source) &&
      (source.kind === 'local' || source.kind === 'remote') &&
      typeof source.uri === 'string' &&
      isRecord(metadata) &&
      typeof metadata.title === 'string' &&
      Array.isArray(metadata.genres)
    );
  }),
  storage: getStorage,
});

export const remoteSourcesRepository = createRepository<RemoteSourceRecord[]>({
  key: 'nova.remoteSources',
  version: 1,
  defaults: () => [],
  validate: isArrayOf<RemoteSourceRecord>(
    (item) =>
      hasStringId(item) &&
      typeof (item as RemoteSourceRecord).url === 'string' &&
      typeof (item as RemoteSourceRecord).label === 'string',
  ),
  storage: getStorage,
});

export const watchlistRepository = createRepository<string[]>({
  key: 'nova.watchlist',
  version: 1,
  defaults: () => [],
  validate: isArrayOf<string>((item) => typeof item === 'string'),
  storage: getStorage,
});

export const progressRepository = createRepository<Record<string, PlaybackProgress>>({
  key: 'nova.progress',
  version: 1,
  defaults: () => ({}),
  validate: (data): data is Record<string, PlaybackProgress> =>
    isRecord(data) &&
    Object.values(data).every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.itemId === 'string' &&
        typeof entry.positionMs === 'number' &&
        typeof entry.durationMs === 'number',
    ),
  storage: getStorage,
});

export const historyRepository = createRepository<HistoryEntry[]>({
  key: 'nova.history',
  version: 1,
  defaults: () => [],
  validate: isArrayOf<HistoryEntry>(
    (item) =>
      isRecord(item) &&
      typeof item.itemId === 'string' &&
      typeof item.watchedAt === 'number' &&
      typeof item.positionMs === 'number' &&
      typeof item.durationMs === 'number',
  ),
  storage: getStorage,
});

export const settingsRepository = createRepository<Settings>({
  key: 'nova.settings',
  version: 1,
  defaults: () => ({ ...DEFAULT_SETTINGS }),
  validate: (data): data is Settings =>
    isRecord(data) &&
    typeof data.resumeEnabled === 'boolean' &&
    typeof data.defaultSpeed === 'number' &&
    typeof data.placeholdersSeeded === 'boolean',
  storage: getStorage,
});
