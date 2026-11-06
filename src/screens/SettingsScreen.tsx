import { SAMPLE_DATA_ENABLED } from '@/config/flags';
import { Switch, Text, View } from 'react-native';
import appJson from '../../app.json';
import { Button, Card, Chip, Screen, SectionHeader } from '@/components/ui';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { clearPlaceholderData, loadPlaceholderData } from '@/services/dev/placeholders';
import { useSettingsStore } from '@/store/settingsStore';
import { colors } from '@/theme/tokens';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function SettingsScreen() {
  const { openSupport } = useAppNavigation();
  const resumeEnabled = useSettingsStore((state) => state.resumeEnabled);
  const defaultSpeed = useSettingsStore((state) => state.defaultSpeed);
  const update = useSettingsStore((state) => state.update);

  return (
    <Screen title="Settings" scroll testID="screen-settings">
      <View>
        <SectionHeader title="Playback" />
        <Card>
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1">
              <Text className="text-base font-semibold text-text">Resume playback</Text>
              <Text className="text-sm text-textMuted">Continue where you left off.</Text>
            </View>
            <Switch
              value={resumeEnabled}
              onValueChange={(value) => update({ resumeEnabled: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Resume playback"
              testID="setting-resume"
            />
          </View>

          <Text className="mb-2 mt-5 text-base font-semibold text-text">Default speed</Text>
          <View className="flex-row flex-wrap gap-2">
            {SPEEDS.map((speed) => (
              <Chip
                key={speed}
                label={`${speed}×`}
                selected={defaultSpeed === speed}
                onPress={() => update({ defaultSpeed: speed })}
                testID={`speed-${speed}`}
              />
            ))}
          </View>
        </Card>
      </View>

      <View>
        <SectionHeader title="About Nova" />
        <Card>
          <Text className="text-base text-text">
            Nova is free. Contributions are optional and never unlock anything.
          </Text>
          <Text className="mt-2 text-sm text-textMuted">Version {appJson.expo.version}</Text>
          <View className="mt-4">
            <Button
              label="Support Nova"
              icon="gift-outline"
              onPress={openSupport}
              testID="open-support"
            />
          </View>
        </Card>
      </View>

      {SAMPLE_DATA_ENABLED ? (
        <View>
          <SectionHeader title="Developer" />
          <Card>
            <Text className="mb-3 text-sm text-textMuted">
              Sample data is invented and plays nothing. Only sample entries are removed.
            </Text>
            <View className="gap-3">
              <Button
                label="Load sample data"
                icon="bug-outline"
                variant="secondary"
                onPress={loadPlaceholderData}
                testID="load-samples"
              />
              <Button
                label="Clear sample data"
                variant="secondary"
                onPress={clearPlaceholderData}
                testID="clear-samples"
              />
            </View>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
