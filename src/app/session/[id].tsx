import { useLocalSearchParams } from 'expo-router';
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
import { useSegment } from '@/hooks/useSegments';

// Story 2.1: Start a Practice Session Immediately (FR8, FR9; UX-DR1, UX-DR2,
// UX-DR6, UX-DR7, UX-DR8, UX-DR12).
// Story 2.2: Log a Correct Repetition (FR16, FR18, FR19).
// Story 2.3: Log an Incorrect Repetition with Live Target Recalculation
// (FR10, FR11, FR17, FR18, FR19; UX-DR3, UX-DR8).
// Story 2.4: Restart an In-Progress Session (FR20, FR21, UX-DR2).
// Story 2.5: Automatic Session Completion (FR12, FR22, UX-DR3).
// Story 2.6: View Session Completion Summary (FR13, UX-DR4). Done/Repeat
// (FR14, FR15) are wired in Stories 2.7/2.8.
export default function ActiveSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const segment = useSegment(id);
  const { session, start, logCorrect, logIncorrect, restart, targetStreak, incorrectPulse, targetRaiseFlash } =
    useActiveSession();
  const started = useRef(false);
  const [restartDialogVisible, setRestartDialogVisible] = useState(false);

  const handleRestartConfirm = () => {
    setRestartDialogVisible(false);
    restart();
  };

  useEffect(() => {
    if (started.current || !segment) return;
    started.current = true;
    // Story 2.6 (UX-DR4): if a completed session for this segment is
    // already persisted (e.g. the app was killed on the Completion
    // screen), show it directly rather than overwriting with a fresh
    // start. Resuming an *incomplete* interrupted session is Story 2.10 —
    // out of scope here.
    const alreadyComplete = session?.sessionComplete && session.segmentName === segment.name;
    if (!alreadyComplete) {
      start(segment.name);
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
    return <CompletionScreen session={session} finalTarget={targetStreak} onDone={() => {}} onRepeat={() => {}} />;
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
