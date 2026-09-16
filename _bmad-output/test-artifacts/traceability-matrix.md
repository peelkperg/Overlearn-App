---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-09-03'
gateStatus: 'WAIVED'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources: ['_bmad-output/planning-artifacts/epics.md', '_bmad-output/planning-artifacts/prd.md']
externalPointerStatus: 'not_used'
v1.1:
  stepsCompleted: ['v1.1-step-01-load-context', 'v1.1-step-02-discover-tests', 'v1.1-step-03-map-criteria', 'v1.1-step-04-analyze-gaps', 'v1.1-step-05-gate-decision']
  lastStep: 'v1.1-step-05-gate-decision'
  lastSaved: '2026-09-12'
  gateStatus: 'PASS'
  coverageBasis: 'acceptance_criteria'
  oracleConfidence: 'high'
  oracleResolutionMode: 'formal_requirements'
  oracleSources: ['_bmad-output/planning-artifacts/epics.md', '_bmad-output/planning-artifacts/prd.md', '_bmad-output/implementation-artifacts/5-2-apply-a-changed-target-to-an-in-progress-session.md']
  externalPointerStatus: 'not_used'
---

# Traceability Matrix: Overlearn (Re-run)

**Author:** Claude (Master Test Architect), for Gerardo
**Date:** 2026-09-03
**Project:** Overlearn

**This run supersedes the 2026-09-02 matrix.** That run returned gate **FAIL** (P0 coverage 17%) before this session's work; since then: URGENT/HIGH gaps closed (5 new screen-level test files, resume/discard and restart-confirm coverage), three real bugs found and fixed (false resume prompt + blank-screen dead end on Start, Restart button under the Android nav bar, Android Auto Backup silently defeating uninstall), FR5 (Archive) removed from the product, and — the single biggest change — a full 31-script on-device UAT pass completed and re-verified against the fixed build. The FAIL verdict is fully stale; this run reflects current reality.

## Step 1: Coverage Oracle Resolution

**Resolved oracle:** Formal requirements — `epics.md`'s Requirements Inventory (FR1–FR29 minus FR5, removed; NFR1–NFR9) plus each story's Acceptance Criteria. Same oracle as the prior run; unchanged in kind, only in content (FR5 struck).

**Confidence:** High — unchanged from the prior run's reasoning.

**Supporting artifacts loaded:** `epics.md`, `prd.md`, `architecture.md`, `test-design-qa.md`, `test-design-architecture.md`, `_bmad-output/test-artifacts/uat-scripts.md` (new input this run — the on-device layer the prior run identified as the largest gap).

## Step 2: Test Discovery & Cataloging

**Jest suite:** `src/**/*.test.{ts,tsx}` — **21 files, 162 passing tests** (`npm test`, full run, 2026-09-03), 0 skipped. Up from 14 files / 134 tests at the prior trace.

**New since the prior run:** `ResumeDiscardDialog.test.tsx`, `RestartConfirmDialog.test.tsx`, `RestartControl.test.tsx`, `segment-detail.test.tsx`, `segment-new.test.tsx`, `session.test.tsx`, `home-session-interaction.test.tsx` (renders Home and Active Session together in one tree — the exact cross-screen gap that caught the Start/false-prompt bug). `segments.test.ts`, `SegmentListItem.test.tsx`, `index.test.tsx`, `useActiveSession.test.ts` extended.

**New this run — the on-device layer:** `uat-scripts.md`, **31 active scripts, 100% passing** on build `5a47a7a5` (`main` @ `2cd9fa2`), including full re-verification of all three fixed bugs via each one's original repro procedure. This is the layer that closes what the prior trace called "no test that actually renders the screen a user taps" — UAT goes one step further than screen-level Jest tests, exercising the real OS (backgrounding, process kill, real touch, real accessibility services).

**Levels present:** Unit, Component (Jest/RNTL), and now Manual/On-device (UAT) — filling the prior gap in lieu of the Maestro E2E suite that was planned and never built.

