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

  it('accessibilityLabel names both the key and direction for name/asc', async () => {
    const view = await render(<SortControl sortKey="name" sortDirection="asc" onChange={jest.fn()} />);
    expect(view.getByTestId('segment-sort-control').props.accessibilityLabel).toBe('Sort by Name, A to Z');
  });

  it('accessibilityLabel names both the key and direction for lastPracticed/desc', async () => {
    const view = await render(<SortControl sortKey="lastPracticed" sortDirection="desc" onChange={jest.fn()} />);
    expect(view.getByTestId('segment-sort-control').props.accessibilityLabel).toBe(
      'Sort by Last practiced, most recent first',
    );
  });
});

describe('SortControl direction toggle [Story 4.7]', () => {
  // AC #1: button present, shows current direction.
  it('shows an up arrow for asc and a down arrow for desc', async () => {
    const asc = await render(<SortControl sortKey="name" sortDirection="asc" onChange={jest.fn()} />);
    expect(asc.getByTestId('segment-sort-direction-toggle')).toHaveTextContent('↑');
    await asc.unmount();

    const desc = await render(<SortControl sortKey="name" sortDirection="desc" onChange={jest.fn()} />);
    expect(desc.getByTestId('segment-sort-direction-toggle')).toHaveTextContent('↓');
  });

  // AC #2: tapping flips direction for the active key, not hardcoded to one key.
  it('tapping the toggle flips direction for the currently active sort key', async () => {
    const onChange = jest.fn();
    const view = await render(<SortControl sortKey="name" sortDirection="asc" onChange={onChange} />);
    await fireEvent.press(view.getByTestId('segment-sort-direction-toggle'));
    expect(onChange).toHaveBeenCalledWith('name', 'desc');
  });

  it('tapping the toggle flips direction for a non-name sort key too', async () => {
    const onChange = jest.fn();
    const view = await render(<SortControl sortKey="lastPracticed" sortDirection="desc" onChange={onChange} />);
    await fireEvent.press(view.getByTestId('segment-sort-direction-toggle'));
    expect(onChange).toHaveBeenCalledWith('lastPracticed', 'asc');
  });

  // AC #3: the toggle button is additive — Story 4.3's existing
  // re-tap-active-menu-option gesture must still work unchanged.
  it('does not interfere with the existing re-tap-active-option menu gesture (AC #3)', async () => {
    const onChange = jest.fn();
    const view = await render(<SortControl sortKey="name" sortDirection="asc" onChange={onChange} />);
    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-name'));
    expect(onChange).toHaveBeenCalledWith('name', 'desc');
  });

  // AC #4: announces both the current direction and what a tap would
  // produce, reusing directionLabel() — not a second hardcoded mapping.
  it('accessibilityLabel/Hint name the current direction and the direction a tap would produce', async () => {
    const view = await render(<SortControl sortKey="lastPracticed" sortDirection="desc" onChange={jest.fn()} />);
    const toggle = view.getByTestId('segment-sort-direction-toggle');
    expect(toggle.props.accessibilityLabel).toBe('Sort direction, currently most recent first');
    expect(toggle.props.accessibilityHint).toBe('Double tap to switch to oldest first');
  });

  it('accessibilityLabel/Hint reuse directionLabel() for a different key too (name)', async () => {
    const view = await render(<SortControl sortKey="name" sortDirection="asc" onChange={jest.fn()} />);
    const toggle = view.getByTestId('segment-sort-direction-toggle');
    expect(toggle.props.accessibilityLabel).toBe('Sort direction, currently A to Z');
    expect(toggle.props.accessibilityHint).toBe('Double tap to switch to Z to A');
  });
});
