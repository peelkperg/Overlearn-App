import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MaxNameLength, normalizeSegmentName } from '@/lib/segments';

type SegmentFormProps = {
  submitLabel: string;
  onSubmit: (name: string) => void;
  // [Review][Patch] found via code review 2026-09-05: the parent remounts
  // this form (via `key`) after a failed save to reset `submitting`, which
  // previously also wiped whatever the user had typed. Re-seeding from this
  // prop on remount preserves it.
  initialName?: string;
};

// Create form (FR1). Non-empty-name validation happens here, inline — no
// segment is created for a name that is empty, whitespace-only, or made up
// entirely of invisible characters.
export function SegmentForm({ submitLabel, onSubmit, initialName = '' }: SegmentFormProps) {
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(false);
  // Navigation away is not instantaneous, so without this a second tap
  // landing before the screen unmounts submits the same name twice. The
  // screen remounts this form (via `key`) to re-enable it after a failed
  // write, which is the only path where submitting stays mounted.
  const [submitting, setSubmitting] = useState(false);
  const theme = useTheme();

  const normalized = normalizeSegmentName(name);
  const isValid = normalized.length > 0;
  const showError = touched && !isValid;

  const handleSubmit = () => {
    setTouched(true);
    if (!isValid || submitting) return;
    setSubmitting(true);
    onSubmit(normalized);
  };

  return (
    <View style={styles.container}>
      <TextInput
        testID="segment-name-input"
        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
        value={name}
        onChangeText={setName}
        placeholder="Segment name"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Segment name"
        accessibilityHint="Names the passage you are practicing"
        maxLength={MaxNameLength}
        autoFocus
      />
      {showError && (
        <ThemedText
          testID="segment-name-error"
          type="small"
          themeColor="danger"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          Segment name cannot be empty.
        </ThemedText>
      )}
      <Pressable
        testID="segment-form-submit"
        style={[styles.button, { backgroundColor: theme.accent }, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityState={{ disabled: submitting }}
      >
        <ThemedText themeColor="accentText" style={styles.buttonText}>
          {submitLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three, padding: Spacing.four },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 44,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontWeight: '600' },
});
