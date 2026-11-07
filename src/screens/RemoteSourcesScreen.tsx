import { FlatList, Pressable, Text, View } from 'react-native';
import { Button, Card, Chip, EmptyState, Screen } from '@/components/ui';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useLibraryStore, useRemoteSourcesStore } from '@/store/libraryStore';

export function RemoteSourcesScreen() {
  const { openAddRemote, openDetails } = useAppNavigation();
  const sources = useRemoteSourcesStore((state) => state.items);
  const library = useLibraryStore((state) => state.items);

  return (
    <Screen
      title="Remote sources"
      subtitle="Links to videos you are allowed to play"
      testID="screen-sources"
    >
      <View className="gap-3 px-4 pb-3">
        <Card>
          <Text className="text-base text-textMuted">
            Add only links you own or have permission to use. Nova does not provide any catalogue.
          </Text>
        </Card>
        <Button
          label="Add link"
          icon="add-circle-outline"
          onPress={openAddRemote}
          testID="add-remote"
        />
      </View>

      {sources.length === 0 ? (
        <EmptyState
          icon="cloud-outline"
          title="No remote sources"
          message="Links you add will be listed here."
        />
      ) : (
        <FlatList
          data={sources}
          keyExtractor={(source) => source.id}
          contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.label}`}
              disabled={!library.some((entry) => entry.source.uri === item.url)}
              onPress={() => {
                const match = library.find((entry) => entry.source.uri === item.url);
                if (match) openDetails(match.id);
              }}
            >
              <Card testID={`source-${item.id}`}>
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="flex-1 text-base font-semibold text-text">{item.label}</Text>
                  {item.isPlaceholder ? <Chip label="Sample" /> : null}
                </View>
                <Text numberOfLines={1} className="mt-1 text-sm text-textMuted">
                  {item.url}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
