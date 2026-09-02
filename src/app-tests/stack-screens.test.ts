// Lives outside src/app/ deliberately — see index.test.tsx in this same
// directory for why.
import { STACK_SCREENS } from '@/app/stack-screens';

// Regression test for commit b2dc4e6: router.push()/replace() to a route
// with no Stack.Screen ancestor is silently dropped in production, with no
// error and no dev-mode signal — this is the only thing standing between a
// future route addition and reintroducing that exact bug undetected.
//
// STACK_SCREENS is _layout.tsx's single source of truth for its
// Stack.Screen list (kept in its own module — see stack-screens.ts — so it
// stays importable here without also pulling in react-native-reanimated);
// this test asserts every route the app actually navigates to (kept in
// sync by hand against the router.push/replace call sites below) is a
// member.
describe('stack-screens STACK_SCREENS [Review][Patch]', () => {
  // One entry per router.push/replace target in the app, as of:
  // src/app/index.tsx, src/app/segment/[id].tsx, src/app/segment/new.tsx,
  // src/app/session/[id].tsx.
  const navigatedRoutes: (typeof STACK_SCREENS)[number][] = [
    'index', // router.replace('/') — segment/new.tsx, session/[id].tsx
    'segment/new', // index.tsx's Create action
    'segment/[id]', // index.tsx's SegmentListItem onOpen
    'session/[id]', // index.tsx's resume/redirect, segment/[id].tsx's Start
  ];

  it.each(navigatedRoutes)('%s has a Stack.Screen entry', (route) => {
    expect(STACK_SCREENS).toContain(route);
  });

  it('declares no routes beyond what the app actually navigates to', () => {
    // Not load-bearing for the bug this guards against, but a route with no
    // navigator pointing at it is dead weight worth catching too.
    expect(STACK_SCREENS).toHaveLength(navigatedRoutes.length);
  });
});
