import { readHistory, writeHistoryEntry } from './history';
import { createSegment, deleteSegment, getSegment, readSegments, renameSegment } from './segments';
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
