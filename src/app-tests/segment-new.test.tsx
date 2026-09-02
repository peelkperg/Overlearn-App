// See index.test.tsx's header comment: test files for anything under
// src/app/ live here, not colocated, or Expo Router's bundling scan pulls
// @testing-library into the production bundle.
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import * as segmentsModule from '@/lib/segments';
import { readSegments } from '@/lib/segments';

import NewSegmentScreen from '@/app/segment/new';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

const replaced = router.replace as jest.Mock;

describe('NewSegmentScreen [Story 1.2, FR1]', () => {
  beforeEach(() => {
    replaced.mockClear();
  });

  it('creates the segment and returns to the list on submit', async () => {
    const view = await render(<NewSegmentScreen />);

    await fireEvent.changeText(view.getByTestId('segment-name-input'), 'Bar 24 arpeggio');
    await fireEvent.press(view.getByTestId('segment-form-submit'));

    expect(readSegments().map((segment) => segment.name)).toContain('Bar 24 arpeggio');
    expect(replaced).toHaveBeenCalledWith('/');
  });

  it('does not create a segment or navigate for an empty name', async () => {
    const view = await render(<NewSegmentScreen />);

    await fireEvent.press(view.getByTestId('segment-form-submit'));

    expect(readSegments()).toHaveLength(0);
    expect(replaced).not.toHaveBeenCalled();
  });

  it('shows a retry-eligible error and does not navigate when the write fails', async () => {
    jest.spyOn(segmentsModule, 'createSegment').mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    const view = await render(<NewSegmentScreen />);

    await fireEvent.changeText(view.getByTestId('segment-name-input'), 'Bar 24 arpeggio');
    await fireEvent.press(view.getByTestId('segment-form-submit'));

    expect(view.getByTestId('segment-create-error')).toBeTruthy();
    expect(replaced).not.toHaveBeenCalled();

    // The form remounts (key bump) after a failed write — the submit guard
    // must not still be latched from the failed attempt.
    await fireEvent.changeText(view.getByTestId('segment-name-input'), 'Bar 24 arpeggio');
    await fireEvent.press(view.getByTestId('segment-form-submit'));

    expect(readSegments().map((segment) => segment.name)).toContain('Bar 24 arpeggio');
  });
});
