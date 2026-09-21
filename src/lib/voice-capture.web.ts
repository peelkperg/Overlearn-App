import type { PcmAudio } from '@/lib/wav';
import { TRIGGER_RECORD_MAX_MS, type PermissionResult, type VoiceCapture } from '@/lib/voice-capture-types';

// Web capture via the Web Audio API directly on the getUserMedia stream —
// Decided (Intent): "custom Web Audio API/MediaRecorder (web)". A direct
// ScriptProcessorNode PCM tap is used instead of MediaRecorder: MediaRecorder
// only emits compressed (webm/opus) output, which would need decoding back
// to PCM for the matcher — this codebase has no such decoder, per stack.md's
// "no library" constraint on the matching engine's input.
const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096;

let stream: MediaStream | null = null;
let activeContext: AudioContext | null = null;
let listening = false;

async function ensureStream(): Promise<MediaStream> {
  if (!stream) {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: SAMPLE_RATE } });
  }
  return stream;
}

function captureWindow(mediaStream: MediaStream, durationMs: number): Promise<PcmAudio> {
  return new Promise((resolve) => {
    const context = new AudioContext({ sampleRate: SAMPLE_RATE });
    activeContext = context;
    const source = context.createMediaStreamSource(mediaStream);
    // ScriptProcessorNode is deprecated in favor of AudioWorkletNode, but is
    // used here deliberately: it's a synchronous, dependency-free way to
    // read raw PCM samples straight off the stream on every browser this
    // app targets, with no separate worklet module to load — an
    // AudioWorklet would be the modern choice but adds build/deployment
    // complexity this feature doesn't otherwise need.
    const processor = context.createScriptProcessor(BUFFER_SIZE, 1, 1);
    const chunks: Float32Array[] = [];
    let total = 0;
    const stopAt = Date.now() + durationMs;
    let settled = false;

    // [Review][Patch] awaits context.close() before resolving — previously
    // fired-and-forgot it, so the next captureWindow() call (the very next
    // listening window, or a trigger recording started right after) could
    // create a new AudioContext before this one had actually finished
    // closing.
    const finish = async () => {
      if (settled) return;
      settled = true;
      try {
        source.disconnect();
        processor.disconnect();
      } catch {
        // Disconnecting an already-torn-down node is harmless; ignored.
      }
      try {
        await context.close();
      } catch {
        // Closing an already-closing/closed context can reject; harmless.
      }
      if (activeContext === context) activeContext = null;
      const samples = new Float32Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        samples.set(chunk, offset);
        offset += chunk.length;
      }
      resolve({ samples, sampleRate: context.sampleRate });
    };

    processor.onaudioprocess = (event: AudioProcessingEvent) => {
      const input = event.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(input));
      total += input.length;
      if (Date.now() >= stopAt) finish();
    };
    source.connect(processor);
    processor.connect(context.destination);

    // Defensive stop in case onaudioprocess never fires again after stopAt
    // (e.g. the tab is backgrounded and audio callbacks stall) — without
    // this, a window could hang indefinitely instead of resolving with
    // whatever was captured so far.
    setTimeout(finish, durationMs + 2000);
  });
}

export const voiceCapture: VoiceCapture = {
  async requestPermission(): Promise<PermissionResult> {
    try {
      await ensureStream();
      return 'granted';
    } catch {
      return 'denied';
    }
  },

  async recordTrigger(): Promise<PcmAudio> {
    const mediaStream = await ensureStream();
    return captureWindow(mediaStream, TRIGGER_RECORD_MAX_MS);
  },

  stopTriggerRecording(): void {
    // See VoiceCapture's interface comment: no early-stop UI exists yet.
  },

  startListening(onWindow: (window: PcmAudio) => void, windowMs: number): void {
    if (listening) return;
    listening = true;

    const loop = async () => {
      if (!listening) return;
      try {
        const mediaStream = await ensureStream();
        const window = await captureWindow(mediaStream, windowMs);
        if (listening) onWindow(window);
      } catch {
        // See voice-capture.ts's identical comment: a failed window must not
        // kill the listening loop.
      }
      if (listening) loop();
    };
    loop();
  },

  stopListening(): void {
    listening = false;
    if (activeContext && activeContext.state !== 'closed') {
      activeContext.close().catch(() => {});
    }
    activeContext = null;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
  },
};

export default voiceCapture;
