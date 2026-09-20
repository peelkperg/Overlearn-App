import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';
import { base64ToBytes } from '@/lib/base64';
import { voiceCapture } from '@/lib/voice-capture';
import { VoiceMatcher } from '@/lib/voice-matcher';
import { decodeWav, type PcmAudio } from '@/lib/wav';

const LISTEN_WINDOW_MS = 1500;

type MicToggleProps = {
  onCorrect: () => void;
  onIncorrect: () => void;
};

// SPEC-voice-command-input CAP-1/CAP-2. Opt-in mic toggle on the Active
// Session screen. `micOn` starts false on every mount, with no persisted
// counterpart to reset (see voice-settings.ts's header comment) — this
// component remounts every time session/[id].tsx is (re)entered, which
// alone satisfies Boundaries: "Mic toggle defaults off in every
// new/resumed session".
//
// onCorrect/onIncorrect are the caller's own runAction-wrapped
// useActiveSession().logCorrect/logIncorrect (CAP-1 parity, Code Map) —
// this component never calls session-transitions.ts or writes session
// state itself.
export function MicToggle({ onCorrect, onIncorrect }: MicToggleProps) {
  const { voiceSettings } = useVoiceSettings();
  const [micOn, setMicOn] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const matcherRef = useRef<VoiceMatcher | null>(null);

  const stop = useCallback(() => {
    voiceCapture.stopListening();
    matcherRef.current = null;
    setMicOn(false);
  }, []);

  // [Review][Patch] CAP-2: zero capture once this screen isn't the one the
  // user is looking at, even if the toggle was left on — the Stack
  // navigator keeps session/[id].tsx (and this component) mounted while the
  // user is on another screen (e.g. Settings/voice-triggers), so an
  // unmount-only cleanup missed that case and left capture running,
  // contending with that screen's own trigger recording. useFocusEffect's
  // cleanup runs on blur *and* unmount, covering both.
  useFocusEffect(
    useCallback(() => {
      return () => stop();
    }, [stop]),
  );

  const start = async () => {
    if (!voiceSettings.triggers) return; // nothing recorded yet (CAP-3) — nothing to match against

    try {
      // Constraints: OS permission requested only the first time the
      // toggle is turned on, never at install — this call site is the only
      // place in the app that requests it.
      const result = await voiceCapture.requestPermission();
      if (result !== 'granted') {
        // I/O matrix: "Toggle reverts to off; denial state surfaced to user".
        setPermissionDenied(true);
        setMicOn(false);
        return;
      }
      setPermissionDenied(false);

      const decode = (base64: string): PcmAudio => decodeWav(base64ToBytes(base64));
      matcherRef.current = new VoiceMatcher({
        wake: decode(voiceSettings.triggers.wake),
        correct: decode(voiceSettings.triggers.correct),
        incorrect: decode(voiceSettings.triggers.incorrect),
      });

      voiceCapture.startListening((window) => {
        const matched = matcherRef.current?.processWindow(window, Date.now());
        if (matched === 'correct') onCorrect();
        else if (matched === 'incorrect') onIncorrect();
      }, LISTEN_WINDOW_MS);
      setMicOn(true);
    } catch {
      // [Review][Patch] A thrown failure here (requestPermission rejecting,
      // a corrupt saved template failing to decode, etc.) is not the same
      // as a clean "denied" result — left unhandled, it's an unhandled
      // promise rejection and the toggle is silently stuck off with no
      // feedback. Degrades to the same surfaced state the I/O matrix's
      // permission-denied path already uses, and makes sure nothing is left
      // listening.
      voiceCapture.stopListening();
      matcherRef.current = null;
      setPermissionDenied(true);
      setMicOn(false);
    }
  };

  const handleToggle = () => {
    if (micOn) {
      stop();
    } else {
      start();
    }
  };

  const hasTriggers = Boolean(voiceSettings.triggers);

  return (
    <>
      <Pressable
        testID="mic-toggle"
        style={styles.button}
        onPress={handleToggle}
        disabled={!hasTriggers}
        accessibilityRole="button"
        accessibilityLabel={micOn ? 'Turn off voice commands' : 'Turn on voice commands'}
        accessibilityState={{ selected: micOn, disabled: !hasTriggers }}
      >
        <ThemedText themeColor={micOn ? 'accent' : 'textSecondary'}>🎙</ThemedText>
      </Pressable>
      {permissionDenied && (
        <ThemedText testID="mic-permission-denied" type="small" themeColor="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">
          Microphone permission denied. Voice commands are off.
        </ThemedText>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
