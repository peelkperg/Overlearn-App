import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';
import { calculateTargetStreak } from '@/lib/mechanic';

// Story 5.1: Configure the Overlearning Target (FR35, FR36, UX-DR13-16). A
// leaf screen, same shape as segment/[id]/rename.tsx — no header (this app
// has none, headerShown: false app-wide) and no back button, relying on the
// OS back gesture/hardware back button. No confirmation, no Save button:
// every stepper tap writes immediately via setOverlearningPercent.
export default function SettingsScreen() {
  const { settings, setOverlearningPercent } = useSettings();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText>Overlearning target</ThemedText>
        <ThemedView style={styles.stepperRow}>
          <Pressable
            testID="settings-decrease"
            style={[styles.stepperButton, settings.overlearningPercent <= 50 && styles.stepperButtonDisabled]}
            onPress={() => setOverlearningPercent(settings.overlearningPercent - 10)}
            disabled={settings.overlearningPercent <= 50}
            accessibilityRole="button"
            accessibilityLabel="Decrease overlearning target"
            accessibilityState={{ disabled: settings.overlearningPercent <= 50 }}
          >
            <ThemedText>−</ThemedText>
          </Pressable>
          <ThemedText type="title" accessibilityLiveRegion="polite">
            {`${settings.overlearningPercent}%`}
          </ThemedText>
          <Pressable
            testID="settings-increase"
            style={[styles.stepperButton, settings.overlearningPercent >= 300 && styles.stepperButtonDisabled]}
            onPress={() => setOverlearningPercent(settings.overlearningPercent + 10)}
            disabled={settings.overlearningPercent >= 300}
            accessibilityRole="button"
            accessibilityLabel="Increase overlearning target"
            accessibilityState={{ disabled: settings.overlearningPercent >= 300 }}
          >
            <ThemedText>+</ThemedText>
          </Pressable>
        </ThemedView>
        {/* Computed through calculateTargetStreak itself so this example and
            the real mechanic can never diverge — project-context.md's single
            point-of-contact rule extends to display strings too. */}
        <ThemedText type="small" themeColor="textSecondary">
          {`At ${settings.overlearningPercent}%, 10 mistakes in a session sets a target of ${calculateTargetStreak(10, settings.overlearningPercent / 100)} correct in a row.`}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          A session never targets fewer than 5 correct in a row.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
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
    paddingTop: Spacing.four,
    maxWidth: MaxContentWidth,
    gap: Spacing.two,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stepperButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Visually recessive when disabled, matching SegmentForm.tsx's
  // buttonDisabled pattern — the disabled state must be visually distinct,
  // not just functionally inert.
  stepperButtonDisabled: {
    opacity: 0.4,
  },
});
