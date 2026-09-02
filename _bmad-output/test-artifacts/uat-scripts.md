---
author: Claude (Master Test Architect, Murat persona), for Gerardo
date: 2026-09-01
project: Overlearn
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/test-artifacts/traceability-matrix.md
  - _bmad-output/test-artifacts/test-design-qa.md
  - _bmad-output/test-artifacts/test-design-architecture.md
build: EAS Android preview 47808a93 (main @ 27fc77d)
---

# UAT Scripts: Overlearn

**Purpose:** End-user-executable walkthroughs for a human to run on the real Android APK. Distinct from the Jest suite (164 tests, `src/**/*.test.{ts,tsx}`) — these exist specifically for the things a test renderer cannot check: real backgrounding, real process kill, real haptics/vibration/TalkBack, real touch-target feel. No `_bmad` tooling reads or executes this file; it's a checklist for you.

**Platform:** Android only, per `test-design-qa.md`'s accepted scope (iOS never built or verified). Portrait orientation only (landscape explicitly out of scope for MVP, UX-DR12).

**Known, accepted gaps — not bugs if you observe these:**
- **No sound** on the alert tier (target-raise) or completion tier. `src/assets/sounds/` is a placeholder; every other channel (haptic, visual, screen-reader) is implemented. Confirmed deliberate gap.
- No CI, no Maestro/on-device automation exists — this document is the substitute for the on-device E2E suite `test-design-qa.md` originally planned (P0-007, P0-008, P0-009) and never built.

**How to use:** Work top to bottom within a priority tier; P0 first. Check a box, and where a step says "note," write down anything that didn't match — timing, wording, visual glitches — even if you'd still call the overall script a pass.

---

## 0. Setup

### UAT-00: Install and launch

**Priority:** P0 — blocks every other script.

1. Install build `47808a93` on a real Android device (link in state-of-work / EAS dashboard).
2. Launch the app.

**Expected:** App opens to the segment list (empty state, since this is a first install) with no crash, no splash screen stuck on top of the UI, no immediate white/black screen. This is the first real-device check since the splash-overlay and navigation-Stack fixes earlier this project — confirm taps register normally on the very first screen before continuing.

- [x] Pass — Notes: ___________________________

---

## 1. Segment Management (Epic 1)

### UAT-01: Create the first segment (empty state)

**Priority:** P0 · **FRs:** FR1, FR7

1. From the empty segment list, tap **Create segment**.
2. Enter a name (e.g. "Bar 24 arpeggio") and confirm.

**Expected:** Returns to the list; the new segment appears immediately.

- [x] Pass — Notes: Functionality correct. Layout bug found: the name input sat almost under the Android status bar (`segment/new.tsx` was the only screen not wrapped in `SafeAreaView`). Fixed same session — screen now wraps its content in `SafeAreaView` like every other screen. Re-verify on next build.

### UAT-02: Empty-name validation

**Priority:** P1 · **FR:** FR1

1. Tap **New segment**.
2. Leave the name field empty (or whitespace-only) and try to confirm.

**Expected:** Inline validation error shown; no segment created; form stays open.

- [ ] Pass — Notes: ___________________________

### UAT-03: Multiple segments, no limit

**Priority:** P1 · **FRs:** FR2, FR4

1. Create at least 4–5 more segments with distinct names.

**Expected:** All appear in the list, each independently; no cap encountered; scrolling works if the list exceeds one screen.

- [ ] Pass — Notes: ___________________________

### UAT-04: Select a segment

**Priority:** P0 · **FR:** FR3

1. Tap any segment in the list.

**Expected:** Opens the Segment Detail screen showing the segment's name and a **Start** action.

- [x] Pass — Notes: Opening the segment itself worked fine. The bug reported against this step turned out to actually be in UAT-07 (tapping **Start**) — see that script.

### UAT-05: Archive a segment

**Priority:** P1 · **FR:** FR5

1. From the list, open a segment's row menu and choose **Archive**.

**Expected:** Segment disappears from the default list. (No "view archived" UI exists yet by design — data preservation is verified structurally, not visually, in this build.)

- [ ] Pass — Notes: ___________________________

### UAT-06: Delete a segment

**Priority:** P1 · **FR:** FR6

1. Complete at least one full session on a segment first (see §2) so it has history.
2. From the list, open that segment's row menu and choose **Delete**.

**Expected:** Segment disappears from the list permanently. Re-creating a segment with the same name afterward shows no leftover history (confirms the cascade).

- [ ] Pass — Notes: ___________________________

---

