import * as DocumentPicker from 'expo-document-picker';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { AppState, Dimensions } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlayerScreen } from '@/screens/PlayerScreen';
import { safAccess } from '@/services/media/novaSaf';
import { useHistoryStore } from '@/store/historyStore';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlaybackPrefsStore } from '@/store/playbackPrefsStore';
import { createProgressStore, useProgressStore } from '@/store/progressStore';
import { progressRepository } from '@/services/storage/repositories';
import { useSettingsStore } from '@/store/settingsStore';
import type { MediaItem } from '@/types/media';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { lastVideo } = require('../../test/videoMock');

jest.mock('@/services/media/novaSaf', () => ({
  safAccess: {
    isAvailable: jest.fn(() => true),
    persist: jest.fn(),
    hasAccess: jest.fn(() => Promise.resolve(true)),
    isPictureInPictureSupported: jest.fn(() => Promise.resolve(true)),
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
])('player with a %s source', (name, item, expectedSource) => {
  it('hands the player the right source and shows loading, then the controls', async () => {
    await open(item);
    expect(lastVideo.props.source).toMatchObject(expectedSource);
    // Buffer and retry tuning is for online videos only; a local file must not get it.
    if (name === 'remote') {
      expect(lastVideo.props.source.minLoadRetryCount).toBe(5);
      expect(lastVideo.props.source.bufferConfig).toBeDefined();
    } else {
      expect(lastVideo.props.source.bufferConfig).toBeUndefined();
      expect(lastVideo.props.source.minLoadRetryCount).toBeUndefined();
    }
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

  it('chooses playback speed from a list and ticks the current one', async () => {
    await open(item);
    await loadVideo();
    await fireEvent.press(screen.getByTestId('player-speed'));
    expect(screen.getByTestId('option-sheet')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sheet-option-speed-1.5'));
    expect(lastVideo.props.rate).toBe(1.5);
    expect(screen.queryByTestId('option-sheet')).toBeNull();
    await fireEvent.press(screen.getByTestId('player-speed'));
    expect(screen.getByTestId('sheet-option-speed-1.5').props.accessibilityState.selected).toBe(
      true,
    );
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

  it('shows a clear error and offers retry when the server refuses the video', async () => {
    await open(item);
    await act(async () =>
      lastVideo.props.onError({
        error: { errorString: 'ExoPlaybackException: ERROR_CODE_IO_BAD_HTTP_STATUS' },
      }),
    );
    expect(screen.getByTestId('player-error')).toBeTruthy();
    expect(screen.getByText('The server refused the video')).toBeTruthy();
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

// ---------------------------------------------------------------------------------------------
// Phase 3: tracks, subtitles, recovery, PiP, orientation. Same caveat as above: the video
// component is a stand-in, so these prove Nova's logic and wiring, not Android behaviour.
// ---------------------------------------------------------------------------------------------

// React's act() and the scheduler wait on setImmediate/microtasks, so those must stay real.
function useFakeTimersSafely() {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
}

const NETWORK_ERROR = {
  error: { errorString: 'ExoPlaybackException: ERROR_CODE_IO_NETWORK_CONNECTION_FAILED' },
};
const onLoadWithTracks = (extra = {}) =>
  act(async () => {
    lastVideo.props.onLoad({
      duration: 100,
      audioTracks: [
        { index: 0, title: 'Stereo', language: 'en', selected: true },
        { index: 1, language: 'hi' },
      ],
      textTracks: [{ index: 0, title: 'English CC', language: 'en' }],
      ...extra,
    });
  });

beforeEach(() => {
  usePlaybackPrefsStore.setState({ byItem: {} });
  (ScreenOrientation.lockAsync as jest.Mock).mockClear();
  (ScreenOrientation.unlockAsync as jest.Mock).mockClear();
  (NavigationBar.setVisibilityAsync as jest.Mock).mockClear();
  lastVideo.pipRequests = 0;
  jest.restoreAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe.each([
  ['remote', remoteItem],
  ['local', localItem],
])('tracks and subtitles with a %s source', (_name, item) => {
  it('lists audio tracks and passes the chosen one to the player', async () => {
    await open(item);
    await onLoadWithTracks();
    await fireEvent.press(screen.getByTestId('player-audio'));
    expect(screen.getByText('Stereo (English)')).toBeTruthy();
    expect(screen.getByText('Hindi')).toBeTruthy(); // no title, so the language name is used
    await fireEvent.press(screen.getByTestId('sheet-option-audio-1'));
    expect(lastVideo.props.selectedAudioTrack).toEqual({ type: 'language', value: 'hi' });
    expect(usePlaybackPrefsStore.getState().byItem[item.id].audio).toEqual({
      type: 'language',
      value: 'hi',
    });
  });

  it('hides the Audio button when there is only one audio track', async () => {
    await open(item);
    await onLoadWithTracks({ audioTracks: [{ index: 0, language: 'en', selected: true }] });
    expect(screen.queryByTestId('player-audio')).toBeNull();
  });

  it('turns subtitles off and picks an embedded subtitle track', async () => {
    await open(item);
    await onLoadWithTracks();
    await fireEvent.press(screen.getByTestId('player-subtitles'));
    await fireEvent.press(screen.getByTestId('sheet-option-text-off'));
    expect(lastVideo.props.selectedTextTrack).toEqual({ type: 'disabled', value: undefined });
    await fireEvent.press(screen.getByTestId('player-subtitles'));
    await fireEvent.press(screen.getByTestId('sheet-option-text-0'));
    expect(lastVideo.props.selectedTextTrack).toEqual({ type: 'title', value: 'English CC' });
  });

  it('adds an external subtitle file, reloads at the same moment and selects it', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'content://subs/1', name: 'My.Movie.en.srt', mimeType: 'application/octet-stream' },
      ],
    });
    await open(item);
    await onLoadWithTracks();
    await act(async () => lastVideo.props.onProgress({ currentTime: 30 }));
    await fireEvent.press(screen.getByTestId('player-subtitles'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('sheet-option-text-add'));
    });
    await screen.findByTestId('video');
    expect(lastVideo.props.source.textTracks).toEqual([
      {
        title: 'My Movie en',
        language: 'und',
        type: 'application/x-subrip',
        uri: 'content://subs/1',
      },
    ]);
    expect(lastVideo.props.selectedTextTrack).toEqual({ type: 'title', value: 'My Movie en' });
    // The player was remounted, so it loads again and must return to 30 s.
    lastVideo.seeks.length = 0;
    await onLoadWithTracks();
    expect(lastVideo.seeks).toContain(30);
  });

  it('refuses a subtitle type it cannot load, explains why, and does not reload', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'content://subs/2', name: 'movie.ass' }],
    });
    await open(item);
    await onLoadWithTracks();
    const before = lastVideo.props;
    await fireEvent.press(screen.getByTestId('player-subtitles'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('sheet-option-text-add'));
    });
    expect(await screen.findByText(/Nova can load \.srt, \.vtt and \.ttml/)).toBeTruthy();
    expect(usePlaybackPrefsStore.getState().byItem[item.id]?.subtitles ?? []).toEqual([]);
    expect(lastVideo.props.source).toBe(before.source);
  });

  it('remembers track choices and passes them to the player on the next open', async () => {
    usePlaybackPrefsStore.getState().patch(item.id, {
      audio: { type: 'language', value: 'hi' },
      text: { type: 'disabled' },
      resizeMode: 'cover',
    });
    await open(item);
    expect(lastVideo.props.selectedAudioTrack).toEqual({ type: 'language', value: 'hi' });
    expect(lastVideo.props.selectedTextTrack).toEqual({ type: 'disabled', value: undefined });
    expect(lastVideo.props.resizeMode).toBe('cover');
  });

  it('cycles picture size and remembers it', async () => {
    await open(item);
    await loadVideo();
    await fireEvent.press(screen.getByTestId('player-resize'));
    expect(lastVideo.props.resizeMode).toBe('cover');
    await fireEvent.press(screen.getByTestId('player-resize'));
    expect(lastVideo.props.resizeMode).toBe('stretch');
    expect(usePlaybackPrefsStore.getState().byItem[item.id].resizeMode).toBe('stretch');
  });
});

describe('network recovery', () => {
  it('reconnects an online video by itself, from where it stopped', async () => {
    await open(remoteItem);
    await loadVideo(100);
    await act(async () => lastVideo.props.onProgress({ currentTime: 42 }));
    useFakeTimersSafely();
    await act(async () => lastVideo.props.onError(NETWORK_ERROR));
    expect(screen.getByTestId('reconnecting')).toBeTruthy();
    expect(screen.getByText('Attempt 1 of 4')).toBeTruthy();
    expect(screen.queryByTestId('player-error')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(1_500);
    });
    lastVideo.seeks.length = 0;
    await loadVideo(100);
    expect(lastVideo.seeks).toContain(42);
    expect(screen.queryByTestId('reconnecting')).toBeNull();
  });

  it('gives up after four attempts and shows the error with Try again', async () => {
    await open(remoteItem);
    await loadVideo(100);
    useFakeTimersSafely();
    for (const wait of [1_500, 3_000, 6_000, 10_000]) {
      await act(async () => lastVideo.props.onError(NETWORK_ERROR));
      expect(screen.getByTestId('reconnecting')).toBeTruthy();
      await act(async () => {
        jest.advanceTimersByTime(wait);
      });
    }
    await act(async () => lastVideo.props.onError(NETWORK_ERROR));
    expect(screen.getByText('No connection')).toBeTruthy();
    expect(screen.getByTestId('player-retry')).toBeTruthy();
  });

  it('never reconnects a local file on its own', async () => {
    await open(localItem);
    await loadVideo(100);
    await act(async () => lastVideo.props.onError(NETWORK_ERROR));
    expect(screen.queryByTestId('reconnecting')).toBeNull();
    expect(screen.getByTestId('player-error')).toBeTruthy();
  });

  it('does not retry errors that cannot fix themselves', async () => {
    await open(remoteItem);
    await act(async () =>
      lastVideo.props.onError({
        error: { errorString: 'ExoPlaybackException: ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED' },
      }),
    );
    expect(screen.queryByTestId('reconnecting')).toBeNull();
    expect(screen.getByText('This video format is not supported')).toBeTruthy();
  });

  it('suggests checking the connection after a long stall', async () => {
    await open(remoteItem);
    useFakeTimersSafely();
    // Start a fresh stall so its timer is created under the fake clock.
    await act(async () => lastVideo.props.onBuffer({ isBuffering: false }));
    await act(async () => lastVideo.props.onBuffer({ isBuffering: true }));
    expect(screen.queryByTestId('slow-buffer-hint')).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(8_000);
    });
    expect(screen.getByTestId('slow-buffer-hint')).toBeTruthy();
    await loadVideo(100);
    expect(screen.queryByTestId('slow-buffer-hint')).toBeNull();
  });
});

