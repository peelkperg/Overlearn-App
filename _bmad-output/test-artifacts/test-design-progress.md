---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output', 'v1.1-step-01-detect-mode', 'v1.1-step-02-load-context', 'v1.1-step-03-risk-and-testability', 'v1.1-step-04-coverage-plan', 'v1.1-step-05-generate-output']
lastStep: 'v1.1-step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-06'
v1.1Scope: 'Epic-Level Mode — Epic 4 (Segment Organization & Insight) and Epic 5 (Configurable Overlearning Target), FR30-FR40. v1.0 run above is complete and frozen; this run extends the document, matching the extend-not-regenerate pattern used for prd.md/architecture.md/epics.md.'
v1.1InputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/project-context.md
  - resources/knowledge/risk-governance.md
  - resources/knowledge/probability-impact.md
  - resources/knowledge/test-levels-framework.md
  - resources/knowledge/test-priorities-matrix.md
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

## v1.1 Step 2: Load Context & Knowledge Base

**Mode:** Epic-Level (Epic 4 + Epic 5, explicit user intent — both PRD/ADR and epics/stories exist, but the user's request named epics specifically).

**Configuration (`_bmad/tea/config.yaml`, hand-created for this project):** `test_framework: jest`, `risk_threshold: p2`, `tea_use_playwright_utils: false`, `tea_use_pactjs_utils: false`, `tea_pact_mcp: none`, `tea_browser_automation: none`, `test_stack_type: auto`. All Playwright/Pact/browser loading skipped as not applicable (same as v1.0 — offline mobile app, no browser/backend surface).

**Project artifacts loaded (Epic-Level Mode):**
- `epics.md` — v1.1 Requirements Inventory (FR30–FR40, UX-DR13–25), Epic 4 (5 stories), Epic 5 (3 stories), all with Given/When/Then ACs
- `architecture.md` — v1.1 Architectural Decisions section (`lib/settings.ts`, optional-parameter threading, Rename Propagation table, Solidification % formula, new routes)
- `project-context.md` — critical implementation rules (untrusted-storage type guards, `useSyncExternalStore` snapshot-identity rule, MMKV key naming, testing rules: co-located tests, `jest.setup.js`'s shared mock, async RNTL v14 APIs)
- Prior system-level test-design outputs (`test-design-architecture.md`, `test-design-qa.md`) — v1.0 only, reviewed for pattern continuity, not requirement content

**Existing test coverage scan:** `src/lib/segments.ts` has no `renameSegment`/`duplicateSegment`/sort logic yet — confirms v1.1 is unimplemented, as expected. Existing test patterns to extend: `src/lib/segments.test.ts` (unit, pure-function assertions on `disambiguate`/`normalizeSegmentName` equivalents), `src/components/SegmentListItem.test.tsx` (component, row menu), `src/app-tests/*.test.tsx` (screen-level, co-located in the special non-route test directory).

**Note — investigated and resolved without a finding:** FR31 requires rename to reach 5 display sites; grepping the current (v1.0) codebase shows `StreakReadout`, `CompletionScreen`, and `ResumeDiscardDialog` all currently consume the frozen `session.segmentName` snapshot, which looked like a gap. `architecture.md`'s "Rename Propagation (FR31)" section (already extended for v1.1) resolves this explicitly: those 3 sites switch to a live lookup (`useSegment(id)` / `useSegment(session.segmentId)`), while `SessionState.segmentName` stays in the schema unused as a defensive fallback. No architecture change needed — recorded here as a **testability item**: Story 4.1's dev agent must implement the live-lookup switch, not just call `renameSegment` and assume existing display code already reflects it.

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

## v1.1 Step 3: Risk Assessment (Epic-Level — no testability review, per mode rules)

### Risk Assessment

| ID | Category | Risk | Probability | Impact | Score | Level |
|---|---|---|---|---|---|---|
| R7 | DATA | `disambiguate`'s self-exclusion fix (rename to the same name in different case, e.g. "bar 24" → "Bar 24") is called out in `architecture.md:678` as a "small, testable change to existing logic" — easy to regress since the naive fix (excluding by id) must still catch a *different* case-insensitive collision with a *third* segment. | 2 | 2 | 4 | MEDIUM |
| R8 | BUS | FR31's rename-propagation (5 sites) requires 3 of them to switch from a stored `session.segmentName` snapshot to a live lookup (architecture.md's Rename Propagation table). If Story 4.1 implements `renameSegment` but misses the live-lookup switch in `StreakReadout`/`CompletionScreen`/`ResumeDiscardDialog`, a rename silently fails to propagate to an in-progress or interrupted session's UI — high probability of partial implementation since it's a cross-file change with no compiler enforcement tying it to the rename action itself. | 3 | 2 | 6 | HIGH |
| R9 | TECH | `useSegments()` gains a `subscribeToHistory` subscription for FR33's live re-sort on session completion (architecture.md:617) — a genuinely new cross-cutting wire-up, the one place v1.1 isn't just reusing an existing pattern. Risk of over-subscribing (re-rendering the whole list on every segment's history write, not just visible/sorted-by ones) or under-subscribing (missing the re-sort FR33's AC explicitly requires). | 2 | 2 | 4 | MEDIUM |
| R10 | DATA | FR33/FR38's Solidification % aggregation (`calculateSolidificationPercent`) must return `null` for zero completed sessions, not `0` — UI renders "—" vs a misleading "0%". A boundary slip here silently misrepresents a brand-new segment as having a 0% success rate, which reads as a real (bad) measurement rather than "no data yet." | 2 | 2 | 4 | MEDIUM |
| R11 | TECH | FR40's inline rename (1s press-and-hold) swaps `<Text>` for `<TextInput>` in place at 2 of the app's display sites (list row, detail heading) while FR30's dedicated screen also targets the same underlying `renameSegment`. Two independent UI entry points converging on one validation/disambiguation path is a natural place for one path to drift out of sync with the other (e.g. FR30's screen validates on submit; FR40's inline field must replicate the exact same non-empty + disambiguation behavior without `SegmentForm`'s shared component). | 2 | 2 | 4 | MEDIUM |
| R12 | OPS | No E2E/on-device tool was ever selected in v1.0 (R3's mitigation deferred it to Epic 2, then Epic 2 shipped without one per the actual repository scan — only Jest + RNTL exist). FR40's long-press/`delayLongPress` timing and FR39's `accessibilityLiveRegion="polite"` announcement are both real-device behaviors that Jest/RNTL cannot meaningfully assert (fake timers can simulate the delay, but not actual touch-and-hold gesture recognition or screen-reader announcement delivery). | 2 | 2 | 4 | MEDIUM |
| R13 | BUS | FR36 restricts overlearning-% to 50–300% in 10-point steps with UI-disabled bounds — but `lib/settings.ts`'s stored value has no runtime type-guard range check called out in architecture.md (unlike `Segment`/`HistoryEntry`'s guards). Corrupted on-device storage (or a future bug bypassing the stepper) could write an out-of-range value that `calculateTargetStreak` then accepts silently, producing a target outside the specified 50–300% envelope. | 1 | 2 | 2 | LOW |

