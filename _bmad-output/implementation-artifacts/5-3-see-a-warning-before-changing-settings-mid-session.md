# Story 5.3: See a Warning Before Changing Settings Mid-Session

Status: done

<!-- Note: Validate with validate-create-story before dev-story if desired. -->

## Story

As a user,
I want to know when changing this setting will affect a session I'm already running,
so that I'm not surprised by a target that moved without my noticing.

## Acceptance Criteria

1. **Given** an in-progress session exists for any segment **When** the user opens the Settings screen **Then** a standing notice appears above the stepper: "You have a session in progress for '{segment name}.' Changing this target updates it immediately — and may complete the session.", using `accessibilityLiveRegion="polite"` (FR39, UX-DR17, UX-DR24)
2. **Given** the notice is showing **When** the user taps `+`/`−` any number of times **Then** the same single notice remains visible throughout — no per-tap confirmation dialog appears (FR39)
3. **Given** no session is in progress **When** the user opens the Settings screen **Then** the notice is not rendered at all (FR39)

[Source: _bmad-output/planning-artifacts/epics.md#Story-5.3-See-a-Warning-Before-Changing-Settings-Mid-Session] — AC #1's copy was amended 2026-09-11 (code review of Story 5.2): the original wording described only a recalculation, not the completion Story 5.2's Task 3 reconciliation effect can also trigger from a single tap with no confirmation gate. Implement the copy exactly as given above, not the older wording still in `ux-design-specification.md` (see Task 3 below).

## Tasks / Subtasks

- [x] Task 1: Render the standing in-progress-session notice (AC #1, #3)
  - [x] In `src/app/settings.tsx`, call `useActiveSession()` to get `session`, and `useSegment(session?.segmentId)` (from `@/hooks/useSegments`) to get the segment's **current** name.
    - **Do not use `session.segmentName`** for the notice copy — architecture.md's FR39 decision (line ~590) is explicit that the name must be sourced live via `useSegment`, consistent with the Rename Propagation decision (FR31): a session's `segmentName` field can go stale if the segment is renamed after the session started, and the notice must reflect the current name like every other display site FR31 lists.
    - Guard: only render when `session && !session.sessionComplete` — the exact same condition `app/index.tsx` already uses to decide whether to show its own resume/discard prompt (`src/app/index.tsx:74`), and the one `architecture.md`'s FR39 section (line 586) specifies. A session that has already completed (via a tap or Story 5.2's settings-driven transition) is not "in progress" and must not show this notice.
  - [x] Render the notice above the stepper row (`styles.stepperRow` in the existing JSX), as a `ThemedText` with `type="small"` and `themeColor="textSecondary"` — the same visual register as the existing floor note (`settings.tsx:62-64`), per `ux-design-specification.md`'s "low-contrast neutral banner, same visual register as the floor note rather than an alert color" (line 521). Not a `themeColor="error"`/alert-styled component — this is a standing informational notice, not a validation error.
  - [x] Set `accessibilityLiveRegion="polite"` on the notice's `ThemedText` (FR39, UX-DR24) — same prop used by the duplicate-segment snackbar (`ux-design-specification.md:646`) and the stepper value itself (`settings.tsx:41`).
  - [x] Give the notice `testID="in-progress-session-notice"` for the tests below, matching this screen's existing `testID` convention (`settings-decrease`, `settings-increase`).
  - [x] Exact copy, with the live segment name interpolated: `` `You have a session in progress for '${segmentName}.' Changing this target updates it immediately — and may complete the session.` ``

- [x] Task 2: Test coverage for the notice's presence/absence and stability (AC #1, #2, #3)
  - [x] In `src/app-tests/settings.test.tsx`, add a new `describe` block for Story 5.3. Use `createSegment` (`@/lib/segments`) + `startSession` (`@/lib/session-transitions`) + `writeSession` (`@/lib/session`) to seed an in-progress session directly in storage before rendering `SettingsScreen` — the same "seed storage directly, no hook wrapper" pattern this file already uses for `readSettings`/`setOverlearningPercent`. Example: `writeSession(startSession(segment.id, segment.name))`.
  - [x] Test: with a segment created and a session started for it, render `SettingsScreen` and assert the notice text is present and contains the segment's name, and that its `accessibilityLiveRegion` prop is `"polite"`.
  - [x] Test: with no session in storage (default `beforeEach` clears storage), render `SettingsScreen` and assert `queryByTestId('in-progress-session-notice')` is `null` (AC #3).
  - [x] Test: with a session that is *already* `sessionComplete: true` in storage (construct via `startSession` then spread `{ ...session, sessionComplete: true, completedTarget: 5 }` before `writeSession`), assert the notice is **not** rendered — this is the FR22/FR37 edge case where "a session exists" is not the same as "a session is in progress"; a completed-but-not-yet-Done session must not show this notice.
  - [x] Test (AC #2): with a session in progress, render `SettingsScreen`, press `settings-increase` several times in sequence, and after each press assert exactly one instance of the notice is still present (`queryAllByTestId('in-progress-session-notice')` has length 1) and no confirmation dialog appears (`queryByText(/confirm/i)` stays `null`, extending the existing "no confirmation dialog or Save button" test's assertion).
  - [x] **Found while implementing:** the pre-existing "rapid taps" test (`describe('SettingsScreen rapid taps [Review][Patch]')`) fired two concurrent `fireEvent.press(...)` calls via `Promise.all`, each wrapping its own internal `act()` — overlapping, not nested, act scopes. React logs this as unsupported and it left an act scope unresolved past that test's end, which corrupted the *next* test's render (component tree came back empty) once this story's tests were added directly after it in file order. Fixed by dispatching both taps inside one single `act()` call instead (`fireEvent.press(increase); fireEvent.press(increase);` inside one `await act(async () => {...})`), preserving the same "two taps before either commits" race the test exists to verify. Pre-existing defect, not introduced by this story; fixed here because it blocked this story's own tests from passing reliably.

- [x] Task 3: Synchronize `ux-design-specification.md`'s stale notice copy (CLAUDE.md §13.4 — spec/code divergence)
  - [x] `ux-design-specification.md` line ~522 still quotes the pre-amendment notice copy ("...Changing this target updates it immediately." — no completion clause) and its "Resolved Questions" section (line ~656) references the same superseded wording. `epics.md`'s AC #1 was corrected 2026-09-11 following Story 5.2's code review; this UX doc was not updated in that pass. Update both spots to match the copy in AC #1 above, with a dated edit-history note (matching this doc's existing `editHistory` convention) attributing the correction to Story 5.3's implementation.

### Review Findings

Code review 2026-09-11 (3 adversarial layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor; all 3 completed). 0 decision-needed, 8 patch, 4 deferred, 7 dismissed. All three ACs independently verified met; findings are quality/accuracy issues, not AC violations.

**Patch:**

- [x] [Review][Patch] Notice interpolates the literal string `undefined` when the segment lookup misses — the only one of six FR31 display sites without the `?? session.segmentName` fallback `app/index.tsx:228` establishes; add the fallback and a regression test [src/app/settings.tsx:39]
- [x] [Review][Patch] The `act()` fix's comment describes code that was never committed — it claims "Calling the Pressable's `onPress` directly, twice", but the code calls `fireEvent.press` twice (direct `onPress` invocation was tried and is not available on the host node). It also claims the overlapping-act defect is removed, when the warning still logs — the outer `act()` absorbs the leak rather than eliminating it. Correct the comment to what the code does, and confirm the test still fails against the un-fixed production code it guards [src/app-tests/settings.test.tsx:139-152]
- [x] [Review][Patch] No test distinguishes `useSegment` from `session.segmentName` — every test seeds `startSession(segment.id, segment.name)`, so both sources agree and swapping the implementation to the frozen name keeps the suite green; add a rename-after-start test [src/app-tests/settings.test.tsx]
- [x] [Review][Patch] Task 3's spec sync is incomplete: this line still declares the feature "**Deliberately not designed:** a warning or confirmation when changing the setting while a session is active" — a now-false claim 19 lines below the item-5 notice this story shipped, and the same line Story 5.2 cited as authority for adding no UI (CLAUDE.md §13.4) [_bmad-output/planning-artifacts/ux-design-specification.md:551]
- [x] [Review][Patch] Dev Agent Record overstates the test delta — "368 tests, up from 352" is wrong; this diff adds exactly 4 tests, so the pre-story baseline was 364. 352 was Story 5.2's *pre-review* count (CLAUDE.md §13.3) [this file]
- [x] [Review][Patch] `expect(view.queryByText(/confirm/i)).toBeNull()` cannot fail — this screen renders no dialog, and the realistic regression (`Alert.alert`) is a native call that renders nothing into the RNTL tree, so the assertion would still pass against the exact broken code it purports to guard. It also duplicates the existing test at line 94 [src/app-tests/settings.test.tsx:201]
- [x] [Review][Patch] The notice's disappearance path — the story's own headline scenario ("may complete the session") — is never exercised. The repeated-tap loop only presses increase (50→80), so the target only rises and completion never occurs; there is no test for the notice vanishing when a settings change completes the session mid-screen [src/app-tests/settings.test.tsx:191-203]
- [x] [Review][Patch] No test pins the notice's position relative to the stepper, so a refactor could move it below the floor note without a red test (AC #1 specifies "above the stepper") [src/app-tests/settings.test.tsx]

**Deferred (pre-existing, logged to deferred-work.md):**

- [x] [Review][Defer] `accessibilityLiveRegion="polite"` on a node that mounts/unmounts never announces — a polite live region fires on content change, and the prop is Android-only regardless [src/app/settings.tsx:35] — deferred, pre-existing and spec-mandated
- [x] [Review][Defer] A segment name containing an apostrophe garbles the notice's straight-quote wrapping ("for 'Bach's Bar 24.'") [src/app/settings.tsx:39] — deferred, pre-existing; same class as the Story 4.2 entry already in deferred-work.md
- [x] [Review][Defer] The UX spec's "Layout, top to bottom" enumeration still lists the notice fifth while its own body (and the shipped code) place it second [_bmad-output/planning-artifacts/ux-design-specification.md] — deferred, pre-existing
- [x] [Review][Defer] `traceability-matrix.md` still marks FR39 PLANNED, as it does FR35–FR37 after Stories 5.1/5.2 shipped [_bmad-output/test-artifacts/traceability-matrix.md:235] — deferred, pre-existing project-wide drift

**Dismissed:** period-inside-the-closing-quote (exact character-for-character match to AC #1, `epics.md:801`, and the UX spec — changing it would violate the AC); the Settings screen's second `useActiveSession()` reconciliation-effect instance (unreachable as a *new* completion path — Home stays mounted app-wide and its own instance already reconciles at app open, and the proposed guard would revert Story 5.2's knowingly-accepted decision); "the notice's completion claim is unverified by this diff" (verified by Story 5.2's `reconcileCompletion` tests — the Blind Hunter layer has no project access by design); the notice being styled as de-emphasized small/secondary text (the UX spec mandates exactly that register over an alert color); the new describe's own `beforeEach` (matches the file's convention — all three existing describes have one); `completedTarget: 5` in the completed-session fixture (realistic — the real code always writes both fields together); exact-string assertion on `props.children` (asserting the verbatim copy is precisely what AC #1 demands).

## Dev Notes

### Architecture compliance

- **No new mechanism, per architecture.md's FR39 section (line 584-590):** the Settings screen calls `useActiveSession()` — the same hook every other screen already uses — and checks `session && !session.sessionComplete`. `session.active` is a single MMKV key app-wide (v1.0 decision), so "does any segment have an in-progress session" and "is there a current session that isn't complete" are the same question, already answered by this hook.
- **This story is the first to mount `useActiveSession()` inside `settings.tsx`.** That hook also contains Story 5.2's settings-driven completion reconciliation `useEffect` (`src/hooks/useActiveSession.ts:89-111`), which will now also run from within the Settings screen's own mounted instance, in addition to Home's. This is safe and requires no new guard: `reconcileCompletion` is idempotent (`next === current` when nothing needs to change), and the codebase already relies on multiple concurrent mounts of this hook staying in sync via the shared MMKV subscription (see the hook's own header comment) — this is the same class of "single app-wide session, N mounted readers" case already accepted for Home + Active Session screen, not a new risk this story introduces.
- **Do not add a confirmation dialog or gate the stepper on the notice.** AC #2 and the existing "no confirmation dialog or Save button anywhere on the screen" test (`settings.test.tsx:88-92`) both require the stepper to remain exactly as immediate/unconfirmed as it already is — the notice is informational only, consistent with `ux-design-specification.md`'s "No confirmation on change" rule (line 537) and this story's own copy change (which specifies "may complete the session" precisely *because* no confirmation gate exists to carry that warning per-tap).
- **Segment name must come from `useSegment`, not `session.segmentName`.** This mirrors the Rename Propagation decision (FR31) already implemented elsewhere (segment list row, detail heading, active-session readout, completion summary, resume/discard prompt) — the notice is now the sixth display site subject to that same rule, so a rename made after the session started must be reflected here too.

### Existing code confirmed by direct inspection

- **`src/app/settings.tsx`** (read in full): currently imports `useSettings`, `calculateTargetStreak`, `readSettings` — no session/segment awareness at all today. The stepper row (`styles.stepperRow`) is the anchor point; the notice goes immediately above it, inside the existing `SafeAreaView`.
- **`src/hooks/useActiveSession.ts`** (read in full): returns `{ session, ... }`, where `session` is `SessionState | null`. `session.sessionComplete` and `session.segmentId` are the two fields this story needs; `session.segmentName` exists but must not be used here (see above).
- **`src/hooks/useSegments.ts`** (read in full): exports `useSegment(id: string | undefined): Segment | undefined`, a `.find()` over the same segment store every other screen reads — exactly the lookup this story needs, no new hook required.
- **`src/app/index.tsx`** (grepped): `showResumeDialog` computation (`session && !session.sessionComplete`, lines 72-74) is the precedent for this story's own render guard.
- **`src/app-tests/settings.test.tsx`** (read in full): no existing test seeds a session; all existing tests only touch `lib/settings.ts`. New tests must import `createSegment` (`@/lib/segments`), `startSession` (`@/lib/session-transitions`), and `writeSession` (`@/lib/session`) — none of these are currently imported in this test file.

### Previous story intelligence (5.2)

- Story 5.2's code review is the direct origin of this story's amended AC #1 copy and its Dev Notes above — read `_bmad-output/implementation-artifacts/5-2-apply-a-changed-target-to-an-in-progress-session.md`'s Review Findings if anything here is ambiguous; it has the full reachability trace for how the settings-driven completion transition interacts with this screen.
- Story 5.2 also established the "read fresh via `sessionStore`/library functions rather than a stale render closure" pattern for anything touching session/settings state — not directly needed for this story's read-only notice, but relevant if a review surfaces a race in Task 1's implementation.

### Git intelligence

Last commit at story-creation time: `93b0331` "Verify and complete FR37's mid-session target application (Story 5.2)". No dependency changes; this story needs none either — no new library, no new storage key, no new lib/ module.

### Project Structure Notes

**Modified:**
- `src/app/settings.tsx` — Task 1's notice
- `src/app-tests/settings.test.tsx` — Task 2's new tests
- `_bmad-output/planning-artifacts/ux-design-specification.md` — Task 3's copy correction

**Not touched:**
- `src/lib/mechanic.ts`, `src/lib/session-transitions.ts`, `src/lib/settings.ts`, `src/hooks/useActiveSession.ts` — no formula, transition, or storage-boundary changes; this story is read-only UI on top of existing plumbing
- `src/lib/segments.ts`, `src/hooks/useSegments.ts` — `useSegment` already exists and needs no changes

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.3-See-a-Warning-Before-Changing-Settings-Mid-Session] — story statement, AC, amended-copy rationale
- [Source: _bmad-output/planning-artifacts/prd.md] FR39 (full text) — the requirement this story implements
- [Source: _bmad-output/planning-artifacts/architecture.md] (line 584-590) — "FR39: Detecting an In-Progress Session from the Settings Screen" — the exact mechanism and segment-name-sourcing decision this story follows
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] (line 521-522, 537, 646-647) — notice placement/visual register, no-confirmation rule, accessibility treatment — copy at line 522 is stale, corrected by this story's Task 3
- [Source: _bmad-output/implementation-artifacts/5-2-apply-a-changed-target-to-an-in-progress-session.md] — Review Findings section, for why AC #1's copy changed and what the settings-driven completion transition does

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5), via bmad-dev-story.

