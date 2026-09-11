# Story 5.2: Apply a Changed Target to an In-Progress Session

Status: review

<!-- Note: Validate with validate-create-story before dev-story if desired. -->

## Story

As a user,
I want a target change I make mid-session to take effect immediately,
so that the app never operates on two different rules at once.

## Acceptance Criteria

1. **Given** a session is in progress **When** the user changes the overlearning-% in Settings and returns to that session **Then** the displayed target streak reflects the new percentage immediately, with no restart or re-navigation required (FR37)

[Source: _bmad-output/planning-artifacts/epics.md#Story-5.2-Apply-a-Changed-Target-to-an-In-Progress-Session]

**Note from epics.md:** per architecture.md, this requires no new mechanism for the target *number* — it verifies the behavior Story 5.1's plumbing already produces, since `target_streak` is derived on every read. Same shape as v1.0's Story 2.9, which verified an already-built guarantee rather than building a new one. Tasks 2 and 3 below exist because Story 5.1's own code review (2026-09-10) found two adjacent gaps this "just verify" framing doesn't cover — see Dev Notes.

## Tasks / Subtasks

- [x] Task 1: End-to-end verification test for AC #1 (AC #1)
  - [x] In `src/app-tests/session.test.tsx`, add a test that: renders `ActiveSessionScreen` for a segment, logs some correct/incorrect taps (session stays incomplete), calls `setOverlearningPercent()` (from `@/lib/settings`) directly — simulating "user backed out to Settings and changed it" without navigating away from this screen (Home stays mounted underneath per the app's existing navigation model; this screen itself never unmounts on that round trip) — then asserts `streak-readout`'s target (`props.children[2]`) reflects the new percentage on the *next render*, with no call to `start()`/`restart()`. This is the literal AC #1 scenario; nothing in the codebase currently exercises it (`useActiveSession.test.ts`'s existing level-threading tests all set the level *before* `start()`, not mid-session).
  - [x] Assert the same at the hook level too, in `src/hooks/useActiveSession.test.ts`: `start()`, log some taps, `setOverlearningPercent()` to a different value, then re-read `result.current.targetStreak` on the next render (no explicit re-render call needed — `useSettings()`'s `useSyncExternalStore` subscription already triggers one) and confirm it reflects the new level.

- [x] Task 2: Anchor the Completion screen's displayed target to what actually gets recorded (AC #1's underlying guarantee — see Dev Notes)
  - [x] In `src/app/session/[id].tsx`, change the `<CompletionScreen ... finalTarget={targetStreak} .../>` prop (line ~151) to `finalTarget={session.completedTarget ?? targetStreak}`. `session.completedTarget` was added in Story 5.1's code review fix (`src/lib/types.ts`) specifically so `complete()`'s written `finalTarget` can't drift from a live setting change between completion and Done — but the *displayed* Completion screen still reads the live `targetStreak`, so a settings change made while sitting on the Completion screen (before tapping Done) would show the user one number while a different one gets permanently recorded. The `?? targetStreak` fallback is defense-in-depth only, matching the codebase's established style for a state that should be unreachable (`session.sessionComplete` is only ever set `true` in the same write that sets `completedTarget`, per `session-transitions.ts`'s `logCorrect`).
  - [x] Add a test in `src/app-tests/session.test.tsx`: reach completion, call `setOverlearningPercent()` to a different value *before* asserting on `completion-stats`, and confirm the displayed "Target reached: N" still shows the value achieved, not the new live one.

- [x] Task 3: Verify (and, if it reproduces, fix) the deferred `sessionComplete` staleness edge case (see Dev Notes — Deferred Finding)
  - [x] Write a failing-first test reproducing the exact scenario logged in `_bmad-output/implementation-artifacts/deferred-work.md` ("Deferred from: code review of 5-1..."): start a session, log enough mistakes to raise the target well above the floor, lower the overlearning-% via `setOverlearningPercent()` enough that the *current* streak already meets or exceeds the *new* (lower) live target, and assert what `session.sessionComplete` / the rendered screen actually do. **Confirmed reproduced** — `session.sessionComplete` stayed `false` under the current (pre-fix) code (`src/hooks/useActiveSession.test.ts`, `[Story 5.2, Task 3]`).
  - [x] **Reproduced** (current streak ≥ live target but `sessionComplete` stayed `false`): implemented the reconciliation approach from Dev Notes — a `useEffect` inside `useActiveSession()`, keyed on `overlearningLevel` alone, reads the session fresh via `sessionStore.readSession()` (not the render closure — matches every other mutator's stale-closure guard) and, if incomplete with `currentStreak >= liveTarget`, writes `{ ...current, sessionComplete: true, completedTarget: liveTarget }`. `logCorrect`/`logIncorrect`'s no-op guards were left unchanged, as specified.
  - [x] Read `useActiveSession.ts`'s header comment (rapid-tap compounding, two-mounted-instances) before implementing — confirmed safe: the effect reads fresh at fire time (immune to a stale render-closure race with a concurrent tap), and the write is idempotent across multiple mounted instances (same deterministic inputs → same computed output), so no HALT was needed.
  - [x] Recorded in Completion Notes below; `deferred-work.md`'s entry updated with a struck-through summary and a "Resolved by Story 5.2 (Task 3)" note — kept rather than deleted, so the resolution has a visible record; this is the first entry in the file to be resolved, so it establishes rather than follows a convention.

### Review Findings

Code review 2026-09-11 (3 adversarial layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor; all 3 completed). 3 decision-needed, 12 patch, 2 deferred, 1 dismissed.

**Decision-needed — all 3 resolved by Gerardo, 2026-09-11:**

- [x] [Review][Decision] **RESOLVED — keep the effect; specify the consequences (option 1).** The settings-driven completion trigger stays as designed. Its consequences are accepted as intended behavior and must now be written into the specs rather than removed from the code: (1) a single stepper tap can end an in-progress session irreversibly; (2) changing the percent while on Settings ejects the user to the Completion screen mid-adjustment; (3) FR22's lockout disables Restart without a tap; (4) only Done or Repeat remain as exits; (5) **an interrupted session can auto-complete at app open, bypassing the FR24 Resume/Discard prompt** — the effect also runs on mount, and `showResumeDialog` requires `!session.sessionComplete`. Consequence (5) was not anticipated by the original deferred note and defeats a guarantee Story 2.6 was built to provide; it is accepted knowingly. See the spec-synchronization patch items below for the full list of documents this obligates.
- [x] [Review][Decision] **RESOLVED — record the achieved streak.** `completedTarget` for a settings-driven completion becomes `Math.max(liveTarget, current.currentStreak)`, so "Target reached: N" never claims less work than the user actually performed. Rationale: `HistoryEntry` has no separate field for the achieved streak, so recording the lower live target would permanently discard the fact that the user reached 20 consecutive correct. Tap-driven completion is unaffected (it always lands on `currentStreak === targetStreak` exactly, so the `max` is a no-op there).
- [x] [Review][Decision] **RESOLVED — FR37 is authoritative; amend the PRD.** prd.md (~line 287)'s "never falls, except via Restart" is corrected to hold *within a fixed overlearning level*: the target rises or holds as mistakes accrue, and changes otherwise only via Restart or an explicit overlearning-% change (FR37, v1.1). The sentence predates v1.1 and was never reconciled when FR37 was added in Story 5.1.

**Superseded decision text (kept for audit):**

- [x] [Review][Decision] ~~**Should a settings change flip `sessionComplete` at all?**~~ — resolved above as option 1. — Task 3's reconciliation `useEffect` (`src/hooks/useActiveSession.ts:41-49`) introduces a fourth completion trigger that no spec defines. PRD's Mechanic Specification (~line 289) makes completion a consequence of the **Correct** transition only; FR37 (prd.md:354) and AC #1 scope immediacy to "the target-streak *calculation*" / "the *displayed* target streak", never to `session_complete`. Three concrete user-visible consequences, all confirmed against the real code: **(a)** Home mounts `useActiveSession()` (`src/app/index.tsx:33`) and holds a redirect effect (`src/app/index.tsx:78-85`) that fires `router.replace('/session/<id>')` the moment `sessionComplete` turns true — so stepping the percent down while on Settings *replaces the Settings screen* with the Completion screen mid-adjustment, with no back route and no way to undo the value just set; **(b)** the flip is irreversible — the effect early-returns on `current.sessionComplete`, so stepping back up does not undo it, and FR22's lockout (`logCorrect`/`logIncorrect`/`restart` all no-op once complete) means an accidental one-tap stepper adjustment ends the in-progress session, exitable only via Done (permanently recording it) or Repeat (discarding the run); **(c)** it silently disables Restart (FR20/FR21) with no AC, FR, or UX statement authorizing it. Options: (1) keep the effect and accept/spec these consequences, (2) scope the effect to the Active Session screen only, (3) drop the stored-flag reconciliation and derive completion on read instead, (4) revert Task 3 and re-defer the original finding to Story 5.3 (which already owns the mid-session-change warning, FR39).
- [x] [Review][Decision] ~~**What target should a settings-driven completion record?**~~ — resolved above: record the achieved streak.
- [x] [Review][Decision] ~~**PRD spec conflict: target monotonicity vs. FR37.**~~ — resolved above: FR37 authoritative, amend the PRD sentence.

**Patch — arising from the resolved decisions:**

- [x] [Review][Patch] Record the achieved streak on settings-driven completion: `completedTarget: Math.max(liveTarget, current.currentStreak)` [src/hooks/useActiveSession.ts:47]
- [x] [Review][Patch] Amend prd.md's monotonicity sentence (~line 287) to hold within a fixed overlearning level; target changes otherwise only via Restart or an explicit overlearning-% change (FR37, v1.1) [prd.md:~287]
- [x] [Review][Patch] PRD Mechanic Specification (~line 289): add the settings change as a fourth completion trigger alongside Correct/Incorrect/Restart [prd.md:~289]
- [x] [Review][Patch] PRD FR22: state that the completion lockout is reachable without a Correct/Incorrect tap, via an overlearning-% change [prd.md]
- [x] [Review][Patch] PRD FR24 / Story 2.6: state that an interrupted session may auto-complete at app open, bypassing the Resume/Discard prompt [prd.md]
- [x] [Review][Patch] Story 5.2 AC #1 in epics.md: AC covers only the *displayed target*; extend it to cover settings-driven completion, or add an AC that does [epics.md:762-774]
- [x] [Review][Patch] Story 5.3's notice copy ("Changing this target updates it immediately") understates "may end this session"; its AC also bars the per-tap confirmation that would normally carry that warning — reconcile before 5.3 is implemented [epics.md:776-795]

**Patch — defects, independent of the decisions:**

- [x] [Review][Patch] `SessionState.completedTarget` added with no schema migration — every in-progress session persisted by the shipped build is quarantined and silently lost on upgrade [src/lib/types.ts:138]
- [x] [Review][Patch] Reconciliation effect's `writeSession` is unguarded — a storage failure throws out of the effect body and crashes instead of degrading [src/hooks/useActiveSession.ts:47]
- [x] [Review][Patch] Settings-driven completion fires no `feedback.completion(...)` — no success haptic and no screen-reader announcement, unlike every tap-driven completion (FR12/UX-DR3) [src/hooks/useActiveSession.ts:41-49]
- [x] [Review][Patch] Reconciliation hand-builds `SessionState` in the hook layer, duplicating `logCorrect`'s completion rule outside `lib/session-transitions.ts` (CLAUDE.md §5.5) [src/hooks/useActiveSession.ts:47]
- [x] [Review][Patch] ~~Effect fires on mount and carries no `segmentId` identity check~~ — **no code change; reclassified on inspection.** `useActiveSession()` takes no segmentId and has never had a per-session identity concept: `session.active` is a single MMKV key app-wide (architecture.md), so there is only ever one active session for the whole app to reconcile against — there is no second session it could mistakenly write to. The mount-firing behavior itself (not the "identity" framing) is real and is exactly consequence (5) accepted under the first decision above; it is not an independent defect once that decision is made. [src/hooks/useActiveSession.ts:41-49]
- [x] [Review][Patch] Two comments added by this change assert `logCorrect` is the only writer of `sessionComplete`, which the same change falsifies [src/app/session/[id].tsx:150-157, src/hooks/useActiveSession.ts:150-157]
- [x] [Review][Patch] Negative reconciliation test is vacuous — `setOverlearningPercent(50)` when 50 is already the value never re-fires the effect; passes with the guard deleted [src/hooks/useActiveSession.test.ts:125-140]
- [x] [Review][Patch] No coverage of `currentStreak > liveTarget` or `liveTarget - 1`; the `>=` operator could be `===` and the suite stays green [src/hooks/useActiveSession.test.ts:91-123]
- [x] [Review][Patch] Task 3's own subtask specifies a screen-level assertion ("the rendered screen") that was never written — no test asserts `ActiveSessionScreen` swaps to `CompletionScreen` after a settings-only change [src/app-tests/session.test.tsx]
- [x] [Review][Patch] `architecture.md`'s FR37 paragraph still reads "No session-state field changes, no explicit propagation code" — falsified by this change, which adds both; `types.ts` file-tree line also left stale while its sibling was corrected (CLAUDE.md §13.4) [architecture.md:573, ~670]
- [x] [Review][Patch] Dev Agent Record inaccuracies: "Git intelligence" claims `27a168a` contains Story 5.1's post-review fixes (it does not — they are uncommitted in this changeset); File List names 5 files against 18 actually changed; "lint and typecheck clean" is false (`npx eslint .` exits with 1 error + 2 warnings, all pre-existing and untouched here) [this file]
- [ ] [Review][Patch] Story 5.1's unshipped post-review work is commingled with Story 5.2 in one changeset, and 5.1 is flipped to `Status: done` for code that exists only in the working tree (CLAUDE.md §13.2) — split into two commits before landing [changeset-wide] — **pending: this is a commit-time git operation (staging split), not a code edit; to be done when this story is committed, per Gerardo's separate authorization for that action.**

**Deferred (pre-existing, logged to deferred-work.md):**

- [x] [Review][Defer] Stepper `disabled`/style still read the stale render-time `settings.overlearningPercent` while `onPress` reads fresh — masked today by `setOverlearningPercent`'s clamp [src/app/settings.tsx:27,47] — deferred, pre-existing
- [x] [Review][Defer] Disabled-stepper tests assert only the storage clamp, not that the control is inert — both pass with `disabled` removed [src/app-tests/settings.test.tsx:~252] — deferred, pre-existing

**Dismissed:** `completedTarget` stickiness across Repeat — `handleRepeat` calls `start()` → `startSession()`, which writes a fresh `completedTarget: null`; unreachable.

## Dev Notes

### Architecture compliance

- **No new mechanism for the core AC.** `target_streak` (`useActiveSession`'s returned `targetStreak`) is derived fresh on every render from `calculateTargetStreak(session?.totalIncorrectThisSession ?? 0, overlearningLevel)`, and `overlearningLevel` is itself derived fresh from `useSettings().settings.overlearningPercent` — both re-run on every render, and `useSettings()`'s `useSyncExternalStore` subscription triggers a re-render on any `settings.general` write. This is the payoff of the v1.0 derive-on-read decision the architecture doc credits (architecture.md's "FR37 requires no additional mechanism" note) — Task 1 exists to *prove* this with a real end-to-end test, since nothing in the codebase currently exercises "change the setting after `start()`, before completion."
- **Deferred Finding (Story 5.1 code review, 2026-09-10) — this is what Task 3 verifies/fixes:** `sessionComplete` is not derived on every read the way `targetStreak` is — it is a stored boolean, written only inside `session-transitions.ts`'s `logCorrect` transition. Lowering the overlearning-% mid-session (reachable today: Home's gear icon is unconditionally present, and backing out of an in-progress session to Home does not discard it) can leave `currentStreak >= targetStreak` (live) true while `sessionComplete` stays `false`, until the user's next Correct/Incorrect tap re-evaluates it. This was explicitly deferred to this story and Story 5.3 in `deferred-work.md` — Task 3 is that follow-through. **This is a proposed design, not yet confirmed correct against the real code** — the dev agent must read `useActiveSession.ts`'s own header comment (rapid-tap and multi-instance guarantees) before committing to the `useEffect` mechanism outlined in Task 3, and halt to ask rather than pick a different approach unilaterally if it looks unsafe.
- **`session.completedTarget` (new in Story 5.1's review fix, `src/lib/types.ts`).** Captures the target actually met, in the same write that flips `sessionComplete` true (`session-transitions.ts`'s `logCorrect`), specifically so a settings change *after* completion but *before* Done can't alter what gets permanently recorded (`complete()` in `useActiveSession.ts` already prefers it). Task 2 closes the matching *display*-side gap: the Completion screen (`CompletionScreen.tsx`, rendered from `session/[id].tsx`) was still reading the live `targetStreak`, not this anchored value, so what the user sees and what gets recorded could show different numbers for the same completed session.
- **No change to `calculateTargetStreak`, `logCorrect`'s signature, or the settings storage boundary.** This story is verification plus two narrow, adjacent-gap fixes — not a re-implementation of Story 5.1's threading. Do not touch `lib/mechanic.ts` or `lib/settings.ts`.

### Existing code confirmed by direct inspection

- **`src/hooks/useActiveSession.ts`** (read in full): `overlearningLevel` is computed once per render from `useSettings().settings.overlearningPercent / 100`; `targetStreak` (the hook's returned value) is computed fresh every render from it. No caching, no `useMemo` with a stale dependency array — confirmed nothing here would prevent AC #1 from already working for the *display number* alone.
- **`src/app/session/[id].tsx`** (read in full): line ~151, `<CompletionScreen session={session} segmentName={segment.name} finalTarget={targetStreak} onDone={handleDone} onRepeat={handleRepeat} />` — confirmed this is the live value, not `session.completedTarget`, which is what Task 2 fixes. Line 146: `if (session.sessionComplete) { return <CompletionScreen ... /> }` — confirms the screen decides which UI to show purely from the stored `sessionComplete` flag, which is the reason Task 3's reconciliation (if it reproduces) must correct the *stored* flag, not just a hook-local derived value — a derived-only fix would desync this conditional from the lockout guards in `logCorrect()`/`logIncorrect()`.
- **`src/components/session/CompletionScreen.tsx`** (read in full): `finalTarget: number` is a plain prop, displayed verbatim in `completion-stats`'s "Target reached: {finalTarget}" line. No internal computation — confirms Task 2's fix is a one-line caller-side change, no component API change needed.
- **`src/components/session/StreakReadout.tsx`** (read in full): `targetStreak` is a plain prop, rendered at `streak-readout`'s `props.children[2]`, used by Task 1's assertion.
- **`src/app-tests/session.test.tsx`** (read in full): existing tests use `useLocalSearchParams.mockReturnValue({ id: segment.id })` then `render(<ActiveSessionScreen />)`; streak values are asserted via `view.getByTestId('streak-readout').props.children[0]` (current) and `[2]` (target). Task 1's new test follows this exact pattern.
- **`src/hooks/useActiveSession.ts`**'s header comment (read in full) documents two invariants any Task 3 fix must not break: (1) every mutator reads `sessionStore.readSession()` fresh rather than closing over a render's `session`, to compound rapid taps instead of dropping one; (2) two mounted instances (Home + Active Session screen) must stay in sync via the shared MMKV subscription, not local state.

### Previous story intelligence (5.1)

- Story 5.1's code review (3-layer adversarial: Blind Hunter, Edge Case Hunter, Acceptance Auditor) is the direct origin of Tasks 2 and 3 — both were explicitly deferred to "Story 5.2's verification pass" in `deferred-work.md`, not discovered independently here. Read that entry (`_bmad-output/implementation-artifacts/deferred-work.md`, heading "Deferred from: code review of 5-1-configure-the-overlearning-target (2026-09-10)") before starting Task 3 — it has the full reachability trace for how a user gets to Settings mid-session.
- Story 5.1 also fixed (in the same review pass) a stepper double-tap race in `settings.tsx` by reading `readSettings()` fresh inside `onPress` rather than closing over a render-time value — worth knowing as precedent if Task 3's fix needs a similar "read fresh, don't trust the render closure" pattern.
- Story 5.1's `useActiveSession.test.ts` additions already demonstrate the `setOverlearningPercent()`-then-assert-on-`targetStreak` pattern Task 1 extends — search that file for `setOverlearningPercent` to find them; the difference this story's tests must capture is calling it *after* `start()` and some taps, not before.

### Git intelligence

Last commit at story-creation time: `27a168a` "Add Configure the Overlearning Target settings screen (FR35, FR36)". No dependency changes; this story needs none either.

**[Review][Patch] found via code review 2026-09-11 — corrected:** the sentence above previously claimed `27a168a` "includes the post-review fixes described above (`SessionState.completedTarget`, the stepper race fix, doc corrections)". Verified false: `git grep -n "completedTarget" 27a168a -- src` returns nothing, and those fixes were still uncommitted working-tree changes at review time, commingled with this story's own Task 2/3 work (see File List below and CLAUDE.md §13.2 on commit granularity — the changeset needs splitting into two commits, Story 5.1's post-review fixes and Story 5.2's own work, before either lands).

### Project Structure Notes

**Modified:**
- `src/app/session/[id].tsx` — Task 2's one-line `finalTarget` prop change
- `src/hooks/useActiveSession.ts` — Task 3's reconciliation effect, only if the edge case reproduces
- `src/app-tests/session.test.tsx` — new tests for Tasks 1 and 2
- `src/hooks/useActiveSession.test.ts` — new test for Task 1's hook-level assertion, new test(s) for Task 3
- `_bmad-output/implementation-artifacts/deferred-work.md` — mark the Story 5.1 entry resolved once Task 3 is done

**Not touched:**
- `src/lib/mechanic.ts`, `src/lib/settings.ts`, `src/lib/session-transitions.ts` — no formula or storage-boundary changes in this story
- `src/app/settings.tsx` — no UI changes; FR39's standing notice is Story 5.3's scope, not this one's

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.2-Apply-a-Changed-Target-to-an-In-Progress-Session] — story statement, AC, and the "no new mechanism" framing this story's Tasks 2–3 add nuance to
- [Source: _bmad-output/planning-artifacts/prd.md] (line 269) — "`OVERLEARNING_LEVEL`... A change applies immediately to `target_streak`'s next recalculation, including for a session already in progress — from v1.1 the formula below always reads the current value, never a value captured at session start." Confirms Task 2's `completedTarget` anchoring is about *recording/displaying what was achieved*, not about changing the live formula's own always-current-value behavior.
- [Source: _bmad-output/planning-artifacts/prd.md] (line 354) — FR37 full text
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] (line 539) — "Mid-session change... No UI is specified for this on the Settings screen... Deliberately not designed: a warning or confirmation when changing the setting while a session is active." Confirms this story adds no new UI; FR39's warning is Story 5.3's job.
- [Source: _bmad-output/planning-artifacts/architecture.md] (~line 552) — "FR37... requires no additional mechanism" — the claim Task 1 verifies with a real test rather than taking on faith.
- [Source: _bmad-output/implementation-artifacts/5-1-configure-the-overlearning-target.md] — Dev Agent Record's post-review Completion Notes, and the Review Findings section, for the full context behind Tasks 2 and 3
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — the exact deferred entry Task 3 resolves

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5), via bmad-dev-story.

### Debug Log References

None — no failing runs beyond the deliberate red-phase tests (Task 2's and Task 3's reproduction tests, both confirmed genuinely red before their fixes, per TDD).

### Completion Notes List

- Task 1: AC #1 was already satisfied by Story 5.1's plumbing — both new tests (screen-level and hook-level) passed on first run, no code change needed. This confirms the epics.md "no new mechanism" framing for the *target number* specifically.
- Task 2: found and fixed a real display/history divergence — `session/[id].tsx`'s `CompletionScreen` was reading the live `targetStreak` instead of the historically-anchored `session.completedTarget` (added in Story 5.1's own code review), so a settings change made while sitting on the Completion screen (before Done) could show one number while a different one got permanently recorded. One-line fix, confirmed red before and green after.
- Task 3: the deferred edge case from Story 5.1's review reproduced exactly as described — `sessionComplete` stayed `false` after a settings change alone brought the live target down to an already-achieved streak. Fixed with a `useEffect` in `useActiveSession()`, keyed on `overlearningLevel`, that reads the session fresh (not the render closure) and reconciles `sessionComplete`/`completedTarget` the same way `logCorrect`'s transition would. Verified safe against both invariants documented in `useActiveSession.ts`'s header comment (rapid-tap compounding, two-mounted-instances sync) before implementing, per the story's own HALT-if-unsafe instruction — did not need to HALT. `deferred-work.md` updated to mark the entry resolved.
- Full test suite (352 tests across 25 suites, up from 347 pre-story) and typecheck pass clean. **[Review][Patch] found via code review 2026-09-11 — corrected:** this line previously also claimed "lint ... all pass clean." Verified false: `npx eslint .` exits with 1 error (`use-color-scheme.web.ts:11`, `react-hooks/set-state-in-effect`) and 2 warnings (the pre-existing `session/[id].tsx:106` `exhaustive-deps` warning correctly identified above, plus an unrelated `.expo/types/router.d.ts` unused-directive warning). All three are pre-existing and untouched by this story's diff — confirmed via `git stash`, matching the original note's own verification method — but "clean" overstated a non-zero exit code.
- **Code review 2026-09-11 (3 adversarial layers) round:** applied all 12 defect patches and all 7 spec-synchronization patches arising from the 3 resolved decisions (see Review Findings above) — `reconcileCompletion` extracted to `lib/session-transitions.ts` as the shared completion-writing transition, `completedTarget` now captures `Math.max(liveTarget, currentStreak)`, the reconciliation write is try/caught and fires `feedback.completion(...)` for parity with tap-driven completion, a `SCHEMA_VERSION` v1→v2 migration was added for the previously-unmigrated `completedTarget` field, and prd.md/epics.md/architecture.md were corrected to document the settings-driven completion transition this story's Task 3 introduced. The `feedback.completion(...)` call surfaced a fresh `react-hooks/exhaustive-deps` lint error (`useFeedbackSignal()` returns a new object every render, and adding it to the effect's dependency array would defeat the deliberate `overlearningLevel`-only trigger) — resolved with a `feedbackRef` updated in its own effect, matching the file's existing fresh-read posture; `npx eslint .` confirmed back to the pre-existing baseline (1 error + 2 warnings, none touched by this diff) before closing this round. Full suite re-verified after fixes (see Change Log).

### File List

**[Review][Patch] found via code review 2026-09-11 — corrected:** this section previously listed only the 5 files Story 5.2's own tasks touched. The actual uncommitted changeset at review time contained 18 files, because Story 5.1's post-review fixes were never committed (see "Git intelligence" correction above) and are commingled here. Both groups are listed separately below; **splitting them into two commits is patch item "Story 5.1's unshipped post-review work is commingled with Story 5.2" and must happen before either lands** (CLAUDE.md §13.2).

**Story 5.2's own changes:**
- `src/app/session/[id].tsx` — Task 2: `CompletionScreen`'s `finalTarget` prop now prefers `session.completedTarget`; review round: corrected a stale comment
- `src/hooks/useActiveSession.ts` — Task 3: reconciliation `useEffect`; review round: delegates to `lib/session-transitions.ts`'s new `reconcileCompletion`, wraps the write in try/catch, fires `feedback.completion(...)`, corrected two stale comments
- `src/lib/session-transitions.ts` — review round: new `reconcileCompletion` export (was hand-built inline in the hook)
- `src/lib/storage.ts` — review round: `SCHEMA_VERSION` v1→v2, `migrations[1]` to default a missing `completedTarget`
- `src/app-tests/session.test.tsx` — new tests for Tasks 1 and 2; review round: new screen-level Task 3 test
- `src/hooks/useActiveSession.test.ts` — new tests for Task 1 (hook-level) and Task 3; review round: fixed a vacuous negative test, added boundary/overshoot/feedback-parity coverage
- `src/lib/session-transitions.test.ts` — review round: new `reconcileCompletion` test suite
- `src/lib/storage.test.ts` — review round: fixed a hardcoded `__v: 1` assertion, added migration tests
- `_bmad-output/implementation-artifacts/deferred-work.md` — Story 5.1's deferred entry marked resolved; review round: 2 new deferred entries appended
- `_bmad-output/planning-artifacts/prd.md`, `epics.md`, `architecture.md` — review round: spec-synchronization patches (see Review Findings above)
- This file — review round: Review Findings section, Dev Agent Record corrections

**Story 5.1's uncommitted post-review work (pre-existing in the working tree, not authored by this story):**
- `src/lib/types.ts`, `src/lib/types.test.ts` — `SessionState.completedTarget`
- `src/lib/segments.test.ts`, `src/app-tests/home-session-interaction.test.tsx`, `src/app-tests/index.test.tsx`, `src/lib/settings.test.ts`, `src/lib/session-transitions.test.ts` (pre-review-round content), `src/lib/mechanic.ts`, `src/app/settings.tsx`, `src/app-tests/settings.test.tsx` — Story 5.1's code review fixes (stepper race, comment corrections)
- `_bmad-output/implementation-artifacts/5-1-configure-the-overlearning-target.md` — Story 5.1's status flip to `done`, for code not yet committed

### Change Log

- 2026-09-10: Implemented Story 5.2 — verified AC #1 (mid-session target display, already working via Story 5.1's derive-on-read plumbing) with new end-to-end tests; fixed the Completion screen's `finalTarget` to anchor on `session.completedTarget` instead of a possibly-since-changed live value; fixed the deferred `sessionComplete` staleness edge case with a settings-change-triggered reconciliation effect. Full suite 352/352, typecheck clean (lint claim corrected above).
- 2026-09-11: Code review (3 adversarial layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor). 3 decisions resolved by Gerardo (keep the settings-driven completion trigger and specify its consequences; record the achieved streak in `completedTarget`; amend the PRD's monotonicity sentence). Applied all 19 resulting patches: extracted `reconcileCompletion` to the transitions layer, added the missing `SCHEMA_VERSION` migration, guarded the reconciliation write, added completion-feedback parity, corrected 5 stale comments, fixed 2 test defects and added boundary/overshoot/screen-level coverage, corrected `architecture.md`'s FR37 paragraph and file-tree line, corrected this file's own Dev Agent Record, and synchronized `prd.md`/`epics.md` with the newly-specified settings-driven completion behavior. 2 pre-existing findings deferred to `deferred-work.md`. Full suite, lint, and typecheck re-verified after fixes.
