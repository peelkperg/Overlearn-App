import { Pressable, StyleSheet, Text } from 'react-native';

import { SessionColors } from '@/components/session/colors';

// Locked layout (UX-DR1, UX-DR2): bottom ~40% of screen, red, X, no text.
// Redundantly coded by position + color + icon shape (NFR7).
// Tap handling (FR16/FR17) lands in Story 2.3 — this is layout/styling only.
export function IncorrectButton() {
  return (
    <Pressable
      testID="incorrect-button"
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Incorrect"
    >
      <Text style={styles.icon}>✕</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 0.4,
    alignSelf: 'stretch',
    backgroundColor: SessionColors.incorrect,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  icon: {
    fontSize: 64,
    lineHeight: 64,
    fontWeight: '700',
    color: SessionColors.incorrectIcon,
  },
});
