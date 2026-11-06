import type { LibraryItem, PlaybackProgress, RemoteSourceRecord } from '@/types/media';

/**
 * Development sample data. Titles are invented, and the URLs use the reserved
 * `example.com` domain, so none of it points at real media and none of it plays.
 * Every record is flagged `isPlaceholder` so it can be found and cleared.
 */
const T0 = 1_760_000_000_000; // fixed timestamp keeps the data deterministic

const remote = (slug: string): LibraryItem['source'] => ({
  kind: 'remote',
  url: `https://example.com/samples/${slug}.mp4`,
  format: 'progressive',
});

export const PLACEHOLDER_LIBRARY: LibraryItem[] = [
  {
    id: 'sample-glass-harbor',
    title: 'The Glass Harbor',
    year: 2021,
    genres: ['Drama', 'Mystery'],
    description: 'A sample entry. A harbour town keeps a secret that the tide keeps returning.',
    durationMin: 112,
    source: remote('glass-harbor'),
    addedAt: T0 + 6,
    metadata: 'manual',
    isPlaceholder: true,
  },
  {
    id: 'sample-night-orchard',
    title: 'Night Orchard',
    year: 2019,
    genres: ['Thriller'],
    description: 'A sample entry. Three friends, one orchard, and a long night.',
    durationMin: 98,
    source: remote('night-orchard'),
    addedAt: T0 + 5,
    metadata: 'manual',
    isPlaceholder: true,
  },
  {
    id: 'sample-paper-kites',
    title: 'Paper Kites over Delhi',
    year: 2023,
    genres: ['Family', 'Comedy'],
    description: 'A sample entry. A school holiday, a rooftop, and one very stubborn kite.',
    durationMin: 104,
    source: remote('paper-kites'),
    addedAt: T0 + 4,
    metadata: 'manual',
    isPlaceholder: true,
  },
  {
    id: 'sample-low-orbit',
    title: 'Low Orbit',
    year: 2024,
    genres: ['Sci-Fi'],
    description: 'A sample entry. A repair crew discovers the station has been listening.',
    durationMin: 126,
    source: remote('low-orbit'),
    addedAt: T0 + 3,
    metadata: 'manual',
    isPlaceholder: true,
  },
  {
    id: 'sample-monsoon-letters',
    title: 'Monsoon Letters',
    year: 2018,
    genres: ['Romance', 'Drama'],
    description: 'A sample entry. Two pen friends finally agree on a place to meet.',
    durationMin: 118,
    source: remote('monsoon-letters'),
    addedAt: T0 + 2,
    metadata: 'manual',
    isPlaceholder: true,
  },
  {
    id: 'sample-iron-lantern',
    title: 'The Iron Lantern',
    year: 2022,
    genres: ['Adventure', 'Fantasy'],
    description: 'A sample entry. A lighthouse keeper inherits a lamp that shows other coasts.',
    durationMin: 134,
    source: remote('iron-lantern'),
    addedAt: T0 + 1,
    metadata: 'manual',
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
