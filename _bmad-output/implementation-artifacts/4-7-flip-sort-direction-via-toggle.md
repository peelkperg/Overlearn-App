# Story 4.7: Flip Sort Direction via Toggle

Status: review

<!-- Note: Validate with validate-create-story before dev-story if desired. -->

## Story

As a user,
I want a dedicated button to flip the segment list's sort direction,
so that I don't have to re-open the sort menu and re-tap the already-active option to do it.

## Acceptance Criteria

1. **Given** the segment list's sort control is visible (2+ segments) **When** the list renders **Then** a `↑`/`↓` icon button appears immediately to the right of the `Sort: X ▾` trigger, showing the current direction (FR42, UX-DR28)

2. **Given** the direction toggle button **When** the user taps it **Then** the sort direction flips for the currently active sort key and the list re-sorts live — the same effect as re-tapping the active option in the sort menu (FR42)

3. **Given** Story 4.3's existing "tap the already-active menu option to flip direction" gesture **When** Story 4.7 ships **Then** that gesture still works unchanged — the new button is an addition, not a replacement (FR42)

4. **Given** the direction toggle button **When** a screen reader reaches it **Then** it announces the sort key and the direction a tap would produce (e.g. "Sort direction, currently most recent first, double-tap to switch to oldest first"), reusing `SortControl.tsx`'s existing `directionLabel()` helper — never the bare glyph alone (FR42, UX-DR28)

