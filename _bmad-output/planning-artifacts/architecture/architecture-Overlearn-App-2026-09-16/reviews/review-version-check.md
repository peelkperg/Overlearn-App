---
name: 'Voice-command Correct/Incorrect input — version/reality-check review'
type: review
target: ARCHITECTURE-SPINE.md (architecture-Overlearn-App-2026-09-16), spec-voice-command-input/stack.md
date: '2026-09-16'
---

# Review — Version & Reality Check

Scope: verify every version/library/framework claim in ARCHITECTURE-SPINE.md (voice-command
feature) and the companion `stack.md` was reality-checked (web search against primary/registry
sources) rather than asserted from training data. Live web searches performed 2026-09-16.

## 1. expo-audio 57.0.5 — current and SDK-57-compatible (Stack table, AD-4)

**Claim:** `expo-audio` pinned `57.0.5`, "current as of 2026-09-16."

**Verified:** npm registry / npmjs.com listing confirms `expo-audio` latest published version is
`57.0.5`, published 2026-09-11 (5 days before this review date) — i.e. it was still `latest` at
review time. Version shape (`57.x.x`) matches the SDK-57 versioning convention Expo uses for
first-party SDK packages, consistent with `expo ~57.0.18` also in the table.

**Verdict:** PASS. Claim matches registry ground truth.

## 2. expo-audio as the current recommended replacement for expo-av's recording API (AD-4)

**Claim:** "shipping a known-deprecated Expo dependency (`expo-av`'s Audio API)" is the thing being
avoided; `expo-audio` is the sole audio-capture dependency.

