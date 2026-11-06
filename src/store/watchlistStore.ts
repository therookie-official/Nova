import { create } from 'zustand';
import type { Repository } from '@/services/storage';
import { watchlistRepository } from '@/services/storage/repositories';

export interface WatchlistState {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  remove: (id: string) => void;
}

export function createWatchlistStore(repository: Repository<string[]>) {
  return create<WatchlistState>((set, get) => {
    const commit = (ids: string[]) => {
      repository.save(ids);
      set({ ids });
    };
    return {
      ids: repository.load(),
      toggle: (id) => {
        const { ids } = get();
        commit(ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id]);
      },
      has: (id) => get().ids.includes(id),
      remove: (id) => commit(get().ids.filter((existing) => existing !== id)),
    };
  });
}

export const useWatchlistStore = createWatchlistStore(watchlistRepository);
