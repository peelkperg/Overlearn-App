import { AudioModule, requestRecordingPermissionsAsync } from 'expo-audio';
import type { AudioStream, AudioStreamBuffer } from 'expo-audio';

import { TRIGGER_RECORD_MAX_MS, type PermissionResult, type VoiceCapture } from '@/lib/voice-capture-types';
import type { PcmAudio } from '@/lib/wav';

// Native capture via expo-audio's AudioModule.AudioStream — a raw PCM
// microphone tap (float32 samples, node_modules/expo-audio's
// AudioStream.types.d.ts), not the file-based AudioRecorder. Chosen over
// AudioRecorder because AndroidOutputFormat (expo-audio's Android recording
// options) has no raw/PCM/WAV entry — only compressed containers this
// codebase has no decoder for — while AudioStream delivers decoded PCM
// directly on both platforms, matching stack.md's "runs on a decoded PCM
// buffer" requirement with no file I/O or format negotiation at all.
//
// Dependency governance (CLAUDE.md §5.2): approved in
// spec-voice-command-input.md's frozen Intent ("Decided") — Expo-core
// maintained, Apache-2.0, on-device only (NFR8/9), same native/web capture
// split precedent this project already has in storage.ts.
//
// Integration risk: AudioModule.AudioStream is a newer, less-documented part
// of expo-audio's surface than the hook-oriented `useAudioStream`/
// `useAudioRecorder` APIs its own docs foreground; this file uses it
// imperatively (module-level, no component) based on reading the installed
// package's own .d.ts files, with no network access in this environment to
// cross-check against expo's published docs or a real device/simulator run.
// The spec's Verification section requires that manual pass before this is
// trusted as shipped.
const SAMPLE_RATE = 16000;

function bufferToFloat32(buffer: AudioStreamBuffer): Float32Array {
  // encoding: 'float32' below guarantees `data` is already 4-byte float
  // samples (AudioStream.types.d.ts), so no int16 conversion path is needed.
  return new Float32Array(buffer.data);
}

function concatFloat32(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function createStream(): AudioStream {
  // AudioModule is a default-exported NativeModule *instance* (see
  // node_modules/expo-audio/build/AudioModule.d.ts), not a static namespace
  // — eslint-plugin-import's static namespace analysis doesn't resolve
  // AudioStream as one of its members even though the installed .d.ts
  // (AudioModule.types.d.ts: `readonly AudioStream: typeof AudioStream`)
  // types it correctly, hence the disable below.
  // eslint-disable-next-line import/namespace
  return new AudioModule.AudioStream({ sampleRate: SAMPLE_RATE, channels: 1, encoding: 'float32' });
}

async function captureFor(durationMs: number): Promise<PcmAudio> {
  const stream = createStream();
  const chunks: Float32Array[] = [];
  let actualSampleRate = SAMPLE_RATE;
  const subscription = stream.addListener('audioStreamBuffer', (buffer: AudioStreamBuffer) => {
    chunks.push(bufferToFloat32(buffer));
    actualSampleRate = buffer.sampleRate;
  });
  try {
    await stream.start();
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  } finally {
    subscription.remove();
    stream.stop();
  }
  return { samples: concatFloat32(chunks), sampleRate: actualSampleRate };
}

let activeStream: AudioStream | null = null;
let activeSubscription: { remove(): void } | null = null;
let listenTimer: ReturnType<typeof setInterval> | null = null;

export const voiceCapture: VoiceCapture = {
  async requestPermission(): Promise<PermissionResult> {
    const { granted } = await requestRecordingPermissionsAsync();
    return granted ? 'granted' : 'denied';
  },

  async recordTrigger(): Promise<PcmAudio> {
    return captureFor(TRIGGER_RECORD_MAX_MS);
  },

  stopTriggerRecording(): void {
    // See VoiceCapture's interface comment: no early-stop UI exists yet.
  },

  // A single AudioStream is started once and left running for the whole
  // listening session — genuinely continuous, unlike a chunked
  // record/stop/restart loop — with accumulated samples sliced into
  // windows of roughly windowMs on a timer.
  startListening(onWindow: (window: PcmAudio) => void, windowMs: number): void {
    if (activeStream) return;

    const stream = createStream();
    activeStream = stream;
    let chunks: Float32Array[] = [];
    let actualSampleRate = SAMPLE_RATE;

    activeSubscription = stream.addListener('audioStreamBuffer', (buffer: AudioStreamBuffer) => {
      chunks.push(bufferToFloat32(buffer));
      actualSampleRate = buffer.sampleRate;
    });

    stream.start().catch(() => {
      // A start failure after the toggle is already on (e.g. hardware
      // taken by another app) degrades to "no windows ever fire" rather
      // than throwing out of this synchronous call.
    });

    listenTimer = setInterval(() => {
      if (chunks.length === 0) return;
      const samples = concatFloat32(chunks);
      chunks = [];
      onWindow({ samples, sampleRate: actualSampleRate });
    }, windowMs);
  },

  stopListening(): void {
    if (listenTimer) clearInterval(listenTimer);
    listenTimer = null;
    activeSubscription?.remove();
    activeSubscription = null;
    activeStream?.stop();
    activeStream = null;
  },
};

export default voiceCapture;
