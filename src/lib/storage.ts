import { createMMKV } from 'react-native-mmkv';

// Single MMKV instance for the whole app — the sole point of contact with
// local storage, per architecture.md's Data Boundaries decision. No hook or
// component should import `react-native-mmkv` directly; go through the
// helpers below.
export const storage = createMMKV();

export function getString(key: string): string | undefined {
  return storage.getString(key);
}

export function setString(key: string, value: string): void {
  storage.set(key, value);
}

export function getNumber(key: string): number | undefined {
  return storage.getNumber(key);
}

export function setNumber(key: string, value: number): void {
  storage.set(key, value);
}

export function deleteKey(key: string): void {
  storage.remove(key);
}

// Change notification for the data modules above the storage layer. Without
// it, two mounted copies of the same hook hold independent snapshots and
// silently diverge — a write made on one screen is invisible to another that
// is already mounted. Keeps the MMKV API itself behind this module.
export function subscribeToKeys(onChange: (key: string) => void): () => void {
  const listener = storage.addOnValueChangedListener(onChange);
  return () => listener.remove();
}

// A corrupt read collapses to `undefined`, which every caller coalesces to an
// empty value — and the next read-modify-write then overwrites the bad bytes
// permanently. This app is offline-only with no second copy anywhere, so the
// original is preserved here before that can happen. First write wins: a
// later corruption must not clobber the earliest surviving snapshot.
function quarantine(key: string, raw: string): void {
  const prefix = `${key}.corrupt.`;
  if (storage.getAllKeys().some((existing) => existing.startsWith(prefix))) return;
  storage.set(`${prefix}${Date.now()}`, raw);
}

// Defensive parsing per architecture.md's Error Handling pattern: corrupted
// or missing local data must not crash the app — falls back to `undefined`
// rather than throwing. `isValid` guards the parsed value's shape: JSON.parse
// succeeds on `{}`, `5`, `null` and friends, and without a shape check those
// reach callers cast as T and throw on the first array method.
export function getObject<T>(key: string, isValid?: (value: unknown) => value is T): T | undefined {
  const raw = storage.getString(key);
  if (raw == null) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    quarantine(key, raw);
    return undefined;
  }

  if (isValid && !isValid(parsed)) {
    quarantine(key, raw);
    return undefined;
  }

  return parsed as T;
}

export function setObject<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}
