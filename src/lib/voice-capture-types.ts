import type { PcmAudio } from '@/lib/wav';

// Boundaries: "Each trigger recording auto-stops at 2s."
export const TRIGGER_RECORD_MAX_MS = 2000;

export type PermissionResult = 'granted' | 'denied';

// One interface, two implementations (voice-capture.ts native / expo-audio,
// voice-capture.web.ts web / MediaRecorder+Web Audio API) — mirrors
// storage.ts's native/web split (Decided, Intent). voice-matcher.ts never
// imports either implementation directly; only PcmAudio crosses the
// boundary, so the matcher stays platform-agnostic per stack.md.
export interface VoiceCapture {
  // Requests OS/browser mic permission. Constraints: "requested only the
  // first time the user turns the voice-command toggle on" — callers must
  // not call this from anywhere but that toggle's on-handler; the
  // underlying platform APIs are themselves idempotent (a second call when
  // already granted resolves without re-prompting), so no "have we asked
  // before" flag needs to be persisted here.
  requestPermission(): Promise<PermissionResult>;

  // Records a single trigger take, auto-stopping at TRIGGER_RECORD_MAX_MS
  // (Boundaries) and resolving with the decoded PCM.
  recordTrigger(): Promise<PcmAudio>;

  // Manual early stop for an in-progress recordTrigger() call. No caller in
  // this scope's UI exposes a "stop early" control (voice-triggers.tsx
  // always lets the 2s cap end the take) — kept on the interface as a no-op
  // implementation so a future UI addition doesn't need an interface change.
  stopTriggerRecording(): void;

  // Starts continuous listening: onWindow fires once per captured window of
  // roughly windowMs until stopListening() is called. CAP-2: zero capture
  // must happen while the mic toggle is off — callers must not invoke this
  // except from the toggle's on-handler, and must call stopListening() on
  // every path that turns the toggle off (including unmount).
  startListening(onWindow: (window: PcmAudio) => void, windowMs: number): void;

  stopListening(): void;
}
