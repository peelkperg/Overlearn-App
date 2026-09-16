---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete, step-e-01-discovery, step-e-02-review, step-e-03-edit, step-v-01-through-13-validation, step-e-01-discovery-2, step-e-02-review-2, step-e-03-edit-2, step-e-01-discovery-3, step-e-02-review-3, step-e-03-edit-3, step-e-01-discovery-4, step-e-02-review-4, step-e-03-edit-4]
validationReports:
  - _bmad-output/planning-artifacts/validation-report-2026-09-06.md
releaseMode: phased
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-Overlearn.md
  - _bmad-output/planning-artifacts/product-brief-Overlearn-distillate.md
  - docs/original-requirements.md
workflowType: 'prd'
classification:
  projectType: mobile_app
  domain: general
  complexity: low
  projectContext: greenfield
lastEdited: '2026-09-14'
editHistory:
  - date: '2026-09-14'
    changes: >-
      Added web as a platform target (extended the Platform line under
      Technical Architecture Considerations): an installable PWA hosted
      free on GitHub Pages, added to reach the users iOS's on-hold status
      currently excludes -- not a replacement for iOS, a stopgap for it.
      Added a Web Platform Availability addendum after NFR8/9 documenting
      the web build's weaker storage durability (no OS sandbox, no backup
      mechanism -- lost on cleared browser data, private mode, or a
      browser/profile switch) while NFR8/9's own text is unchanged. Added
      NFR10 (offline-after-first-load, installable). Specified first
      through a separate bmad-spec/bmad-architecture chain
      (`_bmad-output/specs/spec-web-platform-support/SPEC.md` +
      `ARCHITECTURE-SPINE.md`) rather than this project's usual
      PRD-first path, then folded back here per the established
      PRD-first-source-of-truth convention before epics.md extraction.
  - date: '2026-09-12'
    changes: >-
      Amended FR41 following Story 4.6's code review: the one-decimal
      Solidification % display clamps a true value strictly between 0 and
      100 to [0.1%, 99.9%], reserving the exact boundary strings for the
      true mathematical boundary only. This shipped as an implementation
      default (formatRowSolidification) before being specified here -
      resolved in favor of keeping the clamp, consistent with FR38's
      whole-number precedent, rather than a literal unclamped
      one-decimal reading.
  - date: '2026-09-12'
    changes: >-
      Added FR43: manual UAT of UAT-38 through UAT-41 (2026-09-12) found the
      active-session screen (src/app/session/[id].tsx) has no navigation
      control at all - no way to reach Settings or even Home while a session
      is in progress or interrupted, only Correct/Incorrect/Restart. FR37
      and FR39 both assume a user can "navigate to Settings" mid-session;
      nothing in the PRD or ux-design-specification.md specified how. FR43
      requires Settings be reachable from every screen, session state left
      untouched by the navigation. Considered and rejected a narrower
      "back-to-Home" affordance in favor of direct Settings access from any
      screen, per user decision. ux-design-specification.md and
      architecture.md still need the actual control design (placement,
      icon) before implementation; this PRD edit specifies the requirement
      only.
  - date: '2026-09-12'
    changes: >-
      Added FR41 and FR42 during v1.1 UAT: manual testing of UAT-32 through
      UAT-37 found the segment list row showed only the name, with no way to
      see a segment's creation date, last-practiced date, or Solidification %
      without opening it, and that flipping sort direction required
      re-selecting the already-active sort option from the menu rather than a
      dedicated control. FR41 adds the three data points to each list row.
      FR42 requires a dedicated, independently-operable sort-direction toggle
      next to the Sort control; its exact visual form is deferred to
      ux-design-specification.md, consistent with how FR33/FR34 were
      written. Neither FR changes FR33's sort criteria or FR38's history-log
      display; FR41's list-row Solidification % reuses FR33's aggregate
      definition and FR38's em-dash-for-no-data convention.
  - date: '2026-09-11'
    changes: >-
      Code review of Story 5.2 surfaced that FR37's implementation (a
      settings change reconciling an in-progress session's completion, not
      just its displayed target) was undocumented and directly contradicted
      the Mechanic Specification's monotonicity sentence. Amended the
      monotonicity sentence to hold within a fixed OVERLEARNING_LEVEL only;
      added a Settings-driven completion transition to the Mechanic
      Specification; clarified FR37 to state the completion consequence;
      annotated FR22 (lockout reachable without a tap) and FR24 (relaunch
      may show a completion summary directly if a settings change completed
      the session while interrupted). No requirement numbers added or
      removed — all changes clarify FR22/FR24/FR37's existing scope.
  - date: '2026-09-06'
    changes: >-
      Added FR30-FR34 (segment rename with live-name propagation, duplicate,
      list sorting incl. Solidification %) and FR35-FR37 (Settings screen,
      configurable OVERLEARNING_LEVEL 50-300% in 10% steps, applies live to
      in-progress sessions), all scoped as v1.1 and marked as such per-FR.
      Pulled the overlearning-% Settings screen forward from Growth Features
      (Phase 2) into v1.1, with an expanded free-range design replacing the
      originally-scoped 50%/100% toggle. Added a v1.1 Product Scope section;
      MVP section left describing shipped v1.0 (FR1-FR29) only. Updated the
      Mechanic Specification's Constants section to distinguish v1.0's fixed
      0.5 from v1.1's configurable value, extended Journey 5, and updated the
      Journey Requirements Summary. Also corrected FR15 (v1.0): Repeat writes
      the just-completed session's history entry, matching the bug fix
      shipped 2026-09-06.
  - date: '2026-09-06'
    changes: >-
      Second edit cycle, driven by validation-report-2026-09-06.md (overall
      status WARNING, holistic quality 4/5). Addressed all three PRD
      findings: (1) annotated the two decisions the PRD still presented as
      open - platform choice (resolved to React Native / Expo SDK 57) and
      NFR2's async-write premise (resolved to synchronous MMKV writes) -
      keeping the original text and appending the resolution rather than
      rewriting the record; (2) closed FR31's open-ended display-site list
      into an exhaustive five-site enumeration, so its acceptance criteria
      are derivable from the FR alone; (3) added a Repeat branch to Journey
      1's resolution, giving FR15 the journey coverage whose absence
      produced the shipped history-entry defect. Upstream supersession
      notes added to product-brief-Overlearn.md and its distillate so they
      no longer contradict FR35-FR37 on the overlearning-% setting.
  - date: '2026-09-06'
    changes: >-
      Added FR38 and FR39, resolving the two open questions the v1.1 UX
      design review logged rather than silently deciding. FR38: the
      segment's Solidification % (as defined in FR33) is now displayed at
      the top of its history log, so the value it can be sorted by is
      also visible somewhere. FR39: the Settings screen shows a standing
      notice - not a per-tap confirmation - when an in-progress session
      exists, since FR37 makes the change apply to it immediately.
  - date: '2026-09-06'
    changes: >-
      Added FR40 during epics-and-stories requirements extraction: a
      second rename entry point, alongside FR30's dedicated screen -
      press-and-hold a segment's name for 1 second at the list row or
      detail heading to edit it in place, submit via the keyboard's
      return action. Confirmed with the user that both rename paths
      coexist (neither replaces the other), and that inline editing
      applies only at those two sites, not at the three read-only name
      displays (active session, completion, resume/discard). FR36 was
      considered for a change to a fixed 12-value list but reverted to
      its already-committed form (50-300% in 10% steps) at the user's
      request - no change made there.
