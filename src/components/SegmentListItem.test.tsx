import { fireEvent, render, within } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { SegmentListItem } from './SegmentListItem';

const segment = {
  id: 'segment-1',
  name: 'Bar 24 arpeggio',
  createdAt: '2026-08-31T12:00:00.000Z',
};

const renderRow = (overrides: Partial<Parameters<typeof SegmentListItem>[0]> = {}) =>
  render(
    <SegmentListItem
      segment={segment}
      // Story 4.6 (FR41): undefined is the default, matching a segment with
      // no completed sessions — exercises the em-dash path unless a test
      // overrides it.
      aggregate={undefined}
      onOpen={jest.fn()}
      onRename={jest.fn()}
      onDuplicate={jest.fn()}
      onDelete={jest.fn()}
      // Returns true: the boolean is the write-succeeded signal the row reads
      // to decide whether to close the field. A bare jest.fn() returns
      // undefined, which the row correctly treats as a failed write.
      onInlineRename={jest.fn(() => true)}
      {...overrides}
    />,
  );

describe('SegmentListItem [Story 1.4, 1.6]', () => {
  it('opens the segment when the row is tapped', async () => {
    const onOpen = jest.fn();
    const view = await renderRow({ onOpen });

    await fireEvent.press(view.getByTestId('segment-row-segment-1'));

    expect(onOpen).toHaveBeenCalled();
  });

  it('keeps the actions behind a menu rather than on the row', async () => {
    const view = await renderRow();
    expect(view.queryByTestId('segment-row-delete-segment-1')).toBeNull();
  });

  it('lists Rename, Duplicate, Delete in that order (UX-DR20)', async () => {
    const view = await renderRow();
    await fireEvent.press(view.getByTestId('segment-row-menu-segment-1'));

    const menu = view.getByTestId('segment-row-menu-backdrop-segment-1');
    const buttons = within(menu).getAllByRole('button');
    const renameIndex = buttons.findIndex((button) => button.props.testID === 'segment-row-rename-segment-1');
    const duplicateIndex = buttons.findIndex((button) => button.props.testID === 'segment-row-duplicate-segment-1');
    const deleteIndex = buttons.findIndex((button) => button.props.testID === 'segment-row-delete-segment-1');

    expect(renameIndex).toBeGreaterThanOrEqual(0);
    expect(duplicateIndex).toBeGreaterThan(renameIndex);
    expect(deleteIndex).toBeGreaterThan(duplicateIndex);
  });

  it('renames from the menu and closes it', async () => {
    const onRename = jest.fn();
    const view = await renderRow({ onRename });

    await fireEvent.press(view.getByTestId('segment-row-menu-segment-1'));
    await fireEvent.press(view.getByTestId('segment-row-rename-segment-1'));

    expect(onRename).toHaveBeenCalled();
    expect(view.queryByTestId('segment-row-rename-segment-1')).toBeNull();
  });

  it('duplicates from the menu and closes it', async () => {
    const onDuplicate = jest.fn();
    const view = await renderRow({ onDuplicate });

    await fireEvent.press(view.getByTestId('segment-row-menu-segment-1'));
    await fireEvent.press(view.getByTestId('segment-row-duplicate-segment-1'));

    expect(onDuplicate).toHaveBeenCalled();
    expect(view.queryByTestId('segment-row-duplicate-segment-1')).toBeNull();
  });

  it('deletes from the menu', async () => {
    const onDelete = jest.fn();
    const view = await renderRow({ onDelete });

    await fireEvent.press(view.getByTestId('segment-row-menu-segment-1'));
    await fireEvent.press(view.getByTestId('segment-row-delete-segment-1'));

    expect(onDelete).toHaveBeenCalled();
  });

  it('closes the menu after an action, so the next tap is not swallowed', async () => {
    const view = await renderRow();

    await fireEvent.press(view.getByTestId('segment-row-menu-segment-1'));
    await fireEvent.press(view.getByTestId('segment-row-delete-segment-1'));

    expect(view.queryByTestId('segment-row-delete-segment-1')).toBeNull();
  });

  it('labels the menu button for screen readers', async () => {
    const view = await renderRow();
    expect(view.getByTestId('segment-row-menu-segment-1').props.accessibilityLabel).toBe(
      'Actions for Bar 24 arpeggio',
    );
  });
});

