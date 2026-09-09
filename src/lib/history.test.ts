import { calculateSolidificationPercent, getHistoryVersion, readHistory, subscribeToAnyHistory, writeHistoryEntry } from './history';
import { storage } from './storage';

describe('lib/history [Story 2.7]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('returns an empty array for a segment with no history', () => {
    expect(readHistory('segment-1')).toEqual([]);
  });

  it('writes and reads back a history entry', () => {
    const entry = {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 6,
      totalMistakes: 11,
      totalAttempts: 17,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    };
    writeHistoryEntry('segment-1', entry);
    expect(readHistory('segment-1')).toEqual([entry]);
  });

  it('appends to existing entries rather than overwriting them', () => {
    const first = {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 5,
      totalMistakes: 0,
      totalAttempts: 5,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    };
    const second = {
      date: '2026-08-31T13:00:00.000Z',
      finalTarget: 6,
      totalMistakes: 11,
      totalAttempts: 17,
      sessionStartTimestamp: '2026-08-31T12:30:00.000Z',
    };
    writeHistoryEntry('segment-1', first);
    writeHistoryEntry('segment-1', second);
    expect(readHistory('segment-1')).toEqual([first, second]);
  });

  it('keeps history separate per segment', () => {
    const entryA = {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 5,
      totalMistakes: 0,
      totalAttempts: 5,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    };
    const entryB = {
      date: '2026-08-31T13:00:00.000Z',
      finalTarget: 5,
      totalMistakes: 2,
      totalAttempts: 7,
      sessionStartTimestamp: '2026-08-31T12:00:00.000Z',
    };
    writeHistoryEntry('segment-1', entryA);
    writeHistoryEntry('segment-2', entryB);
    expect(readHistory('segment-1')).toEqual([entryA]);
    expect(readHistory('segment-2')).toEqual([entryB]);
  });

  it('drops a retry that shares sessionStartTimestamp with an existing entry [Review][Decision 1]', () => {
    const entry = {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 6,
      totalMistakes: 11,
      totalAttempts: 17,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    };
    writeHistoryEntry('segment-1', entry);
    // Simulates a kill between the history write and the session clear,
    // followed by a second Done tap on relaunch for the same session.
    writeHistoryEntry('segment-1', { ...entry, date: '2026-08-31T12:05:00.000Z' });

    expect(readHistory('segment-1')).toEqual([entry]);
  });
});

describe('lib/history calculateSolidificationPercent [Story 4.3]', () => {
  it('returns null for zero entries', () => {
    expect(calculateSolidificationPercent([])).toBeNull();
  });

  it('returns 100 for one entry with zero mistakes', () => {
    expect(
      calculateSolidificationPercent([
        { date: 'd', finalTarget: 5, totalMistakes: 0, totalAttempts: 5, sessionStartTimestamp: 's' },
      ]),
    ).toBe(100);
  });

  it('returns the correct fractional percent for one entry with some mistakes', () => {
    expect(
      calculateSolidificationPercent([
        { date: 'd', finalTarget: 10, totalMistakes: 2, totalAttempts: 10, sessionStartTimestamp: 's' },
      ]),
    ).toBe(80);
  });

  it('aggregates multiple entries as one ratio, not an average of per-entry percentages', () => {
    // Entry 1: 1/1 = 100%. Entry 2: 0/9 = 0%. Naive average would be 50%;
    // the correct aggregate ratio is (1 + 0) / (1 + 9) = 10%.
    const result = calculateSolidificationPercent([
      { date: 'd1', finalTarget: 1, totalMistakes: 0, totalAttempts: 1, sessionStartTimestamp: 's1' },
      { date: 'd2', finalTarget: 9, totalMistakes: 9, totalAttempts: 9, sessionStartTimestamp: 's2' },
    ]);
    expect(result).toBe(10);
  });

  // [Review][Patch] found via code review 2026-09-08: this branch existed
  // (guarding a divide-by-zero) but had no test — removing it silently
  // yields NaN, which is the exact comparator-corruption hazard the
  // isHistoryEntryArray hardening above defends against.
  it('returns null rather than dividing by zero when every entry has zero attempts', () => {
    const result = calculateSolidificationPercent([
      { date: 'd1', finalTarget: 0, totalMistakes: 0, totalAttempts: 0, sessionStartTimestamp: 's1' },
    ]);
    expect(result).toBeNull();
  });

  it('clamps a non-finite result to null as defense in depth', () => {
    // Bypasses isHistoryEntryArray's guard by constructing the entry
    // directly, simulating a caller that skipped the storage boundary.
    const result = calculateSolidificationPercent([
      { date: 'd1', finalTarget: 5, totalMistakes: -5, totalAttempts: Infinity, sessionStartTimestamp: 's1' },
    ]);
    expect(result).toBeNull();
  });
});

describe('lib/history subscribeToAnyHistory / getHistoryVersion [Story 4.3]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('notifies on a write to any segment\'s history key', () => {
    const onChange = jest.fn();
    const unsubscribe = subscribeToAnyHistory(onChange);
    writeHistoryEntry('segment-1', {
      date: '2026-09-08T00:00:00.000Z',
      finalTarget: 5,
      totalMistakes: 0,
      totalAttempts: 5,
      sessionStartTimestamp: 's1',
    });
    expect(onChange).toHaveBeenCalled();
    unsubscribe();
  });

  // [Review][Patch] found via code review 2026-09-08: a plain
  // key.startsWith('history.') prefix also matched quarantine's own
  // `history.<id>.corrupt.<ts>` backup keys — a quarantine write happens
  // during a readHistory() call, so this previously fired a store update
  // mid-render whenever corrupt data was first encountered.
  it('does not notify on a quarantine backup key write', () => {
    // Corrupt the stored payload so the next readHistory() quarantines it.
    storage.set('history.segment-1', 'not json');
    const onChange = jest.fn();
    const unsubscribe = subscribeToAnyHistory(onChange);

    readHistory('segment-1'); // triggers the quarantine write

    expect(onChange).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('increments the module-level history version on a real history write', () => {
    const before = getHistoryVersion();
    writeHistoryEntry('segment-1', {
      date: '2026-09-08T00:00:00.000Z',
      finalTarget: 5,
      totalMistakes: 0,
      totalAttempts: 5,
      sessionStartTimestamp: 's1',
    });
    expect(getHistoryVersion()).toBeGreaterThan(before);
  });

  it('does not increment the history version on a quarantine backup key write', () => {
    storage.set('history.segment-1', 'not json');
    const before = getHistoryVersion();

    readHistory('segment-1'); // triggers the quarantine write

    expect(getHistoryVersion()).toBe(before);
  });
});
