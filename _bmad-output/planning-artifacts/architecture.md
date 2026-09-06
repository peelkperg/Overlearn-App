---
stepsCompleted: [step-01-init, step-02-context, step-03-starter, step-04-decisions, step-05-patterns, step-06-structure, step-07-validation, step-08-complete, v1.1-extension]
lastStep: 8
status: 'complete'
completedAt: '2026-08-31'
lastUpdated: '2026-09-06'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
workflowType: 'architecture'
project_name: 'Overlearn'
user_name: 'Gerardo'
date: '2026-08-31'
versionCoverage:
  v1.0: 'Everything above the "v1.1 Architectural Decisions" heading. Shipped, frozen at git tag v1.0.0.'
  v1.1: 'The "v1.1 Architectural Decisions" section - lib/settings.ts storage boundary, optional-parameter threading through calculateTargetStreak/session-transitions, FR38-FR39 read paths, rename propagation, sort, rename/duplicate. Designed, not implemented.'
editHistory:
  - date: '2026-09-06'
    changes: >-
      Extended rather than regenerated, matching the pattern used for
      prd.md and ux-design-specification.md: the 8-step create workflow
      was already complete for v1.0 and epics.md traces to it. Appended a
      version-marked "v1.1 Architectural Decisions" section covering
      FR30-FR39. Key decision: calculateTargetStreak and
      session-transitions' logCorrect/logIncorrect gain an OPTIONAL
      second parameter defaulting to the v1.0 constant, rather than a
      required one - every existing call site and test keeps working
      unmodified. FR37 (live mid-session apply) needs no new mechanism:
      it is the direct payoff of v1.0's derive-on-read decision for
      target_streak. FR39 (in-progress-session detection) also needs no
      new mechanism: session.active is a single MMKV key app-wide, so
      useActiveSession() already answers the question. New: a fourth
      lib/ boundary (lib/settings.ts), one aggregation function shared by
      FR33's sort and FR38's display (calculateSolidificationPercent,
      returning null rather than 0 for "no data yet"), and a useSegments
      history subscription it didn't previously need.
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
29 FRs across five groups: Segment Management (FR1–FR7), Practice Session Lifecycle (FR8–FR15), Active Session Interaction (FR16–FR22), Session Interruption & Recovery (FR23–FR26), and Practice History (FR27–FR29). Architecturally, the Session Lifecycle and Active Session Interaction groups are the core — they define the mechanic (live target recalculation, reset-on-miss, confirm-gated Restart) that the rest of the app exists to support. Segment Management and Practice History are comparatively conventional CRUD/list surfaces.

**Non-Functional Requirements:**
- **Performance (NFR1–NFR2):** <100ms tap-to-render, must hold even with an async persistence write in flight on every tap — the single hardest architectural constraint in the project.
- **Reliability (NFR3–NFR5):** full session state must survive backgrounding/kill with at most one tap's data loss in the narrowest window; resume/discard must never be silent; completed-history entries must be durable across restarts/reinstalls-with-data.
- **Accessibility (NFR6–NFR7):** 44×44pt touch targets, no color-alone signaling.
- **Security & Privacy (NFR8–NFR9):** zero network calls verifiable by code inspection (no networking library present at all), no accounts/user identification whatsoever.

**Scale & Complexity:**
- Primary domain: mobile app (iOS/Android, offline-first, cross-platform framework undecided).
- Complexity level: low (single-user, no backend, no auth, ~6 screens).
- Estimated architectural components: local persistence layer (session state + history schema), async write queue, the four-tier Feedback Signal System (from UX spec), and standard navigation/CRUD screens.

### Technical Constraints & Dependencies

- Fully offline — no backend, no API layer, no cloud dependency of any kind.
- No accounts/auth — architecture has zero concept of "a user" beyond the single device install.
- Framework choice (React Native vs. Flutter) is open and must be resolved in this workflow.
- `target_streak` derive-vs-store, `session_complete` synchronous persistence, and the async-write/render-latency split are all open questions carried forward from the PRD and UX spec, to be resolved as explicit architecture decisions.

### Cross-Cutting Concerns Identified

- **Local persistence strategy:** the schema and write/read pattern for session state and history touches nearly every FR in Session Lifecycle, Active Session Interaction, and Interruption & Recovery.
- **Render/persistence latency split:** NFR1/NFR2 constrain every tap-handling code path in the app, not just one screen.
- **Feedback Signal System:** the four-tier haptic/sound/visual signal system (from the UX spec) is invoked from multiple state-transition points and needs one consistent implementation, not per-screen logic.

## Starter Template Evaluation

### Primary Technology Domain

Mobile app — React Native, chosen per user preference (existing familiarity) over Flutter. This resolves the PRD's open RN vs. Flutter question.

### Starter Options Considered

- **Expo (create-expo-app, SDK 57)** — the dominant, actively maintained RN starter as of August 2026 (Expo SDK 57.0.18, React Native 0.86, React 19.2). Ships TypeScript config, Expo Router (file-based navigation) by default.
- **React Native CLI (bare, no Expo)** — rejected: requires native tooling (Xcode/Android Studio) setup and manual native module linking, adding solo-dev maintenance burden with no offsetting benefit for an app with no exotic native requirements.

### Selected Starter: Expo (create-expo-app, SDK 57)

**Rationale for Selection:**
- Solo-developer project — Expo's managed workflow minimizes build/tooling maintenance, directly supporting the PRD's "Solo-developer risk" mitigation (avoid scope creep into infrastructure work).
- Local persistence (`expo-sqlite`, or `AsyncStorage`/`MMKV` via Expo-compatible packages) is fully supported without ejecting — no networking capability needed or present by default, aligning cleanly with NFR8 (verifiable zero network calls).
- Expo Router's file-based navigation matches the UX spec's flat, 3-level stack navigation (Segment List → Segment Detail → Active Session/Completion) with no extra navigation library needed.
- Haptics (`expo-haptics`) and audio (`expo-av`/`expo-audio`) are first-party Expo modules — directly needed for the UX spec's four-tier Feedback Signal System (haptic + sound + visual across tap/miss/target-raise/completion).

**Initialization Command:**

