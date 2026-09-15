import { createMMKV } from 'react-native-mmkv';

// Single MMKV instance for the whole app — the sole point of contact with
// local storage, per architecture.md's Data Boundaries decision. No hook or
// component should import `react-native-mmkv` directly; go through the
// helpers below.
export const storage = createMMKV();

// [Review][Patch] found via code review 2026-09-05: a native MMKV read
// failure previously propagated as an uncaught throw, crashing the app on
// exactly the kind of corrupted-local-data case architecture.md's Error
// Handling pattern says must degrade gracefully instead.
export function getString(key: string): string | undefined {
  try {
    return storage.getString(key);
  } catch {
    return undefined;
  }
}

// [Story 6.1] A write can genuinely throw on web (localStorage.setItem on
// quota-exceeded) even though it essentially never does on native — proven
// by storage.test.ts's web-path suite. Degrades to no-op rather than crash,
// matching getString's existing pattern (both platforms; harmless on
// native, where this path was already effectively unreachable).
export function setString(key: string, value: string): void {
  try {
    storage.set(key, value);
  } catch {
    // See comment above.
  }
}

export function getNumber(key: string): number | undefined {
  return storage.getNumber(key);
}

export function setNumber(key: string, value: number): void {
  try {
    storage.set(key, value);
  } catch {
    // See setString's comment above.
  }
}

export function deleteKey(key: string): void {
  try {
    storage.remove(key);
  } catch {
    // See setString's comment above.
  }
}

// Change notification for the data modules above the storage layer. Without
// it, two mounted copies of the same hook hold independent snapshots and
// silently diverge — a write made on one screen is invisible to another that
// is already mounted. Keeps the MMKV API itself behind this module.
//
// [Story 6.1] onChange is wrapped before registration: neither the native
// nor the web MMKV implementation isolates listeners from each other
// (confirmed for web via storage.test.ts's web-path suite — the underlying
// `Set.forEach` has no per-callback try/catch) — one throwing subscriber
// aborts the fan-out entirely, silently skipping every listener registered
// after it AND propagating out through the `set`/`remove` call that
// triggered notification, crashing the write itself. Wrapping here, once,
// fixes both for every subscriber on both platforms without touching the
// raw store.
export function subscribeToKeys(onChange: (key: string) => void): () => void {
  const listener = storage.addOnValueChangedListener((key) => {
    try {
      onChange(key);
    } catch {
      // A subscriber's own failure must not block sibling notifications or
      // the write that triggered them.
    }
  });
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
// upgrade path — see migrations[0] and migrations[1] below for the two
// bumps this has gone through so far.
// [Review][Patch] found via code review 2026-09-12 (round 2): this comment
// used to claim "there is nothing in the registry yet because v1 is the
// only version that has ever shipped" in the same commit that populated
// migrations[1] — falsified by its own diff.
export const SCHEMA_VERSION = 2;

type VersionedEnvelope<T> = { __v: number; data: T };

function isVersionedEnvelope(value: unknown): value is VersionedEnvelope<unknown> {
  return typeof value === 'object' && value !== null && '__v' in value && 'data' in value && typeof (value as { __v: unknown }).__v === 'number';
}

// Each entry upgrades a payload written under key `n` to key `n + 1`'s shape.
// migrate() walks the chain until it reaches SCHEMA_VERSION or runs out of
// steps — a version with no registered migration (including any version
// newer than this build knows about) has no path forward and is treated as
// unreadable, same as a parse failure.
//
// migrations[0] is the un-enveloped, pre-versioning shape (everything written
// before this feature existed). v1 only added the { __v, data } wrapper — it
// didn't reshape any field — so version 0 → 1 is an identity passthrough.
// [Review][Patch, CRITICAL] found via code review 2026-09-05: without this
// entry, every pre-existing on-device segment/history/session record was
// silently discarded (quarantined) on first read after this envelope shipped.
// [Review][Patch] found via code review 2026-09-11: SessionState.completedTarget
// (Story 5.2) became a required field of the guard with no migration entry —
// every in-progress session persisted by a build before this change has no
// completedTarget key, so isSessionState would reject it and quarantine
// the user's session on first read after upgrade. v1 -> v2 defaults a
// missing completedTarget on session-shaped data only (detected by the
// presence of sessionComplete, a field unique to SessionState among this
// app's persisted shapes); every other shape (segments, history, settings)
// has no sessionComplete field and passes through unchanged.
//
// [Review][Patch] found via code review 2026-09-12 (round 2, two layers
// independently): the original version of this migration keyed only on
// the *presence* of completedTarget, so a session that was already
// sessionComplete: true on a pre-Story-5.2 build was defaulted to
// completedTarget: null exactly like an in-progress one — and nothing
// ever backfills it afterward, since reconcileCompletion (the only writer
// of completedTarget on an already-complete session) early-returns when
// sessionComplete is already true. Both of useActiveSession.ts's
// `?? targetStreak`/`?? calculateTargetStreak(...)` fallbacks then fire,
// recording a live-recomputed target the user never practiced under —
// the exact display/history divergence Story 5.2's Task 2 exists to
// prevent, reintroduced through the migration path. Fixed by backfilling
// from currentStreak when the session was already complete: every build
// before this migration existed had exactly one completion path
// (logCorrect), which always completed with currentStreak === the target
// in force at that moment — so the achieved streak IS the target that was
// met, with no need to recompute anything.
// Exported only for storage.test.ts's registry-coverage assertion (that
// every version in 0..SCHEMA_VERSION-1 has an entry) — no production
// caller outside this module.
export const migrations: Record<number, (data: unknown) => unknown> = {
  0: (data) => data,
  1: (data) => {
    if (typeof data === 'object' && data !== null && !Array.isArray(data) && 'sessionComplete' in data && !('completedTarget' in data)) {
      const record = data as Record<string, unknown>;
      const completedTarget = record.sessionComplete ? (record.currentStreak as number) : null;
      return { ...data, completedTarget };
    }
    return data;
  },
};

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
  const raw = getString(key);
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
  // version would be — migrations[0] passes it through unchanged (see above).
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

// [Review][Patch] found via Story 6.1 review: setObject is the busiest write
// path (every segment/history/session write goes through it) but called
// storage.set directly, bypassing setString's degrade-to-no-op protection —
// the exact web quota-exceeded crash this story exists to prevent.
export function setObject<T>(key: string, value: T): void {
  const envelope: VersionedEnvelope<T> = { __v: SCHEMA_VERSION, data: value };
  setString(key, JSON.stringify(envelope));
}
