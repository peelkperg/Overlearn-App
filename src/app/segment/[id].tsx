import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useSegment, useSegments } from '@/hooks/useSegments';

// Story 1.4: Select a Segment to Practice or Review (FR3).
// Navigation + screen shell only — the Start action's session behavior is
// delivered in Epic 2, history in Epic 3.
export default function SegmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const segment = useSegment(id);
  const { archiveSegment, deleteSegment } = useSegments();

  const handleArchive = () => {
    archiveSegment(id);
    router.replace('/');
  };

  const handleDelete = () => {
    deleteSegment(id);
    router.replace('/');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {segment ? (
          <>
            <ThemedText type="title" style={styles.title}>
              {segment.name}
            </ThemedText>
            <Pressable testID="segment-detail-start" style={styles.button} accessibilityRole="button">
              <Text style={styles.buttonText}>Start</Text>
            </Pressable>
            <View style={styles.secondaryActions}>
              <Pressable
                testID="segment-detail-archive"
                style={styles.secondaryButton}
                onPress={handleArchive}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>Archive</Text>
              </Pressable>
              <Pressable
                testID="segment-detail-delete"
                style={styles.secondaryButton}
                onPress={handleDelete}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>Delete</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View testID="segment-detail-not-found">
            <ThemedText>Segment not found.</ThemedText>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    paddingTop: Spacing.five,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  title: {
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2ecc71',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: { color: '#0a2c14', fontWeight: '600', fontSize: 16 },
  secondaryActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryButtonText: { fontWeight: '600', fontSize: 14 },
});
