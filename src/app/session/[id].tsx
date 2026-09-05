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
  const { session, start, logCorrect, logIncorrect, restart, complete, targetStreak, incorrectPulse, targetRaiseFlash } =
    useActiveSession();
  const started = useRef(false);
  const [restartDialogVisible, setRestartDialogVisible] = useState(false);
  // [Review][Patch] found via code review 2026-09-05: every write on this
  // screen (start/logCorrect/logIncorrect/restart) previously had no error
  // handling at all, unlike index.tsx/segment/new.tsx's runAction pattern —
  // a storage failure (e.g. full disk) mid-session threw uncaught out of a
  // press handler and crashed the app instead of the screen.
  const [error, setError] = useState<string | null>(null);

  const runAction = (action: () => void, failureMessage: string) => {
    try {
      setError(null);
      action();
    } catch {
      setError(failureMessage);
    }
  };

  const handleRestartConfirm = () => {
    setRestartDialogVisible(false);
    runAction(restart, 'Could not restart. Check that the device has free storage.');
  };

  // Story 2.7 (FR14): writes the history entry and clears the active session
  // (both via useActiveSession's complete()), then returns to the segment
  // list.
  const handleDone = () => {
    if (!session) return;
    runAction(() => {
      complete();
      router.replace('/');
    }, 'Could not save that session. Check that the device has free storage.');
  };

  // Story 2.8 (FR15): begins a new session immediately, same start
  // behavior as Story 2.1 (0/5). No history entry for the just-completed
  // session — start() overwrites session.active without ever calling
  // writeHistoryEntry, so nothing is recorded unless Done was tapped first.
  const handleRepeat = () => {
    if (!segment) return;
    runAction(() => start(segment.id, segment.name), 'Could not start a new session. Check that the device has free storage.');
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
      // Not routed through runAction: react-hooks/set-state-in-effect
      // disallows a synchronous setState from an effect body. Deferred one
      // tick instead — the effect's own job (starting the session) still
      // runs synchronously; only surfacing the failure is delayed.
      try {
        start(segment.id, segment.name);
      } catch {
        queueMicrotask(() => setError('Could not start a session. Check that the device has free storage.'));
      }
    }
  }, [segment]);

  // Defensive: session can be cleared out from under this screen — Home
  // stays mounted underneath and owns the resume/discard prompt (see
  // app/index.tsx), and a Discard tapped there while this screen is
  // showing removes session.active globally. A silent blank screen with no
  // way back is worse than bouncing to the list; only fires once a session
  // has actually been seen here, never on the single normal blank frame
  // before start() above completes. [Review][Patch, CRITICAL]
  const hasSeenSession = useRef(false);
  useEffect(() => {
    if (session) {
      hasSeenSession.current = true;
      return;
    }
    if (hasSeenSession.current) {
      router.replace('/');
    }
  }, [session]);

  if (!segment) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Segment not found.</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        {error && (
          <Text testID="session-error" style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
      </View>
    );
  }

  if (session.sessionComplete) {
    return <CompletionScreen session={session} finalTarget={targetStreak} onDone={handleDone} onRepeat={handleRepeat} />;
  }

  return (
    <View style={styles.container}>
      {error && (
        <Text testID="session-error" style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      <CorrectButton onPress={() => runAction(logCorrect, 'Could not record that. Check that the device has free storage.')} />
      <StreakReadout currentStreak={session.currentStreak} targetStreak={targetStreak} segmentName={session.segmentName} />
      <IncorrectButton
        onPress={() => runAction(logIncorrect, 'Could not record that. Check that the device has free storage.')}
        pulsing={incorrectPulse}
      />
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
  error: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 13,
    color: SessionColors.incorrect,
  },
});
