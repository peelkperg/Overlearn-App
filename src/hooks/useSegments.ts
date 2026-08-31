import { useState } from 'react';

import * as segments from '@/lib/segments';
import type { Segment } from '@/lib/types';

// Thin React wrapper over lib/segments.ts's pure CRUD functions. Screens go
// through this hook, not lib/segments.ts directly, so state updates trigger
// re-renders.
export function useSegments() {
  const [list, setList] = useState<Segment[]>(() => segments.readSegments());

  const refresh = () => setList(segments.readSegments());

  const createSegment = (name: string): Segment => {
    const segment = segments.createSegment(name);
    refresh();
    return segment;
  };

  // Story 1.5 (FR5): archived segments are excluded from the default
  // active list here, not deleted — their data (and history) is preserved.
  const archiveSegment = (id: string): Segment => {
    const segment = segments.archiveSegment(id);
    refresh();
    return segment;
  };

  // Story 1.6 (FR6): permanent removal.
  const deleteSegment = (id: string): void => {
    segments.deleteSegment(id);
    refresh();
  };

  return {
    segments: list.filter((segment) => !segment.archived),
    createSegment,
    archiveSegment,
    deleteSegment,
  };
}

// Story 1.4: single-segment lookup for the Segment Detail screen.
export function useSegment(id: string): Segment | undefined {
  const [segment] = useState<Segment | undefined>(() => segments.getSegment(id));
  return segment;
}
