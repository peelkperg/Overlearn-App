// Lives outside src/app/ deliberately — see index.test.tsx in this same
// directory for why (expo-router scans src/app/ for route files during
// bundling; a co-located *.test.tsx there breaks the production bundle).
import { act, fireEvent, render } from '@testing-library/react-native';

import { createSegment, renameSegment } from '@/lib/segments';
import { readSettings, setOverlearningPercent } from '@/lib/settings';
import { readSession, writeSession } from '@/lib/session';
import { startSession } from '@/lib/session-transitions';
import { storage } from '@/lib/storage';

import SettingsScreen from '@/app/settings';

// Story 5.1: Configure the Overlearning Target (FR35, FR36, UX-DR13-16).
describe('SettingsScreen [Story 5.1]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('renders the current overlearningPercent (default 50%) as the stepper value on mount', async () => {
    const view = await render(<SettingsScreen />);
    expect(view.getByText('50%')).toBeTruthy();
  });

  it('tapping + increments the displayed value by 10 and persists it', async () => {
    const view = await render(<SettingsScreen />);

    await fireEvent.press(view.getByTestId('settings-increase'));

    expect(view.getByText('60%')).toBeTruthy();
    expect(readSettings().overlearningPercent).toBe(60);
  });

  it('tapping − decrements the displayed value by 10 and persists it', async () => {
    setOverlearningPercent(100);
    const view = await render(<SettingsScreen />);

    await fireEvent.press(view.getByTestId('settings-decrease'));

    expect(view.getByText('90%')).toBeTruthy();
    expect(readSettings().overlearningPercent).toBe(90);
  });

  it('at 50% (the default), the − button carries accessibilityState disabled: true', async () => {
    const view = await render(<SettingsScreen />);
    expect(view.getByTestId('settings-decrease').props.accessibilityState).toEqual({ disabled: true });
  });

  it('at 300%, the + button carries accessibilityState disabled: true', async () => {
    setOverlearningPercent(300);
    const view = await render(<SettingsScreen />);
    expect(view.getByTestId('settings-increase').props.accessibilityState).toEqual({ disabled: true });
  });

  it("the stepper value's ThemedText carries accessibilityLiveRegion=\"polite\"", async () => {
    const view = await render(<SettingsScreen />);
    expect(view.getByText('50%').props.accessibilityLiveRegion).toBe('polite');
  });

  it('the worked example line updates its text when the value changes', async () => {
    const view = await render(<SettingsScreen />);
    expect(
      view.getByText('At 50%, 10 mistakes in a session sets a target of 5 correct in a row.'),
    ).toBeTruthy();

    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));

    expect(
      view.getByText('At 150%, 10 mistakes in a session sets a target of 15 correct in a row.'),
    ).toBeTruthy();
  });

  it("the floor note's exact copy is present and unconditional", async () => {
    const view = await render(<SettingsScreen />);
    expect(view.getByText('A session never targets fewer than 5 correct in a row.')).toBeTruthy();

    await fireEvent.press(view.getByTestId('settings-increase'));

    expect(view.getByText('A session never targets fewer than 5 correct in a row.')).toBeTruthy();
  });

  it('has no confirmation dialog or Save button anywhere on the screen', async () => {
    const view = await render(<SettingsScreen />);
    expect(view.queryByText('Save')).toBeNull();
    expect(view.queryByText(/confirm/i)).toBeNull();
  });
});

// [Review][Patch] found via code review 2026-09-10: the disabled prop's
// accessibilityState was asserted, but nothing pressed the button at its
// boundary to confirm it is actually inert, not just visually dimmed.
describe('SettingsScreen disabled stepper boundaries [Review][Patch]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('pressing − at 50% does not change the value', async () => {
    const view = await render(<SettingsScreen />);

    await fireEvent.press(view.getByTestId('settings-decrease'));

    expect(view.getByText('50%')).toBeTruthy();
    expect(readSettings().overlearningPercent).toBe(50);
  });

  it('pressing + at 300% does not change the value', async () => {
    setOverlearningPercent(300);
    const view = await render(<SettingsScreen />);

    await fireEvent.press(view.getByTestId('settings-increase'));

    expect(view.getByText('300%')).toBeTruthy();
    expect(readSettings().overlearningPercent).toBe(300);
  });
});

