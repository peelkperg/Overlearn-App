---
title: 'TEA Test Design → BMAD Handoff Document'
version: '1.0'
workflowType: 'testarch-test-design-handoff'
inputDocuments:
  - _bmad-output/test-artifacts/test-design-architecture.md
  - _bmad-output/test-artifacts/test-design-qa.md
sourceWorkflow: 'testarch-test-design'
generatedBy: 'TEA Master Test Architect'
generatedAt: '2026-08-31'
projectName: 'Overlearn'
---

# TEA → BMAD Integration Handoff

## Purpose

This document bridges TEA's test design outputs with BMAD's epic/story decomposition (`epics.md`, already created). Since `epics.md` already exists for Overlearn, this handoff serves a **retroactive** purpose: it identifies where the risk assessment and coverage plan should inform revisions to existing story acceptance criteria before Epic 2 implementation resumes, rather than shaping story creation from scratch.

## TEA Artifacts Inventory

| Artifact | Path | BMAD Integration Point |
|---|---|---|
| Test Design (Architecture) | `_bmad-output/test-artifacts/test-design-architecture.md` | Epic 2 quality requirements, pre-implementation blockers |
| Test Design (QA) | `_bmad-output/test-artifacts/test-design-qa.md` | Story-level test requirements (P0/P1 table) |
| Risk Assessment | Embedded in both docs above | Epic risk classification |
| Coverage Strategy | Embedded in QA doc | Story test requirements |

## Epic-Level Integration Guidance

### Risk References

- **Epic 1 (Segment Management):** R4 (segment deletion cascade) applies to Stories 1.5/1.6.
- **Epic 2 (The Overlearning Session):** R1, R2, R3, R5 all concentrate here — this is by far the highest-risk epic, consistent with it already being identified as "the largest and most architecturally significant epic" in `epics.md`.
- **Epic 3 (Practice History Review):** No HIGH risks map here; only general test-quality expectations (P1-007).

### Quality Gates

- **Epic 2 cannot be marked complete** until R1, R2, R3 (all HIGH, score 6) are mitigated per the Architecture doc's Risk Mitigation Plans, and P0-001 through P0-009 all pass.
- **Epic 1 and Epic 3** carry no HIGH risks — standard P1/P2 coverage (already itemized in the QA doc) is sufficient before marking them complete.

## Story-Level Integration Guidance

### P0/P1 Test Scenarios → Story Acceptance Criteria

Recommend the following existing stories in `epics.md` gain an explicit AC line referencing the corresponding test scenario, so the acceptance criteria and the test plan stay traceable to each other:

| Story (epics.md) | Add AC referencing | Test ID |
|---|---|---|
| Story 2.1 (Start Session) | Target computed via `calculateTargetStreak(0)` matches the boundary table | P0-001 |
| Story 2.3 (Incorrect + recalc) | Boundary crossed at `total_incorrect_this_session = 11`, not 10 | P0-002, P0-003, P0-004 |
| Story 2.4 (Restart) | All four fields verified reset atomically in a single test | P0-006 |
| Story 2.5 (Auto-completion) | `session_complete` write is synchronous with the triggering streak update | P1-001 |
| Story 2.9 (Interruption survival) | On-device E2E test, not just unit-level state assertions | P0-008 |
| Story 2.10 (Resume/discard/relaunch) | All three relaunch branches (not just resume) explicitly tested | P0-007 |
| Story 1.6 (Delete segment) | History entries verified removed alongside the segment, not just the segment record | P1-005 |

### Data-TestId Requirements

Standard React Native testing (RNTL) uses `testID` props (RN's equivalent of `data-testid`). Recommend adding `testID` to:
- Correct/Incorrect/Restart buttons (`testID="correct-button"`, `"incorrect-button"`, `"restart-button"`)
- The streak/target readout (`testID="streak-readout"`)
- Segment list rows (`testID="segment-row-{id}"`) for P1-006's independent-state assertions

## Risk-to-Story Mapping

| Risk ID | Category | P×I | Recommended Story/Epic | Test Level |
|---|---|---|---|---|
| R1 | TECH | 2×3=6 | Epic 2, Story 2.1/2.3 | Unit |
| R2 | TECH | 3×2=6 | Epic 1, Story 1.1 (already occurred) | Documentation (architecture.md), not a runtime test |
| R3 | OPS | 3×2=6 | Cross-cutting, before Story 1.2 | Infrastructure setup, not a single test |
| R4 | DATA | 2×2=4 | Epic 1, Stories 1.5/1.6 | Component |
| R5 | PERF | 2×2=4 | Epic 2, end-of-epic (after Story 2.8) | E2E/perf |
| R6 | BUS | 2×1=2 | Epic 2, Story 2.4 | Not tested (accepted tradeoff) |

## Recommended BMAD → TEA Workflow Sequence

Adapted for this project's actual (retroactive) ordering:

1. ~~TEA Test Design (`TD`)~~ → **this document** — produced after `epics.md` already existed, not before.
2. **BMAD Epics & Stories** (`epics.md`, already exists) → should be lightly revised per the Story-Level Integration Guidance above before Epic 2 implementation resumes.
3. **Implementation** (Epic 2 onward) → test-alongside, per the QA doc's Implementation Planning Handoff table (Jest/RNTL setup, boundary tests, observability hook, Maestro selection — all before their respective blocking stories).
4. **Regression** → the full Jest suite (once it exists) runs before every commit, per the QA doc's Interworking & Regression section.
5. No separate `ATDD`/`Automate`/`Trace` phases planned as distinct BMad workflow runs — solo-dev context folds these into the "write the test alongside the story" pattern already established in the QA doc.

## Phase Transition Quality Gates

| From Phase | To Phase | Gate Criteria |
|---|---|---|
| Test Design | Epic/Story Creation (already done — retroactive review) | All 3 HIGH risks (R1, R2, R3) have a documented mitigation strategy (✅ done, this document) |
| Story Revision | Implementation (Epic 2) | Pre-implementation blockers resolved: Jest+RNTL installed, `createMMKV()` API documented, test-data seeding + observability hooks planned |
| Implementation | Release | P0 pass rate 100%, P1 ≥95%, all 3 HIGH risks CLOSED (not just mitigated-on-paper), Maestro E2E suite green on-device |
