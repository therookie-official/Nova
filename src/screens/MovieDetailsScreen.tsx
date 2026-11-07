import { Alert, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Chip, ErrorState, Screen } from '@/components/ui';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import type { RootStackParamList } from '@/navigation/types';
import { removeItem } from '@/services/media/mediaActions';
import { getResumePosition } from '@/services/playback/session';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useWatchlistStore } from '@/store/watchlistStore';
import { formatClock, formatDuration } from '@/utils/library';

type Props = NativeStackScreenProps<RootStackParamList, 'MovieDetails'>;

export function MovieDetailsScreen({ route }: Props) {
  const { itemId } = route.params;
  const { openPlayer, openEdit, goBack } = useAppNavigation();
  const progress = useProgressStore((state) => state.byItem[itemId]);
  const resumeEnabled = useSettingsStore((state) => state.resumeEnabled);
  const item = useLibraryStore((state) => state.items.find((entry) => entry.id === itemId));
  const inWatchlist = useWatchlistStore((state) => state.ids.includes(itemId));
  const toggleWatchlist = useWatchlistStore((state) => state.toggle);

  if (!item) {
    return (
      <Screen testID="screen-details">
        <ErrorState
          title="Video not found"
          message="This video is no longer in your library."
          onRetry={goBack}
          retryLabel="Go back"
        />
      </Screen>
    );
  }

  const { title, year, genres, description, durationMs } = item.metadata;
  const facts = [year, formatDuration(durationMs)].filter(Boolean).join(' · ');
  const resumeMs = getResumePosition({ progress, resumeEnabled });
  const sourceLabel =
    item.source.kind === 'local'
      ? 'On this device'
      : item.source.format === 'hls'
        ? 'Online · HLS'
        : item.source.format === 'dash'
          ? 'Online · DASH (experimental)'
          : 'Online';

  const confirmRemove = () =>
    Alert.alert(
      'Remove from library?',
      item.source.kind === 'local'
        ? 'The video file stays on your phone. Only the library entry is removed.'
        : 'Only the library entry is removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void removeItem(item.id);
            goBack();
          },
        },
      ],
    );

  return (
    <Screen scroll testID="screen-details">
      <View className="gap-2">
        <Text accessibilityRole="header" className="text-3xl font-bold text-text">
          {title}
        </Text>
        {facts ? <Text className="text-base text-textMuted">{facts}</Text> : null}
        <View className="flex-row">
          <Chip label={sourceLabel} testID="source-chip" />
        </View>
      </View>

      {genres.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {genres.map((genre) => (
            <Chip key={genre} label={genre} />
          ))}
        </View>
      ) : null}

      {description ? (
        <Text className="text-base text-text">{description}</Text>
      ) : (
        <Text className="text-base text-textMuted">No description added.</Text>
      )}

      {item.isPlaceholder ? (
        <Text className="text-sm text-warning">
          Sample entry for development. It points at no real video.
        </Text>
      ) : null}

      <View className="gap-3">
        <Button
          label={resumeMs > 0 ? `Resume from ${formatClock(resumeMs)}` : 'Play'}
          icon="play"
          onPress={() => openPlayer(item.id)}
          testID="details-play"
        />
        <Button
          label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          icon={inWatchlist ? 'bookmark' : 'bookmark-outline'}
          variant="secondary"
          onPress={() => toggleWatchlist(item.id)}
        />
        <Button
          label="Edit details"
          icon="create-outline"
          variant="secondary"
          onPress={() => openEdit(item.id)}
          testID="details-edit"
        />
        <Button
          label="Remove from library"
          icon="trash-outline"
          variant="ghost"
          onPress={confirmRemove}
          testID="details-remove"
        />
      </View>
    </Screen>
  );
}
