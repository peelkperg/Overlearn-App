import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

// Story 5.1 (FR35, UX-DR26): the app-wide Settings entry point — a gear
// icon, 44×44 minimum tap target, accessibilityLabel="Settings". Story 5.4
// (FR43) extracted this from Home's inline Pressable so the active-session
// and segment-detail screens could reuse the exact same control the ACs
// require, rather than each carrying its own copy. [Review][Decision]
// resolved 2026-09-12 (code review of Story 5.4): the three screens had
// each inlined this block with a slightly different style object (one of
// them position: 'absolute', overlapping the Correct button) — extracted
// here and adopted everywhere, including Home, so there is exactly one
// definition to keep in sync with UX-DR26.
//
// testID is required, not optional: the three call sites' existing testIDs
// (segment-list-settings, segment-detail-settings, session-settings) are
// asserted by tests already in the suite and must not change when this
// component was introduced.
type SettingsButtonProps = {
  testID: string;
};

export function SettingsButton({ testID }: SettingsButtonProps) {
  return (
    <Pressable
      testID={testID}
      style={styles.button}
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel="Settings"
    >
      <ThemedText themeColor="textSecondary">⚙</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-end',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
