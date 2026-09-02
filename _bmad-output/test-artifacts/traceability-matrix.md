---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-09-02'
tempCoverageMatrixPath: 'C:\Users\USER\.claude\jobs\90463c9c\tmp\tea-trace-coverage-matrix-2026-09-02T03-18-14.json'
gateStatus: 'FAIL'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources: ['_bmad-output/planning-artifacts/epics.md', '_bmad-output/planning-artifacts/prd.md']
externalPointerStatus: 'not_used'
---

# Traceability Matrix: Overlearn

**Author:** Claude (Master Test Architect), for Gerardo
**Date:** 2026-09-02
**Project:** Overlearn

**Post-hoc note (2026-09-02, later same day):** FR5 (Archive a segment) was removed from the product after this matrix was generated — see `epics.md`. FR5's row below is marked N/A and excluded from every count. **The Step 4/Step 5 statistics tables and gate decision below still reflect the original 29-FR run and were not recomputed** — recomputing them correctly means re-running `bmad-testarch-trace`, not hand-editing aggregate numbers. Treat this file's narrative/per-FR findings as current, and its summary percentages/gate verdict as one FR-count off (28 real FRs now, not 29) until the next full trace run.

## Step 1: Coverage Oracle Resolution

**Resolved oracle:** Formal requirements — `epics.md`'s Requirements Inventory (FR1–FR29, NFR1–NFR9) plus each story's own Acceptance Criteria (Stories 1.1–3.1, all 17 implemented). This is the strongest available oracle: every FR is already individually numbered, and every story's AC already states its Given/When/Then in testable form. No inference or synthetic journey construction was needed.

**Confidence:** High. The FR list is authored, numbered, and stable (unchanged since planning); it was not modified during this session's code review — only two unrelated version-string corrections landed in `architecture.md`/`epics.md`.

**Why not other oracle types:** No OpenAPI/contract artifacts exist (the app has no API — fully offline). No external pointers (no Jira/Linear/etc. in this repo). Synthetic journey inference was unnecessary since a complete formal oracle already exists.

**Supporting artifacts loaded:**
- `_bmad-output/planning-artifacts/epics.md` — FR1–FR29, NFR1–NFR9, all 17 story ACs
- `_bmad-output/planning-artifacts/prd.md` — requirement rationale/context
- `_bmad-output/planning-artifacts/architecture.md` — implementation patterns (informs test-level selection)
- `_bmad-output/test-artifacts/test-design-qa.md` — prior pre-implementation risk-based test plan (2026-08-31); superseded by this trace for FR-level status, still authoritative for risk scoring methodology
- `_bmad-output/test-artifacts/test-design-architecture.md` — risk detail behind the above
- `_bmad-output/review-artifacts/code-review-epic-*.md`, `code-review-fix-commits-2026-09-01.md` — this session's adversarial code review; several fixes there added or renamed tests since `test-design-qa.md` was written

## Step 2: Test Discovery & Cataloging

**Test dir:** `src/**/*.test.{ts,tsx}` — 14 files, 134 passing tests (`npm test`, full run, 2026-09-02), 0 skipped/pending/fixme (verified: no `.skip(`, `.todo(`, `xit(`, `xdescribe(` anywhere in the suite).

**Levels present:** Unit and Component only. No E2E level exists — no Maestro/Detox/on-device automation is configured anywhere in the repo (confirmed: no `.maestro/` directory). No API level applies — the app is fully offline with no network layer (NFR8), so "API coverage" as a heuristic is not applicable.