## Step 3: Requirements-to-Test Traceability Matrix

**Legend:** FULL = automated test and/or on-device UAT together fully confirm it · FULL (UAT) = confirmed on real hardware; no automated test exists because the requirement is an absence-of-feature or environment-level property that doesn't lend itself to one · PARTIAL = a real, named gap remains · NONE = no coverage

### Segment Management

| FR | Requirement | Test(s) | Status |
|---|---|---|---|
| FR1 | Create named segment | `segments.test.ts`; `SegmentForm.test.tsx`; `segment-new.test.tsx` (screen-level, incl. write-failure/retry path); UAT-01, UAT-02 | **FULL** |
| FR2 | View segment list | `index.test.tsx`; UAT-01, UAT-03 | **FULL** |
| FR3 | Select segment to practice/review | `SegmentListItem.test.tsx`; `segment-detail.test.tsx` (screen-level, added this session); UAT-04 | **FULL** |
| FR4 | Unlimited segments, independent state | `index.test.tsx`; UAT-03 | **FULL** |
| FR5 | ~~Archive a segment~~ | — | **REMOVED**, see `epics.md` |
| FR6 | Delete a segment | `segments.test.ts` (cascade); `SegmentListItem.test.tsx`; `index.test.tsx`; UAT-06 | **FULL** |
| FR7 | Empty-state create prompt | `index.test.tsx`; UAT-01 | **FULL** |

### Practice Session Lifecycle

| FR | Requirement | Test(s) | Status |
|---|---|---|---|
| FR8 | Start session, no upfront input | `session.test.tsx` (screen-level, added this session); UAT-07 | **FULL** |
| FR9 | Initial target established | `session-transitions.test.ts`; `session.test.tsx`; UAT-07 | **FULL** |
| FR10 | Target recalculated on incorrect | `mechanic.test.ts`; `session-transitions.test.ts`; `session.test.tsx`; UAT-09, UAT-10 | **FULL** |
| FR11 | Target never below floor | `mechanic.test.ts` (full boundary table); UAT-09 | **FULL** |
| FR12 | Auto-completes at target | `session-transitions.test.ts`; `session.test.tsx`; UAT-13 | **FULL** |
| FR13 | Completion summary | `session.test.tsx`; UAT-14 | **FULL** |
| FR14 | Done writes history | `session.test.tsx`; `history.test.ts`; UAT-15 | **FULL** |
| FR15 | Repeat starts new session | `session.test.tsx`; UAT-16 | **FULL** |

### Active Session Interaction

| FR | Requirement | Test(s) | Status |
|---|---|---|---|
| FR16 | Log correct | `useActiveSession.test.ts`; `session.test.tsx`; UAT-08 | **FULL** |
| FR17 | Log incorrect | `useActiveSession.test.ts`; `session.test.tsx`; UAT-09 | **FULL** |
| FR18 | Correct/Incorrect transitions per spec | `session-transitions.test.ts` (comprehensive) | **FULL** |
| FR19 | No undo affordance | UAT-11 (real device, looked for and found none) | **FULL (UAT)** — inherently hard to unit-test an absence; on-device check is the meaningful one |
| FR20 | Restart resets all 4 fields | `session-transitions.test.ts`; `useActiveSession.test.ts`; `session.test.tsx`; UAT-12 | **FULL** |
| FR21 | Confirmation before reset | `RestartConfirmDialog.test.tsx` (added this session, exact text asserted); `session.test.tsx`; UAT-12 | **FULL** |
| FR22 | Input locked after completion | `useActiveSession.test.ts`; `session.test.tsx`; UAT-13 | **FULL** |

### Session Interruption & Recovery

