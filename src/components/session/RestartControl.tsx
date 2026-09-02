import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SessionColors } from '@/components/session/colors';

type RestartControlProps = {
  onPress: () => void;
};

// Subordinate control at the bottom edge (UX-DR1, UX-DR2) — visually
// recessive relative to Correct/Incorrect, per the UX spec's hierarchy.
// FR20/FR21: opens the confirm dialog — the actual reset happens only on
// confirm (RestartConfirmDialog.tsx / useActiveSession's restart()).
//
// Correct/Incorrect deliberately run full-bleed behind the Android system
// nav bar (UX-DR1/UX-DR12's locked layout) — that's fine, their tap targets
// sit well clear of it. Restart doesn't have that margin: at a fixed 8px
// from the container's bottom edge it landed directly under the 3-button
// nav bar's Home button on-device (found via UAT), making it unreliably
// tappable. `insets.bottom` is 0 on gesture-nav devices, so this only
// changes anything where a system bar is actually reserved.
export function RestartControl({ onPress }: RestartControlProps) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      testID="restart-control"
      style={[styles.button, { bottom: insets.bottom + 8 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Restart"
    >
      <Text style={styles.label}>Restart</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: SessionColors.restartBackground,
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  label: {
    fontSize: 11,
    color: SessionColors.restartText,
  },
});
