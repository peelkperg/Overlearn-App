import { archiveSegment, createSegment, deleteSegment, getSegment, readSegments } from './segments';
import { storage } from './storage';

describe('lib/segments createSegment [Story 1.2]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('creates and persists a segment with a non-empty name', () => {
    const segment = createSegment('Bar 24 arpeggio');

    expect(segment.name).toBe('Bar 24 arpeggio');
    expect(segment.archived).toBe(false);
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

describe('lib/segments archiveSegment [Story 1.5]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('marks the segment archived and preserves it in storage', () => {
    const segment = createSegment('Bar 24 arpeggio');
    const updated = archiveSegment(segment.id);

    expect(updated.archived).toBe(true);
    expect(readSegments()).toHaveLength(1);
    expect(getSegment(segment.id)?.archived).toBe(true);
  });

  it('does not affect other segments', () => {
    const a = createSegment('First');
    const b = createSegment('Second');
    archiveSegment(a.id);

    expect(getSegment(a.id)?.archived).toBe(true);
    expect(getSegment(b.id)?.archived).toBe(false);
  });

  it('throws for an id that does not exist', () => {
    expect(() => archiveSegment('missing-id')).toThrow();
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
