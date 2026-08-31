---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-08-31'
workflowType: 'testarch-test-design'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
---

# Test Design for Architecture: Overlearn (System-Level)

**Purpose:** Architectural concerns, testability gaps, and NFR requirements for review before Epic 2 implementation resumes. Serves as a contract between test design and the (solo) engineering role on what must be addressed before test development begins.

**Date:** 2026-08-31
**Author:** Claude (Master Test Architect), for Gerardo
**Status:** Architecture Review Pending
**Project:** Overlearn
**PRD Reference:** `_bmad-output/planning-artifacts/prd.md`
**ADR Reference:** `_bmad-output/planning-artifacts/architecture.md`

---

## Executive Summary

**Scope:** Full system — a mobile-first, offline-only React Native/Expo app enforcing a live-recalculating, reset-on-miss consecutive-correct-streak mechanic. No backend, no accounts, no telemetry. 3 epics, 17 stories; Epic 1 Story 1.1 (project init) already implemented and manually verified this session.

**Business Context** (from PRD):

- **Revenue/Impact:** None — no business model at this stage; success is personal-use validation, then App Store/Play Store reviews as the first external signal.
- **Problem:** Musicians stop practicing a corrected passage as soon as it "feels" right; every incorrect attempt reinforces the wrong muscle memory as strongly as a correct one. The app replaces feel with a counted rule.
- **GA Launch:** No target date set — solo-developer project, personal-use validation gates further work.

**Architecture** (from architecture.md):

- **Key Decision 1:** React Native + Expo SDK 57, chosen over Flutter for existing developer familiarity.
- **Key Decision 2:** `react-native-mmkv` with **synchronous writes** on every tap — resolves the PRD's flagged async-write/<100ms risk directly, no queue needed.
- **Key Decision 3:** `target_streak` is **derived on read**, never persisted — eliminates an entire class of state-drift bugs by construction.

**Expected Scale** (from ADR):

- Single user, single device install. No concurrency, no multi-tenancy, no load considerations. Realistically dozens to low hundreds of segments/sessions.

**Risk Summary:**

- **Total risks**: 6
- **High-priority (≥6)**: 3 risks requiring immediate mitigation
- **Test effort**: ~19 scenarios (~30–48 hours total across P0–P2, no P3 identified)

---

## Quick Guide

### 🚨 BLOCKERS - Team Must Decide (Can't Proceed Without)

**Pre-Implementation Critical Path** — these MUST be completed before test development on Epic 2 proceeds:

