/** Minimal synchronous key-value contract. MMKV implements it in the app; tests use memory. */
export interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
  clearAll(): void;
  getAllKeys(): string[];
}

export function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getString: (key) => data.get(key),
    set: (key, value) => {
      data.set(key, value);
    },
    remove: (key) => {
      data.delete(key);
    },
    clearAll: () => data.clear(),
    getAllKeys: () => Array.from(data.keys()),
  };
}
