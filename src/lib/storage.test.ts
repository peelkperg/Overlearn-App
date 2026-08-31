import { deleteKey, getNumber, getString, setNumber, setString } from './storage';

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
