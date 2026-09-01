import { useState } from 'react';

import { readHistory } from '@/lib/history';
import type { HistoryEntry } from '@/lib/types';

// Story 3.1 (FR27, FR28): per-segment history read. Chronological order
// falls straight out of lib/history.ts's append-only write order (Story
// 2.7's writeHistoryEntry always appends, never inserts) — no sort needed
// here. Only completed sessions are ever written (FR29), so nothing to
// filter either.
export function useSegmentHistory(segmentId: string): HistoryEntry[] {
  const [history] = useState<HistoryEntry[]>(() => readHistory(segmentId));
  return history;
}
