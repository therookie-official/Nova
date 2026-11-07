import type { HistoryEntry, MediaItem, PlaybackProgress } from '@/types/media';

/** Case-insensitive match on title or genre, optionally limited to one genre. */
export function filterLibrary(items: MediaItem[], query: string, genre?: string): MediaItem[] {
  const needle = query.trim().toLowerCase();
  const wantedGenre = genre?.toLowerCase();
  return items.filter((item) => {
    const { title, genres } = item.metadata;
    if (wantedGenre && !genres.some((g) => g.toLowerCase() === wantedGenre)) return false;
    if (!needle) return true;
    return (
      title.toLowerCase().includes(needle) || genres.some((g) => g.toLowerCase().includes(needle))
    );
  });
}

/** Every genre in use, de-duplicated ignoring case, sorted alphabetically. */
export function collectGenres(items: MediaItem[]): string[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    for (const genre of item.metadata.genres) {
      const key = genre.trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, genre.trim());
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

/** Newest first. Returns a new array. */
export function sortRecentlyAdded(items: MediaItem[]): MediaItem[] {
  return [...items].sort((a, b) => b.addedAt - a.addedAt);
}

/** Fraction watched, clamped to 0..1. Zero when the duration is unknown. */
export function progressFraction(progress: PlaybackProgress | undefined): number {
  if (!progress || progress.durationMs <= 0) return 0;
  return Math.min(Math.max(progress.positionMs / progress.durationMs, 0), 1);
}

/** Items with partial progress (started, not finished), most recently watched first. */
export function selectContinueWatching(
  items: MediaItem[],
  progressByItem: Record<string, PlaybackProgress>,
): { item: MediaItem; progress: PlaybackProgress }[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return Object.values(progressByItem)
    .filter((progress) => {
      const fraction = progressFraction(progress);
      return byId.has(progress.itemId) && fraction > 0 && fraction < 0.95;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((progress) => ({ item: byId.get(progress.itemId) as MediaItem, progress }));
}

/** Items that were played, newest first, skipping any that are no longer in the library. */
export function selectRecentlyWatched(
  items: MediaItem[],
  history: HistoryEntry[],
  limit = 10,
): MediaItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return [...history]
    .sort((a, b) => b.watchedAt - a.watchedAt)
    .map((entry) => byId.get(entry.itemId))
    .filter((item): item is MediaItem => item !== undefined)
    .slice(0, limit);
}

/** "1h 52m" or "45m". Undefined when unknown. */
export function formatDuration(durationMs: number | undefined): string | undefined {
  if (!durationMs || durationMs <= 0) return undefined;
  const totalMinutes = Math.round(durationMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** Player clock: "4:05" or "1:02:03". */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
