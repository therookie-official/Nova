import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Screen, TextField } from '@/components/ui';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { addRemoteItem } from '@/services/media/mediaActions';
import { probeUrl, validateRemoteUrl } from '@/services/media/remoteUrl';
import { useRemoteSourcesStore } from '@/store/libraryStore';
import { createId } from '@/utils/id';

function hostOf(url: string): string {
  return /^https:\/\/([^/?#:]+)/i.exec(url)?.[1] ?? url;
}

export function AddRemoteScreen() {
  const { goBack, openDetails } = useAppNavigation();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string>();
  const [note, setNote] = useState<string>();
  const [checking, setChecking] = useState(false);
  // After a failed network check the user may still save, because the check is only advisory.
  const [allowAnyway, setAllowAnyway] = useState(false);

  const save = (cleanUrl: string, format: 'progressive' | 'hls' | 'dash') => {
    const label = title.trim() || hostOf(cleanUrl);
    const item = addRemoteItem({ url: cleanUrl, format, title: label });
    useRemoteSourcesStore
      .getState()
      .add({ id: createId('src'), label, url: cleanUrl, addedAt: Date.now() });
    goBack();
    openDetails(item.id);
  };

  const submit = async () => {
    setNote(undefined);
    const check = validateRemoteUrl(url);
    if (!check.ok) {
      setError(check.message);
      setAllowAnyway(false);
      return;
    }
    setError(undefined);
    if (allowAnyway) {
      save(check.url, check.format);
      return;
    }

    setChecking(true);
    const probe = await probeUrl(check.url);
    setChecking(false);
    if (!probe.ok) {
      setError(probe.message);
      setNote('Some servers refuse this check but still play fine. You can save the link anyway.');
      setAllowAnyway(true);
      return;
    }
    if (probe.warning) {
      setError(probe.warning);
      setNote('If you are sure the link is a video, you can save it anyway.');
      setAllowAnyway(true);
      return;
    }
    save(check.url, check.format);
  };

  return (
    <Screen scroll testID="screen-add-remote">
      <Card>
        <Text className="text-base text-textMuted">
          Add only links you own or have permission to use. Nova plays the link as given and does
          not provide any catalogue.
        </Text>
      </Card>
      <TextField
        label="Video link"
        value={url}
        onChangeText={(text) => {
          setUrl(text);
          setError(undefined);
          setNote(undefined);
          setAllowAnyway(false);
        }}
        placeholder="https://example.com/video.mp4"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        error={error}
        hint="Direct video files (.mp4, .webm, …) and HLS (.m3u8) links."
        testID="remote-url-input"
      />
      {note ? <Text className="text-base text-warning">{note}</Text> : null}
      <TextField
        label="Title (optional)"
        value={title}
        onChangeText={setTitle}
        placeholder="Name shown in your library"
        testID="remote-title-input"
      />
      <View className="gap-3">
        <Button
          label={allowAnyway ? 'Save anyway' : 'Check and save'}
          icon="checkmark-circle-outline"
          loading={checking}
          onPress={submit}
          testID="remote-save"
        />
        <Button label="Cancel" variant="ghost" onPress={goBack} />
      </View>
    </Screen>
  );
}