describe('SegmentListItem inline rename [Story 4.5, FR40, UX-DR25]', () => {
  it('carries accessibilityHint "Press and hold to rename" in static state', async () => {
    const view = await renderRow();
    expect(view.getByTestId('segment-row-segment-1').props.accessibilityHint).toBe('Press and hold to rename');
  });

  it('announces entry into edit mode (UX-DR25)', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const view = await renderRow();

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');

    expect(announce).toHaveBeenCalledWith('Editing segment name');
    announce.mockRestore();
  });

  it('removes the hint and the button role while editing', async () => {
    const view = await renderRow();

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');

    const row = view.getByTestId('segment-row-segment-1');
    expect(row.props.accessibilityHint).toBeUndefined();
    expect(row.props.accessibilityRole).toBeUndefined();
  });

  it('normal tap still calls onOpen — long-press threshold does not interfere (AC #5)', async () => {
    const onOpen = jest.fn();
    const view = await renderRow({ onOpen });

    await fireEvent.press(view.getByTestId('segment-row-segment-1'));

    expect(onOpen).toHaveBeenCalled();
    expect(view.queryByTestId('segment-row-inline-input-segment-1')).toBeNull();
  });

  it('long-press does not also call onOpen — the two gestures are mutually exclusive (AC #5)', async () => {
    const onOpen = jest.fn();
    const view = await renderRow({ onOpen });

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');

    expect(onOpen).not.toHaveBeenCalled();
    expect(view.getByTestId('segment-row-inline-input-segment-1')).toBeTruthy();
  });

  it('tapping the row while editing does not navigate away (AC #3)', async () => {
    const onOpen = jest.fn();
    const view = await renderRow({ onOpen });

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');
    await fireEvent.changeText(view.getByTestId('segment-row-inline-input-segment-1'), 'Half typed');
    // The "tap outside the field" gesture lands on the row's own padding,
    // which is inside the Pressable that hosts the input.
    await fireEvent.press(view.getByTestId('segment-row-segment-1'));

    expect(onOpen).not.toHaveBeenCalled();
  });

  it('long-press while already editing does not discard typed text', async () => {
    const view = await renderRow();

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');
    const input = view.getByTestId('segment-row-inline-input-segment-1');
    await fireEvent.changeText(input, 'Half typed');
    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');

    expect(view.getByTestId('segment-row-inline-input-segment-1').props.value).toBe('Half typed');
  });

  it('long-press enters edit mode: TextInput appears pre-filled, static text gone (AC #1)', async () => {
    const view = await renderRow();

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');

    const input = view.getByTestId('segment-row-inline-input-segment-1');
    expect(input.props.value).toBe('Bar 24 arpeggio');
    // Static ThemedText is replaced by the input
    expect(view.queryByText('Bar 24 arpeggio')).toBeNull();
  });

  it('submit saves the new name and returns to static text (AC #2)', async () => {
    const onInlineRename = jest.fn(() => true);
    const view = await renderRow({ onInlineRename });

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');
    const input = view.getByTestId('segment-row-inline-input-segment-1');
    await fireEvent.changeText(input, 'New name');
    await fireEvent(input, 'submitEditing');

    expect(onInlineRename).toHaveBeenCalledWith('New name');
    expect(view.queryByTestId('segment-row-inline-input-segment-1')).toBeNull();
    // The row renders segment.name from its prop, so the displayed half of
    // AC #2 is the parent's job — verified here by re-rendering with the
    // renamed record, which is what the real FlatList does after the write.
    await view.rerender(
      <SegmentListItem
        segment={{ ...segment, name: 'New name' }}
        aggregate={undefined}
        onOpen={jest.fn()}
        onRename={jest.fn()}
        onDuplicate={jest.fn()}
        onDelete={jest.fn()}
        onInlineRename={onInlineRename}
      />,
    );
    expect(view.getByText('New name')).toBeTruthy();
  });

  it('a failed write keeps the field open with the typed text intact', async () => {
    // The parent's runAction returns false and shows the list-level banner;
    // the row must not discard what the user typed.
    const onInlineRename = jest.fn(() => false);
    const view = await renderRow({ onInlineRename });

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');
    const input = view.getByTestId('segment-row-inline-input-segment-1');
    await fireEvent.changeText(input, 'New name');
    await fireEvent(input, 'submitEditing');

    expect(onInlineRename).toHaveBeenCalledWith('New name');
    expect(view.getByTestId('segment-row-inline-input-segment-1').props.value).toBe('New name');
  });

  it('a blur after a failed write can still cancel the edit', async () => {
    const onInlineRename = jest.fn(() => false);
    const view = await renderRow({ onInlineRename });

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');
    const input = view.getByTestId('segment-row-inline-input-segment-1');
    await fireEvent.changeText(input, 'New name');
    await fireEvent(input, 'submitEditing');
    await fireEvent(input, 'blur');

    expect(view.queryByTestId('segment-row-inline-input-segment-1')).toBeNull();
    expect(view.getByText('Bar 24 arpeggio')).toBeTruthy();
  });

  it('caps the field at the shared 80-character name limit', async () => {
    const view = await renderRow();

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');

    expect(view.getByTestId('segment-row-inline-input-segment-1').props.maxLength).toBe(80);
  });

  it('rejects a name of only invisible characters as empty (AC #4)', async () => {
    // trim() leaves U+200B standing; normalizeSegmentName does not. Without
    // the normalizer this reached renameSegment and surfaced as a storage
    // failure rather than the empty name it is.
    const onInlineRename = jest.fn(() => true);
    const view = await renderRow({ onInlineRename });

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');
    const input = view.getByTestId('segment-row-inline-input-segment-1');
    await fireEvent.changeText(input, '​﻿');
    await fireEvent(input, 'submitEditing');

    expect(onInlineRename).not.toHaveBeenCalled();
    expect(view.getByTestId('segment-row-inline-error-segment-1')).toBeTruthy();
  });

  it('blur without submit reverts to original name, does not call onInlineRename (AC #3)', async () => {
    const onInlineRename = jest.fn();
    const view = await renderRow({ onInlineRename });

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');
    const input = view.getByTestId('segment-row-inline-input-segment-1');
    await fireEvent.changeText(input, 'Partially typed');
    await fireEvent(input, 'blur');

    expect(onInlineRename).not.toHaveBeenCalled();
    expect(view.queryByTestId('segment-row-inline-input-segment-1')).toBeNull();
    expect(view.getByText('Bar 24 arpeggio')).toBeTruthy();
  });

  it('empty submit shows error, keeps field editable, does not call onInlineRename (AC #4)', async () => {
    const onInlineRename = jest.fn();
    const view = await renderRow({ onInlineRename });

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');
    const input = view.getByTestId('segment-row-inline-input-segment-1');
    await fireEvent.changeText(input, '');
    await fireEvent(input, 'submitEditing');

    expect(onInlineRename).not.toHaveBeenCalled();
    // Field is still present
    expect(view.getByTestId('segment-row-inline-input-segment-1')).toBeTruthy();
    // Error message shown
    expect(view.getByTestId('segment-row-inline-error-segment-1')).toBeTruthy();
  });

  it('a blur arriving before submit does not cancel the pending save — submittedRef guard (AC #2)', async () => {
    // The guard's real job. Firing blur after submit proves nothing: the
    // input is already unmounted and the callback already fired, so such a
    // test passes with the guard deleted (confirmed by mutation, code review
    // 2026-09-10). Re-entering edit mode and blurring is what exercises it:
    // the flag must be cleared at entry, not left true from the last submit.
    const onInlineRename = jest.fn(() => true);
    const view = await renderRow({ onInlineRename });

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');
    await fireEvent.changeText(view.getByTestId('segment-row-inline-input-segment-1'), 'New name');
    await fireEvent(view.getByTestId('segment-row-inline-input-segment-1'), 'submitEditing');

    // Second edit, cancelled by blur. If submittedRef were still true from
    // the first submit, this blur would be swallowed and the field would
    // stay open.
    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');
    await fireEvent.changeText(view.getByTestId('segment-row-inline-input-segment-1'), 'Discard me');
    await fireEvent(view.getByTestId('segment-row-inline-input-segment-1'), 'blur');

    expect(onInlineRename).toHaveBeenCalledTimes(1);
    expect(view.queryByTestId('segment-row-inline-input-segment-1')).toBeNull();
  });
});

