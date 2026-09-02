---
title: "Product Brief: Overlearn"
status: "complete"
created: "2026-08-30"
updated: "2026-08-30"
inputs: ["E:/Documents/OneDrive/AIProjects/Overlearn-App/docs/original-requirements.md"]
---

# Product Brief: Overlearn

## Executive Summary

Musicians practice a difficult passage until they get it right a few times, then move on — but every incorrect attempt reinforces the wrong muscle memory just as much as a correct attempt reinforces the right one. If a passage took 10 failed attempts before the first success, and the musician stops after 5 correct reps, the wrong pathway is still stronger than the fix. Under performance pressure, the mistake wins.

Overlearn is a mobile-first practice tool that applies the neuroscience of overlearning to fix this. The app requires a minimum of 5 *consecutive* correct repetitions before a fix counts as solidified — with a hard reset to zero on any mistake, and the bar raised in real time (to 50% of total mistakes made that session) if the passage turns out to need more proof than the minimum. The reset-on-error rule is the mechanic: it forces total attention on every single repetition, eliminating the mindless practice that lets errors slip back in.

The initial audience is musicians generally, with classical guitarists as the beachhead — a repertoire built on technically dense, error-prone passages where this kind of targeted consolidation matters most. The app is deliberately simple: fully offline, local-storage only, no accounts, no audio detection, no AI, no gamification — a focused tool that does one thing precisely, in a market where competitors are trending toward more automation and feature breadth, not less.

## The Problem

Musicians fix technical mistakes by feel, not by rule. A player hits a wrong note in a passage, tries again, eventually gets it right, and — with no consistent standard for "how many times is enough" — moves on as soon as it *feels* solid. That judgment is unreliable exactly when it matters most: under the pressure of a performance or a lesson, the passage that "felt fixed" in practice reverts to the old, more-rehearsed error.

The cost compounds. The learner has no way to know, in the moment, whether five correct reps is enough or whether they've been under-practicing the fix by half — because nothing enforces a target, and nothing punishes losing focus mid-repetition. Existing practice-tracking tools (metronome apps, timers, session logs) measure *time spent* or *tempo*, not *correctness density* — they don't address this problem at all. The underlying premise is grounded in real skill-consolidation research (overlearning/hyperstabilization studies, e.g. Nature Neuroscience), not invented from scratch — but the app's specific claim (that this consecutive-streak mechanic improves retention for musicians) is itself unvalidated and treated as a hypothesis to test through use, not an established fact.

## The Solution

Overlearn turns "practice until it feels right" into a rule with teeth — computed live, during the session, not guessed upfront:

1. Name the passage or measure being worked on (a segment), and start the session immediately — no upfront input screen.
2. The session starts assuming the minimum bar: 5 correct reps in a row. Tap Correct or Incorrect after every single rep.
3. Any Incorrect resets the streak to zero *and* adds to a running count of total mistakes for the session — which raises the required streak (50% of that running total, still floored at 5) if the passage turns out to need more proof than the minimum. The harder the passage actually is, revealed live by how often it's missed, the higher the bar climbs.
4. No undo on individual taps — deliberate friction, not a missing feature: an undo would let users game the streak instead of confronting the miss. A separate **Restart** button exists to deliberately zero the whole in-progress session (streak, mistake count, and target all reset to the floor) if the user wants a clean slate — distinct from a single miss, which only resets the streak.
5. Hit the (possibly-raised) target streak, and the session is complete — the fix is now backed by more correct reinforcement than the mistakes it took to get there.

The experience during an active session is deliberately stripped down: two buttons, a streak counter, a progress indicator, nothing else. No chrome, no distractions — the interface itself enforces the focus the mechanic depends on.

## What Makes This Different

No reviewed competitor (Modacity, Crank, Soundbrenner, Phiano, Anki-repurposed-for-music) enforces a hard, within-session, consecutive-correct-streak-with-reset. The closest adjacent product, Phiano, applies spaced repetition *across days* to decide which piece to revisit next — a scheduling problem. Overlearn solves a different problem: consolidating *this one fix, right now*, within a single practice session, with a target grounded in how badly the musician actually struggled with it.