---

# Product Requirements Document - Overlearn

**Author:** Gerardo
**Date:** 2026-08-30

> **Versioning note (2026-09-16):** this document's epic/release labels (v1.0, v1.1, v1.1.1) are internal roadmap milestones and do not map 1:1 to the public Google Play store version. The store's v1.0.0 (git tag `v1.0.0`, commit `518cc8e`) = Epics 1-5 only, bundled as a single first public release. Epic 6 (v1.1.1, web platform support) shipped after that tag and is not in the store build. See `backlog.md`'s "Publish v1.0 to Google Play" entry for the full reconciliation.

## Executive Summary

Overlearn is a mobile-first, offline-only app for musicians who need a technical fix to hold under performance pressure, not just in the practice room. Musicians typically stop practicing a corrected passage as soon as it "feels" right, but every incorrect attempt reinforces the wrong muscle memory just as strongly as a correct one reinforces the right one — so a fix built on feel, not count, stays fragile. Overlearn replaces feel with a rule: a session starts immediately with a minimum bar of 5 consecutive correct repetitions; any mistake resets the streak to zero and raises the bar in real time (to 50% of total mistakes made that session) if the passage proves harder than the minimum assumed. Reaching the (possibly-raised) target is the only way a session completes. Initial users are musicians generally, with classical guitarists as the beachhead.

### What Makes This Special

No reviewed competitor enforces a hard, within-session, consecutive-correct-streak-with-reset — adjacent tools schedule practice across days (spaced repetition) or track time/tempo, not correctness density within a session. The core insight is that reinforcement must be counted, not felt, to outlast the mistake it's correcting. The product is deliberately narrow: no motivation mechanics, no gamification, no AI judgment of correctness — built for musicians who already know what they want from practice time and need a rule to hold them to it, not a nudge to practice.

## Project Classification

- **Project Type:** mobile_app (iOS/Android, offline-first)
- **Domain:** general
- **Complexity:** low
- **Project Context:** greenfield

## Success Criteria

### User Success

A user knows a session succeeded when they hit the calculated target streak — the app enforces this as the only completion condition, so there's no ambiguity to negotiate. The deeper success signal is qualitative and happens *outside* the app: a previously-shaky passage holds up in a later performance or lesson, without the mistake resurfacing. Overlearn doesn't try to detect or measure that (no telemetry) — it's a self-assessed outcome, consistent with the product's "for musicians who already know what they want" positioning.

### Business Success

No business model or commercial success metric is defined at this stage — the product has no accounts, no monetization, no telemetry, and positioning/GTM is explicitly deferred to a later discussion. Success at this stage is validated outside standard business metrics (see Measurable Outcomes).

### Technical Success

Deterministic, 100%-unit-tested target-streak calculation and streak-reset logic (see Mechanic Specification and FR9–FR12), including explicit coverage of the `total_incorrect_this_session` = 10 / 11 recalculation boundary. Interruption-safety and privacy guarantees are specified as NFR3–NFR5 and NFR8–NFR9 rather than restated here.

### Measurable Outcomes

- **Now:** personal use validation — does a fixed passage measurably stop recurring in the developer's own practice after completing an Overlearn session on it.
- **Post-release:** App Store / Play Store ratings and reviews, as the first external signal (no in-app metrics exist to measure this otherwise).

