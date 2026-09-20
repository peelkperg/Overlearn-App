// Manual mock for '@/lib/voice-capture' — jest-expo resolves the platform
// extension for `@/lib/voice-capture` to the native file by default, and
// neither native file (expo-audio) nor the web file (browser-only globals)
// is exercisable under Jest's node/jsdom test environment. Tests that need
// capture behavior call `jest.mock('@/lib/voice-capture')` explicitly to
// pull this in instead, then drive it via the __* helpers below.
import type { PcmAudio } from '@/lib/wav';
import type { PermissionResult, VoiceCapture } from '@/lib/voice-capture-types';

let permissionResult: PermissionResult = 'granted';
let onWindow: ((window: PcmAudio) => void) | null = null;
let listeningActive = false;

export function __setPermissionResult(result: PermissionResult): void {
  permissionResult = result;
}

export function __isListening(): boolean {
  return listeningActive;
}

// Test-driven substitute for a real captured audio window — feeds `window`
// through the same handler startListening() was given, only while the mock
// considers itself "listening" (mirrors CAP-2: no capture reaches the
// matcher once stopped).
export function __emitWindow(window: PcmAudio): void {
  if (listeningActive) onWindow?.(window);
}

export function __reset(): void {
  permissionResult = 'granted';
  onWindow = null;
  listeningActive = false;
}

const silence: PcmAudio = { samples: new Float32Array(1600), sampleRate: 16000 };

export const voiceCapture: VoiceCapture = {
  requestPermission: jest.fn(async () => permissionResult),
  recordTrigger: jest.fn(async () => silence),
  stopTriggerRecording: jest.fn(),
  startListening: jest.fn((handler: (window: PcmAudio) => void) => {
    onWindow = handler;
    listeningActive = true;
  }),
  stopListening: jest.fn(() => {
    listeningActive = false;
    onWindow = null;
  }),
};

export default voiceCapture;
