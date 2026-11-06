import { FlatList } from 'react-native';
import { EmptyState, MediaCard, Screen } from '@/components/ui';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useLibraryStore } from '@/store/libraryStore';
import { useWatchlistStore } from '@/store/watchlistStore';

export function WatchlistScreen() {
  const { openDetails, openTab } = useAppNavigation();
  const items = useLibraryStore((state) => state.items);
  const ids = useWatchlistStore((state) => state.ids);

  const saved = ids
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => item !== undefined);

  return (
    <Screen title="Watchlist" subtitle="Saved to watch later" testID="screen-watchlist">
      {saved.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title="Nothing saved yet"
          message="Open a video and choose “Add to watchlist”."
          actionLabel="Browse library"
          onAction={() => openTab('Library')}
        />
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <MediaCard item={item} onPress={(selected) => openDetails(selected.id)} />
          )}
        />
      )}
    </Screen>
  );
}
