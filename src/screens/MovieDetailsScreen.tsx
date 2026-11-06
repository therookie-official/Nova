import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Chip, ErrorState, Screen } from '@/components/ui';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import type { RootStackParamList } from '@/navigation/types';
import { useLibraryStore } from '@/store/libraryStore';
import { useWatchlistStore } from '@/store/watchlistStore';
import { formatDuration } from '@/utils/library';

type Props = NativeStackScreenProps<RootStackParamList, 'MovieDetails'>;

export function MovieDetailsScreen({ route }: Props) {
  const { itemId } = route.params;
  const { openPlayer, goBack } = useAppNavigation();
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

  const facts = [item.year, formatDuration(item.durationMin)].filter(Boolean).join(' · ');

  return (
    <Screen scroll testID="screen-details">
      <View className="gap-2">
        <Text accessibilityRole="header" className="text-3xl font-bold text-text">
          {item.title}
        </Text>
        {facts ? <Text className="text-base text-textMuted">{facts}</Text> : null}
      </View>

      {item.genres.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {item.genres.map((genre) => (
            <Chip key={genre} label={genre} />
          ))}
        </View>
      ) : null}

      {item.description ? (
        <Text className="text-base text-text">{item.description}</Text>
      ) : (
        <Text className="text-base text-textMuted">No description added.</Text>
      )}

      {item.isPlaceholder ? (
        <Text className="text-sm text-warning">
          Sample entry for development. It points at no real video.
        </Text>
      ) : null}

      <View className="gap-3">
        <Button label="Play" icon="play" onPress={() => openPlayer(item.id)} />
        <Button
          label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          icon={inWatchlist ? 'bookmark' : 'bookmark-outline'}
          variant="secondary"
          onPress={() => toggleWatchlist(item.id)}
        />
      </View>
    </Screen>
  );
}
