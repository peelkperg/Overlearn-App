import { deleteKey, getObject, getString, setObject, subscribeToKeys } from '@/lib/storage';
import { isHistoryEntryArray, type HistoryEntry } from '@/lib/types';

// MMKV key per architecture.md's MMKV Key Naming section: one JSON array
// of completed-session records per segment.
function historyKey(segmentId: string): string {
  return `history.${segmentId}`;
}

// Per-segment cache, same freshness-by-raw-string-comparison pattern as
// lib/segments.ts's readSegments() — needed once useSegmentHistory switched
// to useSyncExternalStore, which requires readHistory() to return the same
// array by identity until the underlying data actually changes.
// [Review][Patch] found via code review 2026-09-05: the segment-detail
// screen showed stale history after a session completed while it stayed
// mounted underneath the active-session screen — the same multi-mount
// scenario useSegments/useActiveSession already guard against.
const cache = new Map<string, { raw: string | undefined; snapshot: HistoryEntry[] }>();

export function readHistory(segmentId: string): HistoryEntry[] {
  const raw = getString(historyKey(segmentId));
  const cached = cache.get(segmentId);
  if (!cached || raw !== cached.raw) {
    const snapshot = getObject<HistoryEntry[]>(historyKey(segmentId), isHistoryEntryArray) ?? [];
    cache.set(segmentId, { raw, snapshot });
    return snapshot;
  }
  return cached.snapshot;
}

export function subscribeToHistory(segmentId: string, onChange: () => void): () => void {
  return subscribeToKeys((key) => {
    if (key === historyKey(segmentId)) onChange();
  });
}

// FR14: writes one completed-session record. Only ever called for a
// completed session (Done) — never for a restarted/abandoned one (FR29).
// Deduplicated on entry.sessionStartTimestamp: Done's history write and its
// session.active clear are two separate MMKV writes with no atomicity
// between them, so an app kill in that window followed by a second Done
// tap on relaunch must not record the same practice run twice.
export function writeHistoryEntry(segmentId: string, entry: HistoryEntry): void {
  const existing = readHistory(segmentId);
  if (existing.some((recorded) => recorded.sessionStartTimestamp === entry.sessionStartTimestamp)) {
    return;
  }
  setObject(historyKey(segmentId), [...existing, entry]);
}

// FR6: a deleted segment takes its history with it. Left behind, the key
// leaks storage forever and would be inherited by any later segment that
// happened to reuse the id.
export function deleteHistory(segmentId: string): void {
  deleteKey(historyKey(segmentId));
}
