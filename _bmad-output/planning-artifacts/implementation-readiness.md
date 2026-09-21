# Implementation Readiness Findings — Epic 7 (Voice-Command Correct/Incorrect Input)

**Generated:** 2026-09-20, by `bmad-sprint-planning`'s readiness gate, ahead of a sprint-status refresh.
**Verdict:** CONCERNS — plan not regenerated; user chose to fix planning first.

## Context

Epic 7 (`epics.md`) was broken into stories 7.1–7.5 during planning. Implementation instead went through the spec-driven `bmad-build` route: `spec-voice-command-input.md` independently scoped CAP-1–CAP-3 (deferring CAP-4/story 7.5 to `deferred-work.md`, consistent with `epics.md`). That implementation shipped in PR #2 (branch `feat/voice-command-input`, commits `80573fe`, `178d947`). Stories 7.1–7.4's recorded acceptance criteria were not used as the implementation's source of truth — `spec-voice-command-input.md` was — so they now diverge from what was actually built.

## Findings

1. **Trigger storage: MFCC-only vs. raw audio.**
   `epics.md` Story 7.2's AC: "the three MFCC matrices — not the raw audio — are written to `voiceTriggers.ts`... raw recordings are discarded from memory" (AD-6).
   Shipped (`src/lib/voice-settings.ts`, `src/app/settings/voice-triggers.tsx`): persists base64-encoded **raw WAV audio** via `storage.ts`'s string API.
   Also conflicts with `architecture.md`'s AD-6 ("persist as MFCC feature matrices only, never raw audio") — same underlying gap, already logged in `deferred-work.md` from the build's own review pass. Privacy-relevant: the architecture's own stated rationale for MFCC-only storage was presumably to avoid persisting recognizable audio.

2. **First-entry recording flow not launched from the mic toggle.**
   `epics.md` Story 7.2's AC: "the user has no saved trigger set... turns the mic toggle on for the first time... the recording flow launches immediately instead of starting to listen" (UX-DR32).
   Shipped (`src/components/session/MicToggle.tsx`): the toggle is simply disabled (`disabled={!hasTriggers}`) when no trigger set exists — no first-entry launch into the recording flow. Only the Settings entry point works.

3. **Distinguishability-rejection UX undershoots the spec'd behavior.**
   `epics.md` Story 7.2's AC: rejection "names the pair and asks the user to re-record only the **later** trigger of that pair (wake < Correct < Incorrect ordering), keeping the other two takes untouched" (UX-DR34).
   Shipped (`src/app/settings/voice-triggers.tsx`): shows the rejected pair generically (`voice-triggers-rejected` text) but does not target re-recording to a specific trigger — the user can re-record any of the three.

4. **Backgrounding-discards-in-progress-takes not verified.**
   `epics.md` Story 7.2's AC: leaving foreground mid-recording (0–2 of 3 takes done) should discard in-progress takes with no resume prompt (AD-6, UX-DR35).
   Shipped: no `AppState` handling exists anywhere in the voice-command code (also separately flagged in `deferred-work.md` for the always-listening case, CAP-1/CAP-2). Story 7.2's recording-flow variant of this requirement is unaddressed too.

5. **Architecture/module naming mismatch.**
   `architecture.md` and `epics.md` (Stories 7.1, 7.3, 7.4) reference `src/lib/voiceCommand/{matcher,mfcc,dtw,recorder}.ts`, `src/lib/voiceTriggers.ts`, `src/hooks/useVoiceCommand.ts`, and a `createMatcher()` factory with a `listening` boolean.
   Shipped: `src/lib/voice-matcher.ts` (a `VoiceMatcher` class), `src/lib/voice-capture.ts`/`.web.ts`, `src/lib/voice-settings.ts`, `src/hooks/useVoiceSettings.ts`, `src/components/session/MicToggle.tsx` (component-local `micOn` state, not a hook-owned `listening` boolean).
   A developer implementing story 7.5 (CAP-4, still backlog) by following `architecture.md`/`epics.md` literally would build against files, hooks, and a state model that don't exist in the actual codebase.

6. **Story 7.5 (CAP-4) itself is consistent** — matches `deferred-work.md`'s deferral, no gap found there.

## What this blocks

Regenerating `sprint-status.yaml` for epic-7 right now would either:
- mark 7.1–7.4 `done` — overstating conformance to their literal recorded ACs (findings 1–4 are real unmet criteria), or
- leave them `backlog`/partial — undercounting the CAP-1–3 work that did ship (PR #2, 469/469 tests passing, reviewed and merged-pending).

Either reading misrepresents the tracker against `epics.md` as currently written.

## Recommended fix

Run `bmad-correct-course` to reconcile `epics.md` (and `architecture.md`/`ux-design-specification.md`, which share the same staleness — see `deferred-work.md`'s entry from PR #2's review) with what CAP-1–3 actually shipped. Likely outcomes: rewrite stories 7.1–7.4's ACs to match the shipped design (or explicitly accept the shipped design as a scope amendment), and correct the architecture/UX file-path and storage-model references before story 7.5 (CAP-4) is picked up.

Once reconciled, re-run `bmad-sprint-planning` (full refresh) to regenerate `sprint-status.yaml` against the corrected epics.
