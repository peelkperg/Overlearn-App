# Sprint Change Proposal — Epic 7 Planning/Implementation Reconciliation

**Date:** 2026-09-20
**Author:** Claude (bmad-correct-course), with Gerardo
**Status:** Approved, ready for implementation

## 1. Issue Summary

Epic 7 (Voice-Command Correct/Incorrect Input) was broken into stories 7.1–7.5 during planning, with detailed acceptance criteria drawn from `architecture.md`'s Voice-Command Architectural Decisions section and `ux-design-specification.md`'s Voice-Command Design Additions section.

Implementation went through a different route: `bmad-spec` condensed the same intent into `spec-voice-command-input.md` (a standalone, self-contained spec, per the "spec is the sole source of truth" convention `bmad-build` uses), and `bmad-build` implemented directly from that spec — not from `epics.md`'s stories. The condensation (done to fit the spec's 900–1600 token budget) silently dropped several requirements the fuller planning had specified, without flagging them as deferred the way it explicitly flagged CAP-4 (wake-word toggle) in its Spec Change Log.

Result: CAP-1–3 shipped successfully (PR #2, branch `feat/voice-command-input`, commits `80573fe` and `178d947`, 469/469 tests passing, reviewed via a three-layer process with findings patched before merge) — but `epics.md` stories 7.1–7.4, `architecture.md`'s `AD-1`–`AD-7`, and `ux-design-specification.md`'s Voice-Command Design Additions section no longer match what was actually built.

**Discovered:** during a `bmad-sprint-planning` readiness-gate run ahead of refreshing `sprint-status.yaml` for epic-7. Full evidence trail in `_bmad-output/planning-artifacts/implementation-readiness.md`.

## 2. Impact Analysis

**Epic impact:** Epic 7 is the last planned epic — no downstream epics or dependencies affected, no resequencing needed. Story 7.5 (CAP-4) is unaffected and consistent with its already-recorded `deferred-work.md` deferral.

**Story impact:** Stories 7.1–7.4 need their acceptance criteria corrected to match shipped reality (module/hook names, storage format, entry points). Five concrete gaps between the original design and what shipped are real, valuable, and worth tracking rather than silently dropping — spun out as new backlog stories 7.6–7.10.

**Artifact conflicts:**
- **PRD:** none — FR44–47 are appropriately high-level, already tagged `(v1.2, planned)`, NFR8/9 unaffected regardless of storage format. No change.
- **Architecture:** real conflicts in `AD-1` (file paths, hook vs. component), `AD-3` (file layout), `AD-4` (hook vs. component-local state; undelivered `AppState` handling), `AD-6` (MFCC-only storage promised, raw WAV shipped; undelivered background-discard), and the Gap Analysis (web-platform parity was delivered, not deferred as previously stated). `AD-2`/`AD-7` (CAP-4) remain valid as forward design — not yet built.
- **UX spec:** the Voice-Command Design Additions section was honestly labeled "Designed, not implemented" at the time it was written, so it's not a false claim — just now stale against what actually shipped. Needs inline reconciliation.
- **Other artifacts:** no CI/deploy/infra/testing-strategy impact.

**Technical impact:** none required by this proposal — it corrects documentation to match already-shipped, already-tested, already-reviewed code. New backlog stories (7.6–7.10) represent *future* technical work, not required by this change.

## 3. Recommended Approach

**Direct Adjustment** (Option 1): amend `epics.md`, `architecture.md`, and `ux-design-specification.md` to match shipped reality, and add new backlog stories for the genuinely valuable undelivered pieces.

**Rejected — Rollback** (Option 2): code is shipped, tested (469/469), reviewed (three-layer process, findings patched), and in an open PR (#2). Reverting would waste validated work for no benefit.

**Rejected — PRD/MVP Review** (Option 3): not needed. PRD is already accurate and unaffected; no MVP scope change required.

**Effort:** Low (documentation-only for this pass; new backlog stories are unscheduled, no commitment to build them now).
**Risk:** Low — no code changes, no rework of validated work.
**Timeline impact:** None on the current PR. New stories add to the backlog, not the current sprint.

## 4. Detailed Change Proposals

### 4.1 `epics.md` — Story 7.1 (MFCC/DTW Matching Core)

Updated module references (`mfcc.ts`/`dtw.ts` → `voice-matcher.ts`), corrected the test-fixture AC to state synthetic (not recorded) audio fixtures were used, added a Done status line.

*Full diff presented and approved in conversation.*

### 4.2 `epics.md` — Story 7.2 (Trigger Recording Flow)

Revised ACs to match shipped reality: Settings-only entry point (no first-entry launch), base64-WAV storage (not MFCC-only), generic pair-naming rejection (not targeted-to-later-trigger), text-label recording indicator (no progress ring), no playback affordance, no background-discard handling. Marked Done for what shipped; undelivered pieces moved to new Stories 7.6–7.9.

*Full diff presented and approved in conversation.*

### 4.3 `epics.md` — Story 7.3 (Mic Toggle & Permission Lifecycle)

Updated references from a `useVoiceCommand` hook/`listening` boolean to `MicToggle`'s component-local `micOn` state; updated denial-copy wording to match shipped text; noted the focus-based stop (added during this build's own review pass) as a strict improvement over the originally-scoped unmount-only stop; flagged the AppState/backgrounding gap, pointing to new Story 7.9.

*Full diff presented and approved in conversation.*

### 4.4 `epics.md` — Story 7.4 (Voice-Logged Correct/Incorrect During a Session)

Naming-only update (`createMatcher()` → `VoiceMatcher`); no behavioral gaps found — state machine, ambient-noise rejection, timeout revert, and the exact `logCorrect`/`logIncorrect` call path all match what shipped. Marked Done.

*Full diff presented and approved in conversation.*

### 4.5 `epics.md` — Story 7.5 (Wake-Word On/Off Toggle)

No change — already consistent with the CAP-4 deferral recorded in `deferred-work.md`.

### 4.6 `epics.md` — New Stories 7.6–7.10

Five new backlog stories added after Story 7.5:
- **7.6** First-Entry Recording Flow Launch
- **7.7** Recording Flow Polish (Playback + Progress Indicator)
- **7.8** Targeted Distinguishability-Rejection Recovery
- **7.9** Backgrounding Safety for Voice Capture
- **7.10** MFCC-Only Trigger Storage (Privacy Hardening) — flagged as a product/privacy tradeoff decision requiring explicit sign-off before scheduling, not a pure bug fix.

*Full story text presented and approved in conversation.*

### 4.7 `architecture.md` — Voice-Command Architectural Decisions section

Full rewrite of `AD-1` through `AD-7`, the Project Structure Additions file tree, Requirements-to-Structure Mapping, Enforcement Guidelines, and Gap Analysis to describe what actually shipped. `AD-2`/`AD-7` (CAP-4) explicitly marked as not-yet-built forward design. `AD-6`'s raw-audio-vs-MFCC-only conflict documented as a tracked, sign-off-pending deviation (Story 7.10), not silently corrected or silently ignored. Web-platform-parity gap-analysis entry corrected (delivered, not deferred).

*Full replacement text presented and approved in conversation.*

### 4.8 `ux-design-specification.md` — frontmatter + Voice-Command Design Additions section

`versionCoverage.v1.2` updated to reflect partial delivery. Inline status markers added throughout the Voice-Command Design Additions section, marking each design element delivered or not (with story pointers for the latter): mic toggle (delivered), wake-word switch (not built, Story 7.5), first-entry launch (not shipped, Story 7.6), progress-ring/playback (not shipped, Story 7.7), targeted-rejection recovery (not shipped, Story 7.8), background-discard (not shipped, Story 7.9).

*Full diff presented and approved in conversation.*

## 5. Implementation Handoff

**Scope classification: Minor** — all changes are documentation corrections to already-shipped, already-approved work. No code changes required by this proposal.

**Handoff:** Applied directly in this session (solo-developer project, no separate PO/Dev split in play). New backlog stories 7.6–7.10 require no immediate action — they sit in `epics.md` and (once `sprint-status.yaml` is refreshed via a follow-up `bmad-sprint-planning` run) will appear as `backlog` entries for future prioritization.

**Success criteria:** `epics.md`, `architecture.md`, and `ux-design-specification.md` no longer claim or imply behavior that doesn't match `feat/voice-command-input`'s shipped code; every real gap between original design and shipped reality is tracked as a named backlog story rather than silently lost.
