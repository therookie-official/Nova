import type { KeyValueStore } from './kvStore';

interface Envelope<T> {
  v: number;
  data: T;
}

export interface RepositoryOptions<T> {
  /** Storage key, e.g. `nova.library`. */
  key: string;
  /** Current schema version. Bump it when the stored shape changes. */
  version: number;
  defaults: () => T;
  /** Shape check. Data failing it is treated as corrupt. */
  validate: (data: unknown) => data is T;
  /** Upgrade data written by an older version. Return `undefined` to give up and use defaults. */
  migrate?: (data: unknown, fromVersion: number) => unknown;
  /** Which store to use. Resolved on every call so tests can swap it. */
  storage: () => KeyValueStore;
}

export interface Repository<T> {
  load(): T;
  save(value: T): void;
  reset(): void;
}

/**
 * A typed, versioned slot in the key-value store.
 *
 * Reads never throw: unreadable, corrupt, invalid or too-new data is copied to
 * `<key>.corrupt` (so nothing is silently lost) and defaults are returned.
 */
export function createRepository<T>(options: RepositoryOptions<T>): Repository<T> {
  const { key, version, defaults, validate, migrate, storage } = options;

  const quarantine = (raw: string) => {
    try {
      storage().set(`${key}.corrupt`, raw);
    } catch {
      // Best effort only; defaults are returned regardless.
    }
  };

  return {
    load() {
      const raw = storage().getString(key);
      if (raw === undefined) return defaults();

      let envelope: Envelope<unknown>;
      try {
        envelope = JSON.parse(raw) as Envelope<unknown>;
      } catch {
        quarantine(raw);
        return defaults();
      }

      if (
        typeof envelope !== 'object' ||
        envelope === null ||
        typeof envelope.v !== 'number' ||
        !('data' in envelope)
      ) {
        quarantine(raw);
        return defaults();
      }

      let data: unknown = envelope.data;
      if (envelope.v > version) {
        // Written by a newer app version (downgrade). Do not guess its shape.
        quarantine(raw);
        return defaults();
      }
      if (envelope.v < version) {
        data = migrate ? migrate(data, envelope.v) : undefined;
      }

      if (data === undefined || !validate(data)) {
        quarantine(raw);
        return defaults();
      }
      return data;
    },

    save(value) {
      const envelope: Envelope<T> = { v: version, data: value };
      storage().set(key, JSON.stringify(envelope));
    },

    reset() {
      storage().remove(key);
    },
  };
}
