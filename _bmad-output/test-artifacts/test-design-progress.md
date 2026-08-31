---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-08-31'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - resources/knowledge/risk-governance.md
  - resources/knowledge/test-levels-framework.md
  - resources/knowledge/test-quality.md
  - resources/knowledge/adr-quality-readiness-checklist.md
---

# Test Design Progress — Overlearn

## Step 1: Detect Mode & Prerequisites

**Mode selected:** System-Level Mode.

**Rationale:** Both PRD (`_bmad-output/planning-artifacts/prd.md`) and Architecture/ADR (`_bmad-output/planning-artifacts/architecture.md`) exist, and Epic/Stories (`_bmad-output/planning-artifacts/epics.md`) also exist. Per the mode-detection priority rule, when both are present, System-Level Mode is preferred first — it produces the foundational risk assessment and test strategy that an epic-level pass would otherwise have to reconstruct piecemeal.

**Prerequisite check (System-Level Mode):**
- PRD (functional + non-functional requirements): ✓ present, 29 FRs, 9 NFRs
- ADR / architecture decision records: ✓ present (`architecture.md`, 8-step workflow, status complete)
- Architecture or tech-spec document: ✓ same document covers this

All prerequisites satisfied — no halt condition triggered.

## Step 2: Load Context & Knowledge Base

**Configuration:** No `_bmad/tea/config.yaml` exists in this project — all `tea_use_playwright_utils`, `tea_use_pactjs_utils`, `tea_pact_mcp`, `tea_browser_automation` flags default off/unset. `test_stack_type` defaults to `"auto"`.

**Stack detection:** Scanned `{project-root}` — no `playwright.config.*`, no `cypress.config.*`, no backend indicators (`pyproject.toml`, `pom.xml`/`build.gradle` at repo root, `go.mod`, `*.csproj`, `Gemfile`, `Cargo.toml`). This is a React Native / Expo **mobile** app with **zero backend** (per architecture.md: no API, no server infrastructure of any kind — fully offline). Detected stack: **mobile frontend, no backend, no web** — none of `frontend`/`backend`/`fullstack` cleanly fits the auto-detection categories built for web/API stacks; treating as a standalone mobile-frontend variant.

**Project artifacts loaded (System-Level Mode):**
- PRD (`prd.md`) — 29 FRs, 9 NFRs, Mechanic Specification
- Architecture (`architecture.md`) — full ADR: React Native/Expo SDK 57, react-native-mmkv (synchronous writes), derive-on-read `target_streak`, no backend/API/auth
- Epics (`epics.md`, for scope) — 3 epics, 17 stories, 100% FR coverage

**Extracted:**
- **Tech stack & dependencies:** Expo SDK 57, React Native 0.86, TypeScript, Expo Router, react-native-mmkv + react-native-nitro-modules, expo-dev-client. No Redux/Zustand, no SQLite, no networking library.
- **Integration points:** None external (no API, no third-party services). Internal only: UI → hooks (`useActiveSession`, `useSegments`, `useSegmentHistory`) → `lib/` (storage, mechanic calculation) → MMKV.
- **NFRs:** NFR1/NFR2 (100ms tap latency, no async block), NFR3 (session state survives kill), NFR4 (mandatory resume/discard prompt), NFR5 (durable history), NFR6/NFR7 (accessibility), NFR8/NFR9 (zero network, zero accounts).

**Knowledge fragments loaded (System-Level required):** `adr-quality-readiness-checklist.md`, `test-levels-framework.md`, `risk-governance.md`, `test-quality.md`.

**Playwright/Pact utils:** Not applicable — no browser/web surface, no microservices/contracts. Skipped.

**Browser exploration:** Not applicable — mobile-only app, no browser target. Skipped.

**Note on the ADR checklist's fit:** the 8-category/29-criteria framework is written for backend/microservice architectures. Several categories (Disaster Recovery's RTO/RPO/failover, Deployability's Blue/Green/Canary, Scalability's horizontal scaling) don't map onto a local-only, no-backend mobile app and will be marked N/A with rationale in Step 3, rather than force-fit.

