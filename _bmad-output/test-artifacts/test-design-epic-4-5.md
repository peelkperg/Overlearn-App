---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['v1.1-step-01-detect-mode', 'v1.1-step-02-load-context', 'v1.1-step-03-risk-and-testability', 'v1.1-step-04-coverage-plan', 'v1.1-step-05-generate-output']
lastStep: 'v1.1-step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-06'
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/project-context.md
---

# Test Design: Epic 4 & Epic 5 - Segment Organization & Insight / Configurable Overlearning Target

**Date:** 2026-09-06
**Author:** Gerardo
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-level test design for v1.1's two epics — Epic 4 (Segment Organization & Insight, FR30-FR34/FR38/FR40) and Epic 5 (Configurable Overlearning Target, FR35-FR37/FR39). Combined into one document because both were scoped, risk-assessed, and planned together in the same pass, and Epic 5 depends on nothing from Epic 4 (confirmed independent in `epics.md`'s Dependency Validation).

**Risk Summary:**

- Total risks identified: 7 (R7-R13, continuing v1.0's R1-R6 numbering)
- High-priority risks (score ≥6): 1 (R8)
- Critical categories: BUS (rename propagation), TECH (disambiguation, subscription wiring, gesture timing), DATA (Solidification % null-vs-zero)

**Coverage Summary:**

- P0 scenarios: 14 (~18-26 hours)
- P1 scenarios: 6 (~8-12 hours)
- P2/P3 scenarios: 5 (~3-6 hours, no P3)
- **Total effort:** ~29-44 hours (~4-6 days at a solo-dev pace), additive to implementation (test-alongside, not a separate testing phase)

---

## Not in Scope

| Item | Reasoning | Mitigation |
|---|---|---|
| Real touch-and-hold gesture delivery (FR40's long-press) | Jest/RNTL cannot drive actual native touch timing | C42: manual on-device pass before release (R12) |
| Real screen-reader announcement delivery (FR39's live region) | Jest/RNTL asserts the prop is set, not that VoiceOver/TalkBack actually announces it | C42: manual on-device pass before release (R12) |
| E2E/on-device automation tooling | No tool was ever selected in v1.0 either (R3's mitigation was deferred and never revisited) — not reopened here as a v1.1 scope item | Accepted gap, consistent with v1.0's own resolution |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---|---|---|---|---|---|---|---|---|
| R8 | BUS | FR31 requires 3 of 5 display sites to switch from the frozen `session.segmentName` snapshot to a live lookup (`architecture.md`'s Rename Propagation table). Cross-file change with no compiler enforcement tying it to the rename action — high probability of partial implementation. | 3 | 2 | 6 | Component test per site (`StreakReadout`, `CompletionScreen`, `ResumeDiscardDialog`) asserting a rename made after construction still displays the new name (C22). | Solo dev (Gerardo) | Before Story 4.1 complete |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| R7 | DATA | `disambiguate`'s self-exclusion fix (rename to own name, different case) must still catch a genuine collision with a *third* segment in a different case — easy to under-fix. | 2 | 2 | 4 | 3-case unit matrix (C21): own-name/diff-case succeeds; other-segment same-case disambiguates; other-segment diff-case still disambiguates. | Solo dev (Gerardo) |
| R9 | TECH | `useSegments()`'s new `subscribeToHistory` wiring (FR33's live re-sort) risks over-subscribing (unnecessary re-renders) or under-subscribing (missed re-sort). | 2 | 2 | 4 | Render-count-spy test (C28) asserting re-render only on relevant history writes when sorted by last-practiced/Solidification %. | Solo dev (Gerardo) |
| R10 | DATA | `calculateSolidificationPercent` must return `null` (no data) distinctly from `0` (a real 0%-correct session) — a boundary slip misrepresents a new segment as measured-and-failing. | 2 | 2 | 4 | Boundary unit test (C31): zero sessions → `null`; one session, zero correct → `0`. | Solo dev (Gerardo) |
| R11 | TECH | FR40's inline rename and FR30's dedicated screen both target `renameSegment` through independent UI paths — natural drift point if one path re-implements validation instead of sharing it. | 2 | 2 | 4 | Parametrized unit test (C35) exercised from both entry points against one shared assertion set. | Solo dev (Gerardo) |
| R12 | OPS | No E2E/on-device tool exists (v1.0's R3 gap, never resolved). FR40's long-press timing and FR39's live-region delivery are real-device behaviors Jest/RNTL cannot fully assert. | 2 | 2 | 4 | Fake-timer test for the `delayLongPress` wiring + static-prop assertion for `accessibilityLiveRegion`, backed by a manual on-device pass (C42) before release. | Solo dev (Gerardo) |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---|---|---|---|---|---|---|
| R13 | BUS | `lib/settings.ts` has no called-out runtime range check on `overlearningPercent` (unlike `Segment`/`HistoryEntry`'s guards) — corrupted storage could carry an out-of-range value into `calculateTargetStreak`. | 1 | 2 | 2 | Monitor — add a range guard to the read path before Story 5.1 complete, same pattern as `isNonNegativeInteger`. |

### Risk Category Legend

- **TECH**: Technical/Architecture
- **SEC**: Security — none identified (no new attack surface: still fully offline, no auth, no network)
- **PERF**: Performance — none identified (no new synchronous-thread work beyond v1.0's existing budget)
- **DATA**: Data Integrity
- **BUS**: Business Impact (UX correctness)
- **OPS**: Operations

---

## Entry Criteria

- [ ] `epics.md`'s Epic 4/5 stories and ACs reviewed by dev (this document assumes them as-written)
- [ ] `architecture.md`'s v1.1 Architectural Decisions section reviewed, in particular the Rename Propagation table (R8's basis)
- [ ] Existing v1.0 suite (166 tests) green before starting — v1.1 must not regress it (C38's explicit purpose)
- [ ] Jest + RNTL suite already standing from v1.0 — no new framework setup required

## Exit Criteria

- [ ] All P0 tests (C20-C41, 14 scenarios) passing
- [ ] R8 (the only HIGH risk) mitigated and verified via C22
- [ ] C42's on-device manual pass completed before v1.1 release
- [ ] `epics.md`'s FR30-FR40 traceability confirmed via `traceability-matrix.md` (see companion update)

---

## Test Coverage Plan

### P0 (Critical) - Run on every commit

| Requirement | Test Level | Risk Link | Scenario | Notes |
|---|---|---|---|---|
| FR30 | Unit | - | C20 | Rename validation, mirrors FR1 |
| FR30, R7 | Unit | R7 | C21 | Disambiguation self-exclusion matrix |
| FR31, R8 | Component | R8 | C22 | Live-lookup propagation to 3 session-context sites |
| FR32 | Unit | - | C24 | Duplicate: fresh id/date, no copied history |
| FR33 | Component | - | C26 | Sort menu default-direction and flip behavior |
| FR34 | Unit | - | C29 | Sort persistence across relaunch |
| FR38, R10 | Unit | R10 | C31 | Solidification % null-vs-zero boundary |
| FR40, R11 | Component | R11 | C33 | Long-press threshold, no layout shift, tap-still-navigates |
| FR40, R11 | Component | R11 | C34 | Inline commit/revert/empty-reject |
| FR35/FR36 | Component | - | C36 | Stepper bounds + `accessibilityState` |
| FR35/FR36 | Unit | - | C37 | Default settings envelope reproduces v1.0 |
| FR36/FR37 | Unit | - | C38 | Optional-parameter backward compatibility (protects v1.0's 166 tests) |
| FR37 | Component/Hook | - | C39 | Live target-streak update mid-session |
| Route registration | Unit | - | C41 | `STACK_SCREENS` + `_layout.tsx` regression guard |

**Total P0**: 14 scenarios, ~18-26 hours

### P1 (High) - Run on PR to main

| Requirement | Test Level | Risk Link | Scenario | Notes |
|---|---|---|---|---|
| FR33 | Unit | - | C27 | Zero-history sort placement |
| FR33, R9 | Component/Hook | R9 | C28 | History-subscription re-sort, no over-render |
| FR38 | Component | - | C32 | History screen summary line placement/text |
| FR40, R11 | Unit | R11 | C35 | Shared validation path, both entry points |
| FR39 | Component | - | C40 | Standing notice presence/absence/no-per-tap-dialog |

**Total P1**: 5 scenarios, ~8-12 hours

### P2 (Medium) - Run nightly/manual

| Requirement | Test Level | Risk Link | Scenario | Notes |
|---|---|---|---|---|
| FR31 | Component | - | C23 | Already-live sites, regression guard only |
| FR32 | Component | - | C25 | Duplicate snackbar + live-region |
| UX-DR19/24 | Component | - | C30 | Sort control hidden/visible + announcement |
| FR40/FR39, R12 | Manual | R12 | C42 | On-device gesture + accessibility announcement |

**Total P2**: 4 scenarios, ~3-6 hours

### P3 (Low) - Run on-demand

None identified — same conclusion as v1.0's own assessment; v1.1's scope is small enough that no scenario is purely exploratory/benchmark-only.

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Notes |
|---|---|---|
| P0 | 14 | ~18-26 hours — no new framework setup, unlike v1.0 |
| P1 | 5 | ~8-12 hours |
| P2 | 4 | ~3-6 hours (C42 is the one manual item) |
| P3 | 0 | none |
| **Total** | **23** | **~29-44 hours (~4-6 days)** |

### Prerequisites

**Test Data:** No new factories needed — existing segment/session/history builders in `src/lib/*.test.ts` extend directly.

**Tooling:** None new. Existing Jest ~29.7.0 + `jest-expo` + `@testing-library/react-native` ^14.0.1 suite covers all P0-P2 automated scenarios; C42 is manual.

**Environment:** Android emulator or device for C42 (long-press + screen reader), same as v1.0's on-device verification tier.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100% (no exceptions) — C38 in particular guards v1.0's entire 166-test suite against the new optional parameter.
- **P1 pass rate:** ≥95%.
- **High-risk mitigations:** R8 complete before Story 4.1 is marked done.

### Coverage Targets

- Maintain existing `collectCoverageFrom` scope (`src/app/**/*.tsx`, `src/components/**/*.tsx`) — do not narrow for v1.1.

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] R8 not left unmitigated
- [ ] v1.0's 166 existing tests remain green (C38 is the direct check)

---

## Mitigation Plans

### R8: FR31 rename propagation drift (Score: 6)

**Mitigation Strategy:** Component test per affected site (`StreakReadout`, `CompletionScreen`, `ResumeDiscardDialog`) constructed with one segment name, then renamed via `renameSegment`, asserting the rendered name updates without remount (C22).
**Owner:** Solo dev (Gerardo)
**Timeline:** Before Story 4.1 marked complete
**Status:** Planned
**Verification:** C22 passing in the Story 4.1 PR

---

## Assumptions and Dependencies

### Assumptions

1. `architecture.md`'s v1.1 Architectural Decisions section (Rename Propagation table, `lib/settings.ts` envelope, optional-parameter threading) is implemented exactly as specified — this test design does not re-derive an alternative architecture.
2. No new native modules or dependencies are introduced by Epic 4/5 (confirmed — both epics reuse `react-native-mmkv` and existing UI primitives only).

### Dependencies

1. Epic 4's Story 4.1 (Rename) should complete before Story 4.5 (inline rename) begins, since C35 requires the shared validation path Story 4.1 establishes.
2. Epic 5's Story 5.1 (Configure) must complete before 5.2/5.3, per `epics.md`'s own within-epic dependency ordering.

### Risks to Plan

- **Risk:** Solo-dev capacity — ~29-44 hours of test development is additive to Epic 4/5's implementation estimate, not separate.
  - **Impact:** Schedule slip if treated as a separate phase after coding.
  - **Contingency:** Test-alongside per story (write C-scenarios for a story as part of that story's own completion), matching v1.0's own resourcing note.

---

## Interworking & Regression

| Component | Impact | Regression Scope |
|---|---|---|
| `lib/mechanic.ts`, `lib/session-transitions.ts` | Optional 2nd parameter added | All existing v1.0 unit tests for `calculateTargetStreak`/`logCorrect`/`logIncorrect` must pass unmodified (C38) |
| `lib/segments.ts` | `renameSegment`, `duplicateSegment` added; `disambiguate` reused | Existing `createSegment`/`deleteSegment` tests unaffected — no shared-function signature change |
| `useSegments()` | New `subscribeToHistory` subscription | Existing sort-by-creation-order behavior (v1.0 default) must be unaffected when sort key is unset |
| `app/index.tsx`, `app/session/[id].tsx` | Switch from `session.segmentName` to live lookup for 3 display sites | v1.0's existing Resume/Discard and Completion Summary tests (`src/app-tests/*`) must still pass with the new lookup source |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization

### Related Documents

- PRD: `_bmad-output/planning-artifacts/prd.md` (FR30-FR40, v1.1 Requirements Inventory)
- Epics: `_bmad-output/planning-artifacts/epics.md` (Epic 4, Epic 5)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (v1.1 Architectural Decisions)
- Full working notes: `_bmad-output/test-artifacts/test-design-progress.md` (v1.1 sections)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
