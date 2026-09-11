// See index.test.tsx's header comment on why this file is not colocated
// under src/app/.
import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { readHistory } from '@/lib/history';
import { createSegment, renameSegment } from '@/lib/segments';
import { setOverlearningPercent } from '@/lib/settings';

import ActiveSessionScreen from '@/app/session/[id]';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const replaced = router.replace as jest.Mock;
const useLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams as jest.Mock;

async function pressTimes(view: Awaited<ReturnType<typeof render>>, testID: string, times: number) {
  for (let i = 0; i < times; i += 1) {
    await fireEvent.press(view.getByTestId(testID));
  }
}

describe('ActiveSessionScreen [Story 2.1-2.8, 2.4]', () => {
  beforeEach(() => {
    replaced.mockClear();
  });

  it('shows "not found" for a segment id that does not exist', async () => {
    useLocalSearchParams.mockReturnValue({ id: 'missing' });
    const view = await render(<ActiveSessionScreen />);

    expect(view.getByText('Segment not found.')).toBeTruthy();
  });

  it('starts a fresh session at 0/5 for a segment with no prior session (FR8, FR9)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    expect(view.getByTestId('correct-button')).toBeTruthy();
    expect(view.getByTestId('incorrect-button')).toBeTruthy();
    const readout = view.getByTestId('streak-readout');
    expect(readout.props.children[0]).toBe(0);
    expect(readout.props.children[2]).toBe(5);
  });

  it('Correct increments the visible streak (FR16)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    await fireEvent.press(view.getByTestId('correct-button'));

    expect(view.getByTestId('streak-readout').props.children[0]).toBe(1);
  });

  it('Incorrect resets the visible streak and can raise the visible target (FR10, FR17)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    await pressTimes(view, 'correct-button', 2);
    await pressTimes(view, 'incorrect-button', 11); // crosses the raise-target boundary

    const readout = view.getByTestId('streak-readout');
    expect(readout.props.children[0]).toBe(0);
    expect(readout.props.children[2]).toBe(6);
  });

  it('auto-completes at target and renders the Completion screen (FR12, FR13, FR22)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    await pressTimes(view, 'correct-button', 5); // target is 5 with no incorrects

    expect(view.getByTestId('completion-stats')).toBeTruthy();
    expect(view.queryByTestId('correct-button')).toBeNull();
    expect(view.queryByTestId('incorrect-button')).toBeNull();
    expect(view.queryByTestId('restart-control')).toBeNull();
  });

  it('Restart requires confirmation, then resets the visible streak and target (FR20, FR21)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    await pressTimes(view, 'correct-button', 2);
    await pressTimes(view, 'incorrect-button', 11);
    await fireEvent.press(view.getByTestId('restart-control'));

    // Confirmation gate: the streak must not reset on the tap that opens it.
    expect(view.getByTestId('streak-readout').props.children[0]).toBe(0);
    expect(view.getByTestId('restart-confirm-confirm')).toBeTruthy();

    await fireEvent.press(view.getByTestId('restart-confirm-confirm'));

    const readout = view.getByTestId('streak-readout');
    expect(readout.props.children[0]).toBe(0);
    expect(readout.props.children[2]).toBe(5);
  });

  it('Restart Cancel leaves the session state unchanged (FR21, FR29)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    await pressTimes(view, 'incorrect-button', 11);
    await fireEvent.press(view.getByTestId('restart-control'));
    await fireEvent.press(view.getByTestId('restart-confirm-cancel'));

    expect(view.getByTestId('streak-readout').props.children[2]).toBe(6);
    expect(readHistory(segment.id)).toEqual([]);
  });

  it('Done writes the history entry and returns to the list (FR14)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    await pressTimes(view, 'correct-button', 5);
    await fireEvent.press(view.getByTestId('completion-done'));

    expect(readHistory(segment.id)).toHaveLength(1);
    expect(replaced).toHaveBeenCalledWith('/');
  });

  it('reflects a rename made mid-session in the streak readout (FR31)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    expect(view.getByText('Bar 24 arpeggio')).toBeTruthy();

    await act(async () => {
      renameSegment(segment.id, 'Bar 24-26 run');
    });

    expect(view.queryByText('Bar 24 arpeggio')).toBeNull();
    expect(view.getByText('Bar 24-26 run')).toBeTruthy();
  });

  it('reflects a rename made mid-session in the completion summary (FR31)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    await pressTimes(view, 'correct-button', 5);
    await act(async () => {
      renameSegment(segment.id, 'Bar 24-26 run');
    });

    expect(view.getByTestId('completion-stats')).toHaveTextContent(/Bar 24-26 run/);
  });

  it('Repeat writes the history entry for the just-completed session, then starts a new one (FR14, FR15)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    await pressTimes(view, 'correct-button', 5);
    await fireEvent.press(view.getByTestId('completion-repeat'));

    expect(readHistory(segment.id)).toHaveLength(1);
    expect(view.getByTestId('correct-button')).toBeTruthy();
    expect(view.getByTestId('streak-readout').props.children[0]).toBe(0);
  });
});

