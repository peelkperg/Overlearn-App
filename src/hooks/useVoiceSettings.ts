import { useSyncExternalStore } from 'react';

import * as voiceSettings from '@/lib/voice-settings';

// Mirrors useSettings()'s useSyncExternalStore pattern — the Active Session
// screen's MicToggle and the Voice triggers settings sub-screen must never
// diverge on the saved template set.
export function useVoiceSettings() {
  return {
    voiceSettings: useSyncExternalStore(voiceSettings.subscribeToVoiceSettings, voiceSettings.readVoiceSettings),
    saveVoiceTriggers: voiceSettings.saveVoiceTriggers,
  };
}
