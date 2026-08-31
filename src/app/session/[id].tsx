import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CorrectButton } from '@/components/session/CorrectButton';
import { SessionColors } from '@/components/session/colors';
import { IncorrectButton } from '@/components/session/IncorrectButton';
import { RestartControl } from '@/components/session/RestartControl';
import { StreakReadout } from '@/components/session/StreakReadout';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useSegment } from '@/hooks/useSegments';

// Story 2.1: Start a Practice Session Immediately (FR8, FR9; UX-DR1, UX-DR2,
// UX-DR6, UX-DR7, UX-DR8, UX-DR12). Correct/Incorrect/Restart tap handling
// arrives in Stories 2.2-2.4.
export default function ActiveSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const segment = useSegment(id);
  const { session, start, targetStreak } = useActiveSession();
  const started = useRef(false);

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
      <CorrectButton />
      <StreakReadout currentStreak={session.currentStreak} targetStreak={targetStreak} segmentName={session.segmentName} />
      <IncorrectButton />
      <RestartControl />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SessionColors.background,
  },
  notFound: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: SessionColors.textStrong,
  },
});
