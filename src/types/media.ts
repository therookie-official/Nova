export type MediaFormat = 'progressive' | 'hls' | 'dash';

/** A video the user picked on their device. `uri` is a content:// URI, never assume a file path. */
export interface LocalSource {
  kind: 'local';
  uri: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  /** True when Android access to `uri` was persisted so it should survive restarts. */
  persisted: boolean;
}

/** A video at a link the user added and is allowed to play. */
export interface RemoteSource {
  kind: 'remote';
  uri: string;
  format: MediaFormat;
}

/** Where the bytes come from. Playback only needs this, never the display metadata. */
export type MediaSource = LocalSource | RemoteSource;

/** What the user sees and can edit. Independent of where the video lives. */
export interface MediaMetadata {
  title: string;
  description?: string;
  year?: number;
  genres: string[];
  posterUri?: string;
  /** Learned from the player on first load; unknown until then. */
  durationMs?: number;
  origin: 'manual' | 'tmdb';
}

/** One entry in the library: a source plus its metadata. Same shape for local and remote. */
export interface MediaItem {
  id: string;
  source: MediaSource;
  metadata: MediaMetadata;
  addedAt: number;
  /** True for development sample data; never shown as real content. */
  isPlaceholder?: boolean;
}

/** Last playback position for one item. */
export interface PlaybackProgress {
  itemId: string;
  positionMs: number;
  durationMs: number;
  updatedAt: number;
}

/** One line of watch history: the most recent time an item was played. */
export interface HistoryEntry {
  itemId: string;
  watchedAt: number;
  positionMs: number;
  durationMs: number;
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
