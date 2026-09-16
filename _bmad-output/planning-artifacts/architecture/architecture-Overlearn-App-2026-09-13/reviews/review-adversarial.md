---
type: architecture-review
lens: adversarial
target: ARCHITECTURE-SPINE.md (Web platform support, 2026-09-13)
created: '2026-09-13'
---

# Adversarial Review — Web platform support spine

Method: construct concrete pairs of implementers, each obeying every AD to the
letter, and check whether their outputs are actually compatible — not just
individually correct.

## Verdict

The spine correctly identifies base-path drift and the SPA-fallback
requirement as risks (AD-3, AD-4) but does not close them: it names *that*
one value/mechanism must be shared, not *which config key or file* carries
it, leaving at least three genuine implementer-vs-implementer collisions
open.

---

## Finding 1 — AD-3's "single base-path value" has no named home [HIGH]

**Pair:** the developer implementing `app.json`'s PWA manifest fields
(`start_url`, `scope`) vs. the developer wiring the service worker
registration call, vs. the developer writing `deploy-pages.yml`'s build step.

**Collision:** AD-3's rule says "a single base-path value is the source of
truth for all three" but never names *which* value — no config key, no env
var name, no constants module. Each of the three consumers can honestly
satisfy "I read the one shared base path" while actually inventing their own
mechanism:

- Manifest author hardcodes the literal string `/Overlearn-App/` directly in
  `app.json`.