## 2. Practice Session Lifecycle & Active Session Interaction (Epic 2)

### UAT-07: Start a session with zero setup

**Priority:** P0 · **FRs:** FR8, FR9 · **UX:** UX-DR1, UX-DR6, UX-DR8

1. Open a segment's detail screen, tap **Start**.

**Expected:**
- Session begins immediately — no input screen, no confirmation step.
- Readout shows `0/5`.
- Layout: Correct button top (~40%, green, checkmark, no text), Incorrect button bottom (~40%, red, ✕, no text), readout centered with segment name, Restart small/subordinate at the bottom edge.
- Dark background; Correct/Incorrect distinguishable by position + icon even if you can't see color.

- [x] Pass — Notes: **Found a critical bug**, fixed same session. Tapping Start showed Home's resume/discard prompt over the just-started session (a false "interrupted session" — Home stays mounted underneath every pushed screen and was reading any incomplete session, including a brand-new one, as if it were a leftover interruption). Tapping Discard on it then left the Active Session screen on a dead blank view with no way out. Root cause: `showResumeDialog` in `app/index.tsx` wasn't distinguishing "a session that existed before this screen mounted" from "a session just started normally." Fixed by snapshotting the interrupted session's identity at mount and gating the prompt on that snapshot, plus a defensive fallback in `session/[id].tsx` so a session vanishing out from under that screen bounces to the list instead of rendering blank. New regression test (`src/app-tests/home-session-interaction.test.tsx`) renders both screens together, the way the real navigator does, and would have caught this. Re-verify on next build.

### UAT-08: Log Correct — streak progresses

**Priority:** P0 · **FRs:** FR16, FR18 · **NFR:** NFR1

1. Tap Correct 2–3 times in a row, watching the readout.

**Expected:** Each tap increments the numerator and *feels* instant (no visible lag before the number changes) — light haptic tick on each tap, nothing else.

- [ ] Pass — Notes: ___________________________

### UAT-09: Log Incorrect — streak resets, target holds at the floor

**Priority:** P0 · **FRs:** FR10, FR11, FR17, FR18

1. From `0/5`, tap Correct twice (now `2/5`), then tap Incorrect once.

**Expected:** Numerator resets to 0. Denominator stays at `5` (still under the raise threshold). A visible pulse + light haptic fires — no alert-tier flash/vibration yet.

- [ ] Pass — Notes: ___________________________

### UAT-10: Target raises past the miss threshold

**Priority:** P0 · **FRs:** FR10, FR11 · **UX:** UX-DR3, UX-DR8

1. From a fresh session, tap Incorrect 11 times in a row.

**Expected:** On the 11th tap specifically: screen flash (amber, distinct from green/red), a noticeable vibration, and — if TalkBack/VoiceOver is on — an announcement of "Target raised to 6". Denominator visibly changes from `5` to `6`. **No sound is expected** (known gap, not a bug).

- [ ] Pass — Notes: ___________________________

### UAT-11: No undo affordance

**Priority:** P2 · **FR:** FR19

1. After any Correct or Incorrect tap, look for any way to undo it (long-press, swipe, shake, a visible undo button).

**Expected:** None exists anywhere on the Active Session screen. The tap is final.

- [ ] Pass — Notes: ___________________________

### UAT-12: Restart requires confirmation

**Priority:** P0 · **FRs:** FR20, FR21

1. Mid-session (streak > 0), tap **Restart**.
2. On the confirmation dialog, tap **Cancel**.
3. Tap **Restart** again, this time confirm.

**Expected:** Step 1 shows a dialog reading exactly "Restart session? Progress will be lost." Step 2 leaves the session completely unchanged (streak/target as before). Step 3 resets to `0/5` and returns to the Active Session screen — no history entry is created for the discarded attempt (verify later via UAT-19).

- [ ] Pass — Notes: ___________________________

### UAT-13: Session auto-completes at target, input locks

**Priority:** P0 · **FRs:** FR12, FR22 · **UX:** UX-DR3

1. From `0/5`, tap Correct 5 times in a row without missing.

**Expected:** On the 5th tap, the screen transitions automatically to the Completion screen — no manual "I'm done" action. A haptic pulse fires (distinct feel from the alert-tier vibration). Correct/Incorrect/Restart are gone, not just disabled.

- [ ] Pass — Notes: ___________________________

### UAT-14: Completion summary is accurate

**Priority:** P0 · **FR:** FR13

1. On the Completion screen from UAT-13, read the summary.

**Expected:** Shows the segment name, final target reached (`5`), total correct, total incorrect, total attempts — all matching what you actually did. Done and Repeat actions both present.

