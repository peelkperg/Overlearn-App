---
author: Claude (Master Test Architect, Murat persona), for Gerardo
date: 2026-09-01
project: Overlearn
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/test-artifacts/traceability-matrix.md
  - _bmad-output/test-artifacts/test-design-qa.md
  - _bmad-output/test-artifacts/test-design-architecture.md
build: EAS Android preview 47808a93 (main @ 27fc77d); full re-run and all 31 active scripts passing on build 5a47a7a5 (main @ 2cd9fa2), 2026-09-02
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

**Found via a genuine uninstall/reinstall test, fixed same session:** a full clear-data + force-stop + uninstall + reinstall still came back with old segments and an interrupted-session prompt — "empty state" was not actually reachable. Root cause: Android's Auto Backup (on by default, not something the app code controls) had silently copied app-private storage, MMKV's files included, to the device's Google account, and restored it on reinstall — a real conflict with this app's "zero data leaves the device" design despite no app code doing anything wrong. Fixed via `app.json`'s `android.allowBackup: false`. **Re-verified 2026-09-02 on build 5a47a7a5, same uninstall/reinstall procedure — CONFIRMED FIXED.**

---

## 1. Segment Management (Epic 1)

### UAT-01: Create the first segment (empty state)

**Priority:** P0 · **FRs:** FR1, FR7

1. From the empty segment list, tap **Create segment**.
2. Enter a name (e.g. "Bar 24 arpeggio") and confirm.

**Expected:** Returns to the list; the new segment appears immediately.

- [x] Pass — Notes: Functionality correct. Layout bug found: the name input sat almost under the Android status bar (`segment/new.tsx` was the only screen not wrapped in `SafeAreaView`). Fixed same session — screen now wraps its content in `SafeAreaView` like every other screen. **Re-verified 2026-09-02 on build 5a47a7a5 — CONFIRMED FIXED.**

### UAT-02: Empty-name validation

**Priority:** P1 · **FR:** FR1

1. Tap **New segment**.
2. Leave the name field empty (or whitespace-only) and try to confirm.

**Expected:** Inline validation error shown; no segment created; form stays open.

- [x] Pass — Notes: ___________________________

### UAT-03: Multiple segments, no limit

**Priority:** P1 · **FRs:** FR2, FR4

1. Create at least 4–5 more segments with distinct names.

**Expected:** All appear in the list, each independently; no cap encountered; scrolling works if the list exceeds one screen.

- [x] Pass — Notes: ___________________________

### UAT-04: Select a segment

**Priority:** P0 · **FR:** FR3

1. Tap any segment in the list.

**Expected:** Opens the Segment Detail screen showing the segment's name and a **Start** action.

- [x] Pass — Notes: Opening the segment itself worked fine. The bug reported against this step turned out to actually be in UAT-07 (tapping **Start**) — see that script.

### UAT-05: REMOVED — Archive a segment

FR5/Archive was removed from the app on 2026-09-02, after this script passed against the build then installed (see `epics.md`). Script number retained, not reassigned, so later script numbers stay stable. **If you still have a build from before the removal**, any segment you archived under it will simply reappear in the active list on the next build — that's expected, not a bug: there is no more archived state to hide it.

### UAT-06: Delete a segment

**Priority:** P1 · **FR:** FR6

1. Complete at least one full session on a segment first (see §2) so it has history.
2. From the list, open that segment's row menu and choose **Delete**.

**Expected:** Segment disappears from the list permanently. Re-creating a segment with the same name afterward shows no leftover history (confirms the cascade).

- [x] Pass — Notes: Cascade with history re-verified 2026-09-02 on build 5a47a7a5 (§2 now fully passing).

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

- [x] Pass — Notes: **Found a critical bug**, fixed same session. Tapping Start showed Home's resume/discard prompt over the just-started session (a false "interrupted session" — Home stays mounted underneath every pushed screen and was reading any incomplete session, including a brand-new one, as if it were a leftover interruption). Tapping Discard on it then left the Active Session screen on a dead blank view with no way out. Root cause: `showResumeDialog` in `app/index.tsx` wasn't distinguishing "a session that existed before this screen mounted" from "a session just started normally." Fixed by snapshotting the interrupted session's identity at mount and gating the prompt on that snapshot, plus a defensive fallback in `session/[id].tsx` so a session vanishing out from under that screen bounces to the list instead of rendering blank. New regression test (`src/app-tests/home-session-interaction.test.tsx`) renders both screens together, the way the real navigator does, and would have caught this. **Re-verified 2026-09-02 on build 5a47a7a5 — CONFIRMED FIXED.**

