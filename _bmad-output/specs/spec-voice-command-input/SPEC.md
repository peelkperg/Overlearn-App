---
id: SPEC-voice-command-input
companions: [stack.md]
sources: []
---

> **Canonical contract.** This SPEC is the complete, preservation-validated contract for what to build, test, and validate. `backlog.md`'s "Voice-command Correct/Incorrect input" entry is the originating source; consult it only for narrative rationale.

# Voice-command Correct/Incorrect input

## Why

Pain to solve: during an active practice session, logging a Correct or Incorrect repetition requires reaching for the phone, but the user's hands are occupied playing an instrument. This is P1 in the backlog with an already-identified user need. The feature adds a hands-free logging path without changing the tap-based path, which remains the default.

## Capabilities

- **CAP-1**
  - **intent:** User can log a Correct or Incorrect repetition during an active practice session by speaking/sounding a wake trigger followed by a Correct or Incorrect trigger, instead of tapping the on-screen buttons.
  - **success:** With the mic toggle on, playing the recorded wake trigger followed by the recorded Correct (or Incorrect) trigger updates the session's counters identically to tapping that button; verified by a test that feeds recorded audio fixtures through the matcher.

- **CAP-2**
  - **intent:** User can turn voice-command listening on or off from an explicit mic toggle on the Active Session screen.
  - **success:** The mic is off by default in every new and resumed session. Turning the toggle off immediately stops audio capture; turning it on starts it. No audio is captured while the toggle is off.

- **CAP-3**
  - **intent:** User can record their own three trigger sounds (wake, Correct, Incorrect) as any sound of their choosing (word, clap, hum, tap), one take per trigger.
  - **success:** Saving the set runs a distinguishability check across all three recordings; if any two are too acoustically similar to reliably tell apart, save is blocked with a rejection/warning. A sufficiently distinguishable set saves successfully.

- **CAP-4**
  - **intent:** User can turn the wake-word requirement on or off, independent of CAP-2's mic on/off toggle — ON keeps CAP-1's wake-then-command flow (only a wake match opens the command window), OFF skips the wake gate entirely so Correct/Incorrect triggers match directly against every live audio window. ON suits noisy practice (instrument playing) by filtering ambient false triggers; OFF suits quiet practice, trading that protection for fewer sounds per repetition.
  - **success:** With wake-word ON (default), CAP-1 behaves exactly as specified there. With wake-word OFF, speaking/sounding a Correct or Incorrect trigger alone — with no preceding wake trigger — updates the session's counters, verified by a test that feeds Correct/Incorrect fixtures through the matcher with no wake fixture present.

## Constraints

- On-device audio matching only — no cloud speech/audio API, ever; no recorded trigger sample leaves the device. Matches NFR8/9 (zero data leaves the device, zero telemetry).
- Microphone OS permission is requested only the first time the user turns the voice-command toggle on — never upfront at install or onboarding.
- Activation is wake-word-gated by default (CAP-4 ON): the matcher only acts on a Correct/Incorrect trigger immediately following the wake trigger, never on Correct/Incorrect triggers heard in isolation. This bounds false positives from ambient instrument/room noise. With CAP-4 OFF, this protection is absent by the user's own choice, not a gap — an accepted trade-off for quiet environments.
- Recording is single-take per trigger (wake, Correct, Incorrect) — no multi-sample averaging or re-recording-for-robustness flow in this scope.
- Each trigger recording is capped at 2 seconds — recording auto-stops at 2 seconds if not already stopped manually. Applies uniformly regardless of CAP-4's setting.

## Non-goals

- Standard speech-to-text / fixed-vocabulary ASR word recognition — this feature does not recognize typed/free-text command words; it matches user-recorded custom sound templates.
- Cloud-based speech or audio recognition of any kind.
- Accessibility / screen-reader (TalkBack, VoiceOver) interaction design. This feature targets hands-busy practice logging, not accessibility; screen-reader mic-conflict handling is explicitly out of scope and would require separate, deeper analysis.

## Success signal

A user can complete a full practice session — start to automatic completion — logging every Correct and Incorrect repetition by voice alone, hands never touching the phone, with the resulting session counters matching what manual tap logging would have produced on the same sequence of attempts.

