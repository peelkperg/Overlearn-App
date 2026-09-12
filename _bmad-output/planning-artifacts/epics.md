---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, v1.1-step-01-validate-prerequisites, v1.1-step-02-design-epics, v1.1-step-03-create-stories, v1.1-step-04-final-validation, v1.1.1-extension]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/architecture.md
lastUpdated: '2026-09-12'
versionCoverage:
  v1.0: 'Everything above the "v1.1 Requirements Inventory" heading, and Epic 1-3 below "## Epic List". Shipped, frozen at git tag v1.0.0.'
  v1.1: 'The "v1.1 Requirements Inventory" section (FR30-FR40, UX-DR13-25), and 8 stories (4.1-4.5, 5.1-5.3) below "## Epic List". Fully specified, not yet implemented.'
  v1.1.1: 'The "v1.1.1 Requirements Inventory" section (FR41-FR43, UX-DR26-28), and 3 stories (4.6, 4.7, 5.4) below "## Epic List". Targeted addition (2026-09-12), driven by gaps manual UAT found in the shipped v1.1 build. Fully specified, not yet implemented.'
editHistory:
  - date: '2026-09-12'
    changes: >-
      Extended in place (destructive template-copy step declined again, per
      the 2026-09-06 precedent). Added a "v1.1.1 Requirements Inventory"
      section: FR41-FR43, one architecture-derived additional requirement,
      UX-DR26-28. Added Story 4.6 (row summary data, FR41), Story 4.7
      (sort direction toggle, FR42) to Epic 4; Story 5.4 (Settings
      reachable from any screen, FR43) to Epic 5 — no new epic, both fit
      the existing epics' File Overlap grouping. Driven by three gaps
      manual UAT of the shipped v1.1 build found unreachable/undiscoverable
      (UAT-32 through UAT-41), specified through prd.md,
      ux-design-specification.md, and architecture.md first, in that
      order, same PRD-first spec chain the FR40 addition used.
  - date: '2026-09-11'
    changes: >-
      Code review of Story 5.2 (see its Review Findings section) surfaced
      that its Task 3 mechanism completes an in-progress session as a
      settings-side effect, not just recalculates its displayed target —
      undocumented in Story 5.2's AC #1. Added a second AC to Story 5.2
      covering this completion path (captured target, FR22 lockout,
      completion feedback parity). Amended Story 5.3's standing-notice copy
      to disclose that a change "may complete the session," since its own
      AC bars a per-tap confirmation that would otherwise carry that
      warning.
  - date: '2026-09-06'
    changes: >-
      Extended in place rather than overwritten by the template (this
      workflow's literal step-01 instruction is destructive - "copy the
      entire template" - which would have discarded Epic 1-3's existing
      story-level detail; confirmed with the user to extend instead,
      matching the pattern already used for prd.md,
      ux-design-specification.md, and architecture.md). Added a "v1.1
      Requirements Inventory" section: FR30-FR40 (11 new FRs - FR40 was
      added mid-extraction, see below), no new NFRs, 6 architecture-derived
      additional requirements, and UX-DR13-25 (13 new UX design
      requirements). FR Coverage Map left for the Epic List step, per this
      document's own template convention.

      FR40 (a second rename entry point via 1-second press-and-hold,
      alongside FR30's dedicated screen) surfaced during this extraction
      as a genuinely new capability, not a v1.0 requirement being
      recorded - added to prd.md, ux-design-specification.md, and
      architecture.md first, in that order, before being included here,
      preserving the PRD-first spec chain. A candidate change to FR36
      (a fixed 12-value percentage list) was considered and reverted at
      the user's request; FR36 remains unchanged from its
      architecture.md-committed form (50-300% in 10% steps).
  - date: '2026-09-06'
    changes: >-
      Designed and approved the v1.1 epic structure: Epic 4 (Segment
      Organization & Insight - FR30-FR34, FR38, FR40) and Epic 5
      (Configurable Overlearning Target - FR35-FR37, FR39). Consolidated
      rename/duplicate/sort/Solidification% into one epic per the File
      Overlap rule, since all four touch the same core files Epic 1
      already established. Settings kept as a separate epic - a distinct
      core-file set (new lib/settings.ts, new app/settings.tsx) and a
      distinct user value (configuring the mechanic vs. organizing
      segments). No dependency between the two; sequenced Epic 4 before
      Epic 5 as the lower-risk of the two.
  - date: '2026-09-06'
    changes: >-
      Generated all 8 v1.1 stories (4.1-4.5, 5.1-5.3), covering
      FR30-FR40 and UX-DR13-25 completely. Two corrections made during
      review: persona line uses "As a user," not "As a musician," for
      every v1.1 story (v1.0's existing stories keep their original
      wording - not retroactively changed); Story 4.5 (inline
      press-and-hold rename, FR40) was missing from the first draft
      entirely and added. Story 5.2 is explicitly modeled on v1.0's
      Story 2.9 - a verification story confirming behavior Story 5.1's
      plumbing already produces, per architecture.md's derive-on-read
      analysis, rather than new implementation.
  - date: '2026-09-06'
    changes: >-
      Ran final validation (step 4) against Epic 4-5 and their 8
      stories: FR coverage (all of FR30-FR40 traced to at least one
      story AC), architecture compliance (no upfront schema/entity
      creation - lib/settings.ts and rename.tsx each created exactly
      where their first consuming story needs them), story quality
      (FR-tagged Given/When/Then ACs, single-agent scope, no forward
      dependencies), epic structure (both epics deliver user value; File
      Churn Check reasoning already recorded in the Epic List), and
      epic/story dependency independence (Epic 4 and Epic 5 each
      function standalone; within-epic stories reference only earlier
      stories). All checks passed with no findings - no content changes
      required. v1.1 epics and stories are complete and ready for
      development.
---

# Overlearn - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Overlearn, decomposing the requirements from the PRD, UX Design Specification, and Architecture Decision Document into implementable stories.

## Requirements Inventory

### Functional Requirements

**Segment Management**
FR1: User can create a named practice segment
FR2: User can view a list of their segments
FR3: User can select a segment to practice or to review its history
FR4: User can maintain segments simultaneously with no enforced limit on their number, each with independent state
FR5: **REMOVED** — was "User can archive a segment." Cut post-implementation (2026-09-02): the feature had no way to view or restore an archived segment through the UI, making it a one-way hide that only wasted storage. ID retained, not reassigned, to avoid renumbering every FR/story reference below.
FR6: User can delete a segment
FR7: User is presented with a means to create a first segment when none exist

**Practice Session Lifecycle**
FR8: User can start a practice session for a segment with no upfront input required
FR9: System establishes the initial correct-streak target per the Mechanic Specification before any repetition is logged
FR10: System recalculates the required correct-streak target per the Mechanic Specification whenever a repetition is logged as incorrect
FR11: System never lets the required correct-streak target fall below TARGET_FLOOR
FR12: System completes a session automatically once the current correct-streak target is met
FR13: User can view a session-completion summary showing the segment, the final target achieved, total mistakes, and total attempts for that session
FR14: User can end a completed session (Done), which writes a history entry
FR15: User can immediately begin a new session for the same segment (Repeat)

**Active Session Interaction**
FR16: User can log a repetition as correct
FR17: User can log a repetition as incorrect
FR18: System applies the Correct and Incorrect state transitions defined in the Mechanic Specification
FR19: User cannot undo an individual correct/incorrect log entry (constraint on FR16–FR17, not a standalone capability)
FR20: User can reset an in-progress session, returning all four session fields to their starting values per the Mechanic Specification
FR21: System requires user confirmation before executing a session reset
FR22: System stops accepting repetition input once session completion has triggered

**Session Interruption & Recovery**
FR23: System preserves an in-progress session's full state if the app is backgrounded or closed
FR24: User is prompted to resume or discard an interrupted session on relaunch
FR25: User can resume an interrupted session with all prior progress intact
FR26: User can discard an interrupted session, leaving no history record

**Practice History**
FR27: User can view a chronological list of completed sessions for a segment
FR28: Each history entry displays the date, the final target streak achieved, total mistakes for that session, and total attempts
FR29: System excludes non-completed sessions (abandoned or reset) from the history log

### NonFunctional Requirements

**Performance**
NFR1: Correct/Incorrect/Restart tap must register and update the on-screen streak/target display within 100ms.
NFR2: The NFR1 latency budget must hold even with an asynchronous persistence write occurring on every tap — rendering must not block on disk I/O. (Architecturally resolved via synchronous MMKV writes — see architecture.md Core Architectural Decisions.)

**Reliability**
NFR3: Full in-progress session state must survive app backgrounding or process kill, with no data loss beyond, at most, the single most recent tap if killed in the narrowest window. (Persisted fields per architecture.md: `segment_name`, `current_streak`, `total_incorrect_this_session`, `session_complete`, `session_start_timestamp`; `target_streak` is derived on read, not persisted, but is losslessly reconstructable — see architecture.md Gap Analysis.)
NFR4: On relaunch with an interrupted session present, the user must always be prompted resume vs. discard — the app must never silently resume or silently discard.
NFR5: Completed-session history entries, once written, must be durable across app restarts, reinstalls-with-data-intact, and OS-level backgrounding — the only acceptable data loss is a full app uninstall or device loss.

**Accessibility**
NFR6: All interactive controls (Correct, Incorrect, Restart, and all navigation/management UI) must meet WCAG AA minimum touch target size (44×44pt).
NFR7: The active-session screen must remain legible and operable with no reliance on color alone to distinguish Correct from Incorrect.

**Security & Privacy**
NFR8: Zero data leaves the device: no network calls, no analytics, no crash reporting, no usage tracking of any kind — verifiable by code inspection (no networking library/permission should be present in the shipped app at all, not just unused).
NFR9: No account creation, authentication, or any form of user identification — the app must have zero concept of "a user" beyond the single local device installation.

### Additional Requirements

**Starter Template (blocks Epic 1 Story 1):** `npx create-expo-app@latest Overlearn --template default@sdk-57` — Expo SDK 57, React Native 0.86, React 19.2, TypeScript, Expo Router (file-based navigation) by default.

- Requires `expo-dev-client` (custom dev build) — `react-native-mmkv` is a native module and is not compatible with plain Expo Go.
- Persistence: `react-native-mmkv` for all local data (session state, segments, history) — single library, no SQLite, no AsyncStorage.
- State management: React Context + hooks; custom `useActiveSession` hook wraps MMKV's `useMMKVObject` binding. No Redux/Zustand.
- `target_streak` is derived on every read via `calculateTargetStreak()` in `lib/mechanic.ts` — never persisted, never reimplemented inline elsewhere.
- Active-session state writes are synchronous MMKV writes on every tap (Correct/Incorrect/Restart) — no async write queue.
- `session_complete` is written synchronously in the same write as the triggering `current_streak` update — on relaunch, `session_complete = true` routes directly to the Completion screen, bypassing the resume/discard prompt.
- No API layer, no backend, no networking library anywhere in the dependency tree (enforces NFR8 by omission).
- No auth/account system of any kind (enforces NFR9 by omission).
- Testing framework: not yet pinned (Jest presumed) — flagged in architecture.md as an important, non-blocking gap; should be resolved before the first test-bearing story.
- Build/distribution: EAS Build + EAS Submit; no CI/CD pipeline required for MVP.
- Project structure (from architecture.md) uses a one-directional data flow: UI components → hooks → `lib/` → MMKV storage. No component/hook may access MMKV or the target-streak formula directly — must go through `lib/storage.ts` / `lib/mechanic.ts` respectively.

### UX Design Requirements

UX-DR1: Active Session screen layout — Correct button anchored top (~40% of screen height, green, checkmark icon, no text), Incorrect button anchored bottom (~40%, red, X icon, no text), streak/target readout (`current/target`, e.g. "4/6") centered between them (~20%), with segment name label.
UX-DR2: Restart control — small, low-contrast, text-labeled ("Restart"), bottom-edge-anchored, visually subordinate to Correct/Incorrect; opens a confirm dialog ("Restart session? Progress will be lost.") before executing.
UX-DR3: Four-tier Feedback Signal System, implemented as one shared/central mechanism (not per-screen logic): (1) ordinary Correct tap — minimal, readout increment + light haptic tick; (2) Incorrect tap without target change — mild acknowledgment, visual pulse + light haptic; (3) Incorrect tap causing target-raise — screen flash + sound + vibration, plus a screen-reader announcement (not purely visual/auditory); (4) session completion — haptic pulse + short confirmation sound + visual settle, plus a screen-reader announcement, before transitioning to the Completion screen.
UX-DR4: Completion screen — segment name, final target achieved, total correct, total incorrect, total attempts; Done and Repeat actions. Not a modal overlay — it is the next screen state (so a kill-while-showing can be resumed directly via the persisted `session_complete` flag, per UX-DR9/architecture.md).
UX-DR5: Resume/discard prompt on relaunch when an interrupted session is present — standard dialog component, binary choice, never silently skipped (NFR4).
UX-DR6: Visual design tokens — near-black dark background as primary theme (light/system-following as secondary); green (Correct), red (Incorrect), and a third distinct accent (proposed amber/yellow) reserved exclusively for the target-raise flash so the three signals never visually overlap; desaturated neutral gray for text/UI; all pairings must meet WCAG AA contrast.
UX-DR7: Typography — plain system default typeface; large numeral display for the streak/target readout (must remain legible at larger OS dynamic-type sizes); minimal text volume throughout the app.
UX-DR8: Accessibility — 44×44pt minimum touch targets on all interactive controls (NFR6); no color-alone signaling anywhere (NFR7) — Correct/Incorrect already redundant via position + icon shape + color; target-raise/completion signals redundant via multi-channel (visual + haptic + audio + screen-reader announcement).
UX-DR9: Component strategy — hybrid design system: established/default components (React Native Paper-equivalent or platform default) for all standard screens (segment list, segment creation form, history log, resume/discard dialog, Restart confirm dialog); fully custom-built components only for the Active Session screen (Correct/Incorrect buttons, streak readout, Restart control, Feedback Signal System).
UX-DR10: Navigation — flat, three-level stack: Segment List (home) → Segment Detail (history + Start action) → Active Session/Completion. No tab bar, no drawer. Active Session is a dead-end screen with exactly two exits: automatic completion, or backgrounding (handled by the Interruption & Recovery flow).
UX-DR11: Empty state — segment list with zero segments shows a prompt + primary CTA to create the first one (FR7), using the standard design-system empty-state pattern.
UX-DR12: Responsive/orientation — portrait-primary; Active Session screen layout uses proportional (percentage-of-screen-height) units, not fixed pixels, so it scales across phone sizes. Landscape support is explicitly not designed for in MVP (open question flagged for implementation).

### FR Coverage Map

FR1: Epic 1 - Create a named segment
FR2: Epic 1 - View segment list
FR3: Epic 1 - Select segment to practice/review
FR4: Epic 1 - Multiple concurrent segments, independent state
FR5: REMOVED (was Epic 1 - Archive a segment)
FR6: Epic 1 - Delete a segment
FR7: Epic 1 - First-segment empty state
FR8: Epic 2 - Start session, no upfront input
FR9: Epic 2 - Initial target established
FR10: Epic 2 - Target recalculation on miss
FR11: Epic 2 - Target floor enforced
FR12: Epic 2 - Auto-completion on target met
FR13: Epic 2 - Completion summary
FR14: Epic 2 - Done writes history entry
FR15: Epic 2 - Repeat starts new session
FR16: Epic 2 - Log Correct
FR17: Epic 2 - Log Incorrect
FR18: Epic 2 - Correct/Incorrect state transitions
FR19: Epic 2 - No undo on tap
FR20: Epic 2 - Restart resets all four fields
FR21: Epic 2 - Restart requires confirmation
FR22: Epic 2 - Input stops after completion
FR23: Epic 2 - Full session state persists on background/kill
FR24: Epic 2 - Resume/discard prompt on relaunch
FR25: Epic 2 - Resume with progress intact
FR26: Epic 2 - Discard leaves no history record
FR27: Epic 3 - Chronological completed-session list
FR28: Epic 3 - History entry fields (date, target, mistakes, attempts)
FR29: Epic 3 - Non-completed sessions excluded

## v1.1 Requirements Inventory (added 2026-09-06)

Everything above this heading is v1.0, shipped and frozen at git tag `v1.0.0`. Everything below is v1.1 — designed (`prd.md`, `ux-design-specification.md`, `architecture.md` all extended 2026-09-06), not yet implemented. Epic assignment for these FRs appears in the v1.1 Epic List below, alongside the unchanged v1.0 Epic List.

### v1.1 Functional Requirements

**Segment Management extensions**
FR30: User can rename an existing segment (dedicated screen)
FR31: System reflects a segment rename in every place its name is displayed (5 sites: list row, detail heading, active-session readout, completion summary, resume/discard prompt)
FR32: User can duplicate an existing segment; disambiguated name, no copied history
FR33: User can sort the segment list by name, creation date, last-practiced date, or Solidification % (aggregate correct ÷ total across all completed sessions for the segment)
FR34: System persists the selected sort option and direction across app relaunches
FR38: User can view a segment's Solidification % (FR33's definition) at the top of its history log
FR40: User can rename a segment via 1-second press-and-hold at the list row or detail heading, editing in place; coexists with FR30's dedicated screen

