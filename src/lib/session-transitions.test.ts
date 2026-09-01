import { calculateTargetStreak } from './mechanic';
import { logCorrect, logIncorrect, restartSession, startSession } from './session-transitions';

describe('lib/session-transitions startSession [Story 2.1]', () => {
  it('initializes current_streak and total_incorrect_this_session to 0', () => {
    const session = startSession('Bar 24 arpeggio');
    expect(session.currentStreak).toBe(0);
    expect(session.totalIncorrectThisSession).toBe(0);
  });

  it('initializes session_complete to false', () => {
    expect(startSession('Bar 24 arpeggio').sessionComplete).toBe(false);
  });

  it('sets session_start_timestamp to an ISO 8601 string', () => {
    const session = startSession('Bar 24 arpeggio');
    expect(session.sessionStartTimestamp).toBeTruthy();
    expect(new Date(session.sessionStartTimestamp).toISOString()).toBe(session.sessionStartTimestamp);
  });

  it('carries the segment name through unchanged', () => {
    expect(startSession('Bar 24 arpeggio').segmentName).toBe('Bar 24 arpeggio');
  });

  it('derives an initial target_streak of the floor (5) via calculateTargetStreak', () => {
    const session = startSession('Bar 24 arpeggio');
    expect(calculateTargetStreak(session.totalIncorrectThisSession)).toBe(5);
  });
});

describe('lib/session-transitions logCorrect [Story 2.2]', () => {
  it('increments current_streak by 1', () => {
    const session = startSession('Bar 24 arpeggio');
    expect(logCorrect(session).currentStreak).toBe(1);
    expect(logCorrect(logCorrect(session)).currentStreak).toBe(2);
  });

  it('does not change any other field', () => {
    const session = startSession('Bar 24 arpeggio');
    const next = logCorrect(session);
    expect(next.segmentName).toBe(session.segmentName);
    expect(next.totalIncorrectThisSession).toBe(session.totalIncorrectThisSession);
    expect(next.sessionComplete).toBe(session.sessionComplete);
    expect(next.sessionStartTimestamp).toBe(session.sessionStartTimestamp);
  });

  it('does not mutate the input session', () => {
    const session = startSession('Bar 24 arpeggio');
    logCorrect(session);
    expect(session.currentStreak).toBe(0);
  });
});

describe('lib/session-transitions logIncorrect [Story 2.3]', () => {
  it('resets current_streak to 0', () => {
    const session = logCorrect(logCorrect(startSession('Bar 24 arpeggio'))); // currentStreak = 2
    expect(logIncorrect(session).currentStreak).toBe(0);
  });

  it('increments total_incorrect_this_session by 1', () => {
    const session = startSession('Bar 24 arpeggio');
    expect(logIncorrect(session).totalIncorrectThisSession).toBe(1);
    expect(logIncorrect(logIncorrect(session)).totalIncorrectThisSession).toBe(2);
  });

  it('does not mutate the input session', () => {
    const session = startSession('Bar 24 arpeggio');
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
    let session = startSession('Bar 24 arpeggio');
    for (let i = 0; i < totalIncorrect; i++) {
      session = logIncorrect(session);
    }
    expect(session.totalIncorrectThisSession).toBe(totalIncorrect);
    expect(calculateTargetStreak(session.totalIncorrectThisSession)).toBe(expectedTarget);
  });
});

describe('lib/session-transitions restartSession [Story 2.4]', () => {
  it('resets all four session fields to starting values', () => {
    let session = startSession('Bar 24 arpeggio');
    session = logCorrect(session);
    session = logIncorrect(session);
    session = logIncorrect(session);

    const restarted = restartSession(session);

    expect(restarted.currentStreak).toBe(0);
    expect(restarted.totalIncorrectThisSession).toBe(0);
    expect(calculateTargetStreak(restarted.totalIncorrectThisSession)).toBe(5);
    expect(restarted.sessionComplete).toBe(false);
  });

  it('preserves the segment name', () => {
    const session = startSession('Bar 24 arpeggio');
    expect(restartSession(session).segmentName).toBe('Bar 24 arpeggio');
  });

  it('sets a fresh session_start_timestamp', () => {
    const session = startSession('Bar 24 arpeggio');
    const restarted = restartSession(session);
    expect(restarted.sessionStartTimestamp).toBeTruthy();
    expect(new Date(restarted.sessionStartTimestamp).toISOString()).toBe(restarted.sessionStartTimestamp);
  });

  it('does not mutate the input session', () => {
    const session = logIncorrect(startSession('Bar 24 arpeggio'));
    restartSession(session);
    expect(session.totalIncorrectThisSession).toBe(1);
  });
});
