export type SubtitleFormat = 'srt' | 'vtt' | 'ttml';

/** A selectable audio or subtitle track as shown to the user. */
export interface TrackOption {
  /** Index the player reported. Used only when the track has no title or language. */
  index: number;
  label: string;
  language?: string;
  title?: string;
  selected: boolean;
}

/** What the player was told to select. Mirrors react-native-video's `selectedTrack`. */
export type TrackChoice =
  | { type: 'disabled' }
  | { type: 'system' }
  | { type: 'title'; value: string }
  | { type: 'language'; value: string }
  | { type: 'index'; value: number };

export interface RawTrack {
  index: number;
  title?: string;
  language?: string;
  selected?: boolean;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
  kn: 'Kannada',
  bn: 'Bengali',
  mr: 'Marathi',
  gu: 'Gujarati',
  pa: 'Punjabi',
  ur: 'Urdu',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  tr: 'Turkish',
  id: 'Indonesian',
  th: 'Thai',
  vi: 'Vietnamese',
};

/** "en" -> "English". Unknown codes are shown as given; "und" and empty give undefined. */
export function languageName(code: string | undefined): string | undefined {
  const base = code?.trim().toLowerCase().split(/[-_]/)[0];
  if (!base || base === 'und' || base === 'zxx') return undefined;
  return LANGUAGE_NAMES[base] ?? code?.trim();
}

/** The best human label for a track: its own title, else its language, else "Track N". */
export function trackLabel(track: RawTrack, position: number): string {
  const title = track.title?.trim();
  const language = languageName(track.language);
  if (title && language && !title.toLowerCase().includes(language.toLowerCase())) {
    return `${title} (${language})`;
  }
  return title || language || `Track ${position + 1}`;
}

export function toTrackOptions(tracks: RawTrack[] | undefined): TrackOption[] {
  return (tracks ?? []).map((track, position) => ({
    index: track.index,
    label: trackLabel(track, position),
    language: track.language?.trim() || undefined,
    title: track.title?.trim() || undefined,
    selected: track.selected === true,
  }));
}

/** How to ask the player for this track again later, as stable as the track's data allows. */
export function choiceForTrack(track: TrackOption): TrackChoice {
  if (track.title) return { type: 'title', value: track.title };
  if (track.language) return { type: 'language', value: track.language };
  return { type: 'index', value: track.index };
}

/** True when the player's current selection matches the choice (used to tick the right row). */
export function choiceMatches(choice: TrackChoice | undefined, track: TrackOption): boolean {
  if (!choice) return track.selected;
  if (choice.type === 'title') return track.title === choice.value;
  if (choice.type === 'language') return track.language === choice.value;
  if (choice.type === 'index') return track.index === choice.value;
  return false;
}

/** Subtitle format from a file name. Undefined means Nova cannot load it as an external file. */
export function subtitleFormatFromName(name: string | undefined): SubtitleFormat | undefined {
  const extension = /\.([A-Za-z0-9]+)$/.exec(name ?? '')?.[1]?.toLowerCase();
  if (extension === 'srt') return 'srt';
  if (extension === 'vtt') return 'vtt';
  if (extension === 'ttml' || extension === 'dfxp' || extension === 'xml') return 'ttml';
  return undefined;
}

export const SUBTITLE_MIME: Record<SubtitleFormat, string> = {
  srt: 'application/x-subrip',
  vtt: 'text/vtt',
  ttml: 'application/ttml+xml',
};

export function subtitleTitleFromName(name: string | undefined): string {
  const base = (name ?? '')
    .replace(/\.[A-Za-z0-9]+$/, '')
    .replace(/[._]+/g, ' ')
    .trim();
  return base || 'Subtitles';
}
