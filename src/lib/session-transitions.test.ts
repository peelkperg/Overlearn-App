import { calculateTargetStreak } from './mechanic';
import { logCorrect, logIncorrect, reconcileCompletion, restartSession, startSession } from './session-transitions';

describe('lib/session-transitions startSession [Story 2.1]', () => {
  it('initializes current_streak, total_correct_this_session, and total_incorrect_this_session to 0', () => {
    const session = startSession('segment-1', 'Bar 24 arpeggio');
    expect(session.currentStreak).toBe(0);
    expect(session.totalCorrectThisSession).toBe(0);
    expect(session.totalIncorrectThisSession).toBe(0);
  });

  it('initializes session_complete to false', () => {
    expect(startSession('segment-1', 'Bar 24 arpeggio').sessionComplete).toBe(false);
  });

  it('sets session_start_timestamp to an ISO 8601 string', () => {
    const session = startSession('segment-1', 'Bar 24 arpeggio');
    expect(session.sessionStartTimestamp).toBeTruthy();
    expect(new Date(session.sessionStartTimestamp).toISOString()).toBe(session.sessionStartTimestamp);
  });

  it('carries the segment id and name through unchanged', () => {
    const session = startSession('segment-1', 'Bar 24 arpeggio');
    expect(session.segmentId).toBe('segment-1');
    expect(session.segmentName).toBe('Bar 24 arpeggio');
  });

  it('derives an initial target_streak of the floor (5) via calculateTargetStreak', () => {
    const session = startSession('segment-1', 'Bar 24 arpeggio');
    expect(calculateTargetStreak(session.totalIncorrectThisSession)).toBe(5);
  });
});

describe('lib/session-transitions logCorrect [Story 2.2]', () => {
  it('increments current_streak by 1', () => {
    const session = startSession('segment-1', 'Bar 24 arpeggio');
    expect(logCorrect(session).currentStreak).toBe(1);
    expect(logCorrect(logCorrect(session)).currentStreak).toBe(2);
  });

  it('increments total_correct_this_session by 1 [Story 2.6]', () => {
    const session = startSession('segment-1', 'Bar 24 arpeggio');
    expect(logCorrect(session).totalCorrectThisSession).toBe(1);
    expect(logCorrect(logCorrect(session)).totalCorrectThisSession).toBe(2);
  });

  it('keeps total_correct_this_session accumulating across a miss (unlike current_streak) [Story 2.6]', () => {
    let session = startSession('segment-1', 'Bar 24 arpeggio');
    session = logCorrect(session);
    session = logCorrect(session);
    session = logIncorrect(session); // current_streak resets, total_correct doesn't
    session = logCorrect(session);
    expect(session.currentStreak).toBe(1);
    expect(session.totalCorrectThisSession).toBe(3);
  });

  it('does not change any other field', () => {
    const session = startSession('segment-1', 'Bar 24 arpeggio');
    const next = logCorrect(session);
    expect(next.segmentName).toBe(session.segmentName);
    expect(next.totalIncorrectThisSession).toBe(session.totalIncorrectThisSession);
    expect(next.sessionComplete).toBe(session.sessionComplete);
    expect(next.sessionStartTimestamp).toBe(session.sessionStartTimestamp);
  });

  it('does not mutate the input session', () => {
    const session = startSession('segment-1', 'Bar 24 arpeggio');
    logCorrect(session);
    expect(session.currentStreak).toBe(0);
  });
});

describe('lib/session-transitions logCorrect completion [Story 2.5]', () => {
  it('stays incomplete below the target', () => {
    let session = startSession('segment-1', 'Bar 24 arpeggio'); // target = 5
    for (let i = 0; i < 4; i++) session = logCorrect(session);
    expect(session.currentStreak).toBe(4);
    expect(session.sessionComplete).toBe(false);
  });

  it('marks complete the moment current_streak reaches target_streak', () => {
    let session = startSession('segment-1', 'Bar 24 arpeggio'); // target = 5
    for (let i = 0; i < 5; i++) session = logCorrect(session);
    expect(session.currentStreak).toBe(5);
    expect(session.sessionComplete).toBe(true);
  });

  it('marks complete against a raised target, not just the floor', () => {
    let session = startSession('segment-1', 'Bar 24 arpeggio');
    for (let i = 0; i < 11; i++) session = logIncorrect(session); // target -> 6
    for (let i = 0; i < 5; i++) session = logCorrect(session);
    expect(session.sessionComplete).toBe(false); // 5 < target 6

    session = logCorrect(session);
    expect(session.currentStreak).toBe(6);
    expect(session.sessionComplete).toBe(true);
  });
});

