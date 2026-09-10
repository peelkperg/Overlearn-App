import { useRef, useState } from 'react';
import { AccessibilityInfo, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MaxNameLength, normalizeSegmentName } from '@/lib/segments';
import type { Segment } from '@/lib/types';

type SegmentListItemProps = {
  segment: Segment;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  // Story 4.5 (FR40): called with the normalized new name when the user
  // submits an inline rename; the parent owns the data write. Returns whether
  // the write succeeded — on failure this row keeps the field open with the
  // user's text intact rather than discarding it (code review 2026-09-10:
  // the parent's error banner is the message surface, but only the row knows
  // whether to close the field).
  onInlineRename: (name: string) => boolean;
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
  // Places the caret at the end on entry (UX spec: "pre-filled with the
  // current name, cursor at end"). Released on the first selection change so
  // the user's own caret movement is not fought by a controlled value.
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  // Distinguishes blur-after-submit from blur-without-submit. Deliberately
  // cleared at edit *entry*, never at the end of handleSubmit: onBlur arrives
  // as a later native event, so a same-tick reset would leave the flag false
  // by the time handleBlur reads it, making the guard dead code (code review
  // 2026-09-10 confirmed the original by mutation — the suite stayed green
  // with the guard disabled).
  const submittedRef = useRef(false);
  const theme = useTheme();

  const runAction = (action: () => void) => {
    setMenuVisible(false);
    action();
  };

  const handleLongPress = () => {
    // A second long-press while the field is open would reset editValue to
    // the stored name and silently discard what the user has typed.
    if (isEditing) return;
    submittedRef.current = false;
    setEditValue(segment.name);
    setSelection({ start: segment.name.length, end: segment.name.length });
    setIsEditing(true);
    setEditError(null);
    AccessibilityInfo.announceForAccessibility('Editing segment name');
  };

  const handleSubmit = () => {
    // normalizeSegmentName, not trim(): trim() leaves zero-width and bidi
    // characters standing, so a name made only of those would pass this
    // guard and then throw inside renameSegment — reported as a storage
    // failure rather than the empty name it actually is.
    const normalized = normalizeSegmentName(editValue);
    if (normalized.length === 0) {
      setEditError('Name must not be empty');
      return;
    }
    submittedRef.current = true;
    if (!onInlineRename(normalized)) {
      // The parent surfaces the message in the list-level error banner; the
      // field stays open so the typed name is not lost to a failed write.
      submittedRef.current = false;
      return;
    }
    setIsEditing(false);
    setEditError(null);
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
        // Both handlers are unbound while editing: the TextInput and the
        // error text are children of this Pressable, so a tap on the row's
        // padding — the "tap outside to cancel" gesture of AC #3 — would
        // otherwise fire onOpen and navigate away mid-edit.
        onPress={isEditing ? undefined : onOpen}
        onLongPress={isEditing ? undefined : handleLongPress}
        delayLongPress={1000}
        // While this Pressable hosts a text field it is not a button, and
        // announcing it as one puts screen-reader focus on a wrapper whose
        // role no longer matches what it contains.
        accessibilityRole={isEditing ? undefined : 'button'}
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
              selection={selection}
              onSelectionChange={() => setSelection(undefined)}
              autoFocus
              returnKeyType="done"
              multiline={false}
              maxLength={MaxNameLength}
              accessibilityLabel="Segment name"
              underlineColorAndroid="transparent"
              style={[styles.inlineInput, { color: theme.text }]}
            />
            {editError !== null && (
              <ThemedText
                testID={`segment-row-inline-error-${segment.id}`}
                type="small"
                themeColor="danger"
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
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
