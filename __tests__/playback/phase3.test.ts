import {
  RETRY_DELAYS_MS,
  REMOTE_BUFFER,
  retryDelayMs,
  shouldAutoRetry,
} from '@/services/playback/recovery';
import {
  RESIZE_MODES,
  type ResizeModeName,
  isImmersive,
  nextOrientationLock,
  nextResizeMode,
} from '@/services/playback/orientation';
import {
  choiceForTrack,
  choiceMatches,
  languageName,
  subtitleFormatFromName,
  subtitleTitleFromName,
  toTrackOptions,
  trackLabel,
} from '@/services/playback/tracks';
import { buildVideoSource } from '@/services/playback/session';
import type { PlaybackErrorInfo } from '@/services/playback/errors';
import { createMemoryStore, createRepository } from '@/services/storage';
import { DEFAULT_SETTINGS } from '@/services/storage/repositories';
import { createPlaybackPrefsStore } from '@/store/playbackPrefsStore';
import { createSettingsStore } from '@/store/settingsStore';
import type { PlaybackPrefs, Settings } from '@/types/media';

const err = (kind: PlaybackErrorInfo['kind']): PlaybackErrorInfo => ({
  kind,
  title: 't',
  message: 'm',
  retryable: true,
});

describe('recovery rules', () => {
  it('retries only connection errors on online videos, up to the limit', () => {
    expect(shouldAutoRetry(err('network'), 'remote', 0)).toBe(true);
    expect(shouldAutoRetry(err('timeout'), 'remote', 3)).toBe(true);
    expect(shouldAutoRetry(err('network'), 'remote', RETRY_DELAYS_MS.length)).toBe(false);
    expect(shouldAutoRetry(err('network'), 'local', 0)).toBe(false);
    for (const kind of [
      'format',
      'decoder',
      'http',
      'permission',
      'cleartext',
      'unknown',
    ] as const) {
      expect(shouldAutoRetry(err(kind), 'remote', 0)).toBe(false);
    }
  });
  it('waits longer each time', () => {
    expect(retryDelayMs(0)).toBe(1_500);
    expect(retryDelayMs(3)).toBe(10_000);
    expect(retryDelayMs(4)).toBeUndefined();
    expect([...RETRY_DELAYS_MS].sort((a, b) => a - b)).toEqual(RETRY_DELAYS_MS);
  });
  it('starts playback before it keeps a large buffer', () => {
    expect(REMOTE_BUFFER.bufferForPlaybackMs).toBeLessThan(REMOTE_BUFFER.minBufferMs);
    expect(REMOTE_BUFFER.minBufferMs).toBeLessThanOrEqual(REMOTE_BUFFER.maxBufferMs);
  });
});

describe('orientation rules', () => {
  it('flips from automatic, and returns to automatic from a lock', () => {
    expect(nextOrientationLock('auto', false)).toBe('landscape');
    expect(nextOrientationLock('auto', true)).toBe('portrait');
    expect(nextOrientationLock('landscape', true)).toBe('auto');
    expect(nextOrientationLock('portrait', false)).toBe('auto');
  });
  it('is immersive in landscape or when landscape is locked', () => {
    expect(isImmersive('auto', true)).toBe(true);
    expect(isImmersive('auto', false)).toBe(false);
    expect(isImmersive('landscape', false)).toBe(true);
    expect(isImmersive('portrait', true)).toBe(false);
  });
  it('cycles every picture size and wraps', () => {
    let mode = RESIZE_MODES[0] as ResizeModeName;
    const seen = [mode];
    for (let i = 0; i < RESIZE_MODES.length; i++) {
      mode = nextResizeMode(mode);
      seen.push(mode);
    }
    expect(seen[seen.length - 1]).toBe(RESIZE_MODES[0]);
    expect(new Set(seen).size).toBe(RESIZE_MODES.length);
  });
});

