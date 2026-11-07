import { useHistoryStore } from '@/store/historyStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useProgressStore } from '@/store/progressStore';
import { useWatchlistStore } from '@/store/watchlistStore';
import type { MediaFormat, MediaItem, MediaMetadata } from '@/types/media';
import { createId } from '@/utils/id';
import { safAccess } from './novaSaf';

/** Splits "Drama, Sci-Fi ,drama" into ["Drama", "Sci-Fi"] (case-insensitive de-duplication). */
export function parseGenres(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(',')) {
    const genre = part.trim();
    const key = genre.toLowerCase();
    if (genre && !seen.has(key)) {
      seen.add(key);
      out.push(genre);
    }
  }
  return out;
}

/** Year from user text. Undefined when empty or not a plausible year. */
export function parseYear(text: string): number | undefined {
  const value = Number(text.trim());
  return Number.isInteger(value) && value >= 1888 && value <= 2100 ? value : undefined;
}

export function addRemoteItem(args: {
  url: string;
  format: MediaFormat;
  title: string;
  genres?: string[];
}): MediaItem {
  const item: MediaItem = {
    id: createId(),
    addedAt: Date.now(),
    source: { kind: 'remote', uri: args.url, format: args.format },
    metadata: {
      title: args.title.trim() || 'Untitled video',
      genres: args.genres ?? [],
      origin: 'manual',
    },
  };
  useLibraryStore.getState().add(item);
  return item;
}

/** Edits display metadata only. The source is never touched, so playback is unaffected. */
export function updateMetadata(itemId: string, patch: Partial<MediaMetadata>): void {
  const library = useLibraryStore.getState();
  const item = library.items.find((entry) => entry.id === itemId);
  if (!item) return;
  library.update(itemId, { metadata: { ...item.metadata, ...patch } });
}

/** Removes the library entry and everything that refers to it. Never deletes the video file. */
export async function removeItem(itemId: string): Promise<void> {
  const library = useLibraryStore.getState();
  const item = library.items.find((entry) => entry.id === itemId);
  if (!item) return;
  library.remove(itemId);
  useProgressStore.getState().clear(itemId);
  useHistoryStore.getState().forget(itemId);
  const watchlist = useWatchlistStore.getState();
  if (watchlist.has(itemId)) watchlist.remove(itemId);
  if (item.source.kind === 'local' && item.source.persisted) {
    await safAccess.release(item.source.uri);
  }
}