| File | Level | Tests (≈) | Covers |
|---|---|---|---|
| `src/lib/mechanic.test.ts` | Unit | 12 (incl. `it.each`) | `calculateTargetStreak` boundary table |
| `src/lib/session-transitions.test.ts` | Unit | 20 | Pure state-transition functions (start/logCorrect/logIncorrect/restart) |
| `src/lib/segments.test.ts` | Unit | ~30 (incl. `it.each`) | Segment CRUD, disambiguation, deletion cascade, corrupt-storage recovery |
| `src/lib/history.test.ts` | Unit | 6 | History read/write, sessionStartTimestamp dedup |
| `src/lib/storage.test.ts` | Unit | 10 | MMKV wrapper, quarantine-on-corruption |
| `src/lib/types.test.ts` | Unit | 7 (incl. `it.each`) | `isSessionState` shape guard, NaN/Infinity rejection |
| `src/app-tests/stack-screens.test.ts` | Unit | 5 (incl. `it.each`) | Route-coverage regression guard (STACK_SCREENS) |
| `src/hooks/useActiveSession.test.ts` | Component (hook) | ~25 | Session lifecycle, rapid-tap race regression, storage-sync regression |
| `src/hooks/useActiveSession.interruption.test.ts` | Component (hook, simulated) | 3 | Interruption/relaunch state restoration (simulated remount, not real OS kill) |
| `src/hooks/useSegmentHistory.test.ts` | Component (hook) | 3 | Per-segment history read |
| `src/components/SegmentForm.test.tsx` | Component | 6 | Create-form validation, double-submit guard, a11y |
| `src/components/SegmentListItem.test.tsx` | Component | 6 | Row open/archive/delete menu |
| `src/components/session/useFeedbackSignal.test.ts` | Component (hook) | 3 | Feedback tier reset, timer cleanup, guarded native calls |
| `src/app-tests/index.test.tsx` | Component (screen) | 6 | Home screen: empty state, create CTA, live list sync, archive/delete |

**Coverage heuristics:**
- **Auth/authz:** N/A — no accounts exist by design (NFR9).
- **API endpoints:** N/A — zero network calls anywhere (NFR8).
- **Error-path coverage:** present — `SegmentForm.test.tsx` (empty-name validation, invisible-character rejection), `segments.test.ts` (throws on missing id, corrupt-storage quarantine), `stack-screens.test.ts` (route-coverage guard).
- **UI state coverage:** empty state tested (`index.test.tsx`); loading state — no explicit loading UI exists in this app (all reads are synchronous MMKV, no async fetch), so no gap here; validation-error state tested (`SegmentForm.test.tsx`).
- **UI journey coverage:** every screen (`index`, `segment/new`, `segment/[id]`, `session/[id]`) has at least one component-level test exercising it, but **no journey is tested end-to-end across screen boundaries** — each test renders one screen in isolation with mocked/direct navigation calls, not a real multi-screen flow. This is the main structural gap Step 3 will need to score against the FRs that specifically depend on cross-screen or cross-process behavior (interruption/recovery, FR23–FR26).

**Correction on closer inspection — this understated the gap.** Only `src/app/index.tsx` (Home) actually has a screen-level render test (`app-tests/index.test.tsx`). `src/app/segment/[id].tsx`, `src/app/segment/new.tsx`, and `src/app/session/[id].tsx` have **no test file at all** — nothing renders them. And none of these leaf UI components have a test file either: `CorrectButton.tsx`, `IncorrectButton.tsx`, `StreakReadout.tsx`, `RestartControl.tsx`, `RestartConfirmDialog.tsx`, `CompletionScreen.tsx`, `ResumeDiscardDialog.tsx`, `HistoryEntryRow.tsx`. The pure-logic layer underneath them (`lib/mechanic.ts`, `lib/session-transitions.ts`, `hooks/useActiveSession.ts`) is thoroughly unit-tested, but nothing in the suite renders the actual screens a user taps. This is not hypothetical: both real-device bugs found earlier in this project (the splash overlay silently swallowing every touch; `router.push` silently dropped with no Stack ancestor) were exactly this class of defect — invisible to a suite that never renders the composed app — and neither would have been caught by the current test suite even today.

## Step 3: Requirements-to-Test Traceability Matrix

**Legend:** FULL = both logic and the screen/component that delivers it to the user are tested · PARTIAL = some but not all aspects covered · UNIT-ONLY = the underlying logic is tested but the screen/component the user actually interacts with is not · NONE = no automated test

### Segment Management

| FR | Requirement | Test(s) | Status |
|---|---|---|---|
| FR1 | Create named segment | `segments.test.ts:11,24,29` (unit); `SegmentForm.test.tsx:6,16,26,37` (component) | **PARTIAL** — create + validation covered; `segment/new.tsx`'s own error-handling path (added in code review: catch a write failure, show error, allow retry) has no test |
| FR2 | View segment list | `app-tests/index.test.tsx:43` | **FULL** |
| FR3 | Select segment to practice/review history | `SegmentListItem.test.tsx:24` (row tap callback only); `app-tests/index.test.tsx` (row renders) | **PARTIAL** — selecting in the list is tested; the resulting Segment Detail screen (Start action + history) is not rendered by any test |
| FR4 | Unlimited segments, independent state | `app-tests/index.test.tsx:43` | **FULL** |
| FR5 | ~~Archive a segment~~ — **REMOVED post-implementation (2026-09-02)**, see epics.md. Row and its former test citations kept for the historical record only; excluded from the counts below. | — | **N/A** |
| FR6 | Delete a segment | `segments.test.ts:212,220,45` (cascade); `SegmentListItem.test.tsx:48`; `app-tests/index.test.tsx:76` | **FULL** |
| FR7 | Empty-state create prompt | `app-tests/index.test.tsx:26` | **FULL** |

