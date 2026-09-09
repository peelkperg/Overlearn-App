import { isHistoryEntryArray, isSessionState, isSettings } from './types';

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

const validSettings = {
  overlearningPercent: 50,
  sortKey: 'createdAt',
  sortDirection: 'asc',
};

describe('lib/types isSettings [Story 4.3]', () => {
  it('accepts a well-formed settings object', () => {
    expect(isSettings(validSettings)).toBe(true);
  });

  it.each([40, 55, 310])('rejects an out-of-range overlearningPercent (%i)', (overlearningPercent) => {
    expect(isSettings({ ...validSettings, overlearningPercent })).toBe(false);
  });

  it('rejects an unknown sortKey', () => {
    expect(isSettings({ ...validSettings, sortKey: 'popularity' })).toBe(false);
  });

  it('rejects an unknown sortDirection', () => {
    expect(isSettings({ ...validSettings, sortDirection: 'sideways' })).toBe(false);
  });

  it.each([null, 'a string', 42, ['array']])('rejects non-record input (%p)', (value) => {
    expect(isSettings(value)).toBe(false);
  });
});

const validHistoryEntry = {
  date: '2026-08-31T12:00:00.000Z',
  finalTarget: 6,
  totalMistakes: 2,
  totalAttempts: 10,
  sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
};

// [Review][Decision+Patch] found via code review 2026-09-08: typeof ===
// 'number' alone let Infinity/NaN/negative counters and corrupt/empty date
// strings through, each of which corrupts sortSegments' comparator (a
// non-transitive NaN result reorders the *entire* list, not just one row)
// or bypasses its epoch-floor fallback. Mirrors isSessionState's
// isNonNegativeInteger treatment above.
describe('lib/types isHistoryEntryArray [Story 4.3]', () => {
  it('accepts a well-formed history entry array', () => {
    expect(isHistoryEntryArray([validHistoryEntry])).toBe(true);
  });

  it.each(['finalTarget', 'totalMistakes', 'totalAttempts'])('rejects a NaN %s', (field) => {
    expect(isHistoryEntryArray([{ ...validHistoryEntry, [field]: NaN }])).toBe(false);
  });

  it.each(['finalTarget', 'totalMistakes', 'totalAttempts'])('rejects an Infinity %s', (field) => {
    expect(isHistoryEntryArray([{ ...validHistoryEntry, [field]: Infinity }])).toBe(false);
  });

  it.each(['finalTarget', 'totalMistakes', 'totalAttempts'])('rejects a negative %s', (field) => {
    expect(isHistoryEntryArray([{ ...validHistoryEntry, [field]: -1 }])).toBe(false);
  });

  it('rejects totalMistakes greater than totalAttempts', () => {
    expect(isHistoryEntryArray([{ ...validHistoryEntry, totalMistakes: 11, totalAttempts: 10 }])).toBe(false);
  });

  it('rejects an unparseable date', () => {
    expect(isHistoryEntryArray([{ ...validHistoryEntry, date: 'not a date' }])).toBe(false);
  });

  it('rejects an empty date', () => {
    expect(isHistoryEntryArray([{ ...validHistoryEntry, date: '' }])).toBe(false);
  });
});
