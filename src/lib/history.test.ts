import { readHistory, writeHistoryEntry } from './history';
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
