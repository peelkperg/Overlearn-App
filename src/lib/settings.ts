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

// FR33/FR34: the only writer this story needs. overlearningPercent's setter
// is Epic 5's job, against this same file/key.
export function setSortOption(sortKey: SortKey, sortDirection: SortDirection): void {
  setObject(SETTINGS_KEY, { ...readSettings(), sortKey, sortDirection });
}
