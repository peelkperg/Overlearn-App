import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { HistoryEntry } from '@/lib/types';

// One history log row (FR28): date, final target streak achieved, total
// mistakes, total attempts.
export function HistoryEntryRow({ entry }: { entry: HistoryEntry }) {
  const date = new Date(entry.date);
  const dateLabel = Number.isNaN(date.getTime()) ? entry.date : date.toLocaleDateString();

  return (
    <View style={styles.row}>
      <ThemedText type="smallBold">{dateLabel}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Target {entry.finalTarget} · {entry.totalMistakes} mistakes · {entry.totalAttempts} attempts
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 10,
    gap: 2,
  },
});
