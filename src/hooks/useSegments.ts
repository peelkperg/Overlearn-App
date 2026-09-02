import { useMemo, useSyncExternalStore } from 'react';

import * as segments from '@/lib/segments';
import type { Segment } from '@/lib/types';

// Subscribed to the storage layer rather than holding a private `useState`
// snapshot: two screens are mounted at once (the list stays mounted while
// segment/new and segment/[id] are pushed over it), and a private snapshot
// makes the list show stale data after a create, archive, or delete
// performed from the screen on top of it.
function useSegmentStore(): Segment[] {
  return useSyncExternalStore(segments.subscribeToSegments, segments.readSegments);
}

export function useSegments() {
  const all = useSegmentStore();

  // Story 1.5 (FR5): archived segments are excluded from the default active
  // list here, not deleted — their data (and history) is preserved.
  const active = useMemo(() => all.filter((segment) => !segment.archived), [all]);

  return {
    segments: active,
    createSegment: segments.createSegment,
    archiveSegment: segments.archiveSegment,
    deleteSegment: segments.deleteSegment,
  };
}

// Story 1.4: single-segment lookup for the Segment Detail screen. Derived
// from the same store, so a rename or archive elsewhere is reflected here.
export function useSegment(id: string | undefined): Segment | undefined {
  const all = useSegmentStore();
  return useMemo(() => (id ? all.find((segment) => segment.id === id) : undefined), [all, id]);
}
