# Code Review — Epic 1: Segment Management (Stories 1.1–1.6)

Date: 2026-09-01
Target: full contents of 14 Epic 1 artifacts at HEAD `b2dc4e6` (841 lines)
Spec: `_bmad-output/planning-artifacts/epics.md` (Epic 1); context: `architecture.md`, `prd.md`, `ux-design-specification.md`
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor (all completed)
Raw findings: 51 → 35 unique after dedupe → 3 dismissed

## Review Findings

### Decision Needed

- [x] [Review][Decision] **RESOLVED — option D (quarantine + shape validation), applied.** Corrupt/unparseable `segments.list` was silently treated as an empty list, and the next create overwrote it. `getObject` now takes an optional shape guard, quarantines the raw bytes to `<key>.corrupt.<timestamp>` (first write wins) on either a parse failure or a failed guard, and returns `undefined`. Guards `isSegmentArray`, `isHistoryEntryArray`, `isSessionState` added in `src/lib/types.ts` and wired into all three read sites. This also closes the separate "no shape validation" patch finding. 9 tests added. `blind+edge`
- [x] [Review][Decision] **RESOLVED — option A (remove tab group, restore flat stack), applied.** Deleted `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/explore.tsx`, `src/components/app-tabs.tsx`, `src/components/app-tabs.web.tsx`, `src/components/external-link.tsx`; moved `src/app/(tabs)/index.tsx` → `src/app/index.tsx`; root `_layout.tsx` now declares the flat stack `index → segment/new → segment/[id] → session/[id]` per architecture.md:147; removed `expo-web-browser` from `package.json` and `package-lock.json` (NFR8); dropped the now-meaningless `BottomTabInset` from `constants/theme.ts` and its two consumers. Original finding follows. `auditor`
- App shipped a tab bar with the starter "Explore" tab, and `expo-web-browser` was in the dependency tree and reachable from it — `src/app/(tabs)/_layout.tsx`, `src/components/app-tabs.tsx:23-29`, `src/components/external-link.tsx:2,18`, `package.json`. Violates UX-DR10 (`ux-design-specification.md:386`, "No tab bar, no drawer, no deep hierarchy"), architecture.md:147 (flat stack, `app/index.tsx`), and NFR8 (`epics.md:74`, "no networking library/permission present in the shipped app at all"). Removing the tab group interacts with the `b2dc4e6` navigation fix, so the routing shape needs your call. `auditor`
- [x] [Review][Decision] **RESOLVED — auto-disambiguate, applied.** `createSegment` now routes the trimmed name through `disambiguate()` (`src/lib/segments.ts:18-31`), appending ` (2)`, ` (3)`, … until free. Compared case-insensitively and against archived segments, since those still own history and can resurface. Creation never fails on a collision the user cannot see. 6 tests added. Original finding follows.
- Duplicate segment names were accepted with no disambiguator — `src/lib/segments.ts:21-36`. Two identically named rows make the Resume/Discard dialog (`ResumeDiscardDialog.tsx:20`) ambiguous; a wrong Discard destroys the wrong session. Allow duplicates, reject them, or auto-disambiguate? `edge`
- [x] [Review][Decision] **RESOLVED — build row-level actions as specified, applied.** Created `src/components/SegmentListItem.tsx` (row + `⋯` actions menu with Archive/Delete, per architecture.md:277 and `ux-design-specification.md:299`); wired into `src/app/index.tsx`; removed the inline `SegmentRow`, and removed archive/delete plus their dead styles from `src/app/segment/[id].tsx`, which is now history + Start only, matching architecture.md:272. Menu chosen over swipe for screen-reader/switch-control reachability (NFR6). Original finding follows.
- `SegmentListItem.tsx` was never created; archive/delete lived on the detail screen instead of the row — architecture.md:277/:320 and `ux-design-specification.md:299` specify row-level swipe/menu actions. Accept the deviation (update architecture.md) or realign the implementation. `auditor`
- [x] [Review][Decision] **RESOLVED — spec updated to match reality, applied.** "React Native 0.85" → "React Native 0.86" in `architecture.md:58,77,364,384` and `epics.md:79,171` (Story 1.1 AC). The pin stays at the SDK 57 template's 0.86.3. Original finding follows.
- `react-native` pinned at 0.86.3 vs Story 1.1 AC and architecture.md:58/77/384 stating 0.85 — undocumented divergence. Update the spec to match the pin, or the pin to match the spec. `auditor`