describe('picture-in-picture', () => {
  it('asks the player to enter picture-in-picture', async () => {
    await open(remoteItem);
    await loadVideo();
    await fireEvent.press(screen.getByTestId('player-pip'));
    expect(lastVideo.pipRequests).toBe(1);
  });

  it('explains when it did not start, and stays quiet when it did', async () => {
    await open(remoteItem);
    await loadVideo();
    useFakeTimersSafely();
    await fireEvent.press(screen.getByTestId('player-pip'));
    await act(async () => {
      jest.advanceTimersByTime(1_500);
    });
    expect(screen.getByTestId('pip-note')).toBeTruthy();
  });

  it('hides the button on phones that report no support', async () => {
    (safAccess.isPictureInPictureSupported as jest.Mock).mockResolvedValue(false);
    await open(remoteItem);
    await loadVideo();
    await act(async () => {});
    expect(screen.queryByTestId('player-pip')).toBeNull();
    (safAccess.isPictureInPictureSupported as jest.Mock).mockResolvedValue(true);
  });

  it('turns on enter-on-leave only when the setting is on and the video is playing', async () => {
    await open(remoteItem);
    expect(lastVideo.props.enterPictureInPictureOnLeave).toBe(false);
    await loadVideo();
    expect(lastVideo.props.enterPictureInPictureOnLeave).toBe(false); // setting is off
    await act(async () => useSettingsStore.getState().update({ autoPip: true }));
    expect(lastVideo.props.enterPictureInPictureOnLeave).toBe(true);
    await fireEvent.press(screen.getByTestId('player-play-pause'));
    expect(lastVideo.props.enterPictureInPictureOnLeave).toBe(false); // paused
    await act(async () => useSettingsStore.getState().update({ autoPip: false }));
  });

  it('hides the controls while in picture-in-picture', async () => {
    await open(remoteItem);
    await loadVideo();
    await act(async () => lastVideo.props.onPictureInPictureStatusChanged({ isActive: true }));
    expect(screen.queryByTestId('player-play-pause')).toBeNull();
    await act(async () => lastVideo.props.onPictureInPictureStatusChanged({ isActive: false }));
    expect(screen.getByTestId('player-play-pause')).toBeTruthy();
  });
});

