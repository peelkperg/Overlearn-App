import { useRef, useState } from 'react';
import { AccessibilityInfo, Vibration } from 'react-native';

import * as Haptics from 'expo-haptics';

const INCORRECT_PULSE_MS = 500;
const TARGET_RAISE_FLASH_MS = 600;

// Feedback Signal System (UX-DR3): coordinates the four feedback tiers
// (ordinary tap, incorrect pulse, target-raise alert, completion) across
// haptic/visual/audio channels. Sound is a tracked gap — no asset exists
// yet (src/assets/sounds/ is a placeholder) — every other channel per
// tier is implemented. Completion tier lands in Story 2.5.
export function useFeedbackSignal() {
  const [incorrectPulse, setIncorrectPulse] = useState(false);
  const [targetRaiseFlash, setTargetRaiseFlash] = useState(false);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Minimal tier (FR18): light haptic tick only, on an ordinary Correct tap.
  const minimal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  // Mild tier (FR17): brief color pulse + light haptic, on an Incorrect tap
  // that doesn't raise the target.
  const mild = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    setIncorrectPulse(true);
    pulseTimer.current = setTimeout(() => setIncorrectPulse(false), INCORRECT_PULSE_MS);
  };

  // Alert tier (FR10, UX-DR3): screen flash + vibration + screen-reader
  // announcement, on an Incorrect tap that raises the target. Sound omitted
  // (no asset — see module note above).
  const alert = (announcement: string) => {
    Vibration.vibrate();
    AccessibilityInfo.announceForAccessibility(announcement);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setTargetRaiseFlash(true);
    flashTimer.current = setTimeout(() => setTargetRaiseFlash(false), TARGET_RAISE_FLASH_MS);
  };

  return { minimal, mild, alert, incorrectPulse, targetRaiseFlash };
}
