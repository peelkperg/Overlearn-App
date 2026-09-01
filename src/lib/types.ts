// Shared type definitions for the data layer. Per architecture.md's
// Format Patterns: camelCase fields, ISO 8601 date strings, native booleans.

export interface Segment {
  id: string;
  name: string;
  archived: boolean;
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
}
