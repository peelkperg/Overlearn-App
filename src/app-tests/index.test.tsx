// Lives outside src/app/ deliberately: expo-router scans that directory
// for route files during bundling, and .test.tsx files there get pulled
// into the production Android/iOS bundle along with @testing-library —
// which fails Metro bundling (it imports Node's `console` module, which
// doesn't exist in the RN runtime). Confirmed on an EAS build. Import the
// screen under test via the @/app alias instead of colocating.
import { act, fireEvent, render, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useActiveSession } from '@/hooks/useActiveSession';
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
