import { probeUrl, validateRemoteUrl } from '@/services/media/remoteUrl';

const ok = (url: string, opts = {}) => {
  const r = validateRemoteUrl(url, opts);
  if (!r.ok) throw new Error(`expected ok, got ${r.reason}`);
  return r;
};
const bad = (url: string, opts = {}) => {
  const r = validateRemoteUrl(url, opts);
  if (r.ok) throw new Error('expected rejection');
  return r;
};

describe('validateRemoteUrl', () => {
  it('rejects empty, spaced and malformed input with a reason', () => {
    expect(bad('').reason).toBe('empty');
    expect(bad('   ').reason).toBe('empty');
    expect(bad('https://exa mple.com/a.mp4').reason).toBe('invalid');
    expect(bad('not a url').reason).toBe('invalid');
    expect(bad('example.com/a.mp4').reason).toBe('invalid');
    expect(bad('ftp://example.com/a.mp4').reason).toBe('invalid');
    expect(bad('https://').reason).toBe('invalid');
  });
  it('rejects http and embedded credentials', () => {
    expect(bad('http://example.com/a.mp4').reason).toBe('insecure');
    expect(bad('https://user:pw@example.com/a.mp4').reason).toBe('credentials');
  });
  it('rejects links that are clearly not video', () => {
    expect(bad('https://example.com/page.html').reason).toBe('not-video');
    expect(bad('https://example.com/pic.JPG').reason).toBe('not-video');
  });
  it('detects progressive files, ignoring query strings and case', () => {
    expect(ok('https://example.com/a/b.MP4?token=1#x').format).toBe('progressive');
    expect(ok('https://example.com/a.webm').format).toBe('progressive');
  });
  it('detects HLS', () => {
    expect(ok('https://example.com/live/master.m3u8?sig=abc').format).toBe('hls');
  });
  it('rejects DASH unless enabled', () => {
    expect(bad('https://example.com/a.mpd', { dashEnabled: false }).reason).toBe('dash-disabled');
    expect(ok('https://example.com/a.mpd', { dashEnabled: true }).format).toBe('dash');
  });
  it('accepts unknown extensions as progressive with a note', () => {
    const r = ok('https://example.com/stream/12345');
    expect(r.format).toBe('progressive');
    expect(r.note).toBeTruthy();
  });
  it('trims whitespace and accepts ports and IPv6 hosts', () => {
    expect(ok('  https://example.com:8443/a.mp4  ').url).toBe('https://example.com:8443/a.mp4');
    expect(ok('https://[::1]:8080/a.mp4').format).toBe('progressive');
  });
});

describe('probeUrl', () => {
  const response = (status: number, contentType?: string) =>
    ({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (k: string) => (k === 'content-type' ? (contentType ?? null) : null) },
    }) as unknown as Response;

  it('accepts a successful HEAD', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response(200, 'video/mp4'));
    const r = await probeUrl('https://e.com/a.mp4', { fetchImpl });
    expect(r).toMatchObject({ ok: true, httpStatus: 200, contentType: 'video/mp4' });
    expect((r as { warning?: string }).warning).toBeUndefined();
    expect(fetchImpl.mock.calls[0][1].method).toBe('HEAD');
  });
  it('falls back to a ranged GET when HEAD is not allowed', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(response(405))
      .mockResolvedValueOnce(response(206, 'video/mp4'));
    const r = await probeUrl('https://e.com/a.mp4', { fetchImpl });
    expect(r.ok).toBe(true);
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
    });
  });
  it('warns when the server sends a web page', async () => {
    const r = await probeUrl('https://e.com/a', {
      fetchImpl: jest.fn().mockResolvedValue(response(200, 'text/html; charset=utf-8')),
    });
    expect(r).toMatchObject({ ok: true });
    expect((r as { warning?: string }).warning).toMatch(/web page/);
  });
  it('explains http errors', async () => {
    const r403 = await probeUrl('https://e.com/a', {
      fetchImpl: jest.fn().mockResolvedValue(response(403)),
    });
    expect(r403).toMatchObject({ ok: false, kind: 'http', httpStatus: 403 });
    const r404 = await probeUrl('https://e.com/a', {
      fetchImpl: jest.fn().mockResolvedValue(response(404)),
    });
    expect(r404.ok === false && r404.message).toMatch(/Nothing was found/);
  });
  it('reports network failure and timeout differently', async () => {
    const net = await probeUrl('https://e.com/a', {
      fetchImpl: jest.fn().mockRejectedValue(new TypeError('Network request failed')),
    });
    expect(net).toMatchObject({ ok: false, kind: 'network' });
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const timeout = await probeUrl('https://e.com/a', {
      fetchImpl: jest.fn().mockRejectedValue(abort),
    });
    expect(timeout).toMatchObject({ ok: false, kind: 'timeout' });
  });
});
