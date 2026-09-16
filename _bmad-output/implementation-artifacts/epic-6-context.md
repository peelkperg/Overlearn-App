# Epic 6 Context: Web Platform Access

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Musicians without iOS access — or anyone preferring a browser — can install and use Overlearn as an offline-capable web app, matching native functionality exactly, hosted free with no ads and no new accounts. This is platform parity, not new user-facing behavior: no functional requirements are added or changed. The work is strictly sequential — a web-compatible storage layer with nowhere to deploy it, or a deployed build that can't persist data, both fail the epic's own goal — so storage parity lands first, then installability, then hosting/deploy.

## Stories

- Story 6.1: Web-Compatible Storage Layer
- Story 6.2: Base Path & PWA Manifest Configuration
- Story 6.3: Installable Offline App Shell
- Story 6.4: GitHub Pages Deploy Workflow

## Requirements & Constraints

- No new or modified FRs; covers NFR10 (web build must remain fully functional offline after first load, installable as a standalone PWA, not just a page requiring constant connectivity) plus an addendum to NFR8/9: web's storage durability is weaker than native's (no OS sandbox or backup; lost on cleared browser data, private mode, or a browser/profile switch) — the "zero data leaves the device" / no-accounts guarantee itself is unchanged.
- Non-goals (out of scope for this epic): the broader PWA feature surface beyond installability/offline shell (push notifications, background sync, share-target); a custom domain (subpath deploy accepted for now); a full cross-browser/UAT-equivalent polish audit; multi-environment (staging/preview) deploy; a deploy rollback procedure.
- Epic-level success signal: a segment created and a practice session run to completion on the live GitHub Pages URL (not the local dev server) persists across a reload, works offline after first load, installs via the browser's own install affordance, and a direct reload on a non-root route loads the app shell rather than 404ing — with zero regressions in the existing native storage test suite.

## Technical Decisions

- **Storage stays one port, two adapters** — MMKV (native) and `localStorage` (web), selected once at module load by `Platform.OS`, never at call time. `react-native-mmkv@4.3.2`'s own web build already provides the `localStorage`-backed implementation (construction + every raw-store method); `storage.ts` needs no hand-rolled adapter and no added `Platform.OS` branch beyond what the dependency resolves via Metro. Envelope/quarantine/migration conventions are reused unmodified across platforms.
- **`subscribeToKeys` fan-out on web** is synchronous, provided by the same dependency, with an explicit unsubscribe handle — matching native semantics. Per-listener error isolation is *unverified* upstream (the dependency's fan-out has no per-callback try/catch): treat as needing a confirming test, and if it doesn't hold, that's a dependency-level gap to log, not something to patch in this codebase.
- **One base path is the single source of truth**: `app.json`'s `expo.experiments.baseUrl` (not `expo.extra.basePath` — corrected after build investigation showed Expo's static-export pipeline never reads that key). Router config, PWA manifest `start_url`/`scope`, and the service worker's registration path all read this same key directly; none re-derives or hardcodes it.
- **Deep links past the root** (`segment/[id]`, `segment/[id]/rename`, `session/[id]`) are client-rendered, unknowable at build time. Online, GitHub Pages' standard fallback applies: `dist/404.html` is a byte-identical copy of `dist/index.html`. Offline, the service worker's `navigateFallback: 'index.html'` (with `_expo/` denylisted) is what actually serves the shell — `404.html` covers the online case only.
- **Service worker precache is Workbox-generated** (`workbox-build`, pinned `7.4.1`) from the real `dist/` output, asserting 100% file-count coverage (fails build on mismatch) and an explicit 4 MiB size cap (default 2 MiB would silently drop the ~2.0 MiB main bundle). Conservative update lifecycle (no `skipWaiting`/`clientsClaim`): a tab stays on the old version until closed and reopened, so an in-progress session is never swapped under itself. One canonical `build:web` script covers the full pipeline — `web:manifest` → `expo export --platform web` → `404.html` copy → `generateSW` — used identically for local runs and CI.
- **Service worker registration has exactly one call site** (the web entry point / root layout's web-only boot path), no explicit `scope` passed. The registered script path must be *absolute*, built from the base-path config (`${baseUrl}service-worker.js`) — a relative path breaks for visitors whose first load was a deep link, since the static export emits no `<base>` tag.
- **Deploy**: `.github/workflows/deploy-pages.yml`, `workflow_dispatch` only (never on push to `main`), via `actions/upload-pages-artifact` + `actions/deploy-pages` (no `gh-pages` branch, no third-party action).
- **No backend, accounts, or telemetry** anywhere in the web-delivery surface — GitHub Pages serves static files only.
- Generated-file naming (build output, not committed): `dist/service-worker.js`, `dist/404.html`.

## Cross-Story Dependencies

- Strict order within the epic: 6.1 (storage web-parity) blocks 6.2/6.3 (installability); 6.3 (offline shell, service worker) blocks 6.4 (deploy uses the same `build:web` pipeline). No story depends on a later one.
- No dependency on Epics 1–5; this epic touches no file any of them touch.
