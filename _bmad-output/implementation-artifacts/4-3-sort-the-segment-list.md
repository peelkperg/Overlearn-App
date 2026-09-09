# Story 4.3: Sort the Segment List

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to sort my segment list by name, creation date, last practiced, or Solidification %,
so that I can find the segment I'm looking for as my list grows.

## Acceptance Criteria

1. **Given** two or more segments exist **When** the user opens the "Sort: {current} ▾" control above the list **Then** a menu shows all four sort options, with the currently active one marked (FR33, UX-DR18)
2. **Given** the sort menu is open **When** the user taps an option that is not currently active **Then** the list re-sorts by that key at its default direction (name: A→Z; date created / last practiced: newest first; Solidification %: highest first) (FR33, UX-DR19)
3. **Given** the sort menu is open **When** the user taps the option that is already active **Then** the sort direction flips (FR33, UX-DR19)
4. **Given** the list is sorted by last-practiced date or Solidification %, and a segment has no completed sessions **When** the list is sorted **Then** that segment sorts as the oldest-possible date / 0%, regardless of sort direction (FR33)
5. **Given** a session is completed for a segment currently visible in the list **When** the list is sorted by last-practiced date or Solidification % **Then** the list re-orders live to reflect the new history, without requiring the screen to be reopened (FR33, via `useSegments`'s new history subscription)
6. **Given** the user selects a sort option and direction **When** the app is closed and reopened **Then** the same sort option and direction are restored (FR34)
7. **Given** zero or exactly one segment exists **When** the segment list renders **Then** the sort control is hidden (UX-DR19)
8. **Given** the sort control shows the active sort **When** a screen reader reaches it **Then** it announces both the selected key and direction (e.g. "Sort by last practiced, most recent first"), not the `▾` glyph alone (UX-DR24)

[Source: _bmad-output/planning-artifacts/epics.md#Story-4.3-Sort-the-Segment-List]

## Tasks / Subtasks

- [x] Task 1: Add the `Settings` shape to `src/lib/types.ts` (AC: #6)
  - [x] `export type SortKey = 'name' | 'createdAt' | 'lastPracticed' | 'solidification';` and `export type SortDirection = 'asc' | 'desc';`
  - [x] `export interface Settings { overlearningPercent: number; sortKey: SortKey; sortDirection: SortDirection; }` — the full shape from `architecture.md`, even though this story only reads/writes `sortKey`/`sortDirection`. **Do not split this into a smaller "sort-only" type** — Epic 5 (Story 5.x) will add `overlearningPercent`'s setter/UI against this same shape, and `settings.general` is one JSON object per `architecture.md`'s explicit "one key per object, not one key per field" decision.
  - [x] `export function isSettings(value: unknown): value is Settings` — same `isRecord` + per-field pattern as `isSessionState`: `overlearningPercent` a multiple of 10 between 50 and 300 inclusive; `sortKey` one of the four literals; `sortDirection` one of the two literals. Reject anything else (quarantined by `getObject`'s existing corrupt-data path, same as every other guard in this file — no new quarantine logic needed).
  - [x] Unit tests in `src/lib/types.test.ts` (new `describe('isSettings', ...)` block, matching the file's existing per-guard describe structure): valid shape passes; out-of-range `overlearningPercent` (40, 55, 310) rejected; unknown `sortKey`/`sortDirection` rejected; non-record input rejected.

- [x] Task 2: New storage boundary `src/lib/settings.ts` (AC: #6)
  - [x] MMKV key: `const SETTINGS_KEY = 'settings.general';` — one object, per `architecture.md`.
  - [x] `const DEFAULT_SETTINGS: Settings = { overlearningPercent: 50, sortKey: 'createdAt', sortDirection: 'asc' };` — **this is not the same value as "Date created"'s own default direction (newest-first/desc) from AC #2.** It exists so an app that has never touched Settings/sort renders in exactly v1.0's implicit order (array insertion order = oldest segment first = `createdAt` ascending). Only once the user explicitly taps "Date created" from the sort menu does AC #2's newest-first default apply. Getting these two "defaults" confused is the single easiest mistake in this story — see Dev Notes.
  - [x] `export function readSettings(): Settings` — same cached-by-raw-string-identity pattern as `readSegments()`/`readHistory()` (required for `useSyncExternalStore`): compare `getString(SETTINGS_KEY)` against a cached raw value, only re-parse via `getObject(SETTINGS_KEY, isSettings) ?? DEFAULT_SETTINGS` on change, otherwise return the same cached object reference.
  - [x] `export function subscribeToSettings(onChange: () => void): () => void` — `subscribeToKeys` filtered to `SETTINGS_KEY`, identical shape to `subscribeToSegments`.
  - [x] `export function setSortOption(sortKey: SortKey, sortDirection: SortDirection): void` — reads current settings, writes back `{ ...current, sortKey, sortDirection }` via `setObject`. This is the **only** writer this story needs; do not add an `overlearningPercent` setter here (that is Epic 5's job against this same file).
  - [x] Unit tests in `src/lib/settings.test.ts` (new file, `storage.clearAll()` in `beforeEach` per project convention): first read with no prior write returns `DEFAULT_SETTINGS`; `setSortOption` persists and `readSettings()` reflects it; `readSettings()` returns the same array... object reference across calls when nothing changed (identity check, mirroring an existing `readSegments` identity test if one exists — otherwise a fresh assertion); a corrupted `settings.general` payload is quarantined and `readSettings()` falls back to `DEFAULT_SETTINGS` (mirror `segments.test.ts`'s "corrupt segments.list" pattern).

- [x] Task 3: `src/hooks/useSettings.ts` (AC: #1, #2, #3, #6)
  - [x] `export function useSettings() { return useSyncExternalStore(settings.subscribeToSettings, settings.readSettings); }` plus `export function setSortOption` re-exported (or call `lib/settings.setSortOption` directly from the component — screens never import `lib/` directly, so re-export it here alongside the hook, same as `useSegments()` re-exports `createSegment` etc.).

- [x] Task 4: Sort computation — `src/lib/segments.ts` (AC: #2, #3, #4)
  - [x] `export type SortAggregate = { lastPracticed: string | null; solidification: number | null };`
  - [x] `export function buildSortAggregates(segments: Segment[]): Map<string, SortAggregate>` — for each segment, call `readHistory(segment.id)` (import from `@/lib/history`) and `calculateSolidificationPercent(entries)` (Task 5 adds this function); `lastPracticed` = the maximum `entry.date` across that segment's history, or `null` if empty (use max rather than assuming array order, even though `writeHistoryEntry` always appends — defensive, and the comparison is trivial).
  - [x] `export function sortSegments(segments: Segment[], aggregates: Map<string, SortAggregate>, sortKey: SortKey, direction: SortDirection): Segment[]` — pure, per `architecture.md`'s exact signature (parameter names: `segments`, `aggregates`, `sortKey` not `key`, `direction`). Returns a **new** array (`[...segments].sort(...)`) — never mutates the input, since `readSegments()`'s returned array is the `useSyncExternalStore` snapshot and must stay stable until data actually changes.
    - Value extraction per key: `name` → `segment.name.toLowerCase()`; `createdAt` → `segment.createdAt`; `lastPracticed` → `aggregates.get(segment.id)?.lastPracticed ?? '1970-01-01T00:00:00.000Z'` (epoch — the "oldest possible date" AC #4 names); `solidification` → `aggregates.get(segment.id)?.solidification ?? 0`.
    - One comparator for all four keys: extract both sides' values, compare (`<`/`>`/string `localeCompare` is **not** needed — plain `<`/`>` on lowercased strings is sufficient and matches the existing `disambiguate`'s case-insensitive-compare style), negate the result when `direction === 'desc'`. Do not write four separate branches with duplicated flip logic.
    - Native `Array.prototype.sort` is stable (spec-guaranteed since ES2019, Hermes complies) — no secondary tiebreaker needed for equal values.
  - [x] Unit tests in `src/lib/segments.test.ts` (new `describe('lib/segments sortSegments [Story 4.3]', ...)`): sorts by name asc/desc; by createdAt asc/desc; by lastPracticed asc/desc with a mixed set of segments (some with history, some without) confirming the no-history segment lands at the "oldest" end regardless of direction (AC #4); same shape for solidification (no-history segment always at the "0%" end regardless of direction); does not mutate the input array (assert the original array's order is unchanged after calling); stable order for two segments with equal sort values.
  - [x] Unit tests for `buildSortAggregates` (same file or a new `describe`): a segment with 3 history entries gets `lastPracticed` equal to the entry with the latest `date` (not just the last-pushed one — construct entries out of chronological order to prove this); a segment with zero history entries gets `{ lastPracticed: null, solidification: null }`.

- [x] Task 5: `calculateSolidificationPercent` — `src/lib/history.ts` (AC: #4)
  - [x] `export function calculateSolidificationPercent(entries: HistoryEntry[]): number | null` exactly per `architecture.md`'s FR38 section: `null` for zero entries; otherwise `(sum of (totalAttempts - totalMistakes)) / (sum of totalAttempts) * 100`. This is also what Story 4.4 (View a Segment's Solidification %) will call for its history-log summary line — implement it here now, generically, even though this story only consumes it for sorting. Do not build Story 4.4's UI.
  - [x] Unit tests in `src/lib/history.test.ts`: zero entries → `null`; one entry, zero mistakes → `100`; one entry, some mistakes → correct fractional percent; multiple entries aggregate as one ratio (not an average of per-entry percentages — construct a case where the two differ, e.g. one entry 1/1 and one entry 0/9, aggregate = 10%, naive per-entry average would be 50%).

- [x] Task 6: Thread sort + conditional history subscription into `src/hooks/useSegments.ts` (AC: #2, #3, #5, #6)
  - [x] `useSegments()` now also calls `useSettings()` to read `sortKey`/`sortDirection`.
  - [x] **Conditional history subscription (mitigates R9 from `test-design-epic-4-5.md`):** `useSegments()` must re-render on a history write **only** when `sortKey` is `'lastPracticed'` or `'solidification'` — sorting by name or creation date must not re-render on every session completion. Implement via a second `useSyncExternalStore` (or an extra subscription passed into the existing one) whose `subscribe` function is a no-op (`() => () => {}`) when the current sort key doesn't need history, and `history.subscribeToAnyHistory` (new function, Task 6a) otherwise.
  - [x] Task 6a: `src/lib/history.ts` — add `export function subscribeToAnyHistory(onChange: () => void): () => void { return subscribeToKeys((key) => { if (key.startsWith('history.')) onChange(); }); }`. Broader than one-subscription-per-segment-id (which would need `useSegments` to track "visible segment ids" it has no other reason to hold) but functionally equivalent for this hook's purpose: any completed session anywhere can change last-practiced/solidification ordering.
  - [x] `useSegments()`'s returned `segments` becomes `sortSegments(rawSegments, buildSortAggregates(rawSegments), sortKey, sortDirection)` instead of the raw store snapshot. **This changes the return value's identity on every render** (a new sorted array each time) — acceptable here because `sortSegments`'s *input* (the `useSyncExternalStore` snapshot) is still stable, so this does not cause the infinite-loop hazard `readSegments()`'s own caching exists to prevent; only `useSegments()`'s own re-renders (already gated by the subscriptions above) drive `FlatList` updates, not snapshot identity.
  - [x] `useSegments()` also returns `sortKey`, `sortDirection`, and `setSortOption` (from Task 3) so `SortControl` doesn't need a separate `useSettings()` call.
  - [x] Update `src/hooks/useSegments.test.ts` if it exists, or the segment-list screen tests (Task 8) — check current test coverage location before assuming.

- [x] Task 7: `SortControl` component (AC: #1, #2, #3, #7, #8)
  - [x] New file `src/components/SortControl.tsx`. Pressable trigger row (`testID="segment-sort-control"`) showing `Sort: {label} ▾` where `{label}` is the active key's display name ("Name", "Date created", "Last practiced", "Solidification %"); tapping opens a `Modal` menu listing all four options (`testID="segment-sort-option-{key}"`), the active one visually marked. No existing component marks an "active choice" in a list today — `SegmentListItem`'s menu has no equivalent — so this is a small implementation-time decision (e.g. a trailing checkmark glyph or `type="smallBold"`, the weight `ThemedText`'s `menuTitle` usage already establishes elsewhere in that file); keep it a plain text/glyph treatment, not a new themed component.
  - [x] Mirror `SegmentListItem`'s Modal-menu **styling and interaction** (same backdrop opacity/dismiss-on-tap-outside, same 44×44 `menuItem` sizing) — this is a new component, not a shared extraction from `SegmentListItem`; the UX spec's "no new modal pattern" means visual/interaction consistency, not literal code reuse of a per-row component. Do not refactor `SegmentListItem` to extract a generic menu component — that is unrequested abstraction (out of this story's scope; not called for by `architecture.md` or the UX spec).
  - [x] Tap behavior: tapping the already-active option calls `onChange(activeKey, activeDirection === 'asc' ? 'desc' : 'asc')`; tapping a different option calls `onChange(newKey, DEFAULT_DIRECTION[newKey])` where `DEFAULT_DIRECTION = { name: 'asc', createdAt: 'desc', lastPracticed: 'desc', solidification: 'desc' }` (AC #2's stated per-key defaults — **not** the app-wide `DEFAULT_SETTINGS` from Task 2, see that task's note).
  - [x] `accessibilityLabel` on the trigger states both dimensions in prose, e.g. `` `Sort by ${keyLabel}, ${directionLabel}` `` where `directionLabel` reads naturally per key (e.g. "A to Z" / "Z to A" for name; "most recent first" / "oldest first" for last practiced and date created; "highest first" / "lowest first" for Solidification %) — never just the `▾` glyph or the raw `asc`/`desc` value (AC #8).
  - [x] Rendered only when `segments.length > 1` — parent (`app/index.tsx`, Task 8) owns this condition, matching how `EmptyState`'s zero-segment condition already lives in the parent rather than the child.
  - [x] Tests in `src/components/SortControl.test.tsx`: renders all four options with the active one marked; tapping the active option calls `onChange` with the flipped direction; tapping an inactive option calls `onChange` with that key's own default direction (test at least two keys, not just one, to catch a copy-paste default-direction bug); `accessibilityLabel` includes both the key's display name and a direction word for at least two different key/direction combinations (not just the default state).

- [x] Task 8: Wire into `src/app/index.tsx` (AC: #1, #5, #6, #7)
  - [x] Destructure `sortKey`, `sortDirection`, `setSortOption` from `useSegments()` (Task 6) alongside the existing `segments`.
  - [x] Render `<SortControl sortKey={sortKey} sortDirection={sortDirection} onChange={setSortOption} />` above the `FlatList`, gated on `segments.length > 1` (AC #7) — inside the same `segments.length === 0 ? <EmptyState /> : (...)` branch, as a new sibling before `<FlatList>`.
  - [x] ~~No `runAction` wrapper needed here~~ — **reversed by code review 2026-09-08 (Decision):** `setSortOption`'s underlying `storage.set` is unguarded like every other write on this screen, and this file's own `runAction` comment states an uncaught press-handler exception "takes the app down instead of the row." `handleSortChange` now wraps it, same as delete/rename/duplicate.

- [x] Task 9: Screen-level tests in `src/app-tests/index.test.tsx` (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] Sort control absent with 0 or 1 segment, present with 2+ (AC #7).
  - [x] Selecting a different sort option re-orders the rendered rows (assert via `segment-list`'s `data` prop order, same pattern the existing "lists every segment" test uses — `FlatList` virtualizes, so don't assert on mounted row order).
  - [x] Tapping the already-active option flips the order (AC #3).
  - [x] **Live re-sort (AC #5, C28/R9):** with sort set to `lastPracticed` or `solidification`, write a history entry for a currently-lower-ranked segment (via `writeHistoryEntry`, imported directly in the test like `renameSegment` already is in this file) and assert the list re-orders without remounting the screen. Then, as a render-count regression guard for R9: with sort set to `name` (or `createdAt`), write a history entry and assert the segment **order is unchanged** — confirms the conditional subscription from Task 6 isn't unconditionally re-rendering on every history write.
  - [x] **Persistence (AC #6):** select a non-default sort option, unmount (`view.unmount()`) and re-render `<HomeScreen />` fresh (simulating relaunch against the same MMKV-backed store — no app restart needed, `readSettings()` reads the same persisted key), assert the same sort option/direction is active.
  - [x] **Accessibility (AC #8):** assert the sort control's `accessibilityLabel` prop text at two different sort states (not just the initial default), confirming it changes and always names both key and direction.
  - [x] **No-history placement (AC #4):** two segments, only one with a completed session; sorted by `lastPracticed` descending, the segment with history is first; sorted ascending, the segment with **no** history is still first (the "regardless of direction" clause — the easiest part of AC #4 to get backwards).

### Review Findings

Code review 2026-09-08, three parallel adversarial layers (Blind Hunter / Edge Case Hunter / Acceptance Auditor), all at Opus 5. 33 raw findings → 4 decisions, 14 patches, 2 deferred, 13 dismissed as noise or verified-handled. All 8 ACs are behaviorally satisfied; the substance below is test-lock gaps, untrusted-data hardening, and one UX-spec clause missed.

**Decisions required (must resolve before patches) — all resolved 2026-09-09:**

- [x] [Review][Decision] Untrusted history numbers produce `NaN`/negative Solidification %, corrupting the *entire* list order. **Resolved: both.** `isHistoryEntryArray` (`src/lib/types.ts`) now requires `isNonNegativeInteger` on `finalTarget`/`totalMistakes`/`totalAttempts`, `totalMistakes <= totalAttempts`, and a parseable non-empty `date`. `calculateSolidificationPercent` (`src/lib/history.ts`) additionally clamps its own result (`Number.isFinite` check, `Math.min(100, Math.max(0, ...))`) as defense in depth for any future caller that skips the storage boundary.
- [x] [Review][Decision] Name sort is UTF-16 code-unit order, not collation. **Resolved: switched to locale-aware compare.** `sortSegments`' name branch now uses `localeCompare(..., { sensitivity: 'base', numeric: true })` — fixes both the accent case (`Étude`/`Zebra`) and the embedded-number case (`Bar 2`/`Bar 10`), test-locked in `segments.test.ts`.
- [x] [Review][Decision] Sort selection had no error containment. **Resolved: wrapped in `runAction`.** `app/index.tsx`'s new `handleSortChange` wraps `setSortOption`, consistent with delete/rename/duplicate.
- [x] [Review][Decision] FR38 spec divergence (0% vs. em dash) blocking Story 4.4. **Resolved in favor of the em dash** (`architecture.md` and `ux-design-specification.md`'s reasoned "0% would misread as scored-zero" rationale) — `prd.md`'s FR38 wording corrected to match; this story's own code (which returns `null`, consumed only by the sort's local `?? 0` floor) was already correct either way.

**Patches — all applied 2026-09-09:**

- [x] [Review][Patch] AC #2's `createdAt`→desc and `solidification`→desc default directions are now test-locked [src/components/SortControl.test.tsx]
- [x] [Review][Patch] The "R9 regression guard" test now spies on `buildSortAggregates` and asserts it is not called again on a history write while sorted by name/createdAt, rather than asserting an order that could never have changed either way [src/app-tests/index.test.tsx]
- [x] [Review][Patch] Menu now shows the active option's direction in its own row text (not just the trigger's `accessibilityLabel`) [src/components/SortControl.tsx]
- [x] [Review][Patch] Both misleadingly-named AC #4 tests renamed to state the actual rule (value floors; position follows normal sort order and so flips with direction) [src/lib/segments.test.ts; src/app-tests/index.test.tsx]
- [x] [Review][Patch] The direction-flip screen test now asserts the intermediate (pre-flip) order too, so an inert control would fail before the flip is even attempted [src/app-tests/index.test.tsx]
- [x] [Review][Patch] `buildSortAggregates` is now gated behind the same `needsHistory` predicate the history subscription already used [src/hooks/useSegments.ts]
- [x] [Review][Patch] `subscribeToAnyHistory` now matches `history.<id>` via an anchored regex, excluding quarantine backup keys; direct tests added for both the match and the quarantine-exclusion case [src/lib/history.ts; src/lib/history.test.ts]
- [x] [Review][Patch] History-write visibility race fixed structurally: a module-level version counter in `lib/history.ts`, live from import time, replaces the per-hook-instance counter that could miss a write landing between render and subscribe [src/lib/history.ts; src/hooks/useSegments.ts]
- [x] [Review][Patch] `SortKey`'s enumeration is now single-sourced — `types.ts` exports `SortKeys`, and `SortControl.tsx` imports it instead of keeping its own separate array [src/lib/types.ts; src/components/SortControl.tsx]
- [x] [Review][Patch] Menu items now carry `accessibilityState={{ selected }}` [src/components/SortControl.tsx]
- [x] [Review][Patch] `isSettings`'s `as SortKey`/`as SortDirection` casts replaced with proper `isSortKey`/`isSortDirection` type guards [src/lib/types.ts]
- [x] [Review][Patch] `calculateSolidificationPercent`'s zero-attempts branch (and a non-finite-input clamp case) now have tests [src/lib/history.test.ts]
- [x] [Review][Patch] The AC #7 test now unmounts each of its three `HomeScreen` trees before rendering the next [src/app-tests/index.test.tsx]
- [x] [Review][Patch] `architecture.md`'s illustrated `useSettings()` call site corrected to the shipped `{ settings, setSortOption }` shape [architecture.md]

**Deferred:**

- [x] [Review][Defer] `useSegments()` now sorts for every consumer — `segment/new.tsx` and `segment/[id]/rename.tsx` destructure only a writer function but still pay for the sort and mount a history listener [src/hooks/useSegments.ts:43] — deferred: splitting into a list-specific hook is a design change beyond this story's scope, and the gating patch above removes most of the cost
- [x] [Review][Defer] The AC #6 persistence test is named "across a relaunch" but never resets module state, so `lib/settings.ts`'s warm cache survives the simulated restart [src/app-tests/index.test.tsx:356-372] — deferred: persistence genuinely is verified through MMKV; only the cold-start module path is unexercised

## Dev Notes

### The two different "defaults" — do not conflate them

This story has two genuinely different default values for the same `sortKey`/`sortDirection` fields, and confusing them is the single most likely mistake:

1. **App-wide default before the sort feature is ever touched** (`DEFAULT_SETTINGS` in `lib/settings.ts`, Task 2): `{ sortKey: 'createdAt', sortDirection: 'asc' }`. This exists purely so an app that has never opened the sort menu renders in exactly v1.0's order (array insertion order = oldest-created segment first).
2. **Per-option default direction when the user explicitly selects that option from the menu** (`DEFAULT_DIRECTION` map in `SortControl.tsx`, Task 7): `createdAt` defaults to **`desc`** here (newest first) — the *opposite* of default #1. This is AC #2's literal text ("date created ... newest first").

Concretely: a fresh install shows the list oldest-segment-first with no sort control interaction. The first time the user taps "Date created" in the sort menu, the list flips to newest-first. These are not the same "default" and must not share one constant.

### Architecture compliance

- `architecture.md`'s "Segment List Sort (FR33/FR34)" section is the source of truth for `sortSegments`'s signature and the aggregates-map approach — implement it as a pure function that takes precomputed aggregates, not one that reads storage itself, so it stays unit-testable without mocking MMKV (same discipline as `session-transitions.ts`). [Source: architecture.md#Segment-List-Sort-(FR33/FR34)]
- `architecture.md`'s "New Storage Boundary: lib/settings.ts" section is the source of truth for the `Settings` shape, MMKV key, defaults, and validation rules. [Source: architecture.md#New-Storage-Boundary:-lib/settings.ts]
- **This story does NOT touch `lib/mechanic.ts`, `lib/session-transitions.ts`, `useActiveSession.ts`, or any `overlearningPercent` read/write path.** Those are Epic 5's scope (FR35-FR39) and merely share the same `Settings` type/MMKV key this story creates. Do not add a Settings screen (`app/settings.tsx`) — not part of this story.
- `calculateSolidificationPercent` is deliberately implemented generically in `lib/history.ts` now (Task 5) because both this story (sort) and Story 4.4 (display) call the same function per `architecture.md`'s explicit "one function serves both FR33 and FR38" decision — implementing it twice would violate the project's single-formula-per-concern rule already established for `calculateTargetStreak`. Do not build Story 4.4's history-log summary-line UI here, though — only the function.

### Existing code confirmed by direct inspection (not inferred)

- **`readSegments()`/`readHistory()`'s cached-by-raw-string pattern** (`src/lib/segments.ts:14-26`, `src/lib/history.ts:18-29`) is the exact pattern `readSettings()` must follow — `useSyncExternalStore` requires snapshot identity stability until the underlying data actually changes, or it re-renders forever.
- **`subscribeToKeys`** (`src/lib/storage.ts:41-44`) already exists and is the correct primitive for both `subscribeToSettings` and the new `subscribeToAnyHistory` — no new MMKV-listener code needed, just new filter predicates.
- **`getObject`/`setObject`** (`src/lib/storage.ts:103-145`) already wrap every write in the schema-version envelope — `settings.general` needs no new migration code, exactly as `architecture.md` states.
- **`SegmentListItem`'s Modal-menu** (`src/components/SegmentListItem.tsx:51-95`) is the visual/interaction reference for `SortControl`'s menu — same `Modal transparent animationType="fade"`, same backdrop `Pressable` with `onRequestClose`, same `menuItem` 44px-min-height sizing. Read this file before building `SortControl`.
- **`useSegments()`** (`src/hooks/useSegments.ts`) currently returns the raw `useSyncExternalStore(subscribeToSegments, readSegments)` snapshot directly as `segments`. This story changes `segments` to a derived, sorted array — every existing consumer (`app/index.tsx`'s `FlatList`) already treats it as "the list to render," so this is a drop-in change, not a breaking one. `useSegment(id)` (single-segment lookup, used by Story 4.1's rename flow and FR31 propagation) is unaffected — it does its own `.find()` over the unsorted store snapshot and has no sort dependency.
- **`app/index.tsx`'s current structure** (read in full — `src/app/index.tsx`): the `segments.length === 0 ? <EmptyState /> : (<><FlatList .../><CreateButton .../></>)` branch is where `<SortControl>` is inserted, as a new first child of the non-empty branch's fragment, before `<FlatList>`. The existing `error`/`notice` rows stay exactly where they are (above this whole branch); do not reorder them.

### Previous story intelligence (4.1, 4.2)

- Both prior Epic 4 stories kept `lib/segments.ts` as a flat set of pure(ish) exported functions with no class/module-state beyond the existing `readSegments()` cache — follow the same shape for `buildSortAggregates`/`sortSegments`.
- Story 4.2 established the pattern of a code-review pass finding "documented-but-untested" behaviors (the nested-suffix duplicate case) — this story's AC #4 ("regardless of direction") is exactly that kind of easy-to-get-backwards rule; the task list above calls for an explicit test of both directions, not just one, to avoid repeating that finding.
- Story 4.1 added `excludeId` as an optional third parameter to `disambiguate` without touching any existing call site's required-argument count — the same "optional parameter, unchanged defaults" discipline applies here to `calculateTargetStreak`-style functions, though this story doesn't touch that function itself.
- Both stories' `Status: done` files are otherwise unrelated to sort — no shared file conflicts expected (`lib/segments.ts` and `app/index.tsx` are touched by all three stories, but at different, non-overlapping regions; re-read the current file state before editing rather than assuming its Story-4.2 shape, since this is a live file).

### Git intelligence

Last 3 commits are `4c923ff` (Story 4.2, duplicate), `20408dc` (Story 4.1, rename), and `57894fa` (v1.1 story generation) — both implementation commits used explicit path staging (never `git add -A`) and included root-cause commit-body explanations plus a `Dev Agent Record` update in the story file itself. Follow the same commit-granularity and story-file-update convention when this story is committed. No sprint-status.yaml exists in this project (confirmed absent) — stories are tracked only via their own `Status:` field and this file's presence, not a central YAML; do not create one as a side effect of this story.

### Project Structure Notes

- **New files:** `src/lib/settings.ts`, `src/lib/settings.test.ts`, `src/hooks/useSettings.ts`, `src/components/SortControl.tsx`, `src/components/SortControl.test.tsx`.
- **Modified:** `src/lib/types.ts` (+`Settings`/`SortKey`/`SortDirection`/`isSettings`), `src/lib/types.test.ts`, `src/lib/segments.ts` (+`sortSegments`/`buildSortAggregates`), `src/lib/segments.test.ts`, `src/lib/history.ts` (+`calculateSolidificationPercent`/`subscribeToAnyHistory`), `src/lib/history.test.ts`, `src/hooks/useSegments.ts`, `src/app/index.tsx`, `src/app-tests/index.test.tsx`.
- No new dependencies. No new routes (`SortControl` is inline on the existing Home screen, not a pushed screen) — no `stack-screens.ts` change.
- This story's file list is deliberately larger than 4.1/4.2's — it is the first story to touch the shared `Settings`/`lib/settings.ts` boundary that Epic 5 will also build on; keep the diff scoped to sort only (see "Architecture compliance" above on not building Epic 5's UI).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.3-Sort-the-Segment-List] — story statement and all 8 ACs (verbatim above)
- [Source: _bmad-output/planning-artifacts/architecture.md#New-Storage-Boundary:-lib/settings.ts] — `Settings` shape, MMKV key, defaults, validation rules
- [Source: _bmad-output/planning-artifacts/architecture.md#Segment-List-Sort-(FR33/FR34)] — `sortSegments` signature, aggregates-map approach, history-subscription rationale, no-history sort treatment
- [Source: _bmad-output/planning-artifacts/architecture.md#FR38:-Solidification-%-Aggregation] — `calculateSolidificationPercent` formula and null-vs-zero rationale
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Sort-Control] (~lines 543-564) — placement, menu contents/defaults table, direction-toggle rule, persistence, empty/single-segment hiding
- [Source: _bmad-output/planning-artifacts/prd.md] — FR33, FR34 (verbatim aggregate-ratio and persistence wording)
- [Source: _bmad-output/test-artifacts/test-design-epic-4-5.md] — R9 (history-subscription over/under-render risk, mitigated by Task 6's conditional subscription), C26-C30 (sort menu behavior, zero-history placement, history-subscription re-sort, persistence, hidden/visible + announcement)
- [Source: _bmad-output/project-context.md] — MMKV single-point-of-contact rule, `useSyncExternalStore` fresh-read rule, co-located vs. `app-tests/` rule, RNTL v14 async-API rule

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `useSegments()`'s history-write re-render was silently broken twice during implementation, both caught by the app-tests/index.test.tsx AC #5 test before commit:
  1. First attempt used a second `useSyncExternalStore` whose `getSnapshot` always returned the constant `null` as a pure "trigger" — `useSyncExternalStore` bails out of re-rendering when `getSnapshot` returns the same value as the last call, so a history write never re-rendered the component at all.
  2. Fixed that by returning an incrementing version counter from `getSnapshot` instead — but the outer `useMemo` that recomputes `sortSegments`/`buildSortAggregates` still only depended on `[rawSegments, sortKey, sortDirection]`, none of which change on a history write, so the memo kept returning its stale cached array even though the component now correctly re-rendered. Added the version counter to the memo's dependency array to fix.
- A test-only bug in the same AC #5 test: initially asserted a specific order between two segments that were both tied (neither had history yet) under `lastPracticed` sort — a tie has no defined order, so the assertion was arbitrary and failed once the real bug above was fixed. Corrected by giving one segment an initial history entry so the "before" state is well-defined, then writing a newer entry for the other to prove the live re-sort.
- A second, unrelated test bug: `view.unmount()` in the AC #6 persistence test was called without `await` — this RNTL version's `unmount()` is async, and the following `render()` call started before the first's teardown `act()` scope closed, throwing "overlapping act() calls" and corrupting subsequent tests in the same file (visible only when running the full file, not the test in isolation). Fixed with `await view.unmount()`.

### Completion Notes List

- All 8 ACs implemented and covered by tests: sort menu with four options and active-option marking (AC #1), per-key default direction on first selection (AC #2), direction flip on re-selecting the active option (AC #3), no-history segments floor to oldest-date/0% regardless of direction (AC #4), live re-sort on history write gated to `lastPracticed`/`solidification` only — R9 regression-guarded (AC #5), sort option/direction persisted across relaunch (AC #6), control hidden below two segments (AC #7), accessibility label names both key and direction (AC #8).
- `Settings`/`SortKey`/`SortDirection`/`isSettings` added to `lib/types.ts` per architecture.md's full shape (not narrowed to sort-only), ready for Epic 5 to add `overlearningPercent`'s setter/UI against the same MMKV key.
- New `lib/settings.ts` storage boundary follows `lib/segments.ts`'s exact cached-by-raw-string / corrupt-data-quarantine pattern.
- `calculateSolidificationPercent` implemented generically in `lib/history.ts` per architecture.md's "one function serves FR33 and FR38" decision — only the sort consumer is wired up here; Story 4.4's display UI is untouched.
- `useSegments()` now composes `useSettings()` for sort state and a conditional history-write subscription (no-op unless the active sort key needs history), then derives the rendered list via `sortSegments(buildSortAggregates(...))` — a new sorted array each render, but driven only by the gated subscriptions, not by that array's own identity.
- `SortControl` mirrors `SegmentListItem`'s Modal-menu visual/interaction pattern without extracting a shared component, per the story's explicit scope boundary.
- Full regression suite: 243/243 tests passing (up from 220 pre-story), `tsc --noEmit` clean, lint clean (0 new issues; 1 pre-existing error and 1 pre-existing warning in unrelated files, unchanged from before this story).
- **Post-review update (2026-09-09):** all 4 decisions and 14 patches applied (see Review Findings above). Full regression suite: 266/266 tests passing (up from 243), `tsc --noEmit` clean, lint clean (same 1 pre-existing error + 1 pre-existing warning, both in unrelated files, unchanged).

### File List

**New:**
- `src/lib/settings.ts`
- `src/lib/settings.test.ts`
- `src/hooks/useSettings.ts`
- `src/components/SortControl.tsx`
- `src/components/SortControl.test.tsx`

**Modified:**
- `src/lib/types.ts` (+`Settings`, `SortKey`, `SortDirection`, `isSettings`)
- `src/lib/types.test.ts` (+`isSettings` tests)
- `src/lib/segments.ts` (+`SortAggregate`, `buildSortAggregates`, `sortSegments`)
- `src/lib/segments.test.ts` (+sort/aggregate tests)
- `src/lib/history.ts` (+`calculateSolidificationPercent`, `subscribeToAnyHistory`)
- `src/lib/history.test.ts` (+`calculateSolidificationPercent` tests)
- `src/hooks/useSegments.ts` (sort + conditional history subscription threaded into `useSegments()`)
- `src/app/index.tsx` (`SortControl` wired in above the list, gated on `segments.length > 1`)
- `src/app-tests/index.test.tsx` (+sort-control test suite, AC #1-#8)

### Change Log

- 2026-09-08: Implemented Story 4.3 in full (Tasks 1–9) — `lib/settings.ts` storage boundary, `sortSegments`/`buildSortAggregates`, `calculateSolidificationPercent`, `SortControl` component, and the `useSegments()` sort + conditional history-subscription wiring. Status: ready-for-dev → review.
- 2026-09-09: Resolved all 4 code-review decisions and applied all 14 patches — untrusted-history-number hardening (both the shared type guard and a local clamp), locale-aware name sort, `runAction`-wrapped sort selection, FR38 em-dash/0% spec reconciliation across prd.md/architecture.md/ux-design-specification.md, a structural fix for the history-write visibility race, quarantine-key exclusion in `subscribeToAnyHistory`, single-sourced `SortKey` enumeration, and assorted test-quality fixes (a real recompute-spy R9 guard, corrected test names, an unmount leak, a non-distinguishing flip assertion). Status: review → done.
