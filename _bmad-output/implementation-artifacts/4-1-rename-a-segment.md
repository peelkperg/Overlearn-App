# Story 4.1: Rename a Segment

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to rename an existing segment,
so that its name stays accurate as what I'm practicing changes.

## Acceptance Criteria

1. **Given** a segment's row menu **When** the user opens it **Then** it lists Rename and Duplicate above Delete, in that order (UX-DR20). *(This story implements Rename only; Duplicate's menu row is Story 4.2's addition — see Dev Notes.)*
2. **Given** the user opens a segment's row-menu action "Rename" **When** the Rename screen opens **Then** it shows `SegmentForm` pre-filled with the segment's current name and submit label "Rename" (FR30, UX-DR22)
3. **Given** the Rename screen, with the name changed to a value not used by any other segment **When** the user submits **Then** the segment's name is updated in storage and the user returns to the segment list showing the new name (FR30)
4. **Given** the Rename screen, with the name changed to a value colliding with another segment's name (case-insensitive) **When** the user submits **Then** the new name is disambiguated exactly as segment creation already does (e.g. "Bar 24 (2)"), never rejected (FR30, same rule as FR1)
5. **Given** the Rename screen, with the name changed to a different case of its own current name (e.g. "bar 24" → "Bar 24") **When** the user submits **Then** the rename succeeds — the segment's own current name is excluded from the collision check (FR30)
6. **Given** a segment has been renamed **When** its name is displayed anywhere in the app — the segment list row, the segment detail heading, the active-session streak readout, the completion summary, and the resume/discard prompt for an interrupted session on that segment **Then** every one of those five sites shows the current name, not the name as it was when a history entry or session was first recorded (FR31)