The honest moat here is mechanism, not defensibility — the streak-reset rule itself is simple enough that a larger incumbent could add it as a feature. Overlearn's edge is that it does only this, precisely, with no distractions, in a category trending toward AI feedback and audio detection. That focus is a real, if not permanent, advantage: a purpose-built tool for one already-fully-specified mechanic, shippable without the scope creep a bolted-on feature would carry inside a bigger app.

Two supporting strengths worth naming directly: the target-streak calculation is fully deterministic and inspectable (§3.2 of `docs/original-requirements.md`) — not a black box, unlike any future AI-judged-correctness competitor. And no-accounts/no-cloud/no-telemetry is not just an engineering constraint — in a category increasingly bundling audio capture and cloud accounts, it's a genuine privacy/trust position: nothing about a user's practice ever leaves their device.

## Who This Serves

**Primary:** Musicians actively working through a technically difficult passage who want a fix to hold under pressure — not just in the practice room. Initial beachhead: classical guitarists, whose repertoire is dense with isolated technical trouble spots (a shift, a stretch, a right-hand pattern) that are exactly the unit of practice this mechanic targets.

Success for this user isn't a dashboard — it's walking away from a session knowing, by rule rather than feel, that a specific mistake is now less likely to resurface. This is not a motivation or habit-formation tool: it assumes a musician who already knows what they want from their practice time and wants a rule to hold them to it, not a nudge to practice in the first place.

## Success Criteria

No telemetry, accounts, or cloud sync means the app cannot report usage data back — success is validated outside the app itself:

- **Now:** personal use validation — does the mechanic actually reduce recurrence of fixed mistakes in the developer's own practice.
- **Later, post-release:** App Store ratings and reviews as the first external signal.

## Scope

**In for v1** (originally specified in `docs/original-requirements.md` §3, since revised — see note below): segment management (create/delete, multiple concurrent segments); session start with no upfront input (target begins at the floor of 5, immediately playable); active-session Correct/Incorrect/Restart controls with reset-on-miss and live target recalculation from accumulated session mistakes; session completion flow (Done / Repeat session); interruption persistence and resume/discard prompt; per-segment history log (date, final target achieved, total attempts).

**Note (2026-09-02):** Archive was implemented, then removed post-implementation to optimize data storage — it had no way to view or restore an archived segment through the UI, making it a one-way hide of data with no product value. See `epics.md`'s FR5 entry.

**Explicitly out for v1** (backlog for future releases, not this brief's scope): metronome, practice time tracking, tuner, audio-based correctness detection, voice-command Correct/Incorrect input (user-selectable command words, e.g. "right"/"wrong" or "yes"/"no" — removes the need to touch the phone mid-repetition), a Settings screen to choose the 50%/100% overlearning level globally (fixed at 50% for v1), gamification, AI integration, analytics. None of these are designed yet — each needs its own scoping pass before being pulled forward. Manual tap-to-log is an accepted v1 constraint, not an oversight: the interaction-friction risk of reaching for the phone mid-practice is real but deferred by design, with voice input as the planned future fix.

**Platform:** mobile-first, iOS and Android, React Native or Flutter (undecided — both are equally capable for this app's requirements; left open for the architecture stage). 100% offline, local device storage only — accepted tradeoff: uninstalling the app or losing the device means losing all segment and history data, with no backup/export in v1.

## Vision

If this works, Overlearn stays narrow on purpose: the definitive tool for turning "I think I fixed it" into "I proved I fixed it," one passage at a time. Future releases (metronome, tuning, audio-based listening, AI-assisted correctness judging, gamification, analytics) extend *how* correctness is measured and *how* practice is scheduled — but the core promise stays the same: reinforcement, enforced by rule, not by feel.
