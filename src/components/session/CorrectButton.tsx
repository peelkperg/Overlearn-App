import { Pressable, StyleSheet, Text } from 'react-native';

import { SessionColors } from '@/components/session/colors';

// Locked layout (UX-DR1, UX-DR2): top ~40% of screen, green, checkmark,
// no text. Redundantly coded by position + color + icon shape (NFR7).
// Tap handling (FR16) lands in Story 2.2 — this is layout/styling only.
export function CorrectButton() {
  return (
    <Pressable testID="correct-button" style={styles.button} accessibilityRole="button" accessibilityLabel="Correct">
      <Text style={styles.icon}>✓</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 0.4,
    alignSelf: 'stretch',
    backgroundColor: SessionColors.correct,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  icon: {
    fontSize: 64,
    lineHeight: 64,
    fontWeight: '700',
    color: SessionColors.correctIcon,
  },
});