describe('orientation and full screen', () => {
  it('locks landscape from portrait, then returns to automatic rotation', async () => {
    await open(remoteItem);
    await loadVideo();
    await fireEvent.press(screen.getByTestId('player-fullscreen'));
    expect(ScreenOrientation.lockAsync).toHaveBeenLastCalledWith('LANDSCAPE');
    expect(NavigationBar.setVisibilityAsync).toHaveBeenLastCalledWith('hidden');
    expect(screen.getByLabelText('Exit full screen')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('player-fullscreen'));
    expect(ScreenOrientation.unlockAsync).toHaveBeenCalled();
  });

  it('offers to lock portrait when the phone is already sideways', async () => {
    jest
      .spyOn(Dimensions, 'get')
      .mockReturnValue({ width: 800, height: 400, scale: 1, fontScale: 1 });
    await open(remoteItem);
    await loadVideo();
    expect(screen.getByLabelText('Exit full screen')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('player-fullscreen'));
    expect(ScreenOrientation.lockAsync).toHaveBeenLastCalledWith('PORTRAIT_UP');
  });

  it('puts the system bars back when the player closes', async () => {
    const view = await open(remoteItem);
    void view;
    await loadVideo();
    await fireEvent.press(screen.getByTestId('player-fullscreen'));
    await screen.unmount();
    expect(NavigationBar.setVisibilityAsync).toHaveBeenLastCalledWith('visible');
    expect(ScreenOrientation.unlockAsync).toHaveBeenCalled();
  });

  it('double-tapping the right or left side skips 10 seconds', async () => {
    await open(remoteItem);
    await loadVideo(100);
    await act(async () => lastVideo.props.onProgress({ currentTime: 50 }));
    await fireEvent.press(screen.getByTestId('player-surface-right'));
    await fireEvent.press(screen.getByTestId('player-surface-right'));
    expect(lastVideo.seeks.at(-1)).toBe(60);
    await fireEvent.press(screen.getByTestId('player-surface-left'));
    await fireEvent.press(screen.getByTestId('player-surface-left'));
    expect(lastVideo.seeks.at(-1)).toBe(50);
  });
});

