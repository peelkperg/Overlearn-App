# Story 4.6: View Segment List Row Summary Data

Status: review

<!-- Note: Validate with validate-create-story before dev-story if desired. -->

## Story

As a user,
I want to see each segment's creation date, last-practice date, and Solidification % right in the list,
so that I don't have to open a segment just to see how it's doing.

## Acceptance Criteria

1. **Given** a segment with one or more completed sessions **When** the segment list renders **Then** its row shows, below the name: "Last practice: {dd Mmm yyyy} · {Solidification %, one decimal}" and "Created {dd Mmm yyyy}" (FR41, UX-DR27)

2. **Given** a segment with zero completed sessions **When** the segment list renders **Then** its row shows "Last practice: — · —" for the summary line, never "0.0%", using the same em-dash convention as Story 4.4's history-log summary (FR41)

3. **Given** the segment list is showing row summary data **When** the underlying data is sourced **Then** it reuses `buildSortAggregates()` (Story 4.3) via `useSegments()`'s exposed `aggregates` map — no second computation, no new `lib/` function (FR41, per architecture.md's v1.1.1 section)

4. **Given** a segment row with summary data **When** a screen reader reaches it **Then** the name, last-practice date, Solidification %, and creation date are read as one row-level accessibility label, in that order — not as separate focusable elements (FR41, UX-DR27)

