import { describePlaybackError, localInaccessibleError } from '@/services/playback/errors';

const err = (name: string) => ({
  error: { errorString: `ExoPlaybackException: ${name}`, errorCode: '2001' },
});

describe('describePlaybackError', () => {
  it.each([
    ['ERROR_CODE_IO_NETWORK_CONNECTION_FAILED', 'network', true],
    ['ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT', 'timeout', true],
    ['ERROR_CODE_IO_CLEARTEXT_NOT_PERMITTED', 'cleartext', false],
    ['ERROR_CODE_IO_BAD_HTTP_STATUS', 'http', true],
    ['ERROR_CODE_PARSING_CONTAINER_MALFORMED', 'format', false],
    ['ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED', 'format', false],
    ['ERROR_CODE_DECODING_FAILED', 'decoder', false],
    ['ERROR_CODE_DECODER_INIT_FAILED', 'decoder', false],
    ['ERROR_CODE_SOMETHING_NEW', 'unknown', true],
  ])('%s -> %s', (name, kind, retryable) => {
    const info = describePlaybackError(err(name), { sourceKind: 'remote' });
    expect(info.kind).toBe(kind);
    expect(info.retryable).toBe(retryable);
    expect(info.technical).toContain(name);
  });

  it('treats a missing file differently for remote and local', () => {
    const name = 'ERROR_CODE_IO_FILE_NOT_FOUND';
    expect(describePlaybackError(err(name), { sourceKind: 'remote' }).kind).toBe('not-found');
    expect(describePlaybackError(err(name), { sourceKind: 'local' }).kind).toBe(
      'local-inaccessible',
    );
  });

  it('treats lost permission differently for remote and local', () => {
    const name = 'ERROR_CODE_IO_NO_PERMISSION';
    expect(describePlaybackError(err(name), { sourceKind: 'remote' }).kind).toBe('permission');
    expect(describePlaybackError(err(name), { sourceKind: 'local' }).kind).toBe(
      'local-inaccessible',
    );
  });

  it('never throws on missing or odd payloads', () => {
    expect(describePlaybackError(undefined, { sourceKind: 'remote' }).kind).toBe('unknown');
    expect(describePlaybackError({}, { sourceKind: 'local' }).kind).toBe('unknown');
  });

  it('exposes a ready-made local-inaccessible error', () => {
    expect(localInaccessibleError().retryable).toBe(false);
  });
});
