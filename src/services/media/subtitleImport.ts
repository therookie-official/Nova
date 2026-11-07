import * as DocumentPicker from 'expo-document-picker';
import type { ExternalSubtitle } from '@/types/media';
import { subtitleFormatFromName, subtitleTitleFromName } from '@/services/playback/tracks';
import { safAccess } from './novaSaf';

export type SubtitlePickResult =
  | { status: 'picked'; subtitle: ExternalSubtitle }
  | { status: 'cancelled' }
  | { status: 'unsupported'; fileName: string; message: string }
  | { status: 'error'; message: string };

/**
 * Lets the user choose a subtitle file. Android often reports subtitle files as generic binary,
 * so any file can be chosen and the type is decided from the file name. Formats other than
 * .srt, .vtt and .ttml are refused with an explanation instead of failing silently in the player.
 */
export async function pickSubtitleFile(): Promise<SubtitlePickResult> {
  let result: DocumentPicker.DocumentPickerResult;
  try {
    result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: false,
      copyToCacheDirectory: false,
    });
  } catch {
    return { status: 'error', message: 'Could not open the file picker. Please try again.' };
  }
  if (result.canceled) return { status: 'cancelled' };

  const asset = result.assets[0];
  const format = subtitleFormatFromName(asset.name);
  if (!format) {
    return {
      status: 'unsupported',
      fileName: asset.name,
      message: `Nova can load .srt, .vtt and .ttml subtitle files. "${asset.name}" is a different type, so it was not added.`,
    };
  }
  const persisted = await safAccess.persist(asset.uri);
  return {
    status: 'picked',
    subtitle: { uri: asset.uri, title: subtitleTitleFromName(asset.name), format, persisted },
  };
}
