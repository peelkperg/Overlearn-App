import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HistoryEntryRow } from '@/components/HistoryEntryRow';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useRouteId } from '@/hooks/useRouteId';
import { useTheme } from '@/hooks/use-theme';
import { useSegment } from '@/hooks/useSegments';
import { useSegmentHistory } from '@/hooks/useSegmentHistory';
import { calculateSolidificationPercent } from '@/lib/history';

// Story 1.4: Select a Segment to Practice or Review (FR3).
// Story 3.1: View Completed Session History for a Segment (FR27, FR28, FR29).
// Story 4.4: Solidification % summary line (FR38) — em dash, not "0%", for
// a segment with no completed sessions yet (ux-design-specification.md §609:
// "0%" here would misread as "scored zero" rather than "no data yet"). Same
// shared formula FR33's sort already uses (Story 4.3); this screen is the
// only place the value is ever shown as a number (ux-design-specification.md
// line 620).
// Delete (FR6) lives on the segment row, not here — see
// architecture.md's components/SegmentListItem.tsx.

// Reserve "100%" and "0%" for exact mathematical values only; clamp
// everything strictly in between to [1, 99] so 99.5% reads "99%" (not a
// false "100%" in an app whose premise is consecutive-perfect repetition)
// and 0.33% reads "1%" (not "0%", the exact misreading the em dash guards
// against). Display layer only — the sort path uses the true unrounded value.
function formatSolidification(pct: number): string {
  if (pct >= 100) return '100%';
  if (pct <= 0) return '0%';
  return `${Math.min(99, Math.max(1, Math.round(pct)))}%`;
}

export default function SegmentDetailScreen() {
  const id = useRouteId(useLocalSearchParams());
  const segment = useSegment(id);
  const history = useSegmentHistory(id);
  // useSegmentHistory is already useSyncExternalStore-backed, so this stays
  // live if a session completes while this screen is mounted underneath the
  // Active Session screen — no new subscription needed.
  const solidification = calculateSolidificationPercent(history);
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {segment ? (
          <>
            <ThemedText type="title" numberOfLines={2} style={styles.title}>
              {segment.name}
            </ThemedText>
            <Pressable
              testID="segment-detail-start"
              style={[styles.button, { backgroundColor: theme.accent }]}
              onPress={() => router.push(`/session/${segment.id}`)}
              accessibilityRole="button"
            >
              <ThemedText themeColor="accentText" style={styles.buttonText}>
                Start
              </ThemedText>
            </Pressable>
            <View testID="segment-detail-history" style={styles.historySection}>
              <ThemedText type="smallBold">History</ThemedText>
              <ThemedText testID="segment-detail-solidification" type="default">
                Solidification: {solidification === null ? '—' : formatSolidification(solidification)}
              </ThemedText>
              {history.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No completed sessions yet.
                </ThemedText>
              ) : (
                <FlatList
                  testID="segment-detail-history-list"
                  data={history}
                  keyExtractor={(entry, index) => `${entry.date}-${index}`}
                  renderItem={({ item }) => <HistoryEntryRow entry={item} />}
                />
              )}
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
    paddingBottom: Spacing.three,
    paddingTop: Spacing.five,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  title: {
    textAlign: 'center',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: { fontWeight: '600', fontSize: 16 },
  historySection: {
    alignSelf: 'stretch',
    flex: 1,
    gap: Spacing.two,
  },
});