## Product Scope

### Strategy & Philosophy

**Approach:** Problem-solving MVP — the minimum that proves the core hypothesis (a live-recalculating, reset-on-miss consecutive-correct-streak mechanic actually helps consolidate a fix) works in real practice. No feature is included to attract users or validate a business model — there is no business model yet by design.

**Resource Requirements:** Solo developer project (no external team assumed, per the personal-use-validation success criteria above).

### MVP — Minimum Viable Product (Phase 1)

**Core User Journeys Supported:** All five documented journeys — happy-path session, interruption/resume, no-undo mistake handling, Restart, and segment/history management. All five are necessary: the mechanic doesn't function as "proof, not feeling" without every one of them.

**Must-Have Capabilities:** Segment CRUD; immediate-start session with live target computation (floor 5, 50% recalculation, no per-session confirmation); Correct/Incorrect/Restart three-control active session (Restart confirm-gated); interruption persistence with resume/discard; session completion (Done/Repeat); per-segment history log (completed sessions only, with mistake counts). Full capability contract in Functional Requirements below.

**Status:** shipped and UAT-passed as v1.0.0 (FR1–FR29). Frozen at git tag `v1.0.0`; the v1.0 spec as-shipped is recoverable via `git show v1.0.0:_bmad-output/planning-artifacts/prd.md`.

### v1.1 — Segment Organization & Configurable Target (added 2026-09-06)

Scoped after v1.0 shipped; **not** part of the v1.0 MVP. Four independent capabilities:

- **Segment rename** (FR30, FR31) — with the renamed name reflected everywhere it is displayed, including past history entries and any in-progress session.
- **Segment duplicate** (FR32) — disambiguated name, no copied history.
- **Segment list sorting** (FR33, FR34) — by name, creation date, last-practiced date, or Solidification %; selection persisted across launches. A dedicated direction toggle (FR42) flips ascending/descending independent of re-selecting the sort key.
- **Segment list row summary data** (FR41) — creation date, last-practice date, and Solidification % shown inline per row.
- **Settings screen with a configurable overlearning-%** (FR35–FR37) — 50–300% in 10% increments, applied live to in-progress sessions.

### Growth Features (Phase 2, Post-MVP)

Voice-command Correct/Incorrect input (user-selectable words) — the planned fix for hands-occupied interaction friction identified during review.

**Scope note (2026-09-06):** the overlearning-% Settings screen, originally scoped here as a fixed 50%/100% toggle, was pulled forward into **v1.1** (not v1.0) with an expanded design — a free 50–300% range in 10% increments, not just two fixed modes. See the v1.1 section above, the Mechanic Specification's Constants section, and FR35–FR37.

### Vision (Phase 3, Expansion)

Metronome, tuner, practice time tracking, audio-based automatic correctness detection, gamification, AI integration, analytics — all explicitly undesigned, named only as long-range backlog.

### Risk Mitigation Strategy

**Technical Risks:** The riskiest assumption is the async-write/<100ms-render split needed for interruption-safe persistence without blocking tap latency — flagged for the architecture stage, not yet resolved. Mitigation: treat it as an explicit architecture decision with a stated tradeoff, not an implementation afterthought.

**Market Risks:** None tracked at this stage — positioning/GTM is out of scope. The real risk here is validation risk (does the mechanic work at all), covered by the personal-use-validation gate before anything else proceeds.

**Resource Risks:** Solo-developer risk is scope creep into Phase 2/3 features before Phase 1 is validated. Mitigation: the explicit backlog exists precisely so those ideas have a documented home and don't get pulled forward prematurely.

## User Journeys

**Persona:** Mara, a classical guitarist preparing a recital piece. She's hit a recurring slip in a right-hand arpeggio pattern at bar 24 — it's tripped her up in three straight run-throughs, and she doesn't trust it to hold under stage pressure.

### Journey 1 — Primary User, Happy Path: Fixing a Passage

**Opening:** Mara isolates bar 24. In the old routine, she'd play it right twice and move on — and secretly know it's not really solid.

**Rising action:** She opens Overlearn, creates a segment "Bar 24 arpeggio," and taps Start. No input screen, no confirmation — the session begins immediately with a target of 5 in a row.

**Climax:** She plays: Incorrect (streak 0, total mistakes 1, target still 5 — the floor holds). Incorrect (total 2, target still 5). Correct (streak 1). Incorrect (streak resets to 0, total 3, target still 5). Correct, Correct (streak 2). Incorrect (streak 0, total 4, target still 5). Correct, Correct, Correct, Correct, Correct (streak 5) — target reached.

**Resolution:** Session complete. Completion screen shows the segment name, final target achieved (5), and total attempts this session: 8 correct + 4 incorrect = 12. She taps Done — this writes a history entry (only a *completed* session writes one). Notably, the target never rose above the floor — it takes more than 10 total mistakes in a session before 50% of that pushes the bar past 5.

**Alternate branch — she wants another round:** Had Mara tapped **Repeat** instead of Done, the outcome for the record is identical: the session she just completed is written to history first, then a fresh session starts immediately at 0/5 for the same segment. Reaching the target is what earns a history entry; which button she presses afterward only decides whether she practices again or returns to the list. A completed session is never lost by choosing to keep going.

