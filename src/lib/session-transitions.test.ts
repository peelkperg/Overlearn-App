import { calculateTargetStreak } from './mechanic';
import { startSession } from './session-transitions';

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