- [ ] Pass — Notes: ___________________________

### UAT-15: Done writes history and returns to the list

**Priority:** P0 · **FR:** FR14

1. On the Completion screen, tap **Done**.

**Expected:** Returns to the segment list (not the detail screen). Opening that segment's detail screen afterward shows the completed session in its history (verify fully in §4).

- [ ] Pass — Notes: ___________________________

### UAT-16: Repeat starts a new session immediately

**Priority:** P1 · **FR:** FR15

1. Complete another session (5 correct in a row).
2. On the Completion screen, tap **Repeat** instead of Done.

**Expected:** A fresh session starts immediately at `0/5`, same segment, no navigation detour. The just-finished session does **not** appear in history (only a later Done would record it) — check this once you've done a Done afterward.

- [ ] Pass — Notes: ___________________________

---

## 3. Session Interruption & Recovery (Epic 2) — the highest-priority section

This is the one area Jest structurally cannot verify (it never renders a real OS backgrounding or process kill) and the trace's gate-FAIL called out as the single largest gap (FR24 had zero automated coverage before this pass). Treat every script here as P0 regardless of the label.

### UAT-17: Background the app mid-session, then return

**Priority:** P0 · **FRs:** FR23 · **NFR:** NFR3

1. Start a session, tap Correct twice and Incorrect once (streak should read `0/5`, one miss logged).
2. Press the device Home button (don't force-close — just background it).
3. Wait a few seconds, then reopen Overlearn from Recents.

**Expected:** Returns to the exact same Active Session screen, same state — no resume/discard prompt (the session was never actually killed, just backgrounded).

- [ ] Pass — Notes: ___________________________

### UAT-18: Force-kill mid-session, relaunch → resume/discard prompt

**Priority:** P0 · **FRs:** FR24 · **NFR:** NFR4 · *(this is the FR that had zero test coverage before this session — the most important script in this document)*

1. Start a session, tap Correct once and Incorrect once.
2. Force-stop the app (Android Settings → Apps → Overlearn → Force stop, or swipe it away from Recents — force-stop is the stronger check).
3. Relaunch the app from the home screen icon.

**Expected:** A dialog appears naming the interrupted segment and offering **Resume** / **Discard** — never silently resuming into the session, never silently dropping it back to an empty list. The Android back button must **not** dismiss this dialog (try it) — it stays up until you tap one of the two buttons.

- [ ] Pass — Notes: ___________________________

### UAT-19: Resume restores exact prior state

**Priority:** P0 · **FR:** FR25

1. Repeat UAT-18's setup (kill mid-session with known state, e.g. 1 correct, 1 incorrect).
2. On the resume/discard prompt, tap **Resume**.

**Expected:** Active Session screen reappears with the exact streak/target/miss-count you left it at (not reset to `0/5`).

- [ ] Pass — Notes: ___________________________

### UAT-20: Discard clears state, no history written

**Priority:** P0 · **FRs:** FR26, FR29

1. Repeat UAT-18's setup.
2. On the resume/discard prompt, tap **Discard**.

**Expected:** Returns to the segment list; no active session remains (relaunching the app again shows no prompt). Opening that segment's history afterward (§4) shows **no entry** for the discarded attempt.

- [ ] Pass — Notes: ___________________________

### UAT-21: Kill while Completion screen is showing → relaunch goes straight there

**Priority:** P1 · *(Story 2.6's AC — distinct from UAT-18: this is the `session_complete = true` branch of the same 3-way relaunch decision)*

1. Complete a session (5 correct in a row) but do **not** tap Done or Repeat.
2. Force-stop the app while the Completion screen is still showing.
3. Relaunch.

**Expected:** Goes directly to the Completion screen with the same summary — **not** the resume/discard prompt. This is the third branch of the relaunch decision (no session / interrupted session / already-complete session) and is easy to get wrong if only two branches were tested.

- [ ] Pass — Notes: ___________________________

---

## 4. Practice History (Epic 3)

### UAT-22: Chronological history list

**Priority:** P1 · **FRs:** FR27, FR28

1. Complete 2–3 sessions on the same segment via Done (vary the number of mistakes between them).
2. Open that segment's detail screen and view its history.

**Expected:** Each entry shows date, final target streak achieved, total mistakes, and total attempts — in chronological order (most recent session distinguishable from earlier ones by date/order).

- [ ] Pass — Notes: ___________________________

### UAT-23: Non-completed sessions never appear in history

**Priority:** P0 · **FR:** FR29 · *(ties together UAT-12's Restart, UAT-16's Repeat, and UAT-20's Discard — all three must leave zero trace)*

1. On a segment with existing history, start a session, log a couple of taps, then **Restart** and confirm.
2. Start again, log taps, then background-kill-**Discard** (UAT-20's flow).
3. Open the segment's history.

**Expected:** History is unchanged from before step 1 — the restarted and discarded attempts do not appear anywhere in the list.

- [ ] Pass — Notes: ___________________________

### UAT-24: Empty history state

**Priority:** P2

1. Open the detail screen of a freshly created segment with no completed sessions.

**Expected:** History section shows an empty/no-sessions message — no error, no placeholder/fake data.

- [ ] Pass — Notes: ___________________________

---

## 5. Accessibility & Non-Functional Spot Checks

These need a human judgment call a test renderer can't make — device feel, real screen-reader audio, real finger taps.

### UAT-25: Touch target size

**Priority:** P2 · **NFR:** NFR6

1. Tap Correct, Incorrect, and Restart near their edges, not dead center.

**Expected:** All three register reliably even on an off-center tap — no need to hit a tiny hotspot.

- [ ] Pass — Notes: ___________________________

### UAT-26: Correct vs. Incorrect distinguishable without color

**Priority:** P2 · **NFR:** NFR7

1. If your device has a grayscale/color-correction accessibility mode, enable it (or just judge by position + icon shape alone).

**Expected:** Still obviously clear which button is Correct (top, ✓) vs. Incorrect (bottom, ✕) without relying on the green/red color alone.

- [ ] Pass — Notes: ___________________________

### UAT-27: TalkBack announcements

**Priority:** P1 · **UX:** UX-DR3, UX-DR8

1. Enable TalkBack (Android accessibility settings).
2. Trigger a target-raise (11 misses) and then a completion (5 correct in a row).

**Expected:** TalkBack speaks "Target raised to 6" (or the actual new target) on the raise, and something to the effect of "Session complete. Target of 5 reached." on completion — in addition to the visual/haptic feedback, not instead of it.

- [ ] Pass — Notes: ___________________________

### UAT-28: Dynamic type scaling

**Priority:** P2 · **UX:** UX-DR7

1. In Android display settings, increase font size to the largest setting.
2. Reopen the Active Session screen.

**Expected:** The streak readout remains legible and doesn't get clipped or overlap other elements.

- [ ] Pass — Notes: ___________________________

### UAT-29: Tap-to-render latency feel

**Priority:** P1 · **NFR:** NFR1, NFR2

1. Tap Correct/Incorrect rapidly several times in a row.

**Expected:** No perceptible lag or dropped taps between tap and the readout updating — should feel instant, not "eventually catches up."

- [ ] Pass — Notes: ___________________________

### UAT-30: No network activity

**Priority:** P2 · **NFR:** NFR8

1. Enable Airplane Mode before opening the app.
2. Use the app normally — create a segment, run a full session, view history.

**Expected:** Everything works identically with no connectivity — no error banners, no degraded behavior, no hidden retry/sync attempts.

- [ ] Pass — Notes: ___________________________

### UAT-31: No account or identity concept

**Priority:** P3 · **NFR:** NFR9

1. Look through every screen in the app (list, detail, session, completion, history, any settings/menu).

**Expected:** No login, sign-up, profile, or account screen exists anywhere.

- [ ] Pass — Notes: ___________________________

---

## Summary

| Section | Scripts | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|
| 0. Setup | 1 | 1 | – | – | – |
| 1. Segment Management | 6 | 2 | 4 | – | – |
| 2. Session Lifecycle & Interaction | 10 | 8 | 1 | 1 | – |
| 3. Interruption & Recovery | 5 | 4 | 1 | – | – |
| 4. Practice History | 3 | 1 | 1 | 1 | – |
| 5. Accessibility & NFR | 7 | – | 2 | 4 | 1 |
| **Total** | **32** | **16** | **9** | **6** | **1** |

**Minimum bar before calling this build release-ready:** all P0 scripts pass, especially §3 (UAT-17 through UAT-21) — that section is the direct manual stand-in for the traceability trace's single biggest gap (FR24, previously zero coverage) and for the on-device E2E suite (P0-007/P0-008 in `test-design-qa.md`) that was planned but never built.

**When a script fails:** note it under that script rather than stopping — file it the same way you would a bug found in code review (what happened vs. expected, exact repro steps), and keep going through the rest of the list. A failed P0 script blocks release; a failed P1/P2 is a triage decision, not an automatic blocker.
