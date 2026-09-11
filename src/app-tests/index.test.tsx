// Lives outside src/app/ deliberately: expo-router scans that directory
// for route files during bundling, and .test.tsx files there get pulled
// into the production Android/iOS bundle along with @testing-library —
// which fails Metro bundling (it imports Node's `console` module, which
// doesn't exist in the RN runtime). Confirmed on an EAS build. Import the
// screen under test via the @/app alias instead of colocating.
import { act, fireEvent, render, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useActiveSession } from '@/hooks/useActiveSession';
import { writeHistoryEntry } from '@/lib/history';
import * as segmentsLib from '@/lib/segments';
import { createSegment, renameSegment } from '@/lib/segments';
import { getObject } from '@/lib/storage';
import type { SessionState } from '@/lib/types';

import HomeScreen from '@/app/index';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

const pushed = router.push as jest.Mock;

describe('HomeScreen [Story 1.3]', () => {
  beforeEach(() => {
    pushed.mockClear();
  });

  it('shows the empty state with a create action when no segments exist', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByTestId('segment-list-empty')).toBeTruthy();
    await fireEvent.press(view.getByTestId('segment-list-create'));
    expect(pushed).toHaveBeenCalledWith('/segment/new');
  });

  // Story 5.1 (AC #1): tapping the gear icon navigates to Settings — same
  // assertion shape as the other navigation tests in this file.
  it('tapping the gear icon navigates to Settings', async () => {
    const view = await render(<HomeScreen />);

    await fireEvent.press(view.getByTestId('segment-list-settings'));

    expect(pushed).toHaveBeenCalledWith('/settings');
  });

  // Regression guard for Task 7's placement fix: the gear must not live
  // inside the segments.length === 0 ? <EmptyState /> : ... branch, or
  // Settings would be unreachable for a brand-new user with zero segments.
  it('shows the gear icon even with zero segments', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByTestId('segment-list-empty')).toBeTruthy();
    expect(view.getByTestId('segment-list-settings')).toBeTruthy();
  });

  // [Review][Patch] found via code review 2026-09-10: the only other gear
  // test covered zero segments — a regression that moved the gear inside
  // the non-empty branch instead would have passed both existing tests.
  it('shows the gear icon once segments exist too', async () => {
    createSegment('Bar 24 arpeggio');
    const view = await render(<HomeScreen />);

    expect(view.queryByTestId('segment-list-empty')).toBeNull();
    expect(view.getByTestId('segment-list-settings')).toBeTruthy();
  });

  it('keeps creation reachable once segments exist (FR1, FR4)', async () => {
    createSegment('Bar 24 arpeggio');
    const view = await render(<HomeScreen />);

    expect(view.queryByTestId('segment-list-empty')).toBeNull();
    await fireEvent.press(view.getByTestId('segment-list-create-more'));
    expect(pushed).toHaveBeenCalledWith('/segment/new');
  });

  it('lists every segment, with no enforced limit (FR2, FR4)', async () => {
    for (let index = 0; index < 12; index += 1) {
      createSegment(`Segment ${index}`);
    }
    const view = await render(<HomeScreen />);

    // Asserted on the list's data rather than the rendered rows: FlatList
    // virtualizes, so only the first window is mounted at any time.
    expect(view.getByTestId('segment-list').props.data).toHaveLength(12);
    expect(view.getAllByTestId(/^segment-row-segment-/).length).toBeGreaterThan(0);
  });

  it('reflects a segment created while the screen is already mounted', async () => {
    const view = await render(<HomeScreen />);
    expect(view.getByTestId('segment-list-empty')).toBeTruthy();

    // The list screen stays mounted while segment/new is pushed over it, so
    // this is exactly what a create from that screen looks like from here.
    const created = createSegment('Bar 24 arpeggio');

    expect(await view.findByTestId(`segment-row-${created.id}`)).toBeTruthy();
  });

  it('drops a deleted segment from the list while it is mounted (FR6)', async () => {
    const created = createSegment('Bar 24 arpeggio');
    const view = await render(<HomeScreen />);

    await fireEvent.press(view.getByTestId(`segment-row-menu-${created.id}`));
    await fireEvent.press(view.getByTestId(`segment-row-delete-${created.id}`));

    expect(view.queryByTestId(`segment-row-${created.id}`)).toBeNull();
  });

  // Regression guard only — the list row already read the live name in
  // v1.0, so FR31 required no change here. The test exists so a future
  // refactor toward a stored name snapshot fails loudly. [Story 4.1, C23]
  it('reflects a rename in the list row (FR31)', async () => {
    const created = createSegment('Bar 24 arpeggio');
    const view = await render(<HomeScreen />);

    await act(async () => {
      renameSegment(created.id, 'Bar 24-26 run');
    });

    expect(view.queryByText('Bar 24 arpeggio')).toBeNull();
    expect(view.getByText('Bar 24-26 run')).toBeTruthy();
  });

  it('duplicates a segment from the menu and shows a confirmation notice (FR32, UX-DR21)', async () => {
    const created = createSegment('Bar 24 arpeggio');
    const view = await render(<HomeScreen />);

    await fireEvent.press(view.getByTestId(`segment-row-menu-${created.id}`));
    await fireEvent.press(view.getByTestId(`segment-row-duplicate-${created.id}`));

    expect(view.getByTestId('segment-list').props.data).toHaveLength(2);
    const notice = view.getByTestId('segment-list-notice');
    expect(notice).toHaveTextContent('Duplicated as "Bar 24 arpeggio (2)"');
    expect(notice.props.accessibilityLiveRegion).toBe('polite');
  });

  it('shows no notice before any duplicate action', async () => {
    createSegment('Bar 24 arpeggio');
    const view = await render(<HomeScreen />);

    expect(view.queryByTestId('segment-list-notice')).toBeNull();
  });

  it('auto-dismisses the duplicate notice after a few seconds', async () => {
    jest.useFakeTimers();
    try {
      const created = createSegment('Bar 24 arpeggio');
      const view = await render(<HomeScreen />);

      await fireEvent.press(view.getByTestId(`segment-row-menu-${created.id}`));
      await fireEvent.press(view.getByTestId(`segment-row-duplicate-${created.id}`));
      expect(view.getByTestId('segment-list-notice')).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(view.queryByTestId('segment-list-notice')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  // [Review][Patch] found 2026-09-06: showNotice's reset-not-stack behavior
  // (a second duplicate within the notice window restarts the timer rather
  // than leaving the first's stale timeout to cut the new notice short) was
  // only asserted in a comment, not exercised — removing the `clearTimeout`
  // would have gone undetected.
  it('resets rather than stacks the auto-dismiss timer on a second duplicate within the window', async () => {
    jest.useFakeTimers();
    try {
      const first = createSegment('Bar 24');
      const view = await render(<HomeScreen />);

      await fireEvent.press(view.getByTestId(`segment-row-menu-${first.id}`));
      await fireEvent.press(view.getByTestId(`segment-row-duplicate-${first.id}`));
      expect(view.getByTestId('segment-list-notice')).toHaveTextContent('Duplicated as "Bar 24 (2)"');

      // 3s into the first notice's 4s window: a stale, un-reset first timer
      // would fire 1s from now and clear the second notice early.
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      await fireEvent.press(view.getByTestId(`segment-row-menu-${first.id}`));
      await fireEvent.press(view.getByTestId(`segment-row-duplicate-${first.id}`));
      expect(view.getByTestId('segment-list-notice')).toHaveTextContent('Duplicated as "Bar 24 (3)"');

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(view.getByTestId('segment-list-notice')).toHaveTextContent('Duplicated as "Bar 24 (3)"');

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      expect(view.queryByTestId('segment-list-notice')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  // [Review][Patch] found 2026-09-06: runAction cleared only `error`, never
  // `notice` — deleting the just-duplicated segment (or any later action)
  // left a stale "Duplicated as ..." notice on screen for up to 4s.
  it('clears the duplicate notice when a later action runs before it auto-dismisses', async () => {
    const created = createSegment('Bar 24 arpeggio');
    const view = await render(<HomeScreen />);

    await fireEvent.press(view.getByTestId(`segment-row-menu-${created.id}`));
    await fireEvent.press(view.getByTestId(`segment-row-duplicate-${created.id}`));
    expect(view.getByTestId('segment-list-notice')).toBeTruthy();

    await fireEvent.press(view.getByTestId(`segment-row-menu-${created.id}`));
    await fireEvent.press(view.getByTestId(`segment-row-delete-${created.id}`));

    expect(view.queryByTestId('segment-list-notice')).toBeNull();
  });
});

// Story 2.10 (FR24-FR26): an interrupted (session_complete = false) session
// must always surface the resume/discard prompt on the landing screen —
// never silently resumed or discarded. Prior to this, only the underlying
// hook was tested; nothing rendered the screen that actually shows the
// dialog to the user.
describe('HomeScreen resume/discard prompt [Story 2.10]', () => {
  beforeEach(() => {
    pushed.mockClear();
  });

  async function startInterruptedSession() {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    return result;
  }

  it('prompts resume/discard when an interrupted session exists (FR24)', async () => {
    await startInterruptedSession();
    const view = await render(<HomeScreen />);

    expect(view.getByTestId('resume-discard-resume')).toBeTruthy();
    expect(view.getByTestId('resume-discard-discard')).toBeTruthy();
    expect(view.getByText(/Bar 24 arpeggio/)).toBeTruthy();
  });

  it('never shows the prompt when there is no active session', async () => {
    const view = await render(<HomeScreen />);
    expect(view.queryByTestId('resume-discard-resume')).toBeNull();
  });

  it('Resume navigates to the session screen and dismisses the prompt (FR25)', async () => {
    await startInterruptedSession();
    const view = await render(<HomeScreen />);

    await fireEvent.press(view.getByTestId('resume-discard-resume'));

    expect(pushed).toHaveBeenCalledWith('/session/segment-1');
    expect(view.queryByTestId('resume-discard-resume')).toBeNull();
  });

  it('Discard clears the session and writes no history entry (FR26)', async () => {
    await startInterruptedSession();
    const view = await render(<HomeScreen />);

    await fireEvent.press(view.getByTestId('resume-discard-discard'));

    expect(view.queryByTestId('resume-discard-discard')).toBeNull();
    expect(getObject<SessionState>('session.active')).toBeUndefined();
    expect(getObject('history.segment-1')).toBeUndefined();
    expect(pushed).not.toHaveBeenCalled();
  });
});

describe('HomeScreen sort control [Story 4.3]', () => {
  it('is absent with 0 or 1 segment, present with 2+ (AC #7)', async () => {
    // [Review][Patch] found via code review 2026-09-08: each render below
    // must be unmounted before the next, or earlier trees stay subscribed
    // and keep re-rendering underneath the current one.
    const empty = await render(<HomeScreen />);
    expect(empty.queryByTestId('segment-sort-control')).toBeNull();
    await empty.unmount();

    createSegment('First');
    const one = await render(<HomeScreen />);
    expect(one.queryByTestId('segment-sort-control')).toBeNull();
    await one.unmount();

    createSegment('Second');
    const two = await render(<HomeScreen />);
    expect(two.getByTestId('segment-sort-control')).toBeTruthy();
    await two.unmount();
  });

  it('re-orders the rendered rows when a different sort option is selected (AC #2)', async () => {
    createSegment('Zebra');
    createSegment('Alpha');
    const view = await render(<HomeScreen />);

    // Default sort is createdAt/asc: Zebra (created first) leads.
    expect(view.getByTestId('segment-list').props.data.map((s: { name: string }) => s.name)).toEqual([
      'Zebra',
      'Alpha',
    ]);

    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-name'));

    expect(view.getByTestId('segment-list').props.data.map((s: { name: string }) => s.name)).toEqual([
      'Alpha',
      'Zebra',
    ]);
  });

  it('flips the order when the already-active option is tapped again (AC #3)', async () => {
    // [Review][Patch] found via code review 2026-09-08: the original version
    // of this test only asserted the post-flip order, which happened to be
    // identical to the screen's untouched default order — it could not tell
    // a genuine flip apart from an entirely inert sort control. Asserting
    // the intermediate (pre-flip) order too closes that gap: an inert
    // control would fail here already, before the flip is even attempted.
    createSegment('Zebra');
    createSegment('Alpha');
    const view = await render(<HomeScreen />);

    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-name')); // now name/asc
    expect(view.getByTestId('segment-list').props.data.map((s: { name: string }) => s.name)).toEqual([
      'Alpha',
      'Zebra',
    ]);

    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-name')); // flips to name/desc

    expect(view.getByTestId('segment-list').props.data.map((s: { name: string }) => s.name)).toEqual([
      'Zebra',
      'Alpha',
    ]);
  });

  it('re-sorts live when a history entry is written for the sort key currently in use (AC #5)', async () => {
    const lowerRanked = createSegment('First');
    const higherRanked = createSegment('Second');
    // Gives 'Second' a known initial rank ahead of 'First' (which has none
    // yet) so the "before" order is well-defined rather than an arbitrary
    // tie between two no-history segments.
    writeHistoryEntry(higherRanked.id, {
      date: '2026-09-01T00:00:00.000Z',
      finalTarget: 5,
      totalMistakes: 0,
      totalAttempts: 5,
      sessionStartTimestamp: '2026-09-01T00:00:00.000Z',
    });
    const view = await render(<HomeScreen />);

    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-lastPracticed')); // lastPracticed/desc

    expect(view.getByTestId('segment-list').props.data.map((s: { name: string }) => s.name)).toEqual([
      'Second',
      'First',
    ]);

    // A fresher practice for 'First' should move it above 'Second' without
    // the screen needing to be reopened.
    await act(async () => {
      writeHistoryEntry(lowerRanked.id, {
        date: '2026-09-08T12:00:00.000Z',
        finalTarget: 5,
        totalMistakes: 0,
        totalAttempts: 5,
        sessionStartTimestamp: '2026-09-08T11:00:00.000Z',
      });
    });

    expect(view.getByTestId('segment-list').props.data.map((s: { name: string }) => s.name)).toEqual([
      'First',
      'Second',
    ]);
  });

  // [Review][Patch] found via code review 2026-09-08: the previous version
  // of this test asserted "order is unchanged," but order cannot change
  // under createdAt sort on a history write regardless of whether the
  // conditional-subscription gate (Task 6) works — it would pass even with
  // the gate deleted entirely (mutation-verified). A spy on
  // buildSortAggregates is a real regression guard: that function is only
  // ever called when the active sort key needs history data (Task 6's
  // gate), so a history write must not trigger a second call while sorted
  // by name/createdAt.
  it('does not recompute sort aggregates when sorted by name/createdAt and a history entry is written (R9 regression guard)', async () => {
    const buildSpy = jest.spyOn(segmentsLib, 'buildSortAggregates');
    const first = createSegment('Alpha');
    createSegment('Beta');
    await render(<HomeScreen />);
    buildSpy.mockClear();

    await act(async () => {
      writeHistoryEntry(first.id, {
        date: '2026-09-08T12:00:00.000Z',
        finalTarget: 5,
        totalMistakes: 0,
        totalAttempts: 5,
        sessionStartTimestamp: '2026-09-08T11:00:00.000Z',
      });
    });

    expect(buildSpy).not.toHaveBeenCalled();
    buildSpy.mockRestore();
  });

  it('persists the selected sort option and direction across a relaunch (AC #6)', async () => {
    createSegment('Zebra');
    createSegment('Alpha');
    const view = await render(<HomeScreen />);

    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-name')); // name/asc

    await view.unmount();
    const relaunched = await render(<HomeScreen />);

    expect(relaunched.getByTestId('segment-sort-control').props.accessibilityLabel).toBe('Sort by Name, A to Z');
    expect(relaunched.getByTestId('segment-list').props.data.map((s: { name: string }) => s.name)).toEqual([
      'Alpha',
      'Zebra',
    ]);
  });

  it('announces both the sort key and direction, and updates when they change (AC #8)', async () => {
    createSegment('Zebra');
    createSegment('Alpha');
    const view = await render(<HomeScreen />);

    expect(view.getByTestId('segment-sort-control').props.accessibilityLabel).toBe(
      'Sort by Date created, oldest first',
    );

    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-lastPracticed'));

    expect(view.getByTestId('segment-sort-control').props.accessibilityLabel).toBe(
      'Sort by Last practiced, most recent first',
    );
  });

  // [Review][Patch] found via code review 2026-09-08: this test's own name
  // claimed a positional rule ("to the oldest-possible end") its own
  // assertions below contradict — AC #4 floors the segment's *value*, not
  // its position, so it correctly ends up first once direction flips.
  it('floors the no-history segment to the oldest-possible date, so its position flips with direction (AC #4)', async () => {
    const withHistory = createSegment('Practiced');
    createSegment('Never practiced');
    writeHistoryEntry(withHistory.id, {
      date: '2026-09-08T12:00:00.000Z',
      finalTarget: 5,
      totalMistakes: 0,
      totalAttempts: 5,
      sessionStartTimestamp: '2026-09-08T11:00:00.000Z',
    });
    const view = await render(<HomeScreen />);

    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-lastPracticed')); // desc: most recent first

    expect(view.getByTestId('segment-list').props.data.map((s: { name: string }) => s.name)).toEqual([
      'Practiced',
      'Never practiced',
    ]);

    await fireEvent.press(view.getByTestId('segment-sort-control'));
    await fireEvent.press(view.getByTestId('segment-sort-option-lastPracticed')); // flips to asc

    expect(view.getByTestId('segment-list').props.data.map((s: { name: string }) => s.name)).toEqual([
      'Never practiced',
      'Practiced',
    ]);
  });
});
