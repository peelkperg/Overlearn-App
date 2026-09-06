---
title: "Product Brief Distillate: Overlearn"
type: llm-distillate
source: "product-brief-Overlearn.md"
created: "2026-08-30"
purpose: "Token-efficient context for downstream PRD creation"
---

> **Authority note (2026-08-30):** The PRD (`prd.md`) now carries a **Mechanic Specification** section that is the authoritative definition of the target-streak mechanic, superseding both this distillate and `docs/original-requirements.md`. Where they disagree, the PRD wins. This section is retained as consistent background context, not as a competing source of truth.

## Requirements hints (current mechanic — mirrors the PRD's Mechanic Specification)

- **Current (live) target-streak mechanic, replaces the original upfront-input formula:**
  - No upfront input screen. Session starts immediately on segment selection: `current_streak = 0`, `total_incorrect_this_session = 0`, `target_streak = max(5, ceil(total_incorrect_this_session * overlearning_level))` = **5** (the floor).
  - `overlearning_level` is a **fixed global constant for MVP: 50%** (not user-selectable per session — see Backlog). **[v1.1 update 2026-09-06: still 50% by default and still global/not per-session, but no longer a constant — user-configurable 50–300% in 10% steps via a Settings screen (`prd.md` FR35–FR37), effective immediately including mid-session. The `0.5` appearing in the formulas below is the default, not a fixed value.]**
  - **Correct tap:** `current_streak += 1`. If `current_streak >= target_streak` → session complete.
  - **Incorrect tap:** `total_incorrect_this_session += 1`, `current_streak = 0`, then recalculate `target_streak = max(5, ceil(total_incorrect_this_session * 0.5))`. Target only rises or holds — never decreases on its own. At 50%, target stays at the floor of 5 until `total_incorrect_this_session` exceeds 10.
  - History log records the *final* `target_streak` value reached at completion time, not a fixed upfront number.
- **Superseded/rejected formula (do not use):** the original "user enters `incorrect_attempts_before_first_success` upfront, app calculates target once, user confirms before starting" model. This was fully replaced, not merely amended — do not propose a hybrid of upfront-input + live-recalculation.
- **Persisted per-segment session state (exact fields, current):** `segment_name: string`, `target_streak: int` (dynamic), `current_streak: int`, `total_incorrect_this_session: int`, `session_complete: bool`, `session_start_timestamp: ISO8601`. (`incorrect_attempts_before_first_success` and per-session `overlearning_level` fields are removed — do not include them in a data model.)
- **Session UX rule:** three controls during active session — Correct / Incorrect / **Restart**. Restart requires a confirm step ("Restart session? Progress will be lost.") — deliberately distinct from the no-confirm Correct/Incorrect pair, not a third peer button. On confirm, zeroes the in-progress session (streak, total_incorrect, target back to floor of 5, **and** `session_start_timestamp` reset) — does not touch the history log, as if the attempt never happened. No undo on individual Correct/Incorrect taps (deliberate — prevents gaming the streak); Restart is a full-session reset, not a per-tap undo.
- **Segment ops:** create (named), multiple concurrent segments, delete. **Removed (do not re-add without a UI for it):** archive — implemented then cut post-implementation (2026-09-02) to optimize data storage; it had no way to view/restore an archived segment, so it was a one-way hide that only accumulated unreachable data.
- **Interruption handling:** full session state persists locally on background/close; on relaunch, user is prompted resume vs. discard.
- **History log — completed sessions only:** an abandoned session (backgrounded, never resumed, never discarded) writes zero history entries; only Done-completion writes a record. Restart also never writes a record. Each entry: date, final target streak achieved (live-recalculated value, not a fixed upfront number), **total mistakes this session** (added so a varying target is legible across entries), total attempts (correct+incorrect). Simple list, explicitly no charts. This log is the only place the app surfaces "is the fix holding over time" — treat it as load-bearing to the value prop, not a secondary feature.
- **NFRs (exact):** mobile-first iOS+Android (RN or Flutter, undecided); 100% offline; Correct/Incorrect/Restart tap → UI update <100ms; minimal UI during session (no nav chrome/notifications/distractions); local-only storage (no backend/cloud/accounts); WCAG AA touch targets ≥44×44pt; zero telemetry (no analytics/crash reporting/usage tracking of any kind).

## Rejected / deferred ideas (don't re-propose in PRD without explicit re-scoping)

- **Removing the 50%/100% selector entirely** — considered, user chose to keep the selector, just changed the default to 50%. (Selector stays.) **[SUPERSEDED 2026-09-06: the 50%/100% selector concept is obsolete. The setting is now a free 50–300% range in 10% increments — `prd.md` FR35–FR37, v1.1 scope. Do not propose a two-value toggle.]**
- **Audio-based automatic correctness detection** — explicitly out of scope for v1 and all foreseeable near-term releases per original spec.
- **In-session motivation/gamification mechanics** — explicitly rejected as a design goal. User's own words: *"this is not an app to motivate musicians to practice... it is for musicians that know what they want out of their practice time."* Do not propose streaks-as-motivation framing, badges, encouragement copy, etc. in the PRD.
- **Streak-reset "discouragement" as a risk to mitigate** — user explicitly said no mitigation needed; the hard reset is intentional and not up for softening.