describe('SegmentListItem row summary data [Story 4.6]', () => {
  it('shows creation date, last-practice date, and Solidification % (AC #1)', async () => {
    const view = await renderRow({
      aggregate: { lastPracticed: '2026-09-10T12:00:00.000Z', solidification: 42.3 },
    });

    expect(view.getByText('Last practice: 10 Sep 2026 · 42.3%')).toBeTruthy();
    expect(view.getByText('Created 31 Aug 2026')).toBeTruthy();
  });

  it('shows an em dash, never 0.0%, for a segment with no completed sessions (AC #2)', async () => {
    const nullAggregate = await renderRow({ aggregate: { lastPracticed: null, solidification: null } });
    expect(nullAggregate.getByText('Last practice: — · —')).toBeTruthy();
    expect(nullAggregate.queryByText(/0\.0%/)).toBeNull();

    const undefinedAggregate = await renderRow({ aggregate: undefined });
    expect(undefinedAggregate.getByText('Last practice: — · —')).toBeTruthy();
  });

  it('combines name, last-practice date, Solidification %, and creation date into one row accessibility label, and does not label the summary lines separately (AC #4)', async () => {
    const view = await renderRow({
      aggregate: { lastPracticed: '2026-09-10T12:00:00.000Z', solidification: 42.3 },
    });

    expect(view.getByTestId('segment-row-segment-1').props.accessibilityLabel).toBe(
      'Bar 24 arpeggio, last practice 10 Sep 2026, solidification 42.3%, created 31 Aug 2026',
    );
    expect(view.queryByLabelText('Last practice: 10 Sep 2026 · 42.3%')).toBeNull();
    expect(view.queryByLabelText('Created 31 Aug 2026')).toBeNull();
  });

  it('reads "never" and "no data" in the accessibility label for a segment with no history, not a bare em dash (AC #4)', async () => {
    const view = await renderRow({ aggregate: undefined });

    expect(view.getByTestId('segment-row-segment-1').props.accessibilityLabel).toBe(
      'Bar 24 arpeggio, last practice never, solidification no data, created 31 Aug 2026',
    );
  });

  it('rounds Solidification % to one decimal, reserving 100.0%/0.0% for the true boundary', async () => {
    const near100 = await renderRow({ aggregate: { lastPracticed: null, solidification: 99.97 } });
    expect(near100.getByText(/99\.9%/)).toBeTruthy();

    const near0 = await renderRow({ aggregate: { lastPracticed: null, solidification: 0.02 } });
    expect(near0.getByText(/0\.1%/)).toBeTruthy();

    const exact100 = await renderRow({ aggregate: { lastPracticed: null, solidification: 100 } });
    expect(exact100.getByText(/100\.0%/)).toBeTruthy();

    const exact0 = await renderRow({ aggregate: { lastPracticed: null, solidification: 0 } });
    expect(exact0.getByText(/0\.0%/)).toBeTruthy();
  });

  it('does not clear the row accessibilityLabel while editing — the field label takes over instead', async () => {
    const view = await renderRow({
      aggregate: { lastPracticed: '2026-09-10T12:00:00.000Z', solidification: 42.3 },
    });

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');

    expect(view.getByTestId('segment-row-segment-1').props.accessibilityLabel).toBeUndefined();
    expect(view.getByTestId('segment-row-inline-input-segment-1').props.accessibilityLabel).toBe('Segment name');
  });
});