```bash
npx create-expo-app@latest Overlearn --template default@sdk-57
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:** TypeScript by default, React Native 0.86, React 19.2.

**Styling Solution:** No opinionated styling library imposed — React Native's built-in `StyleSheet` is sufficient given the app's minimal, non-decorative visual language (per UX spec Visual Design Foundation); no need to add a styling dependency.

**Clarification on UX-DR9 ("established component system"):** this resolves to React Native's own built-in components (`Pressable`, `Modal`, `FlatList`, `TextInput`) for standard screens, manually configured for accessibility (`accessibilityRole`, `accessibilityLabel`, `hitSlop` to meet the 44×44pt minimum) — not an added UI kit like React Native Paper. This satisfies UX-DR9's intent (accessible defaults, no custom-built standard-screen components) without adding a dependency, consistent with the "no opinionated styling library" decision above.

**Build Tooling:** Expo's managed build pipeline (EAS Build for release binaries) — no manual native project configuration required for day-to-day development.

**Testing Framework:** Not included by default — to be added explicitly per the project's testing strategy (Jest is the standard RN/Expo choice, to be confirmed in a later architecture step).

**Code Organization:** Expo Router's file-based routing convention (`app/` directory) establishes screen/route structure directly from the file tree — maps cleanly onto the UX spec's flat navigation model.

**Development Experience:** Fast Refresh, Expo Go for rapid iteration on standard screens; note Expo Go has some native-module limitations that may require a development build for testing haptics/audio — to be confirmed during implementation.

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Local persistence library (MMKV) and session-state write strategy
- `target_streak` derive-vs-store resolution
- State management approach for the Active Session screen

**Important Decisions (Shape Architecture):**
- Segment/history persistence format
- Component/screen organization within Expo Router's file structure

**Deferred Decisions (Post-MVP):**
- None identified — the app's scope is small enough that all data/frontend decisions are resolvable now.

### Data Architecture

**Persistence library:** `react-native-mmkv` for all local persistence (active session state, segments, history log) — a single library for the entire persistence layer, minimizing solo-dev dependency surface. Requires `expo-dev-client` (custom dev build) rather than plain Expo Go for local testing, since MMKV is a native module.

**API note (v4, Nitro-based):** the instantiation API changed in v4 — use `createMMKV()` from `react-native-mmkv`, **not** `new MMKV()`. `MMKV` is now a type-only export; using it as a constructor fails at runtime with `TypeError: undefined cannot be used as a constructor` (this broke Story 1.1's first implementation before being caught and fixed). Read/write methods (`set`, `getString`, `getNumber`) are unchanged from earlier versions; deletion is `remove(key)`, not `delete(key)`. Also requires `react-native-nitro-modules` as an explicit dependency (peer dependency, not always auto-declared).

**Jest note:** `react-native-mmkv`'s `createMMKV()` auto-mocks under Jest (`isTest()` → in-memory `Map`-backed mock), but `react-native-nitro-modules`' own package index eagerly calls the native Turbo module registry at import time — this crashes under Jest before the mock path is ever reached. Fixed with a manual mock at `__mocks__/react-native-nitro-modules.js` (Jest auto-applies mocks placed there for node_modules packages, no `jest.mock()` call needed per test file).

**`@testing-library/react-native` v14 note:** `render()`, `renderHook()`, and `act()` are all `async` in this major version (they were sync in earlier RNTL) — omitting `await` silently leaves `screen`/`result.current` unpopulated (or stale/`null`) instead of throwing, which reads as a framework incompatibility if you don't know to look for it. Always `await render(...)`, `await renderHook(...)`, and `await act(() => ...)` — a state-updating call on `result.current` made inside a non-awaited `act()` produces a benign "not wrapped in act(...)" console warning, or worse, leaves `result.current` reflecting the pre-update (or unmounted/`null`) render on the next assertion.

**Active session state — write strategy:** synchronous MMKV writes on every Correct/Incorrect/Restart tap. Because MMKV writes complete in microseconds (JSI, no bridge serialization), this directly satisfies NFR1/NFR2 (100ms budget, no async-queue complexity needed) — resolving the PRD's flagged "riskiest assumption" with a simpler mechanism than originally anticipated.

**`target_streak` — derive vs. store:** derived on every read as a pure function of `total_incorrect_this_session` (`max(TARGET_FLOOR, ceil(total_incorrect_this_session * OVERLEARNING_LEVEL))`), never persisted as its own field. Only `current_streak`, `total_correct_this_session`, `total_incorrect_this_session`, `segment_name`, `session_start_timestamp`, and `session_complete` are the persisted source-of-truth fields — this eliminates any possibility of a stored target drifting from what the formula would produce.

**Schema addition — `total_correct_this_session` (Story 2.6, confirmed with the user):** not one of the Mechanic Specification's original six fields. Added because FR13's Completion summary requires total attempts (correct + incorrect), and `current_streak` alone can't reconstruct total correct once a session has had more than one miss-then-recover cycle (it resets to 0 on every miss, losing the prior run's count). Incremented alongside `current_streak` in the Correct transition; reset to 0 by Start/Restart, same as the other counters. Purely additive — none of the original six fields changed meaning.

**Schema addition — `segment_id` (Story 2.10, confirmed with the user):** the Mechanic Specification's Session State only carries `segment_name`. Story 2.10's resume/discard prompt is shown on the Segment List screen at app open — before the user has navigated back into the specific segment — and needs an unambiguous way to route to that segment's session screen on Resume. `segment_name` alone risks a false match if segment names aren't unique, or a stale one if the segment was renamed since the session started. `segment_id` is set once at session start and never changes for the life of the session, same lifecycle as `segment_name`.

**`session_complete` persistence:** written synchronously in the same MMKV write as the final `current_streak` update that triggers completion — since writes are synchronous, this is inherent to the write strategy above, not a separate mechanism. Directly resolves the UX spec's flagged completion-screen resume gap: on relaunch, if `session_complete = true` is found, the app restores directly to the Completion screen rather than the resume/discard prompt.

**Segments & history log:** stored as MMKV-backed JSON collections (one entry per segment, one array of completed-session records per segment) rather than SQLite — the data volume (single user, realistically dozens to low hundreds of segments/sessions) doesn't warrant a relational database, and keeping one persistence library for the whole app reduces solo-dev maintenance surface (consistent with the PRD's Resource Risks mitigation).

**Data validation:** plain TypeScript types/interfaces for session state, segment, and history-entry shapes; validated at the point of read from MMKV (defensive parsing) since local storage corruption, while rare, isn't impossible.

### Authentication & Security

Not applicable — no accounts, no auth, no API, per NFR8/NFR9. No security middleware, no encryption layer beyond what MMKV provides natively (MMKV supports optional encryption; not required here since there's no sensitive data — practice segment names and mistake counts are not PII).

### API & Communication Patterns

Not applicable — fully offline, no backend, no API layer of any kind. Confirmed no networking library is added anywhere in the dependency tree, satisfying NFR8's "verifiable by code inspection" requirement.

### Frontend Architecture

**State management:** React Context + hooks, with a custom `useActiveSession` hook wrapping MMKV's native React bindings (`useMMKVObject`) for the active-session state. No external state library (Redux/Zustand) — the app's state surface (one active session at a time, a list of segments, per-segment history) is small enough that MMKV's own reactive hooks plus React's built-in state cover it without added complexity.

**Component architecture:** matches the UX spec's Component Strategy — standard Expo Router screens/components for segment list, segment detail, history log, and dialogs (resume/discard, Restart confirm); one custom component tree for the Active Session screen (Correct/Incorrect buttons, streak readout, Feedback Signal System).

**Routing strategy:** Expo Router file-based routing (from starter), structured as a flat stack: `app/index.tsx` (segment list) → `app/segment/[id].tsx` (detail/history) → `app/session/[id].tsx` (active session, transitions in-place to completion state rather than a separate route, per the UX spec's "completion is the next screen state, not a modal" decision).

**Performance optimization:** the MMKV synchronous-write strategy above is the primary performance decision; no additional caching layer needed given there's no network and no large datasets.

### Infrastructure & Deployment

**Hosting:** none — no backend, no server infrastructure of any kind.

**Build/distribution:** EAS Build for producing iOS/Android release binaries; EAS Submit for App Store/Play Store submission. No CI/CD pipeline beyond what a solo dev needs manually (no team, no PR-gated deploys required for MVP).

**Environment configuration:** none needed — no environment-specific API endpoints, keys, or secrets exist, since there's nothing to configure per-environment in an offline app.

**Monitoring & logging:** none — explicitly excluded per NFR8 (no crash reporting, no analytics, no usage tracking of any kind).

### Decision Impact Analysis

**Implementation Sequence:**
1. Project init via `create-expo-app` (Starter Template Evaluation)
2. `expo-dev-client` setup + `react-native-mmkv` installation (required before any persistence-dependent feature can be built)
3. Data layer: TypeScript types + MMKV read/write helpers for session state, segments, history
4. `useActiveSession` hook (state management)
5. Active Session screen (custom components + Feedback Signal System)
6. Standard screens (segment list, detail, history, dialogs)

**Cross-Component Dependencies:**
- The MMKV synchronous-write decision is foundational — every FR in Active Session Interaction (FR16–FR22) and Session Interruption & Recovery (FR23–FR26) depends on it.
- The derive-on-read decision for `target_streak` means every screen/component displaying the readout must call the shared calculation function, not read a stored value — this must be enforced consistently to avoid a future bug where a component reads a stale stored target.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

5 areas where AI agents could diverge, adapted for a local-only, no-backend, no-database stack: MMKV key naming, code naming, file/project structure, state/data-shape formats, and error/edge-case handling for local persistence.

### Naming Patterns

**MMKV Key Naming (replaces database/API naming — no DB or API exists in this project):**
- Keys are namespaced, lowercase, dot-separated: `session.active`, `segments.list`, `history.{segmentId}`.
- No plural/singular ambiguity to resolve (not applicable — keys are singular concept names, not resource collections).

**Code Naming (TypeScript/React):**
- Components: PascalCase (`ActiveSessionScreen`, `CorrectButton`).
- Files: match component name exactly (`ActiveSessionScreen.tsx`), one component per file.
- Hooks: camelCase, `use` prefix (`useActiveSession`, `useSegmentHistory`).
- Functions: camelCase, verb-first (`calculateTargetStreak`, `writeHistoryEntry`).
- Variables/fields: camelCase throughout (`currentStreak`, `totalIncorrectThisSession`) — note this differs from the PRD/Mechanic Spec's `snake_case` field names (`current_streak`, `total_incorrect_this_session`); the PRD's names are the conceptual spec vocabulary, code uses camelCase per TypeScript convention. Both refer to the same fields.

### Structure Patterns

**Project Organization (Expo Router):**
- `app/` — routes only (`index.tsx`, `segment/[id].tsx`, `session/[id].tsx`), per Expo Router convention from the starter.
- `components/` — reusable UI components, organized flat (not by feature) given the app's small scope; `components/session/` subfolder only for the Active Session screen's custom components (button pair, readout, feedback system), since that's the one area with multiple related custom pieces.
- `hooks/` — all custom hooks (`useActiveSession`, `useSegmentHistory`, etc.).
- `lib/` or `data/` — MMKV read/write helpers, target-streak calculation, type definitions — the data layer described in Core Architectural Decisions.
- `constants/` — `TARGET_FLOOR`, `OVERLEARNING_LEVEL`, and other Mechanic Specification constants, defined once and imported everywhere (never inlined/duplicated).

**Tests:** co-located `*.test.ts` next to the file under test (not a separate `__tests__/` tree) — keeps test-per-module discoverable without a parallel directory structure to maintain.

### Format Patterns

**Session/segment/history data shapes:** plain TypeScript interfaces (`SessionState`, `Segment`, `HistoryEntry`) defined once in the data layer, imported by every consumer — never redefined ad hoc in a component.

**Dates:** ISO 8601 strings for all persisted timestamps (`session_start_timestamp`, history entry dates), matching the Mechanic Specification's own type declaration — never epoch integers, never `Date` objects persisted directly (MMKV stores strings/JSON, not native Date).

**Booleans:** native `true`/`false` in TypeScript and in the persisted JSON — no `0`/`1` or string `"true"` representations.

### Communication Patterns

**State updates:** all session-state mutations go through the `useActiveSession` hook's exposed functions (`logCorrect()`, `logIncorrect()`, `restart()`) — no component reads/writes MMKV session keys directly. This is the single most important consistency rule in the app: it's what guarantees the synchronous-write and derive-on-read decisions from Core Architectural Decisions are actually applied everywhere, not just in one screen.

**Target-streak calculation:** exactly one function (`calculateTargetStreak(totalIncorrect: number): number`) implements the Mechanic Specification formula. Every place that displays or checks the target (readout, completion check, tests) calls this function — never reimplements the formula inline.

### Process Patterns

**Error handling:** MMKV reads are wrapped in defensive parsing (try/catch around JSON parse) since corrupted/missing local data, while rare, must not crash the app — falls back to "no active session" / "empty segment list" rather than throwing. No user-facing error messages needed for this case (silent graceful degradation), since there's no meaningful recovery action for the user to take on a corrupted local read.

**Loading states:** minimal — since there's no network, the only "loading" moment is the initial MMKV read on app launch (near-instant, synchronous). No loading spinners/skeletons are needed anywhere in the app; screens render directly from the synchronous read.

### Enforcement Guidelines

**All AI Agents MUST:**
- Route every session-state mutation through `useActiveSession`'s exposed functions — never touch MMKV session keys directly from a component.
- Call the single `calculateTargetStreak` function for any target-streak display or check — never reimplement the formula.
- Use the Mechanic Specification's exact field semantics (even though renamed to camelCase in code) — no renaming, dropping, or adding fields to `SessionState` without updating this architecture document first.

**Pattern Enforcement:**
- Code review (self-review, given solo-dev context) checks for direct MMKV access outside the data layer and for inline target-streak formula reimplementation.
- Any deviation from these patterns found during implementation should trigger an update to this document, not a silent divergence.

### Pattern Examples

**Good:**
```ts
const { logIncorrect, currentStreak, totalIncorrectThisSession } = useActiveSession();
const target = calculateTargetStreak(totalIncorrectThisSession);
```

**Anti-pattern:**
```ts
// Direct MMKV access from a component — bypasses useActiveSession, breaks the
// single-source-of-truth guarantee the synchronous-write decision depends on.
const streak = storage.getNumber('session.active.currentStreak');
// Inline formula reimplementation — diverges from calculateTargetStreak if the
// formula ever changes in one place but not the other.
const target = Math.max(5, Math.ceil(totalIncorrect * 0.5));
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
overlearn/
├── README.md
├── package.json
├── app.json
├── eas.json
├── tsconfig.json
├── babel.config.js
├── .gitignore
├── app/
│   ├── _layout.tsx                    # Root layout, stack navigator config
│   ├── index.tsx                      # Segment List screen (FR2, FR7)
│   ├── segment/
│   │   ├── new.tsx                    # Segment creation form (FR1)
│   │   └── [id].tsx                   # Segment Detail: history log + Start (FR3, FR27–29)
│   └── session/
│       └── [id].tsx                   # Active Session screen (FR8–22), transitions in-place
│                                       # to Completion state per UX spec (no separate route)
├── components/
│   ├── SegmentListItem.tsx            # Row in segment list (delete action, FR6)
│   ├── SegmentForm.tsx                # Shared create/rename form (FR1)
│   ├── HistoryEntryRow.tsx            # One history log row (FR28)
│   ├── ResumeDiscardDialog.tsx        # Standard dialog (FR24, NFR4)
│   ├── RestartConfirmDialog.tsx       # Standard dialog (FR21)
│   └── session/
│       ├── CorrectButton.tsx          # Top button, custom (FR16)
│       ├── IncorrectButton.tsx        # Bottom button, custom (FR17)
│       ├── StreakReadout.tsx          # Center readout, current/target (FR9–11)
│       ├── RestartControl.tsx         # Subordinate control (FR20)
│       ├── CompletionScreen.tsx       # Completion summary + Done/Repeat (FR13–15)
│       └── useFeedbackSignal.ts       # Four-tier haptic/sound/visual signal hook; also fires
│                                       # React Native's AccessibilityInfo.announceForAccessibility()
│                                       # alongside the target-raise and completion tiers
├── hooks/
│   ├── useActiveSession.ts            # Session state mutations (logCorrect/logIncorrect/restart)
│   ├── useSegments.ts                 # Segment list CRUD (FR1–7)
│   └── useSegmentHistory.ts           # Per-segment history read (FR27–29)
├── lib/
│   ├── storage.ts                     # MMKV instance + typed get/set helpers
│   ├── mechanic.ts                    # calculateTargetStreak() — the one formula implementation
│   ├── types.ts                       # SessionState, Segment, HistoryEntry interfaces
│   └── session-transitions.ts         # Pure transition functions (correct/incorrect/restart logic)
├── constants/
│   └── mechanic.ts                    # TARGET_FLOOR, OVERLEARNING_LEVEL
├── assets/
│   ├── sounds/                        # Target-raise alert sound, completion beat sound
│   └── icons/                         # Checkmark / X icon assets (if not using an icon font)
└── (test files co-located as *.test.ts next to each module, per Implementation Patterns)
```

### Architectural Boundaries

**API Boundaries:** none — no API exists in this project. This section is intentionally empty; documented here to make the absence explicit rather than silently omitted, so no AI agent later assumes an API layer needs to be added.

**Component Boundaries:** the Active Session screen (`app/session/[id].tsx` + `components/session/`) is a self-contained unit that talks only to `useActiveSession` — it never reads/writes storage directly (per Implementation Patterns' enforcement rule). Standard screens (`app/index.tsx`, `app/segment/`) talk only to `useSegments`/`useSegmentHistory`.

**Service Boundaries:** not applicable in the traditional sense — `lib/` plays the role a "service layer" would in a backend app, but there's no network service boundary, only the local-storage boundary described below.

**Data Boundaries:** `lib/storage.ts` is the single point of contact with MMKV — no hook or component calls the MMKV API directly. `lib/mechanic.ts` is the single point of contact with the target-streak formula. Both boundaries exist specifically to enforce the two rules established in Implementation Patterns.

### Requirements to Structure Mapping

**Segment Management (FR1–FR7):** `app/index.tsx`, `app/segment/new.tsx`, `components/SegmentListItem.tsx`, `components/SegmentForm.tsx`, `hooks/useSegments.ts`.

**Practice Session Lifecycle (FR8–FR15):** `app/session/[id].tsx`, `components/session/CompletionScreen.tsx`, `hooks/useActiveSession.ts`, `lib/session-transitions.ts`.

**Active Session Interaction (FR16–FR22):** `components/session/CorrectButton.tsx`, `IncorrectButton.tsx`, `StreakReadout.tsx`, `RestartControl.tsx`, `RestartConfirmDialog.tsx`, `useFeedbackSignal.ts`, `hooks/useActiveSession.ts`, `lib/mechanic.ts`.

**Session Interruption & Recovery (FR23–FR26):** `components/ResumeDiscardDialog.tsx`, `hooks/useActiveSession.ts` (session restoration on mount), `lib/storage.ts` (persisted `session_complete` flag drives the resume-vs-completion-screen branch decided in Core Architectural Decisions).

**Practice History (FR27–FR29):** `app/segment/[id].tsx`, `components/HistoryEntryRow.tsx`, `hooks/useSegmentHistory.ts`.

**Cross-Cutting Concerns:**
- Mechanic Specification constants/formula (`constants/mechanic.ts`, `lib/mechanic.ts`) — touched by FR9–FR12 and the Active Session screen.
- Feedback Signal System (`components/session/useFeedbackSignal.ts`, `assets/sounds/`) — touched by all four feedback tiers across FR16–FR18.

### Integration Points

**Internal Communication:** components call hooks, hooks call `lib/` functions, `lib/` functions touch MMKV/storage. Strictly one-directional (UI → hooks → lib → storage) — no component or hook is called from `lib/`.

**External Integrations:** none — confirmed zero third-party service integrations anywhere in the app, per NFR8.

**Data Flow:** user tap → `useActiveSession` mutation function → `lib/session-transitions.ts` pure transition → synchronous MMKV write (`lib/storage.ts`) → React state update → re-render (readout, feedback signal). No async gap anywhere in this chain, consistent with the synchronous-write architecture decision.

### File Organization Patterns

**Configuration Files:** root-level only (`app.json`, `eas.json`, `tsconfig.json`, `babel.config.js`) — no nested config directories needed given the project's small scope.

**Source Organization:** flat `app/` (routes) + flat `components/`/`hooks/`/`lib/` (shared code), with one `components/session/` subfolder for the Active Session screen's custom pieces — the only area with enough related custom components to warrant grouping.

**Test Organization:** co-located `*.test.ts`, per Implementation Patterns — no separate test tree.

**Asset Organization:** `assets/sounds/` and `assets/icons/` — the only static assets the app has (no images, no fonts beyond system defaults).

### Development Workflow Integration

**Development Server Structure:** Expo dev server via `expo-dev-client` (required for MMKV's native module) — not plain Expo Go, per Core Architectural Decisions.

**Build Process Structure:** EAS Build reads `app.json`/`eas.json` directly; no custom build scripting needed beyond Expo's standard managed workflow.

**Deployment Structure:** EAS Submit pushes the EAS Build output to App Store Connect / Google Play Console — no intermediate deployment infrastructure, consistent with "no hosting, no backend" from Core Architectural Decisions.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** Expo (SDK 57) + TypeScript + React Native 0.86 + react-native-mmkv (via expo-dev-client) + Expo Router are all mutually compatible, actively maintained as of August 2026, with no version conflicts identified.

**Pattern Consistency:** Naming, structure, and communication patterns (Implementation Patterns & Consistency Rules) align directly with the chosen stack — MMKV key naming, TypeScript conventions, and the one-directional UI→hooks→lib→storage data flow are all internally consistent.

**Structure Alignment:** The project structure's boundaries (single point of contact with MMKV via `lib/storage.ts`, single formula implementation in `lib/mechanic.ts`) directly enforce the two rules established in Implementation Patterns — structure and patterns reinforce each other rather than existing independently.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:** All 29 FRs mapped to specific files/directories in Requirements to Structure Mapping. No FR lacks an architectural home.

**Non-Functional Requirements Coverage:**
- NFR1/NFR2 (performance): resolved by the synchronous MMKV write decision.
- NFR3 (state durability): functionally satisfied — see Gap Analysis for a wording-only conflict.
- NFR4 (mandatory resume/discard prompt): `ResumeDiscardDialog.tsx` + `useActiveSession` session restoration logic.
- NFR5 (durable history): MMKV-backed history JSON collections, per Core Architectural Decisions.
- NFR6/NFR7 (accessibility): addressed in UX spec, carried into Project Structure via `useFeedbackSignal.ts`; see Gap Analysis for one ownership clarification.
- NFR8/NFR9 (privacy): architecturally guaranteed by omission — no networking library appears anywhere in the dependency tree or project structure. One platform-level gap found via UAT and closed 2026-09-02: Android's Auto Backup is opt-out, not opt-in, and by default silently copies app-private storage (MMKV's files included) to the user's Google Drive, restoring it on reinstall — a real conflict with "zero data leaves the device" even though no app code initiates it. Closed via `app.json`'s `android.allowBackup: false` (maps to the manifest's `android:allowBackup`). iOS has an equivalent iCloud-backup concern, unaddressed — deferred along with the rest of iOS support, which has never been built or verified for this app.

### Implementation Readiness Validation ✅

**Decision Completeness:** All critical decisions (framework, persistence, state management, derive-vs-store) documented with rationale; Expo SDK 57 / React Native 0.86 / React 19.2 versions verified via web search.

**Structure Completeness:** Complete file tree provided, every FR group mapped to specific files, no placeholder/generic directories.

**Pattern Completeness:** Naming, structure, format, communication, and process patterns all specified with concrete good/anti-pattern examples.

### Gap Analysis Results

**Critical Gaps:** None identified.

**Important Gaps:**
- Testing framework (Jest, presumed) not yet formally pinned — should be confirmed before the first test file is written, but doesn't block project init or data-layer implementation.

**Minor Gaps:**
- NFR3's literal wording ("all six fields... must survive") is stale against the derive-on-read decision for `target_streak`. No functional gap — `target_streak` is always losslessly reconstructable from persisted `total_incorrect_this_session`. Recommend the PRD's NFR3 be reworded in a future PRD revision to "all state necessary to reconstruct the six Mechanic Specification fields," but this does not block implementation.
- Screen-reader announcement responsibility for target-raise/completion signals wasn't explicitly assigned in the first draft of Project Structure — resolved by assigning it to `useFeedbackSignal.ts` alongside the haptic/sound/visual signals it already owns.

**Nice-to-Have Gaps:**
- No icon source (font vs. SVG) chosen yet for the Correct/Incorrect checkmark/X — deferred to implementation-time, low risk.

### Validation Issues Addressed

- `useFeedbackSignal.ts`'s responsibility (Project Structure) now explicitly includes firing the accessibility announcement alongside each of the four feedback tiers, not just the haptic/sound/visual signal.
- NFR3 wording gap logged for PRD follow-up; no architecture change required since the functional guarantee already holds.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY WITH MINOR GAPS — all 16 checklist items pass; two minor gaps and one important-but-non-blocking gap (test framework confirmation) remain open, none blocking implementation start.

**Confidence Level:** High — the app's small, well-bounded scope (single-user, offline, no backend) leaves little room for architectural ambiguity, and all four PRD-flagged open questions were resolved with concrete, justified decisions.

**Key Strengths:**
- The MMKV synchronous-write decision eliminates the async-write-queue complexity the PRD flagged as its riskiest assumption, with a simpler and more robust mechanism.
- Derive-on-read for `target_streak` removes an entire class of state-drift bugs by construction.
- Single-responsibility boundaries (`lib/storage.ts`, `lib/mechanic.ts`, `useFeedbackSignal.ts`) directly enforce the consistency rules that matter most for a solo-dev, AI-agent-assisted implementation.

**Areas for Future Enhancement:**
- Testing framework selection and initial test scaffolding.
- Icon asset source decision (font vs. SVG).
- PRD NFR3 wording cleanup (non-blocking).

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented in this file.
- Route every session-state mutation through `useActiveSession`; never touch MMKV directly from a component.
- Use `calculateTargetStreak()` for every target-streak display or check; never reimplement the formula.
- Respect the project structure and one-directional data flow (UI → hooks → lib → storage).

**First Implementation Priority:**
```bash
npx create-expo-app@latest Overlearn --template default@sdk-57
```
Followed immediately by `expo-dev-client` and `react-native-mmkv` setup, per the Implementation Sequence in Core Architectural Decisions.

---

# v1.1 Architectural Decisions

**Added 2026-09-06.** Everything above this line describes **v1.0**, shipped and frozen at git tag `v1.0.0`. This section covers the architecture for v1.1 (`prd.md` FR30–FR39, `ux-design-specification.md`'s "v1.1 Design Additions"): segment rename, duplicate, list sorting with a Solidification % display, and a configurable overlearning-%.

No v1.0 decision is reopened. In particular: MMKV stays the sole persistence library, `lib/storage.ts` stays the sole point of contact with it, `target_streak` stays derived-on-read rather than stored, and the one-directional `UI → hooks → lib → storage` data flow is unchanged. v1.1 adds one new storage boundary and threads one new parameter through the mechanic layer — it does not restructure anything that already works.

## New Storage Boundary: `lib/settings.ts`

**Decision:** a fourth `lib/` data-layer file, `lib/settings.ts`, following the exact pattern `lib/segments.ts` already establishes — a single MMKV-backed key, a typed read function, a typed write function, and a `useSyncExternalStore`-compatible subscribe function.

**Shape:**
```ts
interface Settings {
  overlearningPercent: number;   // FR35-FR37: 50-300, step 10. Default 50.
  sortKey: 'name' | 'createdAt' | 'lastPracticed' | 'solidification';  // FR33
  sortDirection: 'asc' | 'desc';  // FR33-FR34
}
```

**MMKV key:** `settings.general` — one JSON object, not one key per field. Matches the existing key-naming convention (namespaced, lowercase, dot-separated) and keeps a single read/write pair rather than three.

**Defaults on first read:** `{ overlearningPercent: 50, sortKey: 'createdAt', sortDirection: 'asc' }`. `overlearningPercent: 50` is not a coincidence — it reproduces v1.0's hardcoded behavior exactly, so an app that has never opened Settings behaves identically to v1.0. `sortKey: 'createdAt' / asc` reproduces v1.0's implicit list order (array insertion order), for the same reason.

**Envelope:** goes through `lib/storage.ts`'s existing `getObject`/`setObject`, which already wrap every write in the `{ __v, data }` schema-version envelope (added 2026-09-05, NFR-assessment fix). No new migration code is needed for `settings.general` specifically — it inherits the boundary's existing corrupt-data quarantine and versioning for free, the same way `segments.list` and `history.{segmentId}` already do.

**Validation:** a new `isSettings(value): value is Settings` type guard in `lib/types.ts`, following the existing `isSegmentArray`/`isHistoryEntryArray`/`isSessionState` pattern — untrusted-storage reads are validated at the boundary, never cast bare. Rejects an out-of-range `overlearningPercent` (must be a multiple of 10 between 50 and 300 inclusive) or an unrecognized `sortKey`/`sortDirection`, quarantining a corrupted read the same way `getObject` already does for every other persisted shape.

**Setter validates before writing.** `setOverlearningPercent(value: number)` clamps/rejects out-of-range input at the call site — the Settings screen's stepper can only ever produce a valid value by construction (it steps by 10 and disables at the bounds, per the UX spec), but the function itself does not trust its caller.

## Mechanic Layer: Threading the Configurable Level

**Decision:** `calculateTargetStreak` gains an **optional** second parameter defaulting to the current constant, rather than becoming a required parameter or reading storage internally.

```ts
// lib/mechanic.ts
export function calculateTargetStreak(
  totalIncorrectThisSession: number,
  overlearningLevel: number = OVERLEARNING_LEVEL,   // unchanged default = 0.5
): number {
  const safeTotal = Number.isFinite(totalIncorrectThisSession) ? totalIncorrectThisSession : 0;
  return Math.max(TARGET_FLOOR, Math.ceil(safeTotal * overlearningLevel));
}
```

**Why optional, not required:** `calculateTargetStreak` is documented as "the one formula implementation" and is directly unit-tested at the boundary values (the 10/11 table in the Mechanic Specification). A required second parameter would force every existing call site and every existing test to change for a v1.1 feature, for no functional gain — the default preserves 100% of v1.0's call sites and tests unmodified. This keeps `lib/mechanic.ts` itself free of any storage dependency: it stays a pure function, unaware that a Settings screen exists. Reading the live setting is the caller's job, consistent with the existing rule that `lib/` modules don't reach into each other's boundaries.

**Call sites that pass the live value explicitly** (three, all inside `useActiveSession.ts`, which is where storage-reading already happens):
1. `logCorrect()` — before calling `transitions.logCorrect(current, overlearningLevel)`
2. `logIncorrect()` — before calling `transitions.logIncorrect(current, overlearningLevel)`
3. The hook's returned `targetStreak` value — `calculateTargetStreak(session?.totalIncorrectThisSession ?? 0, overlearningLevel)`

**`lib/session-transitions.ts` gets the same optional-parameter treatment** on `logCorrect(session, overlearningLevel?)` and `logIncorrect(session, overlearningLevel?)` — both already call `calculateTargetStreak` internally and need to pass the level through. Same rationale: existing tests calling with one argument keep working unchanged.

**Where the live value comes from:** `useActiveSession()` calls `useSettings().overlearningPercent / 100` once per render and passes it to all three sites above. `useSettings()` is a new hook, same `useSyncExternalStore(settingsStore.subscribeToSettings, settingsStore.readSettings)` pattern as `useSegments()`.

**FR37 (applies immediately to an in-progress session) requires no additional mechanism.** This is the payoff of the v1.0 decision to derive `target_streak` on every read rather than store it: `useActiveSession`'s returned `targetStreak` is already recomputed on every render from whatever `totalIncorrectThisSession` and `overlearningLevel` currently are. Changing the setting in Settings triggers a re-render (via `useSettings`'s subscription) wherever `useActiveSession` is also mounted, and the next read of `targetStreak` reflects the new value automatically. No session-state field changes, no explicit propagation code, no risk of a stale cached target — the same state-drift class the v1.0 derive-on-read decision was chosen to eliminate by construction.

## FR39: Detecting an In-Progress Session from the Settings Screen

**Decision:** no new mechanism. The Settings screen calls `useActiveSession()` — the same hook every other screen uses — and checks `session && !session.sessionComplete`, exactly as `app/index.tsx` already does to decide whether to show the resume/discard prompt.

This works because of a fact already true in v1.0's architecture, not a new one: `session.active` is a single MMKV key, not one per segment (see v1.0 MMKV Key Naming) — the app has exactly one active session at a time, app-wide, by construction. "Does any segment have an in-progress session" and "is there a current session that isn't complete" are therefore the same question, and the second one is already answered by a hook every screen already imports.

**Segment name for the notice's copy** ("...session in progress for 'Bar 24 arpeggio.'"): sourced live via `useSegment(session.segmentId)`, not `session.segmentName` — consistent with the Rename Propagation decision below.

## FR38: Solidification % Aggregation

**Decision:** one new pure function, colocated with the data it reads:

```ts
// lib/history.ts
export function calculateSolidificationPercent(entries: HistoryEntry[]): number | null {
  if (entries.length === 0) return null;   // no data yet — UI renders "—", not "0%"
  const totals = entries.reduce(
    (acc, e) => ({
      correct: acc.correct + (e.totalAttempts - e.totalMistakes),
      attempts: acc.attempts + e.totalAttempts,
    }),
    { correct: 0, attempts: 0 },
  );
  return totals.attempts === 0 ? null : (totals.correct / totals.attempts) * 100;
}
```

**`null`, not `0`, for "no data yet."** Directly implements the UX spec's FR38 decision that an em dash (not "0%") is shown when a segment has no completed sessions — a magnitude the display layer can distinguish from a real 0% without a separate boolean flag. The sort function (below) is the one place that *does* want a numeric floor for empty segments, and re-maps `null → 0` locally there rather than baking that choice into the shared calculation.

**One function serves both FR33 (sort) and FR38 (display).** `calculateSolidificationPercent` is called both by the segment list's sort (via `readHistory(segment.id)` per segment) and by the Segment Detail screen's history-log summary line (via the same `readHistory(id)` the screen already reads for the entry list). No duplicate formula, consistent with the project's existing "one function, every consumer calls it" pattern already established for `calculateTargetStreak`.

**Performance note, stated rather than assumed:** computing this requires reading every history entry for every segment on every list render (for sorting) — O(segments × entries-per-segment). Given the app's realistic scale (single user, dozens to low hundreds of segments/sessions, stated in the v1.0 Data Architecture section), this is not a caching concern; a caching layer would be premature optimization for data volumes this small. Revisit only if real usage proves otherwise.

## Rename Propagation (FR31)

**Decision:** no schema change to `SessionState` or `HistoryEntry`. Display sites switch from a stored name snapshot to a live lookup, screen by screen:

| Display site | v1.0 source | v1.1 source |
|---|---|---|
| Segment list row | `segment.name` (already live) | Unchanged |
| Segment detail heading | `segment.name` (already live) | Unchanged |
| History log entries | No stored name — `HistoryEntry` never had one | Unchanged (already correct by construction) |
| Active session streak readout | `session.segmentName` (frozen snapshot) | `segment.name`, via `useSegment(id)` — already fetched at the top of `app/session/[id].tsx` |
| Completion summary | `session.segmentName` | Same live `segment.name` |
| Resume/discard prompt | `session.segmentName` | `useSegment(session.segmentId)?.name`, in `app/index.tsx` |

**`SessionState.segmentName` is not removed from the type.** It stays exactly as the v1.0 Mechanic Specification defines it — removing it would be a schema change with no v1.1 requirement behind it, and the field remains a defensive fallback for the (currently unreachable, per `deleteSegment`'s existing session-clearing behavior) case where a live segment lookup fails. Only the *display* code stops preferring it.

## Segment List Sort (FR33/FR34)

**Decision:** one new pure function in `lib/segments.ts` (or a new colocated `lib/segment-sort.ts` if `segments.ts` grows unwieldy — a call to make at implementation time, not architecturally significant):

```ts
function sortSegments(
  segments: Segment[],
  aggregates: Map<string, { lastPracticed: string | null; solidification: number | null }>,
  sortKey: SortKey,
  direction: 'asc' | 'desc',
): Segment[]
```

Pure — takes pre-computed aggregates rather than reading storage itself, so it stays unit-testable without mocking MMKV, consistent with `session-transitions.ts`'s existing pure-function pattern.

**`useSegments()` gains a history subscription it didn't need in v1.0.** The v1.0 hook only subscribed to `subscribeToSegments` — sufficient when the list's only job was displaying segments in creation order. Sorting by last-practiced or Solidification % requires the list to also re-render when a *history* entry is written (i.e., every session completion), so `useSegments()` additionally subscribes to `subscribeToHistory` for whichever segments are visible. This is the one genuinely new cross-cutting wire-up in v1.1 — every other decision above reuses an existing subscription.

**No-history sort treatment:** `null` solidification and `null`/absent last-practiced are mapped to `0` and the epoch (`new Date(0).toISOString()`) respectively, purely inside the sort comparator — matching the PRD's FR33 rule ("treated as 0% / oldest-possible-date for sorting purposes") without leaking that convention into `calculateSolidificationPercent`'s own return type.

## Rename and Duplicate (FR30, FR32)

**Decision:** two new functions in `lib/segments.ts`, reusing existing internals rather than duplicating logic:

```ts
function renameSegment(id: string, name: string): void   // FR30
function duplicateSegment(id: string): Segment            // FR32
```

- **`renameSegment`** reuses `normalizeSegmentName` and `disambiguate` exactly as `createSegment` does, with one change to `disambiguate`'s collision check: it must exclude the segment's own current name, or renaming "Bar 24" to a different-cased "bar 24" would false-positive-collide with itself.
- **`duplicateSegment`** reuses `generateId` and `disambiguate` (new id, name run through the same collision logic — "Bar 24 arpeggio" → "Bar 24 arpeggio (2)"), sets a fresh `createdAt`, and does not call `deleteHistory`/copy any history key — the duplicate's `history.{newSegmentId}` key simply never gets written, which is the correct "no copied history" behavior by omission rather than an explicit clear.

**No new screen for Duplicate** (confirmed by the UX spec: row-menu action, instant, snackbar-confirmed). **One new screen for Rename** (`app/segment/[id]/rename.tsx`), reusing `SegmentForm` with zero changes to that component — exactly as `app/segment/new.tsx` already does, per the v1.0 architecture note that `SegmentForm.tsx` was "already designed as a shared create/rename form."

## Project Structure Additions

```
src/
├── app/
│   ├── settings.tsx                       # NEW — FR35-FR37, FR39
│   └── segment/
│       └── [id]/
│           └── rename.tsx                 # NEW — FR30, reuses SegmentForm
├── hooks/
│   └── useSettings.ts                     # NEW — mirrors useSegments' useSyncExternalStore pattern
├── lib/
│   ├── settings.ts                        # NEW — the fourth data-layer boundary
│   ├── segments.ts                        # + renameSegment, duplicateSegment, sortSegments
│   ├── history.ts                         # + calculateSolidificationPercent
│   ├── mechanic.ts                        # calculateTargetStreak gains optional 2nd param
│   ├── session-transitions.ts             # logCorrect/logIncorrect gain optional 2nd param
│   └── types.ts                           # + Settings interface, isSettings guard
```

Every new route must be added to `src/app/stack-screens.ts` and given a `<Stack.Screen>` entry in `_layout.tsx` — per `project-context.md`'s standing regression guard (commit `b2dc4e6`): a route missing from either is silently dropped in production with no dev-mode signal.

## Requirements to Structure Mapping (v1.1 additions)

**Segment Management extensions (FR30–FR34, FR38):** `src/app/segment/[id]/rename.tsx`, `src/lib/segments.ts` (rename/duplicate/sort), `src/lib/history.ts` (Solidification %), `src/components/SegmentListItem.tsx` (menu additions), `src/hooks/useSegments.ts` (history subscription).

**Settings (FR35–FR39):** `src/app/settings.tsx`, `src/lib/settings.ts`, `src/hooks/useSettings.ts`, `src/lib/mechanic.ts` and `src/lib/session-transitions.ts` (parameter threading), `src/hooks/useActiveSession.ts` (reads the live setting and passes it through).

## Enforcement Guidelines (v1.1 additions)

**All AI Agents MUST additionally:**
- Route every settings read/write through `lib/settings.ts` — never a direct `storage.ts` call from a hook or component, same rule as `segments.ts`/`session.ts`.
- Call `calculateTargetStreak`/`calculateSolidificationPercent` for any target or Solidification % display or check — never reimplement either formula, extending the v1.0 single-formula rule to the new metric.
- Never add a required parameter to `calculateTargetStreak`, `logCorrect`, or `logIncorrect` — the optional-parameter-with-v1.0-default pattern is what keeps this a non-breaking extension; a required parameter would be a breaking change to a "pure function, one implementation" contract this document has twice now relied on staying stable.

## v1.1 Gap Analysis

**Critical Gaps:** None identified — all six FR30–FR39 architectural concerns (settings storage, mechanic threading, in-progress-session detection, Solidification % aggregation, rename propagation, sort) have a decision above with no open question carried forward from the UX spec.

**Minor Gaps:**
- The `lib/segments.ts` vs. new `lib/segment-sort.ts` file-split decision is explicitly left to implementation time (noted above) — the module is small enough today that either is fine, and splitting preemptively would be speculative structure.
- `disambiguate`'s self-exclusion fix for `renameSegment` is a small, testable change to existing logic, not a new decision, but is called out here so it isn't missed during implementation (a rename to the same name in different case must succeed, not collide with itself).