### UAT-08: Log Correct — streak progresses

**Priority:** P0 · **FRs:** FR16, FR18 · **NFR:** NFR1

1. Tap Correct 2–3 times in a row, watching the readout.

**Expected:** Each tap increments the numerator and *feels* instant (no visible lag before the number changes) — light haptic tick on each tap, nothing else.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-09: Log Incorrect — streak resets, target holds at the floor

**Priority:** P0 · **FRs:** FR10, FR11, FR17, FR18

1. From `0/5`, tap Correct twice (now `2/5`), then tap Incorrect once.

**Expected:** Numerator resets to 0. Denominator stays at `5` (still under the raise threshold). A visible pulse + light haptic fires — no alert-tier flash/vibration yet.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-10: Target raises past the miss threshold

**Priority:** P0 · **FRs:** FR10, FR11 · **UX:** UX-DR3, UX-DR8

1. From a fresh session, tap Incorrect 11 times in a row.

**Expected:** On the 11th tap specifically: screen flash (amber, distinct from green/red), a noticeable vibration, and — if TalkBack/VoiceOver is on — an announcement of "Target raised to 6". Denominator visibly changes from `5` to `6`. **No sound is expected** (known gap, not a bug).

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-11: No undo affordance

**Priority:** P2 · **FR:** FR19

1. After any Correct or Incorrect tap, look for any way to undo it (long-press, swipe, shake, a visible undo button).

**Expected:** None exists anywhere on the Active Session screen. The tap is final.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-12: Restart requires confirmation

**Priority:** P0 · **FRs:** FR20, FR21

1. Mid-session (streak > 0), tap **Restart**.
2. On the confirmation dialog, tap **Cancel**.
3. Tap **Restart** again, this time confirm.

**Expected:** Step 1 shows a dialog reading exactly "Restart session? Progress will be lost." Step 2 leaves the session completely unchanged (streak/target as before). Step 3 resets to `0/5` and returns to the Active Session screen — no history entry is created for the discarded attempt (verify later via UAT-19).

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

**Known fixed issue (found outside this checklist, on-device):** the Restart button itself sat at a fixed 8px from the bottom edge, landing directly under a 3-button-nav-bar phone's system Home button — unreliably tappable, sometimes swallowed by the OS instead of reaching the app. Fixed by insetting Restart's position by the device's actual bottom safe-area inset (`RestartControl.tsx`); Correct/Incorrect stay full-bleed as designed. **Re-verified 2026-09-02 on build 5a47a7a5 — CONFIRMED FIXED, Restart easily tappable.**

### UAT-13: Session auto-completes at target, input locks

**Priority:** P0 · **FRs:** FR12, FR22 · **UX:** UX-DR3

1. From `0/5`, tap Correct 5 times in a row without missing.

**Expected:** On the 5th tap, the screen transitions automatically to the Completion screen — no manual "I'm done" action. A haptic pulse fires (distinct feel from the alert-tier vibration). Correct/Incorrect/Restart are gone, not just disabled.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-14: Completion summary is accurate

**Priority:** P0 · **FR:** FR13

1. On the Completion screen from UAT-13, read the summary.

**Expected:** Shows the segment name, final target reached (`5`), total correct, total incorrect, total attempts — all matching what you actually did. Done and Repeat actions both present.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-15: Done writes history and returns to the list

**Priority:** P0 · **FR:** FR14

1. On the Completion screen, tap **Done**.

**Expected:** Returns to the segment list (not the detail screen). Opening that segment's detail screen afterward shows the completed session in its history (verify fully in §4).

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-16: Repeat starts a new session immediately

**Priority:** P1 · **FR:** FR15

1. Complete another session (5 correct in a row).
2. On the Completion screen, tap **Repeat** instead of Done.

**Expected:** A fresh session starts immediately at `0/5`, same segment, no navigation detour. The just-finished session does **not** appear in history (only a later Done would record it) — check this once you've done a Done afterward.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

---

## 3. Session Interruption & Recovery (Epic 2) — the highest-priority section

This is the one area Jest structurally cannot verify (it never renders a real OS backgrounding or process kill) and the trace's gate-FAIL called out as the single largest gap (FR24 had zero automated coverage before this pass). Treat every script here as P0 regardless of the label.

### UAT-17: Background the app mid-session, then return

**Priority:** P0 · **FRs:** FR23 · **NFR:** NFR3

