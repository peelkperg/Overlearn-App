import { deleteKey, getObject, getString, setObject, subscribeToKeys } from '@/lib/storage';
import { isSessionState, type SessionState } from '@/lib/types';

// MMKV key per architecture.md's MMKV Key Naming section. Only one session
// can be active at a time app-wide. This module is the single owner of the
// key: useActiveSession drives the session's lifecycle through it, and
// lib/segments.ts clears it when the segment it points at is deleted.
const SESSION_KEY = 'session.active';

// `useSyncExternalStore` compares snapshots by identity, so readSession()
// must return the same value until the data actually changes. Freshness is
// decided by comparing the stored string rather than by listening for
// writes — see lib/segments.ts's readSegments() for why. This also gives
// every mutator in useActiveSession a way to read the truly-latest session
// without going through a React render closure, which is what let two taps
// dispatched before a re-render silently overwrite each other.
let cachedRaw: string | undefined;
let cachedLoaded = false;
let snapshot: SessionState | undefined;

export function readSession(): SessionState | undefined {
  const raw = getString(SESSION_KEY);
  if (!cachedLoaded || raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLoaded = true;
    snapshot = getObject<SessionState>(SESSION_KEY, isSessionState);
  }
  return snapshot;
}

export function subscribeToSession(onChange: () => void): () => void {
  return subscribeToKeys((key) => {
    if (key === SESSION_KEY) onChange();
  });
}

export function writeSession(session: SessionState): void {
  setObject(SESSION_KEY, session);
}

export function clearSession(): void {
  deleteKey(SESSION_KEY);
}

export function clearSessionForSegment(segmentId: string): void {
  if (readSession()?.segmentId === segmentId) clearSession();
}
