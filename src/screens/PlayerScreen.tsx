import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import Video from 'react-native-video';
import type {
  OnBufferData,
  OnLoadData,
  OnPictureInPictureStatusChangedData,
  OnProgressData,
  OnVideoErrorData,
  ReactVideoSource,
  SelectedTrack,
  VideoRef,
} from 'react-native-video';
import { useKeepAwake } from 'expo-keep-awake';
import * as NavigationBar from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Button, ErrorState, Screen } from '@/components/ui';
import { OptionSheet, type SheetOption } from '@/components/player/OptionSheet';
import { SeekBar } from '@/components/player/SeekBar';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import type { RootStackParamList } from '@/navigation/types';
import { updateMetadata } from '@/services/media/mediaActions';
import { safAccess } from '@/services/media/novaSaf';
import { pickSubtitleFile } from '@/services/media/subtitleImport';
import {
  describePlaybackError,
  localInaccessibleError,
  type PlaybackErrorInfo,
} from '@/services/playback/errors';
import {
  RESIZE_LABELS,
  isImmersive,
  nextOrientationLock,
  nextResizeMode,
  type OrientationLock,
} from '@/services/playback/orientation';
import { SLOW_BUFFER_HINT_MS, retryDelayMs, shouldAutoRetry } from '@/services/playback/recovery';
import {
  SKIP_MS,
  SPEEDS,
  buildVideoSource,
  getResumePosition,
  isFinished,
  shouldPersistProgress,
  skipTarget,
} from '@/services/playback/session';
import {
  choiceForTrack,
  choiceMatches,
  toTrackOptions,
  type RawTrack,
  type TrackChoice,
  type TrackOption,
} from '@/services/playback/tracks';
import { useHistoryStore } from '@/store/historyStore';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlaybackPrefsStore } from '@/store/playbackPrefsStore';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';
import { colors } from '@/theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;
type SheetName = 'speed' | 'audio' | 'text' | null;

const HIDE_CONTROLS_MS = 3500;
const DOUBLE_TAP_MS = 300;
const PIP_START_TIMEOUT_MS = 1500;
const NO_SUBTITLES = [] as never[];

const toSelected = (choice: TrackChoice | undefined): SelectedTrack | undefined =>
  choice
    ? ({ type: choice.type, value: 'value' in choice ? choice.value : undefined } as SelectedTrack)
    : undefined;

