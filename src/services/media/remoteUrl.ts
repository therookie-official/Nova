import { DASH_ENABLED } from '@/config/flags';
import type { MediaFormat } from '@/types/media';

export type UrlRejection =
  'empty' | 'invalid' | 'insecure' | 'credentials' | 'not-video' | 'dash-disabled';

export type UrlCheck =
  | { ok: true; url: string; format: MediaFormat; note?: string }
  | { ok: false; reason: UrlRejection; message: string };

const PROGRESSIVE_EXTENSIONS = ['mp4', 'm4v', 'mov', 'webm', 'mkv', '3gp'];
const NOT_VIDEO_EXTENSIONS = [
  'html',
  'htm',
  'php',
  'asp',
  'aspx',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'zip',
  'rar',
  'pdf',
  'txt',
  'json',
  'js',
  'css',
];

// scheme://authority/path?query#fragment. Hand-parsed because React Native's URL support is partial.
const URL_PATTERN = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/;
const HOST_PATTERN = /^(\[[0-9a-fA-F:.]+\]|[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?)$/;

function extensionOf(pathname: string): string {
  const last = pathname.split('/').pop() ?? '';
  const dot = last.lastIndexOf('.');
  return dot > 0 ? last.slice(dot + 1).toLowerCase() : '';
}

/**
 * Checks a link the user typed and works out what kind of video it points at, from the address
 * alone. This is a first filter, not a guarantee: only playing it proves it works.
 */
export function validateRemoteUrl(
  input: string,
  options: { dashEnabled?: boolean } = {},
): UrlCheck {
  const dashEnabled = options.dashEnabled ?? DASH_ENABLED;
  const url = input.trim();

  if (!url) {
    return { ok: false, reason: 'empty', message: 'Enter a link to a video.' };
  }
  if (/\s/.test(url)) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'The link has a space in it. Check that you copied all of it correctly.',
    };
  }

  const match = URL_PATTERN.exec(url);
  if (!match) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'That does not look like a web link. It should start with https://',
    };
  }

  const [, scheme, authority, pathname] = match;
  const protocol = scheme.toLowerCase();
  if (protocol === 'http') {
    return {
      ok: false,
      reason: 'insecure',
      message: 'Only secure links are supported. The link must start with https://',
    };
  }
  if (protocol !== 'https') {
    return {
      ok: false,
      reason: 'invalid',
      message: 'That does not look like a web link. It should start with https://',
    };
  }

  if (authority.includes('@')) {
    return {
      ok: false,
      reason: 'credentials',
      message: 'Links that contain a username or password cannot be saved.',
    };
  }

  const hostname = authority.replace(/:\d+$/, '');
  if (!hostname || !HOST_PATTERN.test(hostname)) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'The address of the website is not valid. Check the link and try again.',
    };
  }

  const extension = extensionOf(pathname);

  if (NOT_VIDEO_EXTENSIONS.includes(extension)) {
    return {
      ok: false,
      reason: 'not-video',
      message: `This link points to a .${extension} file, not a video.`,
    };
  }
  if (extension === 'm3u8') return { ok: true, url, format: 'hls' };
  if (extension === 'mpd') {
    if (!dashEnabled) {
      return {
        ok: false,
        reason: 'dash-disabled',
        message:
          'DASH (.mpd) links are not enabled yet. They have not been tested on a real device.',
      };
    }
    return { ok: true, url, format: 'dash' };
  }
  if (PROGRESSIVE_EXTENSIONS.includes(extension)) return { ok: true, url, format: 'progressive' };

  return {
    ok: true,
    url,
    format: 'progressive',
    note: 'Nova cannot tell the video type from this link, so it will try to play it as a regular video file.',
  };
}

export type ProbeResult =
  | { ok: true; httpStatus: number; contentType?: string; warning?: string }
  | { ok: false; kind: 'network' | 'timeout' | 'http'; httpStatus?: number; message: string };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function describeHttpStatus(status: number): string {
  if (status === 401 || status === 403) {
    return `The server refused access (error ${status}). The link may need a sign-in or may have expired.`;
  }
  if (status === 404 || status === 410) {
    return `Nothing was found at this link (error ${status}). It may have been moved or removed.`;
  }
  if (status >= 500) {
    return `The server had a problem (error ${status}). Try again later.`;
  }
  return `The server answered with error ${status}.`;
}

/**
 * Asks the server about a link without downloading the video. The answer is advisory: some
 * servers refuse these requests but still play fine, so callers must allow "save anyway".
 */
export async function probeUrl(
  url: string,
  options: { fetchImpl?: FetchLike; timeoutMs?: number } = {},
): Promise<ProbeResult> {
  const doFetch: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const timeoutMs = options.timeoutMs ?? 8000;

  const attempt = async (init: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await doFetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  let response: Response;
  try {
    response = await attempt({ method: 'HEAD' });
    if (response.status === 405 || response.status === 501) {
      response = await attempt({ method: 'GET', headers: { Range: 'bytes=0-0' } });
    }
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return aborted
      ? {
          ok: false,
          kind: 'timeout',
          message: 'The server took too long to answer. Check your connection and try again.',
        }
      : {
          ok: false,
          kind: 'network',
          message:
            'Could not reach this link. Check your internet connection and that the address is right.',
        };
  }

  if (!response.ok && response.status !== 206) {
    return {
      ok: false,
      kind: 'http',
      httpStatus: response.status,
      message: describeHttpStatus(response.status),
    };
  }

  const contentType = response.headers.get('content-type') ?? undefined;
  const lower = contentType?.toLowerCase() ?? '';
  const warning =
    lower.startsWith('text/html') || lower.startsWith('image/')
      ? 'The server answered, but it sent a web page or picture, not a video.'
      : undefined;
  return { ok: true, httpStatus: response.status, contentType, warning };
}