1. **R3: No test framework or CI exists** - Pin Jest + React Native Testing Library, add a test script to `package.json` (recommended owner: solo dev)
2. **R2: Native module API drift already caused a build break this session** (`new MMKV()` vs. v4's `createMMKV()`) - Add an explicit note to architecture.md's data-layer section documenting the correct v4 API, so no future story reintroduces the mistake (recommended owner: solo dev)
3. **Testability Concern #1: No test-data seeding for MMKV state** - `lib/storage.ts` needs a test-only helper to seed arbitrary `SessionState` values, since reaching `total_incorrect_this_session = 11` by tapping the UI 11 times is impractical for automated tests (recommended owner: solo dev)

**What we need from team:** Complete these 3 items before Epic 2 story implementation resumes, or test development is blocked.

---

### ⚠️ HIGH PRIORITY - Team Should Validate (We Provide Recommendation, You Approve)

1. **R1: Target-streak boundary bug** - Recommendation: dedicated unit suite covering the full 0–13 boundary table from the Mechanic Specification before Story 2.1 begins (self-approve, solo dev)
2. **Testability Concern #2: Feedback Signal System has no assertion hook** - Recommendation: `useFeedbackSignal.ts` should expose which tier fired (return value or spy-able callback), not just fire native side effects (self-approve, solo dev)
3. **Testability Concern #3: No E2E tooling chosen** - Recommendation: Maestro (lower setup overhead than Detox) for the interruption/resume flow and Active Session screen, selected before Epic 2's Story 2.9/2.10 (self-approve, solo dev)

**What we need from team:** Review recommendations and approve (or adjust) — solo-dev context, self-review is the approval step.

---

### 📋 INFO ONLY - Solutions Provided (Review, No Decisions Needed)

1. **Test strategy**: Unit + Component for pure logic and screen/hook behavior, on-device E2E reserved only for what genuinely requires it (app kill/relaunch, real native-module timing) — no backend/API level exists.
2. **Coverage**: 19 test scenarios prioritized P0 (9) / P1 (8) / P2 (2), risk-linked.
3. **Tooling and quality gates**: fully worked out — see companion QA doc (`test-design-qa.md`).

**What we need from team:** Just review and acknowledge — the solution is already worked out.

---

## For Architects and Devs - Open Topics 👷

### Risk Assessment

**Total risks identified**: 6 (3 high-priority score ≥6, 2 medium, 1 low)

#### High-Priority Risks (Score ≥6) - IMMEDIATE ATTENTION

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---|---|---|---|---|---|---|---|---|
| **R1** | **TECH** | Target-streak boundary bug (off-by-one around `total_incorrect_this_session = 10/11`) ships uncaught — the exact scenario the PRD's Technical Success criterion names as requiring 100% test coverage. | 2 | 3 | **6** | Dedicated unit suite covering the full 0–13 boundary table + exact `> 10` comparison. | Solo dev | Before Story 2.1 |
| **R2** | **TECH** | Native module API drift causes silent/confusing runtime breakage. Already materialized once this session (`react-native-mmkv` v4's `createMMKV()` vs. outdated `new MMKV()`). | 3 | 2 | **6** | Document the correct v4 API explicitly in architecture.md; pin exact dependency versions. | Solo dev | Immediately (docs only) |
| **R3** | **OPS** | No test framework or CI pipeline exists. Regressions across 17 stories have no automated safety net. | 3 | 2 | **6** | Pin Jest + RNTL, add test script to `package.json`. E2E tooling (Maestro) selected before Epic 2's interruption stories. | Solo dev | Before Story 1.2 |

#### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation |
|---|---|---|---|---|---|---|
| R4 | DATA | Segment deletion (FR6) cascades incorrectly — deletes/orphans the wrong segment's history. | 2 | 2 | 4 | Dedicated delete-cascade test (C15 in coverage matrix). |
| R5 | PERF | Cumulative synchronous JS-thread work (MMKV write + 4 feedback tiers) creeps past the 100ms budget as Epic 2 stacks up. | 2 | 2 | 4 | Perf-test the full tap handler path once the Feedback Signal System is wired (end of Epic 2), not just Story 1.1's bare write. |

#### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---|---|---|---|---|---|---|
| R6 | BUS | Restart's confirm-gate doesn't stop a user using it to escape a legitimately-risen target — explicitly accepted in the PRD (Journey 4). | 2 | 1 | 2 | Monitor; not a defect, no mitigation needed. |

#### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure) — not applicable to this project (no accounts, no network)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

### Testability Concerns and Architectural Gaps

**🚨 ACTIONABLE CONCERNS - Must Be Addressed**

#### 1. Blockers to Fast Feedback (WHAT WE NEED FROM ARCHITECTURE)

| Concern | Impact | What Must Be Provided | Owner | Timeline |
|---|---|---|---|---|
| **No test-data seeding for MMKV state** | Cannot reach `total_incorrect_this_session = 11` without 11 manual taps → impractical for automated tests | Test-only helper in `lib/storage.ts` to seed arbitrary `SessionState` directly | Solo dev | Before Story 2.3 (first story needing the boundary) |
| **No time/clock injection** | `session_start_timestamp = now` is not controllable in tests → non-deterministic assertions | Inject a clock function into `lib/` instead of calling `Date.now()`/`new Date()` directly | Solo dev | Before Story 2.1 |

#### 2. Architectural Improvements Needed (WHAT SHOULD BE CHANGED)

1. **Feedback Signal System observability**
   - **Current problem:** `useFeedbackSignal.ts` (per architecture.md's Project Structure) has no way for a test to assert which tier fired — haptics and audio have no natural test hook.
   - **Required change:** Expose the fired tier via a return value or an injectable/spy-able callback, in addition to (not instead of) the real native side effects.
   - **Impact if not fixed:** C11/C12 in the coverage matrix (feedback-tier correctness, screen-reader announcement) become untestable without manual on-device verification for every change.
   - **Owner:** Solo dev
   - **Timeline:** Before Story 2.5 (first story to trigger the completion tier)

2. **E2E tooling selection**
   - **Current problem:** No on-device automated testing tool chosen. This session's own manual verification of Story 1.1 (native build, emulator boot, adb taps, screenshot inspection) demonstrates how much can only be caught on-device — and how slow/manual that process is without tooling.
   - **Required change:** Adopt Maestro (recommended for lower setup overhead than Detox, given solo-dev maintenance constraints already established as a project value).
   - **Impact if not fixed:** C8/C9 (interruption/recovery, the highest-complexity conditional in the app) remain manually-verified-only indefinitely.
   - **Owner:** Solo dev
   - **Timeline:** Before Story 2.9/2.10

---

### Testability Assessment Summary

**📊 CURRENT STATE - FYI**

#### What Works Well

- ✅ **Zero network surface** (NFR8) eliminates an entire class of test flakiness that most test-design work has to solve for (API mocking, network timeouts, contract drift).
- ✅ **Single source of truth for the mechanic formula** (`calculateTargetStreak` in `lib/mechanic.ts`) — a pure function, trivially unit-testable.
- ✅ **One-directional data flow** (UI → hooks → `lib/` → storage) gives a clean seam for testing hooks against a real or swapped storage layer.
- ✅ **`react-native-mmkv` v4 ships a built-in test-mode mock** (`isTest()` → `createMockMMKV()`) — storage isolation infrastructure already exists without custom mocking work.
- ✅ **No auth, no multi-tenancy, no PII** — dramatically smaller test-data surface than a typical system this checklist is designed for.

#### Accepted Trade-offs (No Action Required)

For Overlearn's MVP, the following trade-offs are acceptable:

- **No Disaster Recovery testing** (RTO/RPO, failover, backup restoration) — the app has no server infrastructure; "disaster recovery" for a local-only app is "the user's device backup," entirely outside the app's control.
- **No Deployability testing** (Blue/Green, Canary, zero-downtime) — app store releases are inherently all-or-nothing; there is no meaningful "deployment strategy" to test beyond EAS Build/Submit succeeding.
- **No Scalability/load testing** — single user, single device, no concurrency of any kind.
- **No Security/AuthN-AuthZ testing** — no accounts, no auth, no network calls to secure.

This is not technical debt — these categories from the ADR Quality Readiness Checklist genuinely do not apply to a local-only, no-backend, single-user mobile app, and should not be revisited post-GA either.

---

### Risk Mitigation Plans (High-Priority Risks ≥6)

**Purpose**: Detailed mitigation strategies for all 3 high-priority risks (score ≥6). These MUST be addressed before Epic 2 implementation resumes.

#### R1: Target-streak boundary bug (Score: 6) - HIGH

**Mitigation Strategy:** QA-owned test-writing task (full boundary-table unit suite) — see `test-design-qa.md` P0-001 through P0-004 and the Implementation Planning Handoff table.

**Owner:** Solo dev (Gerardo)
**Timeline:** Before Story 2.1
**Status:** Planned
**Verification:** All boundary-table rows pass.

#### R2: Native module API drift (Score: 6) - HIGH

**Mitigation Strategy:**

1. Add a note to architecture.md's Core Architectural Decisions documenting `createMMKV()` as the correct v4 API (not `new MMKV()`), citing this session's own build break as the evidence.
2. Pin `react-native-mmkv` and `react-native-nitro-modules` to exact versions already recorded in `package.json`.
3. When any future story adds a new native module, check its major-version changelog for breaking API changes before writing code against it.

**Owner:** Solo dev (Gerardo)
**Timeline:** Immediately (documentation-only fix)
**Status:** Planned
**Verification:** architecture.md contains the explicit API note; no future story reintroduces the `new MMKV()` pattern.

#### R3: No test framework or CI (Score: 6) - HIGH

**Mitigation Strategy:** QA-owned infrastructure setup (Jest + RNTL install, `npm test` script) — see `test-design-qa.md` Dependencies & Test Blockers and Implementation Planning Handoff. Full CI pipeline automation deferred; solo dev running `npm test` locally is sufficient for MVP.

**Owner:** Solo dev (Gerardo)
**Timeline:** Before Story 1.2
**Status:** Planned
**Verification:** `npm test` runs and passes locally; first real test (R1) exists and passes.

---

### Assumptions and Dependencies

#### Assumptions

1. The solo-developer context means "team review" and "self-approval" are the same step throughout this document.
2. Maestro is assumed available/installable in this environment without the licensing/tooling friction this session hit with Android/Gradle — not yet verified; flagged as a dependency below.
3. Epic 2 implementation has not yet started (only Epic 1 Story 1.1 is complete), so all mitigations can land before any Epic 2 code exists, avoiding retrofit cost.

#### Dependencies

1. Jest + RNTL installation and first passing test — required before Story 1.2 begins (per R3's mitigation).
2. `lib/mechanic.ts` and `lib/storage.ts` must exist (Story 2.1 territory) before R1's boundary suite can be written against real code, though the test cases themselves can be drafted now against the Mechanic Specification.

#### Risks to Plan

- **Risk**: Maestro (or any chosen E2E tool) may hit the same environment friction (TLS interception, port conflicts, JAVA_HOME issues) this session hit setting up the Android build.
  - **Impact**: E2E test setup (C8/C9 in the coverage matrix) could take significantly longer than estimated.
  - **Contingency**: The environment fixes already found and documented this session (AVG cert import, JAVA_HOME to Android Studio JBR, Gradle `networkTimeout` bump, emulator port workaround) are reusable — apply them proactively rather than rediscovering them.

---

**End of Architecture Document**

**Next Steps for Architecture Team (solo dev):**

1. Review Quick Guide (🚨/⚠️/📋) and prioritize the 3 blockers.
2. Complete R1/R2/R3 mitigations before Epic 2 implementation resumes.
3. Validate assumptions and dependencies above.

**Next Steps for QA (solo dev, wearing the QA hat):**

1. Complete the 3 pre-implementation blockers.
2. Refer to the companion QA doc (`test-design-qa.md`) for the full test scenario list.
3. Begin test infrastructure setup (Jest config, first boundary-table test) before Story 1.2.
