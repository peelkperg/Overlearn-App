import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CompletionScreen } from '@/components/session/CompletionScreen';
import { CorrectButton } from '@/components/session/CorrectButton';
import { SessionColors } from '@/components/session/colors';
import { IncorrectButton } from '@/components/session/IncorrectButton';
import { RestartConfirmDialog } from '@/components/session/RestartConfirmDialog';
import { RestartControl } from '@/components/session/RestartControl';
import { StreakReadout } from '@/components/session/StreakReadout';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useRouteId } from '@/hooks/useRouteId';
import { useSegment } from '@/hooks/useSegments';
import { writeHistoryEntry } from '@/lib/history';

// Story 2.1: Start a Practice Session Immediately (FR8, FR9; UX-DR1, UX-DR2,
// UX-DR6, UX-DR7, UX-DR8, UX-DR12).
// Story 2.2: Log a Correct Repetition (FR16, FR18, FR19).
// Story 2.3: Log an Incorrect Repetition with Live Target Recalculation
// (FR10, FR11, FR17, FR18, FR19; UX-DR3, UX-DR8).
// Story 2.4: Restart an In-Progress Session (FR20, FR21, UX-DR2).
// Story 2.5: Automatic Session Completion (FR12, FR22, UX-DR3).
// Story 2.6: View Session Completion Summary (FR13, UX-DR4).
// Story 2.7: End Session and Write History (FR14).
// Story 2.8: Repeat Session Immediately (FR15).
// Story 2.10: an existing persisted session for this exact segment (complete
// or a just-Resumed incomplete one) is never silently overwritten here —
// only a genuinely different/absent session triggers a fresh start.
export default function ActiveSessionScreen() {
  const id = useRouteId(useLocalSearchParams());
  const segment = useSegment(id);
  const { session, start, logCorrect, logIncorrect, restart, endSession, targetStreak, incorrectPulse, targetRaiseFlash } =
    useActiveSession();
  const started = useRef(false);
  const [restartDialogVisible, setRestartDialogVisible] = useState(false);

  const handleRestartConfirm = () => {
    setRestartDialogVisible(false);
    restart();
  };

  // Story 2.7 (FR14): writes the history entry, clears the active session,
  // and returns to the segment list.
  const handleDone = () => {
    if (!session) return;
    // Keyed on segment.id, not the raw route param — the two can diverge
    // for an array-valued or stale param. sessionStartTimestamp lets
    // writeHistoryEntry dedupe a retry after a kill between this write
    // and endSession() below.
    writeHistoryEntry(session.segmentId, {
      date: new Date().toISOString(),
      finalTarget: targetStreak,
      totalMistakes: session.totalIncorrectThisSession,
      totalAttempts: session.totalCorrectThisSession + session.totalIncorrectThisSession,
      sessionStartTimestamp: session.sessionStartTimestamp,
    });
    endSession();
    router.replace('/');
  };

  // Story 2.8 (FR15): begins a new session immediately, same start
  // behavior as Story 2.1 (0/5). No history entry for the just-completed
  // session — start() overwrites session.active without ever calling
  // writeHistoryEntry, so nothing is recorded unless Done was tapped first.
  const handleRepeat = () => {
    if (!segment) return;
    start(segment.id, segment.name);
  };

  useEffect(() => {
    if (started.current || !segment) return;
    started.current = true;
    // Story 2.6/2.10: a persisted session already exists for this exact
    // segment — either completed (app killed on the Completion screen) or
    // incomplete-but-just-Resumed from the list screen's resume/discard
    // prompt. Either way, show it as-is rather than overwriting with a
    // fresh start. Any *other* stale session (a different segment, or one
    // the user already chose to Discard) has already been resolved by the
    // time navigation reaches here — see app/index.tsx.
    const existingForThisSegment = session?.segmentId === segment.id;
    if (!existingForThisSegment) {
      start(segment.id, segment.name);
    }
  }, [segment]);

  if (!segment) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Segment not found.</Text>
      </View>
    );
  }

  if (!session) {
    return <View style={styles.container} />;
  }

  if (session.sessionComplete) {
    return <CompletionScreen session={session} finalTarget={targetStreak} onDone={handleDone} onRepeat={handleRepeat} />;
  }

  return (
    <View style={styles.container}>
      <CorrectButton onPress={logCorrect} />
      <StreakReadout currentStreak={session.currentStreak} targetStreak={targetStreak} segmentName={session.segmentName} />
      <IncorrectButton onPress={logIncorrect} pulsing={incorrectPulse} />
      <RestartControl onPress={() => setRestartDialogVisible(true)} />
      {targetRaiseFlash && <View testID="target-raise-flash" style={styles.flashOverlay} pointerEvents="none" />}
      <RestartConfirmDialog
        visible={restartDialogVisible}
        onCancel={() => setRestartDialogVisible(false)}
        onConfirm={handleRestartConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SessionColors.background,
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SessionColors.alert,
    opacity: 0.55,
  },
  notFound: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: SessionColors.textStrong,
  },
});
