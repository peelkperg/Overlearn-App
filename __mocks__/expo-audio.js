// expo-audio's own module eagerly touches a native module registry at
// import time (src/ExpoAudio.ts), which crashes under Jest (no native
// binary exists) the same way react-native-nitro-modules does — see that
// mock's header comment for the pattern this follows. Any screen test that
// renders session/[id].tsx now transitively imports '@/lib/voice-capture'
// (via components/session/MicToggle.tsx), which imports 'expo-audio', so
// this mock must exist even for tests that never touch voice commands
// themselves; src/lib/__mocks__/voice-capture.ts is the one tests that
// actually exercise MicToggle should use instead (via
// `jest.mock('@/lib/voice-capture')`), which bypasses this file entirely.
class AudioStream {
  addListener() {
    return { remove: () => {} };
  }
  start() {
    return Promise.resolve();
  }
  stop() {}
}

module.exports = {
  AudioModule: {
    AudioStream,
    requestRecordingPermissionsAsync: () => Promise.resolve({ granted: false, status: 'denied', expires: 'never', canAskAgain: true }),
  },
  requestRecordingPermissionsAsync: () => Promise.resolve({ granted: false, status: 'denied', expires: 'never', canAskAgain: true }),
};