### Practice Session Lifecycle

| FR | Requirement | Test(s) | Status |
|---|---|---|---|
| FR8 | Start session, no upfront input | `useActiveSession.test.ts:19` | **UNIT-ONLY** — hook tested; `segment/[id].tsx`'s Start button and `session/[id].tsx`'s initial render are not |
| FR9 | Initial target established before first repetition | `session-transitions.test.ts:28` | **UNIT-ONLY** |
| FR10 | Target recalculated on incorrect | `mechanic.test.ts:10`; `session-transitions.test.ts:101,106`; `useActiveSession.test.ts:92,110,126` | **UNIT-ONLY** |
| FR11 | Target never falls below TARGET_FLOOR | `mechanic.test.ts:4,10,22,32` | **FULL** — pure-formula guarantee, fully covered where it matters |
| FR12 | Session auto-completes at target | `session-transitions.test.ts:81,88`; `useActiveSession.test.ts:213` | **UNIT-ONLY** |
| FR13 | Completion summary (segment, target, correct, incorrect, attempts) | `session-transitions.test.ts:41,47` (data fields only) | **PARTIAL** — the data is unit-tested; `CompletionScreen.tsx` (what actually renders these 5 fields) has no test at all |
| FR14 | Done writes history entry | `history.test.ts:13`; cascade in `segments.test.ts:45` | **UNIT-ONLY** — `session/[id].tsx`'s `handleDone` (the actual wiring: build entry, write, clear session, navigate) is untested |
| FR15 | Repeat starts new session immediately | `useActiveSession.test.ts:19,372` (start() behavior only) | **UNIT-ONLY** — `session/[id].tsx`'s `handleRepeat` is untested |

### Active Session Interaction

| FR | Requirement | Test(s) | Status |
|---|---|---|---|
| FR16 | Log a correct repetition | `useActiveSession.test.ts:51`; `session-transitions.test.ts:35` | **UNIT-ONLY** — `CorrectButton.tsx` has no test |
| FR17 | Log an incorrect repetition | `useActiveSession.test.ts:92`; `session-transitions.test.ts:101` | **UNIT-ONLY** — `IncorrectButton.tsx` has no test |
| FR18 | Correct/Incorrect transitions per Mechanic Spec | `session-transitions.test.ts` (comprehensive, lines 35–112) | **FULL** — inherently a logic requirement, fully exercised |
| FR19 | No undo affordance | — | **NONE** — no test asserts the absence of an undo control; true by omission in the code, not verified |
| FR20 | Restart resets all four fields | `session-transitions.test.ts:137`; `useActiveSession.test.ts:157` | **UNIT-ONLY** — `RestartControl.tsx`/`RestartConfirmDialog.tsx` untested; does tapping Restart actually show the dialog? |
| FR21 | Confirmation required before reset | — | **NONE** — the confirm gate deliberately lives in `RestartConfirmDialog.tsx`/`session/[id].tsx` per the code's own comments ("The confirm gate (FR21) lives in the screen/dialog, not here"), and that exact layer has zero test coverage. The dialog's required text ("Restart session? Progress will be lost.") is asserted nowhere. |
| FR22 | Input locked out once complete | `useActiveSession.test.ts:233` | **PARTIAL** — hook-level lockout is fully tested; whether the real Correct/Incorrect/Restart controls are actually disabled/hidden on the rendered Completion screen is untested |

### Session Interruption & Recovery

| FR | Requirement | Test(s) | Status |
|---|---|---|---|
| FR23 | Full state preserved on background/kill | `useActiveSession.interruption.test.ts:26,64` | **PARTIAL** — simulated (unmount/remount a hook and re-read storage), not a real OS-level background/kill; the EAS build now in your hands is the first real check |
| FR24 | Always prompted resume/discard, never silent | — | **NONE** — `ResumeDiscardDialog.tsx` has no test file; `app-tests/index.test.tsx` never renders or asserts the dialog appears. This is the FR explicitly reinforced by this session's `onRequestClose` fix, and it has zero automated coverage. |
| FR25 | Resume restores exact prior state | `useActiveSession.interruption.test.ts:83` (storage round-trip only) | **PARTIAL** — proves the data survives; does not prove tapping Resume in the real dialog navigates and renders that state |
| FR26 | Discard clears state, no history written | `useActiveSession.test.ts:282,295` (`endSession()` only) | **PARTIAL** — the hook function is tested; `ResumeDiscardDialog`'s `onDiscard` wiring in `index.tsx` is untested |

