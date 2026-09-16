---
title: 'Story 6.4: GitHub Pages Deploy Workflow'
type: 'feature'
created: '2026-09-15'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: []
baseline_commit: 'c1648a9c61c3a589644805ba398e0a9e2171a245'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Stories 6.1–6.3 made the web build correct (storage parity, base path/manifest, installable offline shell), but nothing publishes it — `build:web`'s output only ever exists locally, so the epic's own goal (reaching users the native build excludes) is still unmet.

**Approach:** Add `.github/workflows/deploy-pages.yml`: a `workflow_dispatch`-only Actions workflow that guards against running from any ref but `main`, then runs `npm ci` → `npm run lint` → `npx tsc --noEmit` → `npm test` → `npm run build:web` → publishes `dist/` via `actions/upload-pages-artifact` + `actions/deploy-pages` (AD-6) — no other file changes.

**Decided (2026-09-15, human):** the deploy gates on lint, typecheck, and test all passing before `build:web` runs — a red check fails the workflow before any build/publish step, rather than only building and publishing per the AC's literal steps.

## Boundaries & Constraints

**Always:** `workflow_dispatch` is the only trigger (no `push`/`schedule`) (AD-6). Build via the single canonical `build:web` script — never a parallel or hand-rolled build sequence. Install with `npm ci` so the workflow honors the committed lockfile exactly. Publish via the first-party `actions/upload-pages-artifact` + `actions/deploy-pages` pair, no third-party action, no `gh-pages` branch. Fail fast, before building, if dispatched against any ref other than `main`.

**Never:** No push-triggered or scheduled deploy. No multi-environment (staging/preview) deploy. No rollback job. No secrets beyond the default `GITHUB_TOKEN`/OIDC permissions `actions/deploy-pages` itself requires. Do not modify `build:web` or any file Stories 6.1–6.3 shipped.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Manual dispatch against `main` | `workflow_dispatch` run, ref = `main` | `build:web` runs, `dist/` published, site live at the GitHub Pages URL | N/A |
| Manual dispatch against a non-main ref | `workflow_dispatch` run, ref ≠ `main` | Job fails immediately with a clear message, before `npm ci`/build start | Explicit ref check, non-zero exit |
| Commit pushed to `main` | push event | No workflow run triggered at all | N/A — no `push` trigger registered |
| `build:web` fails (e.g. postbuild precache-count mismatch) | `generateSW`/count-mismatch or any build step error | Workflow run fails, nothing published | Existing fail-loud exit codes propagate as the step's non-zero exit |

</frozen-after-approval>

## Code Map

- `.github/workflows/deploy-pages.yml` (new) — the only file this story touches. `workflow_dispatch` trigger; a guard step comparing `github.ref` to `refs/heads/main` (fail otherwise); `actions/checkout`, `actions/setup-node` (cache: `npm`), `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build:web`; `actions/configure-pages`, `actions/upload-pages-artifact` (path: `dist`), `actions/deploy-pages`; `permissions: { contents: read, pages: write, id-token: write }`; `concurrency: { group: pages, cancel-in-progress: false }` so overlapping manual dispatches queue rather than race.
- No Node-version pin exists anywhere in the repo (no `.nvmrc`/`engines` field) — this workflow is the first place one is needed; pin `actions/setup-node`'s `node-version` to the major version installed locally (`24`) since nothing else in the repo asserts a different requirement.
- `package.json`'s `build:web` script (`src/lib` and `scripts/` files it runs) — read-only reference, not modified.

## Tasks & Acceptance

**Execution:**
- [x] `.github/workflows/deploy-pages.yml` -- new: `workflow_dispatch`-only trigger, main-ref guard, `npm ci`, lint/typecheck/test gate, `npm run build:web`, publish `dist/` via `actions/upload-pages-artifact` + `actions/deploy-pages` -- implements AD-6 and this story's sole AC

