import { useState } from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/theme/tokens';
import { positionFromTouch } from '@/services/playback/session';
import { formatClock } from '@/utils/library';

interface SeekBarProps {
  positionMs: number;
  durationMs: number;
  /** Called once when the finger lifts (or on a tap), with the chosen position. */
  onSeek: (positionMs: number) => void;
}

/** Touch seek bar. While dragging it shows the chosen time; the video seeks on release. */
export function SeekBar({ positionMs, durationMs, onSeek }: SeekBarProps) {
  const [width, setWidth] = useState(0);
  const [dragMs, setDragMs] = useState<number | null>(null);

  const shown = dragMs ?? positionMs;
  const fraction = durationMs > 0 ? Math.min(Math.max(shown / durationMs, 0), 1) : 0;
  const canSeek = durationMs > 0;

  return (
    <View>
      <View
        testID="seek-bar"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Seek bar"
        accessibilityValue={{ text: `${formatClock(shown)} of ${formatClock(durationMs)}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          const step = Math.max(durationMs * 0.05, 5_000);
          const delta = event.nativeEvent.actionName === 'increment' ? step : -step;
          onSeek(Math.min(Math.max(positionMs + delta, 0), durationMs));
        }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => canSeek}
        onMoveShouldSetResponder={() => canSeek}
        onResponderGrant={(event) =>
          setDragMs(positionFromTouch(event.nativeEvent.locationX, width, durationMs))
        }
        onResponderMove={(event) =>
          setDragMs(positionFromTouch(event.nativeEvent.locationX, width, durationMs))
        }
        onResponderRelease={(event) => {
          onSeek(positionFromTouch(event.nativeEvent.locationX, width, durationMs));
          setDragMs(null);
        }}
        onResponderTerminate={() => setDragMs(null)}
        style={{ height: 40, justifyContent: 'center' }}
      >
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border }}>
          <View
            style={{
              width: `${fraction * 100}%`,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.accent,
            }}
          />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: `${fraction * 100}%`,
            marginLeft: -9,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: colors.text,
          }}
        />
      </View>
      <View className="flex-row justify-between">
        <Text className="text-sm text-text">{formatClock(shown)}</Text>
        <Text className="text-sm text-textMuted">
          {durationMs > 0 ? formatClock(durationMs) : '--:--'}
        </Text>
      </View>
    </View>
  );
}
