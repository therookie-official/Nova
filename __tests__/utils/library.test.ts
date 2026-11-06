import {
  filterLibrary,
  formatDuration,
  progressFraction,
  selectContinueWatching,
  sortRecentlyAdded,
} from '@/utils/library';
import type { LibraryItem, PlaybackProgress } from '@/types/media';

const make = (id: string, title: string, genres: string[], addedAt: number): LibraryItem => ({
  id,
  title,
  genres,
  addedAt,
  source: { kind: 'local', uri: `content://x/${id}`, persisted: false },
  metadata: 'manual',
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
    expect(formatDuration(112)).toBe('1h 52m');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(120)).toBe('2h 0m');
  });
  it('returns undefined for missing or invalid durations', () => {
    expect(formatDuration(undefined)).toBeUndefined();
    expect(formatDuration(0)).toBeUndefined();
  });
});
