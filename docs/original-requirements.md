# Overlearn — Original Agent Instructions Document

> Archived reference. This is the original requirements document that was previously embedded in `CLAUDE.md`, before it was split out on 2026-08-30. Preserved verbatim as raw input for the BMad planning workflow (PRD/architecture stages) — it is superseded going forward by `_bmad-output/planning-artifacts/product-brief-Overlearn.md` and the PRD/architecture docs that follow it, not by this file.

---

## 1. App Description (User-Facing)

**Overlearn** is a mobile-first tool for musicians who want to fix technical problems and make the fix stick permanently.

Most musicians practice a difficult passage by repeating it until they get it right a few times and then move on. The problem: every incorrect attempt reinforces the wrong muscle memory just as much as a correct attempt reinforces the right one. If you did 10 incorrect repetitions before finally getting it right, and then only did 5 correct ones, the wrong pathway is still stronger.

This app applies the neuroscience of **overlearning**: the correct neural pathway must be reinforced significantly more times than the incorrect one for the solution to become reliable under pressure.

**How it works:**

1. Pick the passage or measure you are working on.
2. Tell the app how many attempts it took before you played it correctly for the first time.
3. The app calculates your required number of correct repetitions in a row (50% or 100% overlearning target).
4. Practice. After each attempt, tap Correct or Incorrect.
5. If you make a mistake, the streak resets to zero — you start over.
6. When your streak reaches the target, the session is complete and the fix is solidified.

The "in a row" rule is the key mechanic. It creates the consequence that forces focus on every single repetition, eliminating mindless practice. It also ensures the correct neural pathway is reinforced many more times than the incorrect one.

---

## 2. Agent Instructions (superseded — see note below)

> Originally instructed an AI coding agent to treat Section 3 below as authoritative and to halt on unspecified decisions. That governance role is now handled by the repo's `CLAUDE.md` (parent-level SDD guardrails) and the BMad workflow's own halt/clarification conventions — kept here only for historical record.

You are a software engineering agent. Your task is to generate full technical specifications and production-ready code for the **Overlearn** app described above.

Use the requirements below as the authoritative specification. Do not add features not listed. Do not make architectural decisions not covered without halting and requesting clarification.

---

## 3. Functional Requirements

### 3.1 Segment Management

- User can create a named practice segment (e.g., "Measure 24 left hand", "Bar 8 transition").
- User can have multiple segments stored simultaneously.
- Each segment is independent with its own state.
- User can delete or archive a segment.

### 3.2 Session Initialization

- On starting a new session for a segment, the user inputs:
  - `incorrect_attempts_before_first_success` (integer ≥ 0)
  - Overlearning level: `50%` or `100%`
- Target streak is calculated as follows:
```
if incorrect_attempts_before_first_success == 0:
    target_streak = 5

elif overlearning_level == 50%:
    target_streak = ceil(incorrect_attempts_before_first_success * 0.5)

elif overlearning_level == 100%:
    target_streak = incorrect_attempts_before_first_success
```

- Minimum `target_streak` is always 5, regardless of calculation output.
- Display calculated `target_streak` to user before session begins.
- User must confirm before session starts.
- ~~Amendment (2026-08-30, superseded below): Default `overlearning_level` is `50%`. The selector remains available... re-prompts for `incorrect_attempts_before_first_success`.~~

- **Amendment (2026-08-30, supersedes the above and §3.2/§3.3 upfront-input model entirely):** The upfront `incorrect_attempts_before_first_success` prompt and pre-session confirmation gate are removed. Sessions now compute the target dynamically, in real time, from failures accumulated *during* the session itself:
  - Session starts immediately on segment selection — no input screen, no confirmation step.
  - `overlearning_level` is a fixed global constant for MVP: **50%**. (Backlogged: a Settings screen letting the user choose 50%/100%, applied globally, not per-session — see §5.)
  - State at session start: `current_streak = 0`, `total_incorrect_this_session = 0`, `target_streak = max(5, ceil(total_incorrect_this_session * overlearning_level))` = **5** (the floor — this replaces the old "zero-failures → target=5" special case, which is now just the natural starting state).
  - **Correct tap:** `current_streak += 1`. If `current_streak >= target_streak` → session complete.
  - **Incorrect tap:** `total_incorrect_this_session += 1`, `current_streak = 0`, then **recalculate** `target_streak = max(5, ceil(total_incorrect_this_session * overlearning_level))`. `target_streak` can only increase or hold — it never decreases on its own. In practice, at 50%, `target_streak` stays at the floor of 5 until `total_incorrect_this_session` exceeds 10 (`ceil(11*0.5)=6`).
  - `target_streak` as logged in the history log (§3.6) on completion is the *final* value reached at the moment of completion, not a fixed upfront number.

### 3.3 Active Session — Repetition Counter

- Display prominently:
  - Current streak count
  - Target streak count
  - Progress indicator (e.g., `3 / 10`)
