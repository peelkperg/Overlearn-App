// See index.test.tsx's header comment: test files for anything under
// src/app/ live here, not colocated, or Expo Router's bundling scan pulls
// @testing-library into the production bundle.
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import * as segmentsModule from '@/lib/segments';
import { createSegment, readSegments } from '@/lib/segments';

import RenameSegmentScreen from '@/app/segment/[id]/rename';

let mockCurrentId: string | undefined;

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: mockCurrentId }),
}));

const replaced = router.replace as jest.Mock;

describe('RenameSegmentScreen [Story 4.1, FR30, FR31]', () => {
  beforeEach(() => {
    replaced.mockClear();
  });

  it('pre-fills the form with the segment current name', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    mockCurrentId = segment.id;

    const view = await render(<RenameSegmentScreen />);

    expect(view.getByTestId('segment-name-input').props.value).toBe('Bar 24 arpeggio');
  });

  it('renames the segment and returns to the list on submit', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    mockCurrentId = segment.id;

    const view = await render(<RenameSegmentScreen />);
    await fireEvent.changeText(view.getByTestId('segment-name-input'), 'Bar 24-26 run');
    await fireEvent.press(view.getByTestId('segment-form-submit'));

    expect(readSegments().find((s) => s.id === segment.id)?.name).toBe('Bar 24-26 run');
    expect(replaced).toHaveBeenCalledWith('/');
  });

  it('disambiguates rather than rejects a colliding name', async () => {
    createSegment('Bar 30');
    const segment = createSegment('Bar 24 arpeggio');
    mockCurrentId = segment.id;

    const view = await render(<RenameSegmentScreen />);
    await fireEvent.changeText(view.getByTestId('segment-name-input'), 'Bar 30');
    await fireEvent.press(view.getByTestId('segment-form-submit'));

    expect(readSegments().find((s) => s.id === segment.id)?.name).toBe('Bar 30 (2)');
    expect(replaced).toHaveBeenCalledWith('/');
  });

  it('shows "Segment not found" for an unknown id', async () => {
    mockCurrentId = 'missing-id';
    const view = await render(<RenameSegmentScreen />);

    expect(view.getByTestId('segment-rename-not-found')).toBeTruthy();
  });

  it('shows a retry-eligible error and does not navigate when the write fails', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    mockCurrentId = segment.id;
    jest.spyOn(segmentsModule, 'renameSegment').mockImplementationOnce(() => {
      throw new Error('disk full');
    });

    const view = await render(<RenameSegmentScreen />);
    await fireEvent.changeText(view.getByTestId('segment-name-input'), 'Bar 24-26 run');
    await fireEvent.press(view.getByTestId('segment-form-submit'));

    expect(view.getByTestId('segment-rename-error')).toBeTruthy();
    expect(replaced).not.toHaveBeenCalled();

    await fireEvent.changeText(view.getByTestId('segment-name-input'), 'Bar 24-26 run');
    await fireEvent.press(view.getByTestId('segment-form-submit'));

    expect(readSegments().find((s) => s.id === segment.id)?.name).toBe('Bar 24-26 run');
  });
});
