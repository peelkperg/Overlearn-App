import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SegmentForm } from '@/components/SegmentForm';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useRouteId } from '@/hooks/useRouteId';
import { useSegment, useSegments } from '@/hooks/useSegments';

// Story 4.1: Rename a Segment (FR30, FR31, UX-DR22). Modeled directly on
// segment/new.tsx's structure (error state, remount-on-failure via `key`) —
// see that file for the pattern this mirrors.
export default function RenameSegmentScreen() {
  const id = useRouteId(useLocalSearchParams());
  const segment = useSegment(id);
  const { renameSegment } = useSegments();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [lastAttemptedName, setLastAttemptedName] = useState('');

  const handleSubmit = (name: string) => {
    if (!id) return;
    try {
      renameSegment(id, name);
      router.replace('/');
    } catch {
      setError('Could not rename that segment. Check that the device has free storage.');
      setLastAttemptedName(name);
      setAttempt((count) => count + 1);
    }
  };

  if (!segment) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText testID="segment-rename-not-found">Segment not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {error && (
          <View style={styles.errorRow}>
            <ThemedText
              testID="segment-rename-error"
              type="small"
              themeColor="danger"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              {error}
            </ThemedText>
          </View>
        )}
        <SegmentForm
          key={attempt}
          submitLabel="Rename"
          onSubmit={handleSubmit}
          initialName={attempt > 0 ? lastAttemptedName : segment.name}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  errorRow: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
});
