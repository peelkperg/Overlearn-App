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

- **Landscape orientation** — app is portrait-only by design; UX-DR12 and the UX spec both flag this as an explicit open question for architecture/implementation, not a settled decision. Active Session screen's proportional (percentage-of-height) layout was built for portrait only.

### iOS support

**Discussed:** 2026-09-02. Decision: hold off, not started.

Never built, never verified, at any point in this project's history — everything shipped so far is Android-only. This was never a deliberate scope cut, though: the PRD's "Mobile App Specific Requirements" section states iOS+Android from the start ("Platform: iOS and Android... undecided [between RN/Flutter], left to the architecture stage"). Android-only is what got built and tested first, not a decision to drop iOS. Codebase is already cross-platform-clean (MMKV, `expo-haptics`, `react-native-safe-area-context`, `expo-router` all work identically on iOS; the only two `Platform.select` calls in the app are starter-template font boilerplate) — this is a low-risk port from a pure code standpoint.

**Why it's on hold, not blocked on engineering:**
- Requires an Apple Developer Program membership ($99/year) — no free tier equivalent to Google Play's one-time fee. Needed for any EAS-managed real-device build, TestFlight, or App Store distribution.
- No way to build locally from Windows, ever — iOS builds require macOS. EAS cloud build is the only path without acquiring a Mac.
- No way to sideload/test a build without either the paid account or a Mac (for the free-but-limited Xcode "Personal Team" signing route, itself capped at 7-day-expiring installs). Unofficial tools (Sideloadly, AltStore) exist but aren't something to build a real testing process on.

**Known engineering work once unblocked:**
- **iCloud backup equivalent of the Android Auto Backup bug fixed 2026-09-02** (`architecture.md`'s NFR8/NFR9 section) — iOS backs up app data to iCloud by default the same way Android does to Google Drive; MMKV's storage files would very likely need the same kind of explicit backup-exclusion fix (`NSURLIsExcludedFromBackupKey`), not an assumption it's already safe.
- Full UAT-equivalent pass on real iOS hardware — nothing from the Android run transfers automatically. Particular risk areas: §3 Interruption & Recovery (iOS's app-lifecycle model differs from Android's), Modal swipe-to-dismiss behavior vs. FR24's "never silently dismissed" requirement, VoiceOver vs. TalkBack announcement behavior.

### Web version ("Overlearn Web")

**Discussed:** 2026-09-02, requested by Gerardo — a non-Android/non-iOS-account option for users. Decision: hold off, not started.

**Recommendation: extend this project, do not create a separate one.** `react-native-web` and `react-dom` are already installed dependencies (bundled with the Expo starter template since Story 1.1; `app.json`'s `web` section has sat unused). A separate "Overlearn Web" project would mean maintaining two independent implementations of the target-streak mechanic and every FR — for an app whose entire value proposition is that the mechanic is provably correct. That risk outweighs any benefit of a clean split.

**The one hard blocker:** `react-native-mmkv` is Nitro-modules-based (pure native code via JSI) — confirmed zero web support, not even listed as a target platform. Everything else in the app already goes through `lib/storage.ts` as its sole point of contact with persistence (an existing architectural boundary, not something to newly introduce), so this is a contained fix: branch that one module on `Platform.OS === 'web'` to use `localStorage` instead (its synchronous get/set API maps cleanly onto MMKV's, so `lib/segments.ts`/`session.ts`/`history.ts` likely don't need to change at all).

**Other real implications, not just the storage swap:**
- **Feedback signals degrade, not break** — haptics/vibration are inconsistent-to-absent on the web (no iOS Safari support at all). `useFeedbackSignal.ts` already wraps these defensively; they'll silently no-op, which is correct behavior, not a bug — but worth documenting explicitly like the "no sound" gap, so it isn't misreported.
- **NFR8/9 needs a precise rewrite, not a reversal.** "Zero data leaves the device" still holds (`localStorage` never leaves the browser), but the *durability* guarantee is genuinely weaker: no OS-level app-private sandbox, no separate "backup" mechanism to worry about disabling (there isn't one) — but also no protection from a user clearing browser data, private/incognito mode, or a different browser/profile just losing everything. That's a different risk profile than mobile's, and should be stated to users precisely, not silently inherited by assumption.
- **True offline support needs a scope decision.** A plain static export still needs one network fetch to load initially. Actually offline-after-first-load requires a PWA (manifest + service worker) — real, additional scope, not automatic from `expo export --platform web`.
- **Interruption/recovery (FR23–26) may get *simpler*, not harder** — there's no OS background-vs-kill distinction on the web; a tab is either open (same as native backgrounding) or closed (next load reads `localStorage` fresh, same as native kill). Worth confirming during design, but likely less new logic than it sounds.
- **Full UAT-equivalent pass needed** — different backgrounding semantics, mouse vs. touch, browser-specific quirks (Safari in particular is known for aggressive storage eviction on infrequently-visited sites — a real risk for an app meant to be reopened days apart).
- **Hosting is cheap/free** (Vercel, Netlify, Cloudflare Pages, GitHub Pages all have zero-cost static tiers) — but be precise in messaging: the *app bundle* is hosted; the *user's data* still never leaves their browser. Easy to conflate, worth stating carefully.
