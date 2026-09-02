import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Segment } from '@/lib/types';

type SegmentListItemProps = {
  segment: Segment;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

// Row in the segment list (FR5, FR6). The UX spec allows swipe-actions or a
// menu for archive/delete; a menu is used because it is reachable by screen
// readers and keyboard/switch control, which a swipe gesture is not (NFR6).
export function SegmentListItem({ segment, onOpen, onArchive, onDelete }: SegmentListItemProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const theme = useTheme();

  const runAction = (action: () => void) => {
    setMenuVisible(false);
    action();
  };

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <Pressable
        testID={`segment-row-${segment.id}`}
        style={styles.rowLabel}
        onPress={onOpen}
        accessibilityRole="button"
      >
        <ThemedText numberOfLines={1}>{segment.name}</ThemedText>
      </Pressable>
      <Pressable
        testID={`segment-row-menu-${segment.id}`}
        style={styles.menuButton}
        onPress={() => setMenuVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Actions for ${segment.name}`}
        hitSlop={Spacing.two}
      >
        <ThemedText themeColor="textSecondary">⋯</ThemedText>
      </Pressable>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          testID={`segment-row-menu-backdrop-${segment.id}`}
          style={styles.backdrop}
          onPress={() => setMenuVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss menu"
        >
          <View style={[styles.menu, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.menuTitle}>
              {segment.name}
            </ThemedText>
            <Pressable
              testID={`segment-row-archive-${segment.id}`}
              style={styles.menuItem}
              onPress={() => runAction(onArchive)}
              accessibilityRole="button"
            >
              <ThemedText>Archive</ThemedText>
            </Pressable>
            <Pressable
              testID={`segment-row-delete-${segment.id}`}
              style={styles.menuItem}
              onPress={() => runAction(onDelete)}
              accessibilityRole="button"
            >
              <ThemedText>Delete</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
  },
  rowLabel: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  menuButton: {
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
  menuTitle: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  menuItem: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
