import { useCallback, useMemo, useSyncExternalStore } from 'react';

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

// Story 4.3: re-render on any history write, but only when the active sort
// key actually depends on history data — sorting by name or creation date
// must not re-render on every session completion (R9,
// test-design-epic-4-5.md). getSnapshot reads history.ts's module-level
// version counter rather than one scoped to this hook instance — [Review]
// [Patch] found via code review 2026-09-08: a counter incremented only
// inside this hook's own subscribe callback is blind to a write landing
// between this hook's render and its subscribe effect attaching, since
// useSyncExternalStore's post-subscribe consistency check compares against
// the pre-subscribe snapshot, which a per-instance counter hadn't changed
// yet either. The module-level counter (see lib/history.ts) is live from
// import time, closing that window.
function useHistoryVersion(needsHistory: boolean): number {
  const subscribe = useCallback(
    (onChange: () => void) => (needsHistory ? history.subscribeToAnyHistory(onChange) : () => {}),
    [needsHistory],
  );
  const getSnapshot = useCallback(() => (needsHistory ? history.getHistoryVersion() : 0), [needsHistory]);
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useSegments() {
  const rawSegments = useSegmentStore();
  const { settings, setSortOption } = useSettings();
  const { sortKey, sortDirection } = settings;

  const needsHistory = sortKey === 'lastPracticed' || sortKey === 'solidification';
  const historyVersion = useHistoryVersion(needsHistory);

  // A new sorted array every render is fine here: sortSegments' *input*
  // (rawSegments) is still the stable useSyncExternalStore snapshot, so this
  // doesn't reintroduce the infinite-loop hazard readSegments()'s own
  // caching exists to prevent. Only the subscriptions above drive
  // re-renders, not this array's identity.
  // [Review][Patch] found via code review 2026-09-08: buildSortAggregates
  // ran unconditionally, doing N getString + JSON.parse + shape-guard reads
  // per list mutation and discarding the whole result when sorting by
  // name/createdAt, which never consult it — needsHistory (already computed
  // above) is the exact gate this needs.
  const sorted = useMemo(() => {
    const aggregates = needsHistory
      ? segments.buildSortAggregates(rawSegments)
      : new Map<string, segments.SortAggregate>();
    return segments.sortSegments(rawSegments, aggregates, sortKey, sortDirection);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- historyVersion is a recompute trigger, not a value read in the body; buildSortAggregates re-reads history fresh each call
  }, [rawSegments, sortKey, sortDirection, needsHistory, historyVersion]);

  return {
    segments: sorted,
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