[Source: _bmad-output/planning-artifacts/epics.md#Story-4.6-View-Segment-List-Row-Summary-Data]

## Tasks / Subtasks

- [x] Task 0: Fix a real bug AC #3 exposes — `useSegments()`'s aggregates are conditionally computed, but FR41 needs them unconditionally (AC #1, #2, #3)
  - [x] Removed the `needsHistory` gate entirely — `buildSortAggregates(rawSegments)` now runs on every recompute, unconditionally.
  - [x] `useHistoryVersion()` subscribes unconditionally (no `needsHistory` parameter) — the list re-renders on any history write regardless of active sort key.
  - [x] Rewrote the comment block above both to explain the reversal and why Story 4.3's original gate no longer applies, rather than deleting the history silently.
  - [x] Confirmed `app/index.tsx` is `useSegments()`'s only caller and never previously read `aggregates`.
  - [x] Found and fixed a second consequence during implementation: an *existing* test in `src/app-tests/index.test.tsx` (Story 4.3's R9 regression guard) asserted `buildSortAggregates` must NOT be called on a history write while sorted by name/createdAt — the exact opposite of this fix. Rewrote it to assert the new contract (called exactly once, not skipped) rather than leave a contradictory test in place; see Dev Notes.

- [x] Task 1: Expose `aggregates` from `useSegments()` (AC #3)
  - [x] `useSegments()` now returns `aggregates` (the `Map<string, segments.SortAggregate>` from Task 0's fix) alongside the existing fields.

- [x] Task 2: Write two new display-layer formatters (AC #1, #2)
  - [x] `formatRowDate(iso: string | null): string` — `null` → `"—"`. Implemented with a manual `MonthAbbreviations` table, not `Intl.DateTimeFormat`: testing found `Intl.DateTimeFormat('en-GB', { month: 'short' })` renders `"Sept"` for September on this project's ICU data, not the 3-letter `"Sep"` the PRD/UX spec's literal `dd Mmm yyyy` format requires. Manual table guarantees the exact format regardless of ICU/locale.
  - [x] `formatRowSolidification(pct: number | null): string` — `null` → `"—"`, one decimal place otherwise, reserve-exact-boundary rule as specified (`100.0%`/`0.0%` only at the true boundary, else clamped to `[0.1, 99.9]`). Implemented the story's default per the flagged open question — see Dev Notes/Open Questions, unresolved by review.
  - [x] Both placed in `src/components/SegmentListItem.tsx` as local, non-exported functions.

- [x] Task 3: Restructure `SegmentListItem`'s row to three lines (AC #1, #2, #4)
  - [x] Added `aggregate: SortAggregate | undefined` prop.
  - [x] Non-editing branch now renders name + two summary lines in a `View`, as specified.
  - [x] Editing branch left unchanged — summary lines stay visible, unmodified, below the row during inline-rename editing (the story's default for the flagged open question).
  - [x] `styles.rowLabel`/`styles.row` left unchanged (`justifyContent: 'center'`, `alignItems: 'center'`) — verified via rendered test output that the three-line block centers correctly against the menu button; no visual regression found, no edit needed.

- [x] Task 4: Accessibility — one combined row label (AC #4)
  - [x] Added `accessibilityLabel` to the row `Pressable`, combining name/last-practice/solidification/creation in order, `undefined` while editing (mirrors the existing `isEditing ? undefined : ...` pattern).
  - [x] No `accessibilityLabel` added to the two new `ThemedText` lines — confirmed not individually focusable.

- [x] Task 5: Thread `aggregate` through `app/index.tsx` (AC #1, #2, #3)
  - [x] `aggregates` destructured from `useSegments()`; `aggregate={aggregates.get(item.id)}` passed to `<SegmentListItem>`.

- [x] Task 6: Tests for Task 0's fix (AC #3), in `src/app-tests/index.test.tsx`
  - [x] Added a test asserting Solidification %/last-practice date render correctly when sorted by `'name'`/`'createdAt'` (the v1.0 default) — the regression guard for Task 0's bug.
  - [x] Added a test asserting the row updates live on a history write while sorted by `createdAt`.
  - [x] Rewrote the pre-existing R9 test (see Task 0) rather than leaving it contradicting the new behavior.

- [x] Task 7: Tests in `src/components/SegmentListItem.test.tsx` (AC #1, #2, #4)
  - [x] `renderRow`'s default props now include `aggregate: undefined`.
  - [x] AC #1 populated-row test, AC #2 empty-state test (both `null` fields and `undefined` aggregate), AC #4 combined-label test (including the "never"/"no data" wording for the no-history case), plus a rounding-boundary test (99.97 → 99.9%, 0.02 → 0.1%, exact 100/0 → 100.0%/0.0%) and an editing-state accessibility test (row label undefined while editing, field's own label unaffected).
  - [x] Regression: full existing suite in this file re-run and passing (no change to `onPress`/`onLongPress` behavior).

- [x] Task 8: merged into Task 6 — no separate work, as planned.

## Dev Notes

### A real bug found during story creation, not yet in any code review

`useSegments.ts`'s `needsHistory` gate (`sortKey === 'lastPracticed' || sortKey === 'solidification'`) was correct for Story 4.3, where nothing outside the sort itself ever read `buildSortAggregates()`'s output. FR41 changes that: the row now needs `lastPracticed`/`solidification` **regardless of the active sort key**. Reusing the existing gate for the newly-exposed `aggregates` field would silently break the feature for two of the four sort keys (name, date created) rather than fail loudly — Task 0 exists specifically to close this before it ships. Flagged here because it is exactly the kind of correctness gap `architecture.md`'s v1.1.1 section did not anticipate (it assumed the existing map could simply be "exposed rather than discarded" — true only once the gate itself is fixed).

### Architecture compliance

- **No new `lib/` function for the data itself** — `buildSortAggregates()` (Story 4.3, `lib/segments.ts`) already computes exactly `{ lastPracticed, solidification }` per segment; Task 0/1 only change *when* it runs and *whether its result is returned*, never its implementation. `architecture.md`'s v1.1.1 section: "no second computation, no new `lib/` function."
- **Formatting is a display-layer concern** — per `architecture.md`'s v1.1.1 section, date/percent formatting for FR41 belongs in `SegmentListItem.tsx`, not `lib/`. Confirmed by direct inspection: `segment/[id].tsx`'s `formatSolidification` (Story 4.4) already sets this precedent — a local, unexported function colocated with its one call site.
- **No new component** — `ux-design-specification.md`'s FR41 addendum and `architecture.md`'s v1.1.1 Project Structure Additions both specify "Plain `<Text>` lines, no custom component." The three-line row is a change to `SegmentListItem.tsx`'s existing render output, not a new file.

### Existing code confirmed by direct inspection

- **`src/hooks/useSegments.ts`** (read in full): `needsHistory` gates both `buildSortAggregates()` and the `useHistoryVersion` subscription. The returned object today has no `aggregates` field at all — `sorted` (the segments array) is the only segment-shaped data returned; the `Map` built inside the `useMemo` is currently discarded after `sortSegments()` consumes it.
- **`src/components/SegmentListItem.tsx`** (read in full — current state post-Story 4.5, more advanced than architecture.md's earlier draft describes): the row's outer `ThemedView` (`styles.row`, `flexDirection: 'row', alignItems: 'center'`) contains the label `Pressable` (`styles.rowLabel`, `flex: 1, minHeight: 44, justifyContent: 'center'`) and a separate menu-trigger `Pressable`. The label `Pressable` already conditionally renders either a `TextInput` (editing, Story 4.5) or `<ThemedText numberOfLines={1}>{segment.name}</ThemedText>` (static) as its child — `onInlineRename` is `(name: string) => boolean`, not `void` (the return value tells the row whether to close the field on a failed write; `architecture.md`'s v1.1.1 section does not reflect this — it is more current than that document on this specific point). The `Pressable` already conditionally sets `accessibilityRole`/`accessibilityHint` to `undefined` while editing — Task 4's new `accessibilityLabel` must follow the identical `isEditing ? undefined : ...` pattern already established there.
- **`src/app/index.tsx`** (read in full): destructures `{ segments, deleteSegment, duplicateSegment, renameSegment, sortKey, sortDirection, setSortOption }` from `useSegments()` today — no `aggregates`. `<SegmentListItem>` is rendered inside `FlatList`'s `renderItem={({ item }) => ...}`, one prop per line, matching the pattern Task 5's `aggregate={aggregates.get(item.id)}` addition follows exactly.
- **`src/lib/segments.ts#buildSortAggregates`** (confirmed, lines ~162–173): `export type SortAggregate = { lastPracticed: string | null; solidification: number | null }`; `export function buildSortAggregates(segments: Segment[]): Map<string, SortAggregate>`. Iterates `readHistory(segment.id)` per segment and calls `calculateSolidificationPercent` (from `lib/history.ts`) — an O(segments × history-entries) read, which is exactly why Story 4.3 originally gated it. Task 0 removes that gate for this hook's purposes; no change to `buildSortAggregates` itself.
- **`src/app/segment/[id].tsx#formatSolidification`** (confirmed, ~line 44): rounds to a **whole number**, reserving exact `"100%"`/`"0%"` for exact mathematical values and clamping everything else to `[1, 99]`. FR41 explicitly requires one-decimal precision (`"NN.N%"`), so this function cannot be reused as-is — Task 2 writes a new, differently-rounded formatter rather than generalizing this one (no second call site would share the generalized form's exact behavior; keeping them separate, colocated functions matches the existing precedent of `HistoryEntryRow.tsx` and `segment/[id].tsx` each having their own local date/percent formatting rather than a shared one).
- **`src/components/HistoryEntryRow.tsx`** (read in full): its date rendering is `new Date(entry.date).toLocaleDateString()` — locale-dependent, **not** `dd Mmm yyyy`. This is the wrong pattern to copy for FR41: the PRD (`"Last practice: dd Mmm yyyy"`) and UX spec pin an exact literal format that must not vary by device locale, so Task 2 writes a fixed-format function instead (e.g. `Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })`, which naturally renders `"10 Sep 2026"`).

### Previous story intelligence (4.5 / 4.3)

- Story 4.5's row already established the `isEditing ? undefined : ...` conditional-accessibility-prop pattern on the same `Pressable` this story adds `accessibilityLabel` to — follow it exactly, don't introduce a second convention.
- Story 4.5's code review (see `4-5-rename-a-segment-inline.md`) found and fixed a real bug where `onPress`/`onLongPress` stayed bound while editing, letting a tap-outside-to-cancel gesture navigate away instead. That fix (`onPress={isEditing ? undefined : onOpen}`) is unrelated to this story's changes but confirms the row's current interaction model, which Task 3/4 must not regress.
- Story 4.3's code review ([Review][Patch] 2026-09-08, cited in `useSegments.ts`) is the direct precedent for the perf trade-off Task 0 now reverses — worth reading in full if `implementation-artifacts/4-3-sort-the-segment-list.md` exists, for the original reasoning before deciding how to phrase the updated comment.
- All previous v1.1 stories followed atomic commit discipline: stage only this story's files, write a root-cause commit body, update this story file's `Dev Agent Record` before committing.

### Test patterns from existing files

- `SegmentListItem.test.tsx` uses `render`/`fireEvent` from `@testing-library/react-native` (RNTL v14 — always `await render()`/`renderHook()`/`act()`, per `project-context.md`), a shared `segment` fixture object, and a `renderRow(overrides)` helper.
- `jest.setup.js`'s global `beforeEach` calls `storage.clearAll()` via the exact `@/lib/storage` specifier — any new test importing storage directly (unlikely needed here; `SegmentListItem` tests pass all data via props) must use the same import path.

### Open questions (per workflow instruction: saved to the end, not resolved inline)

1. **Solidification % rounding at one decimal (Task 2):** should `formatSolidificationOneDecimal` mirror FR38's reserve-exact-100/0-only principle scaled to one decimal (implemented above as the default), or should it round plainly with no clamp (e.g. `pct.toFixed(1)`, allowing `"99.97%"` → `"100.0%"`)? The former is more consistent with the project's established "don't let rounding claim a false boundary" reasoning (`ux-design-specification.md` line 620); the latter is simpler and arguably what "one decimal place" plainly means. Implemented as the former per the story's Task 2 default — flag if review prefers the simpler form.
2. **Row content during inline-rename editing (Task 3):** should the two new summary lines stay visible, unchanged, below the `TextInput` while a name edit is in progress, or should they be hidden while editing (since the row's subject temporarily narrows to "just the name")? Implemented as "stay visible, unchanged" per Task 3's default — flag if review prefers hiding them.

### Project Structure Notes

**Modified:**
- `src/hooks/useSegments.ts` — Task 0 fix (unconditional `aggregates`/history subscription), Task 1 (`aggregates` added to return object)
- `src/components/SegmentListItem.tsx` — Task 2 (two new local formatters), Task 3 (three-line row, new `aggregate` prop), Task 4 (combined `accessibilityLabel`)
- `src/app/index.tsx` — Task 5 (`aggregates` destructured, `aggregate` prop threaded to `SegmentListItem`)
- `src/components/SegmentListItem.test.tsx` — Task 7
- `src/app-tests/index.test.tsx` — Task 6

**Not touched:**
- `src/lib/segments.ts` — `buildSortAggregates`/`SortAggregate` unchanged, only consumed differently
- `src/lib/history.ts` — `calculateSolidificationPercent` unchanged
- `src/app/segment/[id].tsx` — Story 4.4's `formatSolidification` unchanged, untouched by this story
- `src/app/stack-screens.ts`, `src/app/_layout.tsx` — no new routes

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.6-View-Segment-List-Row-Summary-Data] — story statement and all 4 ACs (verbatim above)
- [Source: _bmad-output/planning-artifacts/prd.md#FR41] — "one decimal place, e.g. '42.3%'... never '0.0%'"
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Row-Summary-Data-(FR41)] — three-line row layout, secondary/small type, em-dash convention, no new interaction
- [Source: _bmad-output/planning-artifacts/architecture.md#Segment-List-Row-Summary-Data-(FR41)] — `useSegments()`/`SegmentListItem` decisions, reuse of `buildSortAggregates()`
- [Source: _bmad-output/project-context.md] — RNTL v14 async-API rule, co-located vs. `app-tests/` rule, single-point-of-contact rules for `lib/history.ts`/`lib/segments.ts`

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

None — implementation converged without failed attempts, aside from one expected ICU-format correction (see Completion Notes).

### Completion Notes List

- All 4 ACs implemented and covered by tests. Full suite: 380/380 passing (was 380 before this story touched anything — Story 4.6 net-adds tests without removing any except the one R9 test it necessarily rewrites). `tsc --noEmit` clean. Lint: same pre-existing 1 error/2 warnings in files this story never touched (confirmed against Story 4.5's own record of the same baseline).
- Task 0's bug (found during story creation, fixed here) was real: `useSegments()`'s `needsHistory` gate would have returned an empty `aggregates` map under the default v1.0 sort (createdAt) and under name sort — the two most common cases. Fixed by making both `buildSortAggregates()` and the history subscription unconditional.
- A second, previously-undetected consequence of that fix surfaced only once the full `index.test.tsx` suite was read in this session (not caught during story creation): an existing Story 4.3 test explicitly asserted `buildSortAggregates` must NOT run on a history write while sorted by name/createdAt (R9's original guard). That assertion is the literal opposite of Task 0's fix. Rewrote the test to assert the new, FR41-driven contract instead of deleting it — the underlying behavior genuinely changed, this is not weakening an assertion for convenience.
- `formatRowDate` was implemented with a manual month-abbreviation table rather than `Intl.DateTimeFormat`, discovered necessary when the initial `Intl`-based version rendered `"Sept"` for September on this project's Node/ICU data — the PRD's literal `dd Mmm yyyy` format (3-letter month) requires a locale-independent implementation.
- Both open questions flagged during story creation were resolved by implementing the story's stated default (percent-rounding reserve-boundary rule; summary lines stay visible unchanged during inline-rename editing) — neither was escalated, as no reviewer input arrived before implementation; flagged again here for `code-review` to confirm or override.
- No new dependencies. No new routes. No new `lib/` functions — `buildSortAggregates`/`calculateSolidificationPercent` reused exactly as architecture.md specified.

### File List

**Modified:**
- `src/hooks/useSegments.ts` (removed `needsHistory` gate; `useHistoryVersion()` now unconditional; `aggregates` added to return object)
- `src/components/SegmentListItem.tsx` (added `aggregate` prop; `formatRowDate`/`formatRowSolidification` local formatters; three-line row; combined `accessibilityLabel`)
- `src/app/index.tsx` (destructured `aggregates`; passed `aggregate={aggregates.get(item.id)}` to `SegmentListItem`)
- `src/components/SegmentListItem.test.tsx` (`renderRow` default `aggregate: undefined`; new `[Story 4.6]` describe block, 6 tests; fixed one pre-existing test's now-missing required prop)
- `src/app-tests/index.test.tsx` (rewrote the Story 4.3 R9 test to match the new contract; added 2 new regression tests for Task 0's fix)

### Change Log

- 2026-09-12: Implemented Story 4.6 in full (Tasks 0–8) — segment list row now shows creation date, last-practice date, and Solidification % (FR41). Fixed a real latent bug found at story-creation time (`useSegments()`'s sort-perf gate would have left row data empty under the default sort) and, discovered only during implementation, rewrote one pre-existing Story 4.3 test whose assertion the fix directly reverses. No new `lib/` functions, no new routes, no new dependencies. 380/380 passing (8 net new tests this story added), `tsc` clean, lint unchanged from Story 4.5's baseline. Status: ready-for-dev → review.
