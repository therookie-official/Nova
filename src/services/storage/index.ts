import { createMmkvStore } from './mmkvStore';
import type { KeyValueStore } from './kvStore';

export type { KeyValueStore } from './kvStore';
export { createMemoryStore } from './kvStore';
export { createRepository } from './repository';
export type { Repository, RepositoryOptions } from './repository';

let current: KeyValueStore | undefined;

/** The app-wide store. Created lazily so importing this module never touches native code. */
export function getStorage(): KeyValueStore {
  if (!current) {
    current = createMmkvStore();
  }
  return current;
}

/** Swap the backing store (tests, or a future migration). Pass `undefined` to reset. */
export function setStorage(store: KeyValueStore | undefined): void {
  current = store;
}
