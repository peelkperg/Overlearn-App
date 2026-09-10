import { fireEvent, render, within } from '@testing-library/react-native';

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
      onOpen={jest.fn()}
      onRename={jest.fn()}
      onDuplicate={jest.fn()}
      onDelete={jest.fn()}
      onInlineRename={jest.fn()}
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

  it('normal tap still calls onOpen — long-press threshold does not interfere (AC #5)', async () => {
    const onOpen = jest.fn();
    const onInlineRename = jest.fn();
    const view = await renderRow({ onOpen, onInlineRename });

    await fireEvent.press(view.getByTestId('segment-row-segment-1'));

    expect(onOpen).toHaveBeenCalled();
    expect(view.queryByTestId('segment-row-inline-input-segment-1')).toBeNull();
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
    const onInlineRename = jest.fn();
    const view = await renderRow({ onInlineRename });

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');
    const input = view.getByTestId('segment-row-inline-input-segment-1');
    await fireEvent.changeText(input, 'New name');
    await fireEvent(input, 'submitEditing');

    expect(onInlineRename).toHaveBeenCalledWith('New name');
    expect(view.queryByTestId('segment-row-inline-input-segment-1')).toBeNull();
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

  it('blur after a successful submit does not revert — submittedRef guard (AC #2, #3)', async () => {
    const onInlineRename = jest.fn();
    const view = await renderRow({ onInlineRename });

    await fireEvent(view.getByTestId('segment-row-segment-1'), 'longPress');
    const input = view.getByTestId('segment-row-inline-input-segment-1');
    await fireEvent.changeText(input, 'New name');
    await fireEvent(input, 'submitEditing');
    // Simulate the blur that follows submit on iOS
    await fireEvent(input, 'blur');

    // onInlineRename called exactly once — not suppressed by the blur
    expect(onInlineRename).toHaveBeenCalledTimes(1);
    expect(onInlineRename).toHaveBeenCalledWith('New name');
    expect(view.queryByTestId('segment-row-inline-input-segment-1')).toBeNull();
  });
});
