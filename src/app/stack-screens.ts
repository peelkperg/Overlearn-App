// Single source of truth for _layout.tsx's Stack.Screen list, split out of
// _layout.tsx itself so this stays importable by a test without also
// pulling in AnimatedSplashOverlay's react-native-reanimated dependency —
// Reanimated 4 + Worklets 0.10 require native bindings that aren't
// resolvable under Jest without a much larger mocking effort than this
// route-list guarantee is worth.
//
// Regression guard for commit b2dc4e6: router.push()/replace() to a route
// with no Stack.Screen ancestor is silently dropped in production, with no
// error and no dev-mode signal. Every route the app navigates to must
// appear here — see src/app/stack-screens.test.ts.
export const STACK_SCREENS = [
  'index',
  'segment/new',
  'segment/[id]',
  'segment/[id]/rename',
  'session/[id]',
  'settings',
] as const;
