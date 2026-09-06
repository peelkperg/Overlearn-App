// See index.test.tsx's header comment on why this file is not colocated
// under src/app/.
//
// [Review][Patch, CRITICAL] Both screens below are individually
// well-tested in isolation elsewhere (index.test.tsx, session.test.tsx),
// but a real navigation Stack keeps Home mounted underneath Segment
// Detail/Active Session rather than unmounting it — exactly the
// "no journey tested across screen boundaries" gap traceability-matrix.md
// called out. Rendering both together, as the real app actually does, is
// what caught this: a real device UAT run had tapping Start show Home's
// resume/discard prompt over the just-started session, and Discard from
// it left the Active Session screen with no session and no way out.
import { act, fireEvent, render, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { createSegment, renameSegment } from '@/lib/segments';
import { writeSession } from '@/lib/session';

import HomeScreen from '@/app/index';
import ActiveSessionScreen from '@/app/session/[id]';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const replaced = router.replace as jest.Mock;
const useLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams as jest.Mock;

describe('Home mounted underneath Active Session [Review][Patch, CRITICAL]', () => {
  beforeEach(() => {
    replaced.mockClear();
  });

  it('starting a fresh session does not show Home\'s resume/discard prompt', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });

    // Mirrors the real Stack: Home stays mounted underneath the pushed
    // Active Session screen, both subscribed to the same session store.
    const view = await render(
      <>
        <HomeScreen />
        <ActiveSessionScreen />
      </>,
    );

    expect(view.getByTestId('correct-button')).toBeTruthy();
    expect(view.queryByTestId('resume-discard-resume')).toBeNull();
    expect(view.queryByTestId('resume-discard-discard')).toBeNull();
  });

  it('a genuinely pre-existing interrupted session still prompts, and Discard from it does not strand Active Session on a blank screen', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    writeSession({
      segmentId: segment.id,
      segmentName: segment.name,
      currentStreak: 1,
      totalCorrectThisSession: 1,
      totalIncorrectThisSession: 0,
      sessionComplete: false,
      sessionStartTimestamp: '2026-08-31T12:00:00.000Z',
    });
    useLocalSearchParams.mockReturnValue({ id: segment.id });

    // One tree, both screens as siblings — the real Stack renders them
    // this way (Home underneath, Active Session pushed on top), and a
    // single render() root is what makes the cross-screen state update
    // below observable in one act() flush, same as it is on-device.
    const view = await render(
      <>
        <HomeScreen />
        <ActiveSessionScreen />
      </>,
    );

    // The interruption is real (existed before either screen mounted) —
    // the prompt is correct here, unlike the fresh-start case above.
    expect(view.getByTestId('resume-discard-discard')).toBeTruthy();
    expect(view.getByTestId('correct-button')).toBeTruthy();

    await fireEvent.press(view.getByTestId('resume-discard-discard'));

    // Discarding clears session.active globally. Active Session must not
    // render a dead blank view for it — it should navigate back to the list.
    expect(replaced).toHaveBeenCalledWith('/');
  });

  it('reflects a rename made after the interruption in the resume/discard prompt (FR31)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    writeSession({
      segmentId: segment.id,
      segmentName: segment.name,
      currentStreak: 1,
      totalCorrectThisSession: 1,
      totalIncorrectThisSession: 0,
      sessionComplete: false,
      sessionStartTimestamp: '2026-08-31T12:00:00.000Z',
    });
    useLocalSearchParams.mockReturnValue({ id: segment.id });

    const view = await render(
      <>
        <HomeScreen />
        <ActiveSessionScreen />
      </>,
    );

    const dialog = within(view.getByTestId('resume-discard-modal'));
    expect(dialog.getByText(/Bar 24 arpeggio/)).toBeTruthy();

    await act(async () => {
      renameSegment(segment.id, 'Bar 24-26 run');
    });

    expect(dialog.getByText(/Bar 24-26 run/)).toBeTruthy();
  });
});