describe('remembering and restoring position', () => {
  it('saves when the app goes to the background', async () => {
    let listener: (state: string) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _t: string,
      fn: (s: string) => void,
    ) => {
      listener = fn;
      return { remove: jest.fn() };
    }) as never);
    await open(remoteItem);
    await loadVideo(100);
    await act(async () => lastVideo.props.onProgress({ currentTime: 3 })); // too early to auto-save
    expect(useProgressStore.getState().byItem[remoteItem.id]).toBeUndefined();
    await act(async () => listener('background'));
    expect(useProgressStore.getState().byItem[remoteItem.id]).toMatchObject({ positionMs: 3_000 });
  });

  it('survives an app restart: a fresh store reads the saved position and the next open resumes there', async () => {
    await open(localItem);
    await loadVideo(200);
    await act(async () => lastVideo.props.onProgress({ currentTime: 75 }));
    await screen.unmount();

    // A restart creates new stores over the same storage.
    const restarted = createProgressStore(progressRepository);
    expect(restarted.getState().byItem[localItem.id]).toMatchObject({
      positionMs: 75_000,
      durationMs: 200_000,
    });

    useProgressStore.setState({ byItem: restarted.getState().byItem });
    startFresh();
    await open(localItem);
    lastVideo.seeks.length = 0;
    await loadVideo(200);
    expect(lastVideo.seeks).toContain(75);
  });
});

function startFresh() {
  lastVideo.props = null;
}
