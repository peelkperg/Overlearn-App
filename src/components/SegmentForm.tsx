import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type SegmentFormProps = {
  initialName?: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
};

// Shared create/rename form (FR1). Non-empty-name validation happens here,
// inline — no segment is created for an empty/whitespace-only name.
export function SegmentForm({ initialName = '', submitLabel, onSubmit }: SegmentFormProps) {
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(false);

  const trimmed = name.trim();
  const isValid = trimmed.length > 0;
  const showError = touched && !isValid;

  const handleSubmit = () => {
    setTouched(true);
    if (!isValid) return;
    onSubmit(trimmed);
  };

  return (
    <View style={styles.container}>
      <TextInput
        testID="segment-name-input"
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Segment name"
        accessibilityLabel="Segment name"
        autoFocus
      />
      {showError && (
        <Text testID="segment-name-error" style={styles.error}>
          Segment name cannot be empty.
        </Text>
      )}
      <Pressable
        testID="segment-form-submit"
        style={styles.button}
        onPress={handleSubmit}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: { color: '#e74c3c', fontSize: 13 },
  button: {
    backgroundColor: '#2ecc71',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: { color: '#0a2c14', fontWeight: '600', fontSize: 16 },
});
