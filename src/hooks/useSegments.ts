import { useState } from 'react';

import * as segments from '@/lib/segments';
import type { Segment } from '@/lib/types';

// Thin React wrapper over lib/segments.ts's pure CRUD functions. Screens go
// through this hook, not lib/segments.ts directly, so state updates trigger
// re-renders.
export function useSegments() {
  const [list, setList] = useState<Segment[]>(() => segments.readSegments());

  const createSegment = (name: string): Segment => {
    const segment = segments.createSegment(name);
    setList(segments.readSegments());
    return segment;
  };

  return { segments: list, createSegment };
}

// Story 1.4: single-segment lookup for the Segment Detail screen.
export function useSegment(id: string): Segment | undefined {
  const [segment] = useState<Segment | undefined>(() => segments.getSegment(id));
  return segment;
}
