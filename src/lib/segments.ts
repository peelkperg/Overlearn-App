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

// Archiving (FR5). The segment stays in storage — it's excluded from the
// default active list at the read site (index.tsx), not deleted here.
export function archiveSegment(id: string): Segment {
  const all = readSegments();
  const index = all.findIndex((segment) => segment.id === id);
  if (index === -1) {
    throw new Error(`Segment not found: ${id}`);
  }

  const updated: Segment = { ...all[index], archived: true };
  const next = [...all];
  next[index] = updated;
  setObject(SEGMENTS_KEY, next);
  return updated;
}

// Deletion (FR6). Permanently removes the segment. History entries are not
// yet a persisted concept (Epic 3) — nothing to purge there until they are.
export function deleteSegment(id: string): void {
  setObject(
    SEGMENTS_KEY,
    readSegments().filter((segment) => segment.id !== id),
  );
}
