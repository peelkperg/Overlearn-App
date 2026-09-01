import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
// Story 2.5: Automatic Session Completion (FR12, FR22, UX-DR3). The
// Completion Summary screen itself is Story 2.6 — this story only locks
// input and fires the completion feedback tier (settle overlay here).
export default function ActiveSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const segment = useSegment(id);
  const { session, start, logCorrect, logIncorrect, restart, targetStreak, incorrectPulse, targetRaiseFlash, settled } =
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
    start(segment.name);
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

  return (
    <View style={styles.container}>
      <CorrectButton onPress={logCorrect} />
      <StreakReadout currentStreak={session.currentStreak} targetStreak={targetStreak} segmentName={session.segmentName} />
      <IncorrectButton onPress={logIncorrect} pulsing={incorrectPulse} />
      <RestartControl onPress={() => setRestartDialogVisible(true)} />
      {targetRaiseFlash && <View testID="target-raise-flash" style={styles.flashOverlay} pointerEvents="none" />}
      {settled && <View testID="completion-settle" style={styles.settleOverlay} pointerEvents="none" />}
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
  settleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SessionColors.background,
    opacity: 0.7,
  },
  notFound: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: SessionColors.textStrong,
  },
});
