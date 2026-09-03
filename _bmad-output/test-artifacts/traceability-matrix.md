---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-09-03'
gateStatus: 'CONCERNS'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources: ['_bmad-output/planning-artifacts/epics.md', '_bmad-output/planning-artifacts/prd.md']
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
| NFR1 | Tap-to-render <100ms | UAT-08, UAT-29 (subjective "feels instant," rapid-tap check) | **PARTIAL** — no objective timing measurement exists; see Gap Analysis (this is `test-design-qa.md`'s P0-009, never built) |
| NFR2 | Latency budget holds under sync write | Architecturally resolved (synchronous MMKV, no async queue) + same UAT as NFR1 | **PARTIAL** — same underlying gap as NFR1 |
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
| PARTIAL | 2 | NFR1, NFR2 |
| NONE | 0 | — |

**Total: 28 active FRs + 9 NFRs = 37 requirements traced.** 35 fully covered (32 FULL + 3 FULL-via-UAT), 2 PARTIAL (NFR1/NFR2), 0 NONE. Every FR that was NONE or UNIT-ONLY in the prior run (FR3, FR8, FR9, FR10, FR12, FR14, FR15, FR16, FR17, FR19, FR20, FR21, FR24, FR27, plus the PARTIALs) is now FULL.

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

### Gate Decision: **CONCERNS**

**Rationale:** One P0-scored risk remains open (NFR1/NFR2's performance guarantee, risk score 6 — MITIGATE tier, not BLOCK). Zero requirements at NONE. Zero other open P0 items — both P0-007 and P0-008, the on-device E2E gaps that drove the prior FAIL, are now closed via the UAT pass.

| Criterion | Required | Actual | Status |
|---|---|---|---|
| No score=9 (BLOCK-tier) risks | 0 | 0 | ✅ MET |
| P0 coverage | 100% | 83% (10/12) | ❌ NOT MET — one item (NFR1/NFR2, counted as a single gap) |
| P1 coverage | 90% target | 100% (15/15) | ✅ MET |
| Overall coverage | 80% minimum | 95% | ✅ MET |

**This is not the same kind of gap as the prior FAIL.** The prior FAIL was about *missing tests for things that could be silently broken* — the highest-stakes example being FR24, a whole interaction flow with zero coverage. This CONCERNS is about *one specific unmeasured number* on a mechanism that was deliberately architected to guarantee it and has held up under extensive subjective on-device use. It is a real gap, not a formality, but it is a narrower and lower-probability one than what FAIL described three days ago.

**Two ways to close this, your call:**
1. **Accept the risk, downgrade to PASS by explicit decision** — reasonable given the architectural guarantee and the volume of subjective confirmation (every one of this session's dozens of on-device taps across 31 UAT scripts never once showed lag). This is a legitimate call for a solo-dev personal-use app.
2. **Build the objective measurement** — a simple instrumented timing test (timestamp on tap, timestamp on next render commit, assert <100ms) would close this permanently and is not large scope, given the tap handlers are already isolated in `useActiveSession.ts`.

**Full report:** `_bmad-output/test-artifacts/traceability-matrix.md` (this file)
