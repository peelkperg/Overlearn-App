import { fireEvent, render } from '@testing-library/react-native';

import { SortControl } from './SortControl';

describe('SortControl [Story 4.3]', () => {
  it('renders all four sort options, with the active one marked', async () => {
    const view = await render(<SortControl sortKey="createdAt" sortDirection="asc" onChange={jest.fn()} />);
    await fireEvent.press(view.getByTestId('segment-sort-control'));

    expect(view.getByTestId('segment-sort-option-name')).toBeTruthy();
    expect(view.getByTestId('segment-sort-option-createdAt')).toBeTruthy();
    expect(view.getByTestId('segment-sort-option-lastPracticed')).toBeTruthy();
    expect(view.getByTestId('segment-sort-option-solidification')).toBeTruthy();
    expect(view.getByText('✓ Date created — oldest first')).toBeTruthy();
    expect(view.getByTestId('segment-sort-option-createdAt').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('segment-sort-option-name').props.accessibilityState).toEqual({ selected: false });
  });

  it('tapping the active option calls onChange with the flipped direction', async () => {
    const onChange = jest.fn();
    const view = await render(<SortControl sortKey="name" sortDirection="asc" onChange={onChange} />);
    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-name'));

    expect(onChange).toHaveBeenCalledWith('name', 'desc');
  });

  it('tapping an inactive option calls onChange with that key\'s own default direction (name)', async () => {
    const onChange = jest.fn();
    const view = await render(<SortControl sortKey="createdAt" sortDirection="asc" onChange={onChange} />);
    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-name'));

    expect(onChange).toHaveBeenCalledWith('name', 'asc');
  });

  it('tapping an inactive option calls onChange with that key\'s own default direction (lastPracticed)', async () => {
    const onChange = jest.fn();
    const view = await render(<SortControl sortKey="name" sortDirection="asc" onChange={onChange} />);
    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-lastPracticed'));

    expect(onChange).toHaveBeenCalledWith('lastPracticed', 'desc');
  });

  // [Review][Patch] found via code review 2026-09-08: AC #2's createdAt→desc
  // and solidification→desc default directions (the exact ones the "two
  // different defaults" Dev Note warns about mixing up with
  // lib/settings.ts's app-wide DEFAULT_SETTINGS) were implemented but never
  // test-locked — every existing test here targeted only name/lastPracticed.
  it('tapping an inactive option calls onChange with that key\'s own default direction (createdAt)', async () => {
    const onChange = jest.fn();
    const view = await render(<SortControl sortKey="name" sortDirection="asc" onChange={onChange} />);
    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-createdAt'));

    expect(onChange).toHaveBeenCalledWith('createdAt', 'desc');
  });

  it('tapping an inactive option calls onChange with that key\'s own default direction (solidification)', async () => {
    const onChange = jest.fn();
    const view = await render(<SortControl sortKey="name" sortDirection="asc" onChange={onChange} />);
    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-solidification'));

    expect(onChange).toHaveBeenCalledWith('solidification', 'desc');
  });

  // 2026-09-12 code review decision (Story 4.7): the trigger's label no
  // longer names direction — the toggle button is now the single place
  // that announces it, avoiding a double-read across two adjacent focus
  // stops.
  it('accessibilityLabel names the key for name/asc', async () => {
    const view = await render(<SortControl sortKey="name" sortDirection="asc" onChange={jest.fn()} />);
    expect(view.getByTestId('segment-sort-control').props.accessibilityLabel).toBe('Sort by Name');
  });

  it('accessibilityLabel names the key for lastPracticed/desc', async () => {
    const view = await render(<SortControl sortKey="lastPracticed" sortDirection="desc" onChange={jest.fn()} />);
    expect(view.getByTestId('segment-sort-control').props.accessibilityLabel).toBe('Sort by Last practiced');
  });
});

