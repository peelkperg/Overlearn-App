import * as Haptics from 'expo-haptics';

// Feedback Signal System (UX-DR3): coordinates the four feedback tiers
// (ordinary tap, incorrect pulse, target-raise alert, completion) across
// haptic/visual/audio channels. Only the minimal tier is implemented so
// far — mild/alert/completion land in Stories 2.3 and 2.5.
export function useFeedbackSignal() {
  // Minimal tier (FR18): light haptic tick only, on an ordinary Correct tap.
  const minimal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  return { minimal };
}
