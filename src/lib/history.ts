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

// Story 4.3: broader than one-subscription-per-segment-id (which would need
// useSegments to track "visible segment ids" it has no other reason to
// hold) but functionally equivalent for that hook's purpose — any completed
// session anywhere can change last-practiced/solidification sort order.
// Matches only `history.<id>` exactly (anchored, no dot after the id) —
// [Review][Patch] found via code review 2026-09-08: a plain startsWith
// prefix also matched quarantine's own `history.<id>.corrupt.<ts>` backup
// keys, and a quarantine write happens *during render* (readHistory ->
// getObject -> quarantine, invoked from the aggregates memo), which
// dispatched a store update mid-render.
const HistoryKeyPattern = /^history\.[^.]+$/;

export function subscribeToAnyHistory(onChange: () => void): () => void {
  return subscribeToKeys((key) => {
    if (HistoryKeyPattern.test(key)) onChange();
  });
}

// [Review][Patch] found via code review 2026-09-08: a version counter
// incremented only inside one hook instance's own subscribe callback is
// blind to any write landing between that instance's render (initial
// getSnapshot read) and its subscribe effect actually attaching —
// useSyncExternalStore's post-subscribe consistency check compares
// getSnapshot's value against that pre-subscribe read, and a per-instance
// counter is still unchanged at that point, so the write is never detected.
// A module-level counter, incremented by a listener registered once here at
// import time (always live, independent of any consumer's mount timing),
// closes that window — any write in it is already reflected by the time a
// late-attaching consumer's consistency check runs.
let historyVersion = 0;
subscribeToKeys((key) => {
  if (HistoryKeyPattern.test(key)) historyVersion += 1;
});

export function getHistoryVersion(): number {
  return historyVersion;
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

// FR33 (sort) and FR38 (display) share this one formula — implementing it
// twice would violate the project's single-formula-per-concern rule already
// established for calculateTargetStreak. null (not 0) for "no data yet":
// the UX spec shows an em dash, a magnitude the display layer can
// distinguish from a real 0% without a separate boolean flag. Aggregated as
// one ratio across all entries, not an average of per-entry percentages —
// (1/1 entry + 0/9 entry) aggregates to 10%, not the naive 50% average.
export function calculateSolidificationPercent(entries: HistoryEntry[]): number | null {
  if (entries.length === 0) return null;
  const totals = entries.reduce(
    (acc, entry) => ({
      correct: acc.correct + (entry.totalAttempts - entry.totalMistakes),
      attempts: acc.attempts + entry.totalAttempts,
    }),
    { correct: 0, attempts: 0 },
  );
  if (totals.attempts === 0) return null;
  const percent = (totals.correct / totals.attempts) * 100;
  // [Review][Patch] found via code review 2026-09-08: defense in depth
  // alongside isHistoryEntryArray's stricter storage-boundary guard — clamps
  // here too so this function stays safe for Story 4.4's display even if
  // ever called on data that skipped that guard.
  if (!Number.isFinite(percent)) return null;
  return Math.min(100, Math.max(0, percent));
}