### Debug Log References

None — no failing runs beyond the deliberate red-phase (Task 2's new tests, confirmed genuinely red before Task 1's implementation, per TDD).

### Completion Notes List

- Task 1: added `useActiveSession()` + `useSegment(session?.segmentId)` to `settings.tsx`, rendering the standing notice above the stepper when `session && !session.sessionComplete`. Segment name sourced live via `useSegment`, per the story's own instruction, not `session.segmentName`.
- Task 2: 4 new tests added, all confirmed red before Task 1's implementation and green after. Found and fixed a pre-existing test-infra defect while doing so: the "rapid taps" describe block's concurrent `fireEvent.press` calls left an unresolved `act()` scope that corrupted the next test's render once this story's tests were placed directly after it in file order — fixed by dispatching both taps inside a single `act()` call, preserving the original race-condition coverage. Full suite (368 tests) and typecheck pass clean; lint is at the same pre-existing baseline as Story 5.2 left it (1 error + 2 warnings, none in files this story touches). **[Review][Patch] found via code review 2026-09-11 — corrected:** this line previously claimed "up from 352" — 352 was Story 5.2's *pre-review* count; the correct pre-this-story baseline was 364 (Story 5.2 post-review), so this story's original 4 tests brought the count to 368, not "up from 352".
- Task 3: corrected `ux-design-specification.md`'s notice copy (line ~522) and its Resolved Questions cross-reference (line ~656) to match `epics.md`'s Story 5.2-review-amended AC #1 wording; added a dated `editHistory` entry per the doc's existing convention.
- **Code review 2026-09-11 (3 adversarial layers) round:** applied all 8 patch findings. `settings.tsx` now falls back to `session.segmentName` when `useSegment` can't resolve (matching `app/index.tsx:228`'s identical guard), closing the only one of six FR31 display sites without it. Added 4 more tests: a fallback regression test (segment lookup miss), a rename-after-start test that genuinely distinguishes `useSegment` from `session.segmentName` (verified red against the frozen-name form), a settings-driven-completion test that hides the notice mid-screen (verified the reconciliation path this story's copy promises), and a position test pinning the notice above the stepper. Removed the vacuous `queryByText(/confirm/i)` assertion (this screen never renders a dialog; the realistic regression — `Alert.alert` — renders nothing into the RNTL tree either way) and strengthened the repeated-tap test to assert the displayed percent actually changed each press. Corrected the `act()` fix's comment, which had described calling `onPress` directly — verified that path is unavailable on the RNTL host node — and confirmed by temporary regression that the test still fails (asserts 70, gets 60) against the pre-fix stale-closure `onPress`. Fixed `ux-design-specification.md`'s second stale-spec spot (line ~551, "Deliberately not designed") that Task 3's own first pass missed, which Story 5.2's dev notes had cited as authority. Full suite is **372/372** (up from 364 pre-story: this story's original 4 tests + this round's 4 more), typecheck clean, lint unchanged from baseline.

### File List

- `src/app/settings.tsx` — Task 1: in-progress-session notice; review round: `session.segmentName` fallback
- `src/app-tests/settings.test.tsx` — Task 2: 4 new tests; fixed pre-existing "rapid taps" test's overlapping-act() defect; review round: 4 more tests (fallback, rename-propagation, settings-driven-completion, position), removed a vacuous assertion, strengthened the repeated-tap test, corrected the `act()` comment
- `_bmad-output/planning-artifacts/ux-design-specification.md` — Task 3: notice copy correction + editHistory entry; review round: second stale-spec spot corrected (line ~551)
- `_bmad-output/implementation-artifacts/deferred-work.md` — review round: 4 new deferred entries appended

### Change Log

- 2026-09-11: Implemented Story 5.3 — standing in-progress-session notice on the Settings screen (FR39, UX-DR17, UX-DR24), sourced via `useSegment` for a live segment name, guarded on `session && !session.sessionComplete`. Fixed a pre-existing cross-test `act()` pollution defect surfaced while adding this story's tests. Synchronized `ux-design-specification.md`'s stale notice copy with `epics.md`'s Story 5.2-review-amended wording. Full suite 368/368, typecheck clean, lint at pre-existing baseline.
- 2026-09-11: Code review (3 adversarial layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor). 0 decisions needed; all three ACs independently verified met. Applied all 8 resulting patches: added the `session.segmentName` fallback for a missing segment (closing the only one of six FR31 sites without it), added 4 tests (fallback regression, rename-propagation, settings-driven-completion, notice position), removed a vacuous confirmation-dialog assertion, strengthened the repeated-tap test to assert effective changes, corrected the `act()` fix's comment (verified by temporary regression that the guarded test still fails against the pre-fix code), and fixed a second stale-spec spot in `ux-design-specification.md` that Task 3's own first pass missed. Corrected this file's own test-count inaccuracy. 4 pre-existing findings deferred to `deferred-work.md`. Full suite 372/372, typecheck clean, lint unchanged from baseline.
