# Review — Architecture Spine: Web platform support

Reviewer: rubric-walker (checklist-driven review)
Target: `ARCHITECTURE-SPINE.md` (web-platform-support), cross-checked against `.memlog.md` and driving spec `spec-web-platform-support.md`, and against the live brownfield codebase (`src/lib/storage.ts`, `src/app/**`, `app.json`, `package.json`).

## Verdict

Solid, narrowly-scoped spine that correctly identifies and rules the three real divergence points (storage port, base-path threading, deploy mechanism) and is consistent with the brownfield codebase and current package versions — but AD-1's Rule has an enforceability gap against the actual current state of `storage.ts` that could let two implementations diverge on the exact failure mode this spine exists to prevent (a web build that crashes on load).

## Findings

### MAJOR — AD-1's Rule does not address the module-load-time `createMMKV()` call, the actual mechanism of a web crash

`src/lib/storage.ts:7` currently reads:

```ts
export const storage = createMMKV();
```

This runs **unconditionally at module import time** — there is no existing `Platform.OS` branch anywhere in the file (confirmed: zero occurrences of `Platform.OS` in `storage.ts`, and `react-native-mmkv` ships no `browser` field / web fallback in its `package.json`, confirmed at installed version 4.3.2). Importing this module in a web bundle today would attempt to construct the native Nitro/JSI MMKV instance and fail before any per-call branch logic could run.

AD-1's Rule says: *"the `Platform.OS === 'web'` branch is scoped to constructing the raw store and its two MMKV-specific calls."* This is necessary but not sufficient as written — it describes **scope** (which calls are affected) but not **timing** (that construction must become conditional/lazy rather than eager at module scope). A literal-minded implementation could satisfy "scoped to constructing the raw store" by wrapping `storage.getString`/`storage.set`/etc. call sites in a platform check while leaving line 7's top-level `createMMKV()` untouched — the exact bug this spine exists to prevent. Two implementers reading this Rule could reasonably diverge on whether the raw-store construction itself must move behind the branch (one lazily constructs inside a function invoked once at first use, another leaves it at module scope guarded only by an `if` that never actually stops the top-level call from running).

**Recommendation:** Tighten AD-1's Rule to state explicitly that raw-store construction (today's `createMMKV()` call) must not execute unconditionally at module scope — it must be selected/constructed inside the `Platform.OS === 'web'` branch (or lazily on first access), so that importing `storage.ts` in a web bundle never touches `react-native-mmkv`.

### MINOR — AD numbering/tagging is inconsistent

AD-1 and AD-2 carry an explicit `[ADOPTED]` status tag in their headings; AD-3 through AD-7 do not. Not load-bearing (the Invariants & Rules section as a whole reads as adopted), but inconsistent enough to raise a spurious "is AD-3 actually decided or still proposed?" question for a reader skimming headings only. Low cost to normalize (either tag all seven or drop the tag from AD-1/AD-2).

### MINOR — GitHub Pages CDN caching is an unaddressed interaction with AD-5's conservative SW update lifecycle

AD-5 deliberately avoids `skipWaiting`/`clientsClaim` so a new service worker only activates once every old-version tab closes — explicitly to protect an in-progress practice session. This assumes a client can promptly *see* the new deployment (new `index.html`/hashed bundle) once it does check. GitHub Pages fronts static assets with its own CDN and does not expose custom `Cache-Control` headers; if `index.html` or the SW script itself is served stale for a stretch after deploy, that compounds the conservative-activation delay with a fetch-time delay. Not necessarily wrong — but it's a real interaction between AD-3 (hosting choice) and AD-5 (update policy) that the spine doesn't mention. Worth an explicit "accepted" note or a follow-up check during implementation (e.g. confirm GH Pages' actual cache TTL on `index.html`/`service-worker.js`) rather than silence.

### MINOR / OPEN QUESTION — No stated rollback procedure for a bad Pages deploy

AD-6 decides the deploy *mechanism* (native Pages Actions, triggered on push to `main`) but says nothing about what happens if a deploy ships a broken build — revert-and-repush is the obvious answer and probably doesn't need its own AD, but the "Deployment & environments" paragraph and Section 15-equivalent operational envelope stop short of stating it. Given this checklist's explicit instruction to verify the operational envelope isn't left silent: this is the one sub-dimension (deploy failure/rollback) that is neither decided nor explicitly deferred — it's just absent. Recommend a one-line addition ("rollback = revert the commit, no separate mechanism") to close it out explicitly rather than leave it implicit.

## Checklist Results

| Check | Result |
| --- | --- |
| Fixes real divergence points for stories, misses none | Pass — storage port, base-path threading (router/manifest/SW scope), deploy mechanism, SW precache generation, deep-link fallback, no-backend guardrail all correctly identified as the load-bearing decisions. |
| Every AD's Rule is enforceable and prevents its stated divergence | **Fail (1 finding)** — AD-1 has a real gap (see MAJOR above). AD-2 through AD-7 are enforceable as written. |
| Nothing in Deferred is load-bearing | Pass — custom domain, cross-browser audit, extended PWA surface (push/background sync/share-target), and multi-environment deploy are all genuinely orthogonal to this scope's correctness; none would let two units of *this* scope diverge. |
| Named tech is verified-current | Pass — `expo ~57.0.18`, `expo-router ~57.0.17`, `react-native-web ~0.21.0`, `react-dom 19.2.3` all match `package.json` exactly (verified by reading the file, not trusting the spine's claim). `workbox-build 7.4.1` confirmed current on npm as of September 2026 (web search). |
| Ratifies rather than contradicts the brownfield codebase | Pass with one caveat — `src/lib/storage.ts` confirmed as the sole `react-native-mmkv` import site (repo-wide grep); `src/app/segment/[id].tsx`, `src/app/segment/[id]/rename.tsx`, `src/app/session/[id].tsx` confirmed present, matching AD-4's route list; `app.json`'s existing minimal `web` block (`output: "static"`, `favicon`) matches the spec's Code Map claim. Caveat: AD-1's Rule, read literally against the actual current file content, doesn't fully close the divergence it names (see MAJOR). |
| Covers the driving spec's three capabilities | Pass — storage web branch (AD-1/AD-2), PWA installability/offline shell (AD-3/AD-5), GitHub Pages hosting (AD-3/AD-6/AD-7) all mapped in the Capability → Architecture table. |
| Operational/environmental envelope fully decided/deferred/open | Mostly pass — deployment & environments (single env, GH Pages, `main`-triggered) and infra/provider strategy (GH Pages, native Actions) are explicit; "no telemetry/monitoring" is an explicit decision via AD-7 rather than silence. One gap: deploy rollback procedure is neither decided nor flagged as deferred/open (see MINOR above) — genuinely silent, though low-severity given trunk-based single-environment scope. |

## Notes on Method

- Read `ARCHITECTURE-SPINE.md`, `.memlog.md`, and `spec-web-platform-support.md` in full.
- Cross-checked version claims against `package.json` directly (not the spine's own Stack table) and against a live web search for `workbox-build`'s current npm version.
- Read `src/lib/storage.ts` in full and grepped the repo for other `react-native-mmkv` import sites to verify AD-1's "sole point of contact" claim and to locate the module-load-time construction issue.
- Confirmed `src/app/**` route file list against AD-4's named routes.
- Read `app.json` to verify the spec's brownfield claims about the existing `web` block.
- Read `deferred-work.md`'s PWA entry to confirm the "promoted, not deleted" history is intact and consistent with the spine/spec's framing.
