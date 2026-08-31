import { useState } from 'react';

import { useFeedbackSignal } from '@/components/session/useFeedbackSignal';
import { calculateTargetStreak } from '@/lib/mechanic';
import * as transitions from '@/lib/session-transitions';
import { getObject, setObject } from '@/lib/storage';
import type { SessionState } from '@/lib/types';

// MMKV key per architecture.md's MMKV Key Naming section. Only one session
// can be active at a time app-wide.
const SESSION_KEY = 'session.active';

// The single owner of the `session.active` MMKV key (architecture.md's
// Implementation Patterns rule): every session-state mutation goes through
// this hook's exposed functions, never direct storage access from a screen.
export function useActiveSession() {
  const [session, setSession] = useState<SessionState | null>(() => getObject<SessionState>(SESSION_KEY) ?? null);
  const feedback = useFeedbackSignal();

  // Story 2.1 (FR8, FR9): begins a session immediately, no input/confirmation.
  const start = (segmentName: string): SessionState => {
    const next = transitions.startSession(segmentName);
    setObject(SESSION_KEY, next);
    setSession(next);
    return next;
  };

  // Story 2.2 (FR16, FR18): current_streak += 1, minimal feedback tier.
  // No-op if there's no active session (defensive — the screen only wires
  // this once start() has run).
  const logCorrect = (): SessionState | null => {
    if (!session) return null;
    const next = transitions.logCorrect(session);
    setObject(SESSION_KEY, next);
    setSession(next);
    feedback.minimal();
    return next;
  };

  const targetStreak = calculateTargetStreak(session?.totalIncorrectThisSession ?? 0);

  return { session, start, logCorrect, targetStreak };
}
