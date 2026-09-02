# Code Review — Out-of-Story Fix Commits (aca1e2d, b2dc4e6)

Date: 2026-09-01
Target: `aca1e2d` (splash-overlay touch-block fix) + `b2dc4e6` (navigation PUSH fix), evaluated against the current tree — `b2dc4e6`'s specific `(tabs)` mechanism was since removed by Epic 1's Decision 2 and replaced with a flat Stack
Spec: no story ID (post-implementation bug fixes); context: `architecture.md` (routing decision), `prd.md` (NFR3, NFR6/NFR7), CLAUDE.md §11–12 (test coverage, known-defect documentation)
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor (all completed)
Raw findings: 15 → 7 unique after dedupe → 5 dismissed as moot (targeting deleted code)

## Review Findings

### Decision Needed

- [x] [Review][Decision] **RESOLVED — defensive fallback only, applied.** The splash overlay's `finished` callback (the sole path to unmounting it) still doesn't reliably fire on-device. Root-causing it would mean on-device Reanimated/Android investigation ahead of the already-queued EAS real-device verification, with no guaranteed timeline. A bounded fallback timer (below) closes every practical consequence — accessibility reachability, memory residency, a stuck splash — without needing device access. Root-causing itself stays open, documented as a known gap. Original finding follows. `edge+auditor`

### Patch

- [x] [Review][Patch] **FIXED.** The invisible, permanently-stuck overlay (`src/components/animated-icon.tsx`) was still reachable by screen readers — `pointerEvents="none"` removes it from touch hit-testing but not from the accessibility tree. Added `accessibilityElementsHidden` and `importantForAccessibility="no-hide-descendants"` to both render branches. `blind+edge+auditor`
- [x] [Review][Patch] **FIXED.** `onLayout` (`src/components/animated-icon.tsx`) could fire more than once while `animate` was still `false` (orientation change, safe-area/dimension change, font-load reflow before the async `.finally()` commits), each firing re-invoking `SplashScreen.hideAsync()` with no re-entry guard. Added a ref-backed guard (`hidingSplash`) so it only runs once. `edge`
- [x] [Review][Patch] **FIXED with the Decision above.** No fallback existed if `finished` never fired: the overlay (and its decoded `Image`) stayed mounted for the entire app session. Added a bounded fallback timer (`2 × DURATION`) via a `useEffect` keyed on `animate` that force-calls `setVisible(false)`. `blind+edge`
- [~] [Review][Patch] **PARTIALLY FIXED.** Neither fix had a regression test. Added: `src/app/stack-screens.ts` (extracted `STACK_SCREENS` as a single source of truth, split out of `_layout.tsx` specifically so it stays importable without pulling in Reanimated) + `src/app/stack-screens.test.ts` asserting every route the app navigates to has a `Stack.Screen` entry — this closes the navigation-regression half. The `AnimatedSplashOverlay` component test was attempted and abandoned: `react-native-reanimated` 4.5.1 + `react-native-worklets` 0.10.1 call native-binding functions (`createSerializable`) at *module import time*, not just at render time, so even a test that never reaches the animated branch fails on `import`. A working Jest mock for this stack needs either a from-scratch worklets/serialization mock (open-ended — module-scope native calls surfaced two dependency layers deep with no indication that was the last one) or an upstream Jest-mode auto-detection this project isn't yet configured for. Given this is a two-commit review of a cosmetic splash screen, I stopped rather than keep sinking effort into a disproportionate mocking project; the three code patches above are unaffected and stand on their own. `blind+auditor`

### Deferred

- [x] [Review][Defer] No visible back button on `segment/new`, `segment/[id]`, or `session/[id]` (`headerShown: false` with no per-screen override) — native back (Android hardware button, iOS edge-swipe) still functions; this is a discoverability gap, not a dead end. Deferred: `headerShown: false` predates both fix commits (Story 1.1's original root layout), not introduced or left unfixed by this diff. `blind`
- [x] [Review][Defer] The root cause of the Reanimated `finished`-callback failure is undocumented outside the commit message — no tracked TODO or known-issues entry. Deferred: covered by Decision 1 above; if root-causing is deferred, a one-line note pointing to this review's findings is the minimum, not a separate action item. `auditor`

### Dismissed (moot — target code no longer exists)

- "`Stack screenOptions={{headerShown:false}}` strips back-navigation UI" as originally raised against `b2dc4e6`'s `(tabs)` screens — reassessed against the current flat Stack; genuine concern, reclassified above as Deferred (pre-existing).
- "Tab screens relocated one directory deeper — relative imports unverified" — the `src/app/index.tsx` → `src/app/(tabs)/index.tsx` move this refers to was itself reverted by Epic 1's Decision 2 (`git mv` back to `src/app/index.tsx`). No such file exists at that path today.
- "`NativeTabs` nested as a `Stack.Screen` child — no confirmation it renders correctly off-root" — `(tabs)/_layout.tsx` and the `NativeTabs`-based `AppTabs` component were deleted by Epic 1's Decision 2. No tab navigator exists in the current tree.
- "Tab screens relocated with zero content changes" (duplicate framing of the same moot relocation) — see above.
- Acceptance Auditor's aside about `session/[id].tsx:109`'s `target-raise-flash` overlay sharing the same accessibility gap — noted for completeness, not formalized as a finding: that overlay is conditionally rendered (unmounts via React, not an opacity animation waiting on a callback), so it is genuinely transient and out of scope for this diff.