describe('SortControl direction toggle [Story 4.7]', () => {
  // AC #1: button present, shows current direction. Exact match, not
  // substring — toHaveTextContent('↑') would also pass an implementation
  // that always renders both '↑↓'.
  it('shows an up arrow for asc and a down arrow for desc', async () => {
    const asc = await render(<SortControl sortKey="name" sortDirection="asc" onChange={jest.fn()} />);
    expect(asc.getByTestId('segment-sort-direction-toggle')).toHaveTextContent('↑', { exact: true });
    await asc.unmount();

    const desc = await render(<SortControl sortKey="name" sortDirection="desc" onChange={jest.fn()} />);
    expect(desc.getByTestId('segment-sort-direction-toggle')).toHaveTextContent('↓', { exact: true });
  });

  // AC #1: "immediately to the right of the trigger" — assert sibling
  // order, not just presence of both testIDs.
  it('renders the toggle as the trigger\'s next sibling, in the same row', async () => {
    const view = await render(<SortControl sortKey="name" sortDirection="asc" onChange={jest.fn()} />);
    const trigger = view.getByTestId('segment-sort-control');
    const toggle = view.getByTestId('segment-sort-direction-toggle');

    expect(trigger.parent).toBe(toggle.parent);
    const siblings = trigger.parent!.children;
    expect(siblings.indexOf(toggle as never)).toBe(siblings.indexOf(trigger as never) + 1);
  });

  // AC #2: tapping flips direction for the active key, not hardcoded to one
  // key, does not also open the sort menu, and fires onChange exactly once.
  it('tapping the toggle flips direction for the currently active sort key, without opening the menu', async () => {
    const onChange = jest.fn();
    const view = await render(<SortControl sortKey="name" sortDirection="asc" onChange={onChange} />);
    await fireEvent.press(view.getByTestId('segment-sort-direction-toggle'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('name', 'desc');
    expect(view.queryByTestId('segment-sort-menu-backdrop')).toBeNull();
  });

  it('tapping the toggle flips direction for a non-name sort key too', async () => {
    const onChange = jest.fn();
    const view = await render(<SortControl sortKey="lastPracticed" sortDirection="desc" onChange={onChange} />);
    await fireEvent.press(view.getByTestId('segment-sort-direction-toggle'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('lastPracticed', 'asc');
  });

  // AC #3: the toggle button is additive — Story 4.3's existing
  // re-tap-active-menu-option gesture must still work unchanged, in both
  // directions (asc->desc and desc->asc) — a literal onChange(key, 'desc')
  // in handleSelect would pass an asc-only regression test.
  it('does not interfere with the existing re-tap-active-option menu gesture, asc to desc (AC #3)', async () => {
    const onChange = jest.fn();
    const view = await render(<SortControl sortKey="name" sortDirection="asc" onChange={onChange} />);
    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-name'));
    expect(onChange).toHaveBeenCalledWith('name', 'desc');
  });

  it('does not interfere with the existing re-tap-active-option menu gesture, desc to asc (AC #3)', async () => {
    const onChange = jest.fn();
    const view = await render(<SortControl sortKey="name" sortDirection="desc" onChange={onChange} />);
    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-name'));
    expect(onChange).toHaveBeenCalledWith('name', 'asc');
  });

  // AC #4: a single accessibilityLabel names the key, the current
  // direction, and the direction a tap would produce (2026-09-12 code
  // review decision — no accessibilityHint). Queried through the
  // accessibility tree via getByLabelText, not read off .props, so a
  // control hidden from assistive tech (accessible={false}, or no
  // accessibilityRole) would fail this test.
  it('accessibilityLabel names the key, current direction, and resulting direction', async () => {
    const view = await render(<SortControl sortKey="lastPracticed" sortDirection="desc" onChange={jest.fn()} />);
    const toggle = view.getByLabelText('Sort by Last practiced, currently most recent first, switches to oldest first');
    expect(toggle).toBe(view.getByTestId('segment-sort-direction-toggle'));
  });

  it('accessibilityLabel reuses directionLabel() for a different key too (name)', async () => {
    const view = await render(<SortControl sortKey="name" sortDirection="asc" onChange={jest.fn()} />);
    const toggle = view.getByLabelText('Sort by Name, currently A to Z, switches to Z to A');
    expect(toggle).toBe(view.getByTestId('segment-sort-direction-toggle'));
  });
});