**Acceptance Criteria (from epics.md, corrected to the amended AD-4/AD-5 pipeline — `dist/`, not `public/`, and including the `web:manifest` step epics.md's own wording omits):**
- Given `.github/workflows/deploy-pages.yml` is configured with a `workflow_dispatch` trigger only, when it is manually run against `main`, then it runs `npm run lint`, `npx tsc --noEmit`, and `npm test`, and only if all three pass does it execute the canonical `build:web` script (`web:manifest` → `expo export --platform web` → Workbox postbuild + `404.html` copy) and publish `dist/` via `actions/upload-pages-artifact` + `actions/deploy-pages` (AD-6).
- Given lint, typecheck, or test fails, when the workflow runs, then it fails before `build:web` starts and nothing is published.
- Given a successful run, when the deployment completes, then the app is live and reachable at the GitHub Pages URL, and a segment created plus a session run to completion there persists across a reload, identically to the local-dev-server check (manual/UAT check — see Verification).
- Given the workflow has no push trigger, when a commit is pushed to `main`, then no deploy is triggered (AD-6).
- Given a manual dispatch against a ref other than `main`, when the workflow starts, then it fails immediately with a clear message before `build:web` runs.
- Given the whole epic, when any story in it is implemented, then no backend, account system, or telemetry is introduced anywhere in the web-delivery surface (AD-7) — this workflow only builds and publishes static files; no server-side step is added.

## Implementation Notes

- `.github/workflows/deploy-pages.yml` (new, only file touched): `on: workflow_dispatch` with no other trigger; first step is the main-ref guard (`if: github.ref != 'refs/heads/main'`, fails before `actions/checkout` even runs); then `actions/checkout@v4` → `actions/setup-node@v4` (`node-version: '24'`, `cache: 'npm'`) → `npm ci` → `npm run lint` → `npx tsc --noEmit` → `npm test` → `npm run build:web` → `actions/configure-pages@v5` → `actions/upload-pages-artifact@v3` (`path: dist`) → `actions/deploy-pages@v4` (`id: deployment`, feeding the job `environment.url`). `permissions`/`concurrency` blocks match the Design Notes exactly. Action versions pinned to major tags, not SHAs (no pinning policy was specified beyond the Node version).
- Verified: `npm run build:web` exits 0 locally (37 files precached, count matches, `dist/404.html` generated); the workflow YAML parses cleanly (`js-yaml`); `npx tsc --noEmit` clean; `git status` confirms only this one file was added — `build:web` and all Story 6.1–6.3 files untouched.
- Not verified (inherent to this story, not an implementation gap): the workflow has not actually run on GitHub Actions — that requires a live manual dispatch plus the one-time repo Settings → Pages → Source = "GitHub Actions" change, both called out as manual/UAT steps in Verification below. `actionlint` was unavailable in this environment; relied on `js-yaml` parse + manual review against the spec's Code Map/Design Notes instead, as the spec's own Verification section allows.

## Review Triage Log

Three layers ran on the ~1.7kB diff (blind-hunter floor N=2, edge-case-hunter, verification-gap). Verdicts:

- **No `timeout-minutes` set on the `build-and-deploy` job; combined with `concurrency: { cancel-in-progress: false }`, a hung step (e.g. a stuck `npm test`) blocks every subsequent manual dispatch until GitHub's 360-minute job default elapses or a human manually cancels.** `medium`, real (verified: no `timeout-minutes` key anywhere in the job; `cancel-in-progress: false` confirmed in the diff). Caused by this story. Reported independently by blind-hunter and edge-case-hunter. **Patch** — add an explicit `timeout-minutes` to the job.
- **The ref-guard's error message states the actual `github.ref` value but never states that only `refs/heads/main` is accepted**, so a dispatch against a tag ref (e.g. `refs/tags/v1.2.0`) prints a value without explaining why a tag never qualifies. `low`, real (verified: message is `deploy-pages must be run against main (got ${{ github.ref }})`, no mention of the expected `refs/heads/main` form). Caused by this story. Fix is a direct wording change. **Patch.**
- **No in-workflow hint that `Settings → Pages → Source = GitHub Actions` must be set before the first run succeeds** — `configure-pages`/`deploy-pages` will fail with a GitHub-side error unrelated to anything the workflow itself controls. `low`, real (verified: no comment or step references this prerequisite, though the spec's own Verification section documents it as a manual one-time step). Caused by this story's omission of a pointer back to that step. Fix is a direct comment addition. **Patch.**
- **`actionlint` was never actually run against the file** — only a `js-yaml` parse (syntax only, not GitHub Actions semantics) plus manual review. `false` — the spec's own Verification section explicitly sanctions this fallback ("review the file's syntax manually, or run `npx actionlint` if available"); `actionlint` was confirmed unavailable in this environment, and manual review against the spec's Code Map/Design Notes found no deviation. Not a gap; the disclosed alternative was followed as specified.
- **GitHub Actions referenced by floating major-version tags (`@v4`/`@v5`), not pinned commit SHAs, on a workflow holding `pages: write`/`id-token: write`.** `low`, real but rejected: the spec's own Design Notes prescribe exactly this tag-based pattern, AD-6 already restricts the workflow to first-party `actions/*` (materially lower supply-chain risk than the third-party-action incidents this class of finding usually targets), and the fix (resolving and maintaining SHA pins across five actions) is more than a direct correction for a solo-maintainer, manual-dispatch-only deploy. Rejected per the low-and-more-than-trivial-fix rule.
- **The `github-pages` deployment environment has no in-repo protection rules (required reviewers, allowed branches).** `false`/out of scope — the frozen Boundaries explicitly exclude multi-environment deploy and a rollback procedure, and `ARCHITECTURE-SPINE.md`'s own Deferred section already covers this exact class of concern (no current driver). The intent itself excludes it.
- **No `.gitattributes` pins line endings under `.github/**`, so `git diff`/checkout emits "LF will be replaced by CRLF" noise on this file.** `low`, real but deferred: this is a repository-wide gap (every file touched this session shows the same warning, not something introduced by this story specifically). **Defer.**

## Design Notes

`actions/deploy-pages` requires OIDC (`id-token: write`) and `pages: write` permissions, and a `concurrency` group so a second manual dispatch queues instead of racing an in-flight deploy:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
```

The ref guard is a plain shell check early in the job, not a `workflow_dispatch` input restriction (GitHub has no built-in way to restrict which ref a manual dispatch can target):

```yaml
- name: Refuse to deploy from a non-main ref
  if: github.ref != 'refs/heads/main'
  run: |
    echo "::error::deploy-pages must be run against main (got ${{ github.ref }})"
    exit 1
```

## Verification

**Commands:**
- `npm run build:web` -- expected: exits 0 locally (already verified working as of Story 6.3's closure); confirms the workflow's own build step will succeed before relying on CI to catch it
- (no local linter for GitHub Actions YAML is configured in this repo; review the file's syntax manually, or run `npx actionlint` if available)

**Manual checks:**
- One-time repo setting, outside this story's code: in GitHub → repo Settings → Pages, set Source to "GitHub Actions" — the workflow cannot publish until this is set.
- Manually run the workflow via the Actions tab → "Run workflow" against `main`; confirm it completes green and the deploy step reports the live Pages URL.
- On the live URL: create a segment and run a session to completion, reload, confirm it persisted; disable network and reload, confirm the app shell still works; confirm the browser's install affordance appears; reload directly on a non-root route (e.g. `/segment/<id>`) and confirm the app shell loads rather than a bare 404 — this closes the manifest/asset e2e check `deferred-work.md` deferred to this story.
- Manually dispatch the workflow against a non-`main` ref (e.g. this feature branch) and confirm the ref guard fails it before any build step runs.
