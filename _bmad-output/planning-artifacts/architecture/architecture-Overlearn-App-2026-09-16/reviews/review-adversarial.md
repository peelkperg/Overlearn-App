---
name: 'Adversarial review — Voice-command Correct/Incorrect input architecture spine'
type: review
reviews: 'architecture-Overlearn-App-2026-09-16/ARCHITECTURE-SPINE.md'
verdict: concerns
created: '2026-09-16'
---

# Adversarial Review — ARCHITECTURE-SPINE.md (voice-command input)

Method: construct pairs of implementers, each building a different unit named in the Structural Seed, each obeying the letter of every AD, and ask whether their outputs are guaranteed to integrate.

## Finding 1 — AD-1: call-site convention for `logCorrect`/`logIncorrect` is unpinned

**Clash.** Implementer A builds `matcher.ts` as a plain module (as the Structural Seed places it, under `src/lib/`) and assumes it receives handler callbacks as constructor/function arguments supplied by whoever owns it (`useVoiceCommand`). Implementer B builds `matcher.ts` assuming it can reach `useActiveSession`'s handlers directly — e.g. via a module-level singleton/store import — since AD-1 says only "invokes the same handler function reference," not how that reference arrives. Both satisfy AD-1's literal text ("not a reimplementation, not a duplicated MMKV write"), but produce incompatible module shapes: one expects `matcher.ts` to be pure and receive an injected `{ logCorrect, logIncorrect }`, the other expects it to own a dependency on the hook layer — which a non-hook `.ts` file cannot legally do (`useActiveSession` is a hook; it cannot be called outside a component/hook body). This is a real inconsistency the spine invites: it names the target functions but not the injection mechanism (constructor param vs. setter vs. per-call argument vs. context), nor whether `logCorrect`/`logIncorrect` need a signature change to be usable from a non-component caller (e.g. do they still take an event object, or a plain value?).

**Root cause.** AD-1 pins *which* functions get called and *that* there is one path, but not the calling convention between `matcher.ts` (non-React module) and `useActiveSession` (React hook). This is a load-bearing detail for two engineers working in parallel — it belongs in the AD or Structural Seed, not left to each implementer's judgment.

## Finding 2 — AD-2/AD-4 interaction: toggle visual state vs. actual capture state after backgrounding is not pinned

**Clash.** AD-4 says backgrounding "stops capture immediately and forces the toggle's underlying state to off." Implementer A (owns the on-screen toggle) reads this as: the toggle's visual/UI state is a `useState` boolean the component owns and updates independently on user taps; nothing in AD-4 obligates them to subscribe that UI state to `AppState` events, since AD-2's state diagram is about the *matcher's* internal states (Off/LISTENING_FOR_WAKE/AWAITING_COMMAND), not the toggle widget. Implementer B (owns `useVoiceCommand`) reads AD-4 as: the hook is the single source of truth, and "forces the toggle's underlying state to off" means the hook's exposed boolean (which the toggle renders) is what gets flipped on `AppState` transition — so the toggle should update automatically.

If A's reading ships, returning to foreground after a background event shows a toggle still visually "on" while the matcher has actually reverted to `Off` (per AD-2's diagram) — capture is silently dead but the UI claims it's listening. Nothing in the spine explicitly says which component (screen-level toggle state vs. hook state) is authoritative, nor whether re-foregrounding requires an explicit re-tap (with the AD-5 permission-request implications that follow) or silently resumes. AD-2's diagram shows `Off -> LISTENING_FOR_WAKE` gated on "mic toggle on," but doesn't say whether the toggle auto-flips back on when foreground returns, or stays off until manually re-toggled.

**Root cause.** AD-4's "forces the toggle's underlying state to off" conflates two things — matcher internal state and UI-rendered toggle state — without naming which module owns the toggle's boolean or how foreground-return is supposed to reconcile it (auto-resume vs. require re-tap).

## Finding 3 — AD-5: post-denial re-attempt behavior is underspecified

**Clash.** AD-5 pins the *first* denial's behavior (inline explanation, no auto-retry) but not what a *second* toggle-on tap does after that. Implementer A has the `onPress` handler unconditionally call `expo-audio`'s permission request again on every tap — cheap and harmless on iOS/Android (immediately resolves to the cached `denied` status), and re-shows the inline explanation each time. Implementer B, reading "no retry loop" more strictly, disables the toggle after first denial (or short-circuits `onPress` once a denied status is cached) and shows nothing on subsequent taps, since re-prompting looks like the forbidden "retry loop." Both comply with AD-5's literal text, but produce different UX: repeated inline messaging vs. a toggle that goes silently inert. Since neither is called out as wrong, two builders working the toggle component and the permission-check logic separately are likely to disagree on whether `onPress` after denial is a no-op or re-shows the explanation.