**Settings (new capability group)**
FR35: User can access a Settings screen to configure the overlearning-% target
FR36: System accepts any overlearning-% value from 50% to 300% in 10-percentage-point increments; no other value is selectable
FR37: System applies a changed overlearning-% immediately to the target-streak calculation of a session already in progress
FR39: When an in-progress session exists, the Settings screen shows a standing notice that a change applies to it immediately

### v1.1 NonFunctional Requirements

None added in v1.1.

### v1.1 Additional Requirements (from architecture.md's v1.1 section)

- New `lib/settings.ts` storage boundary — single MMKV key `settings.general`, same envelope/type-guard pattern as `lib/segments.ts`; default `{ overlearningPercent: 50, sortKey: 'createdAt', sortDirection: 'asc' }` reproduces v1.0 behavior exactly until a user opens Settings.
- `calculateTargetStreak`, `session-transitions.ts`'s `logCorrect`/`logIncorrect` each gain an **optional** second parameter (`overlearningLevel`) defaulting to the v1.0 constant — non-breaking; every v1.0 call site and test is unmodified.
- FR37 (live mid-session apply) needs no new mechanism — `target_streak` was already derived-on-read, never stored, in v1.0.
- FR39 (in-progress-session detection) needs no new mechanism — `session.active` is a single MMKV key app-wide, so `useActiveSession()` already answers the question.
- New `calculateSolidificationPercent` in `lib/history.ts`, shared by FR33's sort and FR38's display; returns `null` (not `0`) for "no completed sessions yet" so the UI can render an em dash rather than a misleading 0%.
- `useSegments()` gains a `subscribeToHistory` subscription it didn't need in v1.0, so the list re-renders on session completion when sorted by last-practiced or Solidification %.
- FR40 calls the existing `renameSegment` from a second UI entry point — no new `lib/` function, no schema change.
- Two new routes (`app/settings.tsx`, `app/segment/[id]/rename.tsx`) — both must be added to `src/app/stack-screens.ts` and given a `<Stack.Screen>` entry in `_layout.tsx` per the project's standing regression guard (a route missing from either is silently dropped in production with no dev-mode signal).

