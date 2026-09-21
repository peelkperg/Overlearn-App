import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';
import { bytesToBase64 } from '@/lib/base64';
import type { VoiceTriggerSet } from '@/lib/types';
import { voiceCapture } from '@/lib/voice-capture';
import { checkDistinguishability, extractMfcc, type TriggerName, type VoiceTemplates } from '@/lib/voice-matcher';
import { encodeWav, type PcmAudio } from '@/lib/wav';

const TRIGGER_LABELS: Record<TriggerName, string> = {
  wake: 'Wake sound',
  correct: 'Correct sound',
  incorrect: 'Incorrect sound',
};
const TRIGGER_ORDER: TriggerName[] = ['wake', 'correct', 'incorrect'];

// SPEC-voice-command-input CAP-3. Leaf screen, same shape as
// app/settings.tsx (no header, no back button — relies on the OS back
// gesture/hardware back). Records one take per trigger (Boundaries: "no
// multi-take/re-recording-for-robustness flow") — voiceCapture.recordTrigger()
// itself auto-stops each take at 2s.
export default function VoiceTriggersScreen() {
  const { voiceSettings, saveVoiceTriggers } = useVoiceSettings();
  const [recordings, setRecordings] = useState<Partial<Record<TriggerName, PcmAudio>>>({});
  const [recording, setRecording] = useState<TriggerName | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectedPairs, setRejectedPairs] = useState<[TriggerName, TriggerName][] | null>(null);
  const [saved, setSaved] = useState(false);

  const handleRecord = async (trigger: TriggerName) => {
    setError(null);
    setRejectedPairs(null);
    setSaved(false);
    setRecording(trigger);
    try {
      const pcm = await voiceCapture.recordTrigger();
      // [Review][Patch] A near-empty/silent take extracts to zero MFCC
      // frames, which dtwDistance treats as Infinity against anything —
      // including the other two templates — so it would otherwise sail
      // through checkDistinguishability as "distinguishable" and get saved
      // as an unmatchable template. Reject it here, before it ever reaches
      // `recordings`, using the same error state as a genuine capture
      // failure.
      if (extractMfcc(pcm).length === 0) {
        setError(`Could not record the ${TRIGGER_LABELS[trigger].toLowerCase()}. That take was silent or too short — try again.`);
        return;
      }
      setRecordings((prev) => ({ ...prev, [trigger]: pcm }));
    } catch {
      setError(`Could not record the ${TRIGGER_LABELS[trigger].toLowerCase()}. Check microphone access and try again.`);
    } finally {
      setRecording(null);
    }
  };

  const handleSave = () => {
    setError(null);
    setRejectedPairs(null);
    setSaved(false);
    const { wake, correct, incorrect } = recordings;
    if (!wake || !correct || !incorrect) {
      setError('Record all three sounds before saving.');
      return;
    }

    const templates: VoiceTemplates = { wake, correct, incorrect };
    const distinguishability = checkDistinguishability(templates);
    if (!distinguishability.ok) {
      // CAP-3 / I/O matrix: save blocked, prior valid template set (if any)
      // left untouched — saveVoiceTriggers is simply never called here.
      setRejectedPairs(distinguishability.tooSimilarPairs);
      return;
    }

    try {
      const encode = (pcm: PcmAudio) => bytesToBase64(encodeWav(pcm));
      const triggers: VoiceTriggerSet = { wake: encode(wake), correct: encode(correct), incorrect: encode(incorrect) };
      saveVoiceTriggers(triggers);
      setRecordings({});
      setSaved(true);
    } catch {
      setError('Could not save the trigger set. Check that the device has free storage.');
    }
  };

  const hasSavedSet = Boolean(voiceSettings.triggers);
  const allRecorded = TRIGGER_ORDER.every((trigger) => recordings[trigger]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Voice triggers</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Record any sound — a word, a clap, a hum, a tap — for each trigger. One take each, capped at 2 seconds.
        </ThemedText>
        {hasSavedSet && !saved && (
          <ThemedText testID="voice-triggers-saved-notice" type="small" themeColor="textSecondary">
            A saved trigger set exists. Recording and saving new takes replaces it once all three pass the check below.
          </ThemedText>
        )}
        {saved && (
          <ThemedText testID="voice-triggers-save-success" type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
            Saved.
          </ThemedText>
        )}
        {error && (
          <ThemedText testID="voice-triggers-error" type="small" themeColor="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
        )}
        {rejectedPairs && (
          <ThemedText
            testID="voice-triggers-rejected"
            type="small"
            themeColor="danger"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {`Too similar to tell apart: ${rejectedPairs.map(([a, b]) => `${TRIGGER_LABELS[a]} / ${TRIGGER_LABELS[b]}`).join(', ')}. Re-record and try again.`}
          </ThemedText>
        )}
        {TRIGGER_ORDER.map((trigger) => (
          <ThemedView key={trigger} style={styles.row}>
            <ThemedText>{TRIGGER_LABELS[trigger]}</ThemedText>
            <Pressable
              testID={`record-${trigger}`}
              style={styles.recordButton}
              onPress={() => handleRecord(trigger)}
              disabled={recording !== null}
              accessibilityRole="button"
              accessibilityLabel={`Record ${TRIGGER_LABELS[trigger]}`}
            >
              <ThemedText>{recording === trigger ? 'Recording…' : recordings[trigger] ? 'Re-record' : 'Record'}</ThemedText>
            </Pressable>
            {recordings[trigger] && (
              <ThemedText testID={`recorded-${trigger}`} type="small" themeColor="textSecondary">
                Recorded
              </ThemedText>
            )}
          </ThemedView>
        ))}
        <Pressable
          testID="save-voice-triggers"
          style={[styles.saveButton, !allRecorded && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!allRecorded}
          accessibilityRole="button"
          accessibilityLabel="Save voice triggers"
        >
          <ThemedText themeColor="accentText">Save</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: {
    flex: 1,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  recordButton: { minHeight: 44, paddingHorizontal: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  saveButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#127A45', borderRadius: 8 },
  saveButtonDisabled: { opacity: 0.4 },
});
