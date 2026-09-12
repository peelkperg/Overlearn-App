# Story 4.6: View Segment List Row Summary Data

Status: ready-for-dev

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

- [ ] Task 0: Fix a real bug AC #3 exposes — `useSegments()`'s aggregates are conditionally computed, but FR41 needs them unconditionally (AC #1, #2, #3)
  - [ ] In `src/hooks/useSegments.ts`, `needsHistory` is currently `sortKey === 'lastPracticed' || sortKey === 'solidification'` — a Story 4.3 perf gate that skips `buildSortAggregates()`/the history subscription entirely when sorted by name or creation date. **This gate must NOT be reused as-is for the returned `aggregates` map**: if it is, sorting by "Name" would return an empty `Map`, and every row would silently show "Last practice: — · —" even for segments with real history — a display bug, not a missing feature.
  - [ ] Fix: compute `aggregates` unconditionally (drop the `needsHistory` ternary around `buildSortAggregates(rawSegments)` — call it every render) and subscribe to `useHistoryVersion(true)` unconditionally too (the list must re-render on any history write regardless of active sort key, so FR41's row data stays live — not just when sorted by last-practiced/Solidification %, as Story 4.3 only needed).
  - [ ] This is a deliberate reversal of Story 4.3's code-review perf optimization ([Review][Patch] 2026-09-08, cited in `useSegments.ts`'s own comment) — that fix was correct for its own problem (avoid O(n) history reads when the sort doesn't consult them) but FR41 makes the row's own data always consult history, so the condition that made the gate correct no longer holds. Update or remove the comment block above `needsHistory`/`useHistoryVersion` so it does not keep citing a now-superseded rationale as if still current — leave a note explaining *why* it changed, not just delete the old comment.
  - [ ] Confirm no other caller of `useSegments()` (there is exactly one: `app/index.tsx`) depended on the old conditional behavior — it did not; `index.tsx` never previously read `aggregates` at all (it did not exist on the return object until this story).

- [ ] Task 1: Expose `aggregates` from `useSegments()` (AC #3)
  - [ ] Add `aggregates` to `useSegments()`'s return object: the same `Map<string, segments.SortAggregate>` already computed by Task 0's fix — `return { segments: sorted, aggregates, sortKey, sortDirection, setSortOption, createSegment, renameSegment, duplicateSegment, deleteSegment }`. `SortAggregate` is already exported from `lib/segments.ts` (`export type SortAggregate = { lastPracticed: string | null; solidification: number | null }`) — import it in `useSegments.ts` if not already accessible, or re-export.

- [ ] Task 2: Write two new display-layer formatters (AC #1, #2) — neither exists yet, do not reuse Story 4.4's formatter, see Dev Notes
  - [ ] `formatLastPracticeDate(iso: string | null): string` — `null` → `"—"`. Otherwise format as `dd Mmm yyyy` (e.g. `"10 Sep 2026"`), using a fixed-locale, manual format (`Intl.DateTimeFormat` with explicit `day: '2-digit', month: 'short', year: 'numeric'` and a fixed locale such as `'en-GB'`, NOT `date.toLocaleDateString()` with no locale argument — that call in `HistoryEntryRow.tsx` is locale-dependent by design for history entries, but FR41's PRD/UX text pins an exact literal format, so the row must not vary by device locale).
  - [ ] `formatSolidificationOneDecimal(pct: number | null): string` — `null` → `"—"`. Otherwise **one decimal place**, e.g. `"42.3%"` — genuinely different from Story 4.4's `formatSolidification()` in `segment/[id].tsx`, which rounds to a whole number. Do not call that function or copy its exact clamp bounds; see Dev Notes' "Open question" for the exact edge-case rule to implement (apply the FR38-equivalent reserve-exact-boundary principle, scaled to one decimal: only `"100.0%"` when the true value is exactly 100, only `"0.0%"` when exactly 0, otherwise clamp the *displayed* value to `[0.1, 99.9]` — i.e. `pct >= 100 ? '100.0%' : pct <= 0 ? '0.0%' : \`${Math.min(99.9, Math.max(0.1, Math.round(pct * 10) / 10)).toFixed(1)}%\``). Flagged for confirmation — see end of this story.
  - [ ] Place both in `src/components/SegmentListItem.tsx` as local (non-exported) functions, same convention as `segment/[id].tsx`'s local `formatSolidification` — this is row-display formatting, not a shared `lib/` concern (no second call site exists yet).

- [ ] Task 3: Restructure `SegmentListItem`'s row to three lines (AC #1, #2, #4)
  - [ ] Add a new prop: `aggregate: SortAggregate | undefined` to `SegmentListItemProps` (import `SortAggregate` type from `@/lib/segments`). `undefined` is a real, valid case (index.tsx's `aggregates.get(segment.id)` misses when a segment is somehow absent from the map) — must render identically to "no history," never crash or show `undefined`/`NaN`.
  - [ ] In the **non-editing** branch of the row's `Pressable` child (currently a single `<ThemedText numberOfLines={1}>{segment.name}</ThemedText>`), replace with three stacked lines:
    ```tsx
    <View>
      <ThemedText numberOfLines={1}>{segment.name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {`Last practice: ${formatLastPracticeDate(aggregate?.lastPracticed ?? null)} · ${formatSolidificationOneDecimal(aggregate?.solidification ?? null)}`}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {`Created ${formatLastPracticeDate(segment.createdAt)}`}
      </ThemedText>
    </View>
    ```
    Reuses `formatLastPracticeDate` for the creation-date line too (same `dd Mmm yyyy` format, always populated — every segment has `createdAt` from FR1, never em-dash for this line).
  - [ ] The **editing** branch (inline-rename `TextInput`, Story 4.5) is unchanged in structure — do not add the summary lines inside it. Leave them rendered as-is: **decision needed** — see Dev Notes' "Open question" on whether the two summary lines stay visible below the `TextInput` during inline-rename editing, or are hidden while editing. Default to leaving them visible and unchanged (simplest, no interaction with Story 4.5's layout-preserving TextInput sizing) unless review says otherwise.
  - [ ] `styles.rowLabel` currently has `justifyContent: 'center'` sized for one line at `minHeight: 44`. With three lines the content now exceeds 44pt naturally — remove or adjust `justifyContent: 'center'` if it causes uneven vertical spacing with the taller content (verify visually/in snapshot; `minHeight: 44` itself stays, it is now a floor, not the row's actual height).
  - [ ] `styles.row` (the outer `ThemedView`, `flexDirection: 'row', alignItems: 'center'`) keeps `alignItems: 'center'` — this vertically centers the now-taller `rowLabel` column against the `menuButton` column at `minHeight: 44`, which reads correctly (menu button roughly mid-height of the three-line block) without needing `flex-start`.

- [ ] Task 4: Accessibility — one combined row label (AC #4)
  - [ ] Add `accessibilityLabel` to the row's outer `Pressable` (the one currently carrying `accessibilityHint`), combining all four values in order: `` `${segment.name}, last practice ${formatLastPracticeDate(...) === '—' ? 'never' : formatLastPracticeDate(...)}, solidification ${formatSolidificationOneDecimal(...) === '—' ? 'no data' : formatSolidificationOneDecimal(...)}, created ${formatLastPracticeDate(segment.createdAt)}` ``. Only set this when `!isEditing` (mirrors the existing conditional `accessibilityHint`/`accessibilityRole` pattern already on this Pressable) — while editing, the field's own `accessibilityLabel="Segment name"` (Story 4.5) is what should be read, not the whole row.
  - [ ] Do **not** add separate `accessibilityLabel`s to the two new `ThemedText` summary lines — per AC #4 they must not be individually focusable; a screen reader should reach one combined label for the row, not stop three times. Plain `ThemedText` has no accessibility role by default, so no extra prop is needed to suppress focus — just don't add one.

- [ ] Task 5: Thread `aggregate` through `app/index.tsx` (AC #1, #2, #3)
  - [ ] Destructure `aggregates` from `useSegments()` in `HomeScreen` alongside the existing destructured fields.
  - [ ] Pass `aggregate={aggregates.get(item.id)}` to `<SegmentListItem>` in the `FlatList`'s `renderItem`.

- [ ] Task 6: Tests for Task 0's fix (AC #3) — **no `src/hooks/useSegments.test.ts` exists**; confirmed by direct search (`src/hooks/` has no `.test.ts` files at all). Story 4.3's sort coverage lives at the integration level in `src/app-tests/index.test.tsx`. Follow that existing precedent — do not create a new hook-level unit test file for this alone.
  - [ ] In `src/app-tests/index.test.tsx`, add a test asserting a segment's Solidification %/last-practice date render correctly **when the list is sorted by `'name'`** (the v1.0 default sort) — this is the regression test for Task 0's bug: it must fail against the old `needsHistory`-gated code (empty aggregates when not sorted by lastPracticed/solidification) and pass after the fix. This subsumes Task 8 below — implement both in the same describe block, don't duplicate setup.
  - [ ] Add a test that the row's summary data updates live when a history entry is written while sorted by `'name'` — same regression shape, for the `useHistoryVersion(true)` unconditional-subscription half of Task 0's fix.

- [ ] Task 7: Tests in `src/components/SegmentListItem.test.tsx` (AC #1, #2, #4)
  - [ ] Update the `renderRow` helper's default props to include `aggregate: { lastPracticed: '2026-09-10T12:00:00.000Z', solidification: 42.3 }` (or per-test override), matching the existing `segment`/`onInlineRename` default pattern.
  - [ ] **AC #1 — populated row:** render with a segment that has aggregate data → assert the row shows text matching `"Last practice: 10 Sep 2026 · 42.3%"` and `"Created 31 Aug 2026"` (using the existing fixture `segment.createdAt: '2026-08-31T12:00:00.000Z'`).
  - [ ] **AC #2 — empty state:** render with `aggregate: { lastPracticed: null, solidification: null }` and also with `aggregate: undefined` (both must produce the same output) → assert `"Last practice: — · —"`, never `"0.0%"` anywhere in the row.
  - [ ] **AC #4 — combined accessibility label:** assert the row `Pressable`'s `accessibilityLabel` prop is a single string containing the name, last-practice date, Solidification %, and creation date, in that order; assert the two new `ThemedText` summary lines do NOT carry their own `accessibilityLabel`.
  - [ ] Regression: re-run the existing AC #5-style test (tap still opens) and the Story 4.5 long-press/edit tests — the three-line restructure must not change `onPress`/`onLongPress` behavior, only the static-branch content.

- [ ] Task 8: merged into Task 6 above — kept as a numbered placeholder only so this story's task numbering matches its Dev Notes/Project Structure Notes references; no separate work here.

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

### Debug Log References

### Completion Notes List

Ultimate context engine analysis completed - comprehensive developer guide created. Found and specified a fix for a real latent bug (Task 0: `useSegments()`'s `needsHistory` gate would silently return an empty `aggregates` map for two of four sort keys) before any code was written.

### File List
