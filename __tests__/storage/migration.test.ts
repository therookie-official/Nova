import { migrateLibraryV1 } from '@/services/storage/repositories';
import { createHistoryStore } from '@/store/historyStore';
import { createMemoryStore, createRepository } from '@/services/storage';
import type { HistoryEntry } from '@/types/media';

describe('migrateLibraryV1', () => {
  it('splits flat v1 records into source and metadata', () => {
    const migrated = migrateLibraryV1([
      {
        id: 'a',
        title: 'Old',
        year: 2020,
        genres: ['Drama'],
        durationMin: 90,
        addedAt: 5,
        metadata: 'manual',
        source: { kind: 'remote', url: 'https://e.com/a.mp4', format: 'hls' },
      },
      {
        id: 'b',
        title: 'Local',
        genres: [],
        addedAt: 6,
        source: { kind: 'local', uri: 'content://x', persisted: true },
      },
    ]) as Record<string, any>[];
    expect(migrated[0].source).toEqual({
      kind: 'remote',
      uri: 'https://e.com/a.mp4',
      format: 'hls',
    });
    expect(migrated[0].metadata).toMatchObject({
      title: 'Old',
      year: 2020,
      durationMs: 5_400_000,
      origin: 'manual',
    });
    expect(migrated[1].source).toEqual({ kind: 'local', uri: 'content://x', persisted: true });
  });
  it('returns undefined for non-array data', () => {
    expect(migrateLibraryV1({ nope: true })).toBeUndefined();
  });
});

describe('history store', () => {
  const make = (store = createMemoryStore()) =>
    createHistoryStore(
      createRepository<HistoryEntry[]>({
        key: 'h',
        version: 1,
        defaults: () => [],
        validate: Array.isArray as (d: unknown) => d is HistoryEntry[],
        storage: () => store,
      }),
    );
  const e = (itemId: string, watchedAt: number): HistoryEntry => ({
    itemId,
    watchedAt,
    positionMs: 1,
    durationMs: 2,
  });

  it('keeps one entry per item, newest first, and persists', () => {
    const store = createMemoryStore();
    const h = make(store);
    h.getState().record(e('a', 1));
    h.getState().record(e('b', 2));
    h.getState().record(e('a', 3));
    expect(h.getState().entries.map((x) => x.itemId)).toEqual(['a', 'b']);
    expect(make(store).getState().entries).toHaveLength(2);
  });
  it('forgets and clears', () => {
    const h = make();
    h.getState().record(e('a', 1));
    h.getState().record(e('b', 2));
    h.getState().forget('a');
    expect(h.getState().entries.map((x) => x.itemId)).toEqual(['b']);
    h.getState().clear();
    expect(h.getState().entries).toEqual([]);
  });
});