**Capabilities revealed:** segment creation; immediate session start (no input/confirmation step); floor-of-5 starting target; two-way tap loop; streak reset + live target recalculation on miss; completion screen showing final target and attempt totals; Done writes the history entry and exits; Repeat writes the same history entry and immediately restarts.

### Journey 2 — Primary User, Edge Case: Interrupted Session

**Opening:** Mara is mid-session on "Bar 24 arpeggio" — streak 3, total mistakes 2, target still 5 — when a phone call interrupts her and she backgrounds the app.

**Rising action:** Ten minutes later she reopens Overlearn. The app detects the unfinished session and asks: resume or discard?

**Climax:** She resumes — streak, target, and total-mistakes-this-session are exactly as she left them. She finishes the remaining reps and completes the session normally.

**Alternate branch — she never comes back:** If Mara had instead ignored the resume/discard prompt indefinitely, or chosen discard, no history entry is ever written for that attempt — only a session that reaches Done writes a record. The passage would appear untouched in her history log, even though she practiced it that day.

**Capabilities revealed:** full session-state persistence (segment, current streak, live target, total mistakes, timestamp); resume/discard prompt on relaunch; state restoration into the exact same active-session UI; abandoned/discarded sessions never reach the history log.

### Journey 3 — Primary User, Edge Case: The No-Undo Mistake

**Opening:** Mara is at streak 4, target still 5, fatigued near the end of practice. She plays the rep correctly but her thumb slips on the *tap* — she hits Incorrect by accident.

**Rising action:** The streak resets to 0 instantly, and the session's total-mistakes count ticks up — which could eventually raise the target if it happens enough. There is no undo for the individual tap.

**Climax:** She's frustrated for a second, then restarts the streak from zero, more deliberate about her taps.

**Resolution:** She eventually re-reaches target. The friction was real but by design — undo would let the streak be gamed instead of forcing genuine attention. This journey confirms the team accepts that cost, not that it should be designed around.

**Capabilities revealed:** hard reset-to-zero with zero per-tap recovery path; deliberately no confirmation/undo affordance on Correct/Incorrect specifically (contrast with Restart, which does get a confirm — see Journey 4).

### Journey 4 — Primary User: Restarting a Session

**Opening:** Mara starts a session on a new segment but immediately realizes she picked the wrong tempo to test at — the first several attempts don't represent real practice, and she doesn't want them counted toward the target calculation.

**Rising action:** Instead of playing through bad data, she taps **Restart**. Because Restart is a different category of action from the no-confirm Correct/Incorrect pair, it asks her to confirm: "Restart session? Progress will be lost."

**Climax:** She confirms. Streak, total mistakes, target, *and* the session's start time all snap back to the starting state (0, 0, floor of 5, now) — a genuinely clean slate, in-session only, not a partial reset that leaves stale mistake data behind.

**Resolution:** She begins again at the correct tempo. Nothing about the false start appears in the segment's history log — no completed or partial session was recorded. Restart is scoped to correcting an early false start, not to escaping a target that's already climbed late in a legitimate session — the confirm step exists partly to make that distinction felt, not just to prevent misclicks.

**Capabilities revealed:** Restart as a distinct, confirm-gated control; full in-progress-session reset (streak, total mistakes, target, and start timestamp — all four, not a subset) without touching history; no history record created for a restarted attempt.

### Journey 5 — Primary User: Segment Management & History Review

**Opening:** A month into using Overlearn, Mara has 6 segments — some resolved, some abandoned mid-piece for a different recital. This journey is where the app's entire value proposition gets checked: Overlearn never automates "is this fixed for good," so the history log is the only place that question gets answered at all.

**Rising action:** She opens "Bar 24 arpeggio," one of the resolved ones, to check its history before a lesson.

**Climax:** The history log shows every *completed* session for that segment (never abandoned or restarted attempts): date, final target streak achieved, total mistakes that session, and total attempts — a simple list, no charts. Because each entry shows mistakes alongside the target, she can tell "target 5" from a light session and "target 7" from a rough one, instead of a bare number she can't interpret.

**Resolution:** She sees the passage has been solidified 3 separate times across different practice weeks, with the target climbing on the roughest day — real signal about whether this passage is actually settling, not just a receipt. The app doesn't tell her whether to re-practice it before the recital; it gives her the honest record to decide for herself.

**Capabilities revealed:** multiple concurrent segments; delete action; per-segment history log (date, final target achieved, total mistakes, total attempts) as a plain list, completed-sessions-only.

**Extension (v1.1, added 2026-09-06 — not part of shipped v1.0):** With 6 segments, Mara also renames one whose focus shifted ("Bar 24 arpeggio" → "Bar 24-26 run"), and its history keeps making sense afterward — every past entry and any session in progress shows the new name, not a frozen snapshot of the old one. She duplicates another to isolate a slower-tempo variant as its own tracked segment, starting with a clean history rather than inheriting the original's. With more segments than fit her attention at once, she sorts the list by Solidification % (all-time correct ÷ total attempts per segment) to see which passages are least reliable right now, instead of scanning by memory.

**Capabilities revealed (extension, v1.1):** rename with live propagation to history and any in-progress session; duplicate with a disambiguated name and no copied history; list sorting by name, creation date, last-practiced date, or Solidification %, remembered across app launches.

### Journey Requirements Summary

