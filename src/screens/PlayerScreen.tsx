import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import Video from 'react-native-video';
import type {
  OnBufferData,
  OnLoadData,
  OnProgressData,
  OnVideoErrorData,
  VideoRef,
} from 'react-native-video';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Button, ErrorState, Screen } from '@/components/ui';
import { SeekBar } from '@/components/player/SeekBar';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import type { RootStackParamList } from '@/navigation/types';
import { updateMetadata } from '@/services/media/mediaActions';
import { safAccess } from '@/services/media/novaSaf';
import {
  describePlaybackError,
  localInaccessibleError,
  type PlaybackErrorInfo,
} from '@/services/playback/errors';
import {
  SKIP_MS,
  SPEEDS,
  buildPlayerSource,
  getResumePosition,
  isFinished,
  shouldPersistProgress,
  skipTarget,
} from '@/services/playback/session';
import { useHistoryStore } from '@/store/historyStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';
import { colors } from '@/theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

const HIDE_CONTROLS_MS = 3500;

export function PlayerScreen({ route }: Props) {
  const { itemId } = route.params;
  const { goBack } = useAppNavigation();
  const item = useLibraryStore((state) => state.items.find((entry) => entry.id === itemId));
  const resumeEnabled = useSettingsStore((state) => state.resumeEnabled);
  const defaultSpeed = useSettingsStore((state) => state.defaultSpeed);

  const videoRef = useRef<VideoRef>(null);
  const resumeAtRef = useRef<number | null>(null);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const lastSavedRef = useRef<number | undefined>(undefined);
  const recordedRef = useRef(false);

  const [paused, setPaused] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [speed, setSpeed] = useState(defaultSpeed);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [error, setError] = useState<PlaybackErrorInfo | null>(null);
  const [attempt, setAttempt] = useState(0);

  useKeepAwake();

  const source = useMemo(() => (item ? buildPlayerSource(item) : undefined), [item]);

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
    if (!fullscreen) return;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, [fullscreen]);

  useEffect(() => {
    return () => {
      saveProgress();
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, [saveProgress]);

  // Controls hide themselves while playing so they do not cover the picture.
  useEffect(() => {
    if (!controlsVisible || paused || error || !loaded) return;
    const timer = setTimeout(() => setControlsVisible(false), HIDE_CONTROLS_MS);
    return () => clearTimeout(timer);
  }, [controlsVisible, paused, error, loaded]);

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

  const handleLoad = (data: OnLoadData) => {
    const duration = Math.round(data.duration * 1000);
    durationRef.current = duration;
    setDurationMs(duration);
    setLoaded(true);
    setBuffering(false);
    setError(null);
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
    if (shouldPersistProgress(lastSavedRef.current, position)) saveProgress();
  };

  const handleBuffer = (data: OnBufferData) => setBuffering(data.isBuffering);

  const handleError = (data: OnVideoErrorData) => {
    setBuffering(false);
    setError(describePlaybackError(data, { sourceKind: item.source.kind }));
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

  const seekTo = (ms: number) => {
    positionRef.current = ms;
    setPositionMs(ms);
    videoRef.current?.seek(ms / 1000);
    setControlsVisible(true);
  };

  const retry = () => {
    // Come back to where playback stopped rather than the start.
    resumeAtRef.current = positionRef.current;
    setError(null);
    setLoaded(false);
    setBuffering(true);
    setAttempt((n) => n + 1);
  };

  const cycleSpeed = () => {
    const index = SPEEDS.indexOf(speed);
    setSpeed(SPEEDS[(index + 1) % SPEEDS.length] ?? 1);
    setControlsVisible(true);
  };

  const showControls = controlsVisible || !!error;

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }} testID="screen-player">
      <StatusBar hidden={fullscreen} />
      {!error ? (
        <Video
          key={attempt}
          ref={videoRef}
          testID="video"
          source={source}
          style={{ flex: 1 }}
          resizeMode="contain"
          paused={paused}
          rate={speed}
          controls={false}
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

      <Pressable
        accessibilityLabel={showControls ? 'Hide controls' : 'Show controls'}
        testID="player-surface"
        onPress={() => setControlsVisible((visible) => !visible)}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {buffering && !error ? (
        <View
          pointerEvents="none"
          testID="buffering-indicator"
          accessibilityLabel="Loading video"
          className="absolute inset-0 items-center justify-center"
        >
          <ActivityIndicator size="large" color={colors.accent} />
          <Text className="mt-3 text-base text-text">{loaded ? 'Buffering…' : 'Loading…'}</Text>
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
          <View className="absolute left-0 right-0 top-0 flex-row items-center gap-3 bg-black/60 p-3">
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
          </View>

          <View className="absolute bottom-0 left-0 right-0 gap-2 bg-black/60 px-4 pb-4 pt-2">
            <SeekBar positionMs={positionMs} durationMs={durationMs} onSeek={seekTo} />
            <View className="flex-row items-center justify-between">
              <ControlButton
                label="Back 10 seconds"
                icon="play-back"
                testID="player-skip-back"
                onPress={() =>
                  seekTo(skipTarget(positionRef.current, -SKIP_MS, durationRef.current))
                }
              />
              <ControlButton
                label={paused ? 'Play' : 'Pause'}
                icon={paused ? 'play' : 'pause'}
                size={36}
                testID="player-play-pause"
                onPress={() => {
                  setPaused((value) => !value);
                  setControlsVisible(true);
                }}
              />
              <ControlButton
                label="Forward 10 seconds"
                icon="play-forward"
                testID="player-skip-forward"
                onPress={() =>
                  seekTo(skipTarget(positionRef.current, SKIP_MS, durationRef.current))
                }
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Playback speed ${speed} times`}
                testID="player-speed"
                onPress={cycleSpeed}
                className="h-12 min-w-[64px] items-center justify-center rounded-button bg-surfaceAlt px-3"
              >
                <Text className="text-base font-semibold text-text">{speed}×</Text>
              </Pressable>
              <ControlButton
                label={fullscreen ? 'Exit full screen' : 'Full screen'}
                icon={fullscreen ? 'contract' : 'expand'}
                testID="player-fullscreen"
                onPress={() => setFullscreen((value) => !value)}
              />
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

function ControlButton(props: {
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
      className="h-12 w-12 items-center justify-center rounded-full active:opacity-70"
    >
      <Ionicons name={props.icon} size={props.size ?? 28} color={colors.text} />
    </Pressable>
  );
}
