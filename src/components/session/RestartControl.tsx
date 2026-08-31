import { Pressable, StyleSheet, Text } from 'react-native';

import { SessionColors } from '@/components/session/colors';

// Subordinate control at the bottom edge (UX-DR1, UX-DR2) — visually
// recessive relative to Correct/Incorrect, per the UX spec's hierarchy.
// Confirm-gated restart logic (FR20, FR21) lands in Story 2.4 — this is
// layout/styling only.
export function RestartControl() {
  return (
    <Pressable testID="restart-control" style={styles.button} accessibilityRole="button" accessibilityLabel="Restart">
      <Text style={styles.label}>Restart</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 8,
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
