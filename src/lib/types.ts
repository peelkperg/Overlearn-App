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
export interface SessionState {
  segmentName: string;
  currentStreak: number;
  totalIncorrectThisSession: number;
  sessionComplete: boolean;
  sessionStartTimestamp: string; // ISO 8601
}
