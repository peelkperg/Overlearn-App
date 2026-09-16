---
title: 'Web platform support — storage layer, installability, and hosting'
type: 'feature'
created: '2026-09-13'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Overlearn only runs on iOS/Android because its sole persistence module, `src/lib/storage.ts`, is built directly on `react-native-mmkv` (Nitro/native, JSI-based) — confirmed zero web support. Every other layer (`segments.ts`, `session.ts`, `history.ts`, `settings.ts`, all hooks/screens) already goes through this one module as its only point of contact with storage, so it is the single hard blocker to running the app's existing (currently unused) Expo web target at all.

**Approach:** Branch `storage.ts`'s underlying store on `Platform.OS === 'web'` to back the same public API with `window.localStorage`, including an in-process listener set for `subscribeToKeys` — the browser `storage` event never fires for same-tab writes, which existing hooks rely on for cross-screen consistency. Every function above the raw store (`getObject`/`setObject`, migrations, quarantine, `getString`/`setString`/`getNumber`/`setNumber`/`deleteKey`) is already platform-agnostic and needs no change.

**Decision (2026-09-13):** `prd.md` gets a short NFR8/9 addendum in this spec documenting the web build's weaker durability guarantee (no OS sandbox; vulnerable to a user clearing browser data or switching browsers/profiles) — NFR8/9's literal text ("zero data leaves the device") still holds either way, this only documents the durability difference.

**Decision (2026-09-13, renegotiated):** The human clarified the actual driver behind this work: the web build exists to make Overlearn reachable by users the native builds currently exclude (iOS is not being built at all right now; only Android ships natively). A bare `expo start --web`-shaped deploy served from a URL nobody bookmarks does not satisfy that goal as well as an installable app does, so the PWA layer (manifest + service worker, installable, offline-after-first-load app shell) that the original planning pass deferred to `deferred-work.md` is **promoted back into this spec's scope**. The corresponding `deferred-work.md` entry is marked promoted, not deleted (history preserved). Hosting is also decided and folded in here rather than left to a separate spec: **GitHub Pages**, chosen because the repo already lives on GitHub, it is free with no ads and no accounts required of end users, and it needs no new infrastructure. This couples two concrete constraints into the build: a repo-subpath base path (`username.github.io/<repo>/`, unless/until a custom domain is attached) that both the router and the PWA manifest's `start_url`/`scope` must agree on, and a static-host SPA-routing fallback for deep-link reloads.

## Boundaries & Constraints

**Always:** Preserve `storage.ts`'s existing public API and signatures exactly, for both platforms. The web branch must satisfy identical contracts, including the quarantine convention (`{key}.corrupt.{timestamp}`) and the versioned-envelope migration chain, reused as-is — no parallel implementation. `subscribeToKeys` listeners must fire synchronously after every `set`/`remove` on web, matching MMKV's same-process notification semantics. The service worker's precache list must be derived from the actual static-export output (whatever the build produces), never a hand-maintained file list that silently drifts from what's really exported. The PWA manifest's `start_url`/`scope` and the router's base path must agree with wherever the app is actually served (the GitHub Pages subpath, or a custom domain if one is later attached) — no hardcoded root-relative assumption.

**Never:** Do not touch any file above the storage boundary — no call-site should need to change (this constraint is unaffected by the PWA/hosting promotion; those are additive, not a call-site change). Do not attempt a full cross-browser/UAT-equivalent audit here; this spec covers booting, functioning, installing, and deploying — not exhaustive polish. Do not introduce a backend, analytics, or any account/telemetry surface to support hosting or installability — GitHub Pages serves static files only, and the app's zero-accounts/zero-telemetry posture is unchanged.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First web load | `localStorage` empty | Same as native fresh install: `getString`/`getObject` return `undefined` | N/A |
| Returning user | `localStorage` holds JSON values this app previously wrote | `getObject` parses/validates/migrates exactly as native | Corrupt/invalid value → quarantined under the same key convention as native |
| Same-tab cross-component write | Component A calls `setObject`/`setString` while Component B is subscribed | B's `subscribeToKeys` listener fires synchronously in the same tick | N/A |
| Storage unavailable (private mode, quota exceeded) | `localStorage.setItem`/access throws | Read/write degrades to `undefined`/no-op, same as a native MMKV failure | Caught, not crashed |
| Offline after first successful load | Service worker has precached the app shell; network unavailable | App boots and functions identically (storage is already local-only, unaffected by network) | N/A |
| Deep-link reload on a static host | Browser reload/direct navigation to a non-root route under the GitHub Pages subpath | Same route renders, not a 404 | Static-host SPA-routing fallback serves the app shell instead of a raw 404 |
| Install prompt / installed launch | Manifest present, criteria met (served over HTTPS, valid icons) | Browser offers "Install"; launched instance opens standalone, `start_url` resolves under the actual deploy path | N/A |

