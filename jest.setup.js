/* global jest */

// MMKV is a native (Nitro) module and cannot load in Jest. This in-memory stand-in
// has the same surface Nova uses, so store and repository code runs unchanged.
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    const data = new Map();
    return {
      getString: (key) => data.get(key),
      set: (key, value) => {
        data.set(key, value);
      },
      remove: (key) => data.delete(key),
      clearAll: () => data.clear(),
      getAllKeys: () => Array.from(data.keys()),
    };
  },
}));

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