| FR | Requirement | Test(s) | Status |
|---|---|---|---|
| FR23 | Full state persists on background/kill | `useActiveSession.interruption.test.ts` (simulated); **UAT-17, UAT-18 (real backgrounding + real force-stop)** | **FULL** — previously simulated-only, now genuinely device-confirmed |
| FR24 | Resume/discard prompt on relaunch, never silent | `ResumeDiscardDialog.test.tsx`; `index.test.tsx`; `home-session-interaction.test.tsx`; **UAT-18 (incl. explicit back-button-does-not-dismiss check)** | **FULL** — this was the prior run's single biggest gap (zero coverage); now the most thoroughly covered FR in the matrix |
| FR25 | Resume restores exact state | `useActiveSession.interruption.test.ts`; `index.test.tsx`; UAT-19 | **FULL** |
| FR26 | Discard clears state, no history | `useActiveSession.test.ts`; `index.test.tsx`; UAT-20 | **FULL** |

### Practice History

| FR | Requirement | Test(s) | Status |
|---|---|---|---|
| FR27 | Chronological completed-session list | `useSegmentHistory.test.ts`; `segment-detail.test.tsx`; UAT-22 | **FULL** |
| FR28 | Entry fields (date/target/mistakes/attempts) | `history.test.ts`; `segment-detail.test.tsx`; UAT-22 | **FULL** |
| FR29 | Non-completed sessions excluded | Structural (`session-transitions.ts` never imports `history.ts`) + explicit test added this session (`useActiveSession.test.ts`: restart writes zero history entries); `session.test.tsx` (Repeat/Restart write nothing); UAT-23 | **FULL** — previously NONE, now closed alongside FR21/FR24 |

### Non-Functional Requirements