### v1.1 UX Design Requirements

UX-DR13: Settings reached via a gear icon in the Home header only — never reachable mid-session, keeping the Active Session screen untouched
UX-DR14: Overlearning-% stepper (− / value / +), 10-point steps, both buttons `disabled` at their bound (50%/300%)
UX-DR15: Live worked example line beside the stepper, recomputing on every step (e.g. "At 150%, 10 mistakes sets a target of 15")
UX-DR16: Static floor note explaining `TARGET_FLOOR` = 5, so a low percentage's floor behavior isn't surprising
UX-DR17: Standing in-progress-session notice (FR39) — visible the whole time Settings is open with a session active, not a per-tap confirmation
UX-DR18: `Sort: X ▾` pressable above the segment list, reusing the existing row-menu Modal component
UX-DR19: Sort menu — tapping the active option flips its direction; tapping a different option applies that option's default direction; hidden at 0–1 segments
UX-DR20: Row action menu gains Rename, Duplicate above Delete (destructive action stays last)
UX-DR21: Duplicate confirms via a standard snackbar, not a new feedback tier (a copy can sort off-screen, so silent insertion would read as a no-op)
UX-DR22: Rename screen reuses `SegmentForm` unchanged, submit label "Rename"
UX-DR23: Solidification % summary line on Segment Detail, between the heading and the history entry list; renders "—" (not "0%") when no history exists yet
UX-DR24: Accessibility — stepper bounds carry `accessibilityState: { disabled: true }`, sort control announces both the selected key and direction, in-progress notice and duplicate snackbar use `accessibilityLiveRegion="polite"`
UX-DR25: Inline rename (FR40) — 1-second `onLongPress`/`delayLongPress` threshold; swaps `<Text>` for a pre-filled `<TextInput>` in place with no layout shift; commits via `onSubmitEditing`; blur without submitting reverts rather than saving a partial edit; static state carries `accessibilityHint="Press and hold to rename"`

