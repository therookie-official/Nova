import {
  collectGenres,
  filterLibrary,
  formatClock,
  formatDuration,
  progressFraction,
  selectContinueWatching,
  selectRecentlyWatched,
  sortRecentlyAdded,
} from '@/utils/library';
import type { MediaItem, PlaybackProgress } from '@/types/media';

const make = (id: string, title: string, genres: string[], addedAt: number): MediaItem => ({
  id,
  addedAt,
  source: { kind: 'local', uri: `content://x/${id}`, persisted: false },
  metadata: { title, genres, origin: 'manual' },
});

const items = [
  make('a', 'Night Orchard', ['Thriller'], 1),
  make('b', 'Low Orbit', ['Sci-Fi'], 3),
  make('c', 'Monsoon Letters', ['Romance', 'Drama'], 2),
];

describe('filterLibrary', () => {
  it('returns everything for an empty or blank query', () => {
    expect(filterLibrary(items, '')).toHaveLength(3);
    expect(filterLibrary(items, '   ')).toHaveLength(3);
  });
  it('matches title case-insensitively', () => {
    expect(filterLibrary(items, 'orb').map((i) => i.id)).toEqual(['b']);
  });
  it('matches genre', () => {
    expect(filterLibrary(items, 'drama').map((i) => i.id)).toEqual(['c']);
  });
  it('limits to one category, case-insensitively, combined with the query', () => {
    expect(filterLibrary(items, '', 'drama').map((i) => i.id)).toEqual(['c']);
    expect(filterLibrary(items, 'night', 'drama')).toEqual([]);
  });
  it('returns nothing when nothing matches', () => {
    expect(filterLibrary(items, 'zzz')).toEqual([]);
  });
});

describe('sortRecentlyAdded', () => {
  it('orders newest first without mutating the input', () => {
    const before = items.map((i) => i.id);
    expect(sortRecentlyAdded(items).map((i) => i.id)).toEqual(['b', 'c', 'a']);
    expect(items.map((i) => i.id)).toEqual(before);
  });
});

describe('progress helpers', () => {
  const p = (
    itemId: string,
    positionMs: number,
    durationMs: number,
    updatedAt = 1,
  ): PlaybackProgress => ({
    itemId,
    positionMs,
    durationMs,
    updatedAt,
  });

  it('computes and clamps the fraction', () => {
    expect(progressFraction(p('a', 25, 100))).toBe(0.25);
    expect(progressFraction(p('a', 500, 100))).toBe(1);
    expect(progressFraction(p('a', 10, 0))).toBe(0);
    expect(progressFraction(undefined)).toBe(0);
  });

  it('continue-watching keeps started, unfinished, known items, newest first', () => {
    const result = selectContinueWatching(items, {
      a: p('a', 10, 100, 1),
      b: p('b', 50, 100, 9),
      c: p('c', 99, 100, 5), // finished
      ghost: p('ghost', 10, 100, 7), // not in library
    });
    expect(result.map((r) => r.item.id)).toEqual(['b', 'a']);
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(112 * 60_000)).toBe('1h 52m');
    expect(formatDuration(45 * 60_000)).toBe('45m');
    expect(formatDuration(120 * 60_000)).toBe('2h 0m');
  });
  it('returns undefined for missing or invalid durations', () => {
    expect(formatDuration(undefined)).toBeUndefined();
    expect(formatDuration(0)).toBeUndefined();
  });
});

describe('formatClock', () => {
  it('formats minutes and hours', () => {
    expect(formatClock(245_000)).toBe('4:05');
    expect(formatClock(3_723_000)).toBe('1:02:03');
    expect(formatClock(-5)).toBe('0:00');
  });
});

describe('collectGenres', () => {
  it('de-duplicates ignoring case and sorts', () => {
    const more = [...items, make('d', 'X', ['drama', 'Anime'], 4)];
    expect(collectGenres(more)).toEqual(['Anime', 'Drama', 'Sci-Fi', 'Thriller', 'Romance'].sort());
  });
});

describe('selectRecentlyWatched', () => {
  const h = (itemId: string, watchedAt: number) => ({
    itemId,
    watchedAt,
    positionMs: 1,
    durationMs: 2,
  });
  it('orders newest first, skips removed items and honours the limit', () => {
    const history = [h('a', 1), h('b', 5), h('ghost', 9), h('c', 3)];
    expect(selectRecentlyWatched(items, history).map((i) => i.id)).toEqual(['b', 'c', 'a']);
    expect(selectRecentlyWatched(items, history, 1).map((i) => i.id)).toEqual(['b']);
  });
});
