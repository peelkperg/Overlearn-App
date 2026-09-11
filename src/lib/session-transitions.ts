import { calculateTargetStreak } from '@/lib/mechanic';
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
// += 1 (Story 2.6 addition, see lib/types.ts); if current_streak meets or
// exceeds target_streak, session_complete flips true in the same write
// (FR22) — the Mechanic Specification's completion check is part of this
// transition, not a separate step, so there's no window where
// current_streak >= target with session_complete still false.
// Story 5.1 (FR35, FR36): overlearningLevel is an optional second parameter
// threaded straight through to calculateTargetStreak — same optional-param
// posture as that function itself. logIncorrect does NOT take this
// parameter: it never calls calculateTargetStreak at all (see below), so
// there is nothing to thread.
export function logCorrect(session: SessionState, overlearningLevel?: number): SessionState {
  const currentStreak = session.currentStreak + 1;
  const targetStreak = calculateTargetStreak(session.totalIncorrectThisSession, overlearningLevel);
  const sessionComplete = currentStreak >= targetStreak;
  return {
    ...session,
    currentStreak,
    totalCorrectThisSession: session.totalCorrectThisSession + 1,
    sessionComplete,
    // [Review][Patch] found via code review 2026-09-10: captured the first
    // time sessionComplete flips true, then frozen — `session.completedTarget
    // ?? ...` rather than a bare `sessionComplete ? targetStreak : ...`
    // means even a caller that mistakenly re-invokes this transition after
    // completion (useActiveSession's own logCorrect() already guards
    // against this, but this keeps the guarantee independent of that
    // caller-side check) cannot overwrite the already-captured value at a
    // since-changed level. A later settings change, before Done writes the
    // history entry, can no longer alter which target this session is
    // recorded as having met — see complete() in hooks/useActiveSession.ts.
    completedTarget: session.completedTarget ?? (sessionComplete ? targetStreak : null),
  };
}

// Incorrect (FR10, FR17, FR18): applied in this exact order per the
// Mechanic Specification — current_streak = 0, then
// total_incorrect_this_session += 1. target_streak isn't stored (derived
// on read via calculateTargetStreak), so there's no third field to update
// here; the caller re-derives it from the returned totalIncorrectThisSession.
export function logIncorrect(session: SessionState): SessionState {
  return {
    ...session,
    currentStreak: 0,
    totalIncorrectThisSession: session.totalIncorrectThisSession + 1,
  };
}

// Settings-driven completion (v1.1, FR37; Story 5.2 Task 3, deferred from
// Story 5.1's code review). [Review][Patch] found via code review
// 2026-09-11: this used to be hand-built inline in
// hooks/useActiveSession.ts's reconciliation effect — the only completion
// logic in the app that didn't go through this module, duplicating
// logCorrect's completion rule (>= target, capture completedTarget) as a
// second copy that could silently drift from it. No-op (returns the same
// session reference) if already complete or if the recalculated target
// isn't yet met — the caller uses reference equality to detect whether a
// write is needed.
//
// completedTarget captures max(targetStreak, session.currentStreak), not
// targetStreak alone: unlike logCorrect (which always completes with
// currentStreak === targetStreak exactly), a settings decrease can leave
// currentStreak strictly greater than the newly-recalculated targetStreak
// (e.g. streak 20, target dropped from 33 to 6) — recording the lower
// number would understate the run in permanent history. See
// prd.md's Mechanic Specification, "Settings-driven completion transition".
export function reconcileCompletion(session: SessionState, overlearningLevel?: number): SessionState {
  if (session.sessionComplete) return session;
  const targetStreak = calculateTargetStreak(session.totalIncorrectThisSession, overlearningLevel);
  if (session.currentStreak < targetStreak) return session;
  return {
    ...session,
    sessionComplete: true,
    completedTarget: Math.max(targetStreak, session.currentStreak),
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
