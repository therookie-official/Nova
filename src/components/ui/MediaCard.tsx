import { Image, Pressable, Text, View } from 'react-native';
import type { LibraryItem } from '@/types/media';

interface MediaCardProps {
  item: LibraryItem;
  onPress: (item: LibraryItem) => void;
  /** 0..1. When given, a thin progress bar is drawn under the poster. */
  progress?: number;
}

/** Rounded poster card. Without a poster image it shows the title's first letter. */
export function MediaCard({ item, onPress, progress }: MediaCardProps) {
  const subtitle = [item.year, item.genres[0]].filter(Boolean).join(' · ');
  const label = subtitle ? `${item.title}, ${subtitle}` : item.title;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onPress(item)}
      testID={`media-card-${item.id}`}
      className="flex-1 active:opacity-80"
    >
      <View className="overflow-hidden rounded-card border border-border bg-surface">
        <View style={{ aspectRatio: 2 / 3 }} className="items-center justify-center bg-surfaceAlt">
          {item.posterUri ? (
            <Image source={{ uri: item.posterUri }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <Text className="text-3xl font-bold text-primarySoft">
              {item.title.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        {progress !== undefined ? (
          <View className="h-1.5 bg-border" testID={`media-progress-${item.id}`}>
            <View
              className="h-1.5 bg-accent"
              style={{ width: `${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}%` }}
            />
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} className="mt-2 text-base font-semibold text-text">
        {item.title}
      </Text>
      {subtitle ? <Text className="text-sm text-textMuted">{subtitle}</Text> : null}
    </Pressable>
  );
}
