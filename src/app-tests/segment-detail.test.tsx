// See index.test.tsx's header comment on why this file is not colocated
// under src/app/.
import { act, fireEvent, render, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { writeHistoryEntry } from '@/lib/history';
import { createSegment, renameSegment } from '@/lib/segments';

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

  // Regression guard only — this heading already read the live name in
  // v1.0, so FR31 required no change here. The test exists so a future
  // refactor toward a stored name snapshot fails loudly. [Story 4.1, C23]
  it('reflects a rename in the detail heading (FR31)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<SegmentDetailScreen />);

    await act(async () => {
      renameSegment(segment.id, 'Bar 24-26 run');
    });

    expect(view.queryByText('Bar 24 arpeggio')).toBeNull();
    expect(view.getByText('Bar 24-26 run')).toBeTruthy();
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

describe('SegmentDetailScreen Solidification % summary [Story 4.4]', () => {
  // [Review][Patch] 2026-09-09: shared setup — every test differs only in
  // what history it writes, not in which segment or route param is active.
  // [Review][Patch] 2026-09-10: restored pushed.mockClear() (removed in the
  // first-pass refactor); jest.config.js sets no clearMocks, so without it
  // pushed accumulates calls from the Story 1.4 describe above.
  let segment: ReturnType<typeof createSegment>;

  beforeEach(() => {
    pushed.mockClear();
    segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
  });

  it('shows an em dash, not 0%, when the segment has zero completed sessions (AC #2)', async () => {
    const view = await render(<SegmentDetailScreen />);

    expect(view.getByTestId('segment-detail-solidification')).toHaveTextContent(/^Solidification: —$/);
  });

  it('shows 100% for one completed session with zero mistakes (AC #1)', async () => {
    writeHistoryEntry(segment.id, {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 5,
      totalMistakes: 0,
      totalAttempts: 5,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    });
    const view = await render(<SegmentDetailScreen />);

    expect(view.getByTestId('segment-detail-solidification')).toHaveTextContent(/^Solidification: 100%$/);
  });

  // Regression guard for the screen's wiring: the screen must aggregate across
  // sessions as one ratio, not average per-session percentages. Entry 1 is
  // 1/1 = 100%, entry 2 is 0/9 = 0%; naive average would show 50%, correct
  // aggregate is (1 + 0) / (1 + 9) = 10%. (Math unit-tested in history.test.ts.)
  it('aggregates multiple sessions as one ratio, not an average of per-session percentages (AC #1)', async () => {
    writeHistoryEntry(segment.id, {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 1,
      totalMistakes: 0,
      totalAttempts: 1,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    });
    writeHistoryEntry(segment.id, {
      date: '2026-08-31T13:00:00.000Z',
      finalTarget: 9,
      totalMistakes: 9,
      totalAttempts: 9,
      sessionStartTimestamp: '2026-08-31T12:30:00.000Z',
    });
    const view = await render(<SegmentDetailScreen />);

    expect(view.getByTestId('segment-detail-solidification')).toHaveTextContent(/^Solidification: 10%$/);
  });

  it('rounds a fractional percent to the nearest whole number', async () => {
    writeHistoryEntry(segment.id, {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 3,
      totalMistakes: 2,
      totalAttempts: 3,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    });
    const view = await render(<SegmentDetailScreen />);

    // 1/3 = 33.33...% -> rounds to 33%.
    expect(view.getByTestId('segment-detail-solidification')).toHaveTextContent(/^Solidification: 33%$/);
  });

  // [Review][Patch] 2026-09-09: locks the round-half-up direction at the
  // exact .5 boundary — 1/8 = 12.5%. A future switch to round-half-down or
  // truncate would pass every other rounding test here but fail this one.
  it('rounds an exact .5 percent up, not down', async () => {
    writeHistoryEntry(segment.id, {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 8,
      totalMistakes: 7,
      totalAttempts: 8,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    });
    const view = await render(<SegmentDetailScreen />);

    // 1/8 = 12.5% -> rounds to 13%.
    expect(view.getByTestId('segment-detail-solidification')).toHaveTextContent(/^Solidification: 13%$/);
  });

  // [Review][Patch] 2026-09-10: clamp-boundary guards. Math.round(99.5) === 100
  // (false perfection in an app whose premise is consecutive-perfect reps);
  // Math.round(0.33) === 0 (the exact "scored zero" misread the em dash guards
  // against). Only exact 100 and exact 0 should reach those strings.
  it('clamps 99.5% to "99%", not "100%" (false perfection guard)', async () => {
    // 199/200 correct = 99.5%
    writeHistoryEntry(segment.id, {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 200,
      totalMistakes: 1,
      totalAttempts: 200,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    });
    const view = await render(<SegmentDetailScreen />);

    expect(view.getByTestId('segment-detail-solidification')).toHaveTextContent(/^Solidification: 99%$/);
  });

  it('clamps 0.33% to "1%", not "0%" (scored-zero misread guard)', async () => {
    // 1/300 correct = 0.33...%
    writeHistoryEntry(segment.id, {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 300,
      totalMistakes: 299,
      totalAttempts: 300,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    });
    const view = await render(<SegmentDetailScreen />);

    expect(view.getByTestId('segment-detail-solidification')).toHaveTextContent(/^Solidification: 1%$/);
  });

  // [Review][Patch] 2026-09-10: the most critical AC #2 discrimination case —
  // a real 0% (0 correct of N) must render "0%", not the em dash. A regression
  // that collapses pct===0 into the null branch would leave this untested.
  it('shows 0% for a session where every attempt was a mistake (AC #1, null/0 distinction)', async () => {
    writeHistoryEntry(segment.id, {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 9,
      totalMistakes: 9,
      totalAttempts: 9,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    });
    const view = await render(<SegmentDetailScreen />);

    expect(view.getByTestId('segment-detail-solidification')).toHaveTextContent(/^Solidification: 0%$/);
  });

  // [Review][Patch] 2026-09-10: locks the positional claim in this story's
  // Completion Notes (test-design C32 positional half). The solidification
  // line must be inside segment-detail-history — not above the segment name
  // title or outside the section. Moving it leaves this test red.
  it('positions the summary line inside the history section (C32 positional half)', async () => {
    const view = await render(<SegmentDetailScreen />);
    const historySection = view.getByTestId('segment-detail-history');

    expect(within(historySection).getByTestId('segment-detail-solidification')).toBeTruthy();
  });

  it('updates live when a session completes while the screen stays mounted', async () => {
    const view = await render(<SegmentDetailScreen />);

    expect(view.getByTestId('segment-detail-solidification')).toHaveTextContent(/^Solidification: —$/);

    await act(async () => {
      writeHistoryEntry(segment.id, {
        date: '2026-08-31T12:00:00.000Z',
        finalTarget: 5,
        totalMistakes: 0,
        totalAttempts: 5,
        sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
      });
    });

    expect(view.getByTestId('segment-detail-solidification')).toHaveTextContent(/^Solidification: 100%$/);
  });

  // [Review][Patch] 2026-09-09: null→value is the easy path; value→value is
  // the realistic path (a second session updating an already-shown percentage).
  it('updates live from one percentage to a different one when a second session completes', async () => {
    writeHistoryEntry(segment.id, {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 5,
      totalMistakes: 0,
      totalAttempts: 5,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    });
    const view = await render(<SegmentDetailScreen />);

    expect(view.getByTestId('segment-detail-solidification')).toHaveTextContent(/^Solidification: 100%$/);

    await act(async () => {
      // Second session: 0/5 correct. Aggregate becomes (5 + 0) / (5 + 5) = 50%.
      writeHistoryEntry(segment.id, {
        date: '2026-08-31T13:00:00.000Z',
        finalTarget: 5,
        totalMistakes: 5,
        totalAttempts: 5,
        sessionStartTimestamp: '2026-08-31T12:30:00.000Z',
      });
    });

    expect(view.getByTestId('segment-detail-solidification')).toHaveTextContent(/^Solidification: 50%$/);
  });
});
