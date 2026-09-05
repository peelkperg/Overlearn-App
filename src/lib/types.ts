// Shared type definitions for the data layer. Per architecture.md's
// Format Patterns: camelCase fields, ISO 8601 date strings, native booleans.

export interface Segment {
  id: string;
  name: string;
  createdAt: string; // ISO 8601
}

// Mechanic Specification's Session State (architecture.md's camelCase
// mapping). target_streak is intentionally absent — it's derived on every
// read via calculateTargetStreak(totalIncorrectThisSession), never stored.
// totalCorrectThisSession (Story 2.6) and segmentId (Story 2.10) are
// additions beyond the Mechanic Specification's six fields — see
// architecture.md's Session State section for why each was needed.
export interface SessionState {
  segmentId: string;
  segmentName: string;
  currentStreak: number;
  totalCorrectThisSession: number;
  totalIncorrectThisSession: number;
  sessionComplete: boolean;
  sessionStartTimestamp: string; // ISO 8601
}

// One completed-session record (FR28). Written only on Done (FR14) — never
// for a restarted or otherwise abandoned session (FR29).
export interface HistoryEntry {
  date: string; // ISO 8601
  finalTarget: number;
  totalMistakes: number;
  totalAttempts: number;
  // Dedup key: the completed session's own sessionStartTimestamp. Done's
  // history write and its session.active clear are two separate MMKV
  // writes with no atomicity between them — a kill in that window and a
  // retry on relaunch must not double-record the same practice run.
  sessionStartTimestamp: string; // ISO 8601
}

// Runtime shape guards for everything read back out of MMKV. On-device data
// is untrusted input: a `getObject<T>` cast alone is an unchecked assertion,
// and a parseable-but-wrong payload would reach the UI and throw there.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// [Review][Patch] found via code review 2026-09-05: Number.isFinite alone
// accepts a finite-but-nonsensical counter (e.g. -3.7) from corrupted local
// data, which then flows straight into calculateTargetStreak/logCorrect
// arithmetic. Session counters are non-negative integers by construction —
// enforce that at the untrusted-storage boundary, not just "not NaN".
function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function isSegmentArray(value: unknown): value is Segment[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.createdAt === 'string',
    )
  );
}

export function isHistoryEntryArray(value: unknown): value is HistoryEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.date === 'string' &&
        typeof item.finalTarget === 'number' &&
        typeof item.totalMistakes === 'number' &&
        typeof item.totalAttempts === 'number' &&
        typeof item.sessionStartTimestamp === 'string',
    )
  );
}

export function isSessionState(value: unknown): value is SessionState {
  return (
    isRecord(value) &&
    typeof value.segmentId === 'string' &&
    typeof value.segmentName === 'string' &&
    // Non-negative integer, not just Number.isFinite: a NaN/Infinity counter
    // (corrupted-but-typeof-number data) would make calculateTargetStreak's
    // output non-finite too, permanently soft-locking the session — and a
    // finite-but-negative/fractional counter (e.g. -3.7) is equally
    // nonsensical for a streak/attempt count, even though it passes
    // Number.isFinite.
    isNonNegativeInteger(value.currentStreak) &&
    isNonNegativeInteger(value.totalCorrectThisSession) &&
    isNonNegativeInteger(value.totalIncorrectThisSession) &&
    typeof value.sessionComplete === 'boolean' &&
    typeof value.sessionStartTimestamp === 'string'
  );
}
