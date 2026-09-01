import { Pressable, StyleSheet, Text } from 'react-native';

import { SessionColors } from '@/components/session/colors';

type IncorrectButtonProps = {
  onPress: () => void;
  pulsing?: boolean;
};

// Locked layout (UX-DR1, UX-DR2): bottom ~40% of screen, red, X, no text.
// Redundantly coded by position + color + icon shape (NFR7).
// FR10/FR17/FR18/FR19: logs an Incorrect repetition on tap, no undo
// affordance. `pulsing` brightens the fill for the mild feedback tier's
// visual pulse (Story 2.3).
export function IncorrectButton({ onPress, pulsing = false }: IncorrectButtonProps) {
  return (
    <Pressable
      testID="incorrect-button"
      style={[styles.button, pulsing && styles.buttonPulsing]}
      onPress={onPress}
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
  buttonPulsing: {
    backgroundColor: SessionColors.incorrectPulse,
  },
  icon: {
    fontSize: 64,
    lineHeight: 64,
    fontWeight: '700',
    color: SessionColors.incorrectIcon,
  },
});
