# Backlog

Consolidated view of everything not in v1 scope — small tactical requests
alongside the major capability categories already named in
`product-brief-Overlearn.md`'s "Explicitly out for v1" section. The brief
remains the authoritative scope-decision record; this file exists so both
kinds of deferred work are visible in one place for future planning. None
of the items below are designed or estimated yet.

## Open (tactical)

### Rename a segment from the row menu

**Requested:** 2026-09-02, by Gerardo.

Add a **Rename** option to the segment row's action menu (`SegmentListItem.tsx`), alongside Delete. No FR currently covers this — segment names are set once at creation (FR1) with no way to change them afterward.

**Context:** `SegmentForm.tsx` was already designed as a shared create/rename form (see `architecture.md`'s Project Structure and `ux-design-specification.md`'s Component Strategy — both describe it as "segment creation/rename"), but rename was never actually wired into the UI; only creation ships today. Implementing this is substantially reusing existing form/validation logic (`normalizeSegmentName`, disambiguation against existing names in `lib/segments.ts`), not building from scratch.

**Open questions for scoping (not yet answered):**
- Does a rename mid-active-session update the segment name shown on that session's Active Session screen and any history entries already recorded for it, or only future ones? (`SessionState.segmentName` and `HistoryEntry` don't currently store a live reference back to the segment — they copy the name at the time.)
- Does the resume/discard prompt's segment name (`ResumeDiscardDialog`) need to reflect a rename that happened while a session was interrupted?

## Open (strategic scope, from product-brief-Overlearn.md)

Named explicitly as out-of-scope-for-v1 in the brief (2026-08-xx planning phase). Listed here individually so each can be pulled forward and scoped on its own — per the brief's own note, "each needs its own scoping pass before being pulled forward."

### Practice-enhancement features

- **Metronome**
- **Practice time tracking**
- **Tuner**
- **Audio-based automatic correctness detection** — the brief calls this out more strongly than the others: "explicitly out of scope for v1 and all foreseeable near-term releases," not just a v1 cut.
- **Voice-command Correct/Incorrect input** — user-selectable command words (e.g. "right"/"wrong", "yes"/"no", "green"/"red"). Named in the brief as the *planned* fix for a real, already-identified problem: tapping Correct/Incorrect requires reaching for the phone while hands are occupied playing an instrument. Not designed yet, but not speculative either — it has an identified user need behind it.
- **Settings screen for overlearning level** — a global toggle between the 50% and 100% overlearning modes described in the original mechanic spec. Fixed at 50% for v1; no UI exists to change it.
- **Gamification**
- **AI integration / AI-assisted correctness judging**

### Analytics — flagged conflict, not a simple add

Named in the brief's out-of-scope list, but this one needs a real decision before any scoping pass, not just design work: this app's NFR8/NFR9 (zero telemetry, zero data leaves the device, verifiable by code inspection) were treated as load-bearing all the way through implementation — this session's Android Auto Backup fix (`app.json`'s `allowBackup: false`) exists specifically because that guarantee was taken seriously even at the OS-configuration level. Any future analytics work is a scope change to NFR8/NFR9 themselves, not an additive feature — it would need to be re-litigated at the PRD level, not just added as a story.

### Platform/technical gaps

- **iOS support** — never built, never verified, at any point in this project's history. Everything shipped so far is Android-only.
- **iOS backup equivalent** — iCloud's app-data backup is the iOS analogue of the Android Auto Backup issue fixed 2026-09-02 (`architecture.md`'s NFR8/NFR9 section). Unaddressed; blocked on iOS support existing at all.
- **Landscape orientation** — app is portrait-only by design; UX-DR12 and the UX spec both flag this as an explicit open question for architecture/implementation, not a settled decision. Active Session screen's proportional (percentage-of-height) layout was built for portrait only.
