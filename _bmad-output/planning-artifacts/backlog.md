# Backlog

Consolidated view of everything not in v1 scope — small tactical requests
alongside the major capability categories already named in
`product-brief-Overlearn.md`'s "Explicitly out for v1" section. The brief
remains the authoritative scope-decision record; this file exists so both
kinds of deferred work are visible in one place for future planning. None
of the items below are designed or estimated yet.

Priority tiers (assigned 2026-09-16): **P1** (highest value-for-effort,
ready to scope next) down to **P4** (speculative, undefined shape), plus
**Blocked** (needs a product/PRD decision before it can be prioritized) and
**Won't-do** (explicitly ruled out in the brief, not a priority tier).

**Resolved and removed from this list (2026-09-16):** "Rename a segment
from the row menu" (shipped, Stories 4.1/4.5), "Overlearning-level settings
toggle" (superseded by Epic 5's overlearning-target configuration, Stories
5.1/5.2), "Web version" strategic item (shipped, Epic 6).

## Open (release)

### Publish v1.0 to Google Play

**Status (2026-09-16):** in progress — app is live in Closed Testing on Google Play Console; Gerardo still needs to complete the 12-tester minimum before promoting toward production. Not a backlog priority-tier item; tracked directly by Gerardo, who will report status.

**Tagged `v1.0.0` = commit `518cc8e`** (confirmed via `eas build:list`, not assumed from branch state — see build `24213c66`, versionCode 1), matching exactly what's in the submitted AAB: Epics 1-5, native Android only. Epic 6 (web platform support) correctly does **not** bundle into the AAB — `registerServiceWorker()` is `Platform.OS !== 'web'`-guarded and Metro's platform-file resolution excludes `.web.tsx`/`+html.tsx` from native builds entirely; verified, not assumed.

**Known gap for the next AAB build:** Story 6.1's `storage.ts` fixes — `subscribeToKeys` listener-isolation (one throwing listener no longer aborts sibling notification) and quota-exceeded guards on `setString`/`setNumber`/`deleteKey`/`setObject` — are genuine cross-platform bug fixes, not web-only code, and are **not** in the tagged `v1.0.0` build (it predates Story 6.1). Low real-world likelihood (needs a throwing listener or actual storage-quota exhaustion to trigger) — decided 2026-09-16 not to patch-release for this alone, but make sure whatever commit produces the *next* AAB includes it.

All engineering/prep work is done: `eas.json` production + submit profiles configured, privacy policy drafted (`docs/privacy-policy.html`, published as a Claude Artifact, needs to be made public via Share before use), custom app icon shipped, production AAB and preview APK both built successfully via EAS (icon confirmed on-device).

## Open (strategic scope, from product-brief-Overlearn.md)

Named explicitly as out-of-scope-for-v1 in the brief (2026-08-xx planning phase). Listed here individually so each can be pulled forward and scoped on its own — per the brief's own note, "each needs its own scoping pass before being pulled forward."

### Practice-enhancement features

- **Voice-command Correct/Incorrect input** — `P1`. User-selectable command words (e.g. "right"/"wrong", "yes"/"no", "green"/"red"). Named in the brief as the *planned* fix for a real, already-identified problem: tapping Correct/Incorrect requires reaching for the phone while hands are occupied playing an instrument. Not designed yet, but not speculative either — it has an identified user need behind it.
- **Practice time tracking** — `P2`. Straightforward addition, decent value, no architectural conflicts identified.
- **Metronome** — `P3`. Nice-to-have, not core to the overlearning mechanic, moderate complexity.
- **Tuner** — `P3`. Audio pitch detection is a different technical domain than anything else in this app; lower strategic fit.
- **Gamification** — `P4`. Speculative, undefined shape.
- **AI integration / AI-assisted correctness judging** — `P4`. Speculative, undefined shape.
- **Audio-based automatic correctness detection** — `Won't-do`. The brief calls this out more strongly than the others: "explicitly out of scope for v1 and all foreseeable near-term releases," not just a v1 cut.

### Practice session video recording

**Priority:** `P3` — real user request, but flagged below as architecturally non-trivial; needs a scoping/design pass before it's even estimable.

**Requested:** 2026-09-06, by Gerardo.

When a camera is available on the device running the app, let the user record video of their practice session.

