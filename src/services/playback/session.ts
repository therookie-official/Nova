import type { MediaItem, PlaybackProgress } from '@/types/media';

/** Positions before this are treated as "not really started": no resume prompt. */
export const RESUME_MIN_MS = 5_000;
/** At or beyond this fraction an item counts as finished and restarts from the beginning. */
export const FINISHED_FRACTION = 0.95;
/** Save progress after the position moves this far from the last saved value. */
export const PERSIST_EVERY_MS = 5_000;
export const SKIP_MS = 10_000;
export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function isFinished(positionMs: number, durationMs: number): boolean {
  return durationMs > 0 && positionMs / durationMs >= FINISHED_FRACTION;
}

/** Where playback should start. Zero means "from the beginning". */
export function getResumePosition(args: {
  progress: PlaybackProgress | undefined;
  resumeEnabled: boolean;
}): number {
  const { progress, resumeEnabled } = args;
  if (!resumeEnabled || !progress) return 0;
  if (progress.positionMs < RESUME_MIN_MS) return 0;
  if (isFinished(progress.positionMs, progress.durationMs)) return 0;
  return progress.positionMs;
}

/** True when the position has moved far enough from the last saved one to be worth saving. */
export function shouldPersistProgress(lastSavedMs: number | undefined, currentMs: number): boolean {
  if (lastSavedMs === undefined) return currentMs >= RESUME_MIN_MS;
  return Math.abs(currentMs - lastSavedMs) >= PERSIST_EVERY_MS;
}

/** Position after skipping by `deltaMs`, kept inside the video. */
export function skipTarget(currentMs: number, deltaMs: number, durationMs: number): number {
  const upper = durationMs > 0 ? durationMs : Number.MAX_SAFE_INTEGER;
  return Math.min(Math.max(currentMs + deltaMs, 0), upper);
}

/** Position for a touch at `x` pixels along a bar `width` pixels wide. */
export function positionFromTouch(x: number, width: number, durationMs: number): number {
  if (width <= 0 || durationMs <= 0) return 0;
  return Math.round(Math.min(Math.max(x / width, 0), 1) * durationMs);
}

export interface PlayerSource {
  uri: string;
  /** Forces the stream type when the address does not reveal it ("m3u8", "mpd"). */
  type?: string;
}

/** What to hand the player. Depends only on the source, never on display metadata. */
export function buildPlayerSource(item: Pick<MediaItem, 'source'>): PlayerSource {
  const { source } = item;
  if (source.kind === 'local') return { uri: source.uri };
  if (source.format === 'hls') return { uri: source.uri, type: 'm3u8' };
  if (source.format === 'dash') return { uri: source.uri, type: 'mpd' };
  return { uri: source.uri };
}

/** "Movie_Name.2021.1080p.mkv" becomes "Movie Name 2021 1080p". */
export function titleFromFileName(fileName: string | undefined): string {
  const withoutExtension = (fileName ?? '').replace(/\.[A-Za-z0-9]{1,5}$/, '');
  const spaced = withoutExtension.replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim();
  return spaced || 'Untitled video';
}
