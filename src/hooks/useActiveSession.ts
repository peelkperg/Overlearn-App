import { useEffect, useRef, useSyncExternalStore } from 'react';

import { useFeedbackSignal } from '@/components/session/useFeedbackSignal';
import { useSettings } from '@/hooks/useSettings';
import { writeHistoryEntry } from '@/lib/history';
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
  // [Review][Patch] found via code review 2026-09-11: useFeedbackSignal()
  // returns a new object every render (its methods aren't memoized), so the
  // settings-driven reconciliation effect below calling feedback.completion
  // directly would need `feedback` in its dependency array — which would
  // make it re-run on every render, defeating the deliberate
  // overlearningLevel-only trigger. A ref sidesteps this: the effect always
  // calls through to the *latest* feedback without needing it as a
  // dependency, matching this file's own established fresh-read-over-stale-
  // closure posture (see the mutators below and their header comment).
  const feedbackRef = useRef(feedback);
  useEffect(() => {
    feedbackRef.current = feedback;
  });
  // Story 5.1 (FR35, FR36): converts the stored percent (50-300) to the
  // level the mechanic layer expects (0.5-3.0) — lib/mechanic.ts and
  // lib/session-transitions.ts never read storage or perform this
  // conversion themselves. [Review][Patch] found via code review
  // 2026-09-10: this used to claim to be "the one and only place in the
  // app" doing this conversion, which app/settings.tsx's own worked-example
  // line already contradicted in the same commit — corrected to drop that
  // claim rather than repeat it.
  const overlearningLevel = useSettings().settings.overlearningPercent / 100;

  // Story 5.2 (Task 3, deferred from Story 5.1's code review): sessionComplete
  // is a stored flag, only ever flipped inside a transition's own write —
  // unlike targetStreak, it is not derived fresh on every read. Lowering the
  // live level mid-session (reachable via Home's gear icon while a session
  // is in progress) can leave currentStreak >= the new, lower targetStreak
  // true while sessionComplete stays false, until the next Correct/Incorrect
  // tap happens to re-evaluate it — the completion screen and the FR22
  // lockout would otherwise stay wrong until then.
  //
  // [Review][Decision] resolved 2026-09-11 (Story 5.2 code review): keeping
  // this effect was a deliberate choice, not an oversight — see the story's
  // Review Findings for the accepted consequences (a single stepper tap can
  // end an in-progress session irreversibly; it can eject the user off the
  // Settings screen to the Completion screen mid-adjustment; FR22's lockout
  // becomes reachable with no tap; it can complete an *interrupted* session
  // at app open, bypassing FR24's Resume/Discard prompt). All now specified
  // in prd.md (FR22, FR24, FR37, and the Mechanic Specification's
  // Settings-driven completion transition) and epics.md (Story 5.2 AC #2,
  // Story 5.3's notice copy).
  //
  // reconcileCompletion (lib/session-transitions.ts) is the single source
  // of the completion rule, shared with logCorrect and logIncorrect —
  // this effect no longer hand-builds the next SessionState itself
  // ([Review][Patch] found via code review 2026-09-11: doing so here
  // duplicated logCorrect's `>= target` / capture-completedTarget logic as
  // a second, driftable copy outside the transitions module every other
  // mutator routes through — [Review][Decision] resolved 2026-09-12,
  // round 2, option 1: logCorrect itself was found to still carry that
  // duplicate at review time despite this comment's claim, and now
  // delegates here too). reconcileCompletion returns the same object
  // reference when nothing changes, so `next === current` is the
  // write-needed check.
  //
  // Reads fresh via sessionStore.readSession() rather than closing over the
  // `session` above, matching every mutator's own stale-closure guard: a
  // tap racing this effect must not be overwritten by a stale
  // reconciliation write. Deliberately keyed on overlearningLevel alone,
  // not on every render — a tap-driven completion is already handled
  // correctly by logCorrect itself; this effect exists to catch a
  // settings-driven change, and (per the accepted consequences above) also
  // runs once on mount for whatever session is already on disk.
  useEffect(() => {
    const current = sessionStore.readSession();
    if (!current) return;
    const next = transitions.reconcileCompletion(current, overlearningLevel);
    if (next === current) return;
    try {
      sessionStore.writeSession(next);
    } catch {
      // [Review][Patch] found via code review 2026-09-11: an uncaught throw
      // here would escape a useEffect body during React's commit phase and
      // crash the app, unlike every other write site in this codebase
      // (screens' runAction wraps start/logCorrect/logIncorrect/restart).
      // This effect has no screen to report an error through, so it
      // swallows and leaves the on-disk value as source of truth.
      // [Review][Patch] found via code review 2026-09-12 (round 2):
      // corrected — this used to claim "the next tap ... or settings
      // change will retry the same reconciliation" unconditionally. A
      // Correct tap does retry it (logCorrect delegates to
      // reconcileCompletion), and an Incorrect tap now does too (Decision
      // 2, resolved this round: logIncorrect reconciles before zeroing the
      // streak) — but if no further tap or settings change ever happens,
      // this session is left silently un-reconciled indefinitely. That
      // degradation is accepted, not fixed, by this round's decision.
      return;
    }
    // Parity with logCorrect's own completion tier (FR12, UX-DR3): a
    // settings-driven completion is a real completion, not a silent state
    // flip, so it gets the same haptic + screen-reader announcement.
    feedbackRef.current.completion(`Session complete. Target of ${next.currentStreak} reached.`);
  }, [overlearningLevel]);

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
    const next = transitions.logCorrect(current, overlearningLevel);
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
  //
  // [Review][Decision] resolved 2026-09-12 (Story 5.2 code review round 2,
  // option 2): transitions.logIncorrect now reconciles a missed
  // settings-driven completion before zeroing the streak (see its own
  // comment), so this tap can itself complete the session instead of
  // silently discarding an already-achieved run left un-reconciled by a
  // failed write in the effect below. That case gets the same completion
  // feedback tier as every other completion path, not the mild/alert
  // tiers below (which only apply when the tap genuinely didn't complete
  // the session).
  // [Review][Patch] found via code review 2026-09-12 (round 3): previousTarget
  // used to be computed unconditionally but read only in the else branch —
  // moved inside it, alongside nextTarget, so it isn't computed on the
  // completion path that never uses it. The completion message also now
  // reads next.completedTarget rather than next.currentStreak: the two are
  // equal only because of reconcileCompletion's current body (it assigns
  // completedTarget := currentStreak), so reading currentStreak here coupled
  // this message to an implementation detail of a module one hop away.
  const logIncorrect = (): SessionState | null => {
    const current = sessionStore.readSession();
    if (!current || current.sessionComplete) return null;
    const next = transitions.logIncorrect(current, overlearningLevel);
    sessionStore.writeSession(next);

    if (next.sessionComplete) {
      feedback.completion(`Session complete. Target of ${next.completedTarget} reached.`);
    } else {
      const previousTarget = calculateTargetStreak(current.totalIncorrectThisSession, overlearningLevel);
      const nextTarget = calculateTargetStreak(next.totalIncorrectThisSession, overlearningLevel);
      if (nextTarget > previousTarget) {
        feedback.alert(`Target raised to ${nextTarget}`);
      } else {
        feedback.mild();
      }
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

  // Story 2.7 (FR14): writes the completed session's history entry and
  // clears session.active as one call. [Review][Patch] found via code
  // review 2026-09-05: this used to be built and called from
  // app/session/[id].tsx directly, bypassing the Active Session screen's
  // "talks only to useActiveSession" rule (architecture.md's Component
  // Boundaries) — the screen had no other reason to import lib/history.
  // No-op if there's no session, or it isn't actually complete yet, so a
  // stray call can't record an in-progress session.
  const complete = (): void => {
    const current = sessionStore.readSession();
    if (!current || !current.sessionComplete) return;
    writeHistoryEntry(current.segmentId, {
      date: new Date().toISOString(),
      // [Review][Patch] found via code review 2026-09-10: prefer the target
      // captured at the moment completion actually happened
      // (session-transitions.ts's logCorrect, or its settings-driven
      // counterpart reconcileCompletion) over recomputing from the live
      // setting here — a settings change between completion and this Done
      // tap must not alter what gets permanently recorded. The live
      // recomputation is retained only as defense-in-depth for a
      // currently-unreachable state: current.sessionComplete is true, and
      // both of this module's completion-writing transitions always set
      // completedTarget in the same write that sets sessionComplete
      // ([Review][Patch] 2026-09-11: corrected from "only logCorrect ...
      // sets" — reconcileCompletion, added by Story 5.2 Task 3, is a second
      // writer of both fields together, per the same invariant).
      finalTarget: current.completedTarget ?? calculateTargetStreak(current.totalIncorrectThisSession, overlearningLevel),
      totalMistakes: current.totalIncorrectThisSession,
      totalAttempts: current.totalCorrectThisSession + current.totalIncorrectThisSession,
      sessionStartTimestamp: current.sessionStartTimestamp,
    });
    sessionStore.clearSession();
  };

  const targetStreak = calculateTargetStreak(session?.totalIncorrectThisSession ?? 0, overlearningLevel);

  return {
    session,
    start,
    logCorrect,
    logIncorrect,
    restart,
    endSession,
    complete,
    targetStreak,
    incorrectPulse: feedback.incorrectPulse,
    targetRaiseFlash: feedback.targetRaiseFlash,
    settled: feedback.settled,
  };
}