**No HIGH-or-above risk carries an unmitigated score of 9** — R8 (score 6) is the only HIGH, and its mitigation is a direct testing action, not a design change (architecture.md's Rename Propagation table already specifies the correct target state; the risk is implementation drift from that spec, which a targeted test catches).

### Mitigation Plan

| Risk | Mitigation | Owner | Timeline |
|---|---|---|---|
| R8 | Story 4.1's test suite must include an explicit assertion for each of the 3 live-lookup sites (not just `renameSegment`'s own unit test) — a component test per site (`StreakReadout`, `CompletionScreen`, `ResumeDiscardDialog`) rendered with a segment renamed after the session/prompt was constructed, asserting the new name displays. | Solo dev (Gerardo) | Before Story 4.1 marked complete |
| R7 | Unit test matrix for `disambiguate`'s self-exclusion: (a) rename to own name, different case → succeeds; (b) rename to a *different* existing segment's name, matching case → disambiguated; (c) rename to a different segment's name in a *different* case → still disambiguated (this is the one the naive id-exclusion fix could miss). | Solo dev (Gerardo) | Before Story 4.1 marked complete |
| R9 | Unit test on `useSegments()`'s new subscription: completing a session for a segment not currently sorted to the top must still trigger a re-render when sort key is last-practiced/Solidification %, and a completion for an unrelated segment must not cause unnecessary re-renders of unaffected rows (assert via render-count spy, not just final output). | Solo dev (Gerardo) | Before Story 4.3 marked complete |
| R10 | Boundary unit test on `calculateSolidificationPercent`: zero completed sessions → `null`; one completed session with 0 correct → `0` (a real, displayable 0%, distinct from `null`). | Solo dev (Gerardo) | Before Story 4.4 marked complete |
| R11 | Shared-path test: both FR30's screen submit and FR40's inline submit call through to the same `renameSegment` assertions (empty-name rejection, disambiguation) — implemented as one parametrized test exercised from both UI entry points, not two independently-written tests that could silently diverge. | Solo dev (Gerardo) | Before Story 4.5 marked complete |
| R12 | Accept as a documented gap, consistent with v1.0's R3 resolution (Jest/RNTL only, no E2E tool ever added). FR40's long-press timing gets a fake-timer unit test on the `onLongPress`/`delayLongPress` wiring (verifies the threshold value, not real touch delivery); FR39's live-region gets a static-props assertion (`accessibilityLiveRegion="polite"` is set), not a runtime announcement test. Both are noted as manual on-device verification items before release, same tier as v1.0's Story 2.9/2.10. | Solo dev (Gerardo) | Manual pass before v1.1 release, per Story 4.5 / 5.3 |
| R13 | Add a runtime range guard to `lib/settings.ts`'s read path (reject/clamp an out-of-range `overlearningPercent` on read, same pattern as `isNonNegativeInteger` in `types.ts`), rather than trusting the stepper as the only enforcement point. | Solo dev (Gerardo) | Before Story 5.1 marked complete |