### Practice History

| FR | Requirement | Test(s) | Status |
|---|---|---|---|
| FR27 | Chronological list of completed sessions | `useSegmentHistory.test.ts:18` | **UNIT-ONLY** — `HistoryEntryRow.tsx` and `segment/[id].tsx`'s `FlatList` rendering are untested |
| FR28 | Entry shows date/target/mistakes/attempts | `history.test.ts:13,25` (data shape only) | **PARTIAL** — data is guaranteed; `HistoryEntryRow.tsx` (what actually displays these 4 fields) has no test |
| FR29 | Non-completed sessions excluded from history | — (structurally true: `session-transitions.ts` never imports `history.ts`) | **NONE** — true by construction, not verified by an automated negative-path test |

### Summary

| Status | Count | FRs |
|---|---|---|
| FULL | 6 (was 7) | FR2, FR4, FR6, FR7, FR11, FR18 (FR5 removed, see note above) |
| PARTIAL | 8 | FR1, FR3, FR13, FR22, FR23, FR25, FR26, FR28 |
| UNIT-ONLY | 10 | FR8, FR9, FR10, FR12, FR14, FR15, FR16, FR17, FR20, FR27 |
| NONE | 4 | FR19, FR21, FR24, FR29 |

Total: 28 active FRs traced (FR1–FR29, FR5 removed post-implementation). FR19 and FR29 are negative/absence requirements, harder to test in the conventional sense — their NONE status is lower-priority than FR21 and FR24, which are real, actionable gaps in observable behavior.

### Coverage Logic Validation

- **P0/P1 items have coverage:** mostly true, with one violation worth flagging now rather than waiting for Step 4. `test-design-qa.md` (the pre-implementation plan) scored FR24's story (2.10, resume/discard) as **P0-007**, explicitly calling it "the highest-complexity conditional in the app." That FR is now **NONE**. A P0-rated requirement having zero coverage is exactly the kind of thing this validation step exists to catch.
- **No duplicate coverage across levels without justification:** none found — where both unit and component tests exist for the same FR (e.g. FR5, FR6), they test different things (data mutation vs. UI wiring), not the same assertion twice.
- **Items are not happy-path-only when error handling is implied:** FR1 is the clearest case — its screen-level error-handling path (added during this session's code review, for a write failure on segment creation) has no test, while the happy path does.
- **Auth/authz negative-path tests:** N/A, no auth exists.
- **Synthetic UI journeys not marked FULL without E2E/component proof:** N/A — oracle was formal requirements, not synthetic journeys; but the same principle applies to UNIT-ONLY/PARTIAL items above, which is exactly why they aren't marked FULL despite passing unit tests.

## Step 4: Gap Analysis & Coverage Statistics

**Priority assignment:** each FR scored against `test-priorities-matrix.md` (P0 = data integrity/previously-broken/hard blocker to core use; P1 = core journeys/complex logic; P2 = secondary/edge; P3 = low-risk polish), cross-checked against `test-design-qa.md`'s existing R1/R4/R6 risk scoring where it overlaps. Full priority assignment recorded in the coverage matrix JSON (`tempCoverageMatrixPath` above).

**Execution mode:** sequential — 29 requirements is well under the scale where subagent/agent-team parallelization would pay for its own overhead.

### Coverage Statistics

| | Total | FULL | UNIT-ONLY | PARTIAL | NONE | % Fully Covered |
|---|---|---|---|---|---|---|
| **P0** | 12 | 2 | 7 | 2 | 1 | **17%** |
| **P1** | 14 | 3 | 3 | 6 | 2 | **21%** |
| **P2** | 3 | 2 | 0 | 0 | 1 | 67% |
| **P3** | 0 | — | — | — | — | — |
| **Overall** | 29 | 7 | 10 | 8 | 4 | **24%** |

**The P0 number is the one to sit with.** Only 2 of 12 critical requirements have a test that actually renders the screen a user interacts with. The other 10 are either logic-only (7) or partially covered (2) or completely untested (1 — FR24). This isn't a subtle statistical artifact — it's the direct, measured consequence of the gap Step 2 surfaced: a very well-tested logic core (`lib/`, `hooks/useActiveSession`) sitting under almost-untested screens.

### Gap Analysis

**Critical gap (P0, NONE):**
- **FR24** — "User is prompted to resume or discard an interrupted session on relaunch... never silently resumed or discarded." `ResumeDiscardDialog.tsx` has no test file. Nothing in the suite renders it or asserts it appears. This is the single highest-priority gap in the whole matrix, and notably the same FR this session's code review already treated as high-stakes enough to fix its `onRequestClose` behavior — fixed in the code, unverified by any test.

**High gaps (P1, NONE):**
- **FR21** — confirmation gate before session reset. Lives in `RestartConfirmDialog.tsx` per the code's own comment; that component has zero tests, and its required exact text ("Restart session? Progress will be lost.") is asserted nowhere.
- **FR29** — non-completed sessions excluded from history. True by construction (`session-transitions.ts` never imports `history.ts`), but no test proves it — a future refactor could silently break this with no test to catch it.

**Medium gap (P2, NONE):**
- **FR19** — no-undo constraint. Lowest actionable priority: this is an absence-of-feature claim, awkward to test conventionally, and P2 because the app's architecture (no undo state exists anywhere) makes accidental regression unlikely.

**Coverage heuristics:**
- **UI journey gaps (3):** `segment/[id].tsx`, `segment/new.tsx`, `session/[id].tsx` — the three route screens with no render test of any kind.
- **UI state gaps (8 components):** `ResumeDiscardDialog`, `RestartConfirmDialog`, `CompletionScreen`, `HistoryEntryRow`, `CorrectButton`, `IncorrectButton`, `StreakReadout`, `RestartControl` — no component test exists for any of them.
- **Happy-path-only (1):** FR1's screen-level write-failure error path (added during this session's code review) is untested; only the happy path and the form-level validation are.
- No endpoint or auth/authz gaps — neither applies to this app.

