import { fireEvent, render } from '@testing-library/react-native';

import { SegmentForm } from './SegmentForm';

describe('SegmentForm [Story 1.2]', () => {
  it('submits the normalized name', async () => {
    const onSubmit = jest.fn();
    const view = await render(<SegmentForm submitLabel="Create" onSubmit={onSubmit} />);

    await fireEvent.changeText(view.getByTestId('segment-name-input'), '  Bar 24 arpeggio  ');
    await fireEvent.press(view.getByTestId('segment-form-submit'));

    expect(onSubmit).toHaveBeenCalledWith('Bar 24 arpeggio');
  });

  it('shows inline validation and does not submit an empty name', async () => {
    const onSubmit = jest.fn();
    const view = await render(<SegmentForm submitLabel="Create" onSubmit={onSubmit} />);

    await fireEvent.press(view.getByTestId('segment-form-submit'));

    expect(view.getByTestId('segment-name-error')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a name made only of invisible characters', async () => {
    const onSubmit = jest.fn();
    const view = await render(<SegmentForm submitLabel="Create" onSubmit={onSubmit} />);

    await fireEvent.changeText(view.getByTestId('segment-name-input'), '​﻿');
    await fireEvent.press(view.getByTestId('segment-form-submit'));

    expect(view.getByTestId('segment-name-error')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits once when tapped twice', async () => {
    const onSubmit = jest.fn();
    const view = await render(<SegmentForm submitLabel="Create" onSubmit={onSubmit} />);

    await fireEvent.changeText(view.getByTestId('segment-name-input'), 'Bar 24');
    const submit = view.getByTestId('segment-form-submit');
    await fireEvent.press(submit);
    await fireEvent.press(submit);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('caps the name length', async () => {
    const view = await render(<SegmentForm submitLabel="Create" onSubmit={jest.fn()} />);
    expect(view.getByTestId('segment-name-input').props.maxLength).toBe(80);
  });

  it('announces the validation error to screen readers', async () => {
    const view = await render(<SegmentForm submitLabel="Create" onSubmit={jest.fn()} />);
    await fireEvent.press(view.getByTestId('segment-form-submit'));

    const error = view.getByTestId('segment-name-error');
    expect(error.props.accessibilityRole).toBe('alert');
    expect(error.props['aria-live'] ?? error.props.accessibilityLiveRegion).toBe('polite');
  });
});
