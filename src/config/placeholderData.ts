import type { HistoryEntry, MediaItem, PlaybackProgress, RemoteSourceRecord } from '@/types/media';

/**
 * Development sample data. Titles are invented, and the URLs use the reserved
 * `example.com` domain, so none of it points at real media and none of it plays.
 * Every record is flagged `isPlaceholder` so it can be found and cleared.
 */
const T0 = 1_760_000_000_000; // fixed timestamp keeps the data deterministic

const remote = (slug: string): MediaItem['source'] => ({
  kind: 'remote',
  uri: `https://example.com/samples/${slug}.mp4`,
  format: 'progressive',
});

export const PLACEHOLDER_LIBRARY: MediaItem[] = [
  {
    id: 'sample-glass-harbor',
    source: remote('glass-harbor'),
    metadata: {
      title: 'The Glass Harbor',
      year: 2021,
      genres: ['Drama', 'Mystery'],
      description: 'A sample entry. A harbour town keeps a secret that the tide keeps returning.',
      durationMs: 112 * 60_000,
      origin: 'manual',
    },
    addedAt: T0 + 6,
    isPlaceholder: true,
  },
  {
    id: 'sample-night-orchard',
    source: remote('night-orchard'),
    metadata: {
      title: 'Night Orchard',
      year: 2019,
      genres: ['Thriller'],
      description: 'A sample entry. Three friends, one orchard, and a long night.',
      durationMs: 98 * 60_000,
      origin: 'manual',
    },
    addedAt: T0 + 5,
    isPlaceholder: true,
  },
  {
    id: 'sample-paper-kites',
    source: remote('paper-kites'),
    metadata: {
      title: 'Paper Kites over Delhi',
      year: 2023,
      genres: ['Family', 'Comedy'],
      description: 'A sample entry. A school holiday, a rooftop, and one very stubborn kite.',
      durationMs: 104 * 60_000,
      origin: 'manual',
    },
    addedAt: T0 + 4,
    isPlaceholder: true,
  },
  {
    id: 'sample-low-orbit',
    source: remote('low-orbit'),
    metadata: {
      title: 'Low Orbit',
      year: 2024,
      genres: ['Sci-Fi'],
      description: 'A sample entry. A repair crew discovers the station has been listening.',
      durationMs: 126 * 60_000,
      origin: 'manual',
    },
    addedAt: T0 + 3,
    isPlaceholder: true,
  },
  {
    id: 'sample-monsoon-letters',
    source: remote('monsoon-letters'),
    metadata: {
      title: 'Monsoon Letters',
      year: 2018,
      genres: ['Romance', 'Drama'],
      description: 'A sample entry. Two pen friends finally agree on a place to meet.',
      durationMs: 118 * 60_000,
      origin: 'manual',
    },
    addedAt: T0 + 2,
    isPlaceholder: true,
  },
  {
    id: 'sample-iron-lantern',
    source: remote('iron-lantern'),
    metadata: {
      title: 'The Iron Lantern',
      year: 2022,
      genres: ['Adventure', 'Fantasy'],
      description: 'A sample entry. A lighthouse keeper inherits a lamp that shows other coasts.',
      durationMs: 134 * 60_000,
      origin: 'manual',
    },
    addedAt: T0 + 1,
    isPlaceholder: true,
  },
];

export const PLACEHOLDER_PROGRESS: PlaybackProgress[] = [
  { itemId: 'sample-low-orbit', positionMs: 2_700_000, durationMs: 7_560_000, updatedAt: T0 + 20 },
  { itemId: 'sample-glass-harbor', positionMs: 900_000, durationMs: 6_720_000, updatedAt: T0 + 10 },
];

export const PLACEHOLDER_REMOTE_SOURCES: RemoteSourceRecord[] = [
  {
    id: 'sample-source-mp4',
    label: 'Sample MP4 (does not play)',
    url: 'https://example.com/samples/demo.mp4',
    addedAt: T0,
    isPlaceholder: true,
  },
  {
    id: 'sample-source-hls',
    label: 'Sample HLS (does not play)',
    url: 'https://example.com/samples/demo/master.m3u8',
    addedAt: T0,
    isPlaceholder: true,
  },
];

export const PLACEHOLDER_WATCHLIST_IDS = ['sample-night-orchard', 'sample-iron-lantern'];

export const PLACEHOLDER_HISTORY: HistoryEntry[] = [
  { itemId: 'sample-low-orbit', watchedAt: T0 + 20, positionMs: 2_700_000, durationMs: 7_560_000 },
  { itemId: 'sample-glass-harbor', watchedAt: T0 + 10, positionMs: 900_000, durationMs: 6_720_000 },
];
