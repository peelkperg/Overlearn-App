# Story 4.4: View a Segment's Solidification %

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see a segment's overall Solidification % on its history screen,
so that I can judge how reliably a passage has held up, not just read individual session entries.

## Acceptance Criteria

1. **Given** a segment has one or more completed sessions **When** its history log screen opens **Then** a summary line between the heading and the entry list shows "Solidification: {percent}%", computed as aggregate correct repetitions ÷ aggregate total repetitions across every completed session for that segment (FR38, UX-DR23)
2. **Given** a segment has zero completed sessions **When** its history log screen opens **Then** the summary line shows "Solidification: —", not "Solidification: 0%" (FR38)

[Source: _bmad-output/planning-artifacts/epics.md#Story-4.4-View-a-Segment's-Solidification-%]

## Tasks / Subtasks

- [x] Task 1: Render the summary line on the Segment Detail screen (AC #1, #2)
  - [x] In `src/app/segment/[id].tsx`, call `calculateSolidificationPercent(history)` (already implemented and hardened by Story 4.3, imported from `@/lib/history`) against the `history` array `useSegmentHistory(id)` already returns on this screen — **no new hook, no new subscription**. `useSegmentHistory` is already `useSyncExternalStore`-backed, so the summary line updates live if a session completes while this screen is mounted underneath the Active Session screen, for free.
  - [x] Render `<ThemedText testID="segment-detail-solidification" type="default">Solidification: {solidification === null ? '—' : `${Math.round(solidification)}%`}</ThemedText>` inside the existing `historySection` `View` (`testID="segment-detail-history"`), placed as the first child — immediately after the `"History"` `ThemedText type="smallBold"` heading and before the `history.length === 0 ? ... : <FlatList .../>` conditional. **Placement decision, not fully pinned by the spec:** `ux-design-specification.md`'s "Segment History Log Addition" section says the line sits "between the segment name heading and the list of entries," which is satisfied by either placing it right under the screen's top `segment.name` title or right under the `"History"` sub-heading — both sit strictly above the entries list. Chosen: directly under `"History"`, because that section is literally titled "Segment History Log Addition" (the summary belongs to the history log, not the top-of-screen identity block) and it keeps the line adjacent to the data it summarizes. Do not place it above the `segment.name` title or between the title and the Start button.
  - [x] `type="default"` (not `"small"`/`"smallBold"`), per the UX spec's "standard body/label type, not the large-numeral scale" instruction — matches the screen's Start button label weight, not the secondary/muted `HistoryEntryRow` detail text.
  - [x] Rounding: `Math.round(solidification)` for display. **Implementation-time decision, not specified anywhere** (PRD/architecture/UX spec all show only the example "Solidification: 78%," a whole number, with no rounding rule stated and no existing `Math.round`/`toFixed` precedent elsewhere in `src/`). Nearest-integer rounding is the ordinary reading of a bare "%" figure and avoids a false-precision decimal the spec never asked for. Note this in the PR/commit if you pick differently.
  - [x] No `accessibilityLiveRegion` and no custom `accessibilityLabel` — per `ux-design-specification.md`'s Accessibility (v1.1) section, this line "is read as ordinary text... no special announcement treatment needed, since it is static content, not a state change" (unlike the duplicate-confirmation notice or the in-progress-session notice, both of which do use `accessibilityLiveRegion="polite"`). Plain `<ThemedText>` is sufficient; a screen reader reads "Solidification: 78%" as ordinary text, "%" included, with no extra work needed to make it read as "78 percent."
  - [x] Do **not** touch the sort control (`SortControl.tsx`) or `lib/segments.ts`'s sort path — `ux-design-specification.md` line 620 is explicit that "this is deliberately the only place Solidification % is ever shown as a number; the sort menu (FR33) shows it only as a selected criterion, never its value." Story 4.3 already built the sort side against the same shared `calculateSolidificationPercent`; this story only adds the display consumer.

- [x] Task 2: Tests in `src/app-tests/segment-detail.test.tsx` (AC #1, #2)
  - [x] Zero completed sessions: renders `"Solidification: —"` (AC #2) — extend the existing "shows 'no completed sessions' when history is empty" test or add an adjacent one; don't duplicate the segment-creation boilerplate needlessly.
  - [x] One completed session, zero mistakes: renders `"Solidification: 100%"`.
  - [x] Two completed sessions with different attempt counts: renders the aggregate-ratio percent, not a naive average of the two sessions' individual percentages — construct a case where the two differ (e.g. one entry 1/1, one entry 0/9 → aggregate 10%, naive average 50%), mirroring `history.test.ts`'s existing `calculateSolidificationPercent` aggregation test at the screen-integration level. This is a regression guard for the screen's wiring, not a re-test of the math (already unit-tested in `lib/history.test.ts` since Story 4.3).
  - [x] Live update: with the screen already rendered and zero history, write a history entry via `writeHistoryEntry` (imported directly, same pattern `index.test.tsx`/`segment-detail.test.tsx` already use for `renameSegment`/`createSegment`) inside `act(async () => {...})`, then assert the summary line updates from `"Solidification: —"` to the new percent without remounting the screen — proves the "for free" live-update claim in Task 1 actually holds, not just in theory.
  - [x] A rounded value: an entry whose percent is not a whole number (e.g. 1/3 attempts correct → 33.33...%) renders the rounded integer (`"Solidification: 33%"`), locking the Task 1 rounding decision so a future change to `Math.floor`/`toFixed(1)`/etc. is a visible, intentional diff rather than a silent behavior change.

### Review Findings

Code review 2026-09-09, three parallel layers (Blind Hunter / Edge Case Hunter / Acceptance Auditor). Blind Hunter (no project context) raised 11 items, 9 dismissed as false positives against context it didn't have (Story 4.3's already-hardened `calculateSolidificationPercent` — non-finite/out-of-range results already return `null` or are clamped, so it cannot throw, return `NaN`, or render outside 0–100%; the em dash and "only numeric display" claims are spec-mandated, not unverified assertions; the app has no i18n anywhere, so that's out of scope). Edge Case Hunter returned zero findings (valid per its own spec — no unhandled paths reachable from the diff's changed lines). Acceptance Auditor found **no AC violations** — both ACs implemented verbatim, the em-dash/accessibility treatment matches `ux-design-specification.md` exactly, and the placement decision is a spec-permitted interpretation already documented in this story, not a deviation.

**Patches — all applied 2026-09-09:**

- [x] [Review][Patch] Added a value→different-value live-update test (a second completed session changing an already-shown 100% to 50%), alongside the existing null→value test [src/app-tests/segment-detail.test.tsx]
- [x] [Review][Patch] Removed the copy-pasted, unused `beforeEach(() => { pushed.mockClear(); })` from the new describe block [src/app-tests/segment-detail.test.tsx]
- [x] [Review][Patch] Added an exact-.5 rounding boundary test (1/8 = 12.5% → "13%"), locking the round-half-up direction [src/app-tests/segment-detail.test.tsx]
- [x] [Review][Patch] Factored the repeated `createSegment(...)` + `useLocalSearchParams.mockReturnValue(...)` setup into a shared `beforeEach`, per the story's own Task 2 guidance [src/app-tests/segment-detail.test.tsx]

### Review Findings — Second Pass (2026-09-10)

Re-review of the same code at **Opus 5** (the first pass ran at Sonnet 5), per the workflow's own recommendation to review with a different model than implemented. All three layers re-run on the current diff including the four first-pass patches. Substantially more signal than the first pass: Blind Hunter raised 18 (vs 11), Edge Case Hunter 6 (vs 0), Acceptance Auditor 7 (vs 2). **Still no AC violations in the production code** — both ACs independently re-verified against the current file, not taken from the prior pass's word. 14 dismissed as false positives (`NaN`/`Infinity`/`undefined` paths that Story 4.3's `Number.isFinite` guard and clamp already close; a "renders unconditionally when segment is undefined" claim contradicted by the enclosing `segment ? ... :` ternary; a module-cache staleness path closed by the unique-segment-id key plus the raw-string comparison; i18n and memoization, both ruled out project-wide) or house-convention noise.

**Decisions required (must resolve before patches) — both resolved 2026-09-10:**

- [x] **RESOLVED — reserve "100%" and "0%" for true values.** Only an exact `100` renders "100%" and only an exact `0` renders "0%"; every value strictly between clamps to `[1, 99]` (`Math.min(99, Math.max(1, Math.round(pct)))`). 99.5% now reads "99%" instead of a false "100%", and 0.33% reads "1%" instead of a "scored zero" 0%. The clamp lives in the display layer only — the sort path must keep consuming the true unrounded value, and per `ux-design-specification.md` line 620 this screen is the only numeric display, so no shared helper is warranted.
- [x] **RESOLVED — keep the summary line where it is.** The redundancy with "No completed sessions yet." appears only in the empty state, and AC #2 explicitly specifies the em dash for exactly that case; moving or hiding the line would risk contradicting a stated AC to fix a mild duplication. Recorded here so this is not re-litigated in a future review pass.

<details>
<summary>Original decision text (for the record)</summary>

- [ ] [Review][Decision] **`Math.round` misreports both ends of the range** — raised independently by all three layers, the strongest signal in this review. `Math.round(99.5) === 100` (verified), so 199 correct out of 200 attempts renders **"Solidification: 100%"** in an app whose entire premise is consecutive-perfect repetition — telling a user they are flawless when they are not. The symmetric case is the mirror of the em-dash rationale: 1 correct in 300 attempts (0.33%) renders **"Solidification: 0%"**, the exact string `prd.md` FR38 and `ux-design-specification.md` argue "would misread as 'scored zero'". No spec states a rounding rule — Task 1 chose `Math.round` as a documented implementation-time decision, so changing it is your call, not a silent patch. Options: (a) keep `Math.round` as-is and accept both boundary misreads; (b) clamp the display so only a true 100% shows "100%" and only a true 0% shows "0%" (e.g. `Math.floor` toward the nearest non-absolute value, or explicit `<1%` / `>99%` treatments); (c) `Math.floor` throughout, which fixes the false-100% but makes 99.9% read as "99%" and leaves sub-1% still showing 0%.
- [ ] [Review][Decision] **The summary line stacks redundantly with the empty state** — with zero completed sessions the user reads "Solidification: —" immediately above "No completed sessions yet." The em dash's whole justification is that it says "no data yet" without the "scored zero" misreading — but here the line below already says exactly that in words, making the em-dash line redundant at precisely the moment it was designed for. This was not considered when Task 1's placement decision was made (the ambiguity flagged then was only *which* heading it sits under). Options: (a) keep as-is; (b) move the line under the `segment.name` title instead — the other spec-permitted reading of "between the segment name heading and the list of entries," which separates it from the empty state; (c) hide the summary line entirely when `history.length === 0`, though that arguably contradicts AC #2, which explicitly specifies the em-dash rendering for the zero-session case.

</details>

**Patches:**

- [x] [Review][Patch] Implement the resolved rounding decision — reserve "100%"/"0%" for exact values, clamp everything strictly between to `[1, 99]`, with tests at both boundaries (99.5% → "99%", 0.33% → "1%") alongside the existing exact-100%/exact-0% cases [src/app/segment/[id].tsx; src/app-tests/segment-detail.test.tsx]

- [x] [Review][Patch] **A genuine 0% has no test** — the single most important AC #2 discrimination case. The em dash exists precisely because a real 0% must be distinguishable from no-data; verified the code does render "0%" correctly for 0-correct-of-9, but nothing tests it, so a regression collapsing a real `0` into the `null`/em-dash branch would pass all 12 tests [src/app-tests/segment-detail.test.tsx]
- [x] [Review][Patch] **The line's position is asserted by no test, and this story's own Completion Notes falsely claim it is** — the Completion Notes state placement is "locked by tests (implicitly, via the `segment-detail-solidification` testID's position in the render tree)". It is not: moving the line above the `segment.name` title, below the `FlatList`, or out of `segment-detail-history` entirely leaves all 12 tests green. This is the positional half of test-design C32 ("positioned between heading and entry list"), and it is unverified. Fix both the gap and the false claim [src/app-tests/segment-detail.test.tsx; this story file]
- [x] [Review][Patch] `toHaveTextContent` is substring-matching, so every assertion here is weaker than it reads — `'Solidification: —'` would also pass against `'Solidification: — (no data)'`. (The obvious `10%`/`100%` collision was checked and does not occur.) Anchor with a regex [src/app-tests/segment-detail.test.tsx]
- [x] [Review][Patch] Removing `pushed.mockClear()` last pass left `pushed` accumulating across the file — `jest.config.js` sets no `clearMocks`, so a future `router.push` assertion added to this block would silently inherit calls from the Story 1.4 describe above. Harmless today, a trap tomorrow; residue of a first-pass patch [src/app-tests/segment-detail.test.tsx]
- [x] [Review][Patch] Test fixtures mix garbage `sessionStartTimestamp: 's1'/'s2'` with real ISO-8601 values for the same field in the same block — `date` is now date-validated (Story 4.3) while `sessionStartTimestamp` is not, so these pass today but assert tolerance of malformed data nobody asked for [src/app-tests/segment-detail.test.tsx]
- [x] [Review][Patch] `traceability-matrix.md` still marks FR38 as **PLANNED** while this story reads `Status: done` — CLAUDE.md §13.4 spec synchronization. Outside the two-file diff but in scope for the story's closure [_bmad-output/test-artifacts/traceability-matrix.md]
- [x] [Review][Patch] The aggregate test's comment says it is "not a re-test of the math" and then hand-derives and asserts the arithmetic — tighten the wording to match what it actually does [src/app-tests/segment-detail.test.tsx]
- [x] [Review][Patch] The source comment cites "UX spec" with no identifier and asserts "this screen is its only numeric display" — the claim is true (`ux-design-specification.md` line 620) but uncited, against this codebase's convention of citing FR/story numbers two lines above [src/app/segment/[id].tsx]

**Deferred:**

- [x] [Review][Defer] A segment whose entries all have `totalAttempts: 0` yields `null`, rendering the em dash while history rows are visible below it — self-contradictory, but reachable only via shape-valid-but-nonsensical stored data: `isNonNegativeInteger` admits `0`, while a real completed session always has at least the minimum-5 target streak's worth of attempts [src/app/segment/[id].tsx] — deferred: not reachable through the app's own writes, and guarding it would add a display branch for a state the mechanic cannot produce

## Dev Notes

### Architecture compliance

- `architecture.md`'s "FR38: Solidification % Aggregation" section is the source of truth for `calculateSolidificationPercent` — **already implemented** in `src/lib/history.ts` by Story 4.3 (`null` for zero entries, aggregate-ratio formula, `Number.isFinite`/`Math.min(100, Math.max(0, ...))` clamp added during that story's code review). This story is a pure display consumer; it does not modify `lib/history.ts`. [Source: architecture.md#FR38:-Solidification-%-Aggregation]
- Per architecture.md's now-corrected note (Story 4.3's code review, 2026-09-08): the function returns `null`, not `0`, for "no data yet" — and per both `architecture.md` and `ux-design-specification.md`, this screen must render that `null` as an em dash (`"—"`), never the literal text `"0%"`. `prd.md`'s FR38 wording was itself corrected to match during that same review — do not resurrect the "shows 0%" phrasing that briefly existed in an earlier PRD draft.
- **This story does not touch the sort control, `lib/segments.ts`, or `useSegments.ts`.** Story 4.3 already wired `calculateSolidificationPercent` into the sort path via `buildSortAggregates`; this story adds a second, independent consumer of the same function for display. The two consumers deliberately disagree on how "no data" renders (sort floors it to `0` internally for ordering; this screen shows `"—"`) — that is correct and intentional per both specs, not a bug to reconcile.

### Existing code confirmed by direct inspection (not inferred)

- **`src/app/segment/[id].tsx`** (read in full): the screen already renders a `"History"` `ThemedText type="smallBold"` heading followed by either the empty-state text `"No completed sessions yet."` or a `FlatList` of `HistoryEntryRow`s, all inside a `View testID="segment-detail-history"`. The summary line is a new sibling inserted between the heading and that conditional — no restructuring of the existing empty-state/list branch needed.
- **`src/hooks/useSegmentHistory.ts`** (read in full): already `useSyncExternalStore`-backed against `lib/history.ts`'s `subscribeToHistory`/`readHistory`, specifically so the screen reflects a session completed while it stays mounted underneath the Active Session screen in the nav stack. The summary line computed from this same `history` value inherits that live-update behavior automatically — this is why Task 1 needs no new subscription.
- **`src/lib/history.ts`'s `calculateSolidificationPercent`** (read in full, current post-4.3 state): `(entries: HistoryEntry[]) => number | null`. Zero entries → `null`. Otherwise aggregates `correct`/`attempts` across all entries as one ratio (not an average of per-entry percentages), then returns `null` if the result is non-finite or clamps it to `[0, 100]` — both added during Story 4.3's code review as defense-in-depth for corrupted-storage inputs. Already covered by unit tests in `lib/history.test.ts` (null-for-empty, 100%-no-mistakes, fractional percent, multi-entry aggregation-not-average, zero-attempts-returns-null, non-finite-input-clamped) — this story's screen tests are integration-level, not a re-test of that math.
- **`src/components/HistoryEntryRow.tsx`** (read in full): the reference for this screen's existing typography choices — `smallBold` for the per-entry date, `small`/`textSecondary` for the per-entry detail line. The summary line intentionally does *not* match either (see Task 1's `type="default"` note) — it is one level more prominent than a per-entry detail line, per the UX spec's "standard body/label type" instruction, which is a step up from `HistoryEntryRow`'s secondary text but still below the screen's `title`/`subtitle` scale.

### Previous story intelligence (4.3)

- Story 4.3's code review hardened `isHistoryEntryArray` (non-negative-integer counters, `totalMistakes <= totalAttempts`, parseable `date`) specifically because corrupted history data was reaching `calculateSolidificationPercent`'s arithmetic and corrupting the *sort* comparator. That hardening lives at the storage-read boundary (`readHistory` → `getObject` → `isHistoryEntryArray`), so this story's screen automatically benefits from it without any new guard code — `useSegmentHistory`'s `history` array is already validated by the time it reaches this screen.
- Story 4.3 established the "resolve spec conflicts before building the dependent story" discipline for exactly this FR38 em-dash-vs-0% question — that conflict is now closed (em dash wins, all three specs agree, `prd.md` corrected). Do not re-open it or re-ask the user; the decision and its rationale are recorded in `architecture.md`'s FR38 section and Story 4.3's Review Findings.
- Both Story 4.1/4.2/4.3's `Status: done` files followed the same commit-granularity convention (explicit path staging, root-cause commit body, story-file `Dev Agent Record` update) — follow the same when this story is committed.

### Git intelligence

Last commit is `b0159cc` (Story 4.3, sort). No sprint-status.yaml exists in this project (confirmed absent, again, as of this story) — stories are tracked only via their own `Status:` field and this file's presence.

### Project Structure Notes

- **Modified:** `src/app/segment/[id].tsx` (summary line), `src/app-tests/segment-detail.test.tsx` (new tests).
- **Not touched:** `src/lib/history.ts`, `src/lib/segments.ts`, `src/hooks/useSegments.ts`, `src/hooks/useSegmentHistory.ts`, `src/components/SortControl.tsx` — all already correct/complete for this story's needs as of Story 4.3.
- No new files, no new routes, no new dependencies.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.4-View-a-Segment's-Solidification-%] — story statement and both ACs (verbatim above)
- [Source: _bmad-output/planning-artifacts/architecture.md#FR38:-Solidification-%-Aggregation] — `calculateSolidificationPercent` formula, null-vs-display rationale (as corrected by Story 4.3's code review)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Segment-History-Log-Addition:-Solidification-%-Summary] (~lines 609-620) — placement, em-dash-not-0% rationale, "only place shown as a number" scope boundary, type treatment
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility-(v1.1)] (~line 648) — "read as ordinary text... no special announcement treatment needed"
- [Source: _bmad-output/planning-artifacts/prd.md] — FR38 (verbatim, em-dash wording as corrected 2026-09-08)
- [Source: _bmad-output/test-artifacts/test-design-epic-4-5.md] — R10 (null-vs-zero boundary, already mitigated by Story 4.3's unit tests), C31 (already covered), C32 (this story's screen-level coverage target)
- [Source: _bmad-output/project-context.md] — `useSyncExternalStore` fresh-read rule, co-located vs. `app-tests/` rule, RNTL v14 async-API rule

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

None — implementation went straight to green on the first pass, no failed approaches to record.

### Completion Notes List

- Both ACs implemented and covered by tests: a summary line shows the aggregate-ratio Solidification % for a segment with completed sessions (AC #1), and an em dash — not "0%" — for a segment with none (AC #2).
- No changes to `lib/history.ts`, `lib/segments.ts`, `useSegments.ts`, `useSegmentHistory.ts`, or `SortControl.tsx` — this story is a pure display consumer of `calculateSolidificationPercent`, already implemented and hardened by Story 4.3. `useSegmentHistory`'s existing `useSyncExternalStore` subscription gives the summary line live updates with no new subscription code.
- Two implementation-time decisions made per the story's Dev Notes (neither is a spec conflict — both are UI details the specs left open): the summary line is placed directly under the "History" sub-heading rather than under the top segment-name title, and its value is rounded with `Math.round` (no rounding rule is specified anywhere in prd.md/architecture.md/ux-design-specification.md, and no `Math.round`/`toFixed` precedent existed elsewhere in `src/`). Rounding is locked by tests explicitly (the 1/3 → 33% test and the 1/8 → 13% exact-.5 test). Placement is now locked by a `within(historySection).getByTestId(...)` containment test (added in the second-pass review).
- Full regression suite: 271/271 tests passing (up from 266 pre-story), `tsc --noEmit` clean, lint clean (0 new issues; the same 1 pre-existing error + 1 pre-existing warning in unrelated files, unchanged from before this story).
- **Post-review update (2026-09-09):** all 4 first-pass patches applied — 2 new tests (value→value live update, exact-.5 rounding boundary) and 2 test-file cleanups (shared `beforeEach`, removed `pushed.mockClear()`). Full regression suite: 273/273 passing.
- **Post-review update (2026-09-10):** all 9 second-pass patches applied — clamped rounding (`formatSolidification` helper, `Math.round` replaced), 4 new tests (99.5%→"99%", 0.33%→"1%", genuine 0%, position containment), restored `pushed.mockClear()`, anchored all `toHaveTextContent` assertions with regex, fixed sessionStartTimestamp garbage values, fixed aggregate test comment, updated source comment citation to `ux-design-specification.md` line 620, updated traceability-matrix.md FR38 PLANNED→done. Full regression suite: 277/277 passing, `tsc --noEmit` clean.

### File List

**Modified:**
- `src/app/segment/[id].tsx` (Solidification % summary line; `formatSolidification` helper with clamped-boundary rounding; source comment citation updated)
- `src/app-tests/segment-detail.test.tsx` (+11 tests total after both review passes: em dash, 100%, aggregate-ratio, rounding, exact-.5, 99.5%→"99%", 0.33%→"1%", genuine 0%, position containment, null→value live update, value→value live update; `within` import added; `pushed.mockClear()` restored; all `toHaveTextContent` anchored with regex; `sessionStartTimestamp` fixtures corrected to ISO-8601)
- `_bmad-output/test-artifacts/traceability-matrix.md` (FR38 PLANNED → done)

### Change Log

- 2026-09-09: Implemented Story 4.4 in full (Tasks 1–2) — Solidification % summary line on the Segment Detail screen, computed from the existing `calculateSolidificationPercent`/`useSegmentHistory` with no new hook or subscription. Status: ready-for-dev → review.
- 2026-09-09: Code review (3 layers) found 0 AC violations. Applied all 4 patches — added a value→value live-update test and an exact-.5 rounding-boundary test, removed dead `beforeEach` setup, factored repeated segment/mock setup into a shared `beforeEach`. Status: review → done.