### Patch

- [x] [Review][Patch] **FIXED.** Segment list never refreshes after create/archive/delete — each `useSegments()` call site owns an independent `useState` snapshot; no `useFocusEffect`, no MMKV binding [src/hooks/useSegments.ts:10] [src/app/(tabs)/index.tsx:19] — violates Story 1.2 and 1.5 ACs and architecture.md:143 (`useMMKVObject`). CRITICAL. `blind+edge+auditor`
- [x] [Review][Patch] **FIXED.** `/segment/new` is unreachable once one segment exists — the create CTA is rendered only inside `EmptyState` [src/app/(tabs)/index.tsx:87-106] — FR1/FR4 functionally one-shot. CRITICAL. `blind+edge+auditor`
- [x] [Review][Patch] **FIXED.** `useSegment` latches its result at mount and never re-reads; also latches `undefined` if the route param is not yet resolved [src/hooks/useSegments.ts:43-46]. `blind+edge`
- [x] [Review][Patch] **FIXED.** `deleteSegment` never purges `history.<segmentId>` [src/lib/segments.ts:56-61] — directly violates Story 1.6 AC ("all associated data including history entries"); the in-code justification comment is factually stale given `src/lib/history.ts:6-8`. `blind+edge+auditor`
- [x] [Review][Patch] **FIXED.** Archive/delete do not clear `session.active` for the affected segment [src/lib/segments.ts:40-61] — a complete dangling session makes `src/app/(tabs)/index.tsx:30-36` redirect to a dead-end "Segment not found." on every Home mount, with no reachable control to clear it. `edge`
- [x] [Review][Patch] **FIXED.** `createSegment`/`archiveSegment` throw straight into `Pressable` press handlers with no try/catch and no ErrorBoundary anywhere in the tree [src/lib/segments.ts:23,43] [src/app/segment/[id].tsx:20-28] [src/app/segment/new.tsx:10-13]. `blind+edge`
- [x] [Review][Patch] **FIXED.** Double-tap on submit creates duplicate segments — no in-flight guard, `Pressable` never disabled [src/components/SegmentForm.tsx:20-24]. `blind+edge`
- [x] [Review][Patch] **FIXED with Decision 1.** `getObject` performed no shape validation; a valid-but-wrong payload (`{}`, `"x"`, `5`) was cast to `T` and crashed callers with `x.find is not a function` on launch, with no in-app recovery path [src/lib/storage.ts]. Same class reached `session.active` → `router.push('/session/undefined')`. `blind+edge`
- [x] [Review][Patch] **FIXED.** Resume does not dismiss the Resume/Discard dialog — `showResumeDialog` is derived from session state that `handleResume` never mutates [src/app/(tabs)/index.tsx:28,42-44]. `blind`
- [x] [Review][Patch] **FIXED.** `redirectedToCompletion` ref is never reset, so a second completed session in the same app lifetime is stranded with no UI path to its Completion screen [src/app/(tabs)/index.tsx:21,30-36]. `blind`
- [x] [Review][Patch] **FIXED.** History `keyExtractor` uses `entry.date`, which carries no uniqueness guarantee [src/app/segment/[id].tsx:74]. `blind+edge+auditor`
- [x] [Review][Patch] **FIXED.** `useLocalSearchParams<{ id: string }>()` is a compile-time assertion only; runtime `id` may be `undefined` or `string[]`, producing keys like `history.undefined` and malformed routes [src/app/segment/[id].tsx:15]. `edge`
- [x] [Review][Patch] **FIXED.** Hardcoded hex colors instead of `Colors` tokens, and `SegmentForm` uses raw `Text`/`View`/`TextInput` with no theme awareness — unreadable against the spec's default dark theme [src/components/SegmentForm.tsx:2,54-74] [src/app/segment/[id].tsx:109,117,124] [src/app/(tabs)/index.tsx:143,151] — UX-DR6. `auditor`
- [x] [Review][Patch] **FIXED.** `TextInput` is ~39pt tall with no `minHeight`/`hitSlop` (NFR6/UX-DR8 require 44×44pt), and the inline error has no `accessibilityLiveRegion`/`role="alert"` so Story 1.2's validation is silent to screen readers [src/components/SegmentForm.tsx:28-41,56-63]. `auditor`
- [x] [Review][Patch] **FIXED.** No maximum length on segment name — a very long name pushes Start/Archive/Delete off-screen with no `numberOfLines`, leaving the segment unusable [src/lib/segments.ts:21-25] [src/components/SegmentForm.tsx:28-36] [src/app/segment/[id].tsx:35-37]. `edge`
- [x] [Review][Patch] **FIXED.** `trim()` does not reject zero-width-only names (U+200B, U+FEFF), which pass both validators and render blank [src/components/SegmentForm.tsx:16-17] [src/lib/segments.ts:22-25]. `edge`
- [x] [Review][Patch] **FIXED.** `generateId` has no uniqueness check against existing ids; same-millisecond creation can collide, breaking `keyExtractor` and making archive/delete operate on the wrong record [src/lib/segments.ts:6-8]. `blind+edge`
- [x] [Review][Patch] **FIXED.** No component/screen tests for any Epic 1 UI acceptance criterion, and `collectCoverageFrom` excludes `src/app/**` and `src/components/**` — the exact layer holding the two CRITICAL findings [jest.config.js:5]; `@testing-library/react-native` is already a devDependency. `blind+auditor`
- [x] [Review][Patch] **FIXED.** No global Jest storage reset; `storage.test.ts` never clears between cases, leaving suites order-dependent [jest.config.js:1-6] [src/lib/storage.test.ts:5-21]. `edge`
- [x] [Review][Patch] **FIXED.** `SegmentForm`'s `initialName` prop and "create/rename" contract are dead code — no rename route or `renameSegment` exists [src/components/SegmentForm.tsx:4,10-12]. `blind`
- [x] [Review][Patch] **FIXED.** `SplashScreen.preventAutoHideAsync()` at module scope with no `.catch` → unhandled rejection during bootstrap [src/app/_layout.tsx:7]. `blind`

