import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Segment } from '@/lib/types';

type SegmentListItemProps = {
  segment: Segment;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  // Story 4.5 (FR40): called with the trimmed new name when the user submits
  // an inline rename; parent owns the data write and error recovery.
  onInlineRename: (name: string) => void;
};

// Row in the segment list (FR6). The UX spec allows swipe-actions or a menu
// for delete; a menu is used because it is reachable by screen readers and
// keyboard/switch control, which a swipe gesture is not (NFR6).
// Story 4.5 (FR40, UX-DR25): the name label also accepts a 1-second
// press-and-hold to enter inline rename mode — a second entry point to the
// same renameSegment lib function, no new lib/ code.
export function SegmentListItem({ segment, onOpen, onRename, onDuplicate, onDelete, onInlineRename }: SegmentListItemProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  // Distinguishes blur-after-submit from blur-without-submit: onSubmitEditing
  // fires before onBlur on iOS; without this guard the revert branch in
  // handleBlur would undo a successful save.
  const submittedRef = useRef(false);
  const theme = useTheme();

  const runAction = (action: () => void) => {
    setMenuVisible(false);
    action();
  };

  const handleLongPress = () => {
    setEditValue(segment.name);
    setIsEditing(true);
    setEditError(null);
  };

  const handleSubmit = () => {
    if (editValue.trim().length === 0) {
      setEditError('Name must not be empty');
      return;
    }
    submittedRef.current = true;
    onInlineRename(editValue.trim());
    setIsEditing(false);
    setEditError(null);
    submittedRef.current = false;
  };

  const handleBlur = () => {
    if (submittedRef.current) return;
    setIsEditing(false);
    setEditError(null);
  };

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <Pressable
        testID={`segment-row-${segment.id}`}
        style={styles.rowLabel}
        onPress={onOpen}
        onLongPress={handleLongPress}
        delayLongPress={1000}
        accessibilityRole="button"
        accessibilityHint={isEditing ? undefined : 'Press and hold to rename'}
      >
        {isEditing ? (
          <>
            <TextInput
              testID={`segment-row-inline-input-${segment.id}`}
              value={editValue}
              onChangeText={setEditValue}
              onSubmitEditing={handleSubmit}
              onBlur={handleBlur}
              autoFocus
              returnKeyType="done"
              underlineColorAndroid="transparent"
              style={[styles.inlineInput, { color: theme.text }]}
            />
            {editError !== null && (
              <ThemedText
                testID={`segment-row-inline-error-${segment.id}`}
                type="small"
                themeColor="textSecondary"
              >
                {editError}
              </ThemedText>
            )}
          </>
        ) : (
          <ThemedText numberOfLines={1}>{segment.name}</ThemedText>
        )}
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
              testID={`segment-row-rename-${segment.id}`}
              style={styles.menuItem}
              onPress={() => runAction(onRename)}
              accessibilityRole="button"
            >
              <ThemedText>Rename</ThemedText>
            </Pressable>
            <Pressable
              testID={`segment-row-duplicate-${segment.id}`}
              style={styles.menuItem}
              onPress={() => runAction(onDuplicate)}
              accessibilityRole="button"
            >
              <ThemedText>Duplicate</ThemedText>
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
  // Matches ThemedText type="default" (fontSize 16, lineHeight 24, fontWeight
  // 500) so the row does not shift when the label becomes an editable field.
  inlineInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    backgroundColor: 'transparent',
    padding: 0,
    borderWidth: 0,
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
