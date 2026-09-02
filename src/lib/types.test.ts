import { isSessionState } from './types';

const validSession = {
  segmentId: 'segment-1',
  segmentName: 'Bar 24 arpeggio',
  currentStreak: 0,
  totalCorrectThisSession: 0,
  totalIncorrectThisSession: 0,
  sessionComplete: false,
  sessionStartTimestamp: '2026-08-31T12:00:00.000Z',
};

describe('lib/types isSessionState [Review][Patch]', () => {
  it('accepts a well-formed session', () => {
    expect(isSessionState(validSession)).toBe(true);
  });

  it.each(['currentStreak', 'totalCorrectThisSession', 'totalIncorrectThisSession'])(
    'rejects a NaN %s instead of letting it soft-lock the session',
    (field) => {
      expect(isSessionState({ ...validSession, [field]: NaN })).toBe(false);
    },
  );

  it.each(['currentStreak', 'totalCorrectThisSession', 'totalIncorrectThisSession'])(
    'rejects an Infinity %s',
    (field) => {
      expect(isSessionState({ ...validSession, [field]: Infinity })).toBe(false);
    },
  );
});
