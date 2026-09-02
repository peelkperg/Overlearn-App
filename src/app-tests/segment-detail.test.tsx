// See index.test.tsx's header comment on why this file is not colocated
// under src/app/.
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { writeHistoryEntry } from '@/lib/history';
import { createSegment } from '@/lib/segments';

import SegmentDetailScreen from '@/app/segment/[id]';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const pushed = router.push as jest.Mock;
const useLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams as jest.Mock;

describe('SegmentDetailScreen [Story 1.4, 3.1]', () => {
  beforeEach(() => {
    pushed.mockClear();
  });

  it('shows "not found" for an id that does not exist', async () => {
    useLocalSearchParams.mockReturnValue({ id: 'missing' });
    const view = await render(<SegmentDetailScreen />);

    expect(view.getByTestId('segment-detail-not-found')).toBeTruthy();
  });

  it('renders the segment name and starts a session on Start (FR3, FR8)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<SegmentDetailScreen />);

    expect(view.getByText('Bar 24 arpeggio')).toBeTruthy();
    await fireEvent.press(view.getByTestId('segment-detail-start'));

    expect(pushed).toHaveBeenCalledWith(`/session/${segment.id}`);
  });

  it('shows "no completed sessions" when history is empty (FR27)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<SegmentDetailScreen />);

    expect(view.queryByTestId('segment-detail-history-list')).toBeNull();
    expect(view.getByText('No completed sessions yet.')).toBeTruthy();
  });

  it('renders completed sessions in history (FR27, FR28)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    writeHistoryEntry(segment.id, {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 6,
      totalMistakes: 2,
      totalAttempts: 8,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    });
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<SegmentDetailScreen />);

    expect(view.getByTestId('segment-detail-history-list').props.data).toHaveLength(1);
    expect(view.getByText(/Target 6/)).toBeTruthy();
  });
});