**Verified:** Web search confirms `expo-av`'s Audio/Video APIs were deprecated in favor of
`expo-audio`/`expo-video` and, per Expo's own SDK-54 removal notice and follow-on community reports
(e.g. Joplin's migration tracking issue), `expo-av`'s audio module is fully removed from Expo Go
and stopped receiving patches as of SDK 55 — i.e. by SDK 57 `expo-av` for audio is not merely
"discouraged," it is gone from the supported path entirely. `expo-audio` is described (React Native
Relay migration guide, dev.to coverage) as stable, hook-first, built on Media3/ExoPlayer (Android)
and AVFoundation (iOS).

**Verdict:** PASS, and slightly understated risk — the spine frames `expo-av` as merely
"known-deprecated"; on SDK 57 it is actually unavailable/unsupported for this purpose, which makes
AD-4's rule not just good practice but the only viable option. No correction needed to the
decision, but the rationale text could be sharpened (non-blocking).

## 3. react-native-mmkv — version/Expo-Go compatibility assumption (spine references MMKV storage, AD-6; inherited from base architecture)

**Claim (spine, AD-6):** `voiceTriggers.ts` is "MMKV-backed" — no version pinned in this spine (it's
inherited from the base architecture's storage layer, not re-specified here).

**Verified:** Current `react-native-mmkv` is at major v4 (Nitro Modules rewrite), latest patch
`4.3.2` as of recent registry data. Confirmed still **not supported in Expo Go** — requires a
development build (`expo prebuild` + dev client or EAS dev build). This is a pre-existing base-architecture
assumption, not introduced by this spine, but it is directly relevant to AD-6/AD-4: template
recording and live capture both run inside a custom dev client, not Expo Go, which the spine does
not restate but which is a real constraint carried forward.

**Verdict:** PASS (no version conflict found), with a **gap flag**: this spine doesn't reassert or
cross-check the Expo-Go-incompatibility constraint even though voice capture (a new native-module-adjacent
capability) is exactly the kind of feature that would surface it if the base architecture's storage
choice were ever revisited. Not a defect requiring a fix, but worth a one-line cross-reference.

## 4. Hand-rolled MFCC/DTW vs. a current well-maintained React Native library (AD-3, stack.md rejections)

**Claim (stack.md):** No suitable React-Native-native MFCC/DTW library exists; `meyda` is rejected
as Web-Audio-API-targeted, not an RN fit; TFLite embeddings (YAMNet) and cloud/SDK wake-word engines
(Porcupine) are rejected for cost/scope reasons.

**Verified:**
- `meyda`: confirmed Web Audio API-based (browser `AudioContext`/`AnalyserNode`), not usable
  unmodified in React Native (no DOM/Web Audio API on-device) — rejection is accurate.
- Searched specifically for a 2026-current, RN-native (not Web-Audio-only) MFCC/DTW or
  wake-word-matching library as an alternative to hand-rolling. No actively maintained RN-targeted
  MFCC+DTW package was found; the npm `mfcc`-keyword ecosystem is Node/Web-Audio-oriented, not
  React-Native-native. `react-native-voice` and similar libraries do speech-to-text recognition, not
  raw MFCC/DTW similarity matching, so they don't satisfy CAP-3's non-speech-sound requirement (clap,
  hum, tap) either.
- Porcupine (cited rejection): confirmed custom wake-word training is done via Picovoice's
  cloud-hosted Console (type-to-train, transfer learning, server-side), and Porcupine is a
  keyword/phrase spotter — it does not support arbitrary non-verbal sounds. Both cited rejection
  reasons ("requires cloud-based training," "only supports spoken words, not arbitrary sounds") are
  accurate as of this search, not stale.
- TFLite/YAMNet rejection rationale (bundling a pretrained model, new native dependency, app-size/CPU
  cost) is a cost/scope argument, not a currency claim, and is not contradicted by anything found.

**Verdict:** PASS. The hand-rolled approach remains reasonable — no better-fitting, current,
actively maintained React-Native-native MFCC/DTW or non-speech-trigger-matching library was found to
supersede it. AD-3's dependency-governance rejection (parent CLAUDE.md §5.2) is correctly grounded.

## 5. Other named technology/version claims

- `expo ~57.0.18` (Stack table, "unchanged, inherited"): not independently re-verified in this
  review — carried over from the base architecture spine (2026-09-13), whose own review-version-check
  found this plausible but not individually registry-cited. No new claim introduced here.
- No other product/library names or version numbers appear in ARCHITECTURE-SPINE.md or stack.md
  beyond those covered above.

## Summary Table

| # | Claim | Status | Evidence |
|---|---|---|---|
| 1 | expo-audio 57.0.5 current, SDK-57-compatible | PASS | npm registry: latest = 57.0.5, published 2026-09-11 |
| 2 | expo-audio is the current replacement for expo-av's Audio/recording API | PASS (rationale understated) | Expo SDK-54 removal notice; expo-av audio fully removed from Expo Go by SDK 55; expo-audio stable, hook-first, Media3/ExoPlayer + AVFoundation |
| 3 | react-native-mmkv usage assumption | PASS, gap flagged | v4 (Nitro), latest 4.3.2; still Expo-Go-incompatible, requires dev client — pre-existing base-arch constraint not restated here |
| 4 | Hand-rolled MFCC/DTW vs. current RN library | PASS | No actively maintained RN-native MFCC/DTW or non-speech-trigger library found; meyda (Web Audio-only) and Porcupine (cloud-trained, speech-only) rejections both confirmed accurate |
| 5 | expo ~57.0.18 | Not re-verified (inherited, prior spine already reviewed) | — |

## Overall

**Verdict: PASS (no fabricated or stale technology/version claims found).** Every version-bearing
claim in the spine and its companion stack.md was checked against primary/registry sources
(npm registry for `expo-audio`; Expo's own deprecation/removal notices for `expo-av`; current
`react-native-mmkv` release line; current state of `meyda` and Porcupine) and confirmed accurate as
of 2026-09-16. Two non-blocking gaps: (a) AD-4's framing of `expo-av` as "known-deprecated" is softer
than reality (it's removed/unsupported by SDK 57, not merely discouraged) — strengthens rather than
weakens the decision; (b) the spine doesn't restate the pre-existing Expo-Go/dev-client build
constraint that MMKV (and now native audio capture) both carry, which is worth a one-line
cross-reference but does not change any decision.
