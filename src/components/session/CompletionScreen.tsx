import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SessionColors } from '@/components/session/colors';
import type { SessionState } from '@/lib/types';

type CompletionScreenProps = {
  session: SessionState;
  // Story 4.1 (FR31): sourced live via useSegment(id), not
  // session.segmentName's frozen snapshot — see architecture.md's Rename
  // Propagation table.
  segmentName: string;
  finalTarget: number;
  onDone: () => void;
  onRepeat: () => void;
};

// Completion Summary (FR13): segment name, final target achieved, total
// mistakes, total attempts, with Done/Repeat actions. Warm-but-not-gamified
// per the UX spec — plain stats, single checkmark, no celebratory UI.
// Done (FR14, Story 2.7) and Repeat (FR15, Story 2.8) wiring is the
// caller's responsibility via the onDone/onRepeat props.
export function CompletionScreen({ session, segmentName, finalTarget, onDone, onRepeat }: CompletionScreenProps) {
  const totalAttempts = session.totalCorrectThisSession + session.totalIncorrectThisSession;

  return (
    <View style={styles.container}>
      <Text style={styles.check}>✓</Text>
      <Text style={styles.title}>Session Complete</Text>
      <Text testID="completion-stats" style={styles.stats}>
        {segmentName}
        {'\n'}Target reached: {finalTarget}
        {'\n'}
        {session.totalCorrectThisSession} correct · {session.totalIncorrectThisSession} incorrect ·{' '}
        {totalAttempts} attempts
      </Text>
      <View style={styles.actions}>
        <Pressable testID="completion-done" style={styles.button} onPress={onDone} accessibilityRole="button">
          <Text style={styles.buttonText}>Done</Text>
        </Pressable>
        <Pressable
          testID="completion-repeat"
          style={[styles.button, styles.buttonPrimary]}
          onPress={onRepeat}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Repeat</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SessionColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  check: {
    fontSize: 40,
    color: SessionColors.correct,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: SessionColors.textStrong,
  },
  stats: {
    fontSize: 13,
    color: SessionColors.textNeutral,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: 8,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SessionColors.restartBackground,
  },
  buttonPrimary: {
    backgroundColor: SessionColors.correct,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: SessionColors.textStrong,
  },
  buttonTextPrimary: {
    color: SessionColors.correctIcon,
  },
});