export function PlayerScreen({ route }: Props) {
  const { itemId } = route.params;
  const { goBack } = useAppNavigation();
  const item = useLibraryStore((state) => state.items.find((entry) => entry.id === itemId));
  const resumeEnabled = useSettingsStore((state) => state.resumeEnabled);
  const defaultSpeed = useSettingsStore((state) => state.defaultSpeed);
  const autoPip = useSettingsStore((state) => state.autoPip === true);
  const prefs = usePlaybackPrefsStore((state) => state.byItem[itemId]);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const windowIsLandscape = windowWidth > windowHeight;

  const videoRef = useRef<VideoRef>(null);
  const resumeAtRef = useRef<number | null>(null);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const lastSavedRef = useRef<number | undefined>(undefined);
  const recordedRef = useRef(false);
  const retriesRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ side: 'left' | 'right'; at: number } | null>(null);

  const [paused, setPaused] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [slowBuffer, setSlowBuffer] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [speed, setSpeed] = useState(defaultSpeed);
  const [lock, setLock] = useState<OrientationLock>('auto');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [error, setError] = useState<PlaybackErrorInfo | null>(null);
  const [reconnecting, setReconnecting] = useState<{ attempt: number; of: number } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [sheetNote, setSheetNote] = useState<string>();
  const [audioTracks, setAudioTracks] = useState<TrackOption[]>([]);
  const [textTracks, setTextTracks] = useState<TrackOption[]>([]);
  const [pipSupported, setPipSupported] = useState<boolean | undefined>(undefined);
  const [inPip, setInPip] = useState(false);
  const [pipNote, setPipNote] = useState<string>();

  useKeepAwake();

  const resizeMode = prefs?.resizeMode ?? 'contain';
  const subtitles = prefs?.subtitles ?? NO_SUBTITLES;
  const immersive = isImmersive(lock, windowIsLandscape);

  const source = useMemo(
    () => (item ? (buildVideoSource(item, subtitles) as unknown as ReactVideoSource) : undefined),
    [item, subtitles],
  );

  // Decide the start position once, from what was saved before this session began.
  const startRef = useRef<number | null>(null);
  if (startRef.current === null) {
    startRef.current = getResumePosition({
      progress: useProgressStore.getState().byItem[itemId],
      resumeEnabled,
    });
  }

  const saveProgress = useCallback(() => {
    if (!item || durationRef.current <= 0) return;
    const finished = isFinished(positionRef.current, durationRef.current);
    useProgressStore.getState().set({
      itemId: item.id,
      positionMs: finished ? 0 : positionRef.current,
      durationMs: durationRef.current,
      updatedAt: Date.now(),
    });
    lastSavedRef.current = positionRef.current;
  }, [item]);

  // A local file whose Android access was taken back would only fail with a vague error.
  useEffect(() => {
    if (!item || item.source.kind !== 'local' || !item.source.persisted) return;
    let cancelled = false;
    safAccess.hasAccess(item.source.uri).then((has) => {
      if (!cancelled && has === false) setError(localInaccessibleError());
    });
    return () => {
      cancelled = true;
    };
  }, [item]);

  useEffect(() => {
    let cancelled = false;
    safAccess.isPictureInPictureSupported().then((supported) => {
      if (!cancelled) setPipSupported(supported);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Orientation: automatic by default, or locked by the full-screen button.
  useEffect(() => {
    const apply =
      lock === 'landscape'
        ? ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
        : lock === 'portrait'
          ? ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
          : ScreenOrientation.unlockAsync();
    apply.catch(() => {});
  }, [lock]);

  // System bars are hidden whenever the picture fills the screen.
  useEffect(() => {
    NavigationBar.setVisibilityAsync(immersive ? 'hidden' : 'visible').catch(() => {});
  }, [immersive]);

  // Runs only when the player closes. `saveProgress` changes whenever the library item is
  // edited (for example when the duration is learned), so it is read through a ref; depending
  // on it directly would run this cleanup mid-playback and reset orientation and system bars.
  const saveProgressRef = useRef(saveProgress);
  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);
  useEffect(() => {
    return () => {
      saveProgressRef.current();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      ScreenOrientation.unlockAsync().catch(() => {});
      NavigationBar.setVisibilityAsync('visible').catch(() => {});
    };
  }, []);

  // Android may stop the app without warning once it is in the background, so save first.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') saveProgress();
    });
    return () => subscription.remove();
  }, [saveProgress]);

  // Controls hide themselves while playing so they do not cover the picture.
  useEffect(() => {
    if (!controlsVisible || paused || error || !loaded || sheet) return;
    const timer = setTimeout(() => setControlsVisible(false), HIDE_CONTROLS_MS);
    return () => clearTimeout(timer);
  }, [controlsVisible, paused, error, loaded, sheet]);

  // A long stall gets a hint instead of an endless spinner. The hint is cleared by the cleanup
  // that runs when buffering ends or an error appears.
  const stalling = buffering && !error;
  useEffect(() => {
    if (!stalling) return;
    const timer = setTimeout(() => setSlowBuffer(true), SLOW_BUFFER_HINT_MS);
    return () => {
      clearTimeout(timer);
      setSlowBuffer(false);
    };
  }, [stalling]);

  if (!item || !source) {
    return (
      <Screen testID="screen-player">
        <ErrorState
          title="Video not found"
          message="This video is no longer in your library."
          onRetry={goBack}
          retryLabel="Go back"
        />
      </Screen>
    );
  }

  const reloadAt = (positionToResume: number) => {
    resumeAtRef.current = positionToResume;
    setError(null);
    setLoaded(false);
    setBuffering(true);
    setAttempt((n) => n + 1);
  };

  const handleLoad = (data: OnLoadData) => {
    const duration = Math.round(data.duration * 1000);
    durationRef.current = duration;
    setDurationMs(duration);
    setLoaded(true);
    setBuffering(false);
    setError(null);
    setReconnecting(null);
    retriesRef.current = 0;
    setAudioTracks(toTrackOptions(data.audioTracks as RawTrack[] | undefined));
    setTextTracks(toTrackOptions(data.textTracks as RawTrack[] | undefined));
    if (item.metadata.durationMs !== duration && duration > 0) {
      updateMetadata(item.id, { durationMs: duration });
    }
    const start = resumeAtRef.current ?? startRef.current ?? 0;
    resumeAtRef.current = null;
    if (start > 0) {
      videoRef.current?.seek(start / 1000);
      positionRef.current = start;
      setPositionMs(start);
    }
    if (!recordedRef.current) {
      recordedRef.current = true;
      useHistoryStore.getState().record({
        itemId: item.id,
        watchedAt: Date.now(),
        positionMs: start,
        durationMs: duration,
      });
    }
  };

  const handleProgress = (data: OnProgressData) => {
    const position = Math.round(data.currentTime * 1000);
    positionRef.current = position;
    setPositionMs(position);
    if (retriesRef.current > 0 && position > 0) {
      // Playing again after a reconnect: a later failure starts a fresh round of retries.
      retriesRef.current = 0;
      setReconnecting(null);
    }
    if (shouldPersistProgress(lastSavedRef.current, position)) saveProgress();
  };

  const handleBuffer = (data: OnBufferData) => setBuffering(data.isBuffering);

  const handleError = (data: OnVideoErrorData) => {
    setBuffering(false);
    const info = describePlaybackError(data, { sourceKind: item.source.kind });
    const delay = retryDelayMs(retriesRef.current);
    if (delay !== undefined && shouldAutoRetry(info, item.source.kind, retriesRef.current)) {
      // Lost connection to an online video: try again on our own, from where it stopped.
      retriesRef.current += 1;
      setReconnecting({ attempt: retriesRef.current, of: 4 });
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => reloadAt(positionRef.current), delay);
      return;
    }
    setReconnecting(null);
    setError(info);
  };

  const handleEnd = () => {
    positionRef.current = 0;
    setPaused(true);
    setControlsVisible(true);
    useProgressStore.getState().set({
      itemId: item.id,
      positionMs: 0,
      durationMs: durationRef.current,
      updatedAt: Date.now(),
    });
    lastSavedRef.current = 0;
  };

  const handlePipChange = (data: OnPictureInPictureStatusChangedData) => {
    setInPip(data.isActive);
    if (data.isActive) setPipNote(undefined);
  };

  const seekTo = (ms: number) => {
    positionRef.current = ms;
    setPositionMs(ms);
    videoRef.current?.seek(ms / 1000);
    setControlsVisible(true);
  };

  const retry = () => {
    retriesRef.current = 0;
    reloadAt(positionRef.current);
  };

  const openSheet = (name: SheetName) => {
    setSheetNote(undefined);
    setSheet(name);
    setControlsVisible(true);
  };

  const startPip = () => {
    setPipNote(undefined);
    videoRef.current?.enterPictureInPicture();
    // The player gives no failure callback, so silence after a moment means it did not start.
    setTimeout(() => {
      setInPip((active) => {
        if (!active) {
          setPipNote(
            'Picture-in-picture did not start. This phone or Android version may not support it, or it may be turned off for Nova in Android settings.',
          );
        }
        return active;
      });
    }, PIP_START_TIMEOUT_MS);
  };

  const surfaceTap = (side: 'left' | 'right') => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.side === side && now - last.at < DOUBLE_TAP_MS) {
      lastTapRef.current = null;
      seekTo(
        skipTarget(positionRef.current, side === 'left' ? -SKIP_MS : SKIP_MS, durationRef.current),
      );
      return;
    }
    lastTapRef.current = { side, at: now };
    setControlsVisible((visible) => !visible);
  };

  const chooseAudio = (track: TrackOption) => {
    usePlaybackPrefsStore.getState().patch(item.id, { audio: choiceForTrack(track) });
    setSheet(null);
  };

  const chooseText = (choice: TrackChoice | undefined) => {
    usePlaybackPrefsStore.getState().patch(item.id, { text: choice });
    setSheet(null);
  };

  const addSubtitleFile = async () => {
    const result = await pickSubtitleFile();
    if (result.status === 'unsupported' || result.status === 'error') {
      setSheetNote(result.message);
      return;
    }
    if (result.status !== 'picked') return;
    const store = usePlaybackPrefsStore.getState();
    store.addSubtitle(item.id, result.subtitle);
    store.patch(item.id, { text: { type: 'title', value: result.subtitle.title } });
    setSheet(null);
    // Adding a file changes the source, so the player reloads; come back to the same moment.
    reloadAt(positionRef.current);
  };

  const showControls = (controlsVisible || !!error) && !inPip;
  const sideInset = {
    paddingLeft: Math.max(insets.left, 16),
    paddingRight: Math.max(insets.right, 16),
  };

  const speedOptions: SheetOption[] = SPEEDS.map((value) => ({
    key: `speed-${value}`,
    label: value === 1 ? 'Normal (1×)' : `${value}×`,
    selected: speed === value,
    onPress: () => {
      setSpeed(value);
      setSheet(null);
    },
  }));

  const audioOptions: SheetOption[] = audioTracks.map((track, position) => ({
    key: `audio-${position}`,
    label: track.label,
    selected: choiceMatches(prefs?.audio, track),
    onPress: () => chooseAudio(track),
  }));

  const textChoice = prefs?.text;
  const textOptions: SheetOption[] = [
    {
      key: 'text-off',
      label: 'Off',
      selected:
        textChoice?.type === 'disabled' || (!textChoice && !textTracks.some((t) => t.selected)),
      onPress: () => chooseText({ type: 'disabled' }),
    },
    ...textTracks.map((track, position) => ({
      key: `text-${position}`,
      label: track.label,
      selected: textChoice?.type !== 'disabled' && choiceMatches(textChoice, track),
      onPress: () => chooseText(choiceForTrack(track)),
    })),
    {
      key: 'text-add',
      label: 'Add subtitle file…',
      icon: 'add-circle-outline',
      onPress: addSubtitleFile,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }} testID="screen-player">
      <StatusBar hidden={immersive} />
      {!error ? (
        <Video
          key={attempt}
          ref={videoRef}
          testID="video"
          source={source}
          style={{ flex: 1 }}
          resizeMode={resizeMode}
          paused={paused}
          rate={speed}
          controls={false}
          selectedAudioTrack={toSelected(prefs?.audio)}
          selectedTextTrack={toSelected(prefs?.text)}
          enterPictureInPictureOnLeave={autoPip && !paused && loaded && !error}
          onPictureInPictureStatusChanged={handlePipChange}
          onLoad={handleLoad}
          onProgress={handleProgress}
          onBuffer={handleBuffer}
          onError={handleError}
          onEnd={handleEnd}
          progressUpdateInterval={500}
        />
      ) : (
        <View className="flex-1" />
      )}

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' }}
      >
        <Pressable
          accessibilityLabel="Tap to show controls. Double tap to go back 10 seconds"
          testID="player-surface-left"
          onPress={() => surfaceTap('left')}
          style={{ flex: 1 }}
        />
        <Pressable
          accessibilityLabel="Tap to show controls. Double tap to go forward 10 seconds"
          testID="player-surface-right"
          onPress={() => surfaceTap('right')}
          style={{ flex: 1 }}
        />
      </View>

      {buffering && !error && !reconnecting ? (
        <View
          pointerEvents="none"
          testID="buffering-indicator"
          accessibilityLabel="Loading video"
          className="absolute inset-0 items-center justify-center"
        >
          <ActivityIndicator size="large" color={colors.accent} />
          <Text className="mt-3 text-base text-text">{loaded ? 'Buffering…' : 'Loading…'}</Text>
          {slowBuffer ? (
            <Text
              testID="slow-buffer-hint"
              className="mt-2 px-8 text-center text-base text-warning"
            >
              This is taking a while. Check your connection.
            </Text>
          ) : null}
        </View>
      ) : null}

      {reconnecting && !error ? (
        <View
          pointerEvents="none"
          testID="reconnecting"
          className="absolute inset-0 items-center justify-center bg-black/60"
        >
          <ActivityIndicator size="large" color={colors.accent} />
          <Text className="mt-3 text-lg font-semibold text-text">
            Connection lost. Reconnecting…
          </Text>
          <Text className="mt-1 text-base text-textMuted">
            Attempt {reconnecting.attempt} of {reconnecting.of}
          </Text>
        </View>
      ) : null}

      {error ? (
        <View
          testID="player-error"
          className="absolute inset-0 items-center justify-center bg-background p-6"
        >
          <Ionicons name="alert-circle-outline" size={64} color={colors.danger} />
          <Text className="mt-3 text-center text-xl font-bold text-text">{error.title}</Text>
          <Text className="mt-2 text-center text-base text-textMuted">{error.message}</Text>
          {error.technical ? (
            <Text className="mt-3 text-center text-sm text-textMuted">{error.technical}</Text>
          ) : null}
          <View className="mt-6 gap-3 self-stretch">
            {error.retryable ? (
              <Button label="Try again" icon="refresh" onPress={retry} testID="player-retry" />
            ) : null}
            <Button label="Back" icon="arrow-back" variant="secondary" onPress={goBack} />
          </View>
        </View>
      ) : null}

      {showControls && !error ? (
        <>
          <View
            className="absolute left-0 right-0 top-0 flex-row items-center gap-3 bg-black/60 pb-3"
            style={{ paddingTop: Math.max(insets.top, 12), ...sideInset }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              testID="player-back"
              onPress={goBack}
              className="h-12 w-12 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={28} color={colors.text} />
            </Pressable>
            <Text numberOfLines={1} className="flex-1 text-lg font-semibold text-text">
              {item.metadata.title}
            </Text>
            {pipSupported !== false ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Picture in picture"
                testID="player-pip"
                onPress={startPip}
                className="h-12 w-12 items-center justify-center"
              >
                <Ionicons name="browsers-outline" size={26} color={colors.text} />
              </Pressable>
            ) : null}
          </View>

          <View
            className="absolute bottom-0 left-0 right-0 gap-1 bg-black/60 pt-2"
            style={{ paddingBottom: Math.max(insets.bottom, 12), ...sideInset }}
          >
            {pipNote ? (
              <Text testID="pip-note" className="text-base text-warning">
                {pipNote}
              </Text>
            ) : null}
            <SeekBar positionMs={positionMs} durationMs={durationMs} onSeek={seekTo} />
            <View className="flex-row items-center justify-center gap-6">
              <RoundButton
                label="Back 10 seconds"
                icon="play-back"
                testID="player-skip-back"
                onPress={() =>
                  seekTo(skipTarget(positionRef.current, -SKIP_MS, durationRef.current))
                }
              />
              <RoundButton
                label={paused ? 'Play' : 'Pause'}
                icon={paused ? 'play' : 'pause'}
                size={40}
                testID="player-play-pause"
                onPress={() => {
                  setPaused((value) => !value);
                  setControlsVisible(true);
                }}
              />
              <RoundButton
                label="Forward 10 seconds"
                icon="play-forward"
                testID="player-skip-forward"
                onPress={() =>
                  seekTo(skipTarget(positionRef.current, SKIP_MS, durationRef.current))
                }
              />
            </View>
            <View className="flex-row flex-wrap items-center justify-between">
              <ToolButton
                label="Subtitles"
                icon="chatbox-ellipses-outline"
                testID="player-subtitles"
                onPress={() => openSheet('text')}
              />
              {audioTracks.length > 1 ? (
                <ToolButton
                  label="Audio"
                  icon="musical-notes-outline"
                  testID="player-audio"
                  onPress={() => openSheet('audio')}
                />
              ) : null}
              <ToolButton
                label={`${speed}×`}
                icon="speedometer-outline"
                accessibilityLabel={`Playback speed ${speed} times`}
                testID="player-speed"
                onPress={() => openSheet('speed')}
              />
              <ToolButton
                label={RESIZE_LABELS[resizeMode].split(' ')[0]}
                icon="resize-outline"
                accessibilityLabel={`Picture size: ${RESIZE_LABELS[resizeMode]}`}
                testID="player-resize"
                onPress={() =>
                  usePlaybackPrefsStore
                    .getState()
                    .patch(item.id, { resizeMode: nextResizeMode(resizeMode) })
                }
              />
              <ToolButton
                label={immersive ? 'Exit full screen' : 'Full screen'}
                icon={immersive ? 'contract' : 'expand'}
                testID="player-fullscreen"
                onPress={() => setLock(nextOrientationLock(lock, windowIsLandscape))}
              />
            </View>
          </View>
        </>
      ) : null}

      {sheet === 'speed' ? (
        <OptionSheet title="Playback speed" options={speedOptions} onClose={() => setSheet(null)} />
      ) : null}
      {sheet === 'audio' ? (
        <OptionSheet
          title="Audio"
          options={audioOptions}
          emptyMessage="This video has only one audio track."
          message="If a track will not play, this phone may not support its format. Choose another one."
          onClose={() => setSheet(null)}
        />
      ) : null}
      {sheet === 'text' ? (
        <OptionSheet
          title="Subtitles"
          options={textOptions}
          message={sheetNote}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </View>
  );
}

function RoundButton(props: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID: string;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      testID={props.testID}
      onPress={props.onPress}
      className="h-14 w-14 items-center justify-center rounded-full active:opacity-70"
    >
      <Ionicons name={props.icon} size={props.size ?? 30} color={colors.text} />
    </Pressable>
  );
}

function ToolButton(props: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID: string;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      testID={props.testID}
      onPress={props.onPress}
      className="min-h-[52px] items-center justify-center px-2 active:opacity-70"
    >
      <Ionicons name={props.icon} size={24} color={colors.text} />
      <Text className="mt-0.5 text-sm text-text">{props.label}</Text>
    </Pressable>
  );
}
