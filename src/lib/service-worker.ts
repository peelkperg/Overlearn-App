// AD-8: exactly one call site registers the service worker. Extracted here
// (not inlined in _layout.tsx) so the four registration branches are unit
// testable without pulling in _layout.tsx's react-native-reanimated chain --
// same reasoning STACK_SCREENS was split out of _layout.tsx for.
//
// Guarded to web + production builds only: `dist/service-worker.js` only
// exists after `npm run build:web`'s postbuild step, so registering against
// it under `expo start --web`'s dev server would 404.
import { Platform } from 'react-native';

export function registerServiceWorker(): void {
  if (Platform.OS !== 'web' || __DEV__) {
    return;
  }
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  // Bare relative path, no explicit `scope` (AD-8) -- resolves correctly
  // under any base path without re-deriving AD-3's config key here.
  navigator.serviceWorker.register('service-worker.js').catch(() => {});
}