### Resource Estimates

- **P0 (9 scenarios: C1, C2, C3, C5, C7, C8, C9):** ~16–24 hours — includes standing up Jest + RNTL + an E2E tool (Maestro recommended for its lower setup overhead vs. Detox) from zero, since none exists yet.
- **P1 (8 scenarios):** ~10–16 hours.
- **P2 (5 scenarios):** ~4–8 hours.
- **P3:** none identified at this stage — the app's scope is small enough that no scenario is purely exploratory/benchmark-only.
- **Total:** ~30–48 hours across all priorities — this is additive to Epic 2's implementation stories, not separate from them; realistically most P0/P1 unit and component tests should be written alongside each story (test-alongside, not a separate testing epic), with the E2E suite built out specifically before Story 2.9/2.10 (interruption & recovery) since those are what C8/C9 exist to cover.

## v1.1 Step 4: Coverage Plan & Execution Strategy

### Coverage Matrix

| # | Scenario | FR/Risk | Test Level | Priority |
|---|---|---|---|---|
| C20 | `renameSegment`: valid new name updates storage; empty/whitespace-only name rejected (mirrors FR1's existing validation) | FR30 | Unit | P0 |
| C21 | `disambiguate` self-exclusion matrix: own name different case → succeeds; another segment's name same case → disambiguated; another segment's name different case → still disambiguated | FR30, R7 | Unit | P0 |
| C22 | Rename propagates live to `StreakReadout`, `CompletionScreen`, `ResumeDiscardDialog` via `useSegment(id)`/`useSegment(session.segmentId)` — segment renamed after session/prompt construction, name updates without remount | FR31, R8 | Component | P0 |
| C23 | Rename propagates to list row and detail heading (already-live `segment.name` — regression guard, not new logic) | FR31 | Component | P2 |
| C24 | `duplicateSegment`: new id, new `createdAt`, disambiguated name, zero copied history entries; original segment and its history untouched | FR32 | Unit | P0 |
| C25 | Duplicate confirmation snackbar renders with the new name and `accessibilityLiveRegion="polite"` | FR32, UX-DR21, UX-DR24 | Component | P2 |
| C26 | Sort menu: 4 options listed, active option marked; tapping a different option applies its documented default direction; tapping the active option flips direction | FR33, UX-DR18, UX-DR19 | Component | P0 |
| C27 | Sort with a segment having zero completed sessions: sorts as oldest-possible-date/0% under last-practiced or Solidification % sort, in either direction | FR33 | Unit | P1 |
| C28 | `useSegments()`'s new `subscribeToHistory` wiring: a session completion re-sorts a visible list under last-practiced/Solidification % sort without remount; an unrelated write does not force a full-list re-render | FR33, R9 | Component/Hook | P1 |
| C29 | Sort choice (option + direction) persists in `lib/settings.ts` and is restored after simulated relaunch | FR34 | Unit | P0 |
| C30 | Sort control hidden at 0 or 1 segments; screen-reader announcement names both key and direction | UX-DR19, UX-DR24 | Component | P2 |
| C31 | `calculateSolidificationPercent`: `null` for zero completed sessions; correct aggregate correct÷total across multiple sessions; `0` (not `null`) distinguished from a genuine 0%-correct session | FR38, R10 | Unit | P0 |
| C32 | History screen summary line renders "Solidification: {percent}%" or "Solidification: —" per the above, positioned between heading and entry list | FR38, UX-DR23 | Component | P1 |
| C33 | Inline rename (long-press): 1s `delayLongPress` triggers edit mode with no layout shift; normal tap still navigates (threshold does not intercept short taps) | FR40, UX-DR25, R11 | Component (fake-timer) | P0 |
| C34 | Inline rename commit/revert: `onSubmitEditing` saves via the same validation/disambiguation path as C20/C21; blur-without-submit reverts to original name; empty submit rejected with field remaining editable | FR40, R11 | Component | P0 |
| C35 | Inline rename shares one validation code path with the dedicated Rename screen (parametrized test run from both entry points) | FR40, R11 | Unit | P1 |
| C36 | Settings stepper: `+`/`−` change value by 10, save immediately, disable at 50%/300% bounds with `accessibilityState: { disabled: true }` | FR35, FR36, UX-DR14, UX-DR24 | Component | P0 |
| C37 | `lib/settings.ts` default envelope (`{ overlearningPercent: 50, sortKey: 'createdAt', sortDirection: 'asc' }`) reproduces v1.0 behavior exactly on first read (no settings ever saved) | FR35, FR36 | Unit | P0 |
| C38 | `calculateTargetStreak`/`logCorrect`/`logIncorrect`'s optional second parameter: omitted → v1.0 default (50%) exact prior behavior, unchanged existing test assertions; explicit value → target scales accordingly | FR36, FR37 | Unit | P0 |
| C39 | A changed overlearning-% is read live by an in-progress session's target-streak display with no restart (derive-on-read verification, same shape as v1.0's Story 2.9) | FR37 | Component/Hook | P0 |
| C40 | Standing in-progress-session notice: renders with segment name when `session.active` exists, absent when it doesn't, persists unchanged across repeated stepper taps (no per-tap dialog) | FR39, UX-DR17, UX-DR24 | Component | P1 |
| C41 | Two new routes (`app/settings.tsx`, `app/segment/[id]/rename.tsx`) present in both `STACK_SCREENS` and `_layout.tsx`'s `<Stack.Screen>` list — regression guard for the project's known silent-drop failure mode | Architecture note (route registration) | Unit (static check, mirrors `stack-screens.test.ts`) | P0 |
| C42 | Long-press gesture recognition (real touch-and-hold) and live-region announcement delivery (real screen reader) — cannot be asserted by Jest/RNTL; manual on-device pass only | FR40, FR39, R12 | Manual (on-device) | P2 |

