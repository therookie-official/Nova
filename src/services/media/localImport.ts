import * as DocumentPicker from 'expo-document-picker';
import type { MediaItem } from '@/types/media';
import { createId } from '@/utils/id';
import { titleFromFileName } from '@/services/playback/session';
import { safAccess } from './novaSaf';

export type PickResult =
  | { status: 'picked'; items: MediaItem[]; notPersisted: number; skipped: number }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/**
 * Opens Android's document picker for video files and builds library items from the choice.
 * The file is never copied: only its content:// URI and basic facts are stored.
 */
export async function pickLocalVideos(existingUris: string[] = []): Promise<PickResult> {
  let result: DocumentPicker.DocumentPickerResult;
  try {
    result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      multiple: true,
      copyToCacheDirectory: false,
    });
  } catch {
    return { status: 'error', message: 'Could not open the file picker. Please try again.' };
  }
  if (result.canceled) return { status: 'cancelled' };

  const known = new Set(existingUris);
  const items: MediaItem[] = [];
  let notPersisted = 0;
  let skipped = 0;

  for (const asset of result.assets) {
    if (known.has(asset.uri) || items.some((item) => item.source.uri === asset.uri)) {
      skipped += 1;
      continue;
    }
    const persisted = await safAccess.persist(asset.uri);
    if (!persisted) notPersisted += 1;
    items.push({
      id: createId(),
      addedAt: Date.now(),
      source: {
        kind: 'local',
        uri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType,
        sizeBytes: asset.size,
        persisted,
      },
      metadata: { title: titleFromFileName(asset.name), genres: [], origin: 'manual' },
    });
  }
  return { status: 'picked', items, notPersisted, skipped };
}
