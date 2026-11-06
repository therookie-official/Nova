import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

// Full class names are written out so Tailwind can see them at build time.
const container: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-surfaceAlt border border-border',
  ghost: 'bg-transparent',
  danger: 'bg-danger',
};

const labelColor: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-text',
  ghost: 'text-primarySoft',
  danger: 'text-background',
};

const iconColor: Record<ButtonVariant, string> = {
  primary: '#FFFFFF',
  secondary: colors.text,
  ghost: colors.primarySoft,
  danger: colors.background,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      className={`min-h-[52px] flex-row items-center justify-center rounded-button px-5 py-3 active:opacity-80 ${container[variant]} ${inactive ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={iconColor[variant]} />
      ) : (
        <View className="flex-row items-center">
          {icon ? (
            <Ionicons name={icon} size={22} color={iconColor[variant]} style={{ marginRight: 8 }} />
          ) : null}
          <Text className={`text-base font-semibold ${labelColor[variant]}`}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
