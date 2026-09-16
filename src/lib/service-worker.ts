// AD-8: exactly one call site registers the service worker. Extracted here
// (not inlined in _layout.tsx) so the four registration branches are unit
// testable without pulling in _layout.tsx's react-native-reanimated chain --
// same reasoning STACK_SCREENS was split out of _layout.tsx for.
//
// Guarded to web + production builds only: `dist/service-worker.js` only
// exists after `npm run build:web`'s postbuild step, so registering against
// it under `expo start --web`'s dev server would 404.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function registerServiceWorker(): void {
  if (Platform.OS !== 'web' || __DEV__) {
    return;
  }
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  // AD-8 amended: absolute path built from AD-3's base path, not a bare
  // relative one. The export emits no <base> tag, so a relative path
  // resolves against the *document* -- a first visit to a deep link like
  // /Overlearn-App/segment/abc (served by the 404.html fallback, deep URL
  // preserved) would request /Overlearn-App/segment/service-worker.js and
  // 404, leaving that visitor permanently without offline support.
  // `+html.tsx` fails the build on a missing/malformed baseUrl, so by the
  // time this runs the value is valid; `?? '/'` only narrows the type.
  const baseUrl = Constants.expoConfig?.experiments?.baseUrl ?? '/';
  navigator.serviceWorker.register(`${baseUrl}service-worker.js`).catch((error) => {
    // Not telemetry (AD-7) -- a local console signal so a failed
    // registration isn't completely silent.
    console.warn('Service worker registration failed:', error);
  });
}