### v1.1 FR Coverage Map

FR30: Epic 4 - Rename via dedicated screen
FR31: Epic 4 - Rename propagates to all 5 display sites
FR32: Epic 4 - Duplicate, no copied history
FR33: Epic 4 - Sort by name/created/last-practiced/Solidification %
FR34: Epic 4 - Sort choice persists across relaunches
FR38: Epic 4 - Solidification % summary on history log
FR40: Epic 4 - Inline rename via press-and-hold
FR35: Epic 5 - Settings screen access
FR36: Epic 5 - 50-300% in 10% steps
FR37: Epic 5 - Applies live to in-progress session
FR39: Epic 5 - Standing in-progress-session notice

## v1.1.1 Requirements Inventory (added 2026-09-12)

Everything above this heading through the v1.1 section is designed and specified, not yet implemented. This section covers three gaps manual UAT of the shipped v1.1 build found — unreachable Settings mid-session (blocking UAT-38/39/40/41), and two undiscoverable/missing list affordances (found alongside UAT-32-37) — added to `prd.md`, `ux-design-specification.md`, and `architecture.md` in that order before being included here, same PRD-first chain the FR40 addition used.

### v1.1.1 Functional Requirements

**Active Session Interaction extension**
FR43: User can access Settings from any screen, including the active-session screen while a session is in progress or interrupted, via a consistently-placed control; navigating there does not end, reset, or otherwise mutate the session

**Segment Management extensions**
FR41: Each segment list row displays creation date, last-practice date ("Last practice: dd Mmm yyyy"), and Solidification % (one decimal place); em dash convention (FR38) for a segment with no completed sessions
FR42: User can flip the segment list's sort direction via a dedicated toggle control next to the Sort control, independent of re-selecting the currently-active sort option

### v1.1.1 NonFunctional Requirements

None added.

### v1.1.1 Additional Requirements (from architecture.md's v1.1.1 section)

- New shared `components/SettingsButton.tsx`, extracted from `app/index.tsx`'s existing inline gear icon and mounted on `app/session/[id].tsx` and `app/segment/[id].tsx` too (FR43). Pure Expo Router stack push — no new session read/write path, no change to `session/[id].tsx`'s "talks only to `useActiveSession`" boundary.
- `useSegments()` return value gains `aggregates: Map<string, SortAggregate>` — the same map `buildSortAggregates()` (Story 4.3) already computes internally for sorting, now also exposed for FR41's row display. No new `lib/` function.
- `SortControl.tsx` gains a second `Pressable` in place (no new component file) for FR42, reusing its existing `directionLabel()` helper.

### v1.1.1 UX Design Requirements

UX-DR26: Settings gear icon, fixed top corner, 44×44 minimum target, added to Active Session (both in-progress and Completion states) and Segment Detail — same icon/placement/`accessibilityLabel="Settings"` treatment as the existing Home instance
UX-DR27: Segment list row grows to three lines — name, "Last practice: {dd Mmm yyyy} · {Solidification %}", "Created {dd Mmm yyyy}"; secondary/small label type, not competing with the name for visual weight; em-dash convention for a never-practiced segment
UX-DR28: Sort-direction toggle — a `↑`/`↓` icon button immediately right of the `Sort: X ▾` trigger, same row, 44×44 minimum target, showing current direction; the menu's re-tap-active-option flip path is kept, not replaced; a single accessibility label names the key, current direction, and resulting direction, never the bare glyph — no accessibilityHint (Resolved 2026-09-12: a hint is dropped when iOS's "Speak Hints" is off and merged into Android's contentDescription)

### v1.1.1 FR Coverage Map

FR41: Epic 4 - Row summary data (creation/last-practice date, Solidification %)
FR42: Epic 4 - Sort direction toggle button
FR43: Epic 5 - Settings reachable from any screen

## Epic List

### Epic 1: Segment Management
Users can create, organize, and maintain their practice segments — the foundation everything else builds on.
**FRs covered:** FR1, FR2, FR3, FR4, FR6, FR7 (FR5 removed post-implementation, see Requirements Inventory)
**Implementation notes:** Includes the starter-template project initialization as its first story (blocking prerequisite). Standard design-system screens/components per architecture.md and UX-DR9/UX-DR11.

