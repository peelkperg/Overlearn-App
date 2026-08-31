// Mechanic Specification — authoritative target-streak formula (FR9-FR11).
// See _bmad-output/planning-artifacts/prd.md "Mechanic Specification".

export const TARGET_FLOOR = 5;
export const OVERLEARNING_LEVEL = 0.5;

// target_streak = max(TARGET_FLOOR, ceil(total_incorrect_this_session * OVERLEARNING_LEVEL))
// Monotonically non-decreasing within a session (rises or holds, never falls
// except via Restart, which is a separate reset — see lib/session-transitions.ts).
export function calculateTargetStreak(totalIncorrectThisSession: number): number {
  return Math.max(TARGET_FLOOR, Math.ceil(totalIncorrectThisSession * OVERLEARNING_LEVEL));
}
