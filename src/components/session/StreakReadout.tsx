import { StyleSheet, Text, View } from 'react-native';

import { SessionColors } from '@/components/session/colors';

type StreakReadoutProps = {
  currentStreak: number;
  targetStreak: number;
  segmentName: string;
};

// Locked layout (UX-DR1, UX-DR2): centered ~20% of screen, "current/target"
// with the segment name below. Large-numeral, scales with OS dynamic type
// (UX-DR7) — default RN font scaling is left enabled, not overridden.
export function StreakReadout({ currentStreak, targetStreak, segmentName }: StreakReadoutProps) {
  return (
    <View style={styles.zone}>
      <Text testID="streak-readout" style={styles.readout}>
        {currentStreak}
        <Text style={styles.slash}>/</Text>
        {targetStreak}
      </Text>
      <Text style={styles.segmentName}>{segmentName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    flex: 0.2,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: SessionColors.background,
  },
  readout: {
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: 1,
    color: SessionColors.textStrong,
    fontVariant: ['tabular-nums'],
  },
  slash: {
    color: SessionColors.textNeutral,
    fontWeight: '400',
  },
  segmentName: {
    fontSize: 12,
    color: SessionColors.textNeutral,
  },
});