### Epic 2: The Overlearning Session
Users can run a full practice session end-to-end: start immediately, log Correct/Incorrect taps with live target recalculation, Restart a bad start, survive interruption, and complete the session — the entire core mechanic that makes Overlearn what it is.
**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26
**Implementation notes:** The custom Active Session screen, the four-tier Feedback Signal System, MMKV synchronous session-state writes, derive-on-read target-streak, and the resume/discard/completion-resume logic all live here. This is the largest and most architecturally significant epic — Session Lifecycle, Active Session Interaction, and Interruption & Recovery are consolidated into one epic because they share the same core files and none of the three is independently meaningful without the others (a session that can start but never resume after interruption isn't a complete feature).

### Epic 3: Practice History Review
Users can review a segment's history of completed sessions to judge, in their own terms, whether a passage is actually holding up.
**FRs covered:** FR27, FR28, FR29
**Implementation notes:** Standard list screen, depends on Epic 2 producing history entries but is otherwise a self-contained read-only view.

### Epic 4: Segment Organization & Insight (v1.1, added 2026-09-06; extended 2026-09-12)
Users can rename, duplicate, and sort their segments, and see at a glance how solidified each one is — all without leaving the segment-management screens.
**FRs covered:** FR30, FR31, FR32, FR33, FR34, FR38, FR40, FR41, FR42
**Implementation notes:** Consolidated into one epic per the File Overlap rule — rename (both entry points), duplicate, sort, and the Solidification % summary all touch the same core files Epic 1 already established (`SegmentListItem.tsx`, `lib/segments.ts`, `app/index.tsx`, `app/segment/[id].tsx`), plus `lib/history.ts` for FR38's aggregation. New: `app/segment/[id]/rename.tsx` route, inline-edit state in the list row and detail heading. **v1.1.1 additions (FR41, FR42):** no new file — `SegmentListItem.tsx` gains a prop for row summary data (reusing `buildSortAggregates()`, no new `lib/` computation) and `SortControl.tsx` gains a direction-toggle `Pressable` in place. No dependency on Epic 5.

### Epic 5: Configurable Overlearning Target (v1.1, added 2026-09-06; extended 2026-09-12)
Users can adjust how strict the overlearning target is — from the fixed 50% to anywhere between 50% and 300% — globally, with a change taking effect immediately, including for a session already underway.
**FRs covered:** FR35, FR36, FR37, FR39, FR43
**Implementation notes:** A distinct core-file set from Epic 4 — new `lib/settings.ts` boundary, new `app/settings.tsx` screen, and the optional-parameter threading through `lib/mechanic.ts` → `lib/session-transitions.ts` → `hooks/useActiveSession.ts` that `architecture.md` already resolved as non-breaking. No dependency on Epic 4; sequenced after it as the higher-risk of the two (it touches the core mechanic layer, even though the threading is designed to be non-breaking). **v1.1.1 addition (FR43):** new shared `components/SettingsButton.tsx`, mounted on `app/session/[id].tsx` and `app/segment/[id].tsx` in addition to `app/index.tsx` — closes the gap that left Story 5.2/5.3's live-apply and standing-notice behavior unreachable/untestable mid-session in the shipped build (UAT-38-41).

## Epic 1: Segment Management

Users can create, organize, and maintain their practice segments — the foundation everything else builds on.

### Story 1.1: Project Initialization

As a developer,
I want the Overlearn project scaffolded with the architecture's chosen stack,
So that every subsequent story builds on a consistent, working foundation.

**Acceptance Criteria:**

**Given** no project exists yet
**When** the project is initialized via `npx create-expo-app@latest Overlearn --template default@sdk-57`
**Then** a working Expo SDK 57 / React Native 0.86 / TypeScript / Expo Router project exists and runs in a dev client

**Given** the base project exists
**When** `expo-dev-client` and `react-native-mmkv` are installed and configured
**Then** the app builds and runs on a custom dev client (not plain Expo Go), and a trivial MMKV read/write round-trips correctly

**Given** the project structure defined in architecture.md
**When** the initial folder structure is created
**Then** `app/`, `components/`, `hooks/`, `lib/`, `constants/`, and `assets/` directories exist matching the documented structure

### Story 1.2: Create a Named Practice Segment

As a musician,
I want to create a named practice segment,
So that I have a place to track overlearning progress for a specific passage.

**Acceptance Criteria:**

**Given** the user is on the segment creation form
**When** they enter a non-empty name and confirm
**Then** a new segment is created and persisted via MMKV, and the user is returned to the segment list showing the new segment

**Given** the user is on the segment creation form
**When** they attempt to confirm with an empty name
**Then** the form shows inline validation and does not create a segment (FR1)

### Story 1.3: View the Segment List

As a musician,
I want to see all my practice segments in one list,
So that I can pick up where I left off across multiple passages.

**Acceptance Criteria:**

**Given** one or more segments exist
**When** the user opens the app
**Then** the segment list displays every segment with independent state, with no enforced limit on count (FR2, FR4)

**Given** no segments exist yet
**When** the user opens the app
**Then** an empty state is shown with a prompt and primary action to create the first segment (FR7, UX-DR11)

### Story 1.4: Select a Segment to Practice or Review

As a musician,
I want to tap a segment to open it,
So that I can start practicing it or review its history.

**Acceptance Criteria:**

**Given** the segment list is showing at least one segment
**When** the user taps a segment
**Then** the Segment Detail screen opens, showing the segment name and a Start action (session/history functionality itself is built in Epic 2/Epic 3; this story delivers navigation and the screen shell) (FR3)

**Note:** This story's user story text references practicing and reviewing history — those capabilities are delivered incrementally by Epic 2 (practice) and Epic 3 (history) respectively; this story alone only builds the navigable shell, which is complete and independently valuable on its own.

### Story 1.5: REMOVED — Archive a Segment

Implemented, then removed post-implementation (2026-09-02) to optimize data storage: the feature had no way to view or restore an archived segment through the UI, so it functioned as a one-way hide that only accumulated unreachable data. Story number retained, not reassigned. See git history for the original implementation and its removal commit.

### Story 1.6: Delete a Segment

As a musician,
I want to permanently delete a segment,
So that I can remove one I created by mistake or no longer need at all.

**Acceptance Criteria:**

**Given** a segment exists
**When** the user deletes it
**Then** the segment and all its associated data (including history entries) are permanently removed from storage (FR6)

## Epic 2: The Overlearning Session

Users can run a full practice session end-to-end: start immediately, log Correct/Incorrect taps with live target recalculation, Restart a bad start, survive interruption, and complete the session — the entire core mechanic that makes Overlearn what it is.

### Story 2.1: Start a Practice Session Immediately

As a musician,
I want to start a session with zero setup,
So that I can begin practicing the moment I tap a segment.

**Acceptance Criteria:**

**Given** the user is on a segment's detail screen
**When** they tap Start
**Then** a session begins immediately with `current_streak = 0`, `session_start_timestamp` set to now, and target computed via `calculateTargetStreak(0)` (= 5, the floor), with no input screen or confirmation step (FR8, FR9)

**Given** a session has just started
**When** its state is first written
**Then** it is persisted via the MMKV write helpers (`lib/storage.ts`) established as foundational plumbing from this story onward — every subsequent tap-handling story (2.2–2.8) writes through this same synchronous mechanism, not a mechanism introduced later in Story 2.9

**Given** a session has just started
**When** the Active Session screen renders
**Then** it shows the locked layout: Correct button top (~40%, green, checkmark, no text), Incorrect button bottom (~40%, red, X, no text), streak/target readout centered (`0/5`) with segment name, Restart control subordinate at the bottom edge (UX-DR1, UX-DR2)

**Given** the Active Session screen is rendered
**When** its visual styling is applied
**Then** it uses the near-black dark background, green/red/amber semantic colors (amber reserved exclusively for target-raise), desaturated neutral text, and a large-numeral readout that scales with OS dynamic type — all color pairings meeting WCAG AA contrast (UX-DR6, UX-DR7)

**Given** the Correct, Incorrect, and Restart controls are rendered
**When** their touch targets are measured
**Then** each meets the 44×44pt WCAG AA minimum, and Correct/Incorrect remain distinguishable without relying on color alone (position + icon shape are also present) (NFR6, NFR7, UX-DR8)

**Given** the Active Session screen's layout
**When** it renders on any supported phone size in portrait orientation
**Then** the top/center/bottom proportions hold using percentage-of-screen-height units, not fixed pixels (UX-DR12)

### Story 2.2: Log a Correct Repetition

As a musician,
I want to tap Correct after a successful attempt,
So that my streak progresses toward the target.

**Acceptance Criteria:**

**Given** an active session with `current_streak < target_streak`
**When** the user taps Correct
**Then** `current_streak` increments by 1, the readout updates within 100ms, and a minimal feedback tier fires (light haptic tick only) (FR16, FR18, NFR1)

**Given** any Correct or Incorrect tap has just been logged
**When** the user wants to undo it
**Then** no undo affordance exists anywhere in the UI — the tap is final (FR19)

### Story 2.3: Log an Incorrect Repetition with Live Target Recalculation

As a musician,
I want to tap Incorrect after a failed attempt,
So that my streak resets and the target adjusts if the passage is proving harder than assumed.

**Acceptance Criteria:**

**Given** an active session
**When** the user taps Incorrect
**Then** `current_streak` resets to 0, then `total_incorrect_this_session` increments by 1, then `target_streak` is recalculated via `calculateTargetStreak(total_incorrect_this_session)`, applied in that exact order (FR10, FR17, FR18)

**Given** `total_incorrect_this_session` is 10 or less after the increment
**When** the target is recalculated
**Then** it remains at the floor of 5, and the mild feedback tier fires (visual pulse + light haptic) (FR11)

**Given** `total_incorrect_this_session` exceeds 10 after the increment (i.e. reaches 11+)
**When** the target is recalculated and increases
**Then** the alert feedback tier fires (screen flash + sound + vibration + screen-reader announcement), and the readout's denominator visibly updates (e.g. `0/5` → `0/6`) (FR10, UX-DR3, UX-DR8)

**Given** any Correct or Incorrect tap has just been logged
**When** the user wants to undo it
**Then** no undo affordance exists anywhere in the UI — the tap is final (FR19)

### Story 2.4: Restart an In-Progress Session

As a musician,
I want to restart a session I've just begun badly,
So that a false start doesn't pollute my target calculation.

**Acceptance Criteria:**

**Given** an active session in progress
**When** the user taps Restart
**Then** a confirmation dialog appears: "Restart session? Progress will be lost." (FR21, UX-DR2)

**Given** the confirmation dialog is showing
**When** the user cancels
**Then** the session continues unchanged

**Given** the confirmation dialog is showing
**When** the user confirms
**Then** all four session fields reset to starting values (`current_streak = 0`, `total_incorrect_this_session = 0`, target back to floor 5, `session_start_timestamp` = now), the screen returns to `0/5`, and no history entry is written for the discarded attempt (FR20)

### Story 2.5: Automatic Session Completion

As a musician,
I want the session to complete automatically the moment I hit the target,
So that I never have to judge for myself whether I'm "done."

**Acceptance Criteria:**

**Given** an active session
**When** a Correct tap brings `current_streak >= target_streak`
**Then** the session is marked complete, `session_complete = true` is persisted synchronously in the same write as the triggering `current_streak` update, and the Correct/Incorrect/Restart controls stop accepting input (FR12, FR22)

**Given** completion has just triggered
**When** the transition happens
**Then** the distinct completion feedback tier fires (haptic pulse + short confirmation sound + visual settle + screen-reader announcement) — audibly and haptically different from the alert tier used for target-raise (UX-DR3)

### Story 2.6: View Session Completion Summary

As a musician,
I want to see a clear summary when a session completes,
So that I know exactly what I accomplished.

**Acceptance Criteria:**

**Given** a session has just completed
**When** the Completion screen renders
**Then** it shows the segment name, the final target achieved, total correct, total incorrect, and total attempts, with Done and Repeat actions (FR13)

**Given** the app is killed while the Completion screen is showing
**When** the user relaunches the app
**Then** it restores directly to the Completion screen (because `session_complete = true` was already persisted), not the resume/discard prompt (UX-DR4, architecture.md completion-resume decision)

### Story 2.7: End Session and Write History

As a musician,
I want to tap Done to close out a completed session,
So that the result is recorded for later review.

**Acceptance Criteria:**

**Given** the Completion screen is showing
**When** the user taps Done
**Then** a history entry is written (date, final target, total mistakes, total attempts) and the user returns to the segment list (FR14)

### Story 2.8: Repeat Session Immediately

As a musician,
I want to immediately start another session on the same segment after completing one,
So that I can keep practicing without extra navigation.

**Acceptance Criteria:**

**Given** the Completion screen is showing
**When** the user taps Repeat
**Then** the just-completed session's history entry is written first (same as Done, FR14), and then a new session begins immediately for the same segment following the same start behavior as Story 2.1 (`0/5`) (FR14, FR15)

**Correction (2026-09-06):** this AC previously read "no history entry written for the just-completed session unless Done was tapped first," citing FR29. That was wrong and shipped as a bug: FR29 excludes *abandoned or reset* sessions from history, not completed ones, and a session showing the Completion screen has already reached its target. Fixed in code (`handleRepeat` now calls `complete()` before `start()`) and in PRD FR15.

### Story 2.9: Verify Interruption Survival on Background or Kill

As a musician,
I want confidence that my session progress survives an interruption,
So that a phone call or app switch never costs me my progress.

**Note (scope clarification):** the synchronous MMKV persistence mechanism itself is foundational plumbing established starting in Story 2.1 (`lib/storage.ts`), used by every tap-handling story since (2.1–2.8) — it is not introduced for the first time here. This story specifically delivers and tests the interruption-survival *guarantee*: that the state already being written on every tap is verified to actually survive backgrounding/kill across the full range of session states.

**Acceptance Criteria:**

**Given** an active session with any combination of `current_streak`, `total_incorrect_this_session`, `segment_name`, `session_start_timestamp`, and `session_complete`
**When** the app is backgrounded or killed at any point
**Then** the full state is already persisted via the synchronous MMKV write from the most recent tap, with at most the single most-recent tap's data at risk in the narrowest timing window (FR23, NFR3)

### Story 2.10: Resume or Discard an Interrupted Session on Relaunch

As a musician,
I want to be asked whether to resume or discard an interrupted session,
So that I'm never confused about what state my practice is in.

**Acceptance Criteria:**

**Given** an interrupted session exists (`session_complete = false`) on relaunch
**When** the app opens
**Then** the user is always prompted resume vs. discard — never silently resumed or silently discarded (FR24, NFR4)

**Given** the resume/discard prompt is showing
**When** the user chooses Resume
**Then** the Active Session screen restores with `current_streak`, `total_incorrect_this_session`, and the recalculated target exactly as left (FR25)

**Given** the resume/discard prompt is showing
**When** the user chooses Discard
**Then** the session state is cleared and no history entry is ever written for it (FR26)

**Given** an interrupted session with `session_complete = true` exists on relaunch
**When** the app opens
**Then** it routes directly to the Completion screen (Story 2.6's AC) rather than showing the resume/discard prompt

## Epic 3: Practice History Review

Users can review a segment's history of completed sessions to judge, in their own terms, whether a passage is actually holding up.

### Story 3.1: View Completed Session History for a Segment

As a musician,
I want to see a chronological list of my completed sessions for a segment,
So that I can judge for myself whether a passage is actually solidifying over time.

**Acceptance Criteria:**

**Given** a segment has one or more completed sessions
**When** the user opens its history log
**Then** each entry displays the date, the final target streak achieved, total mistakes for that session, and total attempts, in chronological order (FR27, FR28)

**Given** a segment has sessions that were abandoned, discarded, or restarted
**When** the user opens its history log
**Then** none of those non-completed sessions appear — only sessions that reached Done are listed (FR29)

**Given** a segment has no completed sessions yet
**When** the user opens its history log
**Then** an empty list is shown (no error, no placeholder data)

## Epic 4: Segment Organization & Insight (v1.1, added 2026-09-06)

Users can rename, duplicate, and sort their segments, and see at a glance how solidified each one is — all without leaving the segment-management screens.

### Story 4.1: Rename a Segment

As a user,
I want to rename an existing segment,
So that its name stays accurate as what I'm practicing changes.

**Acceptance Criteria:**

**Given** a segment's row menu
**When** the user opens it
**Then** it lists Rename and Duplicate above Delete, in that order (UX-DR20)

**Given** the user opens a segment's row-menu action "Rename"
**When** the Rename screen opens
**Then** it shows `SegmentForm` pre-filled with the segment's current name and submit label "Rename" (FR30, UX-DR22)

**Given** the Rename screen, with the name changed to a value not used by any other segment
**When** the user submits
**Then** the segment's name is updated in storage and the user returns to the segment list showing the new name (FR30)

**Given** the Rename screen, with the name changed to a value colliding with another segment's name (case-insensitive)
**When** the user submits
**Then** the new name is disambiguated exactly as segment creation already does (e.g. "Bar 24 (2)"), never rejected (FR30, same rule as FR1)

**Given** the Rename screen, with the name changed to a different case of its own current name (e.g. "bar 24" → "Bar 24")
**When** the user submits
**Then** the rename succeeds — the segment's own current name is excluded from the collision check (FR30)

**Given** a segment has been renamed
**When** its name is displayed anywhere in the app — the segment list row, the segment detail heading, the active-session streak readout, the completion summary, and the resume/discard prompt for an interrupted session on that segment
**Then** every one of those five sites shows the current name, not the name as it was when a history entry or session was first recorded (FR31)

### Story 4.2: Duplicate a Segment

As a user,
I want to duplicate an existing segment,
So that I can track a variation of a passage as its own segment without losing the original's history.

**Acceptance Criteria:**

**Given** a segment exists
**When** the user selects "Duplicate" from its row menu
**Then** a new segment is created immediately with a disambiguated name (e.g. "Bar 24 (2)"), a fresh id, a fresh creation date, and no copied history entries (FR32)

**Given** a segment was just duplicated
**When** the segment list re-renders
**Then** a snackbar confirms "Duplicated as '{name}'", announced via `accessibilityLiveRegion="polite"` (UX-DR21, UX-DR24)

### Story 4.3: Sort the Segment List

As a user,
I want to sort my segment list by name, creation date, last practiced, or Solidification %,
So that I can find the segment I'm looking for as my list grows.

**Acceptance Criteria:**

**Given** two or more segments exist
**When** the user opens the "Sort: {current} ▾" control above the list
**Then** a menu shows all four sort options, with the currently active one marked (FR33, UX-DR18)

**Given** the sort menu is open
**When** the user taps an option that is not currently active
**Then** the list re-sorts by that key at its default direction (name: A→Z; date created / last practiced: newest first; Solidification %: highest first) (FR33, UX-DR19)

**Given** the sort menu is open
**When** the user taps the option that is already active
**Then** the sort direction flips (FR33, UX-DR19)

**Given** the list is sorted by last-practiced date or Solidification %, and a segment has no completed sessions
**When** the list is sorted
**Then** that segment sorts as the oldest-possible date / 0%, regardless of sort direction (FR33)

**Given** a session is completed for a segment currently visible in the list
**When** the list is sorted by last-practiced date or Solidification %
**Then** the list re-orders live to reflect the new history, without requiring the screen to be reopened (FR33, via `useSegments`'s new history subscription)

**Given** the user selects a sort option and direction
**When** the app is closed and reopened
**Then** the same sort option and direction are restored (FR34)

**Given** zero or exactly one segment exists
**When** the segment list renders
**Then** the sort control is hidden (UX-DR19)

**Given** the sort control shows the active sort
**When** a screen reader reaches it
**Then** it announces both the selected key and direction (e.g. "Sort by last practiced, most recent first"), not the `▾` glyph alone (UX-DR24)

### Story 4.4: View a Segment's Solidification %

As a user,
I want to see a segment's overall Solidification % on its history screen,
So that I can judge how reliably a passage has held up, not just read individual session entries.

**Acceptance Criteria:**

**Given** a segment has one or more completed sessions
**When** its history log screen opens
**Then** a summary line between the heading and the entry list shows "Solidification: {percent}%", computed as aggregate correct repetitions ÷ aggregate total repetitions across every completed session for that segment (FR38, UX-DR23)

**Given** a segment has zero completed sessions
**When** its history log screen opens
**Then** the summary line shows "Solidification: —", not "Solidification: 0%" (FR38)

### Story 4.5: Rename a Segment Inline

As a user,
I want to rename a segment by pressing and holding its name,
So that I can fix a name quickly without opening a separate screen.

**Acceptance Criteria:**

**Given** a segment's name displayed at the segment list row or the segment detail heading
**When** the user presses and holds the name for 1 second
**Then** the name becomes an editable text field in place, pre-filled with the current name, keyboard open, with no shift in the row/heading's layout (FR40, UX-DR25)

**Given** the name is in its editable state
**When** the user edits the text and presses the keyboard's return/submit key
**Then** the new name is saved using the same validation and disambiguation rule as Story 4.1, and the field returns to static text showing the new name (FR40)

**Given** the name is in its editable state
**When** the user taps outside the field without submitting
**Then** the edit is discarded and the field reverts to the original name (FR40)

**Given** the name is in its editable state
**When** the user submits an empty name
**Then** the edit is rejected and the field remains editable with an error, consistent with FR1/FR30's non-empty validation (FR40)

**Given** the segment list row
**When** the user taps it normally (not a long-press)
**Then** navigation to the segment detail screen still occurs as before — the long-press threshold does not interfere with the existing tap-to-open behavior (FR40)

### Story 4.6: View Segment List Row Summary Data (v1.1.1, added 2026-09-12)

As a user,
I want to see each segment's creation date, last-practice date, and Solidification % right in the list,
So that I don't have to open a segment just to see how it's doing.

**Acceptance Criteria:**

**Given** a segment with one or more completed sessions
**When** the segment list renders
**Then** its row shows, below the name: "Last practice: {dd Mmm yyyy} · {Solidification %, one decimal}" and "Created {dd Mmm yyyy}" (FR41, UX-DR27)

**Given** a segment with zero completed sessions
**When** the segment list renders
**Then** its row shows "Last practice: — · —" for the summary line, never "0.0%", using the same em-dash convention as Story 4.4's history-log summary (FR41)

**Given** the segment list is showing row summary data
**When** the underlying data is sourced
**Then** it reuses `buildSortAggregates()` (Story 4.3) via `useSegments()`'s exposed `aggregates` map — no second computation, no new `lib/` function (FR41, per architecture.md's v1.1.1 section)

**Given** a segment row with summary data
**When** a screen reader reaches it
**Then** the name, last-practice date, Solidification %, and creation date are read as one row-level accessibility label, in that order — not as separate focusable elements (FR41, UX-DR27)

### Story 4.7: Flip Sort Direction via Toggle (v1.1.1, added 2026-09-12)

As a user,
I want a dedicated button to flip the segment list's sort direction,
So that I don't have to re-open the sort menu and re-tap the already-active option to do it.

**Acceptance Criteria:**

**Given** the segment list's sort control is visible (2+ segments)
**When** the list renders
**Then** a `↑`/`↓` icon button appears immediately to the right of the `Sort: X ▾` trigger, showing the current direction (FR42, UX-DR28)

**Given** the direction toggle button
**When** the user taps it
**Then** the sort direction flips for the currently active sort key and the list re-sorts live — the same effect as re-tapping the active option in the sort menu (FR42)

**Given** Story 4.3's existing "tap the already-active menu option to flip direction" gesture
**When** Story 4.7 ships
**Then** that gesture still works unchanged — the new button is an addition, not a replacement (FR42)

**Given** the direction toggle button
**When** a screen reader reaches it
**Then** it announces the sort key, the current direction, and the direction a tap would produce, in a single accessibility label with no hint (e.g. "Sort by Last practiced, currently most recent first, switches to oldest first"), reusing `SortControl.tsx`'s existing `directionLabel()` helper — never the bare glyph alone (FR42, UX-DR28)

## Epic 5: Configurable Overlearning Target (v1.1, added 2026-09-06)

Users can adjust how strict the overlearning target is — from the fixed 50% to anywhere between 50% and 300% — globally, with a change taking effect immediately, including for a session already underway.

### Story 5.1: Configure the Overlearning Target

As a user,
I want to set the overlearning-% used to calculate my target streak,
So that I can make the mechanic stricter or more lenient than the default.

**Acceptance Criteria:**

**Given** the segment list screen
**When** the user taps the gear icon in its header
**Then** the Settings screen opens, showing the current overlearning-% (default 50%) via a stepper (UX-DR14), a live worked example that recomputes with the value (UX-DR15), and a static floor note explaining `TARGET_FLOOR`=5 (UX-DR16) (FR35, UX-DR13)

**Given** the Settings screen
**When** the user taps `+` or `−`
**Then** the value changes by 10 percentage points, is saved immediately with no confirmation step, and the buttons disable at 50% and 300% respectively, with `accessibilityState: { disabled: true }` set so the limit is announced to a screen reader, not just shown visually (FR36, UX-DR14, UX-DR24)

**Given** the overlearning-% has been changed
**When** a new session is subsequently started
**Then** its target-streak calculation uses the new value, not the previous one (FR35, FR36 — verified via `calculateTargetStreak`'s new optional parameter, read from `lib/settings.ts` by `useActiveSession`)

### Story 5.2: Apply a Changed Target to an In-Progress Session

As a user,
I want a target change I make mid-session to take effect immediately,
So that the app never operates on two different rules at once.

**Acceptance Criteria:**

**Given** a session is in progress
**When** the user changes the overlearning-% in Settings and returns to that session
**Then** the displayed target streak reflects the new percentage immediately, with no restart or re-navigation required (FR37)

**Given** a session is in progress with `current_streak` already meeting or exceeding what the recalculated target would be
**When** the user lowers the overlearning-% in Settings
**Then** the session completes immediately as a result of the setting change alone — `session_complete` flips true, `completed_target` captures the achieved streak (not the newly-lowered target, if the streak exceeds it), the FR22 lockout applies, and the same completion feedback (haptic, screen-reader announcement) fires as a Correct-triggered completion (FR37, FR22, FR12, UX-DR3) (added 2026-09-11, code review of Story 5.2)

*(Note: per `architecture.md`, this requires no new mechanism for the displayed target number — it verifies the behavior Story 5.1's plumbing already produces, since `target_streak` is derived on every read. Same shape as v1.0's Story 2.9, which verified an already-built guarantee rather than building a new one. The second AC above is not covered by that note: it is new behavior, deferred from Story 5.1's code review and requiring the reconciliation mechanism Story 5.2's Task 3 implements.)*

### Story 5.3: See a Warning Before Changing Settings Mid-Session

As a user,
I want to know when changing this setting will affect a session I'm already running,
So that I'm not surprised by a target that moved without my noticing.

**Acceptance Criteria:**

**Given** an in-progress session exists for any segment
**When** the user opens the Settings screen
**Then** a standing notice appears above the stepper: "You have a session in progress for '{segment name}.' Changing this target updates it immediately — and may complete the session.", using `accessibilityLiveRegion="polite"` (FR39, UX-DR17, UX-DR24) (copy amended 2026-09-11, code review of Story 5.2 — the original wording described only a recalculation, not the completion Story 5.2's Task 3 mechanism can also trigger from a single tap with no confirmation gate, per the next AC)

**Given** the notice is showing
**When** the user taps `+`/`−` any number of times
**Then** the same single notice remains visible throughout — no per-tap confirmation dialog appears (FR39)

**Given** no session is in progress
**When** the user opens the Settings screen
**Then** the notice is not rendered at all (FR39)

### Story 5.4: Reach Settings From Any Screen (v1.1.1, added 2026-09-12)

As a user,
I want to open Settings while a practice session is active or interrupted,
So that a target change I need (FR37) or the warning about one (FR39) is actually reachable, not just true in theory.

**Acceptance Criteria:**

**Given** a session is in progress
**When** the active-session screen is showing
**Then** a Settings gear icon is visible in a fixed corner, 44×44 minimum tap target, using the same `SettingsButton` component and `accessibilityLabel="Settings"` treatment as the existing Home instance (FR43, UX-DR26)

**Given** the active-session screen's gear icon
**When** the user taps it
**Then** Settings opens (pushed on top of the current screen); the session in progress is not ended, reset, or otherwise completed by the navigation itself (FR43)

**Given** Settings is open, reached from an active session
**When** the user navigates back
**Then** the active-session screen is restored exactly as left — same streak, same target, same state — unless a setting changed while Settings was open caused a completion per Story 5.2, in which case the Completion screen shows instead, matching Story 5.2's existing behavior (FR43, FR37)

**Given** the segment detail screen
**When** it renders
**Then** it also shows the Settings gear icon, same component, same placement convention (FR43, UX-DR26)

**Given** an interrupted session (backgrounded or killed, not yet resumed/discarded)
**When** the app relaunches and shows the resume/discard prompt
**Then** the user can still navigate to Settings directly rather than acting on the prompt first, since Home already carries the gear icon — verified end-to-end together with Story 5.2's interrupted-session completion path (FR43, FR24, FR37)
