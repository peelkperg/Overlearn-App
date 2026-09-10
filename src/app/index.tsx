import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ResumeDiscardDialog } from '@/components/ResumeDiscardDialog';
import { SegmentListItem } from '@/components/SegmentListItem';
import { SortControl } from '@/components/SortControl';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useSegment, useSegments } from '@/hooks/useSegments';
import { useTheme } from '@/hooks/use-theme';
import type { SortDirection, SortKey } from '@/lib/types';

// Story 4.2 (UX-DR21): how long the duplicate-confirmation notice stays
// visible before auto-dismissing.
const DuplicateNoticeMs = 4000;

// Story 1.3: View the Segment List (FR2, FR4, FR7, UX-DR11).
// Story 2.10: interruption resume/discard gate (FR24-FR26, NFR4). This is
// the app's landing screen, so it's the one place that can catch an
// interrupted session before the user navigates anywhere else.
// Story 4.2: Duplicate a Segment (FR32) — row-menu action plus the
// auto-dismissing confirmation notice.
// Story 4.3: Sort the Segment List (FR33/FR34) — sort control above the
// list, hidden below two segments (AC #7).
export default function HomeScreen() {
  const { segments, deleteSegment, duplicateSegment, renameSegment, sortKey, sortDirection, setSortOption } = useSegments();
  const { session, endSession } = useActiveSession();
  // Story 4.1 (FR31): live lookup, not session.segmentName's frozen
  // snapshot — see architecture.md's Rename Propagation table. The `??`
  // fallback is a defensive path for the (currently unreachable) case
  // where the live segment lookup fails.
  const activeSegment = useSegment(session?.segmentId);
  const [resumed, setResumed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Story 4.2 (UX-DR21, UX-DR24): a copy can sort off-screen, so a silent
  // insertion would read as a no-op - this confirms it happened, and
  // clears itself so it never lingers as stale state.
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keyed by the session being redirected for, not a bare boolean: a second
  // session completed in the same app lifetime must redirect too, or it is
  // stranded with no route to its Completion screen.
  const redirectedFor = useRef<string | null>(null);

  // Snapshot of whatever incomplete session already existed the moment this
  // screen mounted — i.e. a genuine interruption from before this app
  // lifetime, the only case FR24 is about. Home stays mounted underneath
  // every pushed screen (Segment Detail, Active Session), so without this
  // snapshot showResumeDialog below would also fire for a session the user
  // just started normally via Segment Detail's Start button — that session
  // is just as "incomplete" from Home's still-subscribed point of view, but
  // is not an interruption at all. [Review][Patch, CRITICAL] found via UAT:
  // tapping Start showed this prompt, and Discard from it left the Active
  // Session screen with no session at all (see hasSeenSession below).
  const [interruptedSessionAtMount] = useState(() =>
    session && !session.sessionComplete ? session.sessionStartTimestamp : null,
  );

  // Incomplete interrupted session: always ask — never silently resumed or
  // discarded (FR24). Matched against the mount-time snapshot above by
  // sessionStartTimestamp, not just "any incomplete session exists" — a
  // session started after mount (normal in-app Start/Repeat flow) must
  // never trigger this, only the one that was already there on arrival.
  // Resume dismisses it explicitly: it pushes rather than mutating the
  // session, so nothing else would take the dialog down.
  const showResumeDialog =
    !!session &&
    !session.sessionComplete &&
    !resumed &&
    session.sessionStartTimestamp === interruptedSessionAtMount;

  useEffect(() => {
    if (!session?.sessionComplete) return;
    if (redirectedFor.current === session.sessionStartTimestamp) return;
    redirectedFor.current = session.sessionStartTimestamp;
    // Already-complete interrupted session (Story 2.6's AC): route
    // straight to its Completion screen, no prompt.
    router.replace(`/session/${session.segmentId}`);
  }, [session]);

  const handleDiscard = () => {
    endSession(); // FR26: cleared, no history entry is ever written for it
  };

  const handleResume = () => {
    if (!session) return;
    setResumed(true);
    router.push(`/session/${session.segmentId}`);
  };

  // Resets the auto-dismiss timer rather than stacking timers - a second
  // duplicate before the first notice clears must not cut the new one
  // short via a stale timeout from the first.
  const showNotice = (text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = setTimeout(() => setNotice(null), DuplicateNoticeMs);
  };

  // [Review][Patch] found 2026-09-06: a stale "Duplicated as ..." notice
  // must not survive a later action on the list (e.g. deleting the segment
  // it just confirmed) — every other action clears it up front, same as
  // `error`, rather than waiting out its own timer.
  const clearNotice = () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = null;
    setNotice(null);
  };

  // A write can still fail underneath these (a full disk, a record removed
  // in between), and an exception thrown from a press handler is not caught
  // by any boundary — it takes the app down instead of the row.
  const runAction = (action: () => void, failureMessage: string) => {
    try {
      setError(null);
      clearNotice();
      action();
    } catch {
      setError(failureMessage);
    }
  };

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const handleDuplicate = (id: string) => {
    runAction(() => {
      const copy = duplicateSegment(id);
      showNotice(`Duplicated as "${copy.name}"`);
    }, 'Could not duplicate that segment.');
  };

  // [Review][Patch] found via code review 2026-09-08: Task 8 waived
  // runAction here on the assumption setSortOption "has no realistic
  // failure mode," but the underlying storage.set call is unguarded (unlike
  // getString) and this file's own runAction comment states an uncaught
  // press-handler exception "takes the app down instead of the row" — the
  // same exposure every other write on this screen is already wrapped
  // against.
  const handleSortChange = (key: SortKey, direction: SortDirection) => {
    runAction(() => setSortOption(key, direction), 'Could not save sort option.');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {error && (
          <ThemedText
            testID="segment-list-error"
            type="small"
            style={styles.error}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error}
          </ThemedText>
        )}
        {notice && (
          <ThemedText testID="segment-list-notice" type="small" style={styles.notice} accessibilityLiveRegion="polite">
            {notice}
          </ThemedText>
        )}
        {segments.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {segments.length > 1 && (
              <SortControl sortKey={sortKey} sortDirection={sortDirection} onChange={handleSortChange} />
            )}
            <FlatList
              testID="segment-list"
              style={styles.list}
              data={segments}
              keyExtractor={(segment) => segment.id}
              renderItem={({ item }) => (
                <SegmentListItem
                  segment={item}
                  onOpen={() => router.push(`/segment/${item.id}`)}
                  onRename={() => router.push(`/segment/${item.id}/rename`)}
                  onInlineRename={(name) => runAction(() => renameSegment(item.id, name), 'Could not rename that segment.')}
                  onDuplicate={() => handleDuplicate(item.id)}
                  onDelete={() => runAction(() => deleteSegment(item.id), 'Could not delete that segment.')}
                />
              )}
            />
            <CreateButton testID="segment-list-create-more" label="New segment" />
          </>
        )}
      </SafeAreaView>
      {session && (
        <ResumeDiscardDialog
          visible={showResumeDialog}
          segmentName={activeSegment?.name ?? session.segmentName}
          onDiscard={handleDiscard}
          onResume={handleResume}
        />
      )}
    </ThemedView>
  );
}

// FR1/FR4: creation has to stay reachable once segments exist — it used to
// live only inside the empty state, which made the app one-segment-only.
function CreateButton({ testID, label }: { testID: string; label: string }) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      style={[styles.button, { backgroundColor: theme.accent }]}
      onPress={() => router.push('/segment/new')}
      accessibilityRole="button"
    >
      <ThemedText themeColor="accentText" style={styles.buttonText}>
        {label}
      </ThemedText>
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
      <CreateButton testID="segment-list-create" label="Create segment" />
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
    paddingBottom: Spacing.three,
    maxWidth: MaxContentWidth,
  },
  list: {
    flex: 1,
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
  error: {
    paddingVertical: Spacing.two,
    textAlign: 'center',
  },
  notice: {
    paddingVertical: Spacing.two,
    textAlign: 'center',
  },
  button: {
    borderRadius: 8,
    marginTop: Spacing.three,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  // [Review][Patch] found via code review 2026-09-05: a hardcoded color here
  // used to win over the ThemedText themeColor="accentText" prop (style
  // array's last entry wins in RN), silently defeating dark-mode adaptation
  // on this button — segment/[id].tsx's equivalent button correctly omits it.
  buttonText: { fontWeight: '600', fontSize: 16 },
});
