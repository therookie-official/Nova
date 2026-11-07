import type { PlaybackErrorInfo } from './errors';

/** Waits (ms) before each automatic retry. Its length is the number of automatic retries. */
export const RETRY_DELAYS_MS = [1_500, 3_000, 6_000, 10_000];
/** How long buffering may last before the screen suggests checking the connection. */
export const SLOW_BUFFER_HINT_MS = 8_000;

/**
 * Whether to reconnect on its own. Only remote videos, and only for errors that are about the
 * connection. Format, decoder and refusal errors will not fix themselves, so they are never
 * retried automatically.
 */
export function shouldAutoRetry(
  error: PlaybackErrorInfo,
  sourceKind: 'local' | 'remote',
  attemptsSoFar: number,
): boolean {
  if (sourceKind !== 'remote') return false;
  if (error.kind !== 'network' && error.kind !== 'timeout') return false;
  return attemptsSoFar < RETRY_DELAYS_MS.length;
}

export function retryDelayMs(attemptsSoFar: number): number | undefined {
  return RETRY_DELAYS_MS[attemptsSoFar];
}

export interface BufferSettings {
  minBufferMs: number;
  maxBufferMs: number;
  bufferForPlaybackMs: number;
  bufferForPlaybackAfterRebufferMs: number;
}

/**
 * Buffer sizes for online videos: start after 2.5 s of data, and after a stall wait for 5 s so it
 * does not stall again straight away. Chosen as reasonable values, NOT tuned on real networks.
 */
export const REMOTE_BUFFER: BufferSettings = {
  minBufferMs: 15_000,
  maxBufferMs: 50_000,
  bufferForPlaybackMs: 2_500,
  bufferForPlaybackAfterRebufferMs: 5_000,
};

export const REMOTE_MIN_LOAD_RETRY_COUNT = 5;
