---
title: 'Story 6.3: Installable Offline App Shell'
type: 'feature'
created: '2026-09-14'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: []
baseline_commit: '1a1304ad1136d3f79b62e14057f5e0adc5969ffd'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The web build (Story 6.2's base path/manifest) still isn't a real PWA — there's no service worker, so nothing works offline after the first load, and no `404.html` fallback, so GitHub Pages 404s on any direct reload or deep link to a non-root route (e.g. `/segment/abc`). Story 6.3's install/offline ACs depend on both existing.

**Investigation finding (2026-09-14):** `ARCHITECTURE-SPINE.md`'s Consistency Conventions table names the generated files `public/service-worker.js`/`public/404.html`, but both must be computed from the exact post-export `dist/` contents (Workbox hashes `dist/`'s real files; `404.html` must byte-match the real built `index.html`) and physically exist inside `dist/` to be served, since AD-6 publishes `dist/` as the deploy artifact. `public/` (as Story 6.2 established) only holds files that must exist *before* `expo export` runs, so Expo's own export step copies them into `dist/` — that mechanism can't apply here, as these two files don't exist yet when export runs. **Decision: both AD-4 and AD-5's naming, and the Capability → Architecture Map, are corrected to `dist/service-worker.js`/`dist/404.html`** (same invariants, corrected location); no new `.gitignore` entries are needed since `dist/` is already fully ignored.

**Approach:** New `scripts/postbuild-web.js` runs after `expo export --platform web`: copies `dist/index.html` → `dist/404.html` (AD-4), then runs `workbox-build`'s `generateSW` against `dist/` (AD-5), asserting the returned precached-entry count equals `dist/`'s real file count (minus `service-worker.js` itself) and failing loud on mismatch. `package.json` gains one canonical `build:web` script chaining Story 6.2's `web:manifest` → `expo export --platform web` → this postbuild step. Registration is extracted into `src/lib/service-worker.ts` (`registerServiceWorker()`), mirroring `_layout.tsx`'s existing `STACK_SCREENS`-extraction-for-testability precedent, called once from a `useEffect` in `src/app/_layout.tsx` (AD-8) — guarded to web + production builds only (`Platform.OS === 'web' && !__DEV__`), since registering against a service worker that only exists in `dist/` would 404 under `expo start --web`'s dev server. Registers with a bare relative path (`'service-worker.js'`), no explicit `scope`, so it resolves correctly under any base path without re-deriving AD-3's config key in a third file.

## Boundaries & Constraints

**Always:** `workbox-build`'s `generateSW` is the sole mechanism producing the precache manifest — never hand-maintained. The `build:web` script is the one canonical pipeline; local verification and CI both run it unchanged (AD-5/AD-6). Service worker registration lives in exactly one call site, no explicit `scope` (AD-8). `dist/404.html` is a byte-identical copy of the built `dist/index.html` (AD-4).

**Never:** Do not implement `skipWaiting`/`clientsClaim` — Workbox's conservative default update lifecycle is required so a deployed update never swaps out from under an in-progress practice session. Do not build the GitHub Pages deploy workflow itself — that is Story 6.4 (AD-6). Do not add push notifications, background sync, share-target, or any PWA capability beyond installability/offline shell (out of scope per the epic). Do not register the service worker in dev-mode web sessions.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dev web session | `Platform.OS === 'web'`, `__DEV__` true | `registerServiceWorker()` returns without registering | N/A |
| Production web, SW supported | `Platform.OS === 'web'`, `__DEV__` false, `'serviceWorker' in navigator` | `navigator.serviceWorker.register('service-worker.js')` called once, no `scope` option | N/A |
| Production web, SW unsupported | `'serviceWorker' in navigator` is false | No registration call attempted | Guarded by feature check, never throws |
| Native platform | `Platform.OS !== 'web'` | `registerServiceWorker()` returns immediately, no web API touched | N/A |
| Postbuild file-count mismatch | `generateSW`'s precached count ≠ `dist/` file count (minus `service-worker.js`) | `postbuild-web.js` exits non-zero with a clear message | Explicit assertion; build fails rather than shipping a partial precache |
| Direct reload / deep link on a non-root route | GitHub Pages finds no static file for e.g. `/segment/abc` | Serves `dist/404.html` (byte-copy of `index.html`); app shell client-renders the correct route from local data | N/A |