- Three interaction controls (amended 2026-08-30, was two):
  - **Correct** button
  - **Incorrect** button
  - **Restart** button — requires a confirmation step ("Restart session? Progress will be lost.") before acting, deliberately distinct from the no-confirm Correct/Incorrect pair so it reads as a different category of action, not a third peer button. On confirm, manually zeroes the *in-progress session only*: `current_streak = 0`, `total_incorrect_this_session = 0`, `target_streak` back to the floor of 5, and `session_start_timestamp` reset to the moment of restart. Does not touch the history log — a restarted session leaves no record; it's as if that attempt never happened.
- On **Correct** tap:
  - `current_streak += 1`
  - If `current_streak >= target_streak`: trigger session completion flow
- On **Incorrect** tap:
  - `current_streak = 0`
  - Increment `total_incorrect_this_session` counter (display optional, non-prominent)
  - Recalculate `target_streak` per the §3.2 amendment (2026-08-30)
- No undo action for individual Correct/Incorrect taps (Restart is a full-session reset, not a per-tap undo).

### 3.4 Session Completion

- Triggered when `current_streak >= target_streak`.
- Display completion screen with:
  - Segment name
  - Target achieved
  - Total attempts this session (correct + incorrect)
- Options presented:
  - **Done** — close session, mark segment complete for today
  - **Repeat session** — reset streak, keep same target, start again

### 3.5 Session Interruption & State Persistence

- If app is backgrounded or closed mid-session, full session state is persisted locally.
- On relaunch, user is prompted to resume interrupted session or discard it.
- State persisted per segment (amended 2026-08-30 — `incorrect_attempts_before_first_success` removed, no longer collected upfront; `overlearning_level` removed from per-session state, now a fixed global 50% constant for MVP):
  - `segment_name: string`
  - `target_streak: int` (computed dynamically, see §3.2 amendment)
  - `current_streak: int`
  - `total_incorrect_this_session: int`
  - `session_complete: bool`
  - `session_start_timestamp: ISO8601`

### 3.6 History Log (Per Segment)

- Store **completed sessions only** per segment (amended 2026-08-30). A session abandoned mid-practice — backgrounded/closed and never resumed, or never explicitly discarded — writes zero history entries; only reaching the target and completing via Done writes a record. Restart never writes a record either (see §3.3).
- Each entry:
  - Date
  - Final target streak achieved (the live-recalculated value at completion, not a fixed upfront number)
  - Total mistakes this session (amended 2026-08-30 — added so a varying target is legible across entries: "target 8" is meaningless without knowing whether that reflects a rough session or a light one)
  - Total attempts (correct + incorrect)
- Display as a simple list. No charts required.
- This log is the only place the app surfaces "is this fix actually holding over time" — there is no other progress signal (see §5, spaced repetition explicitly out of scope). Treat it as load-bearing to the product's value proposition, not a secondary feature.

---

## 4. Non-Functional Requirements

| Constraint | Specification |
|---|---|
| Platform | Mobile-first. iOS and Android via React Native or Flutter. |
| Offline | 100% functionality with no network connection. |
| Input latency | Correct / Incorrect button tap must register and update UI in < 100ms. |
| UI during session | Minimal. No navigation chrome, no notifications, no distractions during active count. |
| Data storage | Local device storage only. No backend, no cloud sync, no user accounts. |
| Accessibility | Buttons must meet WCAG AA minimum touch target size (44x44pt). |
| No telemetry | No analytics, crash reporting, or usage tracking of any kind. |

---

## 5. Out of Scope (v1)

Do not implement the following in v1. Backlogged for future releases (not yet designed/scoped):

- Automatic audio detection of correct/incorrect playing
- Voice-command Correct/Incorrect input (e.g. user-selectable words like "right"/"wrong")
- Settings screen to choose `overlearning_level` (50%/100%) globally — fixed at 50% for MVP (amended 2026-08-30)
- Spaced repetition scheduling between sessions
- Metronome or tuner
- Practice time tracking
- Gamification features
- AI integration
- Analytics
- Social features, sharing, or leaderboards
- Cloud sync or user accounts
- In-app purchases or subscriptions
- Notifications or reminders
- Multi-user or teacher/student modes

---

## 6. Halt Conditions for Agent (superseded — see note below)

> Superseded by the parent-level `CLAUDE.md` at `E:\Documents\OneDrive\AIProjects\CLAUDE.md`, which defines the project-wide halt protocol (Section 4: Halt and Query Protocol). Kept here only for historical record; do not duplicate this into the project's own `CLAUDE.md`.

Halt and request clarification if any of the following arise:

- A UI decision requires choosing between two valid layouts not specified here.
- A platform API is unavailable and an alternative would change the UX.
- A dependency introduces a license incompatible with commercial distribution.
- Any feature not listed in Section 3 is implied by the implementation.

---

## 7. Deliverables Expected from Agent

1. Technical specification document (stack, architecture, data model, component tree).
2. Full production-ready source code.
3. Local storage schema.
4. Unit tests for all calculation logic in Section 3.2 and 3.3.
5. README with build and run instructions.
