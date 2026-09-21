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
  // Story 5.1 code review [Review][Patch]: the target that was actually met
  // when sessionComplete flipped true, captured in the same write. Without
  // this, complete() had to re-derive the target from the *live*
  // overlearningLevel setting at Done-time — a settings change between
  // completion and Done would permanently misrecord history with a
  // finalTarget the user never actually practiced under, with no way to
  // detect or correct it later. null until the session completes.
  completedTarget: number | null;
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

// Story 4.3/Epic 5 (FR33-FR39): one Settings object per architecture.md's
// "one key per object, not one key per field" decision. This story only
// reads/writes sortKey/sortDirection; overlearningPercent's setter/UI is
// Epic 5's scope, but the full shape lives here now so both features share
// one MMKV key without a later migration.
export type SortKey = 'name' | 'createdAt' | 'lastPracticed' | 'solidification';
export type SortDirection = 'asc' | 'desc';

export interface Settings {
  overlearningPercent: number; // FR35-FR37: 50-300, step 10. Default 50.
  sortKey: SortKey; // FR33
  sortDirection: SortDirection; // FR33-FR34
}

// SPEC-voice-command-input (CAP-2, CAP-3). One base64-encoded WAV template
// per trigger — Boundaries: "Trigger audio persists as base64 strings via
// storage.ts's existing string/object API — no raw buffers" (spec-6-1
// precedent). `triggers` is null until the user has recorded and saved a
// full, distinguishable set (lib/voice-matcher.ts's checkDistinguishability
// gate) — there is no partial/two-of-three saved state.
export interface VoiceTriggerSet {
  wake: string;
  correct: string;
  incorrect: string;
}

export interface VoiceSettings {
  triggers: VoiceTriggerSet | null;
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

// [Review][Patch] found via code review 2026-09-08: typeof === 'number'
// alone accepts Infinity/NaN/negative/fractional history counters, which
// then flow straight into calculateSolidificationPercent's arithmetic.
// Because that percent feeds sortSegments' comparator, one corrupted entry
// doesn't just misreport its own segment — a NaN result makes the
// comparator non-transitive and randomizes the *entire* list's order.
// Mirrors isSessionState's isNonNegativeInteger treatment, plus a
// totalMistakes <= totalAttempts invariant (a violation would otherwise
// yield a negative percent that sorts below the 0%/no-history floor) and a
// parseable-date check on `date` (a corrupt/empty date would otherwise
// bypass sortSegments' epoch-floor fallback, since '' < '1970-...' is true).
function isValidIsoDate(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

export function isHistoryEntryArray(value: unknown): value is HistoryEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        isValidIsoDate(item.date) &&
        isNonNegativeInteger(item.finalTarget) &&
        isNonNegativeInteger(item.totalMistakes) &&
        isNonNegativeInteger(item.totalAttempts) &&
        item.totalMistakes <= item.totalAttempts &&
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
    typeof value.sessionStartTimestamp === 'string' &&
    (value.completedTarget === null || isNonNegativeInteger(value.completedTarget))
  );
}

// Exported so SortControl.tsx can build its menu from this same list rather
// than keeping a second, independently-maintained array — [Review][Patch]
// found via code review 2026-09-08: two separately-declared enumerations of
// SortKey (this one and SortControl's own) can drift apart with no compile
// error, silently validating/sorting by a key the menu offers no way to
// select or escape.
export const SortKeys: readonly SortKey[] = ['name', 'createdAt', 'lastPracticed', 'solidification'];
export const SortDirections: readonly SortDirection[] = ['asc', 'desc'];

// [Review][Patch] found via code review 2026-09-08: `as SortKey`/`as
// SortDirection` casts inside the guard whose whole purpose is eliminating
// unchecked assertions contradicted this file's own header. Proper
// user-defined type guards narrow without a cast.
function isSortKey(value: unknown): value is SortKey {
  return typeof value === 'string' && (SortKeys as readonly string[]).includes(value);
}

function isSortDirection(value: unknown): value is SortDirection {
  return typeof value === 'string' && (SortDirections as readonly string[]).includes(value);
}

function isVoiceTriggerSet(value: unknown): value is VoiceTriggerSet {
  return isRecord(value) && typeof value.wake === 'string' && typeof value.correct === 'string' && typeof value.incorrect === 'string';
}

export function isVoiceSettings(value: unknown): value is VoiceSettings {
  return isRecord(value) && (value.triggers === null || isVoiceTriggerSet(value.triggers));
}

export function isSettings(value: unknown): value is Settings {
  return (
    isRecord(value) &&
    typeof value.overlearningPercent === 'number' &&
    value.overlearningPercent >= 50 &&
    value.overlearningPercent <= 300 &&
    value.overlearningPercent % 10 === 0 &&
    isSortKey(value.sortKey) &&
    isSortDirection(value.sortDirection)
  );
}
