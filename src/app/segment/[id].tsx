import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
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
import { renameSegment } from '@/lib/segments';

// Story 1.4: Select a Segment to Practice or Review (FR3).
// Story 3.1: View Completed Session History for a Segment (FR27, FR28, FR29).
// Story 4.4: Solidification % summary line (FR38) — em dash, not "0%", for
// a segment with no completed sessions yet (ux-design-specification.md §609:
// "0%" here would misread as "scored zero" rather than "no data yet"). Same
// shared formula FR33's sort already uses (Story 4.3); this screen is the
// only place the value is ever shown as a number (ux-design-specification.md
// line 620).
// Story 4.5: Inline rename on the segment name heading (FR40, UX-DR25) —
// 1-second press-and-hold swaps the ThemedText for a TextInput in place;
// onSubmitEditing saves via renameSegment(); blur without submitting reverts.
// Direct lib import: this screen doesn't need useSegments()'s full list and
// sort plumbing; useSegment(id) already provides reactive re-rendering after
// the write via its useSyncExternalStore subscription.
// Delete (FR6) lives on the segment row, not here — see
// architecture.md's components/SegmentListItem.tsx.

// Reserve "100%" and "0%" for exact mathematical values only; clamp
// everything strictly in between to [1, 99] so 99.5% reads "99%" (not a
// false "100%" in an app whose premise is consecutive-perfect repetition)
// and 0.33% reads "1%" (not "0%", the exact misreading the em dash guards
// against). Display layer only — the sort path uses the true unrounded value.
// (ux-design-specification.md line 620)
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

  // Story 4.5 (FR40): inline rename state for the detail heading.
  // useSegment(id) re-renders reactively after renameSegment writes, so
  // segment.name updates without manual display state.
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  // Distinguishes blur-after-submit from blur-without-submit (onSubmitEditing
  // fires before onBlur on iOS — without this guard the revert branch in
  // handleBlur would undo a successful save).
  const submittedRef = useRef(false);

  const handleLongPress = () => {
    if (!segment) return;
    setEditValue(segment.name);
    setIsEditing(true);
    setEditError(null);
  };

  const handleSubmit = () => {
    if (editValue.trim().length === 0) {
      setEditError('Name must not be empty');
      return;
    }
    try {
      submittedRef.current = true;
      renameSegment(id ?? '', editValue.trim());
      setIsEditing(false);
      setEditError(null);
      submittedRef.current = false;
    } catch {
      submittedRef.current = false;
      setEditError('Could not rename that segment.');
    }
  };

  const handleBlur = () => {
    if (submittedRef.current) return;
    setIsEditing(false);
    setEditError(null);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {segment ? (
          <>
            <Pressable
              testID="segment-detail-heading"
              onLongPress={handleLongPress}
              delayLongPress={1000}
              accessibilityHint={isEditing ? undefined : 'Press and hold to rename'}
              style={styles.headingPressable}
            >
              {isEditing ? (
                <>
                  <TextInput
                    testID="segment-detail-inline-input"
                    value={editValue}
                    onChangeText={setEditValue}
                    onSubmitEditing={handleSubmit}
                    onBlur={handleBlur}
                    autoFocus
                    returnKeyType="done"
                    multiline={false}
                    underlineColorAndroid="transparent"
                    style={[styles.headingInput, { color: theme.text }]}
                  />
                  {editError !== null && (
                    <ThemedText
                      testID="segment-detail-inline-error"
                      type="small"
                      themeColor="textSecondary"
                      style={styles.headingError}
                    >
                      {editError}
                    </ThemedText>
                  )}
                </>
              ) : (
                <ThemedText type="title" numberOfLines={2} style={styles.title}>
                  {segment.name}
                </ThemedText>
              )}
            </Pressable>
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
  // Pressable wrapper for the heading — same width/alignment as the original
  // ThemedText so the layout does not shift when long-press is detected.
  headingPressable: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  // Matches ThemedText type="title" (fontSize 48, fontWeight 600, lineHeight
  // 52, textAlign center) so the heading does not shift when editing begins.
  headingInput: {
    fontSize: 48,
    fontWeight: '600',
    lineHeight: 52,
    textAlign: 'center',
    backgroundColor: 'transparent',
    padding: 0,
    borderWidth: 0,
    alignSelf: 'stretch',
  },
  headingError: {
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