**Confirmed with user:** all required inputs present; proceeding.

## Step 3: Testability & Risk Assessment

### 🚨 Testability Concerns

1. **No test-data seeding mechanism for MMKV state.** Reaching `total_incorrect_this_session = 11` (the target-raise boundary) by tapping through the UI 11 times is impractical for automated tests. `lib/storage.ts` needs a test-only helper to seed arbitrary `SessionState` values directly. **ACTIONABLE.**
2. **Feedback Signal System has no observability hook for tests.** Haptics/sound have no natural assertion point in RN testing — `useFeedbackSignal.ts` should expose which tier fired (e.g., a return value, a spy-able callback, or an injected dependency) so tests can assert "the alert tier fired" without touching real audio/haptic hardware. **ACTIONABLE.**
3. **No E2E/on-device test tooling chosen.** This session's own manual verification of Story 1.1 (native build, emulator, screen taps) proved how much can only be caught on-device — a framework like Maestro or Detox is needed for the interruption/resume flow and the Active Session screen's custom components, which unit tests alone cannot cover. **ACTIONABLE.**
4. **`session_start_timestamp = now` is not controllable in tests.** No time-injection/clock-mocking strategy is defined; Restart and session-start assertions need deterministic time control (e.g., inject a clock function rather than calling `Date.now()`/`new Date()` directly in `lib/`). **ACTIONABLE.**

### ✅ Testability Assessment Summary

- **Zero network surface** (NFR8) eliminates an entire class of test flakiness (mocking APIs, network timeouts, contract drift) that most test-design work has to solve for.
- **Single source of truth for the mechanic formula** (`calculateTargetStreak` in `lib/mechanic.ts`) is a pure function — trivially unit-testable, no framework dependency, no mocking needed.
- **One-directional data flow** (UI → hooks → `lib/` → storage, per architecture.md) gives a clean seam: hooks can be tested against a real or swapped storage layer without touching UI.
- **`react-native-mmkv` v4 ships a built-in test-mode mock** (`isTest()` → `createMockMMKV()`), meaning the storage layer already has isolation infrastructure without custom mocking work.
- **No auth, no multi-tenancy, no PII** — dramatically smaller test-data surface than the checklist's default assumptions (Category 2, Test Data Strategy, is nearly moot here).

### Architecturally Significant Requirements (ASRs)

| ASR | Status | Rationale |
|---|---|---|
| Synchronous MMKV write on every tap (NFR1/NFR2) | **ACTIONABLE** | Needs an explicit timing/perf test asserting <100ms end-to-end — trusting the library's claimed speed isn't sufficient evidence for a hard NFR. |
| Derive-on-read `target_streak` (single formula) | FYI | Already trivially testable; no special action beyond normal unit coverage. |
| `session_complete` synchronous persistence → completion-resume routing | **ACTIONABLE** | Subtle state-machine correctness (kill mid-Completion-screen → resume must route to Completion, not the resume/discard prompt) — easy to silently regress; needs dedicated integration-level coverage. |
| No undo on Correct/Incorrect (FR19) | FYI | Absence-of-feature constraint; testable as "no undo control exists in the DOM/tree," low complexity. |
| Restart's atomic 4-field reset | **ACTIONABLE** | Multi-field state transition — needs a test verifying all four fields (`current_streak`, `total_incorrect_this_session`, target, `session_start_timestamp`) reset together, not partially. |
| Relaunch 3-way branch (no session / active session / completed session) | **ACTIONABLE** | Highest-complexity conditional in the app, directly maps to NFR4 ("never silently resume or discard") — needs explicit coverage of all three branches, not just the happy path. |

### Risk Assessment

