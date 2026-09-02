import { deleteKey, getObject, setObject } from '@/lib/storage';
import { isHistoryEntryArray, type HistoryEntry } from '@/lib/types';

// MMKV key per architecture.md's MMKV Key Naming section: one JSON array
// of completed-session records per segment.
function historyKey(segmentId: string): string {
  return `history.${segmentId}`;
}

export function readHistory(segmentId: string): HistoryEntry[] {
  return getObject<HistoryEntry[]>(historyKey(segmentId), isHistoryEntryArray) ?? [];
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
