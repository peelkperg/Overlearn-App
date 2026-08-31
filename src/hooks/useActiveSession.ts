import { useState } from 'react';

import { calculateTargetStreak } from '@/lib/mechanic';
import { startSession } from '@/lib/session-transitions';
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

  // Story 2.1 (FR8, FR9): begins a session immediately, no input/confirmation.
  const start = (segmentName: string): SessionState => {
    const next = startSession(segmentName);
    setObject(SESSION_KEY, next);
    setSession(next);
    return next;
  };

  const targetStreak = calculateTargetStreak(session?.totalIncorrectThisSession ?? 0);

  return { session, start, targetStreak };
}
