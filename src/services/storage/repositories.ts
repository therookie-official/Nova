import type { LibraryItem, PlaybackProgress, RemoteSourceRecord, Settings } from '@/types/media';
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

export const libraryRepository = createRepository<LibraryItem[]>({
  key: 'nova.library',
  version: 1,
  defaults: () => [],
  validate: isArrayOf<LibraryItem>(
    (item) =>
      hasStringId(item) &&
      typeof (item as LibraryItem).title === 'string' &&
      Array.isArray((item as LibraryItem).genres) &&
      isRecord((item as LibraryItem).source),
  ),
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
