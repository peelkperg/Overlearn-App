import { readHistory, writeHistoryEntry } from './history';
import {
  buildSortAggregates,
  createSegment,
  deleteSegment,
  duplicateSegment,
  getSegment,
  readSegments,
  renameSegment,
  sortSegments,
} from './segments';
import { readSession, writeSession } from './session';
import { storage } from './storage';

describe('lib/segments createSegment [Story 1.2]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('creates and persists a segment with a non-empty name', () => {
    const segment = createSegment('Bar 24 arpeggio');

    expect(segment.name).toBe('Bar 24 arpeggio');
    expect(segment.id).toBeTruthy();
    expect(segment.createdAt).toBeTruthy();

    const persisted = readSegments();
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toEqual(segment);
  });

  it('trims whitespace from the segment name', () => {
    const segment = createSegment('  Padded Name  ');
    expect(segment.name).toBe('Padded Name');
  });

  it('does not create a segment for an empty or whitespace-only name', () => {
    expect(() => createSegment('   ')).toThrow();
    expect(readSegments()).toHaveLength(0);
  });

  it('appends to existing segments rather than overwriting them', () => {
    createSegment('First');
    createSegment('Second');

    const persisted = readSegments();
    expect(persisted).toHaveLength(2);
    expect(persisted.map((s) => s.name)).toEqual(['First', 'Second']);
  });
});

describe('lib/segments deletion cascade [Review][Patch]', () => {
  it('purges the segment history (FR6)', () => {
    const segment = createSegment('Bar 24 arpeggio');
    writeHistoryEntry(segment.id, {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 5,
      totalMistakes: 0,
      totalAttempts: 5,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    });

    deleteSegment(segment.id);

    expect(readHistory(segment.id)).toEqual([]);
    expect(storage.getAllKeys()).not.toContain(`history.${segment.id}`);
  });

  it('clears an active session pointing at the deleted segment', () => {
    const segment = createSegment('Bar 24 arpeggio');
    writeSession({
      segmentId: segment.id,
      segmentName: segment.name,
      currentStreak: 3,
      totalCorrectThisSession: 3,
      totalIncorrectThisSession: 0,
      sessionComplete: false,
      sessionStartTimestamp: '2026-08-31T12:00:00.000Z',
    });

    deleteSegment(segment.id);

    expect(readSession()).toBeUndefined();
  });

  it('leaves a session belonging to a different segment alone', () => {
    const kept = createSegment('Kept');
    const removed = createSegment('Removed');
    writeSession({
      segmentId: kept.id,
      segmentName: kept.name,
      currentStreak: 1,
      totalCorrectThisSession: 1,
      totalIncorrectThisSession: 0,
      sessionComplete: false,
      sessionStartTimestamp: '2026-08-31T12:00:00.000Z',
    });

    deleteSegment(removed.id);

    expect(readSession()?.segmentId).toBe(kept.id);
  });

  it('gives every segment a distinct id under rapid creation', () => {
    const ids = new Set(Array.from({ length: 50 }, (_, index) => createSegment(`Segment ${index}`).id));
    expect(ids.size).toBe(50);
  });
});

describe('lib/segments duplicate names [Review][Decision 3]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('suffixes a duplicate name instead of rejecting it', () => {
    createSegment('Bar 24');
    expect(createSegment('Bar 24').name).toBe('Bar 24 (2)');
  });

  it('increments the suffix across further duplicates', () => {
    createSegment('Bar 24');
    createSegment('Bar 24');
    expect(createSegment('Bar 24').name).toBe('Bar 24 (3)');
  });

  it('compares case-insensitively while preserving the entered casing', () => {
    createSegment('Bar 24');
    expect(createSegment('bar 24').name).toBe('bar 24 (2)');
  });

  it('leaves a non-colliding name untouched', () => {
    createSegment('Bar 24');
    expect(createSegment('Bar 25').name).toBe('Bar 25');
  });

  it('skips a suffix the user already typed', () => {
    createSegment('Bar 24');
    createSegment('Bar 24 (2)');
    expect(createSegment('Bar 24').name).toBe('Bar 24 (3)');
  });
});

