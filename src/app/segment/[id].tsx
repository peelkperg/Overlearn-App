import { useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useSegment } from '@/hooks/useSegments';

// Story 1.4: Select a Segment to Practice or Review (FR3).
// Navigation + screen shell only — the Start action's session behavior is
// delivered in Epic 2, history in Epic 3.
export default function SegmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const segment = useSegment(id);

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
});
