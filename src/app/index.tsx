import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useSegments } from '@/hooks/useSegments';
import type { Segment } from '@/lib/types';

// Story 1.3: View the Segment List (FR2, FR4, FR7, UX-DR11).
export default function HomeScreen() {
  const { segments } = useSegments();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {segments.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            testID="segment-list"
            style={styles.list}
            data={segments}
            keyExtractor={(segment) => segment.id}
            renderItem={({ item }) => <SegmentRow segment={item} />}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function SegmentRow({ segment }: { segment: Segment }) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedText>{segment.name}</ThemedText>
    </ThemedView>
  );
}

function EmptyState() {
  return (
    <View testID="segment-list-empty" style={styles.emptyState}>
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        No segments yet
      </ThemedText>
      <ThemedText type="small" style={styles.emptyHint}>
        Create your first practice segment to get started.
      </ThemedText>
      <Pressable
        testID="segment-list-create"
        style={styles.button}
        onPress={() => router.push('/segment/new')}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Create segment</Text>
      </Pressable>
    </View>
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
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  list: {
    flex: 1,
  },
  row: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyHint: {
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2ecc71',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: { color: '#0a2c14', fontWeight: '600', fontSize: 16 },
});
