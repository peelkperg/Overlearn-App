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

### Review Findings

Code review 2026-09-12 (commit `611584b`), three layers: Blind Hunter, Edge Case
Hunter, Acceptance Auditor. Run under Opus 5 against an implementation written by
Sonnet 5 — a genuinely different model, per the workflow's recommendation.
Independently verified by the Acceptance Auditor: 388/388 passing, `tsc --noEmit`
exit 0, 0 deletion lines in the test file (confirming AC #3's "no existing test
rewritten" claim), and the 382→388 net-six-tests arithmetic.

#### Decisions required

**Resolved 2026-09-12 by Gerardo:** a **single `accessibilityLabel`, no hint** — naming the sort key, the current direction, and the direction a tap produces: `` `Sort by ${KeyLabels[sortKey]}, currently ${directionLabel(sortKey, sortDirection)}, switches to ${directionLabel(sortKey, flipped)}` ``. This satisfies AC #4 unconditionally on every platform and input method (nothing is lost when a user disables Speak Hints, nothing is merged confusingly into the Android content description, and no gesture verb is named), and satisfies UX-DR28's "names the key" requirement the shipped string missed. The trigger's own label drops its direction clause, since the dedicated control now owns that state — removing the double-read. `epics.md`'s AC #4 example text, `architecture.md`'s snippet + Enforcement Guideline, and `ux-design-specification.md`'s UX-DR28 all get synced to match.

- [x] [Review][Decision] **The toggle's accessibility strings need a design call — four findings converge on the same two strings.** (a) `accessibilityHint` hardcodes `"Double tap to switch to …"`; VoiceOver/TalkBack already append their own activation phrasing, so the user hears the gesture twice, and on Switch Control / Voice Control / keyboard / the declared web target it names a gesture the user cannot perform. (b) On Android, RN concatenates `accessibilityLabel` + `accessibilityHint` into one `contentDescription`, so the hint becomes part of the *name* and cannot be suppressed. (c) Conversely, on iOS hints are a user-toggleable setting — with "Speak Hints" off the announcement degrades to "Sort direction, currently most recent first, button", losing exactly the "direction a tap would produce" that AC #4 makes its primary requirement. (d) UX-DR28 and AC #4 both say the announcement should name **the sort key**; the shipped label never does ("Sort direction, currently most recent first" — no "Last practiced"). Additionally the trigger's own label already announces the direction, so a screen-reader user hears it twice in consecutive focus stops. Note AC #4's own example text also omits the key, so the AC is internally inconsistent with UX-DR28. Whatever is chosen, `epics.md`'s AC #4, `architecture.md`, and `ux-design-specification.md` all need syncing to match. [src/components/SortControl.tsx:90-91]

#### Patches

- [ ] [Review][Patch] **Toggle can be pushed off-screen and become untappable at large font scales** (flagged High independently by two layers). `styles.trigger` has no `flex`/`flexShrink` and RN defaults `flexShrink: 0` (unlike web's 1); the trigger's `ThemedText` has no `numberOfLines`. Available width on a 320pt device is 272pt after `styles.safeArea`'s padding; `"Sort: Solidification % ▾"` reaches ~250pt at iOS's largest non-accessibility scale (~1.35×) and ~370pt at Android's 2.0× cap, and no `maxFontSizeMultiplier` exists anywhere in `src/`. The trigger consumes the full row and the toggle is laid out past the right edge — on Android, touches outside a parent's bounds are not dispatched at all, so FR42's only affordance becomes unreachable. Fix: `flexShrink: 1` on `trigger` plus `numberOfLines={1}` on its text. [src/components/SortControl.tsx:135-143]
- [ ] [Review][Patch] **Two 44pt hit targets are flush with no dead zone.** `styles.row` has no `gap` and `styles.trigger` has no `paddingHorizontal`, so the toggle's tap area begins exactly where the `▾` glyph ends. A tap a few points right of the chevron — the glyph that visually invites "open the menu" — silently reverses the whole list instead. Fix: `gap: Spacing.three` on `row`. [src/components/SortControl.tsx:135-138]
- [ ] [Review][Patch] **The direction-flip ternary now exists three times, and the comment claiming it cannot drift is false.** `handleSelect:54`, `flippedDirection:65`, and the arrow glyph `:93` are three independent copies of the same expression. The Edge Case Hunter confirmed they produce identical results in every reachable state today (no current defect), but the in-code comment asserts they "can never drift apart" and the story's Dev Notes claim "no second place … could drift out of sync" — both false, and both contrary to this project's single-formula discipline (`calculateTargetStreak`, `directionLabel`, `calculateSolidificationPercent`). Fix: extract one `flip(d)` helper used by `onPress`, the hint, and the glyph; correct the comment and the Dev Note. [src/components/SortControl.tsx:62-65, 93]
- [ ] [Review][Patch] **Accessibility assertions read element props instead of querying the accessibility tree** — `toggle.props.accessibilityLabel` passes even if the control is invisible to assistive tech (set `accessible={false}` or drop `accessibilityRole` and every assertion still passes). Use `getByLabelText(...)` so the query resolves through the a11y tree. [src/components/SortControl.test.tsx:120-132]
- [ ] [Review][Patch] **`toHaveTextContent` is a substring match over the subtree** — an implementation rendering `'↑↓'` unconditionally passes both the asc and desc assertions, i.e. the suite accepts a control that shows both arrows always. Assert exact text. [src/components/SortControl.test.tsx:84-91]
- [ ] [Review][Patch] **AC #3's regression test only exercises asc→desc** — replacing `handleSelect`'s re-tap flip with a literal `onChange(key, 'desc')` still passes it. Add the `sortDirection="desc"` case so the test actually guards the flip it claims to protect. [src/components/SortControl.test.tsx:38]
- [ ] [Review][Patch] **No test asserts the toggle press does *not* open the sort menu, and no press test asserts `onChange` call count.** Adding `setMenuVisible(true)` to the toggle's `onPress` passes every test in the file while slamming a modal open on every flip; a double-fire would also pass silently. Add both assertions. [src/components/SortControl.test.tsx:94-106]
- [ ] [Review][Patch] **AC #1's "immediately to the right of the trigger" is asserted but never tested** — an implementation rendering the toggle above or left of the trigger passes every test in the file. Add an assertion on sibling order / row layout. [src/components/SortControl.test.tsx:84-91]
- [ ] [Review][Patch] **AC #2's "and the list re-sorts live" has no coverage at any level** — the component test asserts only that `onChange` fires; nothing exercises the toggle through `handleSortChange` → `setSortOption` → re-render. The wiring is pre-existing and correct, so risk is low, but the AC's observable outcome is unverified. Add an integration test in `src/app-tests/index.test.tsx`. [src/components/SortControl.test.tsx:94-106]
- [ ] [Review][Patch] **`architecture.md`'s FR42 snippet was never synced to the shipped label+hint split** — CLAUDE.md §13.4 requires the spec be corrected in the same or immediately following commit; `git show --stat 611584b` touched no planning artifact. Its Enforcement Guideline is also worded for "the new toggle's accessibility label" only. Sync it to whatever the decision above produces. [_bmad-output/planning-artifacts/architecture.md:784-791, 826]
- [ ] [Review][Patch] **File List omits two files the commit actually changed** — `sprint-status.yaml` and the story file itself. Same omission Story 4.6's review found; worth fixing the habit, not just the instance. [this file]

#### Deferred

- [x] [Review][Defer] The `FlatList` does not scroll to top after a direction flip, so with enough segments to scroll, a one-tap reversal shows an arbitrary mid-list slice and the user cannot tell anything changed — the confirming signal (the new first item) is off-screen. Pre-existing from Story 4.3's menu gesture, but this story makes it the primary path. Deferred because adding scroll-to-top is new behavior no AC or FR specifies (No-Invention), and it should be decided for both entry points at once. [src/app/index.tsx:167-169, 206-222]
- [x] [Review][Defer] A corrupt `settings.general` read makes a sort tap silently reset `overlearningPercent` to 50 — `setSortOption` does `setObject(KEY, { ...readSettings(), sortKey, sortDirection })`, and `readSettings()` returns `DEFAULT_SETTINGS` after a quarantine, persisting the floor over the user's configured overlearning level with no error surfaced. Pre-existing in `lib/settings.ts`; this story converts it from a two-tap menu action into a one-tap one. Deferred as a `lib/settings.ts` defect outside this story's scope, but it touches the app's core mechanic setting and deserves its own fix. [src/lib/settings.ts:41-43]

#### Dismissed (5)

Lint-count discrepancy (**false positive** — the auditor ran bare `npx eslint .`, which includes the generated `.expo/types/router.d.ts`; the project's own `npm run lint` → `expo lint` reports exactly the 1 error/1 warning claimed, verified by running both); `await unmount()` being a non-promise (real, but matches existing precedent at `src/app-tests/index.test.tsx`'s `await empty.unmount()` — a codebase-wide convention question, not this story's defect); two render cases in one `it` (style preference); the `↓`-next-to-"most recent first" glyph ambiguity (explicitly specified — `ux-design-specification.md` requires the icon show *current direction*, not an action); missing `accessibilityState` (the `button` role is what `architecture.md` specifies; folds into the decision above if the strings are redesigned).

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