### Deferred

- [x] [Review][Defer] `archiveSegment` throws on a missing id while `deleteSegment` silently no-ops [src/lib/segments.ts:43,56] — deferred, consistency cleanup, no live defect
- [x] [Review][Defer] Story 1.1's MMKV round-trip AC is validated only against the Jest mock, never a real native instance [src/lib/storage.test.ts:1-22] [__mocks__/react-native-nitro-modules.js] — deferred, blocked on the pending real-device/EAS verification already in flight
- [x] [Review][Defer] `src/lib/storage.ts:7` exports the raw MMKV instance, so architecture.md:316's data boundary is documentation-only and already bypassed by `segments.test.ts:2` — deferred, pre-existing architectural gap
- [x] [Review][Defer] No schema version/migration field on the persisted shape [src/lib/types.ts:4-9] [src/lib/segments.ts:4] — deferred, pre-existing
- [x] [Review][Defer] History ordering trusts a monotonic device clock; no sort [src/hooks/useSegmentHistory.ts:11-13] — deferred, Epic 3 scope
- [x] [Review][Defer] Unicode/RTL/newline segment names are neither normalized nor sanitized [src/lib/segments.ts:22] — deferred, pre-existing

### Dismissed (false positives, verified)

- `ThemeProvider`/`DarkTheme`/`DefaultTheme` "not exported by expo-router" — they are, at `expo-router/build/exports.d.ts:22-24`.
- `storage.remove()` "is not the MMKV API" — MMKV v4.3.2 declares `remove(key): boolean`; `storage.test.ts` exercises it and passes.
- `getObject` "returns `null` cast as `Segment[]`" — self-contradicted by the reporter; the real defect (no shape validation for non-null non-array payloads) is captured as a Patch finding.
