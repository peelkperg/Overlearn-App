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

// Schema-version envelope for setObject/getObject, added per the NFR
// assessment's Deployability finding (2026-09-05): without this, a future
// release that renames/restructures a persisted shape would have no way to
// migrate existing data — the type guards would just discard it. Bumping
// SCHEMA_VERSION and adding a migrations[oldVersion] entry is the intended
// upgrade path; there is nothing in the registry yet because v1 is the only
// version that has ever shipped.
export const SCHEMA_VERSION = 1;

type VersionedEnvelope<T> = { __v: number; data: T };

function isVersionedEnvelope(value: unknown): value is VersionedEnvelope<unknown> {
  return typeof value === 'object' && value !== null && '__v' in value && 'data' in value && typeof (value as { __v: unknown }).__v === 'number';
}

// Each entry upgrades a payload written under key `n` to key `n + 1`'s shape.
// migrate() walks the chain until it reaches SCHEMA_VERSION or runs out of
// steps — a version with no registered migration (including any version
// newer than this build knows about) has no path forward and is treated as
// unreadable, same as a parse failure.
const migrations: Record<number, (data: unknown) => unknown> = {};

function migrate(fromVersion: number, data: unknown): unknown {
  let version = fromVersion;
  let payload = data;
  while (version < SCHEMA_VERSION && migrations[version]) {
    payload = migrations[version](payload);
    version += 1;
  }
  return version === SCHEMA_VERSION ? payload : undefined;
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

  // A payload with no envelope (pre-versioning data, or a raw value written
  // directly rather than through setObject — see storage.test.ts) is treated
  // as version 0 and run through the same migration chain as a real old
  // version would be.
  let version = 0;
  let data: unknown = parsed;
  if (isVersionedEnvelope(parsed)) {
    version = parsed.__v;
    data = parsed.data;
  }

  if (version !== SCHEMA_VERSION) {
    data = migrate(version, data);
    if (data === undefined) {
      quarantine(key, raw);
      return undefined;
    }
  }

  if (isValid && !isValid(data)) {
    quarantine(key, raw);
    return undefined;
  }

  return data as T;
}

export function setObject<T>(key: string, value: T): void {
  const envelope: VersionedEnvelope<T> = { __v: SCHEMA_VERSION, data: value };
  storage.set(key, JSON.stringify(envelope));
}
