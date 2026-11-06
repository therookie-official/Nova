import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, Screen } from '@/components/ui';
import { colors } from '@/theme/tokens';

const PROMISES = [
  'Nova is free to use, with every feature included.',
  'Contributions are optional and never unlock anything.',
  'Nova never stores your payment details.',
];

/** Phase 1: explanation only. No payment provider is chosen or connected yet. */
export function SupportNovaScreen() {
  return (
    <Screen title="Support Nova" scroll testID="screen-support">
      <Text className="text-base text-text">
        Contributions help maintain and improve Nova. They are entirely your choice.
      </Text>

      <Card>
        <View className="gap-4">
          {PROMISES.map((promise) => (
            <View key={promise} className="flex-row items-start gap-3">
              <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
              <Text className="flex-1 text-base text-text">{promise}</Text>
            </View>
          ))}
        </View>
      </Card>

      <View className="gap-2">
        <Button
          label="Contribute"
          icon="gift-outline"
          disabled
          accessibilityHint="Not available yet"
        />
        <Text className="text-sm text-textMuted">Contributions are not available yet.</Text>
      </View>
    </Screen>
  );
}
