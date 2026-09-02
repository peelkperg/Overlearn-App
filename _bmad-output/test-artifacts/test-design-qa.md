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

# Test Design for QA: Overlearn (System-Level)

**Purpose:** Test execution recipe. Defines what to test, how to test it, and what's needed before test development begins. Solo-developer project — "QA" and "Dev" are the same person (Gerardo), wearing different hats.

**Date:** 2026-08-31
**Author:** Claude (Master Test Architect), for Gerardo
**Status:** Draft
**Project:** Overlearn

**Related:** See `test-design-architecture.md` for full risk detail and testability concerns.

---

## Executive Summary

**Scope:** All 17 stories across 3 epics (Segment Management, The Overlearning Session, Practice History Review). Epic 1 Story 1.1 (project init) is already implemented and manually verified — no automated tests exist yet.

**Risk Summary:**

- Total Risks: 6 (3 high-priority score ≥6, 2 medium, 1 low)
- Critical Categories: TECH (2 of the 3 high-priority risks)

**Coverage Summary:**

- P0 tests: ~9 (mechanic correctness, session-state transitions, interruption/recovery)
- P1 tests: ~8 (feedback signals, accessibility, segment/history CRUD)
- P2 tests: ~2 (secondary a11y checks, dependency audit)
- P3 tests: 0 (app's scope is small enough that nothing is purely exploratory/benchmark-only at this stage)
- **Total**: ~19 tests (~30–48 hours, additive to Epic 2/3 story implementation — not a separate testing phase)

---

## Not in Scope

| Item | Reasoning | Mitigation |
|---|---|---|
| **Disaster recovery, backup/restore testing** | No server infrastructure — the app has nothing to "recover"; the user's device backup is entirely outside the app's control. | N/A — accepted, not a gap. |
| **Load/scalability testing** | Single user, single device, no concurrency. | N/A — accepted, not a gap. |
| **Security/AuthN-AuthZ testing** | No accounts, no auth, no network calls. | Verified by dependency audit (P2-002) instead. |
| **Blue/Green or Canary deployment testing** | App store releases are all-or-nothing; no deployment strategy exists to test. | N/A — accepted, not a gap. |
| **Cross-platform (iOS) verification this pass** | This session's manual verification was Android-only (emulator environment available). | iOS verification deferred to a later pass before any release; flagged, not silently dropped. |

**Note:** Items above reviewed and accepted as out-of-scope in the companion Architecture doc's "Accepted Trade-offs" section.

---

## Dependencies & Test Blockers

**CRITICAL:** Test development cannot proceed without these items.

### Architecture Dependencies (Pre-Implementation)

**Source:** See Architecture doc "Quick Guide" for full mitigation plans.

1. **R3: Test framework not pinned** - Solo dev - Before Story 1.2
   - Need: Jest + React Native Testing Library + `jest-expo` preset installed and configured.
   - Why it blocks testing: no test can be written at all without this.

2. **Feedback Signal System observability hook** - Solo dev - Before Story 2.5
   - Need: `useFeedbackSignal.ts` exposes which tier fired (return value or spy-able callback).
   - Why it blocks testing: P1-005/P1-006 below cannot assert tier-correctness without it.

3. **Test-data seeding for MMKV state** - Solo dev - Before Story 2.3
   - Need: test-only helper in `lib/storage.ts` to seed arbitrary `SessionState` directly.
   - Why it blocks testing: P0-001 (target-raise boundary) requires `total_incorrect_this_session = 11`, impractical via 11 manual UI taps.

### Test Infrastructure Setup (Pre-Implementation)

1. **Test data / state factories** - Solo dev
   - `SessionState`, `Segment`, `HistoryEntry` factory functions (plain TypeScript object builders — no `faker` dependency needed given the app's small, deterministic data shapes; a simple `createSessionState(overrides)` helper suffices).
   - No auto-cleanup fixtures needed for parallel safety — MMKV's `createMockMMKV()` test mode already isolates each test run.

2. **Test Environments**
   - Local (Unit/Component): Jest, no device/emulator needed.
   - Local/Nightly (E2E): Android emulator (already configured this session — reusable AVD `Pixel_8`, on port 5580 to avoid the pre-existing port-5562 conflict documented in Story 1.1's commit).
   - CI: none yet — solo dev runs `npm test` locally (per R3's mitigation, full CI automation deferred).

**Example factory pattern (adapted for this stack — no Playwright/faker, plain TS):**

```typescript
// lib/__test-utils__/factories.ts
import type { SessionState } from '../types';

export function createSessionState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    segmentName: 'Test Segment',
    currentStreak: 0,
    totalIncorrectThisSession: 0,
    sessionComplete: false,
    sessionStartTimestamp: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('target rises past the floor once total_incorrect exceeds 10 @P0', () => {
  const state = createSessionState({ totalIncorrectThisSession: 11 });
  expect(calculateTargetStreak(state.totalIncorrectThisSession)).toBe(6);
});
```

---

## Risk Assessment

**Note:** Full risk details in Architecture doc. Summarized here for test planning.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Score | QA Test Coverage |
|---|---|---|---|---|
| **R1** | TECH | Target-streak boundary bug around `total_incorrect_this_session = 10/11` | **6** | P0-001 through P0-005 (full boundary table) |
| **R2** | TECH | Native module API drift (already happened once: `new MMKV()` vs. `createMMKV()`) | **6** | Not directly test-covered — mitigated via documentation (architecture.md), not a runtime test |
| **R3** | OPS | No test framework/CI exists | **6** | Resolved by this document's own Dependencies section — self-referential: writing P0-001 is the verification that R3 is fixed |

### Medium/Low-Priority Risks

| Risk ID | Category | Description | Score | QA Test Coverage |
|---|---|---|---|---|
| R4 | DATA | Segment deletion cascades incorrectly | 4 | P1-007 (delete removes segment + history together) |
| R5 | PERF | Cumulative JS-thread work exceeds 100ms budget | 4 | P0-009 (perf test, run once Feedback Signal System is fully wired) |
| R6 | BUS | Restart used to escape a risen target (accepted tradeoff) | 2 | Not tested — explicitly accepted, not a defect |

---

## Entry Criteria

- [ ] Jest + RNTL + `jest-expo` installed and a trivial test passes (resolves R3)
- [ ] `lib/mechanic.ts` and `lib/session-transitions.ts` exist (Story 2.1+)
- [ ] Test-data seeding helper exists in `lib/storage.ts` (test-only, per Dependencies)
- [ ] `useFeedbackSignal.ts` exposes an assertion hook (per Dependencies, before P1-005/006)

## Exit Criteria

- [ ] All P0 tests passing (100%)
- [ ] All P1 tests passing (≥95%, failures triaged)
- [ ] No open HIGH risks (R1, R2, R3) in OPEN status
- [ ] Coverage ≥80% on `lib/mechanic.ts` and `lib/session-transitions.ts` specifically
- [ ] E2E suite (P0-007, P0-008) passes on-device before any release build

---

## Test Coverage Plan

**IMPORTANT:** P0/P1/P2 = priority and risk level, not execution timing. See Execution Strategy for timing.

### P0 (Critical)

**Criteria:** Blocks core functionality + High risk (≥6) + No workaround

| Test ID | Requirement | Test Level | Risk Link | Notes |
|---|---|---|---|---|
| **P0-001** | `calculateTargetStreak`: 0–9 → 5 (floor) | Unit | R1 | Epic 2, foundational to Story 2.1 |
| **P0-002** | `calculateTargetStreak`: 10 → 5 (ties floor, not yet raised) | Unit | R1 | The exact boundary the PRD calls out |
| **P0-003** | `calculateTargetStreak`: 11 → 6 (first raise) | Unit | R1 | `> 10`, not `>= 10` |
| **P0-004** | `calculateTargetStreak`: 12 → 6, 13 → 7 | Unit | R1 | Confirms formula, not a one-off special case |
| **P0-005** | Correct/Incorrect transition field-update order (streak reset → total increment → recalc) | Unit | R1 | Story 2.2/2.3 |
| **P0-006** | Restart resets all 4 fields atomically, confirm-gated | Unit + Component | ASR (Restart) | Story 2.4 |
| **P0-007** | Relaunch 3-way branch: no session / active session / `session_complete=true` routes correctly | E2E (on-device) | ASR (relaunch branch), NFR4 | Story 2.10 — highest-complexity conditional in the app |
| **P0-008** | Full session state survives backgrounding/kill, at most 1 tap lost | E2E (on-device) | R3, NFR3 | Story 2.9 |
| **P0-009** | Tap-to-render stays <100ms with full Feedback Signal System wired | E2E/perf (on-device) | R5, NFR1/NFR2 | Run once at end of Epic 2, not per-story |

**Total P0:** 9 tests

---

### P1 (High)

**Criteria:** Important features + Medium/high risk + Common workflows

| Test ID | Requirement | Test Level | Risk Link | Notes |
|---|---|---|---|---|
| **P1-001** | `session_complete=true` persisted synchronously with the triggering write | Unit (storage layer) | ASR | Story 2.5 |
| **P1-002** | Input rejected once session completes (FR22) | Component | — | Story 2.5 |
| **P1-003** | Four feedback tiers fire on correct trigger, distinguishable via injected spy | Component | Testability Concern #2 | Story 2.5, needs the observability hook dependency |
| **P1-004** | Target-raise tier includes screen-reader announcement | Component | NFR6/NFR7 | Story 2.3 |
| **P1-005** | Segment CRUD: create (validation), delete (cascades correctly) | Component | R4 | Stories 1.2, 1.6 (Story 1.5 Archive removed post-implementation, 2026-09-02) |
| **P1-006** | Segment list: independent state across segments, empty-state prompt | Component | — | Story 1.3 |
| **P1-007** | History log: chronological, correct fields, non-completed sessions excluded | Component | — | Story 3.1 |
| **P1-008** | Discard/Restart leave zero history record | Component/E2E | — | Stories 2.4, 2.10 |

**Total P1:** 8 tests

---

### P2 (Medium)

**Criteria:** Secondary features + Low risk + Edge cases

| Test ID | Requirement | Test Level | Risk Link | Notes |
|---|---|---|---|---|
| **P2-001** | All interactive controls meet 44×44pt minimum | Component (measured) | NFR6 | Any Active Session story |
| **P2-002** | Zero networking library present in dependency tree | Manual (dependency audit) | NFR8 | Not a runtime test — `npm ls` / `package.json` review |

**Total P2:** 2 tests

---

### P3 (Low)

None identified — the app's scope is small enough that no scenario is purely exploratory/benchmark-only at this stage.

---

## Execution Strategy

**Philosophy:** Run everything fast in Unit/Component form wherever the test level allows it; reserve on-device E2E for what genuinely requires real app-kill/relaunch behavior or real native-module timing.

**Organized by tool type (adapted for a no-backend RN mobile stack — no Playwright/k6 here):**

### Every commit: Jest (Unit + Component) tests (~<5 min once suite exists)

- P0-001 through P0-006, P0-009 excluded (perf, see below); P1-001 through P1-008; P2-001
- No emulator/device required — pure Jest + RNTL + MMKV's `createMockMMKV()`.
- **Why run every commit:** fast feedback, zero infrastructure cost.

### Before marking an Epic 2/3 story complete: Maestro E2E (on-device, ~minutes per run once the tool is set up)

- P0-007, P0-008, P0-009 (perf)
- **Why deferred from every-commit:** this session's own experience shows a first native Android build alone takes ~37 minutes; even incremental E2E runs are far slower than Jest. Not practical to gate every commit on, but essential before calling an interruption/recovery-related story "done."

### Before any release: full manual pass + P2-002

- P2-002 (dependency audit) plus a full re-run of the E2E suite on both Android and iOS (iOS explicitly out of scope for this pass — see Not in Scope).

**Manual tests (excluded from automation):**

- iOS on-device verification (deferred, not yet in scope)
- App Store / Play Store submission checks (EAS Submit success is the only "test")

---

## QA Effort Estimate

| Priority | Count | Effort Range | Notes |
|---|---|---|---|
| P0 | 9 | ~16–24 hours | Includes standing up Jest + RNTL + Maestro from zero (none exists yet) |
| P1 | 8 | ~10–16 hours | Standard unit/component coverage |
| P2 | 2 | ~4–8 hours | Simple validation, one manual check |
| P3 | 0 | — | None identified |
| **Total** | **19** | **~30–48 hours** | **Solo dev, additive to Epic 2/3 implementation — not a separate phase** |

**Assumptions:**

- Includes test design, implementation, and debugging; excludes ongoing maintenance.
- Most P0/P1 tests should be written alongside each story (test-alongside), not batched into a separate testing sprint.
- Assumes the three pre-implementation blockers (Dependencies section) are resolved first.

---

## Implementation Planning Handoff

| Work Item | Owner | Target Milestone | Dependencies/Notes |
|---|---|---|---|
| Install Jest + RNTL + jest-expo, add `npm test` script | Solo dev | Before Story 1.2 | Resolves R3 |
| Document `createMMKV()` v4 API in architecture.md | Solo dev | Immediate | Resolves R2, docs-only |
| Write P0-001–P0-004 (boundary table) against `lib/mechanic.ts` | Solo dev | Story 2.1 | Resolves R1 |
| Add test-data seeding helper to `lib/storage.ts` | Solo dev | Before Story 2.3 | Unblocks P0-002/003 without 11 manual taps |
| Add observability hook to `useFeedbackSignal.ts` | Solo dev | Before Story 2.5 | Unblocks P1-003/004 |
| Select and configure Maestro | Solo dev | Before Story 2.9/2.10 | Unblocks P0-007/008/009 |

---

## Tooling & Access

| Tool or Service | Purpose | Access Required | Status |
|---|---|---|---|
| Jest + `@testing-library/react-native` + `jest-expo` | Unit/Component tests | npm install | Pending |
| Maestro | On-device E2E tests | CLI install | Pending |
| Android emulator (`Pixel_8` AVD, port 5580) | E2E test target | Already configured this session | Ready |

**Access requests needed:** none — solo-dev local environment, no external service accounts.

---

## Interworking & Regression

| Component | Impact | Regression Scope | Validation Steps |
|---|---|---|---|
| `lib/mechanic.ts` | Central to all of Epic 2 | Every story that displays or checks the target streak | P0-001–P0-004 must stay green |
| `lib/storage.ts` | Central to persistence across all epics | Segment CRUD, session state, history | P1-001, P1-005, P1-007 must stay green |
| `useActiveSession` hook | Central to the entire Active Session screen | All of Epic 2's interaction stories | P0-005, P0-006, P1-002 must stay green |

**Regression test strategy:** since the whole app is 17 stories in 3 epics, the full Jest suite (all P0/P1/P2 non-E2E tests) should run before every commit once it exists — there is no meaningful subset to skip given the project's small size.

---

## Appendix A: Code Examples & Tagging

**Jest test tagging (via `describe.each`/naming convention — RN/Jest has no native `@P0` tag syntax like Playwright; use naming + `--testPathPattern` or a custom reporter if selective runs become necessary):**

```typescript
// lib/mechanic.test.ts
import { calculateTargetStreak } from './mechanic';
import { TARGET_FLOOR } from '../constants/mechanic';

describe('calculateTargetStreak [P0] [R1]', () => {
  it.each([
    [0, 5], [5, 5], [9, 5], [10, 5], // floor holds through 10
    [11, 6], [12, 6], [13, 7],       // first raise at 11
  ])('totalIncorrect=%i -> target=%i', (totalIncorrect, expected) => {
    expect(calculateTargetStreak(totalIncorrect)).toBe(expected);
  });

  it('never falls below TARGET_FLOOR', () => {
    expect(calculateTargetStreak(0)).toBe(TARGET_FLOOR);
  });
});
```

```typescript
// hooks/useActiveSession.test.ts (Component level, React Native Testing Library)
import { renderHook, act } from '@testing-library/react-native';
import { useActiveSession } from './useActiveSession';
import { createSessionState } from '../lib/__test-utils__/factories';

describe('useActiveSession restart [P0] [ASR]', () => {
  it('resets all four fields atomically on confirmed restart', () => {
    const { result } = renderHook(() => useActiveSession('segment-1'));

    act(() => {
      result.current.logIncorrect();
      result.current.logCorrect();
    });
    expect(result.current.currentStreak).toBe(1);

    act(() => {
      result.current.restart(); // assume confirm step already handled by caller
    });

    expect(result.current.currentStreak).toBe(0);
    expect(result.current.totalIncorrectThisSession).toBe(0);
    expect(result.current.sessionComplete).toBe(false);
  });
});
```

**Run tests:**

```bash
# All tests
npm test

# Watch mode during development
npm test -- --watch

# Specific file
npm test -- lib/mechanic.test.ts
```

---

## Appendix B: Knowledge Base References

- **Risk Governance**: `risk-governance.md` — risk scoring methodology
- **Test Levels Framework**: `test-levels-framework.md` — Unit vs. Component vs. E2E selection (adapted here for RN/no-backend, not the framework's default Playwright/web examples)
- **Test Quality**: `test-quality.md` — Definition of Done (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **ADR Quality Readiness Checklist**: `adr-quality-readiness-checklist.md` — most categories N/A for this local-only app; see Architecture doc's "Accepted Trade-offs"

---

**Generated by:** BMad TEA Agent (Claude, Sonnet 5)
**Workflow:** `bmad-testarch-test-design`
**Version:** 4.0 (BMad v6)