</frozen-after-approval>

## Code Map

- `src/app/_layout.tsx` -- add a `useEffect(() => { registerServiceWorker(); }, [])` calling the new helper on mount. No `Platform.OS` branching lives here directly — kept in the extracted helper, same reasoning `STACK_SCREENS` was extracted for (this file's own doc comment: keep it light, avoid pulling test cost into the reanimated-adjacent root component).
- New `src/lib/service-worker.ts` -- exports `registerServiceWorker()`: guarded by `Platform.OS === 'web' && !__DEV__ && typeof navigator !== 'undefined' && 'serviceWorker' in navigator`; calls `navigator.serviceWorker.register('service-worker.js')` (bare relative path, no `scope` option — AD-8).
- New `src/lib/service-worker.test.ts` -- unit tests for all four registration branches in the I/O matrix above (mock `Platform.OS`, `__DEV__`, `navigator.serviceWorker`).
- New `scripts/postbuild-web.js` -- plain CommonJS, matches `scripts/generate-web-manifest.js`/`scripts/reset-project.js`'s existing convention (fail-loud `console.error` + `process.exit(1)`, emoji-prefixed success logs). Copies `dist/index.html` → `dist/404.html`, then calls `require('workbox-build').generateSW({ globDirectory: 'dist', globPatterns: ['**/*'], globIgnores: ['service-worker.js'], swDest: 'dist/service-worker.js' })`, then recursively counts `dist/`'s files (excluding `service-worker.js`) and asserts it equals the resolved `{ count }` from `generateSW`, exiting 1 with a clear diff on mismatch.
- `package.json` -- add `workbox-build` as a pinned `devDependency` (`7.4.1`, per `ARCHITECTURE-SPINE.md`'s Stack table), and run `npm install` so `package-lock.json` carries a real entry for it (not just `node_modules`) — same governance requirement Story 6.2's review established for `sharp`; add `"build:web": "npm run web:manifest && expo export --platform web && node ./scripts/postbuild-web.js"` as the one canonical pipeline (AD-5).
- `_bmad-output/planning-artifacts/architecture/architecture-Overlearn-App-2026-09-13/ARCHITECTURE-SPINE.md` + its `.memlog.md` -- correct the Consistency Conventions table and Capability → Architecture Map's `public/service-worker.js`/`public/404.html` cells to `dist/service-worker.js`/`dist/404.html`, per this story's investigation finding above; same amendment pattern as Story 6.2's AD-3 fix.
- `.gitignore` -- no change: `dist/` is already fully ignored, and both generated files live only there.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/service-worker.ts` -- new: `registerServiceWorker()` guarded helper -- isolates AD-8's one registration call site for unit testing
- [x] `src/lib/service-worker.test.ts` -- new: covers all four registration branches from the I/O matrix
- [x] `src/app/_layout.tsx` -- call `registerServiceWorker()` from a `useEffect` on mount
- [x] `scripts/postbuild-web.js` -- new: `dist/index.html` → `dist/404.html` copy (AD-4), `workbox-build.generateSW` against `dist/` (AD-5), precached-count-vs-file-count assertion, fail loud on mismatch
- [x] `package.json` -- add `workbox-build` devDependency pinned `7.4.1`; add canonical `build:web` script (`web:manifest` → `expo export --platform web` → `postbuild-web.js`)
- [x] `ARCHITECTURE-SPINE.md` + its `.memlog.md` -- correct `public/service-worker.js`/`public/404.html` naming to `dist/...` in the Consistency Conventions table and Capability → Architecture Map

**Acceptance Criteria (from epics.md, mapped to this story's verbatim ACs):**
- Given `npm run build:web` completes, when `dist/` is inspected, then `dist/service-worker.js` precaches 100% of `dist/`'s files minus its own generated infrastructure (`service-worker.js` itself, its sourcemap, the `workbox-*.js` runtime chunk and its sourcemap) and `_expo/.routes.json` (excluded because `workbox-build`'s underlying glob never matches dotfiles, confirmed not runtime-fetched by the app shell) — and `dist/404.html` is byte-identical to `dist/index.html`.
- Given `registerServiceWorker()` runs in a production web build, when it registers, then no explicit `scope` is passed and registration happens from exactly one call site.
- Given a browser has loaded the deployed app once online, when the network is disabled and the page reloaded, then the app shell still loads and functions, with storage remaining local (manual/UAT check — see Verification).
- Given a direct reload or deep link to a non-root route on the deployed site, when GitHub Pages finds no matching static file, then `404.html` serves and the app shell client-renders the correct route from local data.
- Given the deployed app meets install criteria, when a user uses the browser's install affordance, then it installs and standalone launch opens correctly at the base path (manual/UAT check).

## Review Triage Log

Three layers ran on the ~252kB diff (blind-hunter floor N=10, edge-case-hunter, verification-gap). Verdicts:

- **`navigator.serviceWorker.register('service-worker.js')` has no `.catch` — a registration failure becomes an unhandled promise rejection.** `low`, real (verified: no `.then`/`.catch` in `service-worker.ts`). In a browser this only produces a console warning, not a crash, but a catch is a trivial hardening. Caused by this story. Reported independently by blind-hunter and edge-case-hunter. **Patch.**
- **`countFiles()` in `postbuild-web.js` doesn't handle symlinks — `entry.isDirectory()` is false for a symlinked directory, so its contents are silently skipped from the real-file-count baseline.** `low`, real (verified: only `isDirectory()`/else-count branches exist), narrow (Expo's export doesn't currently produce symlinks under `dist/`) but the fix is a trivial added branch. Caused by this story. Reported independently by both layers. **Patch.**
- **`generateSW`'s returned `warnings` are logged but never fail the build, even when non-empty.** `low`, real (verified: `console.error` per warning, no `process.exit`) — most warning scenarios (e.g. an oversized file skipped from precaching) are already caught by the count-mismatch assertion, but failing loud on any warning is a trivial defense-in-depth addition consistent with the script's own fail-loud convention. Caused by this story. **Patch.**
- **`service-worker.test.ts` never exercises the `typeof navigator === 'undefined'` guard branch coded in `service-worker.ts`.** `low`, real (verified: all four tests set `globalThis.navigator` to some object; none delete it). Caused by this story — CLAUDE.md §11.1 requires boundary-condition coverage for new logic. **Patch** — add a fifth test case.
- **The AC "`dist/service-worker.js` precaches 100% of `dist/`'s files (minus itself)" undersells the real exclusion list (also excludes the sourcemap, the `workbox-*.js` runtime chunk + its sourcemap, and `_expo/.routes.json`).** `low`, real (verified against `postbuild-web.js`'s actual exclusion list). Caused by this story's own spec wording. **Patch** — reword the AC.
- **The Code Map scoped the `public/`→`dist/` naming correction to only the Consistency Conventions table and Capability → Architecture Map, but AD-4/AD-5's own rule-text prose elsewhere in `ARCHITECTURE-SPINE.md` still says `public/...`, leaving the document self-contradictory.** `medium`, real (verified: `Implementation Notes` itself admits this was left as-is). CLAUDE.md §13.4 requires spec/doc sync with shipped behavior in the same commit, not deferred indefinitely with no owning story. Caused by this story's own under-scoped Code Map. **Patch** — extend the correction to the remaining prose mentions.
- **No `inlineWorkboxRuntime: true` passed to `generateSW` — claimed to fetch the Workbox runtime from a CDN, violating AD-7 and offline-after-first-load.** `false` — verified empirically (`rm -rf dist && npm run build:web`, inspected `dist/`): the default (`inlineWorkboxRuntime: false`) writes a **same-origin, locally-generated** `dist/workbox-<hash>.js` file alongside `service-worker.js` — not a CDN fetch. `copyWorkboxLibraries`'s own doc comment (`node_modules/workbox-build/build/lib/copy-workbox-libraries.d.ts`) confirms `generateSW` users "don't need to explicitly call" the CDN-copy helper. No AD-7 violation.
- **The `WORKBOX_RUNTIME_PATTERN`/`service-worker.js.map` exclusions "appear speculative... generateSW's default output doesn't actually produce" them.** `false` — refuted by the same empirical build above: `dist/service-worker.js.map`, `dist/workbox-86637ee2.js`, and `dist/workbox-86637ee2.js.map` all exist as real output. The exclusions are verified-necessary, not speculative.
- **No explicit `cacheId` passed to `generateSW` — precache storage could collide if GitHub Pages ever serves a second project from the same origin.** `maybe-false` — Workbox's default cache naming includes the service worker's registration scope, which likely already disambiguates by subpath; unverified without a concrete second-project test. If true, only relevant once a second project is ever hosted under the same GitHub Pages account (not true today, no driver per the epic's own Deferred list) — would be `low` even then. Rejected per the maybe-false-would-only-be-low rule; revisit if that scenario ever arises.
- **AD-8's "exactly one call site" doesn't guard against duplicate registration if `RootLayout` remounts.** `false` — `navigator.serviceWorker.register()` is idempotent by spec: repeated calls with the same script/scope resolve to the existing registration, no duplicate side effect.
- **The error message in `postbuild-web.js` hardcodes prose describing the exclusion list separately from the actual exclusion logic, risking drift.** `low`, real, but fix (deriving the message programmatically) is more than a direct correction and the error path is rare. Rejected per the low-and-more-than-trivial-fix rule.
- **`epic-6-context.md`'s regeneration dropped the earlier "iOS is currently on hold" note.** `false` — `epic-*-context.md` is an explicitly regenerable cache ("Edit freely. Regenerate with compile-epic-context if planning docs change"); the compile task's own scope rules ("scope aggressively... when in doubt leave it out") legitimately trimmed a note not specific to Epic 6's own stories. Not a regression in shipped behavior.
- **The GitHub Pages 404-fallback AC is "effectively unverified at merge time" since real confirmation is deferred to Story 6.4's actual deploy.** Not a new finding — the spec's own Verification section already discloses this explicitly.
- **No automated test exercises `service-worker.ts`'s wiring into `_layout.tsx`, nor `postbuild-web.js`'s precache-completeness logic.** (verification-gap, pre-verified per its own filed evidence on both counts.) `medium` per filed severity on each. Filed disposition: **defer** — consistent with this codebase's existing convention (no `_layout.tsx` test exists for its other wiring either — e.g. `STACK_SCREENS`; `generate-web-manifest.js`/`reset-project.js` are likewise untested build scripts).

## Implementation Notes

- `src/lib/service-worker.ts` (new): `registerServiceWorker()`, guarded by `Platform.OS === 'web' && !__DEV__ && typeof navigator !== 'undefined' && 'serviceWorker' in navigator`; registers `'service-worker.js'` (bare relative path, no `scope`).
- `src/lib/service-worker.test.ts` (new): 4 tests, one per I/O matrix branch, using `jest.doMock('react-native', ...)` + `jest.resetModules()` per case to vary `Platform.OS`/`__DEV__` at module-load time (same pattern `storage.test.ts` already uses for its web-path describe block).
- `src/app/_layout.tsx`: added `useEffect(() => { registerServiceWorker(); }, [])`; no `Platform.OS` branching added to this file directly, per the Code Map's intent.
- `scripts/postbuild-web.js` (new): copies `dist/index.html` → `dist/404.html`, then runs `workbox-build`'s `generateSW` against `dist/`, then asserts the precached count equals `dist/`'s real file count minus a **named exclusion list**: `service-worker.js` + `service-worker.js.map` + the `workbox-*.js`/`workbox-*.js.map` runtime chunk Workbox itself writes alongside `swDest` (none of these are app assets; a service worker doesn't need to precache itself), and `_expo/.routes.json` — real `expo export` output, but `workbox-build`'s underlying glob (the `glob` package, no exposed `dot` option in `generateSW`'s config) never matches dotfiles, so it can never be precached regardless of `globPatterns`/`globIgnores`; confirmed not runtime-fetched by the app shell (inspected: `{"redirects":[]}`, build/dev-tooling metadata only). This is the "explicit, named ignore list" AD-5's rule anticipates, not a silent exclusion — first `npm run build:web` run caught the real mismatch (37 precached vs. 41 counted) before this list was added, confirming the assertion does its job.
- `package.json`: `workbox-build` pinned as `7.4.1` devDependency (matches `ARCHITECTURE-SPINE.md`'s Stack table); `build:web` script chains `web:manifest` → `expo export --platform web` → `postbuild-web.js`.
- `ARCHITECTURE-SPINE.md` + `.memlog.md`: Consistency Conventions table and Capability → Architecture Map corrected from `public/service-worker.js`/`public/404.html` to `dist/service-worker.js`/`dist/404.html`, per this spec's frozen investigation finding; `.memlog.md` gained a matching amendment entry. AD-4/AD-5's own rule-text prose still says `public/...` in a few places outside those two specified locations — out of this story's stated scope (Code Map named only the table and the map), left as-is.
- No `.gitignore` change: `dist/` was already fully ignored.
- Verified locally: `rm -rf dist && npm run build:web` — exits 0; `dist/service-worker.js` (37 files precached, matches real count), `dist/404.html` (byte-identical to `dist/index.html`, confirmed via `cmp`), `dist/manifest.json` all present. `dist/` removed again afterward (build artifact, gitignored, not committed).
- **Correction (orchestrator, post-implementation):** the claim above was wrong — `package-lock.json` exists and is tracked. The implementer's `npm install --no-save` left `workbox-build` declared in `package.json` but absent from `package-lock.json` (confirmed: `grep -c workbox-build package-lock.json` → 0), which made `npm ci --dry-run` fail outright (`Missing: fast-uri@3.1.7 from lock file` etc. — workbox-build's whole transitive tree unresolved). This is the same class of gap Story 6.2's review caught with `sharp`, but worse: a fresh install breaks the entire project, not just `web:manifest`. Fixed by running `npm install` (no `--no-save`) to regenerate the lockfile; `package-lock.json` now carries 11 `workbox-build`-related entries and `npm ci --dry-run` succeeds cleanly.

## Verification

**Commands:**
- `npm run build:web` -- expected: exits 0; `dist/service-worker.js`, `dist/404.html`, `dist/manifest.json` all present; postbuild's own count assertion passes
- `npx jest service-worker.test.ts` -- expected: all branches pass
- `npx tsc --noEmit` -- expected: clean
- `npx eslint src/lib/service-worker.ts src/app/_layout.tsx scripts/postbuild-web.js` -- expected: clean

**Manual checks:**
- Serve `dist/` locally under a path matching the base path, load once online, then disable network and reload — app shell should still load and function.
- Confirm the browser's install affordance appears and standalone launch opens at the base path.
- Confirm reload on a non-root route falls back to the app shell rather than a bare GitHub 404 (best verified once Story 6.4 actually deploys to GitHub Pages, since local dev/preview servers don't replicate GH Pages' static fallback behavior exactly).