**Context:** not named in the original product brief's out-of-scope list — a new request, not a promoted brief item. No FR currently covers any camera/media-capture capability; nothing in the app touches device media today.

**Why this isn't a simple add — real architectural implications, not just a UI feature:**
- **New native dependency required.** Nothing in the current dependency tree touches the camera (no `expo-camera`/`expo-av`/`expo-media-library`). This is a new capability class for the app, not an extension of an existing one.
- **New permission surface.** Camera (and likely microphone, if audio is expected) permission prompts are a first for this app — everything shipped so far needs zero OS permissions beyond storage, which was itself a deliberate simplicity/privacy property worth preserving consciously, not losing by default.
- **Storage model conflict.** The entire persistence layer (`lib/storage.ts`) is `react-native-mmkv` key-value storage sized for small JSON records (segments, sessions, history entries) — video files are orders of magnitude larger and need filesystem storage (`expo-file-system` or similar), not MMKV. This is a second persistence mechanism alongside the existing one, not a natural extension of it.
- **NFR8/NFR9 interaction, not necessarily a violation.** "Zero data leaves the device" can still hold if video is written and stays local — but storage growth, retention/deletion policy (does old video get cleaned up automatically? does deleting a segment delete its videos, mirroring FR6's existing history cascade?), and whether recordings need their own opt-in (separate from the app's otherwise-permission-free posture) all need explicit decisions before this is designed, not assumed.
- **Conditional availability, as the request itself specifies** — "when there is a videocamera available" implies a capability check and a graceful no-camera path, not a hard requirement; device-capability detection is new territory for this app.

**Open questions for scoping (not yet answered):** where recordings are surfaced (tied to a specific history entry? a segment-level gallery?), retention/storage-limit policy, whether audio is included, and whether this is a v2-scope conversation-worthy feature given its NFR8/NFR9 and permission-model implications, similar in weight to the Analytics conflict noted below.

### Analytics — flagged conflict, not a simple add

**Priority:** `Blocked` — not a scoping question but a direct conflict with NFR8/NFR9; needs a PRD-level product decision before it can be prioritized at all.

Named in the brief's out-of-scope list, but this one needs a real decision before any scoping pass, not just design work: this app's NFR8/NFR9 (zero telemetry, zero data leaves the device, verifiable by code inspection) were treated as load-bearing all the way through implementation — this session's Android Auto Backup fix (`app.json`'s `allowBackup: false`) exists specifically because that guarantee was taken seriously even at the OS-configuration level. Any future analytics work is a scope change to NFR8/NFR9 themselves, not an additive feature — it would need to be re-litigated at the PRD level, not just added as a story.

### Platform/technical gaps

- **Landscape orientation** — `P2`. App is portrait-only by design; UX-DR12 and the UX spec both flag this as an explicit open question for architecture/implementation, not a settled decision. Active Session screen's proportional (percentage-of-height) layout was built for portrait only.

### iOS support

**Priority:** `P3` (2026-09-16). Codebase is already cross-platform-clean — low engineering risk — but blocked on an Apple Developer account + Mac access regardless of priority; re-rank when that unblocks.

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

