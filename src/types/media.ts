export type MediaFormat = 'progressive' | 'hls' | 'dash';

/** Where a video comes from. `uri` is an opaque string: never assume a filesystem path. */
export type MediaSource =
  | { kind: 'local'; uri: string; persisted: boolean }
  | { kind: 'remote'; url: string; format: MediaFormat };

export interface LibraryItem {
  id: string;
  title: string;
  year?: number;
  genres: string[];
  description?: string;
  durationMin?: number;
  posterUri?: string;
  source: MediaSource;
  addedAt: number;
  metadata: 'manual' | 'tmdb';
  /** True for development sample data; never shown as real content. */
  isPlaceholder?: boolean;
}

export interface PlaybackProgress {
  itemId: string;
  positionMs: number;
  durationMs: number;
  updatedAt: number;
}

export interface RemoteSourceRecord {
  id: string;
  label: string;
  url: string;
  addedAt: number;
  isPlaceholder?: boolean;
}

export interface Settings {
  resumeEnabled: boolean;
  defaultSpeed: number;
  /** Set once sample data has been offered, so it is not re-added after being cleared. */
  placeholdersSeeded: boolean;
}