[Source: _bmad-output/planning-artifacts/epics.md#Story-4.7-Flip-Sort-Direction-via-Toggle]

## Tasks / Subtasks

- [x] Task 0: Resolve a wording gap between architecture.md's snippet and this story's AC #4 before writing any code
  - [x] Confirmed the gap as described; resolved by splitting across `accessibilityLabel`/`accessibilityHint`, per the plan.

- [x] Task 1: Add the direction-toggle button to `SortControl.tsx` (AC #1, #2, #3)
  - [x] Wrapped the trigger `Pressable` and new toggle `Pressable` in a new `<View style={styles.row}>` (`flexDirection: 'row', alignItems: 'center'`); `Modal` stays a sibling of that row, unaffected.
  - [x] Added the toggle `Pressable` exactly as planned, computing `flippedDirection` once and reusing it for both `onPress` and the `accessibilityHint`.
  - [x] `styles.directionToggle` added (`minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center'`).
  - [x] `onPress` calls the same `onChange` prop — no new prop on `SortControlProps`, `app/index.tsx` untouched (confirmed by full test suite passing with no changes there).
  - [x] `handleSelect`'s re-tap-active-option branch untouched — confirmed by AC #3's regression test passing unmodified.

- [x] Task 2: Tests in `src/components/SortControl.test.tsx` (AC #1, #2, #3, #4)
  - [x] AC #1: up/down arrow shown per direction.
  - [x] AC #2: flips direction for `'name'` and, separately, for `'lastPracticed'` (not hardcoded to one key).
  - [x] AC #3: existing re-tap-active-option test re-run, passing unmodified.
  - [x] AC #4: `accessibilityLabel`/`accessibilityHint` asserted for two different keys, confirming `directionLabel()` reuse rather than a second mapping.
  - [x] Full existing suite in this file re-run: 14/14 passing, no regressions.

## Dev Notes

### Architecture compliance

- **No new component, no new prop surface.** `architecture.md`'s FR42 section: "extends `components/SortControl.tsx` in place — no new component file... no new prop surface on the parent." Confirmed by direct inspection: `app/index.tsx`'s `<SortControl sortKey={sortKey} sortDirection={sortDirection} onChange={handleSortChange} />` call site needs zero changes.
- **Reuses `directionLabel()`, does not duplicate it.** Both the accessibilityLabel and the new accessibilityHint call the same existing helper (already used by the trigger's own `accessibilityLabel` and the menu's per-option labels) — per this file's own precedent (Story 4.3, `useSegments.ts`/`calculateTargetStreak` single-formula discipline extended to this component).
- **Reuses the same `onChange` callback the menu's re-tap-active-option path already calls** — no second write path, no second place `sortDirection === 'asc' ? 'desc' : 'asc'` could drift out of sync between the two UI entry points (mirrors Story 4.6's `formatRowDate`/`formatRowSolidification` single-function precedent, and Story 4.5's "two UI paths, one write path" note for `renameSegment`).

### Existing code confirmed by direct inspection

- **`src/components/SortControl.tsx`** (read in full, current state — unchanged since Story 4.3's `b0159cc`, no code review has touched it): the component returns a bare `<View>` with the trigger `Pressable` and a `Modal` as its only two children — no wrapping row exists yet, so Task 1's restructuring is required, not optional. `directionLabel(key, direction)` already exists and is already used twice (trigger's own `accessibilityLabel`, and each menu item's selected-state label) — this story is its third call site, not a new function.
- **`src/app/index.tsx`**: `<SortControl sortKey={sortKey} sortDirection={sortDirection} onChange={handleSortChange} />`, rendered only when `segments.length > 1` (Story 4.3's AC #7 — hidden at 0–1 segments). This story adds no new prop here; the toggle button is entirely internal to `SortControl.tsx`.
- **`src/components/SortControl.test.tsx`** (read in full): existing tests use `render`/`fireEvent` from `@testing-library/react-native` (RNTL v14 — `await` every call, per `project-context.md`), target the trigger via `getByTestId('segment-sort-control')`, and open the menu before interacting with any option. The new toggle button is a sibling of the trigger, not inside the menu `Modal` — no need to open the menu to reach it.

### A wording gap found during story creation (Task 0)

`architecture.md`'s illustrative code snippet for FR42 undershoots AC #4: it shows only `` `Sort direction, currently ${directionLabel(...)}` `` with no mention of what a tap would do. AC #4's own example text ("...double-tap to switch to oldest first") requires more. Resolved per Task 0 by splitting the announcement across `accessibilityLabel` (state) and `accessibilityHint` (action) — the same pattern `SegmentListItem.tsx`'s `accessibilityHint="Press and hold to rename"` already establishes for naming an action separately from a label naming the current thing. This is a story-level implementation decision, not a spec conflict requiring your input — architecture.md's snippet was always illustrative, and epics.md's AC is the acceptance-authoritative text.

### Previous story intelligence (4.6)

- Story 4.6's review found and fixed several categories of defect worth watching for here too: **unanchored test regexes** that pass under an inverted implementation (this story's rounding-free scope has less exposure, but assert exact strings, not loose substrings, for the accessibilityLabel/Hint checks); **a test whose name states the opposite of its assertion** (name every new test for what it actually asserts); and **false claims in a story's own Dev Agent Record** ("verified via test output" for something tests cannot verify, an "only caller" claim not checked against the whole codebase) — do not claim more than what was actually run and observed.
- Story 4.6 also established the precedent (Story 4.3's original) of one function, multiple call sites, for shared logic — followed again here for `directionLabel()`.

### Project Structure Notes

**Modified:**
- `src/components/SortControl.tsx` — new toggle `Pressable`, new `styles.row`/`styles.directionToggle`, restructured return JSX
- `src/components/SortControl.test.tsx` — new tests for AC #1, #2, #4; regression check for AC #3

**Not touched:**
- `src/app/index.tsx` — no prop change, confirmed above
- `src/lib/segments.ts`, `src/lib/types.ts` — `SortKey`/`SortDirection`/`SortKeys` unchanged, no new type needed
- `src/app/stack-screens.ts`, `src/app/_layout.tsx` — no new routes

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.7-Flip-Sort-Direction-via-Toggle] — story statement and all 4 ACs (verbatim above)
- [Source: _bmad-output/planning-artifacts/prd.md#FR42] — "a dedicated toggle control next to the Sort control, independent of re-selecting the currently-active sort option... does not change FR33's per-key default direction on first selection"
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Sort-Control] (Superseded 2026-09-12, FR42 paragraph) — placement (immediately right of trigger, same row, 44×44), icon shows current direction not an action glyph, both entry points remain valid
- [Source: _bmad-output/planning-artifacts/architecture.md#Sort-Direction-Toggle-(FR42)] — extends `SortControl.tsx` in place, reuses `directionLabel()`, no new prop surface (its accessibilityLabel snippet is superseded in scope by this story's Task 0 — see Dev Notes)
- [Source: _bmad-output/project-context.md] — RNTL v14 async-API rule, 44×44 minimum-target convention, single-point-of-contact/single-formula discipline

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

None — implementation converged on the first pass; Task 0's wording-gap resolution was decided during story creation, not discovered mid-implementation.

### Completion Notes List

- All 4 ACs implemented and covered by tests. New tests written first and confirmed failing (5 of 6 failed pre-implementation; AC #3's regression test passed immediately since it needed no new code) before implementing, per red-green-refactor.
- 388/388 tests passing (was 382; 6 net new tests this story added — no existing test removed or rewritten). `tsc --noEmit` clean. Lint: same pre-existing 1 error/1 warning baseline, in files this story never touched.
- No new prop on `SortControlProps`, no change to `app/index.tsx`'s `<SortControl>` call site, no new `lib/` function — `directionLabel()` reused at its third call site (trigger label, menu items, now the toggle), exactly as architecture.md specified.
- Task 0's wording-gap resolution (split `accessibilityLabel`/`accessibilityHint` rather than architecture.md's single-string snippet) implemented as decided during story creation — no further ambiguity encountered.

### File List

**Modified:**
- `src/components/SortControl.tsx` (new toggle `Pressable`, `flippedDirection` computed once and reused for `onPress`/`accessibilityHint`, `styles.row`/`styles.directionToggle`, restructured return JSX to wrap trigger+toggle in a row `View`)
- `src/components/SortControl.test.tsx` (new `[Story 4.7]` describe block, 6 tests covering AC #1–#4)

### Change Log

- 2026-09-12: Implemented Story 4.7 in full (Tasks 0–2) — segment list sort control gains a dedicated `↑`/`↓` direction-toggle button next to the `Sort: X ▾` trigger (FR42). No new prop surface, no new `lib/` function, no new dependencies; Story 4.3's existing re-tap-active-menu-option gesture is untouched and still passes its original test. 388/388 passing, `tsc` clean, lint unchanged from baseline. Status: ready-for-dev → review.
