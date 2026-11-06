import { Pressable, Text, View } from 'react-native';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}

/** Small pill: a tag when static, a toggle when `onPress` is given. */
export function Chip({ label, selected = false, onPress, testID }: ChipProps) {
  const style = selected ? 'border-primary bg-primary' : 'border-border bg-surfaceAlt';
  const text = selected ? 'text-white' : 'text-text';
  const body = (
    <View className={`min-h-[40px] justify-center rounded-pill border px-4 ${style}`}>
      <Text className={`text-sm font-medium ${text}`}>{label}</Text>
    </View>
  );
  if (!onPress) return <View testID={testID}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
    >
      {body}
    </Pressable>
  );
}