</frozen-after-approval>

## Code Map

- `src/lib/storage.ts` -- only file that touches `react-native-mmkv` directly (verified via repo-wide search); add the `Platform.OS === 'web'` branch here, scoped to constructing the raw store and its two MMKV-specific calls (`storage.getNumber`, `storage.addOnValueChangedListener`) — everything below that point (`getObject`/`setObject`, `migrate`, `quarantine`) is unchanged. The web `addOnValueChangedListener`-equivalent must return a handle with a `.remove()` (or equivalent) method that deletes the callback from the in-module listener Set, matching MMKV's subscription-object shape used by the platform-agnostic layer for cleanup. Fan-out must isolate listener errors (each callback invoked in its own try/catch) so one throwing subscriber cannot block sibling notifications or the write path.
- `src/lib/storage.test.ts` -- existing native-path tests (MMKV) must keep passing untouched; add a parallel web-path `describe` block.
- `package.json` -- `react-native-web`, `react-dom`, and a `web` script (`expo start --web`) are already present; no dependency changes needed.
- `app.json` -- has a minimal `web` block (`output: "static"`, favicon) already; add the PWA manifest fields (`name`, `short_name`, icons, `display: "standalone"`, `background_color`, `theme_color`) and the base-path config the GitHub Pages subpath requires, so `start_url`/`scope` and the router agree with the real deploy path.
- `public/service-worker.js` (new) -- precaches the static-export app shell for offline-after-first-load; precache list generated from the actual build output (e.g. a small postbuild step reading `dist/`'s file listing, or an existing build-tool integration if the chosen bundler already has one) — never a hand-maintained list.
- `public/404.html` or equivalent (new) -- GitHub Pages' standard SPA-routing fallback so a reload/direct link to a non-root route serves the app shell instead of a 404, if the app's router uses history-API navigation rather than hash routing.
- `.github/workflows/deploy-pages.yml` (new) -- builds the static export and publishes it to GitHub Pages, triggered manually (`workflow_dispatch`) -- not automatically on push to `main`; web release timing is a deliberate choice, matching Android's own manual EAS build/submit cadence.
- `src/components/session/useFeedbackSignal.ts` -- verified already web-safe: haptics/vibration/accessibility calls are already defensively wrapped (degrade silently, don't throw). No change expected.
- `_bmad-output/planning-artifacts/prd.md` -- NFR8/9 section (around the FR/NFR listing): add the durability addendum.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- mark the "Add a PWA layer" entry (2026-09-13 split) as promoted back into this spec, not silently dropped.

## Tasks & Acceptance

**Execution:**
- [ ] `src/lib/storage.ts` -- add a `Platform.OS === 'web'` branch backing the raw store with a thin `localStorage` adapter (get/set/remove/`getAllKeys` + an in-module listener Set fired synchronously on every set/remove) -- closes the one hard blocker to any web functionality
- [ ] `src/lib/storage.test.ts` -- add web-path coverage mirroring the native-path cases: quarantine, migration, `subscribeToKeys` cross-listener notification, storage-unavailable degradation, plus: unsubscribe removes the listener (no notification after `.remove()`/unmount), and a throwing listener does not prevent sibling listeners from firing or crash the write
- [ ] Run `npx expo start --web` (or an `expo export --platform web` build) and record what, if anything, breaks beyond storage -- fix only what's actually found; do not speculatively harden other layers
- [x] `_bmad-output/planning-artifacts/prd.md` -- add a short NFR8/9 addendum: web's durability guarantee is weaker than native's (no OS sandbox, no backup mechanism; vulnerable to a user clearing browser data or switching browsers/profiles), while the "zero data leaves the device" guarantee itself is unchanged -- **done 2026-09-14**, plus NFR10 (offline/installable) and the Platform line, ahead of epics extraction
- [ ] `app.json` -- configure the base path for the GitHub Pages subpath (`/<repo-name>/`, or root if/when a custom domain is attached) so the static export's asset URLs and router resolve correctly when served from a subpath
- [ ] `app.json` + icon assets -- add the PWA manifest fields (name, short_name, icons at required sizes, `display: "standalone"`, background/theme color), with `start_url`/`scope` matching the base path above
- [ ] `public/service-worker.js` -- add a service worker registered at boot that precaches the static-export app shell, with its precache list generated from the real build output, for offline-after-first-load
- [ ] Add the static-host SPA-routing fallback (e.g. a `404.html` that redirects to the app shell) if the router uses history-API navigation, so a reload on a non-root route doesn't 404
- [ ] `.github/workflows/deploy-pages.yml` -- add a GitHub Actions workflow, triggered manually (`workflow_dispatch`), that builds the static export and publishes it to GitHub Pages -- deliberately not on every push to `main`
- [ ] `_bmad-output/implementation-artifacts/deferred-work.md` -- mark the deferred PWA entry as promoted into this spec (2026-09-13), preserving the original entry rather than deleting it

**Acceptance Criteria:**
- Given the app running via `expo start --web` with an empty browser profile, when a segment is created and a practice session is run to completion, then all data persists across a page reload exactly as it does on native.
- Given two components mounted in the same tab, when one writes via `setObject`/`setString`, then the other's `subscribeToKeys` listener fires in the same tick.
- Given `localStorage` throws (simulated: full quota or disabled storage), when any storage read/write is attempted, then the app degrades the same way it does for a native MMKV failure — no crash, existing empty/error-state UI.
- `prd.md` contains the NFR8/9 durability addendum described above.
- Given a subscriber unsubscribes (or its owning component unmounts), when a subsequent `set`/`remove` occurs, then that listener is not invoked and no reference to it remains.
- Given one of several listeners on the same write throws, when the write completes, then every other listener still fires and the write itself does not raise.
- Given the app deployed to its real GitHub Pages URL (not the local dev server) with an empty browser profile, when a segment is created and a session run to completion, then all data persists across a page reload, identically to the local-dev-server check.
- Given the app already loaded once and cached by the service worker, when the network is then disabled and the page reloaded, then the app shell still loads and functions (storage remains local, unaffected).
- Given the deployed app, when the browser's install affordance is used, then the app installs and the installed/standalone launch opens successfully at the correct base path.
- Given a direct reload on a non-root route under the deployed subpath, then the app shell loads (not a raw 404).

## Implementation Notes

## Spec Change Log

- 2026-09-13: Split from the originally-drafted spec, which also included a PWA layer. That goal pushed the spec past the 900–1600 token target and was independently shippable (touches no file this goal touches), so it was carved out to `deferred-work.md` as its own follow-on `bmad-build` run per the human's choice at the token-count gate. This spec now covers only the storage swap and the NFR8/9 doc addendum.
- 2026-09-13 (renegotiated): PWA (installability, offline app shell) promoted back into scope, and hosting decided as GitHub Pages and folded in, on the human's clarification that the web build's actual purpose is reaching users the native builds currently exclude (no iOS build right now, Android-only) — a bare hosted URL under-serves that goal versus an installable app. Deferred-work entry marked promoted, not deleted.
- 2026-09-14: Deploy trigger changed from automatic (push to `main`) to manual (`workflow_dispatch`), so web release timing is a deliberate choice decoupled from every merge — matching Android's own manual EAS build/submit cadence rather than the two platforms shipping on different, uncoordinated cadences by accident. Reflected in `ARCHITECTURE-SPINE.md` AD-6 and `SPEC.md` CAP-3.

## Review Triage Log

## Verification

**Commands:**
- `npm test -- storage.test.ts` -- expected: web-path additions pass alongside all existing native-path tests, zero regressions
- `npx tsc --noEmit` -- expected: clean (no dedicated `typecheck` script exists yet; this is the project's actual strict-mode check)
- `npm run lint` -- expected: clean

**Manual checks (if no CLI):**
- `npx expo start --web` in a real browser: create a segment, run a session to completion, reload the page, confirm the segment/session/history persisted identically to native.
- Against the actual deployed GitHub Pages URL (not the local dev server): repeat the persistence check above at the real subpath; disable the network after first load and confirm the app shell still boots; use the browser's install affordance and confirm the installed launch opens at the correct path; hard-reload a non-root route and confirm it doesn't 404.
