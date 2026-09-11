import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useSegment } from '@/hooks/useSegments';
import { useSettings } from '@/hooks/useSettings';
import { calculateTargetStreak } from '@/lib/mechanic';
import { readSettings } from '@/lib/settings';

// Story 5.1: Configure the Overlearning Target (FR35, FR36, UX-DR13-16). A
// leaf screen, same shape as segment/[id]/rename.tsx — no header (this app
// has none, headerShown: false app-wide) and no back button, relying on the
// OS back gesture/hardware back button. No confirmation, no Save button:
// every stepper tap writes immediately via setOverlearningPercent.
export default function SettingsScreen() {
  const { settings, setOverlearningPercent } = useSettings();
  // Story 5.3 (FR39): the notice's segment name is sourced live via
  // useSegment, not session.segmentName — same rule as every other FR31
  // display site, so a rename made after the session started is reflected
  // here too, not frozen at session-start time. [Review][Patch] found via
  // code review 2026-09-11: falls back to session.segmentName (matching
  // app/index.tsx:228's identical fallback) for the case useSegment can't
  // resolve — otherwise the notice would interpolate the literal string
  // "undefined" if the segment lookup ever misses.
  const { session } = useActiveSession();
  const inProgressSegment = useSegment(session?.segmentId);
  const inProgressSegmentName = inProgressSegment?.name ?? session?.segmentName;
  const showInProgressNotice = Boolean(session && !session.sessionComplete);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText>Overlearning target</ThemedText>
        {showInProgressNotice && (
          <ThemedText
            testID="in-progress-session-notice"
            type="small"
            themeColor="textSecondary"
            accessibilityLiveRegion="polite"
          >
            {`You have a session in progress for '${inProgressSegmentName}.' Changing this target updates it immediately — and may complete the session.`}
          </ThemedText>
        )}
        <ThemedView style={styles.stepperRow}>
          <Pressable
            testID="settings-decrease"
            style={[styles.stepperButton, settings.overlearningPercent <= 50 && styles.stepperButtonDisabled]}
            // [Review][Patch] found via code review 2026-09-10: reads fresh
            // rather than closing over the render-time `settings` value —
            // mirrors useActiveSession's sessionStore.readSession() pattern.
            // Two taps dispatched before a re-render commits would otherwise
            // both compute from the same stale percent, netting one 10-point
            // step instead of two.
            onPress={() => setOverlearningPercent(readSettings().overlearningPercent - 10)}
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
            onPress={() => setOverlearningPercent(readSettings().overlearningPercent + 10)}
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