describe('lib/segments corrupt segments.list [Review][Decision 1]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('reads as empty rather than throwing when the stored payload is not an array', () => {
    storage.set('segments.list', '{"not":"an array"}');
    expect(readSegments()).toEqual([]);
  });

  it('preserves the corrupt payload when the next create overwrites the key', () => {
    storage.set('segments.list', '[{"id":"a","na');
    readSegments();
    createSegment('Bar 24 arpeggio');

    const backup = storage.getAllKeys().find((key) => key.startsWith('segments.list.corrupt.'));
    expect(backup).toBeDefined();
    expect(storage.getString(backup!)).toBe('[{"id":"a","na');
    expect(readSegments()).toHaveLength(1);
  });
});

describe('lib/segments getSegment [Story 1.4]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('returns the segment matching the given id', () => {
    const segment = createSegment('Bar 24 arpeggio');
    expect(getSegment(segment.id)).toEqual(segment);
  });

  it('returns undefined for an id that does not exist', () => {
    createSegment('Bar 24 arpeggio');
    expect(getSegment('missing-id')).toBeUndefined();
  });
});

describe('lib/segments renameSegment [Story 4.1]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('updates and persists the new name', () => {
    const segment = createSegment('Bar 24 arpeggio');
    const renamed = renameSegment(segment.id, 'Bar 24-26 run');

    expect(renamed.name).toBe('Bar 24-26 run');
    expect(getSegment(segment.id)?.name).toBe('Bar 24-26 run');
  });

  it('leaves id and createdAt unchanged', () => {
    const segment = createSegment('Bar 24 arpeggio');
    const renamed = renameSegment(segment.id, 'Bar 24-26 run');

    expect(renamed.id).toBe(segment.id);
    expect(renamed.createdAt).toBe(segment.createdAt);
  });

  it('throws on an empty or whitespace-only name and leaves storage unchanged', () => {
    const segment = createSegment('Bar 24 arpeggio');
    expect(() => renameSegment(segment.id, '   ')).toThrow();
    expect(getSegment(segment.id)?.name).toBe('Bar 24 arpeggio');
  });

  it('throws for an id that does not exist', () => {
    expect(() => renameSegment('missing-id', 'New name')).toThrow();
  });

  it('disambiguates a rename that collides with another segment (same case)', () => {
    createSegment('Bar 24');
    const other = createSegment('Bar 30');

    expect(renameSegment(other.id, 'Bar 24').name).toBe('Bar 24 (2)');
  });

  it('disambiguates a rename that collides with another segment (different case)', () => {
    createSegment('Bar 24');
    const other = createSegment('Bar 30');

    expect(renameSegment(other.id, 'bar 24').name).toBe('bar 24 (2)');
  });

  it('excludes the segment itself from the collision check (rename to own name, different case)', () => {
    const segment = createSegment('Bar 24');
    expect(renameSegment(segment.id, 'bar 24').name).toBe('bar 24');
  });

  it('does not affect other segments', () => {
    const a = createSegment('First');
    const b = createSegment('Second');
    renameSegment(a.id, 'Renamed');

    expect(getSegment(b.id)?.name).toBe('Second');
  });
});