1. Start a session, tap Correct twice and Incorrect once (streak should read `0/5`, one miss logged).
2. Press the device Home button (don't force-close — just background it).
3. Wait a few seconds, then reopen Overlearn from Recents.

**Expected:** Returns to the exact same Active Session screen, same state — no resume/discard prompt (the session was never actually killed, just backgrounded).

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-18: Force-kill mid-session, relaunch → resume/discard prompt

**Priority:** P0 · **FRs:** FR24 · **NFR:** NFR4 · *(this is the FR that had zero test coverage before this session — the most important script in this document)*

1. Start a session, tap Correct once and Incorrect once.
2. Force-stop the app (Android Settings → Apps → Overlearn → Force stop, or swipe it away from Recents — force-stop is the stronger check).
3. Relaunch the app from the home screen icon.

**Expected:** A dialog appears naming the interrupted segment and offering **Resume** / **Discard** — never silently resuming into the session, never silently dropping it back to an empty list. The Android back button must **not** dismiss this dialog (try it) — it stays up until you tap one of the two buttons.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-19: Resume restores exact prior state

**Priority:** P0 · **FR:** FR25

1. Repeat UAT-18's setup (kill mid-session with known state, e.g. 1 correct, 1 incorrect).
2. On the resume/discard prompt, tap **Resume**.

**Expected:** Active Session screen reappears with the exact streak/target/miss-count you left it at (not reset to `0/5`).

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-20: Discard clears state, no history written

**Priority:** P0 · **FRs:** FR26, FR29

1. Repeat UAT-18's setup.
2. On the resume/discard prompt, tap **Discard**.

**Expected:** Returns to the segment list; no active session remains (relaunching the app again shows no prompt). Opening that segment's history afterward (§4) shows **no entry** for the discarded attempt.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-21: Kill while Completion screen is showing → relaunch goes straight there

**Priority:** P1 · *(Story 2.6's AC — distinct from UAT-18: this is the `session_complete = true` branch of the same 3-way relaunch decision)*

1. Complete a session (5 correct in a row) but do **not** tap Done or Repeat.
2. Force-stop the app while the Completion screen is still showing.
3. Relaunch.

**Expected:** Goes directly to the Completion screen with the same summary — **not** the resume/discard prompt. This is the third branch of the relaunch decision (no session / interrupted session / already-complete session) and is easy to get wrong if only two branches were tested.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

---

## 4. Practice History (Epic 3)

### UAT-22: Chronological history list

**Priority:** P1 · **FRs:** FR27, FR28

1. Complete 2–3 sessions on the same segment via Done (vary the number of mistakes between them).
2. Open that segment's detail screen and view its history.

**Expected:** Each entry shows date, final target streak achieved, total mistakes, and total attempts — in chronological order (most recent session distinguishable from earlier ones by date/order).

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-23: Non-completed sessions never appear in history

**Priority:** P0 · **FR:** FR29 · *(ties together UAT-12's Restart, UAT-16's Repeat, and UAT-20's Discard — all three must leave zero trace)*

1. On a segment with existing history, start a session, log a couple of taps, then **Restart** and confirm.
2. Start again, log taps, then background-kill-**Discard** (UAT-20's flow).
3. Open the segment's history.

**Expected:** History is unchanged from before step 1 — the restarted and discarded attempts do not appear anywhere in the list.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-24: Empty history state

**Priority:** P2

1. Open the detail screen of a freshly created segment with no completed sessions.

**Expected:** History section shows an empty/no-sessions message — no error, no placeholder/fake data.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

---

## 5. Accessibility & Non-Functional Spot Checks

These need a human judgment call a test renderer can't make — device feel, real screen-reader audio, real finger taps.

### UAT-25: Touch target size

**Priority:** P2 · **NFR:** NFR6

1. Tap Correct, Incorrect, and Restart near their edges, not dead center.

**Expected:** All three register reliably even on an off-center tap — no need to hit a tiny hotspot.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-26: Correct vs. Incorrect distinguishable without color

**Priority:** P2 · **NFR:** NFR7

1. If your device has a grayscale/color-correction accessibility mode, enable it (or just judge by position + icon shape alone).

**Expected:** Still obviously clear which button is Correct (top, ✓) vs. Incorrect (bottom, ✕) without relying on the green/red color alone.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-27: TalkBack announcements

**Priority:** P1 · **UX:** UX-DR3, UX-DR8

1. Enable TalkBack (Android accessibility settings).
2. Trigger a target-raise (11 misses) and then a completion (5 correct in a row).

**Expected:** TalkBack speaks "Target raised to 6" (or the actual new target) on the raise, and something to the effect of "Session complete. Target of 5 reached." on completion — in addition to the visual/haptic feedback, not instead of it.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-28: Dynamic type scaling

**Priority:** P2 · **UX:** UX-DR7

1. In Android display settings, increase font size to the largest setting.
2. Reopen the Active Session screen.

**Expected:** The streak readout remains legible and doesn't get clipped or overlap other elements.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-29: Tap-to-render latency feel

**Priority:** P1 · **NFR:** NFR1, NFR2

1. Tap Correct/Incorrect rapidly several times in a row.

**Expected:** No perceptible lag or dropped taps between tap and the readout updating — should feel instant, not "eventually catches up."

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-30: No network activity

**Priority:** P2 · **NFR:** NFR8

1. Enable Airplane Mode before opening the app.
2. Use the app normally — create a segment, run a full session, view history.

**Expected:** Everything works identically with no connectivity — no error banners, no degraded behavior, no hidden retry/sync attempts.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

### UAT-31: No account or identity concept

**Priority:** P3 · **NFR:** NFR9

1. Look through every screen in the app (list, detail, session, completion, history, any settings/menu).

**Expected:** No login, sign-up, profile, or account screen exists anywhere.

- [x] Pass — Notes: Verified on build 5a47a7a5 (main @ 2cd9fa2).

---

## Summary

| Section | Scripts | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|
| 0. Setup | 1 | 1 | – | – | – |
| 1. Segment Management | 5 (+1 removed) | 2 | 3 | – | – |
| 2. Session Lifecycle & Interaction | 10 | 8 | 1 | 1 | – |
| 3. Interruption & Recovery | 5 | 4 | 1 | – | – |
| 4. Practice History | 3 | 1 | 1 | 1 | – |
| 5. Accessibility & NFR | 7 | – | 2 | 4 | 1 |
| **Total** | **31 active (+1 removed)** | **16** | **8** | **6** | **1** |

**Minimum bar before calling this build release-ready:** all P0 scripts pass, especially §3 (UAT-17 through UAT-21) — that section is the direct manual stand-in for the traceability trace's single biggest gap (FR24, previously zero coverage) and for the on-device E2E suite (P0-007/P0-008 in `test-design-qa.md`) that was planned but never built.

**When a script fails:** note it under that script rather than stopping — file it the same way you would a bug found in code review (what happened vs. expected, exact repro steps), and keep going through the rest of the list. A failed P0 script blocks release; a failed P1/P2 is a triage decision, not an automatic blocker.

---

## Final Result — 2026-09-02

**All 31 active scripts passing on build `5a47a7a5` (`main` @ `2cd9fa2`), including a full re-verification of every previously-fixed bug** (Auto Backup, `segment/new.tsx` status-bar overlap, the Start/false-prompt/blank-screen defect, Restart-button nav-bar overlap) via the exact repro procedure that originally found each one.

Minimum release bar (all P0 pass, §3 in full) is met.

Two things this checklist does not cover and remain open regardless of this result: iOS has never been built or verified (Android-only through this entire pass), and no formal `bmad-testarch-trace` re-run has happened since the FR5 removal and this session's fixes — the last formal gate decision (FAIL, 17% P0) predates all of it.

---

# v1.1 UAT Scripts: Epic 4 & Epic 5 (added 2026-09-06)

**Status: NOT YET EXECUTABLE.** No v1.1 code exists — Epic 4 and Epic 5 are fully specified (`epics.md`) and test-designed (`test-design-epic-4-5.md`) but not implemented. These scripts are written now so Story 4.1 onward has a ready on-device checklist the moment a build exists, matching this document's own purpose for v1.0. Boxes are left unchecked; do not check them until run against a real build, and record the build id in this section's own frontmatter-style note when that happens.

**Numbering continues from UAT-31** (v1.0's last active script) — this section is UAT-32 onward, same document, same rules (top to bottom, P0 first, note anything off).

## 6. Segment Organization & Insight (Epic 4)

### UAT-32: Rename a segment via the dedicated screen

**Priority:** P0 · **FRs:** FR30, FR31

1. Open a segment's row menu, tap **Rename**.
2. Change the name to something new and confirm.
3. While that segment has an in-progress or interrupted session (start one first, then background/kill and relaunch to reach the resume/discard prompt), repeat steps 1–2 from the list.

**Expected:** List and detail heading show the new name immediately. The active-session streak readout, the completion summary (finish that session next), and the resume/discard prompt (trigger it per UAT-18) all also show the new name — the specific cross-file behavior `test-design-epic-4-5.md` flags as risk R8.

- [ ] Pass — Notes: ___________________________

### UAT-33: Rename collision and self-rename

**Priority:** P1 · **FR:** FR30

1. Create two segments, "Bar 24" and "Bar 30".
2. Rename "Bar 30" to "bar 24" (different case, colliding name).
3. Rename "Bar 24" (the original) to "bar 24" (different case of its own name).

**Expected:** Step 2 produces a disambiguated name ("Bar 24 (2)"), never an error. Step 3 succeeds outright — a segment's own name in a different case is not treated as a collision with itself.

- [ ] Pass — Notes: ___________________________

### UAT-34: Duplicate a segment

**Priority:** P0 · **FR:** FR32

1. Practice a segment to build up some history, then duplicate it from the row menu.

**Expected:** A new segment appears with a disambiguated name, today's creation date, and an empty history log — the original segment's history is untouched. A snackbar confirms "Duplicated as '{name}'".

- [ ] Pass — Notes: ___________________________

### UAT-35: Sort the segment list

**Priority:** P0 · **FR:** FR33, FR34

1. With 3+ segments in varied states (some practiced, some not), open the "Sort: ▾" control and try each of the 4 options.
2. Tap the already-active option again.
3. Complete a session for a segment sorted by last-practiced or Solidification %, without leaving the list screen.
4. Close and relaunch the app.

**Expected:** Each option sorts correctly per its stated default direction; re-tapping the active option flips direction. The list re-orders live after step 3 with no manual refresh. After relaunch, the same sort option and direction are still applied.

- [ ] Pass — Notes: ___________________________

### UAT-36: View Solidification %

**Priority:** P1 · **FR:** FR38

1. Open the history log for a segment with completed sessions, and for a brand-new segment with none.

**Expected:** The practiced segment shows "Solidification: {percent}%" between the heading and the entry list. The brand-new segment shows "Solidification: —", never "0%".

- [ ] Pass — Notes: ___________________________

### UAT-37: Inline rename by press-and-hold

**Priority:** P0 · **FR:** FR40

1. Press and hold a segment's name in the list row for about 1 second.
2. Edit the name and press the keyboard's submit/return key.
3. Repeat, but tap outside the field without submitting.
4. Repeat, but submit an empty name.
5. Tap a segment row normally (a quick tap, not a hold).

**Expected:** Step 1 turns the name into an editable field in place with no layout jump. Step 2 saves and returns to static text. Step 3 discards the edit, reverting to the original name. Step 4 is rejected with an inline error, field stays editable. Step 5 still navigates to the segment's detail screen as before.

- [ ] Pass — Notes: ___________________________

## 7. Configurable Overlearning Target (Epic 5)

### UAT-38: Change the overlearning-% and see it apply to a new session

**Priority:** P0 · **FRs:** FR35, FR36

1. Tap the gear icon on the segment list header.
2. Use `+`/`−` to move the value away from 50%, noting the live worked example line updates.
3. Try to go below 50% or above 300%.
4. Start a new practice session on any segment.

**Expected:** Settings screen shows the stepper, worked example, and floor note. The buttons visibly disable at 50%/300%. The new session's target streak reflects the changed percentage, not the old one.

- [ ] Pass — Notes: ___________________________

### UAT-39: Change the target mid-session

**Priority:** P0 · **FR:** FR37

1. Start a practice session and log a few mistakes so a target streak is showing.
2. Without ending the session, navigate to Settings and change the overlearning-%.
3. Return to the session screen.

**Expected:** The target streak on the session screen reflects the new percentage immediately — no restart, no re-navigation trick required.

- [ ] Pass — Notes: ___________________________

### UAT-40: In-progress-session notice

**Priority:** P1 · **FR:** FR39

1. With no session in progress, open Settings.
2. Start a session, then (without ending it) open Settings again.
3. Tap `+`/`−` several times while the notice is showing.

**Expected:** Step 1 shows no notice. Step 2 shows a standing notice naming the segment. Step 3 leaves the same single notice in place the whole time — no per-tap popup or dialog interrupts the stepper.

- [ ] Pass — Notes: ___________________________

## v1.1 Summary

| Section | Scripts | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|
| 6. Segment Organization & Insight | 6 | 4 | 2 | – | – |
| 7. Configurable Overlearning Target | 3 | 2 | 1 | – | – |
| **v1.1 Total** | **9 (UAT-32–UAT-40)** | **6** | **3** | **–** | **–** |

**Minimum bar before calling v1.1 release-ready:** all 6 P0 scripts pass, with UAT-32 the highest-priority one to run first — it's the direct on-device confirmation of R8, the one HIGH risk in `test-design-epic-4-5.md`.

**Not yet run.** Execute this section against the first build that includes Epic 4/5 code, following the same pass/fail/note discipline as the v1.0 section above.
