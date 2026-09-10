import { calculateSolidificationPercent, deleteHistory, readHistory } from '@/lib/history';
import { clearSessionForSegment } from '@/lib/session';
import { getObject, getString, setObject, subscribeToKeys } from '@/lib/storage';
import { isSegmentArray, type Segment, type SortDirection, type SortKey } from '@/lib/types';

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
// delete act on the wrong record and collide FlatList keys.
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
// fails on something the user cannot see. Compared case-insensitively.
// `excludeId` (Story 4.1): a rename must not collide with its own prior
// name — createSegment never passes this, since the new segment is never
// in `existing` yet.
function disambiguate(name: string, existing: Segment[], excludeId?: string): string {
  const candidates = excludeId ? existing.filter((segment) => segment.id !== excludeId) : existing;
  const taken = new Set(candidates.map((segment) => segment.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;

  let suffix = 2;
  while (taken.has(`${name} (${suffix})`.toLowerCase())) {
    suffix += 1;
  }
  return `${name} (${suffix})`;
}

// A name is capped rather than truncated silently: without a limit, a very
// long one pushes the detail screen's actions off-screen and leaves the
// segment unusable. Lives here rather than in SegmentForm (its original
// home) because Story 4.5's inline rename is a second write entry point that
// never touches that form \u2014 a UI-layer-only constant let the cap be bypassed
// (code review 2026-09-10).
export const MaxNameLength = 80;

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
    createdAt: new Date().toISOString(),
  };

  setObject(SEGMENTS_KEY, [...existing, segment]);
  return segment;
}

// Rename (FR30). Throws on an empty name and on an unknown id — both are
// defensive guards mirroring createSegment's posture, since this is the
// actual data-writing function (SegmentForm/the Rename screen are expected
// to validate first, but this function does not trust that). The new name
// is disambiguated against every *other* segment (FR30 AC5: a rename to the
// segment's own current name in a different case must succeed, not collide
// with itself).
export function renameSegment(id: string, name: string): Segment {
  const trimmed = normalizeSegmentName(name);
  if (trimmed.length === 0) {
    throw new Error('Segment name must not be empty');
  }

  const existing = readSegments();
  const target = existing.find((segment) => segment.id === id);
  if (!target) {
    throw new Error(`Segment not found: ${id}`);
  }

  const renamed: Segment = { ...target, name: disambiguate(trimmed, existing, id) };
  setObject(
    SEGMENTS_KEY,
    existing.map((segment) => (segment.id === id ? renamed : segment)),
  );
  return renamed;
}

// Duplicate (FR32). Throws on an unknown id, mirroring renameSegment's
// posture. No `excludeId` is passed to disambiguate - the copy is a
// genuinely new record and must collide with its own source, exactly as
// createSegment collides with any existing segment of the same name.
// History is never copied: the new segment's history.{id} key is simply
// never written, which is "no history" by omission, not by explicit clear.
export function duplicateSegment(id: string): Segment {
  const existing = readSegments();
  const source = existing.find((segment) => segment.id === id);
  if (!source) {
    throw new Error(`Segment not found: ${id}`);
  }

  const copy: Segment = {
    id: generateId(existing),
    name: disambiguate(source.name, existing),
    createdAt: new Date().toISOString(),
  };

  setObject(SEGMENTS_KEY, [...existing, copy]);
  return copy;
}

// Story 4.3 (FR33): per-segment values the sort comparator needs but
// sortSegments itself must not compute — keeping sortSegments a pure
// function of pre-fetched data (rather than one that reads storage itself)
// is what keeps it unit-testable without mocking MMKV, matching
// session-transitions.ts's existing pure-function discipline.
export type SortAggregate = { lastPracticed: string | null; solidification: number | null };

export function buildSortAggregates(segments: Segment[]): Map<string, SortAggregate> {
  const aggregates = new Map<string, SortAggregate>();
  for (const segment of segments) {
    const entries = readHistory(segment.id);
    // Max rather than assuming array order: writeHistoryEntry always
    // appends, but this stays correct even if that ever changes, and the
    // comparison is trivial at this data scale.
    const lastPracticed = entries.reduce<string | null>(
      (latest, entry) => (latest === null || entry.date > latest ? entry.date : latest),
      null,
    );
    aggregates.set(segment.id, { lastPracticed, solidification: calculateSolidificationPercent(entries) });
  }
  return aggregates;
}

// AC #4: a segment with no history sorts as the oldest-possible date / 0%,
// regardless of direction — these floors are applied here, in the
// comparator, rather than baked into calculateSolidificationPercent's own
// return type (which stays null for "no data yet" so the display layer can
// distinguish it from a real 0%).
const NoHistoryDate = '1970-01-01T00:00:00.000Z';

function sortValue(segment: Segment, aggregates: Map<string, SortAggregate>, sortKey: SortKey): string | number {
  const aggregate = aggregates.get(segment.id);
  switch (sortKey) {
    case 'name':
      // Not lowercased here — localeCompare below (with sensitivity:
      // 'base') does its own case-insensitive, accent-aware comparison.
      return segment.name;
    case 'createdAt':
      return segment.createdAt;
    case 'lastPracticed':
      return aggregate?.lastPracticed ?? NoHistoryDate;
    case 'solidification':
      return aggregate?.solidification ?? 0;
  }
}

// [Review][Decision] found via code review 2026-09-08: Task 4 originally
// specified plain `<`/`>` on lowercased strings for name sort, but that
// compares by raw UTF-16 code unit — 'Étude' sorts after 'Zebra', and
// 'Bar 10' sorts before 'Bar 2'. Ordinary musician-facing segment names hit
// both cases. localeCompare's 'base' sensitivity keeps the case-insensitive
// behavior the spec asked for; `numeric: true` also orders embedded numbers
// the way a person reads them, not lexicographically.
function compareValues(sortKey: SortKey, va: string | number, vb: string | number): number {
  if (sortKey === 'name') {
    return (va as string).localeCompare(vb as string, undefined, { sensitivity: 'base', numeric: true });
  }
  if (va < vb) return -1;
  if (va > vb) return 1;
  return 0;
}

// Pure — never mutates `segments` (readSegments()'s returned array is the
// useSyncExternalStore snapshot and must stay stable until data actually
// changes). One comparator for all four keys: extract both sides' values,
// compare, negate on 'desc' — not four branches with duplicated flip logic.
// Array.prototype.sort is stable (spec-guaranteed since ES2019), so equal
// values keep their relative order with no secondary tiebreaker needed.
export function sortSegments(
  segments: Segment[],
  aggregates: Map<string, SortAggregate>,
  sortKey: SortKey,
  direction: SortDirection,
): Segment[] {
  const sign = direction === 'desc' ? -1 : 1;
  return [...segments].sort((a, b) => {
    const va = sortValue(a, aggregates, sortKey);
    const vb = sortValue(b, aggregates, sortKey);
    return compareValues(sortKey, va, vb) * sign;
  });
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
