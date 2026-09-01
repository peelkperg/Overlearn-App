import { getObject, setObject } from '@/lib/storage';
import type { HistoryEntry } from '@/lib/types';

// MMKV key per architecture.md's MMKV Key Naming section: one JSON array
// of completed-session records per segment.
function historyKey(segmentId: string): string {
  return `history.${segmentId}`;
}

export function readHistory(segmentId: string): HistoryEntry[] {
  return getObject<HistoryEntry[]>(historyKey(segmentId)) ?? [];
}

// FR14: writes one completed-session record. Only ever called for a
// completed session (Done) — never for a restarted/abandoned one (FR29).
export function writeHistoryEntry(segmentId: string, entry: HistoryEntry): void {
  setObject(historyKey(segmentId), [...readHistory(segmentId), entry]);
}
