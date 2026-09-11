import { deleteKey, getNumber, getObject, getString, SCHEMA_VERSION, setNumber, setObject, setString, storage } from './storage';
import { isSegmentArray, isSessionState } from './types';

// Smoke test validating the Jest + jest-expo setup itself (R3 mitigation,
// per test-design-qa.md). react-native-mmkv v4 auto-mocks via createMMKV()'s
// isTest() check, so this runs without a real device/emulator.
describe('lib/storage smoke test', () => {
  it('round-trips a string value', () => {
    setString('smoke-test-string', 'hello');
    expect(getString('smoke-test-string')).toBe('hello');
  });

  it('round-trips a number value', () => {
    setNumber('smoke-test-number', 42);
    expect(getNumber('smoke-test-number')).toBe(42);
  });

  it('returns undefined for a deleted key', () => {
    setString('smoke-test-delete', 'temp');
    deleteKey('smoke-test-delete');
    expect(getString('smoke-test-delete')).toBeUndefined();
  });
});

describe('lib/storage getObject corruption handling', () => {
  const KEY = 'corrupt-test.list';

  const corruptBackups = () =>
    storage.getAllKeys().filter((key) => key.startsWith(`${KEY}.corrupt.`));

  beforeEach(() => {
    storage.clearAll();
  });

  it('round-trips a valid object that passes its shape guard', () => {
    const segments = [{ id: 'a', name: 'Bar 24', createdAt: '2026-01-01T00:00:00.000Z' }];
    setObject(KEY, segments);

    expect(getObject(KEY, isSegmentArray)).toEqual(segments);
    expect(corruptBackups()).toHaveLength(0);
  });

  it('returns undefined and quarantines unparseable JSON', () => {
    setString(KEY, '[{"id":"a","na');

    expect(getObject(KEY, isSegmentArray)).toBeUndefined();
    expect(corruptBackups()).toHaveLength(1);
    expect(getString(corruptBackups()[0])).toBe('[{"id":"a","na');
  });

  it('returns undefined and quarantines parseable JSON of the wrong shape', () => {
    setString(KEY, '{}');

    expect(getObject(KEY, isSegmentArray)).toBeUndefined();
    expect(corruptBackups()).toHaveLength(1);
    expect(getString(corruptBackups()[0])).toBe('{}');
  });

  it('rejects an array whose items are missing required fields', () => {
    setString(KEY, '[{"id":"a","name":"Bar 24"}]');

    expect(getObject(KEY, isSegmentArray)).toBeUndefined();
    expect(corruptBackups()).toHaveLength(1);
  });

  it('preserves the earliest quarantined snapshot across repeated corrupt reads', () => {
    setString(KEY, 'first-corruption');
    getObject(KEY, isSegmentArray);

    setString(KEY, 'second-corruption');
    getObject(KEY, isSegmentArray);

    const backups = corruptBackups();
    expect(backups).toHaveLength(1);
    expect(getString(backups[0])).toBe('first-corruption');
  });

  it('does not quarantine an absent key', () => {
    expect(getObject(KEY, isSegmentArray)).toBeUndefined();
    expect(corruptBackups()).toHaveLength(0);
  });

  it('parses without a shape guard, preserving the untyped call path', () => {
    setObject(KEY, { anything: true });
    expect(getObject(KEY)).toEqual({ anything: true });
  });
});

describe('lib/storage schema-version envelope [NFR assessment 2026-09-05]', () => {
  const KEY = 'schema-version-test.list';

  const corruptBackups = () => storage.getAllKeys().filter((key) => key.startsWith(`${KEY}.corrupt.`));

  beforeEach(() => {
    storage.clearAll();
  });

  it('wraps written values in a { __v, data } envelope', () => {
    setObject(KEY, { anything: true });
    expect(JSON.parse(getString(KEY)!)).toEqual({ __v: SCHEMA_VERSION, data: { anything: true } });
  });

  // [Review][Patch] found via code review 2026-09-11: SessionState.completedTarget
  // (Story 5.2) became a required field with no migration — this reproduces
  // and confirms the fix for a session persisted before that change.
  it('migrates a v1 session missing completedTarget by defaulting it to null [Review][Patch] 2026-09-11', () => {
    const preStory52Session = {
      segmentId: 'segment-1',
      segmentName: 'Bar 24 arpeggio',
      currentStreak: 3,
      totalCorrectThisSession: 3,
      totalIncorrectThisSession: 11,
      sessionComplete: false,
      sessionStartTimestamp: '2026-09-10T00:00:00.000Z',
      // no completedTarget key — this is what every session written before
      // Story 5.2 looks like on disk.
    };
    setString(KEY, JSON.stringify({ __v: 1, data: preStory52Session }));

    expect(getObject(KEY, isSessionState)).toEqual({ ...preStory52Session, completedTarget: null });
    expect(corruptBackups()).toHaveLength(0);
  });

  it('leaves non-session shapes untouched by the v1 -> v2 migration', () => {
    const segments = [{ id: 'a', name: 'Bar 24', createdAt: '2026-01-01T00:00:00.000Z' }];
    setString(KEY, JSON.stringify({ __v: 1, data: segments }));

    expect(getObject(KEY, isSegmentArray)).toEqual(segments);
    expect(corruptBackups()).toHaveLength(0);
  });

  it('reads a pre-versioning (un-enveloped) payload as version 0 and migrates it through unchanged [Review][Patch, CRITICAL]', () => {
    // Simulates data written before this feature existed. migrations[0] is
    // registered as an identity passthrough — v1 only added the envelope,
    // it didn't reshape any field — so this must NOT be quarantined; doing
    // so would silently discard every user's pre-existing on-device data
    // the first time this build reads it.
    const segments = [{ id: 'a', name: 'Bar 24', createdAt: '2026-01-01T00:00:00.000Z' }];
    setString(KEY, JSON.stringify(segments));

    expect(getObject(KEY, isSegmentArray)).toEqual(segments);
    expect(corruptBackups()).toHaveLength(0);
  });

  it('quarantines an envelope from a future schema version this build does not understand', () => {
    setString(KEY, JSON.stringify({ __v: 99, data: { anything: true } }));

    expect(getObject(KEY)).toBeUndefined();
    expect(corruptBackups()).toHaveLength(1);
  });

  it('round-trips a current-version envelope through the shape guard unchanged', () => {
    const segments = [{ id: 'a', name: 'Bar 24', createdAt: '2026-01-01T00:00:00.000Z' }];
    setObject(KEY, segments);

    expect(getObject(KEY, isSegmentArray)).toEqual(segments);
    expect(corruptBackups()).toHaveLength(0);
  });
});