**No duplicate coverage:** C22/C23 split live-lookup (new logic) from already-live sites (regression guard) rather than re-asserting the same thing at two levels. C33–C35 keep gesture-timing (component/fake-timer) separate from validation-path (unit) rather than re-deriving disambiguation rules inside a component test.

### Execution Strategy

- **PR (every commit):** C20–C41 (Unit + Component/Hook) — all fast, no device/emulator required, consistent with v1.0's C1–C7/C11–C19 tier.
- **Nightly/Manual (pre-story-completion):** C42 — on-device long-press and accessibility-announcement verification, same tier as v1.0's C8–C10.

### Resource Estimates (v1.1)

- **P0 (14 scenarios: C20, C21, C22, C24, C26, C29, C31, C33, C34, C36, C37, C38, C39, C41):** ~18–26 hours, building directly on v1.0's already-standing Jest+RNTL suite (no new framework setup, unlike v1.0's P0 estimate).
- **P1 (5 scenarios: C27, C28, C32, C35, C40):** ~8–12 hours.
- **P2 (5 scenarios: C23, C25, C30, C42):** ~3–6 hours, C42 being the one on-device manual pass.
- **Total:** ~29–44 hours across Epic 4 + Epic 5, additive to implementation (test-alongside per story, matching v1.0's own resourcing note).

### Quality Gates (v1.1)

- **P0 pass rate: 100%** — no P0 scenario may be skipped; C38 in particular is the direct regression guard for v1.0's entire existing test suite staying green under the new optional parameter.
- **P1 pass rate ≥ 95%.**
- **R8 (HIGH) mitigated before Story 4.1 is marked complete** — per the Mitigation Plan in Step 3; this is the only HIGH risk in v1.1's assessment.
- **Coverage target:** maintain the existing `collectCoverageFrom` scope (`src/app/**/*.tsx`, `src/components/**/*.tsx` included, not just `lib`/`hooks`) — do not narrow it for v1.1 additions.

## v1.1 Step 5: Generate Outputs & Validate

**Execution mode:** Sequential (no subagent/agent-team capability probe available in this session; epic-level mode defaults to single-worker regardless).

**Output document generated:** `_bmad-output/test-artifacts/test-design-epic-4-5.md`, using `test-design-template.md` — one combined document for Epic 4 + Epic 5, since both were scoped together in this pass and `epics.md`'s own Dependency Validation confirms Epic 5 has no dependency on Epic 4.

**Populated sections confirmed present:** Risk assessment matrix (R7-R13), coverage matrix (C20-C42, 23 scenarios), execution strategy, resource estimates (ranges only), quality gate criteria, Not in Scope, Entry/Exit Criteria, Mitigation Plan (R8), Assumptions/Dependencies, Interworking & Regression.

**Validation:** No CLI/browser sessions were opened (not applicable — offline mobile app, `tea_browser_automation: none`). No temp artifacts outside `_bmad-output/test-artifacts/`. Cross-checked scenario counts against stated totals during generation — caught and corrected one arithmetic error (P1 mislabeled "6 scenarios" for 5 listed IDs) before finalizing.

**Not generated:** BMad Handoff Document — that step is System-Level-Mode-only per the workflow, and this run is Epic-Level.

**Completion summary:**
- Mode: Epic-Level (Epic 4 + Epic 5)
- Output: `_bmad-output/test-artifacts/test-design-epic-4-5.md`
- Key risk: R8 (HIGH, score 6) — FR31 rename-propagation drift risk, mitigated via C22
- Gate: P0 100%, P1 ≥95%, R8 resolved before Story 4.1 complete
- Open assumption: architecture.md's v1.1 decisions are implemented exactly as specified, not re-derived

### Quality Gates (v1.0, unchanged)

- **P0 pass rate: 100%** — no P0 scenario may be skipped or waived; these map directly to the PRD's explicit "100%-tested mechanic logic" Technical Success criterion and the two HIGH-risk ASRs (R1, R2/R3-adjacent).
- **P1 pass rate: ≥ 95%.**
- **All three HIGH risks (R1, R2, R3) mitigated before Epic 2 implementation resumes** — per the Mitigation Plan in Step 3.
- **Coverage target: ≥ 80%** on `lib/mechanic.ts` and `lib/session-transitions.ts` specifically (the two files the entire mechanic depends on) — not a blanket repo-wide percentage, since the standard-screen CRUD code carries much lower risk and doesn't need the same bar.
