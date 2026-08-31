import { createSegment, getSegment, readSegments } from './segments';
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
