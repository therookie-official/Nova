import { ActivityIndicator, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/theme/tokens';
import { Button } from './Button';

type IconName = keyof typeof Ionicons.glyphMap;

interface ActionProps {
  actionLabel?: string;
  onAction?: () => void;
}

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      testID="loading-state"
      className="flex-1 items-center justify-center p-6"
    >
      <ActivityIndicator size="large" color={colors.accent} />
      <Text className="mt-4 text-base text-textMuted">{message}</Text>
    </View>
  );
}

/** Grey placeholder block shown while content is loading. Static, so it costs nothing. */
export function SkeletonBlock({ height = 120 }: { height?: number }) {
  return <View style={{ height }} className="rounded-card bg-surfaceAlt" testID="skeleton-block" />;
}

interface EmptyStateProps extends ActionProps {
  title: string;
  message?: string;
  icon?: IconName;
}

export function EmptyState({
  title,
  message,
  icon = 'film-outline',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View testID="empty-state" className="flex-1 items-center justify-center p-6">
      <Ionicons name={icon} size={56} color={colors.textMuted} />
      <Text className="mt-4 text-center text-xl font-bold text-text">{title}</Text>
      {message ? (
        <Text className="mt-2 text-center text-base text-textMuted">{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <View className="mt-6 self-stretch">
          <Button label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <View
      accessibilityRole="alert"
      testID="error-state"
      className="flex-1 items-center justify-center p-6"
    >
      <Ionicons name="alert-circle-outline" size={56} color={colors.danger} />
      <Text className="mt-4 text-center text-xl font-bold text-text">{title}</Text>
      <Text className="mt-2 text-center text-base text-textMuted">{message}</Text>
      {onRetry ? (
        <View className="mt-6 self-stretch">
          <Button label={retryLabel} onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
