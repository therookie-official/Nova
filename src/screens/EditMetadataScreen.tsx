import { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, ErrorState, Screen, TextField } from '@/components/ui';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import type { RootStackParamList } from '@/navigation/types';
import { parseGenres, parseYear, updateMetadata } from '@/services/media/mediaActions';
import { useLibraryStore } from '@/store/libraryStore';

type Props = NativeStackScreenProps<RootStackParamList, 'EditMetadata'>;

export function EditMetadataScreen({ route }: Props) {
  const { goBack } = useAppNavigation();
  const item = useLibraryStore((state) => state.items.find((e) => e.id === route.params.itemId));
  const [title, setTitle] = useState(item?.metadata.title ?? '');
  const [year, setYear] = useState(item?.metadata.year ? String(item.metadata.year) : '');
  const [genres, setGenres] = useState(item?.metadata.genres.join(', ') ?? '');
  const [description, setDescription] = useState(item?.metadata.description ?? '');
  const [posterUri, setPosterUri] = useState(item?.metadata.posterUri ?? '');
  const [errors, setErrors] = useState<{ title?: string; year?: string; poster?: string }>({});

  if (!item) {
    return (
      <Screen testID="screen-edit">
        <ErrorState
          title="Video not found"
          message="This video is no longer in your library."
          onRetry={goBack}
          retryLabel="Go back"
        />
      </Screen>
    );
  }

  const save = () => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Enter a title.';
    if (year.trim() && parseYear(year) === undefined) next.year = 'Enter a year like 2021.';
    const poster = posterUri.trim();
    if (poster && !/^https:\/\/\S+$/i.test(poster)) {
      next.poster = 'The picture link must start with https://';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    updateMetadata(item.id, {
      title: title.trim(),
      year: parseYear(year),
      genres: parseGenres(genres),
      description: description.trim() || undefined,
      posterUri: poster || undefined,
    });
    goBack();
  };

  return (
    <Screen scroll testID="screen-edit">
      <TextField
        label="Title"
        value={title}
        onChangeText={setTitle}
        error={errors.title}
        testID="edit-title"
      />
      <TextField
        label="Year"
        value={year}
        onChangeText={setYear}
        keyboardType="numeric"
        error={errors.year}
        testID="edit-year"
      />
      <TextField
        label="Categories"
        value={genres}
        onChangeText={setGenres}
        hint="Separate with commas, for example: Drama, Family"
        testID="edit-genres"
      />
      <TextField
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        testID="edit-description"
      />
      <TextField
        label="Poster picture link (optional)"
        value={posterUri}
        onChangeText={setPosterUri}
        autoCapitalize="none"
        keyboardType="url"
        error={errors.poster}
        testID="edit-poster"
      />
      <View className="gap-3">
        <Button label="Save" icon="checkmark" onPress={save} testID="edit-save" />
        <Button label="Cancel" variant="ghost" onPress={goBack} />
      </View>
    </Screen>
  );
}