[Source: _bmad-output/planning-artifacts/epics.md#Story-4.1-Rename-a-Segment]

## Tasks / Subtasks

- [x] Task 1: Add `renameSegment` to `src/lib/segments.ts` (AC: #3, #4, #5)
  - [x] Refactor `disambiguate(name, existing)` → `disambiguate(name, existing, excludeId?)`: filter `existing` by `segment.id !== excludeId` before building the `taken` set. `createSegment` keeps calling it with no `excludeId` (its `existing` never contains the not-yet-created segment, so behavior is unchanged).
  - [x] `export function renameSegment(id: string, name: string): Segment`: normalize via `normalizeSegmentName`, throw on empty (mirror `createSegment`'s guard), look up the target segment via `getSegment(id)` (throw if not found — defensive, mirrors the rest of this module), disambiguate against all *other* segments (`excludeId: id`), `setObject` the updated array, return the updated segment.
  - [x] Unit tests in `src/lib/segments.test.ts` (new `describe('lib/segments renameSegment [Story 4.1]', ...)` block, same `beforeEach(() => storage.clearAll())` pattern as the existing blocks): valid rename persists; empty name throws and leaves storage unchanged; rename to another segment's name (same case) disambiguates; rename to another segment's name (different case) still disambiguates; rename to own current name in a different case succeeds unchanged (the self-exclusion case — this is the one `architecture.md` calls out as easy to under-fix, and `test-design-epic-4-5.md`'s R7).

- [x] Task 2: Add "Rename" to `SegmentListItem`'s row menu (AC: #1, #2)
  - [x] `src/components/SegmentListItem.tsx`: add an `onRename: () => void` prop; add a `Pressable` menu item (`testID={\`segment-row-rename-${segment.id}\`}`, `runAction(onRename)`) positioned **above** the existing Delete item — Duplicate is not part of this story; when Story 4.2 adds it, it goes between Rename and Delete per UX-DR20's order.
  - [x] `src/app/index.tsx`: pass `onRename={() => router.push(\`/segment/${item.id}/rename\`)}` alongside the existing `onOpen`/`onDelete` props.
  - [x] Update `src/components/SegmentListItem.test.tsx`: existing tests construct this component's props directly — add `onRename: jest.fn()` to every existing render call (required prop, no default), plus a new test asserting the menu lists Rename before Delete and that tapping it calls `onRename` and closes the menu.

- [x] Task 3: Create the Rename screen (AC: #2, #3, #4, #5)
  - [x] `src/app/segment/[id]/rename.tsx` — model directly on `src/app/segment/new.tsx` (same `ThemedView`/`SafeAreaView`/error-state/remount-on-failure structure): `useRouteId(useLocalSearchParams())` + `useSegment(id)` to find the segment (render "Segment not found" if absent, same as `segment/[id].tsx`), `<SegmentForm submitLabel="Rename" initialName={segment.name} onSubmit={...} key={attempt} />`, `onSubmit` calls `renameSegment(id, name)` then `router.replace('/')` inside the same try/catch-with-retry pattern `segment/new.tsx` uses (error copy: "Could not rename that segment. Check that the device has free storage.").
  - [x] `src/hooks/useSegments.ts`: export `renameSegment` from `lib/segments` through `useSegments()`'s returned object (alongside `createSegment`/`deleteSegment`), so the new screen doesn't import `lib/segments` directly — matches this hook's existing role as the sole UI-facing entry point to segment mutations.
  - [x] Screen-level test `src/app-tests/segment-rename.test.tsx` (new file, in `app-tests/` per this project's rule that route-adjacent tests never live inside `src/app/`): renders pre-filled with current name; submits a new name and asserts navigation + storage update; submits a colliding name and asserts the disambiguated name is what's stored (not an error); "Segment not found" path for a bad id.

- [x] Task 4: Register the new route (regression guard — architecture.md's route-registration rule)
  - [x] Add `'segment/[id]/rename'` to `STACK_SCREENS` in `src/app/stack-screens.ts`. `_layout.tsx` needs no separate edit — it maps `STACK_SCREENS` to `<Stack.Screen>` entries dynamically (`{STACK_SCREENS.map((name) => <Stack.Screen key={name} name={name} />)}`), so adding the array entry is sufficient.
  - [x] Update `src/app-tests/stack-screens.test.ts`: add `'segment/[id]/rename'` to the `navigatedRoutes` array (with a comment noting the call site: `index.tsx`'s row-menu Rename action) — this test explicitly asserts `STACK_SCREENS` has **no extra entries** beyond `navigatedRoutes` (`toHaveLength(navigatedRoutes.length)`), so skipping this update fails the test, not just leaves it incomplete.

- [x] Task 5: Fix FR31 propagation — the 3 sites currently reading a frozen snapshot (AC: #6)
  - [x] `src/app/session/[id].tsx`: change `<StreakReadout ... segmentName={session.segmentName} />` to `segmentName={segment.name}` — `segment` is already in scope via the existing `useSegment(id)` call at the top of this component (line ~31). No new hook call needed.
  - [x] `src/components/session/CompletionScreen.tsx`: add a `segmentName: string` prop; replace the internal `{session.segmentName}` reference with `{segmentName}`. Remove nothing else from `SessionState` usage in this component.
  - [x] `src/app/session/[id].tsx`: update the `<CompletionScreen session={session} finalTarget={targetStreak} onDone={handleDone} onRepeat={handleRepeat} />` call to add `segmentName={segment.name}`.
  - [x] `src/app/index.tsx`: import `useSegment` from `@/hooks/useSegments` (already imports `useSegments` from the same module); add `const activeSegment = useSegment(session?.segmentId);` and change `<ResumeDiscardDialog ... segmentName={session.segmentName} />` to `segmentName={activeSegment?.name ?? session.segmentName}` — the `?? session.segmentName` fallback matches architecture.md's stated design (`SessionState.segmentName` stays in the schema as a defensive fallback for the currently-unreachable case where the live lookup fails; only the *preferred* source changes).
  - [x] `ResumeDiscardDialog.tsx` and `StreakReadout.tsx` need **no changes** — both already take `segmentName` as a plain prop; only their callers' data source changes.
  - [x] `CompletionScreen` has no dedicated test file today (confirmed — it's only exercised indirectly via `src/app-tests/session.test.tsx`'s `completion-stats` assertion, which will need its render call updated with the new `segmentName` prop). Add the new propagation coverage as cases within `src/app-tests/session.test.tsx` and `src/app-tests/home-session-interaction.test.tsx`, not a new component-test file: rename a segment (via `renameSegment()`) while its session/prompt is already rendered, then assert the streak readout / completion summary / resume-discard prompt each show the updated name. This is the direct regression guard for `test-design-epic-4-5.md`'s R8 (the one HIGH risk in the v1.1 test design) and maps to UAT-32.

### Review Findings

Code review 2026-09-06 (3 parallel layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor).

- [x] [Review][Patch] Test name contradicts its own assertion — "is a no-op target for an id that does not exist" asserts `.toThrow()`, which is the opposite of a no-op [src/lib/segments.test.ts:~555] — **fixed:** renamed to "throws for an id that does not exist"
- [x] [Review][Patch] C23 regression test claimed in Dev Notes does not exist — Dev Notes state the already-live sites (list row, detail heading) are "covered by a regression-guard test only", but no such test exists in the diff or `src/app-tests/`; `test-design-epic-4-5.md`'s C23 is untested [src/app-tests/] — **fixed:** added "reflects a rename in the list row (FR31)" to `index.test.tsx` and "reflects a rename in the detail heading (FR31)" to `segment-detail.test.tsx`
- [x] [Review][Patch] `architecture.md` states `renameSegment(...): void` but the shipped implementation returns `Segment` — spec/code divergence, architecture doc is now stale (CLAUDE.md §13.4 requires same-or-next-commit correction) [_bmad-output/planning-artifacts/architecture.md:626] — **fixed:** signature corrected to `: Segment` with a dated note explaining the change
- [x] [Review][Defer] Generic `catch` in the Rename screen reports every failure as "Check that the device has free storage", including `renameSegment`'s empty-name and segment-not-found throws [src/app/segment/[id]/rename.tsx:~28] — deferred, pre-existing pattern: `segment/new.tsx` has the identical generic catch, and both non-storage throw paths are unreachable in practice (SegmentForm validates non-empty before calling `onSubmit`; a single-user offline app cannot delete the segment while its Rename screen is on top of the stack)

## Dev Notes

**Architecture compliance:** This story implements exactly what `architecture.md`'s "Rename Propagation (FR31)" section (lines 587–600) already decided — no schema change to `SessionState`/`HistoryEntry`, no new storage boundary. `SessionState.segmentName` is **not removed**; it stays as a defensive fallback, only display code stops preferring it. Do not "clean up" the type by deleting the field.

**Existing code confirmed by direct inspection this session (not inferred):**
- `disambiguate()` in `lib/segments.ts` has no `excludeId` parameter today — it's called only from `createSegment`, where the new segment is never in `existing` yet, so no collision-with-self case can currently occur. Renaming is the first caller that needs exclusion.
- `SegmentForm` (`src/components/SegmentForm.tsx`) needs **zero changes** — it's already fully generic (`submitLabel`, `onSubmit`, `initialName` props), exactly as `ux-design-specification.md` states ("Reuses `SegmentForm` unchanged").
- `segment/[id].tsx` (detail heading) already reads live `segment.name` — no change needed there for this story; it's covered by a regression-guard test only (no new behavior).
- `useSegment(id)` already exists (`src/hooks/useSegments.ts`, built for Story 1.4) — reused as-is for both the new Rename screen and the FR31 fixes; no new hook needed.

**Anti-pattern to avoid:** do not add a new `useRenameSegment` hook or a new storage function beyond `renameSegment` itself — this project's `lib/` modules are the sole point of contact with their data, and `useSegments()` is the sole UI-facing entry point per `project-context.md`'s "Single point of contact for MMKV" rule. Route the new screen through `useSegments()`, not a new hook.

**Testing standards (project-context.md):** co-located `*.test.ts(x)` next to the module, except this story's one screen-level test, which goes in `src/app-tests/` (never inside `src/app/` — a stray `*.test.tsx` there is registered as a phantom route by Expo Router). `@testing-library/react-native` v14: `render()`/`act()` are `async` — always `await` them. No new test-data factories or mocks needed; `storage.clearAll()` in `beforeEach` and the shared MMKV mock are already global (`jest.setup.js`).

**Scope boundary:** Story 4.2 (Duplicate) touches the same row menu and will insert its own item between Rename and Delete — don't reserve a gap or placeholder for it here; UX-DR20's stated order is the only constraint, and Story 4.2 owns its own diff.

### Project Structure Notes

- New files: `src/app/segment/[id]/rename.tsx`, `src/app-tests/segment-rename.test.tsx`.
- Modified files: `src/lib/segments.ts`, `src/lib/segments.test.ts`, `src/hooks/useSegments.ts`, `src/components/SegmentListItem.tsx`, `src/components/SegmentListItem.test.tsx`, `src/app/index.tsx`, `src/app/session/[id].tsx`, `src/components/session/CompletionScreen.tsx`, `src/app/stack-screens.ts`, `src/app-tests/stack-screens.test.ts`.
- No new dependencies, no new MMKV keys, no new components (per `ux-design-specification.md`'s Component Strategy Additions — this story's slice of it is "Rename form: existing `SegmentForm`" and "Rename/Duplicate menu rows: existing menu-item pattern").
- File-based routing: `src/app/segment/[id]/rename.tsx` resolves to route `/segment/:id/rename`; `useRouteId(useLocalSearchParams())` continues to read the `id` param exactly as `segment/[id].tsx` and `session/[id].tsx` already do — no new param-handling logic.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.1-Rename-a-Segment] — story statement and ACs (verbatim above)
- [Source: _bmad-output/planning-artifacts/architecture.md#Rename-Propagation-(FR31)] (lines 587–600) — the v1.0→v1.1 source table per display site; decision to keep `SessionState.segmentName` as unused fallback
- [Source: _bmad-output/planning-artifacts/architecture.md] (line 678) — `disambiguate`'s self-exclusion fix called out as a required, testable change
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Segment-Rename-Screen] (lines 580–589) — `SegmentForm` reuse, submit label, propagation note
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Row-Action-Menu-Additions] (lines 566–578) — Rename/Duplicate/Delete order
- [Source: _bmad-output/planning-artifacts/prd.md] (FR30 line 308, FR31 line 309) — functional requirement text
- [Source: _bmad-output/test-artifacts/test-design-epic-4-5.md] — R7 (disambiguation self-exclusion), R8 (FR31 propagation, the one HIGH risk), C20–C23 (this story's planned test scenarios)
- [Source: _bmad-output/test-artifacts/uat-scripts.md] — UAT-32 (rename + propagation), UAT-33 (collision/self-rename), both currently unchecked pending this story's build
- [Source: _bmad-output/project-context.md] — MMKV single-point-of-contact rule, co-located test rule, `@testing-library/react-native` v14 async-API rule

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

None — no failures required investigation beyond the expected RED phase of each task's TDD cycle (all 3 new lint/test discrepancies traced to root cause on first pass: 2 `toHaveTextContent`/`getByText` test-authoring fixes, one `mockCurrentId` Jest hoisting-scope naming fix).

### Completion Notes List

- All 6 ACs implemented and covered by tests; full suite 185/185 passing (166 v1.0 + 19 new), `tsc --noEmit` clean, `expo lint` shows the same 2 pre-existing issues (1 error in `use-color-scheme.web.ts`, 1 warning in `session/[id].tsx:106`) as before this story's changes — confirmed via `git stash` diff, not introduced by this work.
- `disambiguate()` self-exclusion (R7 in `test-design-epic-4-5.md`) verified with the specific 3-case matrix the risk called out: own-name/different-case, other-segment/same-case, other-segment/different-case.
- FR31 propagation (R8, the one HIGH risk in the v1.1 test design) verified end-to-end: renaming a segment via `renameSegment()` while its active-session streak readout, completion summary, or resume/discard prompt is already rendered now updates all three live, without remount. Maps to UAT-32 (still to be run manually on-device per its own unchecked status).
- Scope discipline: `Duplicate` (Story 4.2) was deliberately not added to the row menu — only `Rename` was inserted above `Delete`, per the story's own scope-boundary note.

### File List

**New:**
- `src/app/segment/[id]/rename.tsx`
- `src/app-tests/segment-rename.test.tsx`

**Modified:**
- `src/lib/segments.ts`
- `src/lib/segments.test.ts`
- `src/hooks/useSegments.ts`
- `src/components/SegmentListItem.tsx`
- `src/components/SegmentListItem.test.tsx`
- `src/app/index.tsx`
- `src/app/session/[id].tsx`
- `src/components/session/CompletionScreen.tsx`
- `src/app/stack-screens.ts`
- `src/app-tests/stack-screens.test.ts`
- `src/app-tests/session.test.tsx`
- `src/app-tests/home-session-interaction.test.tsx`
- `src/app-tests/index.test.tsx` *(code-review patch: C23 list-row regression guard)*
- `src/app-tests/segment-detail.test.tsx` *(code-review patch: C23 detail-heading regression guard)*
- `_bmad-output/planning-artifacts/architecture.md` *(code-review patch: `renameSegment` signature sync)*

### Change Log

- 2026-09-06: Code review (3 parallel layers) — 3 patches applied (test name corrected, C23 regression guards added for list row + detail heading, `architecture.md`'s `renameSegment` signature synced to shipped behavior), 1 item deferred to `deferred-work.md`, 4 findings dismissed as false positives after verification. Suite 187/187, typecheck clean, no new lint issues. Status: review → done.
- 2026-09-06: Implemented Story 4.1 in full (Tasks 1–5) — `renameSegment` + `disambiguate` self-exclusion fix, row-menu Rename entry, dedicated Rename screen, route registration, and FR31's 3-site live-lookup propagation fix (streak readout, completion summary, resume/discard prompt). Status: ready-for-dev → review.
