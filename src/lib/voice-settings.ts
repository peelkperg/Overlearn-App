import { getObject, getString, setObject, subscribeToKeys } from '@/lib/storage';
import { isVoiceSettings, type VoiceSettings, type VoiceTriggerSet } from '@/lib/types';

// SPEC-voice-command-input: separate storage key from settings.general —
// Boundaries: "New settings follow src/lib/settings.ts's module shape
// (storage key, isXxx guard in types.ts, subscribeToKeys)". Kept as its own
// key/module rather than folded into Settings so a corrupt voice-settings
// payload quarantines independently of the unrelated overlearning/sort
// settings (same isolation settings.ts already gives sortKey vs.
// overlearningPercent by living in one object, extended here to a second,
// unrelated feature rather than widening that one object further).
const VOICE_SETTINGS_KEY = 'settings.voice';

// mic-enabled is deliberately NOT part of this persisted shape: Boundaries
// requires it default off in *every* new/resumed session, which a stored
// "on" value would have to be force-reset on every read anyway — equivalent
// to never having persisted it. It lives as component-local state in
// MicToggle.tsx instead, which remounts (and so resets) each time
// session/[id].tsx is (re)entered.
const DEFAULT_VOICE_SETTINGS: VoiceSettings = { triggers: null };

let cachedRaw: string | undefined;
let cachedLoaded = false;
let snapshot: VoiceSettings = DEFAULT_VOICE_SETTINGS;

export function readVoiceSettings(): VoiceSettings {
  const raw = getString(VOICE_SETTINGS_KEY);
  if (!cachedLoaded || raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLoaded = true;
    snapshot = getObject<VoiceSettings>(VOICE_SETTINGS_KEY, isVoiceSettings) ?? DEFAULT_VOICE_SETTINGS;
  }
  return snapshot;
}

export function subscribeToVoiceSettings(onChange: () => void): () => void {
  return subscribeToKeys((key) => {
    if (key === VOICE_SETTINGS_KEY) onChange();
  });
}

// CAP-3: callers must run lib/voice-matcher.ts's checkDistinguishability
// against the candidate set first and only call this once it passes — this
// function performs no distinguishability check of its own, so a rejected
// set never reaches here and whatever was previously saved (if anything)
// stays untouched (I/O matrix: "prior valid template set ... unchanged").
export function saveVoiceTriggers(triggers: VoiceTriggerSet): void {
  setObject(VOICE_SETTINGS_KEY, { triggers });
}
