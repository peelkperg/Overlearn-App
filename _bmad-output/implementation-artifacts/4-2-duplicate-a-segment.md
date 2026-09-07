# Story 4.2: Duplicate a Segment

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to duplicate an existing segment,
so that I can track a variation of a passage as its own segment without losing the original's history.

## Acceptance Criteria

1. **Given** a segment exists **When** the user selects "Duplicate" from its row menu **Then** a new segment is created immediately with a disambiguated name (e.g. "Bar 24 (2)"), a fresh id, a fresh creation date, and no copied history entries (FR32)
2. **Given** a segment was just duplicated **When** the segment list re-renders **Then** a snackbar confirms "Duplicated as '{name}'", announced via `accessibilityLiveRegion="polite"` (UX-DR21, UX-DR24)

[Source: _bmad-output/planning-artifacts/epics.md#Story-4.2-Duplicate-a-Segment]

## Tasks / Subtasks

- [x] Task 1: Add `duplicateSegment` to `src/lib/segments.ts` (AC: #1)
  - [x] `export function duplicateSegment(id: string): Segment` — look up the source segment via the same `existing.find(...)` pattern `renameSegment` uses (throw `Segment not found: ${id}` if absent, matching Story 4.1's defensive posture); build the copy with `generateId(existing)`, `disambiguate(source.name, existing)` (**no** `excludeId` — the copy is a genuinely new record and *must* collide with its source, exactly like `createSegment`), and `createdAt: new Date().toISOString()`; `setObject` the array with the copy appended; return the new segment.
  - [x] **Do not touch history.** The correct "no copied history" behavior is by omission — never write a `history.{newId}` key. Do **not** call `deleteHistory` on the new id (there is nothing to delete, and calling it would be misleading noise). [Source: architecture.md#Rename-and-Duplicate]
  - [x] Unit tests in `src/lib/segments.test.ts` (new `describe('lib/segments duplicateSegment [Story 4.2]', ...)` block, same `beforeEach(() => storage.clearAll())` as neighbours): copy gets a different id, a disambiguated name, and a `createdAt` distinct from... *(see Dev Notes: `createdAt` equality caveat)*; `readHistory(copy.id)` is empty even when the source has entries; the source segment's own name, id, and history are unchanged; duplicating twice yields "(2)" then "(3)"; throws for an unknown id.

- [x] Task 2: Expose `duplicateSegment` through the hook (AC: #1)
  - [x] `src/hooks/useSegments.ts`: add `duplicateSegment: segments.duplicateSegment` to `useSegments()`'s returned object, alongside `createSegment`/`renameSegment`/`deleteSegment`. Same reasoning as Story 4.1 — screens never import `lib/segments` directly.

- [x] Task 3: Add "Duplicate" to the row menu, between Rename and Delete (AC: #1)
  - [x] `src/components/SegmentListItem.tsx`: add an `onDuplicate: () => void` prop and a `Pressable` menu item (`testID={\`segment-row-duplicate-${segment.id}\`}`, `runAction(onDuplicate)`) positioned **between** the existing Rename and Delete items — this completes UX-DR20's full order: Rename, Duplicate, Delete (destructive last).
  - [x] `src/components/SegmentListItem.test.tsx`: add `onDuplicate: jest.fn()` to the shared `renderRow` helper (single place — all existing tests inherit it). **Extend the existing `'lists Rename above Delete (UX-DR20)'` test** to assert the full three-item order (rename < duplicate < delete by index) and rename it accordingly; add a test that tapping Duplicate calls `onDuplicate` and closes the menu.

- [x] Task 4: Wire Duplicate + the confirmation message on the segment list (AC: #1, #2)
  - [x] `src/app/index.tsx`: add `duplicateSegment` to the `useSegments()` destructure; pass `onDuplicate` to `SegmentListItem`, calling through the existing `runAction(...)` error wrapper (failure copy: `'Could not duplicate that segment.'`, matching the existing terse delete-failure string) and, on success, setting the new notice state below with the copy's actual returned name.
  - [x] `src/app/index.tsx`: add a `notice` state rendered in the **same slot** as the existing `error` row, as a sibling conditional: `testID="segment-list-notice"`, `type="small"`, `accessibilityLiveRegion="polite"`, and **no** `accessibilityRole="alert"` (alert is for errors; this is a success confirmation). Text: `Duplicated as "{name}"`.
  - [x] Auto-dismiss the notice after ~4s using the `useRef` timer + cleanup pattern already established in `src/components/session/useFeedbackSignal.ts:18-19,42,61` (store the timer in a ref, clear the prior timer before setting a new one, clear on unmount). Setting a new notice must reset the timer, not stack timers.
  - [x] `src/app-tests/index.test.tsx` screen-level tests: tapping Duplicate from the row menu adds a second row to the list; the notice renders with the disambiguated name and `accessibilityLiveRegion="polite"`; the notice is absent before any duplicate; the original segment's row is still present. Use fake timers only if asserting auto-dismiss — otherwise keep tests timer-free.

### Review Findings

Code review 2026-09-06 (3 parallel layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Reviewed against a clean 4.2-only diff — Story 4.1 was committed first (`901471b`) so no prior-story content contaminated the scope. Acceptance Auditor found **zero** AC violations.

- [x] [Review][Patch] Documented suffix-nesting behavior has no test — duplicating a copy yields `"Bar 24 (2) (2)"`, which the Dev Notes explicitly declare expected and instruct not to "fix"; nothing locks that in, so a future "improvement" to `disambiguate` would pass CI [src/lib/segments.test.ts] — fixed: added a test locking the nested-suffix result.
- [x] [Review][Patch] The duplicate notice is never cleared by a later action — deleting the just-created copy, or a failing delete, leaves `Duplicated as "X"` on screen for up to 4s (and can render stacked beneath the error row), because `runAction` clears only `error`, never `notice` [src/app/index.tsx:~92] — fixed: `runAction` now clears the notice (and its pending timer) up front, same as `error`; added a regression test.
- [x] [Review][Patch] `showNotice`'s reset-not-stack behavior is asserted in a comment but never exercised — no test duplicates twice within the notice window, so removing the `clearTimeout` would go undetected [src/app/index.tsx:~101] — fixed: added a fake-timers test duplicating twice within the 4s window, asserting the second notice survives past the first's original deadline.
- [x] [Review][Defer] Appending a `" (N)"` suffix can push a name past the 80-char cap that `SegmentForm` enforces on input [src/lib/segments.ts:56] — deferred, pre-existing: `createSegment` reaches the identical `disambiguate` append path, so two same-named 80-char segments already overflow in shipped v1.0; not introduced by this story
- [x] [Review][Defer] `accessibilityLiveRegion="polite"` is an Android-only RN prop and announces nothing under iOS VoiceOver [src/app/index.tsx:~137] — deferred, pre-existing and spec-mandated: UX-DR24 names this exact prop, it is the established pattern across 5 source files since v1.0, and iOS has never been built or verified (see backlog's iOS support entry)
- [x] [Review][Defer] A segment name containing a literal `"` garbles the notice (`Duplicated as "Bar "24" (2)"`) [src/app/index.tsx:~121] — deferred: cosmetic only, and the exact notice string was specified verbatim in this story's Task 4; changing the quoting style is a UX copy decision, not a code fix

## Dev Notes

### Duplicate confirmation UI — resolved, decided with Gerardo before dev start

**The UX spec calls for a "standard design-system snackbar" (UX-DR21), but this stack has no off-the-shelf snackbar in active use.** Verified during story creation: no `react-native-paper`, no toast/snackbar package, no existing `Snackbar`/`Toast` component anywhere in `src/`.

Two real options were compared:

1. **`@expo/ui`'s native `Snackbar`/`SnackbarHost`** (`jetpack-compose` module) — a genuine Material 3 snackbar, already a project dependency, zero new packages. Rejected for two reasons: (a) it exists only under `@expo/ui`'s Android (`jetpack-compose`) folder, no iOS counterpart — an Android-only *component* is a heavier commitment than this Android-only-for-now *project* already carries; (b) it is a native-bridged Compose view, not RN-rendered text, so it cannot literally carry the `accessibilityLiveRegion="polite"` prop UX-DR24 names — Material 3 snackbars are announced via Android's accessibility service by convention, but that is a different, unverified mechanism than the spec's stated requirement.
2. **Reuse the message-row pattern `app/index.tsx` already renders for errors** (`testID="segment-list-error"`, `accessibilityLiveRegion="polite"`) — **chosen.** Satisfies UX-DR24 literally (the exact RN prop, not an assumed platform equivalent), adds no dependency, and is a data-row variant of an existing pattern rather than a new component. Trade-off, accepted: it is a static inline text row, not a floating/animated bar — visually plainer than "snackbar" usually implies.

Also considered and rejected: `ToastAndroid` (no accessibility-live-region hook, and Android-only same as option 1 without its polish or queueing), and a hand-built `Snackbar.tsx` (a genuinely new custom component, contradicting the UX spec's own "no new custom components" line).

**Decision: option 2, the inline message-row notice, exactly as Task 4 specifies below.**

### Architecture compliance

- `architecture.md` specifies the signature exactly: `function duplicateSegment(id: string): Segment   // FR32`, and states it *"reuses `generateId` and `disambiguate` (new id, name run through the same collision logic), sets a fresh `createdAt`, and does not call `deleteHistory`/copy any history key — the duplicate's `history.{newSegmentId}` key simply never gets written, which is the correct 'no copied history' behavior by omission rather than an explicit clear."* Follow this literally. [Source: architecture.md#Rename-and-Duplicate-(FR30,-FR32)]
- **No new screen** for Duplicate — it is an instant row-menu action (confirmed in both `architecture.md` and the UX spec). No route, so **no `STACK_SCREENS` change** and no `stack-screens.test.ts` update (unlike Story 4.1).
- No new MMKV key, no schema change, no new dependency.

### Existing code confirmed by direct inspection (not inferred)

- **`disambiguate(name, existing, excludeId?)`** now takes an optional third parameter (added by Story 4.1). `duplicateSegment` must **omit** it. Passing `excludeId: id` would be a real bug: the copy would not collide with its source and you would get two segments literally named "Bar 24".
- **`generateId(existing)`** already loops until the id is unused — reuse as-is; do not write a new id generator.
- **`SegmentListItem`** already has `onRename` (Story 4.1) placed above `Delete`. Story 4.2 inserts `Duplicate` between them. The component's `runAction(action)` helper closes the menu then invokes the callback — reuse it, don't hand-roll the close.
- **`app/index.tsx`** already has: a `runAction(action, failureMessage)` wrapper with `error` state, the `error` message row, and (from Story 4.1) `activeSegment` via `useSegment`. The notice row goes beside the error row inside the same `SafeAreaView`.
- **`readHistory(id)`** (`src/lib/history.ts`) returns `[]` for a key that was never written — so "no copied history" needs no special-casing to assert.

### Known behavior to preserve, not "fix"

- **Suffix stacking on an already-suffixed name is expected.** Duplicating a segment literally named `"Bar 24 (2)"` produces `"Bar 24 (2) (2)"`, not `"Bar 24 (3)"` — `disambiguate` appends to the whole name and does not parse existing suffixes. This matches `createSegment`'s long-standing behavior (see the existing `'skips a suffix the user already typed'` test, which covers the *base*-name case only). Do not "improve" `disambiguate` to parse trailing counters; that would change shipped v1.0 creation behavior and is outside this story.
- **`createdAt` may be string-equal to the source's** if both are created within the same millisecond in a fast test. Assert the *id* differs and that `createdAt` is a valid ISO string — do **not** write a test asserting `copy.createdAt !== source.createdAt`, which would be flaky. (`generateId` already guards id collisions explicitly for this same same-millisecond reason.)
- **Duplicating does not touch `session.active`.** The copy is a brand-new segment with no session; the source's in-progress session, if any, is unaffected. No `useActiveSession` interaction in this story.

### Testing standards ([Source: project-context.md])

- Co-located `*.test.ts(x)` beside the module, **except** anything rendering a `src/app/` screen, which goes in `src/app-tests/` (a stray test file under `src/app/` is registered as a phantom route by Expo Router).
- `@testing-library/react-native` v14: `render()` and `act()` are **async** — always `await` them. A missing `await` fails silently with stale output rather than throwing.
- `storage.clearAll()` runs globally in `jest.setup.js`'s `beforeEach`; no per-file storage reset needed, but import `storage` via the exact `@/lib/storage` specifier if you need direct access.
- Baseline before starting: **187/187 tests passing**, `npx tsc --noEmit` clean, `npx expo lint` reporting exactly 2 pre-existing issues (1 error in `use-color-scheme.web.ts`, 1 `exhaustive-deps` warning at `session/[id].tsx:106`). Anything beyond those two is yours.

### Previous story intelligence (Story 4.1 — Rename a Segment, status `done`)

- **Pattern to copy directly:** `renameSegment` in `src/lib/segments.ts` is the closest sibling to what Task 1 needs — same lookup, same `disambiguate` reuse, same `setObject` write, same return-the-record contract. Read it first.
- **The row-menu prop pattern is established:** `onRename` was added exactly the way `onDuplicate` should be. Copy that diff's shape.
- **Code review caught a mislabeled test name** ("no-op" title on a `.toThrow()` assertion). Name tests after what they actually assert.
- **Code review caught a Dev-Notes claim that no test backed.** If these notes say something is tested, make sure it is — an honest "not covered" beats a false claim.
- **`architecture.md`'s `renameSegment` signature was stale** (`: void` vs the shipped `: Segment`) and was corrected as a review patch. `duplicateSegment`'s documented signature (`: Segment`) already matches what Task 1 specifies — no doc drift expected this time, but re-check the doc if you deviate.
- Story 4.1's full record, including its Review Findings section: `_bmad-output/implementation-artifacts/4-1-rename-a-segment.md`.

### Git intelligence

Last 5 commits are all v1.1 *planning* work (`Generate v1.1 stories`, `Design v1.1 epics`, `Extract v1.1 requirements`, …) — **no v1.1 implementation has been committed yet**. Story 4.1's implementation is complete and reviewed but still uncommitted in the working tree, so `git status` will show its files alongside yours. Do not revert or "clean up" anything under `src/lib/segments.ts`, `src/components/SegmentListItem.tsx`, `src/app/index.tsx`, `src/app/segment/[id]/rename.tsx`, or the v1.1 test files — that is Story 4.1's delivered work, not stray edits.

### Project Structure Notes

- **New files:** none. Every change is an edit to an existing file.
- **Modified:** `src/lib/segments.ts`, `src/lib/segments.test.ts`, `src/hooks/useSegments.ts`, `src/components/SegmentListItem.tsx`, `src/components/SegmentListItem.test.tsx`, `src/app/index.tsx`, `src/app-tests/index.test.tsx`.
- No new dependencies, no new components (see the open question above), no new routes, no new MMKV keys.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.2-Duplicate-a-Segment] — story statement and both ACs (verbatim above)
- [Source: _bmad-output/planning-artifacts/architecture.md#Rename-and-Duplicate-(FR30,-FR32)] (~lines 621-633) — `duplicateSegment` signature and the "no copied history by omission" decision
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Row-Action-Menu-Additions] (~lines 566-578) — Rename/Duplicate/Delete order, and the snackbar-confirmation rationale ("a copy can sort off-screen, so silent insertion would read as a no-op")
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component-Strategy-Additions] (~lines 622-634) — the "no new custom components" claim that conflicts with "Default snackbar"; see the open question above
- [Source: _bmad-output/planning-artifacts/prd.md] — FR32
- [Source: _bmad-output/test-artifacts/test-design-epic-4-5.md] — C24 (P0: duplicate unit behavior) and C25 (P2: snackbar + live region) are this story's planned scenarios; no risk in R7-R13 is specific to duplicate
- [Source: _bmad-output/test-artifacts/uat-scripts.md] — UAT-34 (Duplicate a segment), currently unchecked, pending this story's build
- [Source: _bmad-output/project-context.md] — MMKV single-point-of-contact rule, co-located vs. `app-tests/` rule, RNTL v14 async-API rule

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

None — both ACs implemented on first pass per-task; the only transient failure was the expected mid-story `tsc` gap between Task 3 (added `onDuplicate` as a required prop) and Task 4 (wired it in `index.tsx`), resolved by proceeding directly to Task 4.

### Completion Notes List

- Both ACs implemented and covered by tests; full suite 198/198 passing (187 pre-story + 11 new), `tsc --noEmit` clean, `expo lint` shows the same 2 pre-existing issues as before this story (unchanged from Story 4.1's baseline).
- Code review's 3 patch findings applied 2026-09-07: `runAction` now clears the duplicate notice (and its timer) up front, matching `error`; added 3 regression tests (nested-suffix lock, notice-cleared-by-later-action, timer-reset-not-stacked). Full suite 201/201 passing (198 + 3 new), `tsc --noEmit` clean, `expo lint` unchanged (same 2 pre-existing issues).
- Resolved the Dev Notes' "snackbar" open question with Gerardo before implementation: `@expo/ui`'s native `Snackbar`/`SnackbarHost` was investigated (real, zero-dependency option) and rejected — Android-only within an already-Android-only-in-practice project is acceptable, but its accessibility mechanism doesn't map to the RN `accessibilityLiveRegion` prop UX-DR24 literally requires. Implemented as the inline message-row notice specified in the story, reusing `app/index.tsx`'s existing error-row pattern with an auto-dismiss timer.
- `disambiguate`'s no-`excludeId` call for duplication verified explicitly by test — a duplicate collides with its own source (`'Bar 24 arpeggio' → 'Bar 24 arpeggio (2)'`), unlike rename's self-exclusion from Story 4.1. Confirmed these are genuinely different collision rules, not an inconsistency.
- No new files — every change is an edit to a file Story 4.1 also touched or created.

### File List

**Modified:**
- `src/lib/segments.ts`
- `src/lib/segments.test.ts`
- `src/hooks/useSegments.ts`
- `src/components/SegmentListItem.tsx`
- `src/components/SegmentListItem.test.tsx`
- `src/app/index.tsx`
- `src/app-tests/index.test.tsx`

### Change Log

- 2026-09-06: Implemented Story 4.2 in full (Tasks 1–4) — `duplicateSegment`, row-menu Duplicate entry (between Rename and Delete), and the auto-dismissing confirmation notice resolving the snackbar open question per Gerardo's decision. Status: ready-for-dev → review.
