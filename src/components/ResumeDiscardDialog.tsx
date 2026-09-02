import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type ResumeDiscardDialogProps = {
  visible: boolean;
  segmentName: string;
  onDiscard: () => void;
  onResume: () => void;
};

// FR24, NFR4: the user is always prompted resume vs. discard for an
// interrupted (session_complete = false) session — never silently resumed
// or silently discarded. Standard design-system dialog, not part of the
// Active Session screen's custom component tree (components/session/).
export function ResumeDiscardDialog({ visible, segmentName, onDiscard, onResume }: ResumeDiscardDialogProps) {
  return (
    // onRequestClose is a deliberate no-op, not an omission: the Android
    // back button must not dismiss this dialog without a choice — that
    // would be a silent resume/discard, exactly what FR24 forbids.
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.message}>
            You have an interrupted session for &quot;{segmentName}&quot;. Resume it or discard it?
          </Text>
          <View style={styles.actions}>
            <Pressable
              testID="resume-discard-discard"
              style={styles.button}
              onPress={onDiscard}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Discard</Text>
            </Pressable>
            <Pressable
              testID="resume-discard-resume"
              style={[styles.button, styles.buttonPrimary]}
              onPress={onResume}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Resume</Text>
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    gap: 20,
    width: '100%',
    maxWidth: 320,
  },
  message: {
    fontSize: 15,
    color: '#e8e8e8',
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
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonPrimary: {
    backgroundColor: '#2ecc71',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e8e8e8',
  },
  buttonTextPrimary: {
    color: '#0a2c14',
  },
});
