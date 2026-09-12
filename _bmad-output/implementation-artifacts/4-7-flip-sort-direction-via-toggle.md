# Story 4.7: Flip Sort Direction via Toggle

Status: ready-for-dev

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

- [ ] Task 0: Resolve a wording gap between architecture.md's snippet and this story's AC #4 before writing any code
  - [ ] `architecture.md`'s FR42 section shows `accessibilityLabel={\`Sort direction, currently ${directionLabel(sortKey, sortDirection)}\`}` — the *current* direction only, no mention of what a tap would produce.
  - [ ] AC #4 (epics.md, more specific and acceptance-authoritative) requires the announcement to also state **the direction a tap would produce**: `"Sort direction, currently most recent first, double-tap to switch to oldest first"`.
  - [ ] Resolution (this story's implementation choice, not a user-facing ambiguity — architecture.md's snippet was an illustrative sketch, not a literal spec): split across `accessibilityLabel` (current state) and `accessibilityHint` (what a tap does) — this matches the existing codebase convention (`SegmentListItem.tsx`'s `accessibilityHint="Press and hold to rename"` names the *action*, not the state) and lets VoiceOver/TalkBack read both in sequence, producing the exact announcement AC #4 describes without concatenating everything into one label string. Do not follow architecture.md's snippet literally — it undershoots the AC.

- [ ] Task 1: Add the direction-toggle button to `SortControl.tsx` (AC #1, #2, #3)
  - [ ] Current return statement is a bare `<View>` containing the trigger `Pressable` and the `Modal` as siblings (`styles.trigger` has no `flexDirection` set on its parent — the outer `<View>` defaults to column). Wrap the trigger `Pressable` and the new toggle `Pressable` in a new inner `<View style={styles.row}>` (`flexDirection: 'row', alignItems: 'center'`), keeping the `Modal` as a sibling of that row `View`, still a direct child of the outer `<View>` — `Modal` renders via a native overlay and is unaffected by its JSX parent's flex layout, so this restructuring only changes what's visually inline with the trigger.
  - [ ] Add the new `Pressable`, immediately after the trigger `Pressable`, inside the new row `View`:
    ```tsx
    <Pressable
      testID="segment-sort-direction-toggle"
      style={styles.directionToggle}
      onPress={() => onChange(sortKey, sortDirection === 'asc' ? 'desc' : 'asc')}
      accessibilityRole="button"
      accessibilityLabel={`Sort direction, currently ${directionLabel(sortKey, sortDirection)}`}
      accessibilityHint={`Double tap to switch to ${directionLabel(sortKey, sortDirection === 'asc' ? 'desc' : 'asc')}`}
    >
      <ThemedText type="small">{sortDirection === 'asc' ? '↑' : '↓'}</ThemedText>
    </Pressable>
    ```
  - [ ] `styles.directionToggle`: `minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center'` — matches this file's existing `minHeight: 44` convention on `styles.trigger` and the 44×44 minimum target every other row control in this codebase already uses (`SegmentListItem.tsx`'s `menuButton`, `SettingsButton`).
  - [ ] `onPress` calls the same `onChange` prop the menu's `handleSelect` already calls for the re-tap-active-option case — no new prop on `SortControlProps`, no change to the parent (`app/index.tsx`'s `<SortControl sortKey={sortKey} sortDirection={sortDirection} onChange={handleSortChange} />` call site is unchanged, confirmed against architecture.md).
  - [ ] `handleSelect`'s existing re-tap-active-option branch (`if (key === sortKey) onChange(key, sortDirection === 'asc' ? 'desc' : 'asc')`) is untouched — AC #3 requires it to keep working exactly as before.

- [ ] Task 2: Tests in `src/components/SortControl.test.tsx` (AC #1, #2, #3, #4)
  - [ ] **AC #1 — button present:** render with any `sortKey`/`sortDirection` → `getByTestId('segment-sort-direction-toggle')` exists, showing `'↑'` for `sortDirection: 'asc'` and `'↓'` for `'desc'` (assert via the rendered `ThemedText` content, or the accessibilityLabel's direction phrase).
  - [ ] **AC #2 — tap flips direction:** render with `sortKey="name" sortDirection="asc"`, press `segment-sort-direction-toggle` → `onChange` called with `('name', 'desc')`. Repeat for a non-`asc`/`desc`-symmetric key to confirm it isn't hardcoded to `'name'` (e.g. `sortKey="lastPracticed" sortDirection="desc"` → `onChange('lastPracticed', 'asc')`).
  - [ ] **AC #3 — existing menu gesture unaffected:** re-run (or confirm unchanged) the existing `'tapping the active option calls onChange with the flipped direction'` test — it must still pass unmodified, proving the toggle button is additive.
  - [ ] **AC #4 — announcement:** for `sortKey="lastPracticed" sortDirection="desc"`, assert `getByTestId('segment-sort-direction-toggle').props.accessibilityLabel` is `'Sort direction, currently most recent first'` and `.props.accessibilityHint` is `'Double tap to switch to oldest first'`. Repeat for at least one other key (e.g. `name`) to confirm `directionLabel()` is genuinely reused, not a second hardcoded mapping.
  - [ ] Regression: full existing suite in this file re-run and passing — the row-layout restructuring (Task 1) must not change the trigger `Pressable`'s existing `testID`, props, or menu behavior.

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

### Debug Log References

### Completion Notes List

### File List
