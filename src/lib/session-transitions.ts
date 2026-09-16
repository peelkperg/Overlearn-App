import { calculateTargetStreak, OVERLEARNING_LEVEL } from '@/lib/mechanic';
import type { SessionState } from '@/lib/types';

// Pure session-state transitions (Mechanic Specification). No storage I/O —
// hooks/useActiveSession.ts calls these, then writes the result via
// lib/storage.ts.

// Session start (FR8, FR9): current_streak = 0, session_start_timestamp =
// now. target_streak isn't part of SessionState — the caller derives it via
// calculateTargetStreak(0), which evaluates to TARGET_FLOOR (5).
export function startSession(segmentId: string, segmentName: string): SessionState {
  return {
    segmentId,
    segmentName,
    currentStreak: 0,
    totalCorrectThisSession: 0,
    totalIncorrectThisSession: 0,
    sessionComplete: false,
    sessionStartTimestamp: new Date().toISOString(),
    completedTarget: null,
  };
}

// Correct (FR16, FR18, FR12): current_streak += 1, total_correct_this_session
// += 1 (Story 2.6 addition, see lib/types.ts), then the completion check is
// delegated to reconcileCompletion (below) — the single implementation of
// "streak >= target => complete, capture completedTarget" in this module.
// [Review][Decision] resolved 2026-09-12 (Story 5.2 code review round 2,
// option 1): this used to re-implement the >= check and the completedTarget
// capture inline, as a second copy of reconcileCompletion's rule that had
// already drifted from it (logCorrect recorded targetStreak; reconcileCompletion
// recorded max(targetStreak, currentStreak)). reconcileCompletion's own
// already-complete early-return also subsumes the old
// `session.completedTarget ?? ...` re-invocation guard this transition used
// to carry directly — a caller that mistakenly re-invokes this after
// completion still cannot overwrite the captured value, just via that
// guard instead of this one.
// Story 5.1 (FR35, FR36): overlearningLevel is an optional second parameter,
// same optional-param posture as calculateTargetStreak itself. [Review][Patch]
// found via code review 2026-09-12 (round 3): corrected — this used to claim
// the parameter is "threaded straight through to calculateTargetStreak", which
// stopped being true once logCorrect began delegating to reconcileCompletion
// (round 2, Decision 1): the level is resolved to OVERLEARNING_LEVEL here,
// before reconcileCompletion (and calculateTargetStreak inside it) ever sees
// it, so calculateTargetStreak's own default is dead on this path. The two
// defaults are the same constant (see mechanic.ts), so no value can drift —
// only the "straight through" framing was wrong.
export function logCorrect(session: SessionState, overlearningLevel?: number): SessionState {
  const advanced: SessionState = {
    ...session,
    currentStreak: session.currentStreak + 1,
    totalCorrectThisSession: session.totalCorrectThisSession + 1,
  };
  return reconcileCompletion(advanced, overlearningLevel ?? OVERLEARNING_LEVEL);
}

// Incorrect (FR10, FR17, FR18): total_incorrect_this_session += 1 first,
// then reconcile completion against the recalculated target, then
// current_streak = 0 only if the session did not just complete.
//
// [Review][Decision] resolved 2026-09-12 (Story 5.2 code review round 2,
// option 2): reconciles a missed settings-driven completion before zeroing
// the streak. Without this, a session left un-reconciled by a failed
// settings-driven write (the reconciliation effect's write can throw and
// silently swallow — see useActiveSession.ts) could have currentStreak
// already meeting or exceeding the live target, and an Incorrect tap would
// zero that streak before anything re-evaluated completion — silently
// discarding an already-achieved run with no notice.
//
// [Review][Decision] resolved 2026-09-12 (round 3, option 1: count, then
// reconcile against the new total): round 2's first cut reconciled against
// the *un-incremented* session, which returned early on completion and
// skipped `total_incorrect_this_session += 1` entirely — the tap the user
// made was never recorded, understating FR13/FR28's permanent mistake count
// by one. Incrementing first means the completion check evaluates the
// target the session actually has *after* this miss, so a miss that raises
// target_streak back above current_streak (crossing a floor/raise boundary,
// e.g. 10 -> 11 mistakes) now correctly prevents the rescue it would
// otherwise have granted, instead of silently discarding the count to grant
// it.
export function logIncorrect(session: SessionState, overlearningLevel?: number): SessionState {
  const advanced: SessionState = {
    ...session,
    totalIncorrectThisSession: session.totalIncorrectThisSession + 1,
  };
  const reconciled = reconcileCompletion(advanced, overlearningLevel ?? OVERLEARNING_LEVEL);
  if (reconciled.sessionComplete) return reconciled;
  return {
    ...advanced,
    currentStreak: 0,
  };
}