describe('track helpers', () => {
  it('names languages and ignores undetermined ones', () => {
    expect(languageName('en')).toBe('English');
    expect(languageName('hi-IN')).toBe('Hindi');
    expect(languageName('xx')).toBe('xx');
    expect(languageName('und')).toBeUndefined();
    expect(languageName(undefined)).toBeUndefined();
  });
  it('labels tracks from title, language or position', () => {
    expect(trackLabel({ index: 0, title: 'Commentary', language: 'en' }, 0)).toBe(
      'Commentary (English)',
    );
    expect(trackLabel({ index: 0, title: 'English', language: 'en' }, 0)).toBe('English');
    expect(trackLabel({ index: 1, language: 'ta' }, 1)).toBe('Tamil');
    expect(trackLabel({ index: 2 }, 2)).toBe('Track 3');
  });
  it('builds options and tolerates missing lists', () => {
    expect(toTrackOptions(undefined)).toEqual([]);
    const [a] = toTrackOptions([{ index: 4, title: ' Main ', selected: true }]);
    expect(a).toMatchObject({ index: 4, label: 'Main', title: 'Main', selected: true });
  });
  it('chooses the most stable way to ask for a track again', () => {
    const [titled, lang, bare] = toTrackOptions([
      { index: 0, title: 'A', language: 'en' },
      { index: 1, language: 'hi' },
      { index: 2 },
    ]);
    expect(choiceForTrack(titled)).toEqual({ type: 'title', value: 'A' });
    expect(choiceForTrack(lang)).toEqual({ type: 'language', value: 'hi' });
    expect(choiceForTrack(bare)).toEqual({ type: 'index', value: 2 });
    expect(choiceMatches({ type: 'language', value: 'hi' }, lang)).toBe(true);
    expect(choiceMatches({ type: 'language', value: 'hi' }, titled)).toBe(false);
    expect(choiceMatches(undefined, { ...bare, selected: true })).toBe(true);
    expect(choiceMatches({ type: 'disabled' }, bare)).toBe(false);
  });
  it('recognises loadable subtitle files by name only', () => {
    expect(subtitleFormatFromName('a.SRT')).toBe('srt');
    expect(subtitleFormatFromName('a.vtt')).toBe('vtt');
    expect(subtitleFormatFromName('a.ttml')).toBe('ttml');
    expect(subtitleFormatFromName('a.ass')).toBeUndefined();
    expect(subtitleFormatFromName('a.sub')).toBeUndefined();
    expect(subtitleFormatFromName('noextension')).toBeUndefined();
    expect(subtitleTitleFromName('My_Movie.en.srt')).toBe('My Movie en');
    expect(subtitleTitleFromName('.srt')).toBe('Subtitles');
  });
});

describe('buildVideoSource', () => {
  const local = { source: { kind: 'local' as const, uri: 'content://m/1', persisted: true } };
  const remote = {
    source: { kind: 'remote' as const, uri: 'https://e.com/a.mp4', format: 'progressive' as const },
  };
  const sub = { uri: 'content://s/1', title: 'Eng', format: 'vtt' as const, persisted: true };

  it('keeps a plain local source plain', () => {
    expect(buildVideoSource(local)).toEqual({ uri: 'content://m/1' });
  });
  it('adds subtitle files to either kind of source', () => {
    const l = buildVideoSource(local, [sub]);
    expect(l.textTracks).toEqual([
      { title: 'Eng', language: 'und', type: 'text/vtt', uri: 'content://s/1' },
    ]);
    expect(l.bufferConfig).toBeUndefined();
    expect(buildVideoSource(remote, [sub]).textTracks).toHaveLength(1);
  });
  it('adds buffering and retry settings to online sources only', () => {
    const r = buildVideoSource(remote);
    expect(r.bufferConfig).toEqual(REMOTE_BUFFER);
    expect(r.minLoadRetryCount).toBe(5);
    expect(r.textTracks).toBeUndefined();
  });
});

describe('playback prefs store', () => {
  const make = (store = createMemoryStore()) =>
    createPlaybackPrefsStore(
      createRepository<Record<string, PlaybackPrefs>>({
        key: 'p',
        version: 1,
        defaults: () => ({}),
        validate: (d): d is Record<string, PlaybackPrefs> => typeof d === 'object' && d !== null,
        storage: () => store,
      }),
    );
  const sub = (uri: string) => ({ uri, title: uri, format: 'srt' as const, persisted: false });

  it('keeps choices per video and persists them', () => {
    const store = createMemoryStore();
    const prefs = make(store);
    prefs.getState().patch('a', { audio: { type: 'language', value: 'hi' } });
    prefs.getState().patch('b', { resizeMode: 'cover' });
    prefs.getState().patch('a', { text: { type: 'disabled' } });
    const reopened = make(store).getState().byItem;
    expect(reopened.a).toMatchObject({
      audio: { type: 'language', value: 'hi' },
      text: { type: 'disabled' },
    });
    expect(reopened.b.resizeMode).toBe('cover');
  });
  it('adds a subtitle file once, removes it, and clears a video', () => {
    const prefs = make();
    prefs.getState().addSubtitle('a', sub('u1'));
    prefs.getState().addSubtitle('a', sub('u1'));
    prefs.getState().addSubtitle('a', sub('u2'));
    expect(prefs.getState().byItem.a.subtitles.map((s) => s.uri)).toEqual(['u1', 'u2']);
    prefs.getState().removeSubtitle('a', 'u1');
    expect(prefs.getState().byItem.a.subtitles.map((s) => s.uri)).toEqual(['u2']);
    prefs.getState().clear('a');
    expect(prefs.getState().byItem.a).toBeUndefined();
  });
});

describe('settings saved by an earlier version', () => {
  it('gain new fields from the defaults instead of losing them or resetting', () => {
    const store = createMemoryStore();
    const repo = createRepository<Settings>({
      key: 's',
      version: 1,
      defaults: () => ({ ...DEFAULT_SETTINGS }),
      validate: (d): d is Settings => typeof d === 'object' && d !== null,
      storage: () => store,
    });
    // Phase 2 settings: no `autoPip`.
    repo.save({ resumeEnabled: false, defaultSpeed: 1.5, placeholdersSeeded: true });
    const state = createSettingsStore(repo).getState();
    expect(state).toMatchObject({ resumeEnabled: false, defaultSpeed: 1.5, autoPip: false });
  });
});
