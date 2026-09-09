import { useSyncExternalStore } from 'react';

import * as settings from '@/lib/settings';

// Mirrors useSegments()'s useSyncExternalStore pattern — two mounted
// screens (list + a future Settings screen) must never diverge on the
// stored sort option.
export function useSettings() {
  return {
    settings: useSyncExternalStore(settings.subscribeToSettings, settings.readSettings),
    setSortOption: settings.setSortOption,
  };
}
