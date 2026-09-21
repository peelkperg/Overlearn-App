---
title: 'Voice-command Correct/Incorrect input'
type: 'feature'
created: '2026-09-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '915ba12d723aa49f92a0363dcfe45cd4a9e09512'
context: ['{project-root}/_bmad-output/specs/spec-voice-command-input/SPEC.md', '{project-root}/_bmad-output/specs/spec-voice-command-input/stack.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** During an active practice session, logging a Correct or Incorrect repetition requires reaching for the phone, but the user's hands are occupied playing an instrument (P1 backlog item, identified user need).

**Approach:** Add an opt-in mic toggle on the Active Session screen that runs on-device DTW-over-MFCC matching against three user-recorded trigger sounds (wake, Correct, Incorrect) and calls the exact same `logCorrect`/`logIncorrect` functions the tap buttons already use. Wake-word gating is always on (no ON/OFF toggle in this scope — see Spec Change Log). A new settings sub-screen lets the user record/re-record the three triggers.

**Decided:** Capture uses `expo-audio` (native) + custom Web Audio API/`MediaRecorder` (web) behind one interface, mirroring `storage.ts`'s native/web split, for parity with the epic-6 web/PWA build. `expo-audio` is a new dependency, requires CLAUDE.md §5.2 sign-off before install. MFCC/DTW matching is hand-written pure TS, no library — runs on a decoded PCM buffer, so it's identical on both platforms; only capture is platform-specific.

## Boundaries & Constraints

**Always:**
- Voice match calls `useActiveSession().logCorrect()`/`logIncorrect()` (`src/hooks/useActiveSession.ts`) directly — never duplicate transition logic (CAP-1 parity).
- Mic toggle defaults off in every new/resumed session; zero capture while off; OS permission requested only on first enable, never at install.
- Trigger audio persists as base64 strings via `storage.ts`'s existing string/object API — no raw buffers (web-compatible-storage precedent, spec-6-1).
- Each trigger recording auto-stops at 2s.
- Saving a trigger set runs CAP-3's pairwise DTW distinguishability check first; a too-similar pair blocks save, prior valid set untouched.
- New settings follow `src/lib/settings.ts`'s module shape (storage key, `isXxx` guard in `types.ts`, `subscribeToKeys`); new sub-screen registers in `stack-screens.ts`'s `STACK_SCREENS`.

**Never:**
- No cloud speech/audio API, no fixed-vocabulary ASR — user-recorded templates only.
- No accessibility/screen-reader work in this scope.
- No multi-take/re-recording-for-robustness flow — single take per trigger.
- No automatic correctness detection from ambient audio — replaces the tap gesture only.
- No wake-word ON/OFF toggle (deferred, see Spec Change Log) — gating is always on.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Wake-then-command, happy path | wake trigger audio then Correct trigger audio | `logCorrect()` fires once; counters match tap | N/A |
| Distinguishability check fails | Two of three new recordings within similarity threshold | Save blocked, rejection shown; prior valid template set (if any) unchanged | User must re-record before retrying save |
| Mic permission denied | User enables mic toggle; OS denies | Toggle reverts to off; denial state surfaced to user | No crash; feature parks in "off" state |
| Recording exceeds 2s | User holds record past 2s | Auto-stop at 2s; recorded segment used as-is | N/A |
| Ambient noise | Non-trigger audio while `LISTENING_FOR_WAKE` | No match, no counter change | N/A |

</frozen-after-approval>

## Code Map

- `src/app/session/[id].tsx` (`ActiveSessionScreen`) -- add mic-toggle UI, following the `SettingsButton` inline-icon pattern.
- `src/hooks/useActiveSession.ts` -- `logCorrect()`/`logIncorrect()` call `session-transitions.ts` then `sessionStore.writeSession()` then `useFeedbackSignal`; voice match calls these two, not the transitions directly.
- `src/app/settings.tsx` + `src/app/stack-screens.ts` -- leaf-screen pattern; add `src/app/settings/voice-triggers.tsx`, register in `STACK_SCREENS`.
- `src/lib/settings.ts` + `useSettings.ts` + `src/lib/types.ts` -- module-cached-snapshot pattern over `storage.ts`; add mic-enabled and trigger-template settings.
- `src/lib/storage.ts` -- `getString/setString/getObject/setObject/subscribeToKeys` over MMKV (native) / `localStorage` (web); no binary API — trigger audio goes through this as base64 strings.
- `jest.config.js`, `__mocks__/` -- `jest-expo` preset, colocated tests, screen tests in `src/app-tests/`; no audio mocks exist — add manual mocks for the capture module.
- No existing mic/audio/permission code in `src/` — greenfield.
- `package.json` -- add `expo-audio`; web capture uses built-in browser APIs, no new dependency.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/voice-matcher.ts` -- implement MFCC extraction + DTW distance, wake-then-command matcher state machine, and the CAP-3 pairwise distinguishability check -- core matching engine, pure TS, testable without native module
- [x] `src/lib/voice-capture.ts` + `src/lib/voice-capture.web.ts` -- native (`expo-audio`) and web (`MediaRecorder`/Web Audio API) capture behind one interface: 2s-capped trigger recordings and live audio windows, decoded to PCM for the matcher -- CAP-1/CAP-2/CAP-3 audio input
- [x] `src/lib/settings.ts`, `src/lib/types.ts` -- add mic-enabled and trigger-template (base64) settings following the existing module shape -- CAP-2 persistence
- [x] `src/app/settings/voice-triggers.tsx` + `src/app/stack-screens.ts` -- new screen to record/re-record the 3 triggers, run distinguishability check before save -- CAP-3
- [x] `src/app/session/[id].tsx` + new `MicToggle` component -- wire mic toggle and matcher output into `useActiveSession().logCorrect/logIncorrect` -- CAP-1/CAP-2 parity
- [x] `__mocks__/` -- add manual mock for the capture module -- required for matcher/session tests under Jest
- [x] `src/lib/voice-matcher.test.ts`, `src/lib/settings.test.ts`, session integration test -- cover the I/O & Edge-Case Matrix -- required test coverage

**Acceptance Criteria:**
- Given mic toggle on, when the user's audio matches wake then Correct, then session counters update identically to tapping Correct.
- Given mic toggle off, when any audio occurs, then no capture happens and no counters change.
- Given a new trigger set with two acoustically similar recordings, when the user attempts to save, then save is blocked and any existing valid template set is unchanged.
- Given the mic toggle is turned on for the first time ever, when no prior permission decision exists, then the OS mic permission prompt appears at that moment and not before.

## Implementation Notes

- Native capture uses `expo-audio`'s `AudioModule.AudioStream` raw-PCM tap (imperative, module-level) rather than the file-based `AudioRecorder` — Android's `AndroidOutputFormat` has no PCM/WAV option, which this codebase has no decoder for. This is a newer, less-documented part of `expo-audio`'s surface; not yet exercised on a real device/simulator (no network access to cross-check docs during implementation).
- `DTW_MATCH_THRESHOLD`, `DISTINGUISHABILITY_MIN_DISTANCE`, and `COMMAND_WINDOW_MS` (`src/lib/voice-matcher.ts`) are engineering judgment tuned only against synthetic tone fixtures — no real recorded audio was available in this environment. Verification's manual-checks pass (real device, full session by voice) is required before trusting these values.
- MFCC extraction is an O(n²) DFT; even after a table-lookup optimization it is non-trivial synchronous JS-thread work on every ~1.5s listening window. Real-device performance is unverified.
- `mic-enabled` is intentionally not persisted (only trigger templates are) — component-local state in `MicToggle` alone satisfies "off by default every session" without a stored flag that would always be force-reset anyway.
- Step-03 Matrix Test Audit found the "Recording exceeds 2s" row uncovered by any test; added `src/lib/voice-capture.test.ts` (native `captureFor` auto-stop timing, via fake timers and an `expo-audio` mock) to close the gap before proceeding to review.

## Spec Change Log

- 2026-09-16 (step-02, token-count gate): Split CAP-4 (wake-word ON/OFF toggle) to `deferred-work.md` — spec exceeded the 1600-token target. CAP-1–CAP-3 remain in scope, shipping wake-then-command matching with gating always on. KEEP: the matcher's platform-agnostic PCM-buffer design (Intent) is unaffected — only the second matcher mode and its toggle are removed.

## Review Triage Log

- verdict: false | finding: voice-capture.test.ts untracked, absent from reviewed diff (Blind Hunter, Verification Gap) | evidence: `git add -N src/lib/voice-capture.test.ts` run before triage; regenerated diff now includes the file (confirmed via grep). Disproven.
- verdict: medium | route: patch | finding: `DISTINGUISHABILITY_MIN_DISTANCE` (25) < `DTW_MATCH_THRESHOLD` (40) in `voice-matcher.ts` (Blind Hunter) | evidence: verified — a pair of templates can pass the save-time distinguishability check (distance >= 25) while both still falling under 40 of a single live sample, so CAP-3's own protection can't guarantee unambiguous matching. Fix: raise the min-distance constant above the match threshold.
- verdict: low | route: patch | finding: `wav.ts` header comment references `voice-capture.ts`'s `PCM_WAV_OPTIONS`, a symbol that doesn't exist (Blind Hunter) | evidence: verified by reading `voice-capture.ts` in full — no such export or constant. Stale/incorrect cross-reference; fix the comment.
- verdict: high | route: patch | finding: `MicToggle` only stops capture on full component unmount, not on navigating away — stack navigation keeps the Active Session screen mounted underneath Settings/voice-triggers (Blind Hunter #14, Edge Case Hunter #2/#3) | evidence: verified — `src/app/_layout.tsx`'s `Stack` has no `unmountOnBlur`; a user can turn the mic on, navigate to Settings > Voice triggers, and record new takes while the session's listening loop is still live, contending for the mic and later matching against stale templates. Fix: stop listening on blur (e.g. `useFocusEffect` cleanup), not only on unmount.
- verdict: medium | route: patch | finding: a `recordTrigger()` take resolving with near-empty/silent audio passes `checkDistinguishability` via `Infinity` pairwise distance and gets saved as unusable (Edge Case Hunter #4) | evidence: verified in `voice-matcher.ts` — empty MFCC sequences make `dtwDistance` return `Infinity`, which is never `< DISTINGUISHABILITY_MIN_DISTANCE`, so a failed/silent capture "passes" as maximally distinguishable. Fix: reject a take with zero extracted MFCC frames before it reaches the distinguishability check.
- verdict: medium | route: patch | finding: `voice-capture.web.ts`'s `captureWindow` doesn't await `AudioContext.close()` before resolving, so the next listening window's context can be created before the previous one finishes closing (Blind Hunter #7) | evidence: verified — `context.close().catch(() => {})` is fire-and-forget in `finish()`; over a long listening session this risks accumulating unclosed contexts (Safari/iOS caps concurrent `AudioContext`s). Fix: await the close before resolving.
- verdict: medium | route: patch | finding: `MicToggle.start()` has no try/catch around `requestPermission()`/decode — a thrown (not merely denied) failure is an unhandled rejection and the toggle is silently stuck off (Edge Case Hunter #1) | evidence: verified by reading `MicToggle.tsx` in full — no try/catch around the async body. Fix: wrap in try/catch, surface the existing denial/error UI.
- verdict: low | route: patch | finding: `ScriptProcessorNode` (deprecated) used in `voice-capture.web.ts` with no comment on why (Blind Hunter #8) | evidence: verified — deliberate choice per Intent's "no library" constraint, undocumented. Fix: add a one-line comment.
- verdict: low | route: defer | finding: no test covers the web capture path's 2s auto-stop, only native (Blind Hunter #5) | evidence: verified — `voice-capture.test.ts` only mocks `expo-audio`; `voice-capture.web.ts`'s `stopAt`/defensive-timeout logic is untested. jsdom can't deterministically drive the real audio-callback loop it depends on.
- verdict: medium | route: defer | finding: `MicToggle` can leak live capture if the screen loses the in-flight `start()` before `requestPermission()` resolves (Verification Gap) | evidence: verified — no cancellation guard in `start()`'s async body; narrow timing window (permission resolves fast in practice). Distinct fix from the blur-based patch above (needs an is-still-current guard after the `await`).
- verdict: medium | route: defer | finding: `architecture.md` and `ux-design-specification.md` were never reconciled with `spec-voice-command-input.md`'s actual scope (CAP-1–3 only, CAP-4 deferred) and actual implementation (file layout, `voice-settings.ts` vs `settings.ts`, no `useVoiceCommand` hook) — critically, AD-6 promises trigger templates "persist as MFCC feature matrices only (never raw audio)" but the shipped code persists base64-encoded WAV audio directly (Blind Hunter #1, #12, #13, and confirmed independently by reading `voice-settings.ts`/`voice-triggers.tsx`) | evidence: verified across `architecture.md` lines 928-970 and `voice-settings.ts`/`voice-triggers.tsx` — real, privacy-relevant divergence between the architecture spec and shipped storage design, plus stale file paths and an unflagged CAP-4 (architecture/UX docs present it with the same confidence as shipped CAP-1-3, unlike PRD's explicit "(v1.2, planned)" tagging). Needs a documentation-reconciliation pass per CLAUDE.md §13.4, out of scope for this code-focused build.
- verdict: low | route: defer | finding: no `AppState` handling — capture keeps running (per code, not necessarily per OS) if the app backgrounds mid-session (Edge Case Hunter #6) | evidence: plausible but bounded — OS-level mic suspension on background likely limits real impact; not required by the frozen spec's Boundaries/AC. Worth a follow-up, not a blocker.
- verdict: maybe-false | route: defer | finding: `package-lock.json` includes dependency-resolution churn (`@emnapi/*` removal, new `peer` markers) beyond `expo-audio` itself (Blind Hunter #11) | evidence: consistent with npm's normal transitive re-resolution when adding a dependency, not necessarily a manual unrelated change; would need a clean `npm install` diff against pre-`expo-audio` state to confirm. If true, only `low` severity.
- verdict: low | route: defer | finding: `decodeWav` doesn't validate a missing `fmt ` chunk (`sampleRate` silently stays 0) (Edge Case Hunter #5) | evidence: verified the code lacks the guard, but `decodeWav` only ever reads this app's own `encodeWav` output (no WAV-import feature exists), so the scenario is not reachable through any current code path; the downstream effect (empty MFCC, `Infinity` distance) is already safely absorbed.
- verdict: low | route: reject | finding: spec's Code Map says voice settings extend `settings.ts`/`useSettings.ts`, but implementation adds separate `voice-settings.ts` (Blind Hunter #2, Edge Case Hunter #7, #8, #9 — all spec-text-vs-code claims) | evidence: real drift, but every proposed fix is to edit `spec-voice-command-input.md` itself, which is excluded from patching per this workflow's own triage rule.
- verdict: low | route: reject | finding: `VoiceMatcher`'s `AWAITING_COMMAND` timeout branch discards the triggering window instead of rechecking it against the wake template (Blind Hunter #9) | evidence: real code path, but unlikely to be met in everyday use (user just says the wake word again) and the fix adds a new branch/state rather than a direct correction.
- verdict: low | route: reject | finding: `processWindow`'s tie-break favors "correct" on an exact DTW-distance tie, untested (Blind Hunter #10) | evidence: real code path, but an exact floating-point tie between two independently computed DTW distances is effectively unreachable in practice; fix would add untested complexity for negligible benefit.

## Verification

**Commands:**
- `npm test` -- expected: all new and existing tests pass, including matcher fixture-audio tests and session-integration tests
- `npm run lint` -- expected: no new lint errors

**Manual checks (if no CLI):**
- Run the app on native and web and complete a full session logging Correct/Incorrect entirely by voice, confirming resulting counters match a manual-tap run of the same repetition sequence.