// [Review][Patch] found via code review 2026-09-10: onPress used to close
// over the render-time `settings.overlearningPercent`, so two taps
// dispatched before a re-render commits both computed from the same stale
// value — netting one 10-point step instead of two.
describe('SettingsScreen rapid taps [Review][Patch]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('compounds two rapid + taps issued before a re-render, instead of netting one step', async () => {
    const view = await render(<SettingsScreen />);
    const increase = view.getByTestId('settings-increase');

    // Both taps are dispatched before either is allowed to commit a
    // re-render, simulating a fast double-tap. [Story 5.3] found while
    // adding this file's next describe block: firing this via two
    // concurrent, individually-awaited fireEvent.press(...) calls (each
    // wrapping its own internal act()) produced two *overlapping*, not
    // nested, act() scopes — React logged this as unsupported and left an
    // act scope unresolved past this test's end, corrupting the *next*
    // test's render (its component tree came back empty). Dispatching both
    // presses synchronously inside one single outer act() call instead
    // reproduces the same race (two handler calls queued before React
    // flushes) while keeping both act() scopes properly nested rather than
    // overlapping. [Review][Patch] found via code review 2026-09-11: an
    // earlier version of this comment claimed the fix called the
    // Pressable's onPress directly — it does not (the host node RNTL
    // returns here has no callable onPress prop; only fireEvent.press
    // reaches the handler). Verified this test still fails (asserts 70,
    // gets 60) against the pre-fix onPress that closes over stale state,
    // confirming the race is still genuinely exercised.
    await act(async () => {
      fireEvent.press(increase);
      fireEvent.press(increase);
    });

    expect(readSettings().overlearningPercent).toBe(70);
  });
});