- SW-registration author reads `import.meta.env.BASE_URL` (a bundler
  convention that may not even be populated by Expo's web export).
- CI-workflow author sets `EXPO_PUBLIC_BASE_PATH` as a GitHub Actions env var
  for the build step, a third name nobody else reads.

All three ADs-compliant in isolation; the app 404s or mis-scopes its SW the
moment any one of the three is renamed, or the moment a custom-domain switch
(the deferred item) touches only the file its author remembers to touch.

**Fix:** Tighten AD-3 from "a single base-path value" to a named, singular
mechanism — e.g.: *"The base path is the string literal in `app.json`'s
`expo.extra.basePath`. Router config imports it directly (not a re-derived
copy); manifest generation reads the same field at build time; the SW
registration call never passes an explicit `scope` option and instead relies
on the SW file being served from a path under that base (see Finding 2); the
GitHub Actions workflow does not set a competing env var — it invokes the
same npm build script that already reads `app.json`."* Pin the exact
key name now, not "a" value.

---

## Finding 2 — Service worker registration call site is unowned [HIGH]

**Pair:** the developer implementing `src/lib/storage.ts`'s web branch
(who is already touching web-only bootstrapping) vs. the developer running
the Workbox postbuild step (who owns `public/service-worker.js`'s
*content* per AD-5).

**Collision:** AD-5 binds to the SW file and the postbuild generation step.
Nothing in the spine binds to the `navigator.serviceWorker.register(...)`
call itself — the code that actually activates the worker at boot. The
Structural Seed lists no file for it. Two independently-plausible owners
exist (a bootstrap effect near the storage web-branch work, since both are
"web-only startup concerns"; or something injected into the exported HTML
during the postbuild step, since that's already touching build output). If
both developers assume the other owns it: no registration ever ships (app
never becomes installable/offline-capable, silently failing AD-7's implied
"offline shell" goal without any test catching it, since `expo start --web`
dev testing typically doesn't hit a production SW path). If both assume they
own it: double registration, and — worse — one of the two hardcodes an
explicit `scope` option while the other relies on the file's served-path
default, which can make the *second* registration throw (`register()` rejects
if `scope` exceeds the SW's own directory).

**Fix:** New AD (or extend AD-5's binds list): name the exact file/module
that calls `.register()` (e.g. the root `_layout.tsx`, guarded by
`Platform.OS === 'web'`), and state explicitly: *never pass an explicit
`scope` option* — correctness comes from AD-3 placing the SW file at the
right subpath, not from a second, independently-typed scope string.

---

## Finding 3 — AD-4's fallback mechanism and file ownership are both unstated [HIGH]

**Pair:** the developer wiring `.github/workflows/deploy-pages.yml` (AD-6)
vs. the developer authoring `public/404.html` (AD-4).

**Collision:** AD-4 names the file (`404.html → app shell`) and declares the
rewrite "non-optional," but not the mechanism. Two standard, mutually
plausible approaches exist:

- **Plain copy**: `404.html` is a byte-identical copy of `index.html`; GitHub
  Pages serves it on any unmatched path, the browser keeps the requested URL,
  and the client router parses `location.pathname` on mount. No other code
  needed.
- **Redirect/decode trick** (the common "spa-github-pages" pattern):
  `404.html` carries a script that re-encodes the path into a query string
  and redirects to the base URL; `index.html` (or the root layout) must carry
  a *matching* decode script, with a `pathSegmentsToKeep` constant tuned to
  the base-path depth from Finding 1.

Nothing in the spine picks one. Worse, ownership of *producing* the file is
also ambiguous: `public/404.html` sits under `public/`, which `expo export`
copies verbatim into `dist/` — implying a hand-committed static file — yet
the natural place to *generate* it correctly (so it always matches whatever
`index.html` the build actually produced, per AD-5's own "never hand-maintain
what the build produces" principle applied to the SW precache list) is the
postbuild step or the deploy workflow. Concretely: the `deploy-pages.yml`
author, reading AD-6's "publish the static export," might reasonably add
`cp dist/index.html dist/404.html` as a workflow step — silently overriding
whatever hand-authored `public/404.html` (with redirect-trick script) another
developer committed, deleting that developer's work with no error. Or the
reverse: the committed static file is what ships, and the workflow author's
copy step never runs because the file already exists, leaving stale content
after an unrelated `index.html` change.

**Fix:** Pin one mechanism in AD-4's rule text (recommend: plain-copy, since
Expo Router already does history-API pathname parsing and the redirect trick
is unneeded complexity — confirm this against actual router behavior before
adopting). Name the single pipeline stage that produces the file (recommend:
the same postbuild step as AD-5, immediately after Workbox's `generateSW`
runs against `dist/`, so precache manifest and fallback are generated from
the same build artifact in the same step) and state explicitly that
`public/404.html` is never a hand-committed static file.

---

## Finding 4 — Workbox `generateSW` glob scope is unspecified [MEDIUM]

**Pair:** the developer implementing `app.json`'s PWA manifest icon fields
vs. the developer configuring Workbox's `generateSW({ globPatterns, ... })`.

**Collision:** AD-5 says the precache manifest is "generated, not
hand-maintained," from `dist/`'s real output — but doesn't say the glob
covers *all* of it. `generateSW`'s default `globPatterns` targets common web
asset extensions; PNG/ICO manifest icons and `manifest.json` itself are not
guaranteed to match a default or narrowly-scoped pattern. A developer wiring
icons into `app.json` has no reason to know Workbox's glob config exists,
let alone verify it covers icon files; the Workbox-config developer has no
reason to enumerate icon filenames the manifest author chose. Result:
offline-installed launch icon (or `manifest.json` fetch itself) silently
breaks offline, with the AD-5 "generated from real output" guarantee giving
false confidence that this can't happen.

**Fix:** Extend AD-5's rule: `globPatterns`/`globDirectory` must resolve to
*every* file `expo export` emits under `dist/`, including `manifest.json`
and icon assets — no extension-based include-list; verify by asserting
precache-manifest file count against a full `dist/` file count as part of
the postbuild step, not by eyeballing a glob string.

---

## Finding 5 — No single build command shared by local verification and CI [MEDIUM]

**Pair:** a developer manually verifying the web build locally (per the
spec's manual-check acceptance criteria) vs. the developer authoring
`deploy-pages.yml`'s build step.

**Collision:** AD-5 (postbuild step) and AD-6 (workflow) each describe
*that* `expo export` is followed by a Workbox step, but neither names one
canonical command. A local dev, verifying "offline after first load" before
sign-off, might run `expo export --platform web` alone (no postbuild),
observe correct non-offline behavior, and sign off — while
`deploy-pages.yml` independently reimplements the Workbox call inline in
YAML with different `generateSW` options (e.g. different `globPatterns`,
closing Finding 4 differently in CI than whatever the local postbuild script
does). The two builds are then not the same artifact, and "verified locally"
stops meaning anything about what ships.

**Fix:** Require one `package.json` script (e.g. `build:web`) that runs
`expo export --platform web` + the Workbox postbuild step + the 404.html
generation from Finding 3, and require `deploy-pages.yml` to invoke that
script rather than reimplement its steps inline. Add to Consistency
Conventions.

---

## Finding 6 — Multi-deploy compounding on long-lived tabs [LOW, note only]

AD-5's "activate only after all old-version tabs close" is a sound per-deploy
guarantee, but the spine doesn't state what happens to a tab left open across
*two or more* deploys (each new SW version waiting behind the last). This is
a plausible edge case for a practice app users may leave open for a long
session, but it's a refinement of AD-5's existing intent rather than a new
collision between two builders — flagged for awareness, no new AD proposed
unless product wants a bounded staleness guarantee.

---

## Summary Table

| # | Pair | Collision | Severity | Proposed fix |
|---|------|-----------|----------|---------------|
| 1 | manifest author / SW-registration author / CI-workflow author | Base path threaded via three different mechanisms/names | HIGH | Name one config key (e.g. `app.json#expo.extra.basePath`); all three must import it, not re-derive it |
| 2 | storage.ts web-branch author / Workbox postbuild author | No named owner for `navigator.serviceWorker.register()`; risk of none, two, or a scope conflict | HIGH | New/extended AD naming the exact registration call site; forbid explicit `scope` option |
| 3 | deploy-workflow author / 404.html author | Two plausible fallback mechanisms, two plausible file owners, risk of silent overwrite | HIGH | Pin plain-copy mechanism; make 404.html generated by the same postbuild step as the SW, never hand-committed |
| 4 | manifest-icon author / Workbox-config author | Icons/manifest.json may fall outside default precache globs | MEDIUM | Extend AD-5: precache must cover 100% of `dist/` output, verified by file-count assertion |
| 5 | local verifier / CI-workflow author | No single build command; local and CI builds can silently diverge | MEDIUM | One `package.json` script consumed by both local checks and CI |
| 6 | (n/a — refinement) | Long-lived tab across multiple deploys | LOW | Note only; no AD change proposed |
