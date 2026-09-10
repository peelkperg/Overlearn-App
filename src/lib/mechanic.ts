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
//
// Story 5.1 (FR35, FR36): overlearningLevel is an optional second parameter,
// not a required one or an internal storage read — this keeps this function
// a pure formula with zero storage awareness. Reading the live setting is
// useActiveSession's job (see hooks/useActiveSession.ts); every existing
// call site and test that passes one argument keeps working unmodified.
export function calculateTargetStreak(
  totalIncorrectThisSession: number,
  overlearningLevel: number = OVERLEARNING_LEVEL,
): number {
  const safeTotal = Number.isFinite(totalIncorrectThisSession) ? totalIncorrectThisSession : 0;
  // Not reachable through the shipped UI (the stepper only ever produces a
  // valid clamped value), but setOverlearningPercent's own defensive clamp
  // (lib/settings.ts) can itself produce NaN from a NaN/Infinity caller —
  // without this guard, that NaN would propagate to a non-finite target,
  // silently soft-locking any session using it. Same failure class as the
  // totalIncorrectThisSession guard above.
  const safeLevel = Number.isFinite(overlearningLevel) ? overlearningLevel : OVERLEARNING_LEVEL;
  // overlearningPercent / 100 is not exact in floating point for most of the
  // 26 valid values (e.g. 110/100 -> 1.1, and 50 * 1.1 -> 55.00000000000001,
  // not 55). Left unguarded, Math.ceil on that noise returns one too many at
  // dozens of valid (percent, mistake-count) pairs — e.g. 110%/50 mistakes
  // naively yields 56, not 55. This value is written permanently into a
  // segment's history (complete()'s finalTarget), so the toFixed(6)
  // round-trip below clears the floating-point noise before Math.ceil sees
  // it, without affecting any legitimate fractional result at the precision
  // this formula ever produces (safeLevel is always a multiple of 0.1).
  return Math.max(TARGET_FLOOR, Math.ceil(Number((safeTotal * safeLevel).toFixed(6))));
}