### Recommendations

| Priority | Action | Affects |
|---|---|---|
| **URGENT** | Add component coverage for `ResumeDiscardDialog.tsx`, rendering `app/index.tsx`'s resume/discard path for real | FR24 |
| **HIGH** | Add `RestartConfirmDialog.tsx` coverage (exact text, Cancel leaves state unchanged) + a negative-path test proving Restart writes zero history entries | FR21, FR29 |
| **HIGH** | Add screen-level render tests for the three untested route screens — this is the same class of defect that already caused two real production bugs in this project (splash overlay, navigation Stack) | FR3, FR8, FR13, FR16, FR17, FR20, FR27 |
| **MEDIUM** | Close the 8 PARTIAL items — these are the closest to done, mostly needing a rendering-layer test on top of already-solid data-layer coverage | FR1, FR3, FR13, FR22, FR23, FR25, FR26, FR28 |
| **LOW** | Run a test-quality review pass once the above close | — |

**Full machine-readable coverage matrix:** `C:\Users\USER\.claude\jobs\90463c9c\tmp\tea-trace-coverage-matrix-2026-09-02T03-18-14.json`

## Step 5: Gate Decision

**Gate eligible:** yes (`allow_gate=true`, `collection_status=COLLECTED`)

### Gate Decision: **FAIL**

**Rationale:** P0 coverage is 17% (required: 100%). 1 critical requirement uncovered (FR24).

| Criterion | Required | Actual | Status |
|---|---|---|---|
| P0 coverage | 100% | 17% | ❌ NOT MET |
| P1 coverage | 90% target / 80% minimum | 21% | ❌ NOT MET |
| Overall coverage | 80% minimum | 24% | ❌ NOT MET |

This gate decision evaluates **test coverage against the FR list**, not code correctness — the code review already run this session confirmed the underlying implementation is sound (134 tests passing, `tsc` clean, all patches applied). What FAILs here is narrower and more specific: whether an automated test would *catch a regression* in most of these requirements if one were introduced tomorrow. For 22 of 29 FRs (everything short of FULL), the honest answer is "not reliably" — either because the test only reaches the logic layer, not the screen a user taps, or because no test exists at all.

**Machine-readable outputs:**
- `C:\Users\USER\.claude\jobs\90463c9c\tmp\e2e-trace-summary.json`
- `C:\Users\USER\.claude\jobs\90463c9c\tmp\gate-decision.json`

**Full report:** `_bmad-output/test-artifacts/traceability-matrix.md` (this file)

