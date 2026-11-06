import type { LibraryItem, PlaybackProgress } from '@/types/media';

/** Case-insensitive match on title or genre. An empty query returns everything. */
export function filterLibrary(items: LibraryItem[], query: string): LibraryItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(needle) ||
      item.genres.some((genre) => genre.toLowerCase().includes(needle)),
  );
}

/** Newest first. Returns a new array. */
export function sortRecentlyAdded(items: LibraryItem[]): LibraryItem[] {
  return [...items].sort((a, b) => b.addedAt - a.addedAt);
}

/** Fraction watched, clamped to 0..1. Zero when the duration is unknown. */
export function progressFraction(progress: PlaybackProgress | undefined): number {
  if (!progress || progress.durationMs <= 0) return 0;
  return Math.min(Math.max(progress.positionMs / progress.durationMs, 0), 1);
}

/** Items with partial progress (started, not finished), most recently watched first. */
export function selectContinueWatching(
  items: LibraryItem[],
  progressByItem: Record<string, PlaybackProgress>,
): { item: LibraryItem; progress: PlaybackProgress }[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return Object.values(progressByItem)
    .filter((progress) => {
      const fraction = progressFraction(progress);
      return byId.has(progress.itemId) && fraction > 0 && fraction < 0.95;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((progress) => ({ item: byId.get(progress.itemId) as LibraryItem, progress }));
}

export function formatDuration(minutes: number | undefined): string | undefined {
  if (!minutes || minutes <= 0) return undefined;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}