describe('lib/session-transitions logCorrect with an explicit overlearningLevel [Story 5.1]', () => {
  // At the default level (0.5), a session with totalIncorrectThisSession=10
  // sits at the floor (target 5). At level 3.0, calculateTargetStreak(10, 3)
  // = 30 — the two levels disagree on whether currentStreak=5 completes the
  // session, which is exactly the case this test needs to distinguish a
  // level-aware logCorrect from one that silently ignores its argument.
  it('produces a sessionComplete determination consistent with calculateTargetStreak at the given level', () => {
    let session = startSession('segment-1', 'Bar 24 arpeggio');
    for (let i = 0; i < 10; i++) session = logIncorrect(session);

    let atHighLevel = session;
    for (let i = 0; i < 5; i++) atHighLevel = logCorrect(atHighLevel, 3.0);
    expect(atHighLevel.currentStreak).toBe(5);
    expect(atHighLevel.sessionComplete).toBe(false); // 5 < calculateTargetStreak(10, 3.0) = 30

    let atDefaultLevel = session;
    for (let i = 0; i < 5; i++) atDefaultLevel = logCorrect(atDefaultLevel);
    expect(atDefaultLevel.currentStreak).toBe(5);
    expect(atDefaultLevel.sessionComplete).toBe(true); // 5 >= calculateTargetStreak(10) = 5
  });
});

describe('lib/session-transitions logCorrect completedTarget [Review][Patch]', () => {
  it('stays null while the session is not yet complete', () => {
    let session = startSession('segment-1', 'Bar 24 arpeggio');
    for (let i = 0; i < 4; i++) session = logCorrect(session);
    expect(session.completedTarget).toBeNull();
  });

  it('captures the target that was actually met, in the same write that flips sessionComplete', () => {
    let session = startSession('segment-1', 'Bar 24 arpeggio');
    for (let i = 0; i < 11; i++) session = logIncorrect(session); // target -> 6
    for (let i = 0; i < 6; i++) session = logCorrect(session);
    expect(session.sessionComplete).toBe(true);
    expect(session.completedTarget).toBe(6);
  });

  it('once captured, is not overwritten by a further call at a different level', () => {
    let session = startSession('segment-1', 'Bar 24 arpeggio');
    for (let i = 0; i < 11; i++) session = logIncorrect(session); // target -> 6
    for (let i = 0; i < 6; i++) session = logCorrect(session); // completes at level 0.5, target 6
    expect(session.completedTarget).toBe(6);

    // A caller must not call logCorrect again post-completion
    // (useActiveSession's own logCorrect() already guards this), but the
    // transition itself is asserted independently here to keep the
    // guarantee from resting solely on that caller-side check — at level
    // 3.0 the same totalIncorrectThisSession (11) would recompute to 33,
    // which must NOT overwrite the already-captured 6.
    const again = logCorrect(session, 3.0);
    expect(again.completedTarget).toBe(6);
  });
});

describe('lib/session-transitions reconcileCompletion [Story 5.2 Task 3, Review][Patch] 2026-09-11', () => {
  it('returns the same session reference, unchanged, when the target is not yet met', () => {
    let session = startSession('segment-1', 'Bar 24 arpeggio');
    for (let i = 0; i < 11; i++) session = logIncorrect(session); // target -> 6, at level 0.5
    for (let i = 0; i < 5; i++) session = logCorrect(session); // currentStreak 5, still below 6
    const result = reconcileCompletion(session, 0.5);
    expect(result).toBe(session); // reference equality: no-op, nothing to write
  });

  it('does not complete at currentStreak exactly one below the recalculated target (boundary)', () => {
    let session = startSession('segment-1', 'Bar 24 arpeggio');
    for (let i = 0; i < 11; i++) session = logIncorrect(session);
    for (let i = 0; i < 5; i++) session = logCorrect(session); // currentStreak 5
    // At level 3.0, calculateTargetStreak(11, 3.0) = 33, well above 5 — sanity
    // check the boundary at the actual level in force instead.
    expect(calculateTargetStreak(11, 0.5)).toBe(6);
    const result = reconcileCompletion(session, 0.5); // 5 < 6
    expect(result.sessionComplete).toBe(false);
    expect(result.completedTarget).toBeNull();
  });

  it('completes when currentStreak exactly equals the recalculated target (boundary)', () => {
    let session = startSession('segment-1', 'Bar 24 arpeggio');
    for (let i = 0; i < 11; i++) session = logIncorrect(session);
    for (let i = 0; i < 6; i++) session = logCorrect(session); // currentStreak 6, target(0.5) = 6
    const result = reconcileCompletion(session, 0.5);
    expect(result.sessionComplete).toBe(true);
    expect(result.completedTarget).toBe(6);
  });

  it('completes via a settings decrease alone, with no further Correct/Incorrect tap', () => {
    let session = startSession('segment-1', 'Bar 24 arpeggio');
    for (let i = 0; i < 11; i++) session = logIncorrect(session); // target -> 33 at level 3.0
    for (let i = 0; i < 6; i++) session = logCorrect(session, 3.0); // currentStreak 6, genuinely incomplete at 3.0
    expect(session.sessionComplete).toBe(false);
    expect(reconcileCompletion(session, 3.0)).toBe(session); // still not yet met at 3.0

    const reconciled = reconcileCompletion(session, 0.5); // target drops to 6, already met
    expect(reconciled.sessionComplete).toBe(true);
    expect(reconciled.completedTarget).toBe(6);
  });

  // [Review][Decision] resolved 2026-09-11 (Story 5.2 code review, option:
  // record the achieved streak): when currentStreak overshoots the
  // recalculated target, completedTarget captures the achieved streak, not
  // the newly-lowered target — logCorrect can never produce this shape
  // (its own completion always lands at currentStreak === targetStreak
  // exactly), so this case is reachable only through a settings decrease.
  it('captures the achieved streak, not the recalculated target, when the streak overshoots it', () => {
    let session = startSession('segment-1', 'Bar 24 arpeggio');
    for (let i = 0; i < 11; i++) session = logIncorrect(session); // target -> 33 at level 3.0
    for (let i = 0; i < 20; i++) session = logCorrect(session, 3.0); // currentStreak 20, still below 33
    expect(session.sessionComplete).toBe(false);

    const reconciled = reconcileCompletion(session, 0.5); // target drops to 6; 20 >= 6
    expect(reconciled.sessionComplete).toBe(true);
    expect(reconciled.completedTarget).toBe(20); // not 6 — the streak the user actually achieved
  });

  it('is a no-op on an already-complete session, regardless of level', () => {
    let session = startSession('segment-1', 'Bar 24 arpeggio');
    for (let i = 0; i < 4; i++) session = logCorrect(session); // completes at the floor, target 5
    session = logCorrect(session);
    expect(session.sessionComplete).toBe(true);
    expect(session.completedTarget).toBe(5);

    const result = reconcileCompletion(session, 3.0); // would recompute to a much higher target
    expect(result).toBe(session); // reference equality: no-op
    expect(result.completedTarget).toBe(5); // unchanged
  });
});