// The completion rule (v1.1, FR37; Story 5.2 Task 3, deferred from Story
// 5.1's code review). Three call sites share this one implementation:
// logCorrect (above), logIncorrect (above, reconciling before it zeroes the
// streak), and useActiveSession.ts's settings-driven reconciliation effect.
// [Review][Patch] found via code review 2026-09-11: this used to be
// hand-built inline in that effect — the only completion logic in the app
// that didn't go through this module, duplicating logCorrect's completion
// rule as a second copy that had already drifted from it by the time
// round 2's review caught it ([Review][Decision] resolved 2026-09-12,
// option 1: logCorrect now delegates here instead of keeping its own
// copy). No-op (returns the same session reference) if already complete
// or if the recalculated target isn't yet met — callers use reference
// equality to detect whether a write is needed.
//
// overlearningLevel is required, not optional like calculateTargetStreak's
// own parameter or logCorrect/logIncorrect's: this function has no
// pre-v1.1 callers to stay compatible with, so a direct caller forgetting
// the argument fails to compile rather than silently completing against
// the minimum level (0.5) calculateTargetStreak's default would supply.
// [Review][Patch] found via code review 2026-09-12 (round 3): corrected —
// this guarantee holds only for a caller of reconcileCompletion itself.
// logCorrect/logIncorrect resolve their own optional parameter to
// OVERLEARNING_LEVEL before calling in, silently reintroducing the same
// default this parameter was made required to prevent — but they are the
// functions application code actually calls, so in practice the "fail to
// compile" guarantee applies to a caller class this module has exactly one
// member of (useActiveSession.ts's reconciliation effect). It remains
// worth keeping required: it stops a *future* direct caller of
// reconcileCompletion from inheriting the silent default by omission.
//
// completedTarget captures session.currentStreak, not targetStreak: the
// guard above (`currentStreak < targetStreak` => not complete) already
// guarantees currentStreak >= targetStreak at this point, so
// Math.max(targetStreak, currentStreak) would always evaluate to
// currentStreak — recording currentStreak directly says the same thing
// without an expression that reads as conditional but cannot be. This
// matters because currentStreak can exceed targetStreak here in a way
// logCorrect's call site never does: unlike a tap-driven completion
// (currentStreak === targetStreak exactly, since a Correct only ever
// advances the streak by one past the target it was already tracking), a
// settings decrease can drop targetStreak below an already-larger
// currentStreak (e.g. streak 20, target dropped from 33 to 6) —recording
// the lower, stale target would understate the run in permanent history.
// [Review][Patch] found via code review 2026-09-12 (round 2): previously
// written as Math.max(targetStreak, session.currentStreak), which is
// provably always session.currentStreak given the guard above — no test
// could distinguish the two, and the max() reads as if targetStreak could
// still win. See prd.md's Mechanic Specification, "Settings-driven
// completion transition".
export function reconcileCompletion(session: SessionState, overlearningLevel: number): SessionState {
  if (session.sessionComplete) return session;
  const targetStreak = calculateTargetStreak(session.totalIncorrectThisSession, overlearningLevel);
  if (session.currentStreak < targetStreak) return session;
  return {
    ...session,
    sessionComplete: true,
    completedTarget: session.currentStreak,
  };
}

// Restart (FR20): all four session fields reset to starting values —
// current_streak = 0, total_incorrect_this_session = 0, target back to the
// floor (derived, not stored, from totalIncorrectThisSession = 0), and
// session_start_timestamp = now. Equivalent to starting fresh on the same
// segment; kept as its own named transition per the Mechanic Specification.
export function restartSession(session: SessionState): SessionState {
  return startSession(session.segmentId, session.segmentName);
}
