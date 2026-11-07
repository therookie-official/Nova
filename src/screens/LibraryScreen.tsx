import { useState } from 'react';
import { Alert, FlatList, ScrollView, TextInput, View } from 'react-native';
import { Button, Chip, EmptyState, MediaCard, Screen } from '@/components/ui';
import { pickLocalVideos } from '@/services/media/localImport';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useLibraryStore } from '@/store/libraryStore';
import { useProgressStore } from '@/store/progressStore';
import { colors } from '@/theme/tokens';
import { collectGenres, filterLibrary, progressFraction, sortRecentlyAdded } from '@/utils/library';

export function LibraryScreen() {
  const { openDetails } = useAppNavigation();
  const items = useLibraryStore((state) => state.items);
  const progressByItem = useProgressStore((state) => state.byItem);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<string | undefined>();
  const [importing, setImporting] = useState(false);
  const genres = collectGenres(items);
  const activeGenre = genre && genres.includes(genre) ? genre : undefined;

  const visible = sortRecentlyAdded(filterLibrary(items, query, activeGenre));

  const addFromDevice = async () => {
    setImporting(true);
    const result = await pickLocalVideos(
      items.filter((item) => item.source.kind === 'local').map((item) => item.source.uri),
    );
    setImporting(false);
    if (result.status === 'error') {
      Alert.alert('Could not add video', result.message);
      return;
    }
    if (result.status !== 'picked') return;
    result.items.forEach((item) => useLibraryStore.getState().add(item));
    const notes: string[] = [];
    if (result.skipped > 0) notes.push(`${result.skipped} already in your library.`);
    if (result.notPersisted > 0) {
      notes.push(
        'Android may ask you to select some videos again after the app restarts. Nova will tell you if that happens.',
      );
    }
    if (notes.length > 0) Alert.alert('Added', notes.join('\n\n'));
  };

  return (
    <Screen
      title="Library"
      subtitle={items.length === 1 ? '1 title' : `${items.length} titles`}
      testID="screen-library"
    >
      <View className="gap-3 px-4 pb-3">
        <Button
          label="Add video from this device"
          icon="phone-portrait-outline"
          loading={importing}
          onPress={addFromDevice}
          testID="add-local"
        />
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
        {genres.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} testID="genre-chips">
            <View className="flex-row gap-2">
              <Chip label="All" selected={!activeGenre} onPress={() => setGenre(undefined)} />
              {genres.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  selected={activeGenre === name}
                  onPress={() => setGenre(activeGenre === name ? undefined : name)}
                  testID={`genre-${name}`}
                />
              ))}
            </View>
          </ScrollView>
        ) : null}
      </View>
      {items.length === 0 ? (
        <EmptyState
          title="No videos yet"
          message="Add a video from this device above, or add a link from the Sources tab."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="search"
          title="No matches"
          message={
            query.trim()
              ? `Nothing in your library matches “${query.trim()}”.`
              : `Nothing is filed under ${activeGenre ?? 'this category'}.`
          }
          actionLabel="Clear filters"
          onAction={() => {
            setQuery('');
            setGenre(undefined);
          }}
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
