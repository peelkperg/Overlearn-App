// Mechanic Specification — authoritative target-streak formula (FR9-FR11).
// See _bmad-output/planning-artifacts/prd.md "Mechanic Specification".

export const TARGET_FLOOR = 5;
export const OVERLEARNING_LEVEL = 0.5;

// target_streak = max(TARGET_FLOOR, ceil(total_incorrect_this_session * OVERLEARNING_LEVEL))
// Monotonically non-decreasing within a session (rises or holds, never falls
// except via Restart, which is a separate reset — see lib/session-transitions.ts).
// A non-finite input (NaN/Infinity — reachable only through a corrupted-but
// -typeof-number session read, since every write site here passes a real
// counter) would otherwise propagate to a non-finite target, making
// `currentStreak >= targetStreak` permanently false and soft-locking the
// session with no route to completion.
export function calculateTargetStreak(totalIncorrectThisSession: number): number {
  const safeTotal = Number.isFinite(totalIncorrectThisSession) ? totalIncorrectThisSession : 0;
  return Math.max(TARGET_FLOOR, Math.ceil(safeTotal * OVERLEARNING_LEVEL));
}