| ID | Category | Risk | Probability | Impact | Score | Level |
|---|---|---|---|---|---|---|
| R1 | TECH | Target-streak boundary bug (off-by-one around `total_incorrect_this_session = 10/11`) ships uncaught — this is the exact scenario the PRD's own Technical Success criterion names as the thing that must be 100%-tested. | 2 | 3 | 6 | HIGH |
| R2 | TECH | Native module API drift causes silent/confusing runtime breakage. **Already materialized once this session** (`react-native-mmkv` v4's `createMMKV()` vs. the outdated `new MMKV()` API I initially wrote) — a recurring hazard for any future story touching MMKV or other Nitro-based native modules. | 3 | 2 | 6 | HIGH |
| R3 | OPS | No test framework or CI pipeline exists — confirmed gap from the architecture readiness check, still open. Regressions across 17 stories have no automated safety net; a solo dev catching everything manually doesn't scale past Epic 1. | 3 | 2 | 6 | HIGH |
| R4 | DATA | Segment deletion (FR6) cascades incorrectly — deletes/orphans the wrong segment's history, or leaves orphaned history entries behind. | 2 | 2 | 4 | MEDIUM |
| R5 | PERF | Cumulative synchronous work on the JS thread (MMKV write + all four Feedback Signal tiers) creeps past the 100ms budget as Epic 2's stories stack up, even though Story 1.1's bare MMKV write alone is fast. | 2 | 2 | 4 | MEDIUM |
| R6 | BUS | Restart's confirm-gate doesn't stop a user from using it to escape a legitimately-risen target late in a session — explicitly accepted as a design tradeoff in the PRD (Journey 4), not a defect. | 2 | 1 | 2 | LOW (accepted, no mitigation needed) |

**No CRITICAL (score = 9) risks identified.** Three HIGH risks (R1, R2, R3) require documented mitigation before Epic 2 implementation resumes.

### Mitigation Plan (HIGH risks)

| Risk | Mitigation | Owner | Timeline |
|---|---|---|---|
| R1 | Dedicated unit test suite for `calculateTargetStreak()` covering the full 0–13 boundary table already documented in the Mechanic Specification (PRD), plus the exact `> 10` vs `>= 10` comparison. | Solo dev (Gerardo) | Before Story 2.1 (first story that renders live target) |
| R2 | Pin exact dependency versions in `architecture.md`'s Core Architectural Decisions (already partially done); add a one-line note there documenting the `createMMKV()` v4 API explicitly, so no future story reintroduces the `new MMKV()` mistake. | Solo dev (Gerardo) | Immediately (documentation fix, no code) |
| R3 | Pin Jest + React Native Testing Library as the unit/component test framework (resolves the architecture readiness check's still-open gap); add a minimal test script to `package.json`. E2E tooling (Maestro/Detox) selection deferred to Epic 2, where the Active Session screen's on-device behavior first needs it. | Solo dev (Gerardo) | Before Story 1.2 |

### Summary

Three HIGH risks (score 6), no CRITICAL risks. All three are addressable without architectural rework — two are process/tooling fixes (R2, R3), one is a targeted test-writing task against an already-fully-specified formula (R1). This assessment directly resolves the "testing framework not pinned" gap flagged in the earlier implementation-readiness check.

**R2 fixed immediately (docs-only):** `architecture.md`'s Core Architectural Decisions section now explicitly documents the `createMMKV()` v4 API, citing this session's own build break as evidence.

## Step 5: Generate Outputs & Validate

**Execution mode:** Sequential (no `_bmad/tea/config.yaml`, no team/subagent orchestration available or needed for a solo-session run).

**Documents generated:**
- `_bmad-output/test-artifacts/test-design-architecture.md` — architecture-facing risk/testability doc
- `_bmad-output/test-artifacts/test-design-qa.md` — QA-facing execution recipe (coverage matrix, execution strategy, effort estimate)
- `_bmad-output/test-artifacts/test-design/Overlearn-handoff.md` — BMAD handoff (retroactive, since `epics.md` already existed)

**Validation against `checklist.md`:** ran a genuine pass, found and fixed real violations — the architecture doc initially restated tool selection and quality-gate specifics (checklist explicitly reserves these for the QA doc) and had a leftover thinking-artifact typo ("P2 (5, wait — recount below)"); both trimmed. R1/R3's Risk Mitigation Plans were QA-owned content duplicated into the architecture doc — trimmed to cross-references per the checklist's "no duplicate content" rule. No orphaned CLI sessions (no browser automation used — mobile app, no browser target). All artifacts stored under `_bmad-output/test-artifacts/`, not scattered.

**Key risks:** R1 (target-streak boundary, TECH, score 6), R2 (native module API drift, TECH, score 6 — already fixed in architecture.md), R3 (no test framework/CI, OPS, score 6). Zero CRITICAL risks.

**Gate thresholds:** P0 = 100% pass, P1 ≥ 95%, all 3 HIGH risks mitigated before Epic 2 resumes, ≥80% coverage on `lib/mechanic.ts` and `lib/session-transitions.ts`.

**Open assumptions:** Maestro assumed available without the environment friction this session hit setting up the Android/Gradle build (not yet verified — flagged as a risk-to-plan in the architecture doc). iOS verification explicitly out of scope for this pass.

No `_bmad/tea/config.yaml`'s `on_complete` hook exists — nothing further to run.

## Step 4: Coverage Plan & Execution Strategy

No RN-specific `test-priorities-matrix.md` variance needed — using the priority rules given directly in this workflow step (P0 = blocks core functionality + high risk + no workaround; P1 = critical paths + medium/high risk; P2 = secondary flows + low/medium risk; P3 = nice-to-have/exploratory/benchmark).

**Test levels for this stack** (no backend, no browser — adapted from `test-levels-framework.md`'s web/API examples):
- **Unit** → Jest, pure functions and hook logic
- **Component** → React Native Testing Library (RNTL), screen/component rendering + interaction, MMKV's built-in test-mode mock (`isTest()` → `createMockMMKV()`)
- **E2E (on-device)** → Maestro or Detox, for flows unit/component tests structurally cannot cover (app backgrounding/kill, real native-module behavior, real haptics/audio firing)
- No "API" level exists — there is no API.

### Coverage Matrix

| # | Scenario | Risk/ASR | Test Level | Priority |
|---|---|---|---|---|
| C1 | `calculateTargetStreak()` full boundary table: 0–9→5, 10→5, 11→6, 12→6, 13→7 (exact `> 10` comparison, not `>= 10`) | R1 | Unit | P0 |
| C2 | Correct tap: `current_streak += 1`; completion triggers when `current_streak >= target_streak` | FR16, FR18, FR12 | Unit (transition fn) + Component (UI) | P0 |
| C3 | Incorrect tap: field-update order — `current_streak = 0`, then `total_incorrect_this_session += 1`, then recalculate target | FR10, FR17, FR18 | Unit | P0 |
| C4 | No undo affordance exists on Correct/Incorrect (absence test) | FR19 (ASR: FYI) | Component | P2 |
| C5 | Restart: all four fields (`current_streak`, `total_incorrect_this_session`, target, `session_start_timestamp`) reset atomically, confirm-gated | FR20, FR21 (ASR: ACTIONABLE) | Unit (transition fn) + Component (confirm dialog) | P0 |
| C6 | Input rejected once `session_complete = true` (FR22) | FR22 | Component | P1 |
| C7 | `session_complete = true` persisted synchronously with the triggering `current_streak` write | ASR: ACTIONABLE | Unit (storage layer) | P0 |
| C8 | Relaunch 3-way branch: no session → segment list; active session → resume/discard prompt; `session_complete = true` → routes directly to Completion screen | FR24–26, NFR4 (ASR: ACTIONABLE) | E2E (on-device, app kill/relaunch) | P0 |
| C9 | Full session state (5 persisted fields) survives backgrounding/kill with at most one tap lost | FR23, NFR3 | E2E (on-device) | P0 |
| C10 | Tap-to-render latency stays under 100ms with the full Feedback Signal System wired (not just the bare MMKV write) | NFR1, NFR2, R5 | E2E/perf (on-device timing) | P1 |
| C11 | Four feedback tiers fire on the correct trigger and are distinguishable (ordinary/mild/alert/completion) — asserted via the exposed observability hook, not real audio/haptics | R5 dependency, Testability Concern #2 | Component (with injected spy) | P1 |
| C12 | Target-raise tier includes a screen-reader announcement (`AccessibilityInfo.announceForAccessibility`), not just haptic/visual | NFR6/NFR7, UX-DR3 | Component | P1 |
| C13 | All interactive controls meet 44×44pt minimum touch target | NFR6 | Component (measured) | P2 |
| C14 | Correct/Incorrect remain distinguishable without color (position + icon shape) | NFR7 | Component (manual/snapshot) | P2 |
| C15 | Segment CRUD: create (non-empty validation), archive (removed from active list, data preserved), delete (segment + history removed together) | FR1, FR5, FR6, R4 | Component | P1 |
| C16 | Segment list: independent state across multiple segments, empty-state prompt when zero segments | FR2, FR4, FR7 | Component | P1 |
| C17 | History log: chronological order, correct fields (date/target/mistakes/attempts), non-completed sessions excluded | FR27–29 | Component | P1 |
| C18 | Discard leaves zero history record; Restart leaves zero history record | FR26, Restart AC | Component/E2E | P1 |
| C19 | Zero networking library present in dependency tree (static/manual check, not a runtime test) | NFR8 | Manual (dependency audit) | P2 |

**Duplicate-coverage guard applied:** C2/C3/C5 are tested once at Unit level (pure transition logic) and once at Component level (that the UI actually calls the transition and re-renders) — not duplicated at E2E, since no interruption/native behavior is involved in an ordinary tap. C8/C9 are E2E-only because they fundamentally require real app-kill/relaunch behavior that Unit/Component levels cannot simulate.

### Execution Strategy

- **PR (every commit):** C1–C7, C11–C19 (Unit + Component) — all fast, no device/emulator required, comfortably under 15 minutes even as the suite grows through Epic 2/3.
- **Nightly/Manual (pre-story-completion, not every commit):** C8, C9, C10 (E2E, on-device) — these require an emulator/device and are the ones this session's own manual verification of Story 1.1 already demonstrated take real wall-clock time (first native build alone: ~37 minutes). Not practical to run on every commit for a solo dev; run before marking an Epic 2 story complete, and again before any release.
- **Weekly/Pre-release:** C19 (dependency audit) and a full re-run of the E2E suite.

### Resource Estimates

- **P0 (9 scenarios: C1, C2, C3, C5, C7, C8, C9):** ~16–24 hours — includes standing up Jest + RNTL + an E2E tool (Maestro recommended for its lower setup overhead vs. Detox) from zero, since none exists yet.
- **P1 (8 scenarios):** ~10–16 hours.
- **P2 (5 scenarios):** ~4–8 hours.
- **P3:** none identified at this stage — the app's scope is small enough that no scenario is purely exploratory/benchmark-only.
- **Total:** ~30–48 hours across all priorities — this is additive to Epic 2's implementation stories, not separate from them; realistically most P0/P1 unit and component tests should be written alongside each story (test-alongside, not a separate testing epic), with the E2E suite built out specifically before Story 2.9/2.10 (interruption & recovery) since those are what C8/C9 exist to cover.

### Quality Gates

- **P0 pass rate: 100%** — no P0 scenario may be skipped or waived; these map directly to the PRD's explicit "100%-tested mechanic logic" Technical Success criterion and the two HIGH-risk ASRs (R1, R2/R3-adjacent).
- **P1 pass rate: ≥ 95%.**
- **All three HIGH risks (R1, R2, R3) mitigated before Epic 2 implementation resumes** — per the Mitigation Plan in Step 3.
- **Coverage target: ≥ 80%** on `lib/mechanic.ts` and `lib/session-transitions.ts` specifically (the two files the entire mechanic depends on) — not a blanket repo-wide percentage, since the standard-screen CRUD code carries much lower risk and doesn't need the same bar.
