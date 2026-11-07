import { requireOptionalNativeModule } from 'expo-modules-core';

export interface NovaSafNative {
  persistReadAccess(uri: string): Promise<boolean>;
  hasReadAccess(uri: string): Promise<boolean>;
  releaseReadAccess(uri: string): Promise<void>;
  isPictureInPictureSupported(): Promise<boolean>;
}

/** Null when the native module is not part of this build (tests, web, or a build without it). */
export const NovaSaf: NovaSafNative | null = requireOptionalNativeModule<NovaSafNative>('NovaSaf');