describe('lib/session-transitions logIncorrect [Story 2.3]', () => {
  it('resets current_streak to 0', () => {
    const session = logCorrect(logCorrect(startSession('segment-1', 'Bar 24 arpeggio'))); // currentStreak = 2
    expect(logIncorrect(session).currentStreak).toBe(0);
  });

  it('increments total_incorrect_this_session by 1', () => {
    const session = startSession('segment-1', 'Bar 24 arpeggio');
    expect(logIncorrect(session).totalIncorrectThisSession).toBe(1);
    expect(logIncorrect(logIncorrect(session)).totalIncorrectThisSession).toBe(2);
  });

  it('does not mutate the input session', () => {
    const session = startSession('segment-1', 'Bar 24 arpeggio');
    logIncorrect(session);
    expect(session.currentStreak).toBe(0);
    expect(session.totalIncorrectThisSession).toBe(0);
  });

  // Boundary table from the Mechanic Specification (also covered directly
  // in mechanic.test.ts) — re-verified here through the actual transition,
  // not just the formula, per R1's HIGH-risk 10/11 boundary.
  it.each([
    [9, 5],
    [10, 5],
    [11, 6],
  ])('after reaching total_incorrect_this_session=%i, target_streak=%i', (totalIncorrect, expectedTarget) => {
    let session = startSession('segment-1', 'Bar 24 arpeggio');
    for (let i = 0; i < totalIncorrect; i++) {
      session = logIncorrect(session);
    }
    expect(session.totalIncorrectThisSession).toBe(totalIncorrect);
    expect(calculateTargetStreak(session.totalIncorrectThisSession)).toBe(expectedTarget);
  });
});

describe('lib/session-transitions restartSession [Story 2.4]', () => {
  it('resets all four session fields to starting values', () => {
    let session = startSession('segment-1', 'Bar 24 arpeggio');
    session = logCorrect(session);
    session = logIncorrect(session);
    session = logIncorrect(session);

    const restarted = restartSession(session);

    expect(restarted.currentStreak).toBe(0);
    expect(restarted.totalCorrectThisSession).toBe(0);
    expect(restarted.totalIncorrectThisSession).toBe(0);
    expect(calculateTargetStreak(restarted.totalIncorrectThisSession)).toBe(5);
    expect(restarted.sessionComplete).toBe(false);
  });

  it('preserves the segment id and name [Story 2.10]', () => {
    const session = startSession('segment-1', 'Bar 24 arpeggio');
    const restarted = restartSession(session);
    expect(restarted.segmentId).toBe('segment-1');
    expect(restarted.segmentName).toBe('Bar 24 arpeggio');
  });

  it('sets a fresh session_start_timestamp', () => {
    const session = startSession('segment-1', 'Bar 24 arpeggio');
    const restarted = restartSession(session);
    expect(restarted.sessionStartTimestamp).toBeTruthy();
    expect(new Date(restarted.sessionStartTimestamp).toISOString()).toBe(restarted.sessionStartTimestamp);
  });

  it('does not mutate the input session', () => {
    const session = logIncorrect(startSession('segment-1', 'Bar 24 arpeggio'));
    restartSession(session);
    expect(session.totalIncorrectThisSession).toBe(1);
  });
});
