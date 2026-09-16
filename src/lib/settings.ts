import { getObject, getString, setObject, subscribeToKeys } from '@/lib/storage';
import { isSettings, type Settings, type SortDirection, type SortKey } from '@/lib/types';

const SETTINGS_KEY = 'settings.general';

// Reproduces v1.0's implicit behavior exactly for an app that has never
// touched Settings/sort: overlearningPercent: 50 matches v1.0's hardcoded
// level, and sortKey/sortDirection 'createdAt'/'asc' matches v1.0's array
// insertion order (oldest segment first) — no sort menu interaction needed
// to see the same list a v1.0 user would have. This is NOT the same value
// as "Date created"'s own per-option default direction (desc, newest
// first) applied once the user explicitly taps that option from the sort
// menu — see SortControl.tsx's DEFAULT_DIRECTION.
const DEFAULT_SETTINGS: Settings = { overlearningPercent: 50, sortKey: 'createdAt', sortDirection: 'asc' };

// Same cached-by-raw-string-identity pattern as readSegments()/readHistory()
// — required for useSyncExternalStore, which needs the same snapshot by
// identity until the underlying data actually changes.
let cachedRaw: string | undefined;
let cachedLoaded = false;
let snapshot: Settings = DEFAULT_SETTINGS;

export function readSettings(): Settings {
  const raw = getString(SETTINGS_KEY);
  if (!cachedLoaded || raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLoaded = true;
    snapshot = getObject<Settings>(SETTINGS_KEY, isSettings) ?? DEFAULT_SETTINGS;
  }
  return snapshot;
}

export function subscribeToSettings(onChange: () => void): () => void {
  return subscribeToKeys((key) => {
    if (key === SETTINGS_KEY) onChange();
  });
}

// Both writers below reconstruct the *entire* settings object from a read,
// then spread one changed field over it — so a read that silently falls
// back to DEFAULT_SETTINGS (readSettings()'s behavior for genuinely
// unconfigured *and* quarantined data alike) would let an unrelated write
// permanently discard every other field the user had configured. This
// distinguishes the two cases the way readSettings() deliberately does not:
// raw !== null but getObject returns undefined means the data was there and
// failed validation, not that it was never set.
// [Review][Patch] found via code review of deferred item logged against
// Story 4.7 (2026-09-12): a corrupt settings.general read turned a sort tap
// into a silent reset of the overlearning target.
function readSettingsForWrite(): Settings {
  const raw = getString(SETTINGS_KEY);
  const current = getObject<Settings>(SETTINGS_KEY, isSettings);
  if (raw != null && current === undefined) {
    throw new Error('Settings data is corrupt; refusing to overwrite it.');
  }
  return current ?? DEFAULT_SETTINGS;
}

// FR33/FR34: the only writer this story needs. overlearningPercent's setter
// is Epic 5's job, against this same file/key.
export function setSortOption(sortKey: SortKey, sortDirection: SortDirection): void {
  setObject(SETTINGS_KEY, { ...readSettingsForWrite(), sortKey, sortDirection });
}

// Story 5.1 (FR35, FR36): the stepper UI can only ever produce a valid
// clamped value (steps of 10, disabled at 50/300), but this is the second,
// defensive layer against a bypassing caller — same posture as
// renameSegment's stance toward SegmentForm. A bare clamp on NaN/Infinity
// still yields NaN (Math.max/min/round all propagate it), which would fail
// isSettings on the next read and quarantine the *entire* settings.general
// key, including the unrelated sortKey/sortDirection fields — so the
// non-finite guard runs first, before the clamp.
export function setOverlearningPercent(value: number): void {
  const safe = Number.isFinite(value) ? value : DEFAULT_SETTINGS.overlearningPercent;
  const clamped = Math.min(300, Math.max(50, Math.round(safe / 10) * 10));
  setObject(SETTINGS_KEY, { ...readSettingsForWrite(), overlearningPercent: clamped });
}
