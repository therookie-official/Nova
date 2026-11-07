import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlayerScreen } from '@/screens/PlayerScreen';
import { safAccess } from '@/services/media/novaSaf';
import { useHistoryStore } from '@/store/historyStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { MediaItem } from '@/types/media';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { lastVideo } = require('../../test/videoMock');

jest.mock('@/services/media/novaSaf', () => ({
  safAccess: {
    isAvailable: jest.fn(() => true),
    persist: jest.fn(),
    hasAccess: jest.fn(() => Promise.resolve(true)),
    release: jest.fn(),
  },
}));

const Stack = createNativeStackNavigator<{ Player: { itemId: string } }>();

const remoteItem: MediaItem = {
  id: 'r1',
  addedAt: 1,
  source: { kind: 'remote', uri: 'https://example.com/a.m3u8', format: 'hls' },
  metadata: { title: 'Remote Film', genres: [], origin: 'manual' },
};
const localItem: MediaItem = {
  id: 'l1',
  addedAt: 1,
  source: { kind: 'local', uri: 'content://media/42', persisted: true },
  metadata: { title: 'Local Film', genres: [], origin: 'manual' },
};

async function open(item: MediaItem) {
  useLibraryStore.getState().replaceAll([item]);
  await render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Player" component={PlayerScreen} initialParams={{ itemId: item.id }} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
  await screen.findByTestId('screen-player');
}

const loadVideo = (seconds = 100) =>
  act(async () => {
    lastVideo.props.onLoad({ duration: seconds });
  });

beforeEach(() => {
  lastVideo.props = null;
  lastVideo.seeks.length = 0;
  useProgressStore.setState({ byItem: {} });
  useHistoryStore.getState().clear();
  useSettingsStore.getState().update({ resumeEnabled: true, defaultSpeed: 1 });
  (safAccess.hasAccess as jest.Mock).mockResolvedValue(true);
});

describe.each([
  ['remote', remoteItem, { uri: 'https://example.com/a.m3u8', type: 'm3u8' }],
  ['local', localItem, { uri: 'content://media/42' }],
])('player with a %s source', (_name, item, expectedSource) => {
  it('hands the player the right source and shows loading, then the controls', async () => {
    await open(item);
    expect(lastVideo.props.source).toEqual(expectedSource);
    expect(screen.getByTestId('buffering-indicator')).toBeTruthy();
    await loadVideo();
    expect(screen.queryByTestId('buffering-indicator')).toBeNull();
    expect(screen.getByText(item.metadata.title)).toBeTruthy();
  });

  it('toggles play/pause', async () => {
    await open(item);
    await loadVideo();
    expect(lastVideo.props.paused).toBe(false);
    await fireEvent.press(screen.getByTestId('player-play-pause'));
    expect(lastVideo.props.paused).toBe(true);
    await fireEvent.press(screen.getByTestId('player-play-pause'));
    expect(lastVideo.props.paused).toBe(false);
  });

  it('skips forward and back within bounds', async () => {
    await open(item);
    await loadVideo(100);
    await fireEvent.press(screen.getByTestId('player-skip-forward'));
    expect(lastVideo.seeks.at(-1)).toBe(10);
    await fireEvent.press(screen.getByTestId('player-skip-back'));
    expect(lastVideo.seeks.at(-1)).toBe(0);
  });

  it('cycles playback speed', async () => {
    await open(item);
    await loadVideo();
    await fireEvent.press(screen.getByTestId('player-speed'));
    expect(lastVideo.props.rate).toBe(1.25);
  });

  it('shows the buffering indicator while the player buffers', async () => {
    await open(item);
    await loadVideo();
    await act(async () => lastVideo.props.onBuffer({ isBuffering: true }));
    expect(screen.getByText('Buffering…')).toBeTruthy();
    await act(async () => lastVideo.props.onBuffer({ isBuffering: false }));
    expect(screen.queryByTestId('buffering-indicator')).toBeNull();
  });

  it('records history on first load and learns the duration', async () => {
    await open(item);
    await loadVideo(120);
    expect(useHistoryStore.getState().entries[0]).toMatchObject({
      itemId: item.id,
      durationMs: 120_000,
    });
    expect(useLibraryStore.getState().items[0].metadata.durationMs).toBe(120_000);
  });

  it('resumes from saved progress', async () => {
    useProgressStore
      .getState()
      .set({ itemId: item.id, positionMs: 40_000, durationMs: 100_000, updatedAt: 1 });
    await open(item);
    await loadVideo(100);
    expect(lastVideo.seeks).toContain(40);
  });

  it('does not resume when the setting is off', async () => {
    useSettingsStore.getState().update({ resumeEnabled: false });
    useProgressStore
      .getState()
      .set({ itemId: item.id, positionMs: 40_000, durationMs: 100_000, updatedAt: 1 });
    await open(item);
    await loadVideo(100);
    expect(lastVideo.seeks).toEqual([]);
  });

  it('saves progress as playback moves', async () => {
    await open(item);
    await loadVideo(100);
    await act(async () => lastVideo.props.onProgress({ currentTime: 30 }));
    expect(useProgressStore.getState().byItem[item.id]).toMatchObject({ positionMs: 30_000 });
  });

  it('resets progress when the video ends', async () => {
    await open(item);
    await loadVideo(100);
    await act(async () => lastVideo.props.onProgress({ currentTime: 99 }));
    await act(async () => lastVideo.props.onEnd());
    expect(useProgressStore.getState().byItem[item.id].positionMs).toBe(0);
  });

  it('shows a clear error and offers retry for a network failure', async () => {
    await open(item);
    await act(async () =>
      lastVideo.props.onError({
        error: { errorString: 'ExoPlaybackException: ERROR_CODE_IO_NETWORK_CONNECTION_FAILED' },
      }),
    );
    expect(screen.getByTestId('player-error')).toBeTruthy();
    expect(screen.getByText('No connection')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('player-retry'));
    expect(screen.queryByTestId('player-error')).toBeNull();
    expect(screen.getByTestId('video')).toBeTruthy();
  });

  it('shows a format error without a retry button', async () => {
    await open(item);
    await act(async () =>
      lastVideo.props.onError({
        error: { errorString: 'ExoPlaybackException: ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED' },
      }),
    );
    expect(screen.getByText('This video format is not supported')).toBeTruthy();
    expect(screen.queryByTestId('player-retry')).toBeNull();
  });
});

describe('player, local-only behaviour', () => {
  it('reports lost Android access instead of a vague failure', async () => {
    (safAccess.hasAccess as jest.Mock).mockResolvedValue(false);
    await open(localItem);
    expect(await screen.findByText('Nova can no longer open this file')).toBeTruthy();
    expect(screen.queryByTestId('video')).toBeNull();
  });
});

describe('player, missing item', () => {
  it('shows a not-found state', async () => {
    useLibraryStore.getState().replaceAll([]);
    await render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Player" component={PlayerScreen} initialParams={{ itemId: 'nope' }} />
        </Stack.Navigator>
      </NavigationContainer>,
    );
    expect(await screen.findByText('Video not found')).toBeTruthy();
  });
});
