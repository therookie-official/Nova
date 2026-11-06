import { useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { EmptyState, MediaCard, Screen } from '@/components/ui';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useLibraryStore } from '@/store/libraryStore';
import { useProgressStore } from '@/store/progressStore';
import { colors } from '@/theme/tokens';
import { filterLibrary, progressFraction, sortRecentlyAdded } from '@/utils/library';

export function LibraryScreen() {
  const { openDetails } = useAppNavigation();
  const items = useLibraryStore((state) => state.items);
  const progressByItem = useProgressStore((state) => state.byItem);
  const [query, setQuery] = useState('');

  const visible = sortRecentlyAdded(filterLibrary(items, query));

  return (
    <Screen
      title="Library"
      subtitle={items.length === 1 ? '1 title' : `${items.length} titles`}
      testID="screen-library"
    >
      <View className="px-4 pb-3">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search title or genre"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Search library"
          autoCorrect={false}
          returnKeyType="search"
          testID="library-search"
          className="min-h-[52px] rounded-button border border-border bg-surface px-4 text-base text-text"
        />
      </View>
      {items.length === 0 ? (
        <EmptyState
          title="No videos yet"
          message="Add a video from your device or a link and it will show up here."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="search"
          title="No matches"
          message={`Nothing in your library matches “${query.trim()}”.`}
          actionLabel="Clear search"
          onAction={() => setQuery('')}
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <MediaCard
              item={item}
              progress={
                progressByItem[item.id] ? progressFraction(progressByItem[item.id]) : undefined
              }
              onPress={(selected) => openDetails(selected.id)}
            />
          )}
        />
      )}
    </Screen>
  );
}
