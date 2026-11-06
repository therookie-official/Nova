import { create } from 'zustand';
import type { Repository } from '@/services/storage';
import { progressRepository } from '@/services/storage/repositories';
import type { PlaybackProgress } from '@/types/media';

export interface ProgressState {
  byItem: Record<string, PlaybackProgress>;
  set: (progress: PlaybackProgress) => void;
  clear: (itemId: string) => void;
}

export function createProgressStore(repository: Repository<Record<string, PlaybackProgress>>) {
  return create<ProgressState>((set, get) => {
    const commit = (byItem: Record<string, PlaybackProgress>) => {
      repository.save(byItem);
      set({ byItem });
    };
    return {
      byItem: repository.load(),
      set: (progress) => commit({ ...get().byItem, [progress.itemId]: progress }),
      clear: (itemId) => {
        const { [itemId]: _removed, ...rest } = get().byItem;
        commit(rest);
      },
    };
  });
}

export const useProgressStore = createProgressStore(progressRepository);