**Scope reaffirmed 2026-09-05:** full functional parity with the Android app — no cut to Segment Management or Practice History. Two scope-reduction options were considered (dropping segments/history entirely; using cookies instead of `localStorage`) and both rejected:
- Cookies rejected outright — too small (~4KB/cookie, low total-cookie caps vs. `localStorage`'s ~5-10MB), no clean structured-data API, no durability advantage over `localStorage`, and the request-header-attachment mechanism is meaningless for a backend-less app.
- Cutting segments/history rejected because it wouldn't reduce the actual engineering work (the `react-native-mmkv`→`localStorage` swap below already covers segments, history, and session state equally via the single `lib/storage.ts` boundary) while it would remove real product value — the PRD's Journey 5 names the history log as "the only place" the passage-actually-fixed question gets answered at all.

Decision: proceed toward full parity when this is picked up; revisit approach (e.g. a partial-scope cut) only if a specific implementation challenge actually forces it, not preemptively.

**Recommendation: extend this project, do not create a separate one.** `react-native-web` and `react-dom` are already installed dependencies (bundled with the Expo starter template since Story 1.1; `app.json`'s `web` section has sat unused). A separate "Overlearn Web" project would mean maintaining two independent implementations of the target-streak mechanic and every FR — for an app whose entire value proposition is that the mechanic is provably correct. That risk outweighs any benefit of a clean split.

**The one hard blocker:** `react-native-mmkv` is Nitro-modules-based (pure native code via JSI) — confirmed zero web support, not even listed as a target platform. Everything else in the app already goes through `lib/storage.ts` as its sole point of contact with persistence (an existing architectural boundary, not something to newly introduce), so this is a contained fix: branch that one module on `Platform.OS === 'web'` to use `localStorage` instead (its synchronous get/set API maps cleanly onto MMKV's, so `lib/segments.ts`/`session.ts`/`history.ts` likely don't need to change at all).

**Other real implications, not just the storage swap:**
- **Feedback signals degrade, not break** — haptics/vibration are inconsistent-to-absent on the web (no iOS Safari support at all). `useFeedbackSignal.ts` already wraps these defensively; they'll silently no-op, which is correct behavior, not a bug — but worth documenting explicitly like the "no sound" gap, so it isn't misreported.
- **NFR8/9 needs a precise rewrite, not a reversal.** "Zero data leaves the device" still holds (`localStorage` never leaves the browser), but the *durability* guarantee is genuinely weaker: no OS-level app-private sandbox, no separate "backup" mechanism to worry about disabling (there isn't one) — but also no protection from a user clearing browser data, private/incognito mode, or a different browser/profile just losing everything. That's a different risk profile than mobile's, and should be stated to users precisely, not silently inherited by assumption.
- **True offline support needs a scope decision.** A plain static export still needs one network fetch to load initially. Actually offline-after-first-load requires a PWA (manifest + service worker) — real, additional scope, not automatic from `expo export --platform web`.
- **Interruption/recovery (FR23–26) may get *simpler*, not harder** — there's no OS background-vs-kill distinction on the web; a tab is either open (same as native backgrounding) or closed (next load reads `localStorage` fresh, same as native kill). Worth confirming during design, but likely less new logic than it sounds.
- **Full UAT-equivalent pass needed** — different backgrounding semantics, mouse vs. touch, browser-specific quirks (Safari in particular is known for aggressive storage eviction on infrequently-visited sites — a real risk for an app meant to be reopened days apart).
- **Hosting is cheap/free** (Vercel, Netlify, Cloudflare Pages, GitHub Pages all have zero-cost static tiers) — but be precise in messaging: the *app bundle* is hosted; the *user's data* still never leaves their browser. Easy to conflate, worth stating carefully.

### Custom domain for the web version

**Priority:** `P4`. **Requested:** 2026-09-16, by Gerardo, after asking about a subdomain redirect for `overlearn.villarrealsalinas.com`. **Superseded same day:** turns out `overlearn.villarrealsalinas.com` already hosts a Google Sites landing page (Google Workspace, Gerardo-managed) — the plan is now that page linking out to both the Play Store listing and the GitHub Pages web app, not a GoDaddy redirect and not a GitHub Pages custom domain. This entry (serving the app itself at the custom domain) remains a possible future alternative to "landing page with links out," not something in progress.

Serve the app directly at the custom subdomain (e.g. `overlearn.villarrealsalinas.com`) as a real GitHub Pages custom domain, rather than linking to `peelkperg.github.io/Overlearn-App/` from a landing page. Would remove the extra hop and let an installed PWA carry the custom domain as its origin — but would also mean giving up the landing page's ability to link to both the Play Store and the web app from one URL, since GitHub Pages can only serve one app.

**Why this is real engineering work, not just a DNS change:** the app's base path is currently hardcoded to `/Overlearn-App` (AD-3, Story 6.2) — `app.json`'s `experiments.baseUrl`, the generated `manifest.json`'s `start_url`/`scope`, and `service-worker.ts`'s registration path all assume GitHub Pages' project-site subdirectory hosting. A custom domain is normally served at root (`/`), so this would need AD-3 reworked (base path becomes `/` or configurable), the manifest generator (`scripts/generate-web-manifest.js`) and deploy workflow updated accordingly, plus a DNS CNAME record and the GitHub Pages custom-domain setting (which needs the target repo to stay public, already true). Low priority since the chosen redirect approach already meets the actual need (a memorable URL to share) without any of this.
