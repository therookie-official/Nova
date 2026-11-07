import { create } from 'zustand';
import type { Repository } from '@/services/storage';
import { historyRepository } from '@/services/storage/repositories';
import type { HistoryEntry } from '@/types/media';

export const HISTORY_LIMIT = 100;

export interface HistoryState {
  entries: HistoryEntry[];
  /** Records that an item was just watched. One entry per item, newest first, capped. */
  record: (entry: HistoryEntry) => void;
  forget: (itemId: string) => void;
  clear: () => void;
}

export function createHistoryStore(repository: Repository<HistoryEntry[]>) {
  return create<HistoryState>((set, get) => {
    const commit = (entries: HistoryEntry[]) => {
      repository.save(entries);
      set({ entries });
    };
    return {
      entries: repository.load(),
      record: (entry) => {
        const others = get().entries.filter((existing) => existing.itemId !== entry.itemId);
        commit([entry, ...others].slice(0, HISTORY_LIMIT));
      },
      forget: (itemId) => commit(get().entries.filter((entry) => entry.itemId !== itemId)),
      clear: () => commit([]),
    };
  });
}

export const useHistoryStore = createHistoryStore(historyRepository);