| NFR | Requirement | Test(s) | Status |
|---|---|---|---|
| NFR1 | Tap-to-render <100ms | UAT-08, UAT-29 (subjective "feels instant," rapid-tap check) | **WAIVED** — no objective timing measurement exists; risk accepted 2026-09-03, see Step 5 |
| NFR2 | Latency budget holds under sync write | Architecturally resolved (synchronous MMKV, no async queue) + same UAT as NFR1 | **WAIVED** — same waiver as NFR1 |
| NFR3 | State survives background/kill | Same as FR23 | **FULL** |
| NFR4 | Always prompted, never silent | Same as FR24 | **FULL** |
| NFR5 | History durable across restart/update/backgrounding; **uninstall is the one acceptable loss point** | `history.test.ts`; **UAT-00 (genuine uninstall/reinstall — now correctly loses data, matching this NFR's own carve-out, where before the Auto Backup bug silently violated it by preserving data across uninstall)** | **FULL** — the Auto Backup fix this session makes this NFR newly, verifiably true; see note below |
| NFR6 | 44×44pt touch targets | UAT-25 (real-device edge-tap test) | **FULL (UAT)** — no automated pixel-value assertion exists; the on-device tap-registration test is arguably the more meaningful check |
| NFR7 | No color-alone reliance | UAT-26 (grayscale mode) | **FULL (UAT)** |
| NFR8 | Zero data leaves device | Code inspection (no networking/analytics library in `package.json` — verified this run); UAT-30 (airplane mode); **the Auto Backup fix (this session) closed the one real gap ever found against this NFR** | **FULL** |
| NFR9 | No account/user identification | UAT-31 (visual inspection); structural (no auth library, no user concept in `types.ts`) | **FULL** |

**Note on NFR5's wording:** "reinstalls-with-data-intact" is genuinely ambiguous prose — it reads two ways: (a) an app *update* (new build installed over the old one, no uninstall step) must preserve data, or (b) an *uninstall-then-reinstall* must preserve data. Reading (a) is what the NFR's own next clause implies ("the only acceptable data loss is a full app uninstall") and is what the Auto Backup fix satisfies. Reading (b) would directly contradict that same clause and would mean the Auto Backup fix broke this NFR rather than fixed it. Worth a one-word tightening in `epics.md` (say "app updates" instead of "reinstalls") so this isn't ambiguous going forward — not a blocker, just a documentation nit surfaced by this fix making the distinction newly load-bearing.

### Summary

| Status | Count | FRs/NFRs |
|---|---|---|
| FULL | 32 | FR1–FR4, FR6–FR18, FR20–FR29 (27 FRs), NFR3, NFR4, NFR5, NFR8, NFR9 (5 NFRs) |
| FULL (UAT) | 3 | FR19, NFR6, NFR7 |
| WAIVED | 2 | NFR1, NFR2 |
| NONE | 0 | — |

**Total: 28 active FRs + 9 NFRs = 37 requirements traced.** 35 fully covered (32 FULL + 3 FULL-via-UAT), 2 WAIVED (NFR1/NFR2, risk formally accepted 2026-09-03 — see Step 5), 0 NONE. Every FR that was NONE or UNIT-ONLY in the prior run (FR3, FR8, FR9, FR10, FR12, FR14, FR15, FR16, FR17, FR19, FR20, FR21, FR24, FR27, plus the PARTIALs) is now FULL.

## Step 4: Gap Analysis & Coverage Statistics

### Coverage Statistics

| | Total | FULL (incl. UAT) | PARTIAL | NONE | % Covered |
|---|---|---|---|---|---|
| **P0** | 12 | 10 | 2 (NFR1, NFR2) | 0 | **83%** |
| **P1** | 15 | 15 | 0 | 0 | **100%** |
| **P2** | 9 | 9 | 0 | 0 | **100%** |
| **P3** | 1 | 1 | 0 | 0 | **100%** |
| **Overall** | 37 | 35 | 2 | 0 | **95%** |

(Priority assignments carried forward from the prior run's own scoring, adjusted only for FR5's removal. NFR1 and NFR2 are kept together as one P0 gap — `test-design-qa.md`'s P0-009 always treated them as a single combined test target, not two independent ones.)

### Gap Analysis

**The one open item: objective performance measurement (NFR1/NFR2, `test-design-qa.md`'s P0-009).** No test — automated or manual — has ever put a number on tap-to-render latency. What exists: an architectural guarantee (synchronous MMKV writes, no async queue, specifically chosen to make this true by construction) and repeated subjective on-device confirmation (UAT-08, UAT-29: "no perceptible lag," "feels instant") across this session's full UAT pass, including after the Feedback Signal System's haptics/vibration/screen-reader-announcement calls were added to the tap path. Risk-scored: probability 2 (possible — never independently measured, so "unlikely" would overstate confidence) × impact 3 (critical — it's an explicit P0 NFR) = **score 6, MITIGATE tier**, not a blocker (score 9) but not a documented-and-ignored low risk either.

**Everything else the prior trace flagged is closed:**
- FR24 (previously the single biggest gap, zero coverage) — now the most thoroughly covered requirement in the matrix, closing on both the component-test and real-device-with-back-button-check layers.
- FR21, FR29 — closed with dedicated new tests this session.
- P0-007/P0-008 (the on-device E2E suite `test-design-qa.md` planned via Maestro and never built) — closed via the 31-script UAT pass, which substitutes for it.
- The 8 PARTIAL/UNIT-ONLY FRs from the prior run — all closed via the 5 new screen-level test files plus UAT.

**No FR is at NONE.** This is a materially different picture from the prior FAIL verdict, not a marginal improvement.

## Step 5: Gate Decision

### Gate Decision: **WAIVED** (was CONCERNS)

**Waiver record:**

| Field | Value |
|---|---|
| Risk | NFR1/NFR2 — tap-to-render latency (`test-design-qa.md`'s P0-009) has no objective measurement, only architectural guarantee + subjective on-device confirmation |
| Score | 6 (probability 2 × impact 3) — MITIGATE tier, not BLOCK |
| Reason | Synchronous MMKV writes (no async queue) architecturally guarantee the budget by construction; every tap across this session's full 31-script on-device UAT pass, including after the Feedback Signal System's haptics/vibration/screen-reader calls were added to the tap path, showed no perceptible lag (UAT-08, UAT-29). Risk accepted as low-probability given that guarantee. |
| Approver | Gerardo (product owner; solo-dev project, no separate QA authority) |
| Date | 2026-09-03 |
| Expiry / review trigger | No fixed date. **Re-open this waiver if:** the write path changes (any move away from synchronous MMKV writes, e.g. batching or an async queue), a genuine on-device lag is ever reported, or before any release beyond personal/private use (e.g. a public store listing) where a rigorous performance claim becomes warranted. |

Rationale for CONCERNS → WAIVED rather than a silent downgrade to PASS: the underlying evidence didn't change — no new measurement was taken. What changed is that the risk was explicitly reviewed and knowingly accepted, with an owner and a re-open condition on record, rather than the gap disappearing from view. This is the intended distinction the risk-governance framework draws between the two states.

**Rationale for the CONCERNS verdict this waiver overrides:** one P0-scored risk was open (score 6, MITIGATE tier — not BLOCK), zero requirements at NONE, and zero other open P0 items — both P0-007 and P0-008, the on-device E2E gaps that drove the prior FAIL, closed via the UAT pass.

| Criterion | Required | Actual | Status |
|---|---|---|---|
| No score=9 (BLOCK-tier) risks | 0 | 0 | ✅ MET |
| P0 coverage | 100% | 83% (10/12) pre-waiver, 100% post-waiver | ✅ MET (via waiver) |
| P1 coverage | 90% target | 100% (15/15) | ✅ MET |
| Overall coverage | 80% minimum | 95% | ✅ MET |

**This was not the same kind of gap as the prior FAIL.** The prior FAIL was about *missing tests for things that could be silently broken* — the highest-stakes example being FR24, a whole interaction flow with zero coverage. This waived item was always *one specific unmeasured number* on a mechanism deliberately architected to guarantee it and that held up under extensive subjective on-device use — a narrower, lower-probability gap than what FAIL described three days earlier, and one a reasonable owner can knowingly accept rather than build a new test to close.

**Full report:** `_bmad-output/test-artifacts/traceability-matrix.md` (this file)

---

# v1.1 Traceability: Epic 4 & Epic 5 (added 2026-09-06, re-run 2026-09-11)

**Author:** Claude (Master Test Architect), for Gerardo
**Date:** 2026-09-11
**Scope:** FR30–FR40 (Epic 4: Segment Organization & Insight; Epic 5: Configurable Overlearning Target). Everything above this heading is v1.0, unchanged and frozen at git tag `v1.0.0`.

**This run supersedes the 2026-09-06 matrix.** That run gated NOT APPLICABLE because no Epic 4/5 code existed yet. Since then, all 8 v1.1 stories (4.1–4.5, 5.1–5.3) have been implemented, code-reviewed, and marked `done`. This run reflects the real, implemented test suite — not the planning-stage `test-design-epic-4-5.md` scenario IDs the prior run cited.

## v1.1 Step 1: Coverage Oracle Resolution

**Resolved oracle:** Formal requirements — `epics.md`'s v1.1 Requirements Inventory (FR30–FR40) plus each of the 8 v1.1 stories' Acceptance Criteria, as amended by each story's own code review (most consequentially: FR37's settings-driven completion transition and FR22/FR24's derived lockout/bypass consequences, both added 2026-09-11 during Story 5.2's review).

**Confidence:** High — same oracle type and standard as the v1.0 trace above; unlike the 2026-09-06 run, this one is checked against real test files, not planned scenario IDs.

**Supporting artifacts loaded:** `epics.md`, `prd.md`, `architecture.md`, `project-context.md`, all 8 v1.1 story files in `_bmad-output/implementation-artifacts/`, `deferred-work.md`.

## v1.1 Step 2: Test Discovery & Cataloging

**Jest suite:** `src/**/*.test.{ts,tsx}` — **25 files, 372 passing tests**, 0 skipped (`npx jest`, full run, 2026-09-11). Up from 21 files / 166 tests at the 2026-09-06 (pre-implementation) count.

**New since the 2026-09-06 run, by story:**
- Story 4.1 (rename, dedicated screen): `segment-rename.test.tsx`, plus `lib/segments.test.ts` additions
- Story 4.2 (duplicate): `lib/segments.test.ts` additions
- Story 4.3 (sort): `SortControl.test.tsx`, `index.test.tsx`/`lib/segments.test.ts`/`lib/settings.test.ts`/`lib/types.test.ts` additions
- Story 4.4 (Solidification % summary): `segment-detail.test.tsx` additions, `lib/history.test.ts` additions
- Story 4.5 (inline rename): `segment-detail.test.tsx` and `SegmentListItem.test.tsx` additions
- Story 5.1 (Settings screen, stepper): `settings.test.tsx` (new file), `lib/settings.test.ts` (new file), `lib/mechanic.test.ts`/`lib/session-transitions.test.ts`/`lib/types.test.ts` additions
- Story 5.2 (mid-session apply + settings-driven completion): `session.test.tsx`, `useActiveSession.test.ts`, `lib/session-transitions.test.ts`, `lib/storage.test.ts` additions
- Story 5.3 (in-progress-session notice): `settings.test.tsx` additions (10 tests in this block alone, after that story's own code-review round)

**On-device layer:** `uat-scripts.md`'s v1.1 section, **10 scripts (UAT-32–UAT-41), 10/10 executed and passing** — UAT-32–37 on build `5a47a7a5` (2026-09-12), UAT-38–41 on build `c944e760` (`main` @ `5ffd7c2`, 2026-09-12) once Story 5.4 (FR43) added the Settings-navigation path UAT-38/39/40/41 needed. **Updated 2026-09-12** — this section originally recorded 0 executed; see the Gate Decision below for the re-run that closed it.

**Levels present:** Unit and Component (Jest/RNTL) — comprehensive. Manual/On-device (UAT) — comprehensive, all 10 v1.1 scripts run against real hardware and passing.

## v1.1 Step 3: Requirements-to-Test Traceability Matrix

**Legend:** FULL = automated test(s) confirm it, no on-device layer required to trust it (e.g., pure logic, storage, persisted state) · FULL (all rows below, updated 2026-09-12) = automated tests confirm it AND its P0/P1 UAT script has since been run and passed — the FULL-PENDING-UAT status this table used before the on-device pass no longer applies to any row · UAT-ONLY = on-device confirmed, no automated equivalent · NONE = no coverage.

### Segment Organization & Insight (Epic 4)

| FR | Requirement | Test(s) | Status |
|---|---|---|---|
| FR30 | Rename via dedicated screen | `segment-rename.test.tsx` (5 tests, screen-level); `lib/segments.test.ts` (`renameSegment`, validation/disambiguation); UAT-32, UAT-33 | **FULL** |
| FR31 | Rename propagates to all 5 display sites | `segment-rename.test.tsx`; `index.test.tsx` (list row); `segment-detail.test.tsx` (detail heading); `session.test.tsx` + `settings.test.tsx` (active-session readout, sourced via `useSegment` not frozen `segmentName` — the same rule Story 5.3 extended to the Settings notice as a sixth site); `home-session-interaction.test.tsx` (resume/discard prompt); UAT-32 (the R8-mitigating on-device check) | **FULL** |
| FR32 | Duplicate segment, no copied history | `lib/segments.test.ts` (`duplicateSegment`, disambiguation, empty history); `index.test.tsx` (row menu, snackbar); UAT-34 | **FULL** |
| FR33 | Sort by name/created/last-practiced/Solidification % | `SortControl.test.tsx` (8 tests); `lib/segments.test.ts` (`sortSegments`, `buildSortAggregates`); `index.test.tsx` (live re-sort); UAT-35 | **FULL** |
| FR34 | Sort choice persists across relaunch | `lib/settings.test.ts`; `index.test.tsx`; UAT-35's step 4 | **FULL** |
| FR38 | Solidification % summary on history log | `lib/history.test.ts` (`calculateSolidificationPercent`, incl. em-dash-not-"0%" case); `segment-detail.test.tsx`; UAT-36 | **FULL** |
| FR40 | Inline rename via press-and-hold (list row + detail heading) | `SegmentListItem.test.tsx` (list row); `segment-detail.test.tsx` (detail heading); UAT-37 (both sites, since this run's revision) | **FULL** |

### Configurable Overlearning Target (Epic 5)

| FR | Requirement | Test(s) | Status |
|---|---|---|---|
| FR35 | Settings screen access | `settings.test.tsx` (mount, stepper renders); UAT-38 | **FULL** |
| FR36 | 50–300% in 10% steps, incl. rapid-tap race and disabled-boundary tests | `settings.test.tsx`; `lib/settings.test.ts` (clamp); UAT-38 | **FULL** |
| FR37 | Applies live to in-progress session; **can complete it outright with no tap (amended 2026-09-11, Story 5.2 code review)** | `useActiveSession.test.ts` (`reconcileCompletion` — display-only case and the completion-trigger case, incl. `completedTarget: Math.max(liveTarget, currentStreak)`); `session.test.tsx` (Completion screen anchors on `completedTarget`, not a possibly-since-changed live value); `lib/session-transitions.test.ts` (`reconcileCompletion` unit suite); `settings.test.tsx` (notice hides on settings-driven completion); UAT-39 (revised this pass to test the completion path, not just the display update), UAT-41 (the FR24 interrupted-session case) | **FULL** |
| FR39 | Standing in-progress-session notice, incl. absence when no/already-completed session, position above the stepper, live segment name via `useSegment` (not frozen), and stability across repeated taps | `settings.test.tsx` (10 tests, incl. this story's own code-review-round additions); UAT-40 | **FULL** |

### Cross-Cutting

| Item | Test(s) | Status |
|---|---|---|
| Route registration (`app/settings.tsx`, `app/segment/[id]/rename.tsx`) | `stack-screens.test.ts` | **FULL** |
| FR22 lockout reachable via settings change alone, no tap (amended 2026-09-11) | `useActiveSession.test.ts` (Restart no-ops once `sessionComplete` is true, regardless of trigger) | **FULL** |
| FR24 interrupted session may auto-complete at app open, bypassing Resume/Discard (amended 2026-09-11) | No automated test — `home-session-interaction.test.tsx` covers the ordinary resume/discard path, but not this specific interleaving with a settings-driven completion firing before the prompt renders. **UAT-41 ran and passed 2026-09-12 (build `c944e760`), confirming the interleaving on real hardware** — the automated gap itself is unchanged and still worth closing, but the behavior is no longer unverified. | **UAT-ONLY** — see Step 4 |
| Real-device gesture timing (press-and-hold delay) / accessibility announcement delivery | UAT-32, UAT-37, UAT-40 — all passed 2026-09-12 | **FULL (UAT)** |

### v1.1 Summary

| Status | Count | FRs |
|---|---|---|
| FULL (automated + UAT both passing) | 11 | FR30–FR35, FR36–FR40 (all 11 v1.1 FRs) |
| FULL (cross-cutting, no UAT dependency) | 2 | Route registration, FR22's no-tap lockout |
| UAT-ONLY (on-device confirmed, no automated test) | 1 | FR24's auto-complete-bypasses-prompt interleaving — UAT-41 passed 2026-09-12; an automated regression test for this interleaving is still a worthwhile addition, tracked as a gap, not a blocker |

**Total: 11 v1.1 FRs traced, all with automated (Jest) coverage AND on-device (UAT) confirmation. 0 at NONE.** The one remaining open item is automated-test coverage (not correctness) for one cross-cutting interleaving already confirmed working on real hardware.

## v1.1 Step 4: Gap Analysis & Coverage Statistics

### Coverage Statistics

| | Total | Automated FULL | On-device executed & passing | NONE | % with ≥1 automated test |
|---|---|---|---|---|---|
| **P0** (FR30, FR31, FR32, FR33, FR35, FR36, FR37) | 7 | 7 | 7 | 0 | **100%** |
| **P1** (FR34, FR38, FR39, FR40) | 4 | 4 | 4 | 0 | **100%** |
| **Overall** | 11 | 11 | 11 | 0 | **100%** |

(Priority assignments per `test-design-epic-4-5.md`'s original scoring, carried forward unchanged — no v1.1 FR's priority was revised by any story's code review.)

**Updated 2026-09-12:** the "On-device pending" column above (0/10 executed at this trace's original writing) is now "On-device executed & passing" — all 10 `uat-scripts.md` v1.1 scripts have run against real hardware and passed. See the Gate Decision below.

### Gap Analysis

**Automated coverage is complete.** Every v1.1 FR has at least one Jest test, and the highest-risk item (FR31's cross-file rename propagation, `test-design-epic-4-5.md`'s R8) has dedicated regression coverage across every display site, including the settings notice Story 5.3 added as a sixth site subject to the same rule.

**Resolved 2026-09-12 — on-device verification is complete.** This section originally flagged zero on-device execution as the one real gap (risk-scored 6, MITIGATE tier), with elevated concern on UAT-39/UAT-41's no-tap completion behavior. Four of the ten scripts (UAT-38, 39, 40, 41) were additionally found **blocked** partway through that pass — no UI path existed from an active/interrupted session to Settings — which Story 5.4 (FR43) then fixed. A new preview build (`c944e760`, `main` @ `5ffd7c2`) was cut containing that fix plus Story 5.2's completion-reconciliation work, and all 10 v1.1 scripts, including the previously-blocked four, have now run and passed. The one item that remains genuinely open is narrower than "zero on-device verification" ever was: FR24's auto-complete-bypasses-prompt interleaving has on-device confirmation (UAT-41) but still no automated regression test — see the Cross-Cutting table above.

## v1.1 Step 5: Gate Decision

### Gate Decision: **PASS** (was CONCERNS)

| Criterion | Required | Actual | Status |
|---|---|---|---|
| No score=9 (BLOCK-tier) risks | 0 | 0 | ✅ MET |
| No FR at NONE (automated) | 0 | 0 | ✅ MET |
| P0 automated coverage | 100% | 100% (7/7) | ✅ MET |
| On-device (UAT) execution | — | 10 / 10 scripts run, 10/10 pass | ✅ MET |

**Why PASS:** every v1.1 requirement has both automated coverage and on-device confirmation, with no requirement at NONE. The single open item flagged by the prior CONCERNS decision — zero on-device execution, elevated concern on UAT-39/UAT-41's no-tap settings-driven completion behavior — is closed: all 10 scripts ran on build `c944e760` (`main` @ `5ffd7c2`) and passed, including UAT-39/UAT-41. The four scripts (UAT-38, 39, 40, 41) found blocked mid-pass were unblocked by Story 5.4 (FR43) adding the missing Settings-navigation path, then re-run successfully on the same build.

**Residual, non-blocking item:** FR24's auto-complete-bypasses-prompt interleaving still has no automated regression test — only on-device confirmation (UAT-41). Worth adding as a `home-session-interaction.test.tsx` case at some point, but it does not gate this decision: the interleaving is confirmed correct on real hardware, and this trace gates correctness, not test-suite completeness.

**Full report:** `_bmad-output/test-artifacts/traceability-matrix.md` (this file, v1.1 section)
