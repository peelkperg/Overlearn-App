import { calculateTargetStreak } from '@/lib/mechanic';
import type { SessionState } from '@/lib/types';

// Pure session-state transitions (Mechanic Specification). No storage I/O —
// hooks/useActiveSession.ts calls these, then writes the result via
// lib/storage.ts.

// Session start (FR8, FR9): current_streak = 0, session_start_timestamp =
// now. target_streak isn't part of SessionState — the caller derives it via
// calculateTargetStreak(0), which evaluates to TARGET_FLOOR (5).
export function startSession(segmentName: string): SessionState {
  return {
    segmentName,
    currentStreak: 0,
    totalIncorrectThisSession: 0,
    sessionComplete: false,
    sessionStartTimestamp: new Date().toISOString(),
  };
}

// Correct (FR16, FR18, FR12): current_streak += 1; if that meets or exceeds
// target_streak, session_complete flips true in the same write (FR22) — the
// Mechanic Specification's completion check is part of this transition, not
// a separate step, so there's no window where current_streak >= target with
// session_complete still false.
export function logCorrect(session: SessionState): SessionState {
  const currentStreak = session.currentStreak + 1;
  const targetStreak = calculateTargetStreak(session.totalIncorrectThisSession);
  return { ...session, currentStreak, sessionComplete: currentStreak >= targetStreak };
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

// Restart (FR20): all four session fields reset to starting values —
// current_streak = 0, total_incorrect_this_session = 0, target back to the
// floor (derived, not stored, from totalIncorrectThisSession = 0), and
// session_start_timestamp = now. Equivalent to starting fresh on the same
// segment; kept as its own named transition per the Mechanic Specification.
export function restartSession(session: SessionState): SessionState {
  return startSession(session.segmentName);
}
