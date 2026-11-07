import {
  buildPlayerSource,
  getResumePosition,
  positionFromTouch,
  shouldPersistProgress,
  skipTarget,
  titleFromFileName,
} from '@/services/playback/session';
import type { MediaItem } from '@/types/media';

const progress = (positionMs: number, durationMs = 100_000) => ({
  itemId: 'a',
  positionMs,
  durationMs,
  updatedAt: 1,
});

describe('getResumePosition', () => {
  it('resumes mid-way', () => {
    expect(getResumePosition({ progress: progress(40_000), resumeEnabled: true })).toBe(40_000);
  });
  it('starts over when resume is off, nothing saved, barely started, or finished', () => {
    expect(getResumePosition({ progress: progress(40_000), resumeEnabled: false })).toBe(0);
    expect(getResumePosition({ progress: undefined, resumeEnabled: true })).toBe(0);
    expect(getResumePosition({ progress: progress(2_000), resumeEnabled: true })).toBe(0);
    expect(getResumePosition({ progress: progress(96_000), resumeEnabled: true })).toBe(0);
  });
});

describe('shouldPersistProgress', () => {
  it('waits for a real start, then saves every few seconds', () => {
    expect(shouldPersistProgress(undefined, 1_000)).toBe(false);
    expect(shouldPersistProgress(undefined, 6_000)).toBe(true);
    expect(shouldPersistProgress(10_000, 12_000)).toBe(false);
    expect(shouldPersistProgress(10_000, 15_000)).toBe(true);
    expect(shouldPersistProgress(60_000, 10_000)).toBe(true); // seeked backwards
  });
});

describe('skipTarget and positionFromTouch', () => {
  it('clamps to the video', () => {
    expect(skipTarget(5_000, -10_000, 100_000)).toBe(0);
    expect(skipTarget(95_000, 10_000, 100_000)).toBe(100_000);
    expect(skipTarget(50_000, 10_000, 100_000)).toBe(60_000);
  });
  it('maps touches and ignores unknown size', () => {
    expect(positionFromTouch(50, 100, 200_000)).toBe(100_000);
    expect(positionFromTouch(-20, 100, 200_000)).toBe(0);
    expect(positionFromTouch(500, 100, 200_000)).toBe(200_000);
    expect(positionFromTouch(10, 0, 200_000)).toBe(0);
    expect(positionFromTouch(10, 100, 0)).toBe(0);
  });
});

describe('buildPlayerSource', () => {
  const item = (source: MediaItem['source']) => ({ source });
  it('passes the content:// URI through for local files', () => {
    expect(
      buildPlayerSource(item({ kind: 'local', uri: 'content://media/1', persisted: true })),
    ).toEqual({ uri: 'content://media/1' });
  });
  it('sets the stream type for HLS and DASH only', () => {
    const remote = (format: 'progressive' | 'hls' | 'dash') =>
      buildPlayerSource(item({ kind: 'remote', uri: 'https://e.com/x', format }));
    expect(remote('progressive')).toEqual({ uri: 'https://e.com/x' });
    expect(remote('hls')).toEqual({ uri: 'https://e.com/x', type: 'm3u8' });
    expect(remote('dash')).toEqual({ uri: 'https://e.com/x', type: 'mpd' });
  });
});

describe('titleFromFileName', () => {
  it('cleans file names', () => {
    expect(titleFromFileName('Movie_Name.2021.1080p.mkv')).toBe('Movie Name 2021 1080p');
    expect(titleFromFileName('  ')).toBe('Untitled video');
    expect(titleFromFileName(undefined)).toBe('Untitled video');
  });
});