**Root cause.** AD-5 pins the first-denial behavior and the top-level "no auto re-prompt" rule but not the idempotent behavior of `onPress` itself once a denial is cached — a one-line addition ("subsequent taps re-show the same inline explanation without a new OS permission call" or equivalent) would close this.

## Finding 4 — AD-6/AD-4: transient (unpersisted) partial-recording state across backgrounding is not pinned

**Clash.** AD-6 pins what happens to *persisted* MMKV state (atomic three-template overwrite, no partial-set write ever hits disk) — that part is airtight. It does not address the *in-memory* recording-in-progress state during CAP-3 (e.g., wake + Correct takes recorded, Incorrect not yet recorded, distinguishability check not yet run) when the app backgrounds or is killed mid-flow. AD-4's capture-lifecycle rule ("unmounting the screen... or the app leaving foreground... stops capture immediately") is written generically over `recorder.ts`, which the Structural Seed says is shared by "live listening windows and template recording." Implementer A (recording-flow screen) reads AD-4 as applying only to CAP-1's live listening windows, and keeps the two already-recorded MFCC matrices in component/screen state so the user can resume recording the third trigger after returning to the screen. Implementer B (recorder.ts) reads AD-4 literally — "capture runs only while the screen is mounted and toggle on... unmounting stops capture" — and treats any backgrounding during the recording flow as a hard abort, discarding all in-progress takes, requiring a full restart of the three-take sequence.

Both are consistent with AD-4's and AD-6's literal text (AD-6 only promises no partial *persisted* state — it says nothing about in-memory partial progress), yet one preserves user progress across an interruption and the other silently loses two completed takes. On app kill specifically (not just backgrounding), A's approach loses the state anyway since it's unpersisted — meaning A's and B's behavior converge on kill but diverge on background/foreground, which is exactly the ambiguous middle case a tester would hit first.

**Root cause.** AD-6 addresses the persisted-storage half of "no partial state" but the spine has no AD governing the transient recording-session state machine (mid-CAP-3, pre-save) under the same interruption events AD-4 already enumerates for live listening. This is a gap between two ADs, not a violation of either.

## Finding 5 — CAP-2's "off by default... in every new and resumed session" has no owning AD

CAP-2's success criterion: "The mic is off by default in every new and resumed session." AD-4 governs the capture *lifecycle* (mount+foreground+toggle-on) and AD-5 governs *permission* request timing, but neither states where the toggle's default boolean lives or how it behaves across session resume specifically (as distinct from ordinary mount). Two readings: (a) the toggle is always local component state initialized to `false` on every mount — trivially satisfies CAP-2 with no persistence involved; (b) the toggle preference is persisted (e.g., in `voiceTriggers.ts` or a settings blob) so it "remembers" the user's last choice, in which case an explicit rule is needed to force it to `false` on session resume regardless of the stored value. The spine's Consistency Conventions and Capability→Architecture Map both point CAP-2 at AD-4/AD-5 without either one settling this. Low risk in practice (both readings likely converge on "always false"), but it is a silent gap: the spine asserts CAP-2 is "governed by" ADs that don't actually contain this specific rule.

## Deferred section — assessment

The five deferred items (timing constants, DTW/MFCC thresholds, web parity, accessibility, multi-sample robustness) are all legitimately empirical or explicitly out of SPEC scope — none of them is load-bearing for two implementers building in parallel today; deferring them doesn't create an integration hazard. The gaps found above (Findings 1–5) are not in the Deferred list at all — they're silent gaps, which is the more serious failure mode than an over-broad deferral.

## Verdict

**Concerns.** AD-3/AD-6's distinguishability-check design and the wake-gated state machine's happy path are well-pinned. The spine under-specifies the seams between modules built by different people: the matcher↔hook calling convention (Finding 1), toggle-UI-state↔matcher-state reconciliation after backgrounding (Finding 2), post-denial retry idempotency (Finding 3), transient recording-flow state under interruption (Finding 4), and toggle-default ownership across session resume (Finding 5). None of these are contradictions within a single AD — they're each a case where the AD stops one level short of the concrete call-site/data-ownership detail needed to guarantee two independent, literal-compliant implementations interoperate.

**Recommendation:** before story breakdown, add one clause each to AD-1 (handler injection mechanism) and AD-4 (toggle-state ownership + transient recording-flow interruption behavior), and one line to AD-5 (post-denial `onPress` idempotency) and CAP-2's mapping (toggle-default ownership). These are narrow, mechanical additions — not new design work.
