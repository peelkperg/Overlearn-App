import { deleteHistory } from '@/lib/history';
import { clearSessionForSegment } from '@/lib/session';
import { getObject, getString, setObject, subscribeToKeys } from '@/lib/storage';
import { isSegmentArray, type Segment } from '@/lib/types';

const SEGMENTS_KEY = 'segments.list';

// `useSyncExternalStore` compares snapshots by identity, so readSegments()
// must return the same array until the data actually changes — a fresh
// array on every call would re-render forever. Freshness is decided by
// comparing the stored string rather than by listening for writes: a
// listener would miss any mutation that does not emit an event, leaving the
// cache silently stale.
let cachedRaw: string | undefined;
let cachedLoaded = false;
let snapshot: Segment[] = [];

export function readSegments(): Segment[] {
  const raw = getString(SEGMENTS_KEY);
  if (!cachedLoaded || raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLoaded = true;
    snapshot = getObject<Segment[]>(SEGMENTS_KEY, isSegmentArray) ?? [];
  }
  return snapshot;
}

export function subscribeToSegments(onChange: () => void): () => void {
  return subscribeToKeys((key) => {
    if (key === SEGMENTS_KEY) onChange();
  });
}

// Same-millisecond creation can otherwise repeat an id, which would make
// archive/delete act on the wrong record and collide FlatList keys.
function generateId(existing: Segment[]): string {
  const taken = new Set(existing.map((segment) => segment.id));
  let id = '';
  do {
    id = `segment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } while (taken.has(id));
  return id;
}

export function getSegment(id: string): Segment | undefined {
  return readSegments().find((segment) => segment.id === id);
}

// Two segments sharing a name are indistinguishable in the list and in the
// Resume/Discard prompt, where a wrong Discard destroys the wrong session's
// progress. Names are disambiguated rather than rejected so creation never
// fails on something the user cannot see. Compared case-insensitively, and
// against archived segments too — they still own history and can resurface.
function disambiguate(name: string, existing: Segment[]): string {
  const taken = new Set(existing.map((segment) => segment.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;

  let suffix = 2;
  while (taken.has(`${name} (${suffix})`.toLowerCase())) {
    suffix += 1;
  }
  return `${name} (${suffix})`;
}

// `trim()` strips whitespace but not zero-width characters, so a name made
// only of U+200B/U+FEFF/bidi marks would pass validation and then render as
// a blank, unidentifiable row.
const InvisibleChars = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g;

export function normalizeSegmentName(name: string): string {
  return name.replace(InvisibleChars, '').trim();
}

// Segment creation (FR1). Throws on an empty/whitespace-only name — the
// caller (SegmentForm) is expected to validate before calling, but this is
// the actual data-writing function, so it guards defensively too.
export function createSegment(name: string): Segment {
  const trimmed = normalizeSegmentName(name);
  if (trimmed.length === 0) {
    throw new Error('Segment name must not be empty');
  }

  const existing = readSegments();
  const segment: Segment = {
    id: generateId(existing),
    name: disambiguate(trimmed, existing),
    archived: false,
    createdAt: new Date().toISOString(),
  };

  setObject(SEGMENTS_KEY, [...existing, segment]);
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

// Deletion (FR6): the segment *and all its associated data*. The history
// key and any active session pointing at this segment go too — a session
// left behind would strand the app on a "Segment not found" screen it has
// no control to escape.
export function deleteSegment(id: string): void {
  setObject(
    SEGMENTS_KEY,
    readSegments().filter((segment) => segment.id !== id),
  );
  deleteHistory(id);
  clearSessionForSegment(id);
}
