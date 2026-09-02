import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SegmentForm } from '@/components/SegmentForm';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSegments } from '@/hooks/useSegments';

// Story 1.2: Create a Named Practice Segment (FR1).
export default function NewSegmentScreen() {
  const { createSegment } = useSegments();
  const [error, setError] = useState<string | null>(null);
  // Remounts the form after a failed write so its submit guard resets.
  const [attempt, setAttempt] = useState(0);

  // The write can still fail underneath a valid name — a full disk, most
  // plausibly — and an exception out of a press handler is caught by no
  // boundary, so it would take the app down instead of the form.
  const handleSubmit = (name: string) => {
    try {
      createSegment(name);
      router.replace('/');
    } catch {
      setError('Could not save that segment. Check that the device has free storage.');
      setAttempt((count) => count + 1);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {error && (
        <View style={styles.errorRow}>
          <ThemedText
            testID="segment-create-error"
            type="small"
            themeColor="danger"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error}
          </ThemedText>
        </View>
      )}
      <SegmentForm key={attempt} submitLabel="Create" onSubmit={handleSubmit} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorRow: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
});
