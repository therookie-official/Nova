import { NovaSaf } from '../../../modules/nova-saf/src';

/**
 * Safe wrapper over the native module. Every call degrades to "not persisted" instead of
 * throwing, so a missing or failing native module never blocks importing a video.
 */
export const safAccess = {
  isAvailable: (): boolean => NovaSaf !== null,

  async persist(uri: string): Promise<boolean> {
    if (!NovaSaf) return false;
    try {
      return await NovaSaf.persistReadAccess(uri);
    } catch {
      return false;
    }
  },

  /** Undefined when it cannot be checked (no native module). */
  async hasAccess(uri: string): Promise<boolean | undefined> {
    if (!NovaSaf) return undefined;
    try {
      return await NovaSaf.hasReadAccess(uri);
    } catch {
      return undefined;
    }
  },

  /** Undefined when it cannot be checked (no native module). */
  async isPictureInPictureSupported(): Promise<boolean | undefined> {
    if (!NovaSaf) return undefined;
    try {
      return await NovaSaf.isPictureInPictureSupported();
    } catch {
      return undefined;
    }
  },

  async release(uri: string): Promise<void> {
    if (!NovaSaf) return;
    try {
      await NovaSaf.releaseReadAccess(uri);
    } catch {
      // Nothing useful to do; the item is being removed anyway.
    }
  },
};