// Story 5.2 (FR37): a target change made mid-session — the user backs out to
// Settings and back, this screen never unmounts — must apply immediately,
// with no restart/re-navigation. useActiveSession's targetStreak is already
// derived fresh every render (Story 5.1's plumbing); this is the first test
// that actually calls setOverlearningPercent() *after* a session has
// started, rather than before.
describe('ActiveSessionScreen mid-session settings change [Story 5.2]', () => {
  it('reflects a changed overlearning-% in the visible target with no restart (AC #1)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    await pressTimes(view, 'incorrect-button', 11); // target -> 6 at the 50% default
    expect(view.getByTestId('streak-readout').props.children[2]).toBe(6);

    await act(async () => {
      setOverlearningPercent(300); // level 3.0: calculateTargetStreak(11, 3.0) = 33
    });

    expect(view.getByTestId('streak-readout').props.children[2]).toBe(33);
    // currentStreak is untouched by the settings change — only the target moved.
    expect(view.getByTestId('streak-readout').props.children[0]).toBe(0);
  });

  it("anchors the Completion screen's displayed target to what was actually achieved, not a later settings change (Task 2)", async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    // With 0 mistakes the floor (5) governs regardless of level — that
    // would pass even with the live-value bug this test guards against.
    // 11 mistakes raises the target to 6 at the 50% default, distinct from
    // what it would recompute to at 300% (33), so the two are actually
    // distinguishable.
    await pressTimes(view, 'incorrect-button', 11); // target -> 6
    await pressTimes(view, 'correct-button', 6); // completes at target 6
    expect(view.getByTestId('completion-stats')).toHaveTextContent(/Target reached: 6/);

    await act(async () => {
      setOverlearningPercent(300); // live recompute would be 33 — must not change what's already shown
    });

    expect(view.getByTestId('completion-stats')).toHaveTextContent(/Target reached: 6/);
  });

  // [Review][Patch] found via code review 2026-09-11: Task 3's own subtask
  // specified asserting "what ... the rendered screen actually do", but no
  // test exercised the screen — only the hook. This is the user-visible
  // half of the settings-driven completion path: the active controls
  // disappear and the Completion screen renders, with no Correct/Incorrect
  // tap at all.
  it('swaps to the Completion screen when a settings change alone completes the session (Task 3)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    await act(async () => {
      setOverlearningPercent(300); // level 3.0
    });
    const view = await render(<ActiveSessionScreen />);

    await pressTimes(view, 'incorrect-button', 11); // target -> 33 at level 3.0
    await pressTimes(view, 'correct-button', 20); // currentStreak 20, still below 33
    expect(view.queryByTestId('completion-stats')).toBeNull();
    expect(view.getByTestId('correct-button')).toBeTruthy();

    await act(async () => {
      setOverlearningPercent(50); // target drops to 6; currentStreak 20 already overshoots it
    });

    expect(view.queryByTestId('correct-button')).toBeNull();
    expect(view.getByTestId('completion-stats')).toHaveTextContent(/Target reached: 20/); // achieved streak, not the lowered target of 6
  });
});
