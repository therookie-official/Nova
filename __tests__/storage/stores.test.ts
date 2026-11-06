import { PLACEHOLDER_LIBRARY } from '@/config/placeholderData';
import { createMemoryStore, createRepository } from '@/services/storage';
import { DEFAULT_SETTINGS } from '@/services/storage/repositories';
import { createListStore } from '@/store/createListStore';
import { createProgressStore } from '@/store/progressStore';
import { createSettingsStore } from '@/store/settingsStore';
import { createWatchlistStore } from '@/store/watchlistStore';
import type { LibraryItem, PlaybackProgress, Settings } from '@/types/media';

const item = (id: string, title = id): LibraryItem => ({
  id,
  title,
  genres: [],
  source: { kind: 'remote', url: `https://example.com/${id}.mp4`, format: 'progressive' },
  addedAt: 1,
  metadata: 'manual',
});

/** A repository over a shared memory store, so a second one models an app restart. */
function repoOn<T>(
  store: ReturnType<typeof createMemoryStore>,
  key: string,
  defaults: () => T,
  validate: (data: unknown) => data is T,
) {
  return createRepository<T>({ key, version: 1, defaults, validate, storage: () => store });
}

const libraryRepo = (store: ReturnType<typeof createMemoryStore>) =>
  repoOn<LibraryItem[]>(
    store,
    'lib',
    () => [],
    Array.isArray as (d: unknown) => d is LibraryItem[],
  );

describe('list store (library)', () => {
  it('adds, updates and removes, saving each change', () => {
    const store = createMemoryStore();
    const lib = createListStore(libraryRepo(store));

    lib.getState().add(item('a'));
    lib.getState().add(item('b'));
    lib.getState().update('a', { title: 'Renamed' });
    lib.getState().remove('b');

    expect(lib.getState().items.map((i) => [i.id, i.title])).toEqual([['a', 'Renamed']]);
  });

  it('replaces an item added twice with the same id', () => {
    const lib = createListStore(libraryRepo(createMemoryStore()));
    lib.getState().add(item('a', 'First'));
    lib.getState().add(item('a', 'Second'));
    expect(lib.getState().items).toHaveLength(1);
    expect(lib.getState().items[0].title).toBe('Second');
  });

  it('persists across a restart', () => {
    const store = createMemoryStore();
    createListStore(libraryRepo(store)).getState().add(item('kept'));

    const afterRestart = createListStore(libraryRepo(store));
    expect(afterRestart.getState().items.map((i) => i.id)).toEqual(['kept']);
  });
});

describe('watchlist store', () => {
  const make = (store = createMemoryStore()) =>
    createWatchlistStore(
      repoOn<string[]>(store, 'wl', () => [], Array.isArray as (d: unknown) => d is string[]),
    );

  it('toggles membership', () => {
    const wl = make();
    wl.getState().toggle('x');
    expect(wl.getState().has('x')).toBe(true);
    wl.getState().toggle('x');
    expect(wl.getState().has('x')).toBe(false);
  });

  it('persists across a restart', () => {
    const store = createMemoryStore();
    make(store).getState().toggle('x');
    expect(make(store).getState().ids).toEqual(['x']);
  });
});

describe('progress store', () => {
  const entry: PlaybackProgress = { itemId: 'a', positionMs: 10, durationMs: 100, updatedAt: 5 };
  const make = (store = createMemoryStore()) =>
    createProgressStore(
      repoOn<Record<string, PlaybackProgress>>(
        store,
        'pg',
        () => ({}),
        (d): d is Record<string, PlaybackProgress> => typeof d === 'object' && d !== null,
      ),
    );

  it('stores, overwrites and clears progress', () => {
    const pg = make();
    pg.getState().set(entry);
    pg.getState().set({ ...entry, positionMs: 50 });
    expect(pg.getState().byItem.a.positionMs).toBe(50);
    pg.getState().clear('a');
    expect(pg.getState().byItem.a).toBeUndefined();
  });

  it('persists across a restart', () => {
    const store = createMemoryStore();
    make(store).getState().set(entry);
    expect(make(store).getState().byItem.a).toEqual(entry);
  });
});

describe('settings store', () => {
  const make = (store = createMemoryStore()) =>
    createSettingsStore(
      repoOn<Settings>(
        store,
        'st',
        () => ({ ...DEFAULT_SETTINGS }),
        (d): d is Settings => typeof d === 'object' && d !== null,
      ),
    );

  it('starts with defaults', () => {
    const state = make().getState();
    expect(state.resumeEnabled).toBe(true);
    expect(state.defaultSpeed).toBe(1);
  });

  it('merges partial updates and persists them', () => {
    const store = createMemoryStore();
    make(store).getState().update({ defaultSpeed: 1.5 });
    const reopened = make(store).getState();
    expect(reopened.defaultSpeed).toBe(1.5);
    expect(reopened.resumeEnabled).toBe(true);
  });
});

describe('placeholder data', () => {
  it('is flagged, deterministic and uses reserved example.com URLs only', () => {
    expect(PLACEHOLDER_LIBRARY.length).toBeGreaterThan(0);
    for (const entry of PLACEHOLDER_LIBRARY) {
      expect(entry.isPlaceholder).toBe(true);
      expect(entry.source.kind === 'remote' && entry.source.url).toMatch(
        /^https:\/\/example\.com\//,
      );
    }
    expect(new Set(PLACEHOLDER_LIBRARY.map((i) => i.id)).size).toBe(PLACEHOLDER_LIBRARY.length);
  });
});
