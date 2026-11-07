import { create } from 'zustand';
import type { Repository } from '@/services/storage';
import { playbackPrefsRepository } from '@/services/storage/repositories';
import type { ExternalSubtitle, PlaybackPrefs } from '@/types/media';

export interface PlaybackPrefsState {
  byItem: Record<string, PlaybackPrefs>;
  patch: (itemId: string, patch: Partial<Omit<PlaybackPrefs, 'itemId'>>) => void;
  addSubtitle: (itemId: string, subtitle: ExternalSubtitle) => void;
  removeSubtitle: (itemId: string, uri: string) => void;
  clear: (itemId: string) => void;
}

export function createPlaybackPrefsStore(repository: Repository<Record<string, PlaybackPrefs>>) {
  return create<PlaybackPrefsState>((set, get) => {
    const commit = (byItem: Record<string, PlaybackPrefs>) => {
      repository.save(byItem);
      set({ byItem });
    };
    const current = (itemId: string): PlaybackPrefs =>
      get().byItem[itemId] ?? { itemId, subtitles: [] };
    return {
      byItem: repository.load(),
      patch: (itemId, patch) =>
        commit({ ...get().byItem, [itemId]: { ...current(itemId), ...patch, itemId } }),
      addSubtitle: (itemId, subtitle) => {
        const existing = current(itemId);
        const others = existing.subtitles.filter((entry) => entry.uri !== subtitle.uri);
        commit({
          ...get().byItem,
          [itemId]: { ...existing, subtitles: [...others, subtitle] },
        });
      },
      removeSubtitle: (itemId, uri) => {
        const existing = current(itemId);
        commit({
          ...get().byItem,
          [itemId]: { ...existing, subtitles: existing.subtitles.filter((s) => s.uri !== uri) },
        });
      },
      clear: (itemId) => {
        const { [itemId]: _removed, ...rest } = get().byItem;
        commit(rest);
      },
    };
  });
}

export const usePlaybackPrefsStore = createPlaybackPrefsStore(playbackPrefsRepository);
