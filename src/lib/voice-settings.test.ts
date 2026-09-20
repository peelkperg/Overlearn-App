import { storage } from './storage';
import type { VoiceTriggerSet } from './types';
import { readVoiceSettings, saveVoiceTriggers } from './voice-settings';

const triggers: VoiceTriggerSet = { wake: 'd2FrZQ==', correct: 'Y29ycmVjdA==', incorrect: 'aW5jb3JyZWN0' };

describe('lib/voice-settings [SPEC-voice-command-input, CAP-3]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('returns triggers: null when nothing has been saved yet', () => {
    expect(readVoiceSettings()).toEqual({ triggers: null });
  });

  it('persists a saved trigger set and reflects it on the next read', () => {
    saveVoiceTriggers(triggers);
    expect(readVoiceSettings()).toEqual({ triggers });
  });

  it('returns the same object reference across calls when nothing has changed', () => {
    saveVoiceTriggers(triggers);
    const first = readVoiceSettings();
    const second = readVoiceSettings();
    expect(first).toBe(second);
  });

  it('replaces a previously saved set entirely rather than merging fields', () => {
    saveVoiceTriggers(triggers);
    const replacement: VoiceTriggerSet = { wake: 'bmV3d2FrZQ==', correct: 'bmV3Y29ycmVjdA==', incorrect: 'bmV3aW5jb3JyZWN0' };
    saveVoiceTriggers(replacement);
    expect(readVoiceSettings()).toEqual({ triggers: replacement });
  });

  it('falls back to triggers: null and quarantines a corrupted payload', () => {
    storage.set('settings.voice', '{"not":"valid"}');
    expect(readVoiceSettings()).toEqual({ triggers: null });

    const backup = storage.getAllKeys().find((key) => key.startsWith('settings.voice.corrupt.'));
    expect(backup).toBeDefined();
  });
});