describe('lib/segments duplicateSegment [Story 4.2]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('creates a copy with a disambiguated name, a fresh id, and a valid createdAt', () => {
    const source = createSegment('Bar 24 arpeggio');
    const copy = duplicateSegment(source.id);

    expect(copy.name).toBe('Bar 24 arpeggio (2)');
    expect(copy.id).not.toBe(source.id);
    expect(() => new Date(copy.createdAt).toISOString()).not.toThrow();
  });

  it('appends the copy to storage alongside the source', () => {
    const source = createSegment('Bar 24 arpeggio');
    const copy = duplicateSegment(source.id);

    const all = readSegments();
    expect(all).toHaveLength(2);
    expect(all.map((s) => s.id)).toEqual([source.id, copy.id]);
  });

  it('copies no history entries', () => {
    const source = createSegment('Bar 24 arpeggio');
    writeHistoryEntry(source.id, {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 5,
      totalMistakes: 0,
      totalAttempts: 5,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    });

    const copy = duplicateSegment(source.id);

    expect(readHistory(copy.id)).toEqual([]);
    expect(storage.getAllKeys()).not.toContain(`history.${copy.id}`);
  });

  it('leaves the source segment and its history unchanged', () => {
    const source = createSegment('Bar 24 arpeggio');
    writeHistoryEntry(source.id, {
      date: '2026-08-31T12:00:00.000Z',
      finalTarget: 5,
      totalMistakes: 0,
      totalAttempts: 5,
      sessionStartTimestamp: '2026-08-31T11:00:00.000Z',
    });

    duplicateSegment(source.id);

    expect(getSegment(source.id)?.name).toBe('Bar 24 arpeggio');
    expect(readHistory(source.id)).toHaveLength(1);
  });

  it('disambiguates against the source itself, not just other segments', () => {
    const source = createSegment('Bar 24 arpeggio');
    expect(duplicateSegment(source.id).name).toBe('Bar 24 arpeggio (2)');
  });

  it('increments the suffix across further duplicates', () => {
    const source = createSegment('Bar 24 arpeggio');
    duplicateSegment(source.id);
    expect(duplicateSegment(source.id).name).toBe('Bar 24 arpeggio (3)');
  });

  // [Review][Patch] found 2026-09-06: duplicating a copy nests suffixes
  // rather than incrementing the source's — this is documented in the
  // story's Dev Notes as expected and not to be "fixed", so it needs a
  // test lock or a future disambiguate change could silently break it.
  it('nests suffixes when duplicating a duplicate, rather than incrementing the source suffix', () => {
    const source = createSegment('Bar 24');
    const copy = duplicateSegment(source.id);
    expect(copy.name).toBe('Bar 24 (2)');
    expect(duplicateSegment(copy.id).name).toBe('Bar 24 (2) (2)');
  });

  it('throws for an id that does not exist', () => {
    expect(() => duplicateSegment('missing-id')).toThrow();
  });
});

describe('lib/segments deleteSegment [Story 1.6]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('permanently removes the segment from storage', () => {
    const segment = createSegment('Bar 24 arpeggio');
    deleteSegment(segment.id);

    expect(readSegments()).toHaveLength(0);
    expect(getSegment(segment.id)).toBeUndefined();
  });

  it('does not affect other segments', () => {
    const a = createSegment('First');
    const b = createSegment('Second');
    deleteSegment(a.id);

    expect(readSegments()).toHaveLength(1);
    expect(getSegment(b.id)).toBeTruthy();
  });

  it('is a no-op for an id that does not exist', () => {
    createSegment('First');
    expect(() => deleteSegment('missing-id')).not.toThrow();
    expect(readSegments()).toHaveLength(1);
  });
});

