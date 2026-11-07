export type PlaybackErrorKind =
  | 'network'
  | 'timeout'
  | 'not-found'
  | 'http'
  | 'permission'
  | 'cleartext'
  | 'format'
  | 'decoder'
  | 'local-inaccessible'
  | 'unknown';

export interface PlaybackErrorInfo {
  kind: PlaybackErrorKind;
  title: string;
  message: string;
  /** Whether trying again could plausibly help. */
  retryable: boolean;
  /** Raw text from the player, shown small so a problem can be reported accurately. */
  technical?: string;
}

/** The error object react-native-video passes to `onError` on Android. */
export interface PlayerErrorPayload {
  error?: { errorString?: string; errorException?: string; errorCode?: string };
}

const CODE_NAME = /ERROR_CODE_[A-Z0-9_]+/;

/**
 * Turns react-native-video's error into something a person can act on.
 *
 * On Android `errorString` is "ExoPlaybackException: " followed by Media3's error-code name,
 * for example `ERROR_CODE_IO_NETWORK_CONNECTION_FAILED` (read from the library's source).
 * Names are matched by fragment, so the mapping does not depend on exact numeric codes.
 */
export function describePlaybackError(
  payload: PlayerErrorPayload | undefined,
  context: { sourceKind: 'local' | 'remote' },
): PlaybackErrorInfo {
  const raw = payload?.error;
  const technical = raw?.errorString ?? raw?.errorException ?? raw?.errorCode;
  const name = CODE_NAME.exec(raw?.errorString ?? '')?.[0] ?? '';
  const remote = context.sourceKind === 'remote';

  const make = (
    kind: PlaybackErrorKind,
    title: string,
    message: string,
    retryable: boolean,
  ): PlaybackErrorInfo => ({ kind, title, message, retryable, technical });

  if (name.includes('NETWORK_CONNECTION_TIMEOUT') || name.endsWith('_TIMEOUT')) {
    return make(
      'timeout',
      'The connection timed out',
      'The server took too long to respond. Check your connection and try again.',
      true,
    );
  }
  if (name.includes('NETWORK_CONNECTION_FAILED')) {
    return make(
      'network',
      'No connection',
      'Could not reach the video. Check your internet connection and try again.',
      true,
    );
  }
  if (name.includes('CLEARTEXT')) {
    return make(
      'cleartext',
      'Insecure link blocked',
      'This video uses an unencrypted http:// link, which Nova does not allow. Use an https:// link.',
      false,
    );
  }
  if (name.includes('FILE_NOT_FOUND')) {
    return remote
      ? make(
          'not-found',
          'Video not found',
          'Nothing was found at this link. It may have been moved or removed.',
          false,
        )
      : make(
          'local-inaccessible',
          'Video file not found',
          'The file may have been moved or deleted. Select it again to keep it in your library.',
          false,
        );
  }
  if (name.includes('NO_PERMISSION')) {
    return remote
      ? make(
          'permission',
          'Access refused',
          'The server would not let Nova play this video. The link may need a sign-in.',
          false,
        )
      : make(
          'local-inaccessible',
          'Nova can no longer open this file',
          'Android has taken back access to the file. Select it again to keep it in your library.',
          false,
        );
  }
  if (name.includes('BAD_HTTP_STATUS') || name.includes('INVALID_HTTP_CONTENT_TYPE')) {
    return make(
      'http',
      'The server refused the video',
      'The link may have expired, need a sign-in, or not point to a video.',
      true,
    );
  }
  if (name.includes('PARSING_') || name.includes('CONTAINER_UNSUPPORTED')) {
    return make(
      'format',
      'This video format is not supported',
      'Nova could not read this video file or stream. The file may be damaged, or its format is not supported on this phone.',
      false,
    );
  }
  if (name.includes('DECOD')) {
    return make(
      'decoder',
      'This phone cannot play this video',
      'The phone cannot decode this video. It may use a codec or resolution the phone does not support.',
      false,
    );
  }
  if (name.includes('IO_')) {
    return make(
      'network',
      'The video could not be loaded',
      'Something went wrong while loading the video. Check your connection and try again.',
      true,
    );
  }
  return make(
    'unknown',
    'Playback failed',
    'Nova could not play this video. Try again, or check that the file or link still works.',
    true,
  );
}

export function localInaccessibleError(): PlaybackErrorInfo {
  return {
    kind: 'local-inaccessible',
    title: 'Nova can no longer open this file',
    message:
      'Android has taken back access to the file, or it was moved or deleted. Select it again to keep it in your library.',
    retryable: false,
  };
}
