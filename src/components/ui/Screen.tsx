import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  children: ReactNode;
  testID?: string;
}

/** Standard screen frame: dark background, safe area, large title, 16dp side margins. */
export function Screen({ title, subtitle, scroll = false, children, testID }: ScreenProps) {
  const header = title ? (
    <View className="px-4 pb-3 pt-2">
      <Text accessibilityRole="header" className="text-3xl font-bold text-text">
        {title}
      </Text>
      {subtitle ? <Text className="mt-1 text-base text-textMuted">{subtitle}</Text> : null}
    </View>
  ) : null;

  return (
    <SafeAreaView edges={['top']} testID={testID} className="flex-1 bg-background">
      {header}
      {scroll ? (
        <ScrollView contentContainerClassName="px-4 pb-8 gap-6">{children}</ScrollView>
      ) : (
        <View className="flex-1">{children}</View>
      )}
    </SafeAreaView>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text accessibilityRole="header" className="text-xl font-bold text-text">
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Text
          accessibilityRole="button"
          onPress={onAction}
          className="min-h-[44px] py-2 text-base font-semibold text-primarySoft"
        >
          {actionLabel}
        </Text>
      ) : null}
    </View>
  );
}