describe('lib/segments sortSegments [Story 4.3]', () => {
  const a = { id: 'a', name: 'Bravo', createdAt: '2026-01-02T00:00:00.000Z' };
  const b = { id: 'b', name: 'alpha', createdAt: '2026-01-01T00:00:00.000Z' };
  const c = { id: 'c', name: 'charlie', createdAt: '2026-01-03T00:00:00.000Z' };
  const segments = [a, b, c];

  const aggregates = new Map([
    ['a', { lastPracticed: '2026-02-01T00:00:00.000Z', solidification: 40 }],
    ['b', { lastPracticed: null, solidification: null }], // no history
    ['c', { lastPracticed: '2026-02-02T00:00:00.000Z', solidification: 90 }],
  ]);

  it('sorts by name ascending (case-insensitive)', () => {
    expect(sortSegments(segments, aggregates, 'name', 'asc').map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts by name descending', () => {
    expect(sortSegments(segments, aggregates, 'name', 'desc').map((s) => s.id)).toEqual(['c', 'a', 'b']);
  });

  it('sorts by createdAt ascending', () => {
    expect(sortSegments(segments, aggregates, 'createdAt', 'asc').map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts by createdAt descending', () => {
    expect(sortSegments(segments, aggregates, 'createdAt', 'desc').map((s) => s.id)).toEqual(['c', 'a', 'b']);
  });

  // [Review][Patch] found via code review 2026-09-08: this test's own name
  // claimed the no-history segment sorts "last, regardless of direction,"
  // but the assertions below prove the opposite — AC #4 floors its *value*
  // (oldest-possible date), not its position, so it sorts last under desc
  // and first under asc, same as any other segment's value would.
  it('floors the no-history segment to the oldest-possible date, so its position follows normal sort order (AC #4)', () => {
    expect(sortSegments(segments, aggregates, 'lastPracticed', 'desc').map((s) => s.id)).toEqual(['c', 'a', 'b']);
    expect(sortSegments(segments, aggregates, 'lastPracticed', 'asc').map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });

  it('floors the no-history segment to 0%, so its position follows normal sort order (AC #4)', () => {
    expect(sortSegments(segments, aggregates, 'solidification', 'desc').map((s) => s.id)).toEqual(['c', 'a', 'b']);
    expect(sortSegments(segments, aggregates, 'solidification', 'asc').map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });

  // [Review][Decision] found via code review 2026-09-08: plain `<`/`>` on
  // lowercased strings (Task 4's original spec) compares by raw UTF-16 code
  // unit, not human alphabetical order — resolved to switch to
  // locale-aware comparison; these lock the two concrete failure cases the
  // review verified.
  it('sorts accented names using locale-aware comparison, not raw code-unit order', () => {
    const accented = [
      { id: 'z', name: 'Zebra', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'e', name: 'Étude', createdAt: '2026-01-02T00:00:00.000Z' },
    ];
    // Raw code-unit order would put 'Étude' (U+00C9) after 'Zebra' (U+005A);
    // locale-aware order places accented letters near their base letter.
    expect(sortSegments(accented, new Map(), 'name', 'asc').map((s) => s.id)).toEqual(['e', 'z']);
  });

  it('sorts embedded numbers numerically, not lexicographically', () => {
    const numbered = [
      { id: 'ten', name: 'Bar 10', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'two', name: 'Bar 2', createdAt: '2026-01-02T00:00:00.000Z' },
    ];
    // Lexicographic order would put 'Bar 10' before 'Bar 2' ('1' < '2').
    expect(sortSegments(numbered, new Map(), 'name', 'asc').map((s) => s.id)).toEqual(['two', 'ten']);
  });

  it('does not mutate the input array', () => {
    const original = [...segments];
    sortSegments(segments, aggregates, 'name', 'asc');
    expect(segments).toEqual(original);
  });

  it('keeps a stable order for two segments with equal sort values', () => {
    const tied = [
      { id: 'x', name: 'Same', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'y', name: 'Same', createdAt: '2026-01-02T00:00:00.000Z' },
    ];
    expect(sortSegments(tied, new Map(), 'name', 'asc').map((s) => s.id)).toEqual(['x', 'y']);
  });
});

describe('lib/segments buildSortAggregates [Story 4.3]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('finds the entry with the latest date, not just the last-pushed one', () => {
    const segment = createSegment('Bar 24');
    // Pushed out of chronological order to prove max-by-date, not by array
    // position.
    writeHistoryEntry(segment.id, {
      date: '2026-01-01T00:00:00.000Z',
      finalTarget: 5,
      totalMistakes: 0,
      totalAttempts: 5,
      sessionStartTimestamp: 's1',
    });
    writeHistoryEntry(segment.id, {
      date: '2026-03-01T00:00:00.000Z',
      finalTarget: 5,
      totalMistakes: 0,
      totalAttempts: 5,
      sessionStartTimestamp: 's2',
    });
    writeHistoryEntry(segment.id, {
      date: '2026-02-01T00:00:00.000Z',
      finalTarget: 5,
      totalMistakes: 0,
      totalAttempts: 5,
      sessionStartTimestamp: 's3',
    });

    const aggregates = buildSortAggregates([segment]);
    expect(aggregates.get(segment.id)?.lastPracticed).toBe('2026-03-01T00:00:00.000Z');
  });

  it('returns null for both fields for a segment with zero history entries', () => {
    const segment = createSegment('Bar 24');
    const aggregates = buildSortAggregates([segment]);
    expect(aggregates.get(segment.id)).toEqual({ lastPracticed: null, solidification: null });
  });
});
