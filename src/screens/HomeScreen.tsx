import { SAMPLE_DATA_ENABLED } from '@/config/flags';
import { FlatList, View } from 'react-native';
import { EmptyState, MediaCard, Screen, SectionHeader, Button, Card } from '@/components/ui';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { loadPlaceholderData } from '@/services/dev/placeholders';
import { useLibraryStore } from '@/store/libraryStore';
import { useProgressStore } from '@/store/progressStore';
import { progressFraction, selectContinueWatching, sortRecentlyAdded } from '@/utils/library';

export function HomeScreen() {
  const { openDetails, openTab } = useAppNavigation();
  const items = useLibraryStore((state) => state.items);
  const progressByItem = useProgressStore((state) => state.byItem);

  if (items.length === 0) {
    return (
      <Screen title="Nova" subtitle="Your personal movie library" testID="screen-home">
        <EmptyState
          title="Your library is empty"
          message="Videos you add from your device or from a link will appear here."
          icon="film-outline"
          actionLabel={SAMPLE_DATA_ENABLED ? 'Load sample data' : undefined}
          onAction={SAMPLE_DATA_ENABLED ? loadPlaceholderData : undefined}
        />
      </Screen>
    );
  }

  const continueWatching = selectContinueWatching(items, progressByItem);
  const recent = sortRecentlyAdded(items).slice(0, 10);

  return (
    <Screen title="Nova" subtitle="Your personal movie library" scroll testID="screen-home">
      {continueWatching.length > 0 ? (
        <View>
          <SectionHeader title="Continue watching" />
          <FlatList
            horizontal
            data={continueWatching}
            keyExtractor={(entry) => entry.item.id}
            showsHorizontalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="w-3" />}
            renderItem={({ item: entry }) => (
              <View style={{ width: 140 }}>
                <MediaCard
                  item={entry.item}
                  progress={progressFraction(entry.progress)}
                  onPress={(selected) => openDetails(selected.id)}
                />
              </View>
            )}
          />
        </View>
      ) : null}

      <View>
        <SectionHeader
          title="Recently added"
          actionLabel="See all"
          onAction={() => openTab('Library')}
        />
        <FlatList
          horizontal
          data={recent}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View className="w-3" />}
          renderItem={({ item }) => (
            <View style={{ width: 140 }}>
              <MediaCard item={item} onPress={(selected) => openDetails(selected.id)} />
            </View>
          )}
        />
      </View>

      <Card>
        <View className="gap-3">
          <Button
            label="Browse library"
            icon="film-outline"
            variant="secondary"
            onPress={() => openTab('Library')}
          />
          <Button
            label="Remote sources"
            icon="cloud-outline"
            variant="secondary"
            onPress={() => openTab('Sources')}
          />
        </View>
      </Card>
    </Screen>
  );
}
