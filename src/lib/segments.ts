import { getObject, setObject } from '@/lib/storage';
import type { Segment } from '@/lib/types';

const SEGMENTS_KEY = 'segments.list';

function generateId(): string {
  return `segment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readSegments(): Segment[] {
  return getObject<Segment[]>(SEGMENTS_KEY) ?? [];
}

export function getSegment(id: string): Segment | undefined {
  return readSegments().find((segment) => segment.id === id);
}

// Segment creation (FR1). Throws on an empty/whitespace-only name — the
// caller (SegmentForm) is expected to validate before calling, but this is
// the actual data-writing function, so it guards defensively too.
export function createSegment(name: string): Segment {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Segment name must not be empty');
  }

  const segment: Segment = {
    id: generateId(),
    name: trimmed,
    archived: false,
    createdAt: new Date().toISOString(),
  };

  setObject(SEGMENTS_KEY, [...readSegments(), segment]);
  return segment;
}