// Story 5.3: See a Warning Before Changing Settings Mid-Session (FR39, UX-DR17, UX-DR24).
describe('SettingsScreen in-progress-session notice [Story 5.3]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('shows the standing notice with the segment name when a session is in progress', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    writeSession(startSession(segment.id, segment.name));

    const view = await render(<SettingsScreen />);

    const notice = view.getByTestId('in-progress-session-notice');
    expect(notice.props.children).toBe(
      "You have a session in progress for 'Bar 24 arpeggio.' Changing this target updates it immediately — and may complete the session.",
    );
    expect(notice.props.accessibilityLiveRegion).toBe('polite');
  });

  // [Review][Patch] found via code review 2026-09-11: AC #1 specifies "above
  // the stepper", but no test pinned the ordering — a refactor could move
  // the notice below the floor note without any test going red.
  it('renders the notice above the stepper row (AC #1)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    writeSession(startSession(segment.id, segment.name));

    const view = await render(<SettingsScreen />);

    const testIdsInOrder: string[] = [];
    const collect = (node: ReturnType<typeof view.toJSON>): void => {
      if (!node || typeof node === 'string') return;
      if (Array.isArray(node)) {
        node.forEach(collect);
        return;
      }
      if (node.props?.testID) testIdsInOrder.push(node.props.testID);
      collect(node.children as never);
    };
    collect(view.toJSON());

    const noticeIndex = testIdsInOrder.indexOf('in-progress-session-notice');
    const stepperIndex = testIdsInOrder.indexOf('settings-decrease');
    expect(noticeIndex).toBeGreaterThanOrEqual(0);
    expect(stepperIndex).toBeGreaterThan(noticeIndex);
  });

  it('does not render the notice when no session is in progress', async () => {
    const view = await render(<SettingsScreen />);
    expect(view.queryByTestId('in-progress-session-notice')).toBeNull();
  });

  it('does not render the notice for a session that has already completed', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    const session = startSession(segment.id, segment.name);
    writeSession({ ...session, sessionComplete: true, completedTarget: 5 });

    const view = await render(<SettingsScreen />);
    expect(view.queryByTestId('in-progress-session-notice')).toBeNull();
  });

  it('keeps a single standing notice visible across repeated stepper taps that do not complete the session', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    writeSession(startSession(segment.id, segment.name));

    const view = await render(<SettingsScreen />);
    const increase = view.getByTestId('settings-increase');

    // [Review][Patch] found via code review 2026-09-11: the original version
    // of this test only pressed increase, so the recalculated target only
    // ever rises — it never proved the notice survives a genuinely *effective*
    // repeated change. Asserting the displayed percent actually moved each
    // time (a session that has just been started has totalIncorrectThisSession
    // = 0, so its target sits at the floor and stays there regardless of the
    // level — increase can never complete it here).
    for (let i = 0; i < 3; i += 1) {
      await fireEvent.press(increase);
      expect(view.getByText(`${50 + (i + 1) * 10}%`)).toBeTruthy();
      expect(view.queryAllByTestId('in-progress-session-notice')).toHaveLength(1);
    }
  });

  it('falls back to the frozen session name, never the literal string "undefined", when the segment is gone', async () => {
    // [Review][Patch] found via code review 2026-09-11: settings.tsx had no
    // fallback for the case useSegment(session?.segmentId) can't resolve —
    // unreachable in the shipped app (deleteSegment clears its session), but
    // the only one of six FR31 display sites without app/index.tsx:228's
    // identical guard. Session written directly to storage with a segmentId
    // that has no corresponding segment, simulating that unreachable state.
    writeSession(startSession('segment-does-not-exist', 'Gone Segment'));

    const view = await render(<SettingsScreen />);

    const notice = view.getByTestId('in-progress-session-notice').props.children as string;
    expect(notice).not.toMatch(/undefined/);
    expect(notice).toContain('Gone Segment');
  });

  it('shows the current segment name after a rename made after the session started (FR31)', async () => {
    // [Review][Patch] found via code review 2026-09-11: every prior test in
    // this block seeded a session whose segmentName field already matched
    // the segment's stored name, so nothing distinguished useSegment (live)
    // from session.segmentName (frozen at session start) — an implementation
    // that read the frozen field would pass every other test here.
    const segment = createSegment('Bar 24 arpeggio');
    writeSession(startSession(segment.id, segment.name));
    renameSegment(segment.id, 'Bar 24-26 run');

    const view = await render(<SettingsScreen />);

    expect(view.getByTestId('in-progress-session-notice').props.children).toContain('Bar 24-26 run');
    expect(view.queryByText(/Bar 24 arpeggio/)).toBeNull();
  });

  it('hides the notice when a settings change alone completes the in-progress session (FR37, Story 5.2 Task 3)', async () => {
    // [Review][Patch] found via code review 2026-09-11: the story's headline
    // scenario ("...and may complete the session") had no test — this seeds
    // a session whose recalculated target drops to meet its already-achieved
    // streak purely from stepping the percent down on this same screen,
    // mirroring useActiveSession.test.ts's Story 5.2 Task 3 reconciliation
    // coverage but exercised through this screen's own render.
    setOverlearningPercent(100);
    const segment = createSegment('Bar 24 arpeggio');
    const session = startSession(segment.id, segment.name);
    writeSession({ ...session, totalIncorrectThisSession: 20, currentStreak: 10 });

    const view = await render(<SettingsScreen />);
    expect(view.getByTestId('in-progress-session-notice')).toBeTruthy();

    const decrease = view.getByTestId('settings-decrease');
    // 100% -> 50%, five 10-point steps: target = ceil(20 * level) falls from
    // 20 to 10, meeting the already-achieved currentStreak of 10 on the last tap.
    for (let i = 0; i < 5; i += 1) {
      await fireEvent.press(decrease);
    }

    expect(readSession()?.sessionComplete).toBe(true);
    expect(view.queryByTestId('in-progress-session-notice')).toBeNull();
  });
});
