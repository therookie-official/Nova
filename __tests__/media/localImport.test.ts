import * as DocumentPicker from 'expo-document-picker';
import { pickLocalVideos } from '@/services/media/localImport';
import {
  addRemoteItem,
  parseGenres,
  parseYear,
  removeItem,
  updateMetadata,
} from '@/services/media/mediaActions';
import { safAccess } from '@/services/media/novaSaf';
import { useLibraryStore } from '@/store/libraryStore';
import { useProgressStore } from '@/store/progressStore';
import { useWatchlistStore } from '@/store/watchlistStore';

jest.mock('@/services/media/novaSaf', () => ({
  safAccess: {
    isAvailable: jest.fn(() => true),
    persist: jest.fn(),
    hasAccess: jest.fn(),
    release: jest.fn(() => Promise.resolve()),
  },
}));

const picker = DocumentPicker.getDocumentAsync as jest.Mock;
const persist = safAccess.persist as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useLibraryStore.getState().replaceAll([]);
});

describe('pickLocalVideos', () => {
  it('asks the picker for videos without copying them', async () => {
    picker.mockResolvedValue({ canceled: true, assets: null });
    await pickLocalVideos();
    expect(picker).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'video/*', copyToCacheDirectory: false }),
    );
  });
  it('reports cancel and picker failure', async () => {
    picker.mockResolvedValue({ canceled: true, assets: null });
    expect((await pickLocalVideos()).status).toBe('cancelled');
    picker.mockRejectedValue(new Error('boom'));
    expect((await pickLocalVideos()).status).toBe('error');
  });
  it('builds local items that store only the content URI and facts', async () => {
    persist.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    picker.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'content://media/1', name: 'My_Film.2020.mp4', mimeType: 'video/mp4', size: 123 },
        { uri: 'content://media/2', name: 'Other.mkv' },
      ],
    });
    const r = await pickLocalVideos();
    if (r.status !== 'picked') throw new Error('expected picked');
    expect(r.items).toHaveLength(2);
    expect(r.notPersisted).toBe(1);
    expect(r.items[0].source).toEqual({
      kind: 'local',
      uri: 'content://media/1',
      fileName: 'My_Film.2020.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 123,
      persisted: true,
    });
    expect(r.items[0].metadata.title).toBe('My Film 2020');
    expect(r.items[1].source).toMatchObject({ persisted: false });
  });
  it('skips videos already in the library and duplicates within one pick', async () => {
    persist.mockResolvedValue(true);
    picker.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'content://media/1', name: 'a.mp4' },
        { uri: 'content://media/1', name: 'a.mp4' },
        { uri: 'content://media/9', name: 'known.mp4' },
      ],
    });
    const r = await pickLocalVideos(['content://media/9']);
    if (r.status !== 'picked') throw new Error('expected picked');
    expect(r.items).toHaveLength(1);
    expect(r.skipped).toBe(2);
  });
});

describe('media actions', () => {
  it('adds a remote item with a fallback title', () => {
    const item = addRemoteItem({ url: 'https://e.com/a.m3u8', format: 'hls', title: '  ' });
    expect(item.source).toEqual({ kind: 'remote', uri: 'https://e.com/a.m3u8', format: 'hls' });
    expect(item.metadata.title).toBe('Untitled video');
    expect(useLibraryStore.getState().items).toHaveLength(1);
  });
  it('editing metadata never changes the source', () => {
    const item = addRemoteItem({ url: 'https://e.com/a.mp4', format: 'progressive', title: 'A' });
    updateMetadata(item.id, { title: 'B', genres: ['Drama'], year: 2001 });
    const saved = useLibraryStore.getState().items[0];
    expect(saved.metadata).toMatchObject({ title: 'B', genres: ['Drama'], year: 2001 });
    expect(saved.source).toEqual(item.source);
  });
  it('removing clears progress and watchlist and releases persisted local access', async () => {
    const local = {
      id: 'l1',
      addedAt: 1,
      source: { kind: 'local' as const, uri: 'content://m/1', persisted: true },
      metadata: { title: 'L', genres: [], origin: 'manual' as const },
    };
    useLibraryStore.getState().add(local);
    useProgressStore.getState().set({ itemId: 'l1', positionMs: 1, durationMs: 2, updatedAt: 1 });
    useWatchlistStore.getState().toggle('l1');
    await removeItem('l1');
    expect(useLibraryStore.getState().items).toEqual([]);
    expect(useProgressStore.getState().byItem.l1).toBeUndefined();
    expect(useWatchlistStore.getState().ids).not.toContain('l1');
    expect(safAccess.release).toHaveBeenCalledWith('content://m/1');
  });
  it('parses genres and years', () => {
    expect(parseGenres('Drama, Sci-Fi ,drama,,')).toEqual(['Drama', 'Sci-Fi']);
    expect(parseYear(' 2021 ')).toBe(2021);
    expect(parseYear('abc')).toBeUndefined();
    expect(parseYear('1500')).toBeUndefined();
    expect(parseYear('')).toBeUndefined();
  });
});
