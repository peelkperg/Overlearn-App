import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { SessionColors } from '@/components/session/colors';

type RestartConfirmDialogProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

// Confirm-gated Restart (FR21, UX-DR2) — the one active-session control
// that isn't a no-confirm tap, by deliberate contrast with Correct/Incorrect.
export function RestartConfirmDialog({ visible, onCancel, onConfirm }: RestartConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.message}>Restart session? Progress will be lost.</Text>
          <View style={styles.actions}>
            <Pressable
              testID="restart-confirm-cancel"
              style={styles.button}
              onPress={onCancel}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable
              testID="restart-confirm-confirm"
              style={[styles.button, styles.buttonPrimary]}
              onPress={onConfirm}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Restart</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: SessionColors.background,
    borderRadius: 12,
    padding: 20,
    gap: 20,
    width: '100%',
    maxWidth: 320,
  },
  message: {
    fontSize: 15,
    color: SessionColors.textStrong,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: SessionColors.restartBackground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonPrimary: {
    backgroundColor: SessionColors.incorrect,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: SessionColors.textStrong,
  },
  buttonTextPrimary: {
    color: SessionColors.incorrectIcon,
  },
});
