import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ResumeDiscardDialog } from '@/components/ResumeDiscardDialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useSegments } from '@/hooks/useSegments';
import type { Segment } from '@/lib/types';

// Story 1.3: View the Segment List (FR2, FR4, FR7, UX-DR11).
// Story 2.10: interruption resume/discard gate (FR24-FR26, NFR4). This is
// the app's landing screen, so it's the one place that can catch an
// interrupted session before the user navigates anywhere else.
export default function HomeScreen() {
  const { segments } = useSegments();
  const { session, endSession } = useActiveSession();
  const [resumeDialogVisible, setResumeDialogVisible] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (!session) return;
    if (session.sessionComplete) {
      // Already-complete interrupted session (Story 2.6's AC): route
      // straight to its Completion screen, no prompt.
      router.replace(`/session/${session.segmentId}`);
    } else {
      // Incomplete interrupted session: always ask — never silently
      // resumed or discarded (FR24).
      setResumeDialogVisible(true);
    }
  }, [session]);

  const handleDiscard = () => {
    setResumeDialogVisible(false);
    endSession(); // FR26: cleared, no history entry is ever written for it
  };

  const handleResume = () => {
    setResumeDialogVisible(false);
    if (session) router.push(`/session/${session.segmentId}`);
  };

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
      {session && (
        <ResumeDiscardDialog
          visible={resumeDialogVisible}
          segmentName={session.segmentName}
          onDiscard={handleDiscard}
          onResume={handleResume}
        />
      )}
    </ThemedView>
  );
}

function SegmentRow({ segment }: { segment: Segment }) {
  return (
    <Pressable
      testID={`segment-row-${segment.id}`}
      onPress={() => router.push(`/segment/${segment.id}`)}
      accessibilityRole="button"
    >
      <ThemedView type="backgroundElement" style={styles.row}>
        <ThemedText>{segment.name}</ThemedText>
      </ThemedView>
    </Pressable>
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
