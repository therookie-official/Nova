export type OrientationLock = 'auto' | 'landscape' | 'portrait';

/**
 * What the full-screen button does next. From automatic rotation it flips to the opposite of
 * what is on screen; from a locked orientation it returns to automatic rotation.
 */
export function nextOrientationLock(
  current: OrientationLock,
  windowIsLandscape: boolean,
): OrientationLock {
  if (current !== 'auto') return 'auto';
  return windowIsLandscape ? 'portrait' : 'landscape';
}

/** The picture fills the screen (system bars hidden) in landscape or whenever landscape is locked. */
export function isImmersive(lock: OrientationLock, windowIsLandscape: boolean): boolean {
  return lock === 'landscape' || (lock === 'auto' && windowIsLandscape);
}

export const RESIZE_MODES = ['contain', 'cover', 'stretch'] as const;
export type ResizeModeName = (typeof RESIZE_MODES)[number];

export const RESIZE_LABELS: Record<ResizeModeName, string> = {
  contain: 'Fit',
  cover: 'Fill (crop edges)',
  stretch: 'Stretch',
};

export function nextResizeMode(current: ResizeModeName): ResizeModeName {
  return RESIZE_MODES[(RESIZE_MODES.indexOf(current) + 1) % RESIZE_MODES.length];
}