Together these five journeys cover every functional area in the Functional Requirements below: segment management and navigation (FR1–FR7), immediate session start with live target computation (FR8–FR12), the three-control active-session loop with reset-on-miss and Restart's confirm-gated full reset (FR16–FR22), interruption persistence with resume/discard (FR23–FR26), session completion with Done/Repeat (FR13–FR15), and the per-segment history log restricted to completed sessions and carrying mistake counts for legibility (FR27–FR29). FR1–FR29 are v1.0, shipped. Journey 5's v1.1 extension covers segment rename, duplicate, and list sorting (FR30–FR34, FR38, FR40 — FR40 is a second rename entry point alongside FR30, and FR38 displays what FR33 introduced as a sort-only value); the v1.1 Settings screen and configurable overlearning-% (FR35–FR37, FR39) is a global preference rather than a step within any single journey — it changes how FR9/FR10's target calculation behaves across all of them. No additional user types (admin, support, API) apply to this single-user offline app.

## Mobile App Specific Requirements

### Project-Type Overview

Overlearn is a single-user, fully offline mobile app with no backend, no accounts, and no data leaving the device. This significantly narrows its platform surface area compared to a typical connected mobile app.

### Technical Architecture Considerations

- **Platform:** iOS and Android, cross-platform framework (React Native or Flutter) — undecided, left to the architecture stage since both are equally capable here. **(Resolved 2026-08-31 — see `architecture.md`: React Native via Expo SDK 57, chosen for existing familiarity and managed-workflow maintenance cost. Only Android has been built and verified to date; iOS is on hold — see `backlog.md`.)** **(Extended 2026-09-14: a web build (installable PWA, hosted free on GitHub Pages) added as a platform to reach the users iOS's on-hold status currently excludes — not a replacement for iOS, a stopgap for it. Full technical detail in `_bmad-output/specs/spec-web-platform-support/SPEC.md` and its `ARCHITECTURE-SPINE.md` companion, not restated here.)**
- **Offline mode:** Required and total — the entire app must function with no network connectivity, at all times, not as a degraded fallback mode.
- **Device permissions:** None required. No camera, microphone, location, contacts, or notification permissions requested.
- **Push notifications:** Explicitly excluded — no notification infrastructure needed.

### Store Compliance

No in-app purchases, ads, accounts, or data collection — the app should qualify for the simplest privacy-disclosure tier on both App Store (no data collected) and Play Store (no data shared/collected). No age-rating or content-review complexity expected beyond standard baseline review.

### Implementation Considerations

Local persistence (segment + session state, history log) must survive app kill/background per NFR3, and writes must not block the <100ms tap-to-UI-update budget (NFR1–NFR2) — per the party-mode architecture review, this implies async/queued disk writes rather than synchronous persist-then-render (flagged for the architecture stage, not decided here).

**(Resolved 2026-08-31 — see `architecture.md` → Core Architectural Decisions. The async/queued-write assumption above did not survive contact with the architecture: MMKV writes complete in microseconds via JSI, so session state is written **synchronously** on every tap and the latency budget still holds. The PRD's "riskiest assumption" was retired by removing the async queue entirely rather than by engineering around it. The constraint in NFR1–NFR2 is unchanged and still met; only the anticipated mechanism differs.)**

## Mechanic Specification

This section is the authoritative definition of the target-streak mechanic. Functional requirements below cite it rather than restating it. It supersedes any earlier description, including `docs/original-requirements.md`, which is archived historical input.

### Session State

| Field | Type | Description |
|---|---|---|
| `segment_name` | string | The segment this session belongs to |
| `current_streak` | int | Consecutive correct repetitions since the last miss or reset |
| `total_incorrect_this_session` | int | Cumulative incorrect repetitions this session; never decreases except on Restart |
| `target_streak` | int | Consecutive correct repetitions required to complete the session |
| `session_complete` | bool | Whether the target has been met |
| `session_start_timestamp` | ISO8601 | When the session (or its most recent Restart) began |
| `completed_target` | int \| null | **(v1.1, added by Story 5.1's code review, documented 2026-09-12 following Story 5.2 round 2)** The streak actually achieved at the moment `session_complete` flipped `true`; `null` while incomplete. Anchors the Completion screen and history entry to what was met at completion time, immune to a later settings change before Done is tapped. See the Settings-driven completion transition below for how this can exceed a since-lowered `target_streak`. |

### Constants

- `TARGET_FLOOR` = **5** — the minimum possible target, never undercut. Fixed, not user-configurable, in every version.
- `OVERLEARNING_LEVEL` — **v1.0:** a fixed global constant of **0.5** (50%), not user-configurable. **v1.1 (FR35–FR37):** user-configurable, default **0.5**, valid range 0.5–3.0 (50%–300%) in 0.1 (10%) increments, set via the Settings screen. A change applies immediately to `target_streak`'s next recalculation, including for a session already in progress — from v1.1 the formula below always reads the current value, never a value captured at session start.

### Target Calculation

```
target_streak = max(TARGET_FLOOR, ceil(total_incorrect_this_session * OVERLEARNING_LEVEL))
```

Evaluated at session start and re-evaluated after every increment of `total_incorrect_this_session`, and (v1.1) after every change to `OVERLEARNING_LEVEL` — the formula always reads the current value of both inputs, never one captured earlier in the session (corrected 2026-09-12, code review of Story 5.2 round 2).

**Boundary behavior.** At the default `OVERLEARNING_LEVEL` = 0.5, the floor governs until `total_incorrect_this_session` **exceeds 10**. The first observable increase is at 11 (a higher configured `OVERLEARNING_LEVEL` shifts this boundary earlier — e.g. at 1.0, it shifts to `total_incorrect_this_session` = 6):

| `total_incorrect_this_session` | `target_streak` |
|---|---|
| 0–9 | 5 (floor) |
| 10 | 5 (formula yields 5; ties the floor) |
| 11 | 6 (first raise) |
| 12 | 6 |
| 13 | 7 |

The comparison is `> 10`, not `>= 10`. `target_streak` is monotonically non-decreasing **within a fixed `OVERLEARNING_LEVEL`** — it rises or holds, never falls, except via Restart. It can also change — including falling — via an explicit `OVERLEARNING_LEVEL` change (v1.1, FR37); see the Constants section above and the Settings-driven completion transition below. [Review][Patch] found via code review 2026-09-11: this sentence predated FR37 and was never reconciled with it — see epics.md's Story 5.2 review findings.

### Transitions

- **Correct:** `current_streak += 1`. If `current_streak >= target_streak`, the session completes, capturing `completed_target = current_streak` at that instant. **(Corrected 2026-09-12, code review of Story 5.2 round 3):** this previously read `completed_target = target_streak`; a tap-driven completion always lands with `current_streak === target_streak` exactly, so the two values coincided until the Correct transition began delegating its completion check to the shared rule below (round 2, Decision 1) — the shared rule always records `current_streak`, which is also what history must show for a session that overshoots its target after a settings decrease (see the Settings-driven completion transition).
- **Incorrect:** `total_incorrect_this_session += 1` first, then reconcile completion against the recalculated `target_streak` (see the shared completion rule below), then `current_streak = 0` only if the session did not just complete. **(Corrected 2026-09-12, code review of Story 5.2 round 3):** this previously listed `current_streak = 0` before the increment. From v1.1, an Incorrect tap can itself surface a settings-driven completion left un-reconciled by a failed write (see Story 5.2's code review) — counting the miss before checking completion means that tap is never silently dropped from the mistake count merely because it also happened to complete the session, and lets a miss that raises `target_streak` past `current_streak` correctly withhold a completion it would otherwise have granted.
- **Restart:** `current_streak = 0`, `total_incorrect_this_session = 0`, `target_streak = TARGET_FLOOR`, `session_start_timestamp` = now. All four fields, not a subset.
- **The completion rule (shared by Correct, Incorrect, and the Settings-driven transition below):** if the (possibly just-recalculated) `target_streak` is met or exceeded by `current_streak`, the session completes: `session_complete = true`, capturing `completed_target = current_streak` — the achieved streak, not `target_streak` — so history never understates a run that exceeded the target it was originally being measured against. Given the guard that only fires this rule when `current_streak >= target_streak`, `current_streak` and `max(target_streak, current_streak)` are always the same value; the spec and the implementation both state it as `current_streak` directly rather than as a `max()` that cannot evaluate to anything else. **(Corrected 2026-09-12, code review of Story 5.2 round 2 then round 3):** round 2 recorded this as `completed_target = max(target_streak, current_streak)` and gave Correct and Incorrect their own separate completion checks; round 3 unifies all three transitions on this one rule, matching `lib/session-transitions.ts`'s `reconcileCompletion`.
- **Settings-driven completion (v1.1, FR37):** an `OVERLEARNING_LEVEL` change alone, with no Correct/Incorrect tap, re-evaluates `target_streak` for every in-progress session; if the newly-recalculated `target_streak` is now met or exceeded by the session's existing `current_streak`, the session completes per the shared completion rule above. This is a real completion path, not merely a display update: it sets `session_complete = true` and is subject to the same FR22 lockout as any other completion. (added 2026-09-11, code review of Story 5.2 — Task 3's reconciliation effect is this transition's implementation.)

## Functional Requirements

### Segment Management

- FR1: User can create a named practice segment
- FR2: User can view a list of their segments
- FR3: User can select a segment to practice or to review its history
- FR4: User can maintain segments simultaneously with no enforced limit on their number, each with independent state
- FR5: **REMOVED** — was "User can archive a segment." Cut post-implementation (2026-09-02) to optimize data storage: the feature had no way to view or restore an archived segment, making it a one-way hide. ID retained, not reassigned.
- FR6: User can delete a segment
- FR7: User is presented with a means to create a first segment when none exist
- FR30: **(v1.1)** User can rename an existing segment (added 2026-09-06)
- FR31: **(v1.1)** System reflects a segment rename in every place its name is displayed, rather than freezing the name at the time each record was created. The complete set of display sites: (a) the segment list row, (b) the segment detail screen heading, (c) the active-session streak readout, (d) the session completion summary, and (e) the resume/discard prompt for an interrupted session. History entries display the segment's current name because no history record stores a name of its own. (added 2026-09-06; enumeration closed 2026-09-06 following PRD validation)
- FR32: **(v1.1)** User can duplicate an existing segment; the copy gets a disambiguated name (same collision rule as FR1's creation), a fresh identity, and no copied history (added 2026-09-06)
- FR33: **(v1.1)** User can sort the segment list by name, creation date, most recent practice date, or Solidification %, where Solidification % = (sum of correct repetitions across every completed session for that segment) ÷ (sum of total repetitions across those same sessions) — one aggregate ratio per segment, not an average of per-session percentages; a segment with no completed sessions is treated as 0% / oldest-possible-date for sorting purposes regardless of sort direction (added 2026-09-06)
- FR34: **(v1.1)** System persists the user's selected sort option and direction across app relaunches (added 2026-09-06)
- FR40: **(v1.1)** User can rename a segment by pressing and holding its name for 1 second at the segment list row or the segment detail heading, which turns the name into an editable field in place; submitting via the keyboard's return/enter action saves the new name. This is an additional rename entry point alongside FR30's dedicated Rename screen — both exist; neither replaces the other. Applies only at these two sites, not at the active-session readout, completion summary, or resume/discard prompt, which remain read-only displays of the current name (per FR31). Uses the same name validation and disambiguation rule as FR30. (added 2026-09-06)
- FR41: **(v1.1)** Each segment list row displays the segment's creation date, most recent practice date ("Last practice: dd Mmm yyyy"; an empty-state wording applies if the segment has never been practiced), and Solidification % (one decimal place, e.g. "42.3%"). Solidification % uses FR33's aggregate definition and FR38's em-dash-for-no-completed-sessions convention — never "0.0%" for a segment with no completed sessions. A true value strictly between 0 and 100 is clamped to the range [0.1%, 99.9%] for display — the boundary strings "100.0%" and "0.0%" are reserved for the true mathematical boundary only, the same reserve-the-boundary principle FR38's whole-number display already applies, scaled to one decimal place. (added 2026-09-12, following manual UAT of UAT-32–UAT-37; clamp rule specified 2026-09-12 following Story 4.6's code review, resolving what had shipped as an implementation default with no PRD backing)
- FR42: **(v1.1)** User can flip the segment list's sort direction via a dedicated toggle control next to the Sort control, independent of re-selecting the currently-active sort option. Operates on whichever sort key is active per FR33 and persists per FR34; does not change FR33's per-key default direction on first selection. Exact visual/interaction form is a UX-design decision, not fixed by this requirement. (added 2026-09-12, following manual UAT of UAT-35)

### Practice Session Lifecycle

- FR8: User can start a practice session for a segment with no upfront input required
- FR9: System establishes the initial correct-streak target per the Mechanic Specification before any repetition is logged
- FR10: System recalculates the required correct-streak target per the Mechanic Specification whenever a repetition is logged as incorrect
- FR11: System never lets the required correct-streak target fall below `TARGET_FLOOR`
- FR12: System completes a session automatically once the current correct-streak target is met
- FR13: User can view a session-completion summary showing the segment, the streak achieved when the session completed (`completed_target` — from v1.1 this can exceed the target in force at completion time; see the Settings-driven completion transition and its "record the achieved streak" decision, code review of Story 5.2), total mistakes, and total attempts for that session
- FR14: User can end a completed session (Done), which writes a history entry
- FR15: User can immediately begin a new session for the same segment (Repeat). The just-completed session's history entry is written first, exactly as Done does per FR14 — reaching completion is what earns a history entry, not which of the two buttons is pressed afterward. (Corrected 2026-09-06: shipped v1.0 code discarded that entry on Repeat, recorded as a bug and fixed; FR29's exclusion covers *abandoned or reset* sessions, never a completed one.)

### Active Session Interaction

- FR16: User can log a repetition as correct
- FR17: User can log a repetition as incorrect
- FR18: System applies the Correct and Incorrect state transitions defined in the Mechanic Specification
- FR19: User cannot undo an individual correct/incorrect log entry (constraint on FR16–FR17, not a standalone capability)
- FR20: User can reset an in-progress session, returning all four session fields to their starting values per the Mechanic Specification. **(Annotated 2026-09-12, code review of Story 5.2 round 2):** from v1.1, Restart also stops being available without any Restart tap, the moment the Settings-driven completion transition (FR37) fires — FR22's lockout applies to Restart the same as it does to Correct/Incorrect.
- FR21: System requires user confirmation before executing a session reset — moot once FR22's lockout has already disabled Restart via a settings-driven completion (see FR20's annotation)
- FR22: System stops accepting repetition input once session completion has triggered — reachable either by a Correct tap or, from v1.1, by the Settings-driven completion transition (FR37) with no tap at all
- FR43: **(v1.1)** User can access the Settings screen from any screen in the app, including the active-session screen while a session is in progress or interrupted, via a consistently-placed control. Navigating to Settings this way does not end, reset, or otherwise mutate the session in progress — it remains exactly as left, resumable the same way FR25 already describes. This closes the gap FR37 and FR39 assume (a change applying live, or being warned about, requires actually being able to reach Settings mid-session), found unreachable during manual UAT of UAT-38–UAT-41 (2026-09-12): the shipped active-session screen exposed only Correct/Incorrect/Restart, with no path to Settings or Home at all. (added 2026-09-12)

### Session Interruption & Recovery

- FR23: System preserves an in-progress session's full state if the app is backgrounded or closed
- FR24: User is prompted to resume or discard an interrupted session on relaunch — unless the Settings-driven completion transition (FR37) has already completed it (e.g. the overlearning-% was lowered while the session sat interrupted), in which case relaunch shows its completion summary directly, matching the existing behavior for a session that completed normally before being interrupted
- FR25: User can resume an interrupted session with all prior progress intact
- FR26: User can discard an interrupted session, leaving no history record

### Practice History

- FR27: User can view a chronological list of completed sessions for a segment
- FR28: Each history entry displays the date, the streak achieved when the session completed (`completed_target`, per FR13's annotation), total mistakes for that session, and total attempts
- FR29: System excludes non-completed sessions (abandoned or reset) from the history log
- FR38: **(v1.1)** User can view the segment's Solidification % (as defined in FR33) at the top of its history log, so the value it can be sorted by is also visible somewhere. Recomputed from the same completed-session data as FR33's sort; a segment with no completed sessions shows an em dash ("—"), not "0%" — the sort control's internal 0%-as-comparison-value is never read by the user directly, but on this summary line "0%" would misread as "scored zero" rather than "no data yet." (added 2026-09-06; em-dash wording corrected 2026-09-08 — [Review][Decision] found via Story 4.3's code review, this FR previously said "0%," contradicting architecture.md and ux-design-specification.md's reasoned em-dash decision — resolved in their favor.)

### Settings (v1.1, added 2026-09-06)

- FR35: **(v1.1)** User can access a Settings screen to configure the overlearning-% target used in the Mechanic Specification's `OVERLEARNING_LEVEL`
- FR36: **(v1.1)** System accepts any overlearning-% value from 50% to 300% in 10-percentage-point increments; no other value is selectable
- FR37: **(v1.1)** System applies a changed overlearning-% immediately to the target-streak calculation of a session already in progress, not only to sessions started after the change (supersedes any assumption that `target_streak` is fixed for a session's duration once started). If the recalculated target is now met or exceeded by the session's existing streak, the session completes immediately as a result of the setting change alone (see Mechanic Specification's Settings-driven completion transition) — this can end an in-progress session with no further user action, including from Home if the session is interrupted. (clarified 2026-09-11, code review of Story 5.2 — the original text covered only the displayed target number, not the completion consequence Story 5.2's implementation also produces.)
- FR39: **(v1.1)** When an in-progress session exists for any segment, the Settings screen warns the user that a change to the overlearning-% will apply to that session immediately (per FR37), before they change the value — not as a confirmation gate on every tap, but as a standing notice visible while the setting is open. (added 2026-09-06 — resolves the v1.1 design review's open question that a mid-session change had no warning designed) **(Annotated 2026-09-12, code review of Story 5.2 round 2):** if the change triggers FR37's completion consequence while the user is on the Settings screen, Home's existing redirect-to-active-session behavior then replaces Settings with the Completion screen mid-adjustment, with no back route to Settings and no way to undo the value just set. No separate UI is designed for this — it is a consequence of FR37 and the existing navigation model, not a new requirement.

## Non-Functional Requirements

### Performance

- NFR1: Correct/Incorrect/Restart tap must register and update the on-screen streak/target display within 100ms.
- NFR2: The NFR1 latency budget must hold even with a persistence write occurring on every tap (see NFR3) — rendering must not block on disk I/O. *(Architecturally resolved via synchronous MMKV writes — see `architecture.md`. The requirement was written assuming an asynchronous write would be necessary; sub-millisecond synchronous writes satisfy it without one.)*

### Reliability

- NFR3: Full in-progress session state — all state necessary to reconstruct the six fields in the Mechanic Specification (`target_streak` may be derived rather than stored directly, per architecture) — must survive app backgrounding or process kill, with no data loss beyond, at most, the single most recent tap if killed in the narrow window around a write in progress.
- NFR4: On relaunch with an interrupted session present, the user must always be prompted resume vs. discard — the app must never silently resume or silently discard. **(Amended 2026-09-12, code review of Story 5.2 round 2):** applies to a session still incomplete at relaunch. From v1.1, FR24's accepted exception means the Settings-driven completion transition (FR37) can complete a session before relaunch is reached — that is a completion, shown via the ordinary Completion screen, not a silent resume or discard of an interrupted session.
- NFR5: Completed-session history entries, once written, must be durable across app restarts, reinstalls-with-data-intact, and OS-level backgrounding — the only acceptable data loss is a full app uninstall or device loss (an explicitly accepted tradeoff of local-only storage).

### Accessibility

- NFR6: All interactive controls (Correct, Incorrect, Restart, and all navigation/management UI) must meet WCAG AA minimum touch target size (44×44pt).
- NFR7: The active-session screen must remain legible and operable with no reliance on color alone to distinguish Correct from Incorrect.

### Security & Privacy

- NFR8: Zero data leaves the device: no network calls, no analytics, no crash reporting, no usage tracking of any kind — verifiable by code inspection (no networking library/permission should be present in the shipped app at all, not just unused).
- NFR9: No account creation, authentication, or any form of user identification — the app must have zero concept of "a user" beyond the single local device installation.

**Web platform addendum (2026-09-14):** NFR8/9 hold identically on the web build — nothing about what leaves the device, or what accounts exist, changes. What differs is durability, not privacy: the web build's storage has no OS-level app sandbox and no backup mechanism, so data is lost if the user clears browser data, uses a private/incognito window, or switches browsers/profiles — a real platform-capability difference from native, not a relaxation of NFR8/9.

### Web Platform Availability

- NFR10 (added 2026-09-14): The web build must remain fully functional offline after the first successful load — installable as a standalone app (PWA), not merely a hosted page requiring constant connectivity — so it serves as a genuine alternative for the users the native iOS build currently excludes.
