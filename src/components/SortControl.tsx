import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SortKeys, type SortDirection, type SortKey } from '@/lib/types';

type SortControlProps = {
  sortKey: SortKey;
  sortDirection: SortDirection;
  onChange: (sortKey: SortKey, sortDirection: SortDirection) => void;
};

const KeyLabels: Record<SortKey, string> = {
  name: 'Name',
  createdAt: 'Date created',
  lastPracticed: 'Last practiced',
  solidification: 'Solidification %',
};

// AC #2's literal per-key default direction on first selecting that option
// from the menu — NOT the same value as lib/settings.ts's app-wide
// DEFAULT_SETTINGS (which exists only to reproduce v1.0's untouched order).
// See that file's Dev Notes for why these two "defaults" must stay separate.
const DefaultDirection: Record<SortKey, SortDirection> = {
  name: 'asc',
  createdAt: 'desc',
  lastPracticed: 'desc',
  solidification: 'desc',
};

// AC #8: the accessibility label must name both the key and the direction
// in prose, never the bare asc/desc value or the ▾ glyph alone.
function directionLabel(key: SortKey, direction: SortDirection): string {
  if (key === 'name') return direction === 'asc' ? 'A to Z' : 'Z to A';
  if (key === 'createdAt' || key === 'lastPracticed') {
    return direction === 'desc' ? 'most recent first' : 'oldest first';
  }
  return direction === 'desc' ? 'highest first' : 'lowest first';
}

// FR33/FR34, UX-DR18/19: sort control above the segment list. Mirrors
// SegmentListItem's Modal-menu visual/interaction pattern (same backdrop,
// dismiss-on-tap-outside, 44x44 menu-item sizing) rather than extracting a
// shared component — a deliberate scope boundary, not an oversight.
export function SortControl({ sortKey, sortDirection, onChange }: SortControlProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const theme = useTheme();

  const handleSelect = (key: SortKey) => {
    setMenuVisible(false);
    if (key === sortKey) {
      onChange(key, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onChange(key, DefaultDirection[key]);
    }
  };

  const accessibilityLabel = `Sort by ${KeyLabels[sortKey]}, ${directionLabel(sortKey, sortDirection)}`;

  // Story 4.7 (FR42): flips direction for the currently active key —
  // the same computation handleSelect's re-tap-active-option branch
  // already performs, so both entry points can never drift apart.
  const flippedDirection: SortDirection = sortDirection === 'asc' ? 'desc' : 'asc';

  return (
    <View>
      <View style={styles.row}>
        <Pressable
          testID="segment-sort-control"
          style={styles.trigger}
          onPress={() => setMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        >
          <ThemedText type="small">Sort: {KeyLabels[sortKey]} ▾</ThemedText>
        </Pressable>
        <Pressable
          testID="segment-sort-direction-toggle"
          style={styles.directionToggle}
          onPress={() => onChange(sortKey, flippedDirection)}
          accessibilityRole="button"
          // AC #4: names both the current direction and what a tap would
          // produce. Split across label (state) and hint (action) rather
          // than one concatenated string — same convention as
          // SegmentListItem.tsx's accessibilityHint="Press and hold to
          // rename" naming an action separately from a label naming the
          // current thing.
          accessibilityLabel={`Sort direction, currently ${directionLabel(sortKey, sortDirection)}`}
          accessibilityHint={`Double tap to switch to ${directionLabel(sortKey, flippedDirection)}`}
        >
          <ThemedText type="small">{sortDirection === 'asc' ? '↑' : '↓'}</ThemedText>
        </Pressable>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          testID="segment-sort-menu-backdrop"
          style={styles.backdrop}
          onPress={() => setMenuVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss menu"
        >
          <View style={[styles.menu, { backgroundColor: theme.backgroundElement }]}>
            {SortKeys.map((key) => (
              <Pressable
                key={key}
                testID={`segment-sort-option-${key}`}
                style={styles.menuItem}
                onPress={() => handleSelect(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: key === sortKey }}
              >
                <ThemedText type={key === sortKey ? 'smallBold' : 'default'}>
                  {key === sortKey ? '✓ ' : ''}
                  {KeyLabels[key]}
                  {key === sortKey ? ` — ${directionLabel(key, sortDirection)}` : ''}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trigger: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: Spacing.two,
  },
  // Story 4.7 (FR42): matches the 44x44 minimum-target convention every
  // other row control in this codebase already uses (SegmentListItem's
  // menuButton, SettingsButton).
  directionToggle: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  menu: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    width: '100%',
    maxWidth: 320,
  },
  menuItem: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
