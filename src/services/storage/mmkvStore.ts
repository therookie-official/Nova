import { createMMKV } from 'react-native-mmkv';
import type { KeyValueStore } from './kvStore';

/** Production store: one MMKV instance, fully offline and synchronous. */
export function createMmkvStore(id = 'nova'): KeyValueStore {
  const mmkv = createMMKV({ id });
  return {
    getString: (key) => mmkv.getString(key),
    set: (key, value) => mmkv.set(key, value),
    remove: (key) => {
      mmkv.remove(key);
    },
    clearAll: () => mmkv.clearAll(),
    getAllKeys: () => mmkv.getAllKeys(),
  };
}
