import { useCallback, useSyncExternalStore } from 'react';

import { readHistory, subscribeToHistory } from '@/lib/history';
import type { HistoryEntry } from '@/lib/types';

// Stable empty-array identity: useSyncExternalStore re-renders whenever
// getSnapshot returns a value that differs by reference from the last one,
// so a fresh `[]` literal on every no-segmentId call would loop forever.
const EMPTY_HISTORY: HistoryEntry[] = [];

// Story 3.1 (FR27, FR28): per-segment history read. Chronological order
// falls straight out of lib/history.ts's append-only write order (Story
// 2.7's writeHistoryEntry always appends, never inserts) — no sort needed
// here. Only completed sessions are ever written (FR29), so nothing to
// filter either.
//
// Subscribed via useSyncExternalStore rather than a one-time useState
// snapshot [Review][Patch]: the segment-detail screen (where this is used)
// stays mounted underneath the active-session screen in the nav stack, so a
// session completed there must be reflected here without an unmount.
export function useSegmentHistory(segmentId: string | undefined): HistoryEntry[] {
  const subscribe = useCallback(
    (onChange: () => void) => (segmentId ? subscribeToHistory(segmentId, onChange) : () => {}),
    [segmentId],
  );
  const getSnapshot = useCallback(() => (segmentId ? readHistory(segmentId) : EMPTY_HISTORY), [segmentId]);
  return useSyncExternalStore(subscribe, getSnapshot);
}
