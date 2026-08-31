// react-native-mmkv's createMMKV() routes to a pure-JS mock under Jest
// (see react-native-mmkv/lib/isTest.js), which never touches this module's
// real exports. But react-native-nitro-modules' own package index eagerly
// calls the native Turbo module registry at import time, which crashes
// under Jest since no native binary exists. This mock short-circuits that
// import chain so the eager load succeeds harmlessly.
module.exports = {
  NitroModules: {
    createHybridObject: () => {
      throw new Error(
        'react-native-nitro-modules is mocked in Jest — this should never be called; ' +
          'react-native-mmkv should be using its isTest() mock path instead.',
      );
    },
  },
};
