import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, ErrorState, Screen } from '@/components/ui';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import type { RootStackParamList } from '@/navigation/types';
import { useLibraryStore } from '@/store/libraryStore';
import { colors } from '@/theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

/**
 * Phase 1 placeholder. There is deliberately no video component here yet:
 * playback arrives in a later phase, and nothing on this screen pretends otherwise.
 */
export function PlayerScreen({ route }: Props) {
  const { goBack } = useAppNavigation();
  const item = useLibraryStore((state) =>
    state.items.find((entry) => entry.id === route.params.itemId),
  );

  if (!item) {
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

  return (
    <Screen testID="screen-player">
      <View className="flex-1 justify-between p-4">
        <View className="flex-row items-center gap-3">
          <View style={{ width: 120 }}>
            <Button label="Back" icon="arrow-back" variant="ghost" onPress={goBack} />
          </View>
          <Text numberOfLines={1} className="flex-1 text-lg font-semibold text-text">
            {item.title}
          </Text>
        </View>

        <View className="items-center">
          <Ionicons name="play-circle-outline" size={96} color={colors.textMuted} />
        </View>

        <Card>
          <Text className="text-base font-semibold text-text">Player placeholder</Text>
          <Text className="mt-1 text-base text-textMuted">
            Playback is not built yet. This screen only checks that navigation works.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