## Backlog (future releases, out of v1 PRD scope, but useful for future roadmap section)

- Voice-command Correct/Incorrect input, user-selectable command words (e.g. "right"/"wrong", "yes"/"no", "green"/"red") — this is the planned fix for the hands-occupied interaction-friction problem (see Open Questions/Risks below). Not v1.
- ~~Settings screen letting the user choose `overlearning_level` (50%/100%), applied globally — fixed at 50% for v1, not user-selectable.~~ **[SUPERSEDED 2026-09-06 — no longer backlog. Pulled forward to v1.1 as `prd.md` FR35–FR37: a Settings screen where `overlearning_level` accepts any value from 50% to 300% in 10% increments, applied globally and effective immediately, including mid-session. `TARGET_FLOOR` stays fixed at 5. v1.0 shipped with 50% fixed, frozen at tag `v1.0.0`.]**
- Metronome, tuner, practice time tracking, audio-based correctness detection, gamification, AI integration, analytics — all explicitly deferred, none designed yet.

## Technical context / open questions for architecture stage

- **Platform choice (React Native vs. Flutter) is genuinely undecided.** Both assessed as equally capable for this app's actual requirements (offline, local storage, simple 2-button UI, no heavy native features). No team/skill preference stated by user. Flag for architecture stage decision.
- **Physical interaction-friction risk (identified, accepted as v1 constraint):** tapping Correct/Incorrect after every rep requires reaching for the phone while hands are occupied playing an instrument. No mitigation in v1 (voice input is the planned v2+ fix). UX/architecture stage should still consider device-placement/reachability guidance even without solving it fully (e.g. large touch targets, one-handed-reachable layout) since this wasn't ruled out, just deferred.
- **Local-only storage tradeoff, explicitly accepted:** uninstall or device loss = full data loss, no backup/export in v1. Not a gap to flag again downstream — already a stated tradeoff.
- **Self-report reliability (accurate recall of failure count, honest Correct/Incorrect tapping under fatigue)** — untested assumption, explicitly accepted as an unvalidated design bet consistent with the "personal use validation" success criteria. Not something the PRD needs to solve; just don't treat it as a bug to fix.
- **Resolved (2026-08-30, party-mode review):** abandoned sessions (backgrounded, never resumed, never discarded) write zero history entries — only Done-completion writes a record. Do not implement a partial/incomplete history-entry type.
- **Open for architecture stage (party-mode review, Winston):** should `target_streak` be persisted as stored state (requires atomic-write guarantee alongside `total_incorrect_this_session`) or always derived on read from `total_incorrect_this_session` (simpler, no drift risk)? Recommendation from review: derive on read. Not decided yet — flag explicitly in architecture doc rather than defaulting silently.
- **Open for architecture stage:** the completion-screen state (streak has hit target, but user hasn't yet tapped Done/Repeat) isn't represented in the persisted schema — if the app is killed in that window, resume needs to know to show the completion screen again, not the counter screen. Needs an explicit state field or a re-derivation rule; not decided yet.
- **Write-latency tradeoff (Winston, accepted as reasonable but should be stated explicitly in the architecture doc, not silently assumed):** the <100ms tap-to-UI-update requirement should be met by rendering from in-memory state immediately and flushing to disk asynchronously (ordered write queue), not synchronous persist-then-render. Tradeoff: an app kill in the gap between render and flush loses the most recent tap on resume — considered tolerable given the app's already-deliberate no-undo philosophy, but is a real design decision to record, not a hidden side effect.

## Competitive intelligence (from web research, for PRD/architecture awareness — not for positioning, per user's explicit deferral of GTM/positioning work)

- **No competitor uses a hard within-session consecutive-correct-streak-with-reset mechanic.** Closest adjacent: Modacity (strategy-based deliberate practice, no streak-reset), Crank (tempo-focused), Soundbrenner (metronome+time tracking, 10M+ users, no correctness mechanic), Phiano (classical-guitar-specific, but solves cross-*day* spaced-repetition scheduling, not within-session consolidation — different problem, iPad-only, no Android), AnkiJazz (Anki repurposed, same cross-session scheduling problem).
- **Overlearning neuroscience is real and citable** (Nature Neuroscience / Watanabe lab hyperstabilization research; also covered by Scientific American, UCSF). One documented caveat in the literature: overtraining can interfere with *subsequent new* learning — not addressed as a product risk (app targets one passage at a time, not continuous overtraining), just noted as existing in the source research.
- Market-sizing figures for "online music education" were inconsistent across sources ($4.6B–$20B) — treat as soft/unreliable, not usable as a hard TAM number if a PRD or later doc wants one.

## Scope signals (explicit in/out/maybe from user)

- **In v1:** everything in `docs/original-requirements.md` §3 (segment mgmt, session init/active/completion, interruption persistence, history log) — functional scope unchanged, but the target-streak mechanic itself was replaced (live/dynamic, see above), not merely amended.
- **Out of v1, backlog:** see Backlog section above.
- **Explicitly declined to discuss now:** positioning/GTM strategy, teacher/lesson-prep distribution channel, shareable streak summaries, instrument-agnostic broader market — all surfaced by review agents as future-interesting, user said defer to a later conversation, not for this PRD unless user raises them again.
