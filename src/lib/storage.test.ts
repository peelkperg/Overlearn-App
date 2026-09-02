import { deleteKey, getNumber, getObject, getString, setNumber, setObject, setString, storage } from './storage';
import { isSegmentArray } from './types';

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
    const segments = [{ id: 'a', name: 'Bar 24', archived: false, createdAt: '2026-01-01T00:00:00.000Z' }];
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
