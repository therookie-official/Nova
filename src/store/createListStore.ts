import { create } from 'zustand';
import type { Repository } from '@/services/storage';

export interface ListState<T extends { id: string }> {
  items: T[];
  add: (item: T) => void;
  update: (id: string, patch: Partial<Omit<T, 'id'>>) => void;
  remove: (id: string) => void;
  replaceAll: (items: T[]) => void;
}

/** A persisted list of records with an `id`. Every change is written straight to storage. */
export function createListStore<T extends { id: string }>(repository: Repository<T[]>) {
  return create<ListState<T>>((set, get) => {
    const commit = (items: T[]) => {
      repository.save(items);
      set({ items });
    };
    return {
      items: repository.load(),
      add: (item) => commit([...get().items.filter((existing) => existing.id !== item.id), item]),
      update: (id, patch) =>
        commit(get().items.map((item) => (item.id === id ? { ...item, ...patch } : item))),
      remove: (id) => commit(get().items.filter((item) => item.id !== id)),
      replaceAll: (items) => commit(items),
    };
  });
}
