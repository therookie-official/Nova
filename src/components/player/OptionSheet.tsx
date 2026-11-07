import { Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/theme/tokens';

export interface SheetOption {
  key: string;
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface OptionSheetProps {
  title: string;
  options: SheetOption[];
  /** Shown when there is nothing to choose from. */
  emptyMessage?: string;
  message?: string;
  onClose: () => void;
}

/** Bottom sheet drawn over the player. Large rows, tick on the current choice. */
export function OptionSheet({ title, options, emptyMessage, message, onClose }: OptionSheetProps) {
  return (
    <View
      testID="option-sheet"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      className="justify-end"
    >
      <Pressable
        accessibilityLabel="Close"
        onPress={onClose}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        className="bg-black/60"
      />
      <View className="max-h-[75%] rounded-t-card border border-border bg-surface p-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text accessibilityRole="header" className="text-xl font-bold text-text">
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            testID="sheet-close"
            onPress={onClose}
            className="h-12 w-12 items-center justify-center"
          >
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
        </View>
        {message ? <Text className="mb-2 text-base text-warning">{message}</Text> : null}
        <ScrollView>
          {options.length === 0 && emptyMessage ? (
            <Text className="py-3 text-base text-textMuted">{emptyMessage}</Text>
          ) : null}
          {options.map((option) => (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              accessibilityState={{ selected: !!option.selected }}
              accessibilityLabel={option.label}
              testID={`sheet-option-${option.key}`}
              onPress={option.onPress}
              className="min-h-[52px] flex-row items-center border-b border-border py-3 active:opacity-70"
            >
              <View className="w-8">
                {option.selected ? (
                  <Ionicons name="checkmark" size={24} color={colors.accent} />
                ) : option.icon ? (
                  <Ionicons name={option.icon} size={22} color={colors.primarySoft} />
                ) : null}
              </View>
              <Text
                className={`flex-1 text-lg ${option.selected ? 'font-bold text-text' : 'text-text'}`}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
