import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Vibration } from 'react-native';

import * as Haptics from 'expo-haptics';

const INCORRECT_PULSE_MS = 500;
const TARGET_RAISE_FLASH_MS = 600;

// Feedback Signal System (UX-DR3): coordinates the four feedback tiers
// (ordinary tap, incorrect pulse, target-raise alert, completion) across
// haptic/visual/audio channels. Sound is a tracked gap — no asset exists
// yet (src/assets/sounds/ is a placeholder) — every other channel per
// tier is implemented.
export function useFeedbackSignal() {
  const [incorrectPulse, setIncorrectPulse] = useState(false);
  const [targetRaiseFlash, setTargetRaiseFlash] = useState(false);
  const [settled, setSettled] = useState(false);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A pending timer firing after unmount calls setState on a gone
  // component (Restart, Done, and Repeat can all unmount/remount this
  // hook's owner mid-flight).
  useEffect(() => {
    return () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

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
  // (no asset — see module note above). Vibration/AccessibilityInfo aren't
  // Promise-based like Haptics, so a synchronous throw here (no vibration
  // motor, no accessibility service) is caught explicitly rather than left
  // to propagate out of the tap handler that triggered it.
  const alert = (announcement: string) => {
    try {
      Vibration.vibrate();
      AccessibilityInfo.announceForAccessibility(announcement);
    } catch {
      // Degraded feedback on this device — the state write already
      // succeeded and must not be undone by a channel failing.
    }
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setTargetRaiseFlash(true);
    flashTimer.current = setTimeout(() => setTargetRaiseFlash(false), TARGET_RAISE_FLASH_MS);
  };

  // Completion tier (FR12, UX-DR3): haptic pulse + visual settle +
  // screen-reader announcement, distinct from the alert tier — no
  // auto-clear, since the session stays complete until the screen changes
  // (Story 2.6) or reset() is called (Story 2.8's Repeat). Sound omitted
  // (no asset — see module note above).
  const completion = (announcement: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      AccessibilityInfo.announceForAccessibility(announcement);
    } catch {
      // Degraded feedback — see alert() above.
    }
    setSettled(true);
  };

  // Story 2.8: Repeat begins a fresh, incomplete session on the same
  // mounted screen — without this, `settled` (and any pending pulse/flash)
  // from the just-finished session would bleed into it. Called by
  // useActiveSession's start()/restart().
  const reset = () => {
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setIncorrectPulse(false);
    setTargetRaiseFlash(false);
    setSettled(false);
  };

  return { minimal, mild, alert, completion, reset, incorrectPulse, targetRaiseFlash, settled };
}
