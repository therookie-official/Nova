import { FlatList, Text, View } from 'react-native';
import { Button, Card, Chip, EmptyState, Screen } from '@/components/ui';
import { useRemoteSourcesStore } from '@/store/libraryStore';

export function RemoteSourcesScreen() {
  const sources = useRemoteSourcesStore((state) => state.items);

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
          disabled
          accessibilityHint="Not available yet"
        />
        <Text className="text-sm text-textMuted">Adding links is not available yet.</Text>
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
            <Card testID={`source-${item.id}`}>
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-base font-semibold text-text">{item.label}</Text>
                {item.isPlaceholder ? <Chip label="Sample" /> : null}
              </View>
              <Text numberOfLines={1} className="mt-1 text-sm text-textMuted">
                {item.url}
              </Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
