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
