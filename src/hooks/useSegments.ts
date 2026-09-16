import { useMemo, useSyncExternalStore } from 'react';

import * as history from '@/lib/history';
import * as segments from '@/lib/segments';
import { useSettings } from '@/hooks/useSettings';
import type { Segment } from '@/lib/types';

// Subscribed to the storage layer rather than holding a private `useState`
// snapshot: two screens are mounted at once (the list stays mounted while
// segment/new and segment/[id] are pushed over it), and a private snapshot
// makes the list show stale data after a create or delete performed from
// the screen on top of it.
function useSegmentStore(): Segment[] {
  return useSyncExternalStore(segments.subscribeToSegments, segments.readSegments);
}

// Story 4.3 originally gated this subscription to only the sort keys that
// consulted history data ('lastPracticed'/'solidification'), since sorting
// by name/createdAt never needed it (R9, test-design-epic-4-5.md).
// Story 4.6 (FR41) removes that gate: every row now displays last-practiced
// date and Solidification % regardless of the active sort key, so the list
// must re-render on any history write unconditionally, not only when
// sorted by one of the two keys that used to need it. getSnapshot reads
// history.ts's module-level version counter rather than one scoped to this
// hook instance — [Review][Patch] found via code review 2026-09-08: a
// counter incremented only inside this hook's own subscribe callback is
// blind to a write landing between this hook's render and its subscribe
// effect attaching, since useSyncExternalStore's post-subscribe consistency
// check compares against the pre-subscribe snapshot, which a per-instance
// counter hadn't changed yet either. The module-level counter (see
// lib/history.ts) is live from import time, closing that window.
function useHistoryVersion(): number {
  return useSyncExternalStore(history.subscribeToAnyHistory, history.getHistoryVersion);
}

export function useSegments() {
  const rawSegments = useSegmentStore();
  const { settings, setSortOption } = useSettings();
  const { sortKey, sortDirection } = settings;

  const historyVersion = useHistoryVersion();

  // A new sorted array every render is fine here: sortSegments' *input*
  // (rawSegments) is still the stable useSyncExternalStore snapshot, so this
  // doesn't reintroduce the infinite-loop hazard readSegments()'s own
  // caching exists to prevent. Only the subscription above drives
  // re-renders, not this array's identity.
  //
  // Story 4.6 (FR41): buildSortAggregates() now runs on every recompute,
  // not only when the active sort key needs it. Story 4.3's code review
  // ([Review][Patch] 2026-09-08) gated this specifically because nothing
  // outside the sort itself ever read the aggregates it produced — sorting
  // by name/createdAt truly never consulted them. FR41 changes that
  // premise: the segment list row now displays last-practiced date and
  // Solidification % for every segment regardless of sort key, so the
  // aggregates are always needed by the caller even when the sort itself
  // does not use them. The O(segments × history-entries) cost this
  // reintroduces is inherent to FR41's requirement, not a regression to
  // guard against.
  const aggregates = useMemo(
    () => segments.buildSortAggregates(rawSegments),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- historyVersion is a recompute trigger, not a value read in the body; buildSortAggregates re-reads history fresh each call
    [rawSegments, historyVersion],
  );
  const sorted = useMemo(
    () => segments.sortSegments(rawSegments, aggregates, sortKey, sortDirection),
    [rawSegments, aggregates, sortKey, sortDirection],
  );

  return {
    segments: sorted,
    aggregates,
    sortKey,
    sortDirection,
    setSortOption,
    createSegment: segments.createSegment,
    renameSegment: segments.renameSegment,
    duplicateSegment: segments.duplicateSegment,
    deleteSegment: segments.deleteSegment,
  };
}

// Story 1.4: single-segment lookup for the Segment Detail screen. Derived
// from the same store, so a change made elsewhere is reflected here. Does
// its own .find() over the unsorted store snapshot — no sort dependency.
export function useSegment(id: string | undefined): Segment | undefined {
  const all = useSegmentStore();
  return useMemo(() => (id ? all.find((segment) => segment.id === id) : undefined), [all, id]);
}
