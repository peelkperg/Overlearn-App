import { useSyncExternalStore } from 'react';

import { useFeedbackSignal } from '@/components/session/useFeedbackSignal';
import { calculateTargetStreak } from '@/lib/mechanic';
import * as sessionStore from '@/lib/session';
import * as transitions from '@/lib/session-transitions';
import type { SessionState } from '@/lib/types';

// The single owner of the session lifecycle (architecture.md's
// Implementation Patterns rule): every session-state mutation goes through
// this hook's exposed functions, never direct storage access from a screen.
// The key itself lives in lib/session.ts, which lib/segments.ts also needs
// in order to clear a session whose segment was deleted.
//
// Subscribed to the storage layer rather than held in local useState: two
// screens have this hook mounted at once (app/index.tsx stays mounted
// under app/session/[id].tsx in the Stack), and a private snapshot would
// let a mutation made through one instance go unseen by the other. Every
// mutator below also reads sessionStore.readSession() fresh rather than
// closing over the `session` this render returned — the render's `session`
// can be one tap behind if two taps are dispatched before React commits
// the first, and a stale read would let the second overwrite the first
// instead of compounding on it.
export function useActiveSession() {
  const session = useSyncExternalStore(sessionStore.subscribeToSession, sessionStore.readSession) ?? null;
  const feedback = useFeedbackSignal();

  // Story 2.1 (FR8, FR9): begins a session immediately, no input/confirmation.
  const start = (segmentId: string, segmentName: string): SessionState => {
    const next = transitions.startSession(segmentId, segmentName);
    sessionStore.writeSession(next);
    feedback.reset(); // Story 2.8: Repeat must not carry over the prior session's settled/pulse state.
    return next;
  };

  // Story 2.2/2.5 (FR16, FR18, FR12, FR22): current_streak += 1, minimal
  // feedback tier, or the completion tier if this tap reaches target_streak.
  // No-op if there's no active session, or the session is already complete
  // (FR22 — Correct/Incorrect/Restart stop accepting input once complete).
  const logCorrect = (): SessionState | null => {
    const current = sessionStore.readSession();
    if (!current || current.sessionComplete) return null;
    const next = transitions.logCorrect(current);
    sessionStore.writeSession(next);

    if (next.sessionComplete) {
      feedback.completion(`Session complete. Target of ${next.currentStreak} reached.`);
    } else {
      feedback.minimal();
    }

    return next;
  };

  // Story 2.3 (FR10, FR17, FR18): current_streak = 0, then
  // total_incorrect_this_session += 1, then target_streak is re-derived.
  // Tier selection (FR11, UX-DR3): mild if the recalculated target holds at
  // the floor, alert if it rose — comparing target_streak before/after,
  // not total_incorrect_this_session against 10 directly, so the tier
  // follows the same formula as the target itself. No-op once complete
  // (FR22).
  const logIncorrect = (): SessionState | null => {
    const current = sessionStore.readSession();
    if (!current || current.sessionComplete) return null;
    const previousTarget = calculateTargetStreak(current.totalIncorrectThisSession);
    const next = transitions.logIncorrect(current);
    const nextTarget = calculateTargetStreak(next.totalIncorrectThisSession);
    sessionStore.writeSession(next);

    if (nextTarget > previousTarget) {
      feedback.alert(`Target raised to ${nextTarget}`);
    } else {
      feedback.mild();
    }

    return next;
  };

  // Story 2.4 (FR20): all four session fields reset to starting values.
  // The confirm gate (FR21) lives in the screen/dialog, not here — by the
  // time this is called, the user has already confirmed. No history entry
  // is written for the discarded attempt (nothing to do — history only
  // gets written on completion, Epic 3, not on restart). No-op once
  // complete (FR22).
  const restart = (): SessionState | null => {
    const current = sessionStore.readSession();
    if (!current || current.sessionComplete) return null;
    const next = transitions.restartSession(current);
    sessionStore.writeSession(next);
    feedback.reset(); // Clears any pulse/flash from the tap that was just discarded.
    return next;
  };

  // Story 2.7 (FR14): clears session.active once Done has written the
  // history entry — nothing left to resume. Without this, a later visit
  // to the same segment's session screen would show this same completed
  // session again (Story 2.6's completion-resume check) instead of
  // starting fresh.
  const endSession = (): void => {
    sessionStore.clearSession();
  };

  const targetStreak = calculateTargetStreak(session?.totalIncorrectThisSession ?? 0);

  return {
    session,
    start,
    logCorrect,
    logIncorrect,
    restart,
    endSession,
    targetStreak,
    incorrectPulse: feedback.incorrectPulse,
    targetRaiseFlash: feedback.targetRaiseFlash,
    settled: feedback.settled,
  };
}
