---
title: 'Story 6.2: Base Path & PWA Manifest Configuration'
type: 'feature'
created: '2026-09-14'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
context: []
baseline_commit: 'cbf50e9a9c1907013842e7d10c98946269212ae2'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Overlearn's web build will be hosted on a GitHub Pages subpath (`/Overlearn-App/`), not the domain root. Nothing today derives that path — the router would resolve assets/routes wrong, and there is no web app manifest at all, so the app can't be installed as a standalone PWA (Story 6.3's install/offline ACs depend on one existing).

**Investigation finding (2026-09-14):** `ARCHITECTURE-SPINE.md` AD-3 specifies the single source of truth as `app.json#expo.extra.basePath`, but that key is never actually read by Expo's static-export pipeline. The mechanism this Expo/expo-router version (`expo` ~57.0.18, Metro static export) actually uses is `app.json#expo.experiments.baseUrl` — read internally by `@expo/cli`'s `getBaseUrlFromExpoConfig` and applied automatically to routing and asset URLs during `expo export --platform web`. There is also no automatic web-manifest generation in this Expo version (confirmed: no `manifest.json`/`short_name` handling anywhere in `@expo/cli`/`@expo/config`) — `app.json`'s `web` section only covers `output`/`favicon`. **Decision: AD-3 is amended to name `experiments.baseUrl` as the actual single source of truth** (same "no independent re-derivation" invariant, corrected key), and this story adds the manifest as a small generated file rather than assuming Expo produces one.

**Approach:** Set `app.json#expo.experiments.baseUrl` to `/Overlearn-App/`. Add `scripts/generate-web-manifest.js` (plain Node, matching `scripts/reset-project.js`'s existing convention) that reads `app.json` for the name and `baseUrl`, and writes `public/manifest.json` with `start_url`/`scope` set to that same `baseUrl` — never a hardcoded literal. Generate two PWA-sized icons (192×192, 512×512) from the existing 1024×1024 `assets/images/icon.png` master via `sharp` (already present in `node_modules`), committed to `public/`. Add `src/app/+html.tsx` (expo-router's document-customization file, none exists yet) to link the manifest and set `theme-color`, reading `baseUrl` from `expo-constants` at build time — not a second hardcoded copy of the path.

## Boundaries & Constraints

**Always:** The base path lives in exactly one place (`app.json#expo.experiments.baseUrl`); every other file that needs it (manifest generator, `+html.tsx`) reads it from there at build time, never a copied literal. `public/manifest.json` is a generated artifact, not hand-edited. No backend, accounts, or telemetry are introduced (binds this story per AD-7, same as the rest of Epic 6).

**Never:** Do not build the combined `build:web` pipeline (export → 404.html → service-worker) here — that is Story 6.3's scope (AD-5). Do not add a custom domain or any non-GitHub-Pages hosting assumption. Do not hand-author `public/manifest.json` directly.

</frozen-after-approval>

## Code Map

- `app.json` -- add `expo.experiments.baseUrl: "/Overlearn-App/"`. This is the corrected single source of truth (see AD-3 amendment above); nothing else may hardcode this string.
- `_bmad-output/planning-artifacts/architecture/architecture-Overlearn-App-2026-09-13/ARCHITECTURE-SPINE.md` -- AD-3 needs its `Rule` text corrected from `expo.extra.basePath` to `expo.experiments.baseUrl`, same amendment pattern Story 6.1 used for AD-1/AD-2 (in-place edit + `.memlog.md` event entry).
- `scripts/reset-project.js` -- existing precedent for a plain CommonJS Node script under `scripts/`; mirror its style for the new generator.
- `src/constants/theme.ts` -- `light.background` (`#ffffff`) and `light.accent` (`#127A45`) are the existing brand colors; reuse these as the manifest's `background_color`/`theme_color` rather than inventing new ones. No cross-file import (script is plain JS, theme.ts is TS) — inline the two literals in the script with a comment pointing back to this file as the source of truth to keep in sync.
- `assets/images/icon.png` -- 1024×1024 master icon; source for the two generated PWA icon sizes.
- New `scripts/generate-web-manifest.js` -- reads `app.json`, writes `public/manifest.json` (name, `short_name`, `start_url`, `scope`, `display: "standalone"`, `background_color`, `theme_color`, icons array pointing at the two generated PNGs) and resizes `assets/images/icon.png` into `public/icon-192.png`/`public/icon-512.png` via `sharp`.
- `package.json` -- `sharp` is physically present in `node_modules` (confirmed) but was never declared: no `dependencies`/`devDependencies` entry, no `package-lock.json` entry (`npm ls sharp` reports it `extraneous`). Declare it as a pinned `devDependency` at its currently-installed version and run `npm install` to regenerate the lockfile entry -- it is a build-time-only tool (never shipped in the app bundle), actively maintained, MIT-licensed, satisfying Section 5.2/8.7 governance. A fresh `npm ci` before this fix would silently delete it and break `web:manifest` with `Cannot find module 'sharp'`.
- New `src/app/+html.tsx` -- expo-router document template. Base it on the framework default (charset, viewport meta, `ScrollViewStyleReset` from `expo-router/html`) and add `<link rel="manifest">` + `<meta name="theme-color">`, with the href built from `Constants.expoConfig?.experiments?.baseUrl` (via `expo-constants`, already a dependency) — not a literal string.
- `package.json` -- add a `"web:manifest": "node ./scripts/generate-web-manifest.js"` script. Do not fold this into a combined `build:web` pipeline yet — Story 6.3 (AD-5) owns creating that canonical script alongside `404.html`/service-worker generation; this story's script must run standalone before `expo export --platform web`.
- `.gitignore` -- add `public/manifest.json` (generated from `app.json`, never hand-committed — same convention Story 6.3 will use for `public/404.html`/`public/service-worker.js`). The two generated icon PNGs ARE committed (static, config-independent, like other files under `assets/images/`).

## Tasks & Acceptance

**Execution:**
- [x] `app.json` -- add `expo.experiments.baseUrl: "/Overlearn-App/"`
- [x] `ARCHITECTURE-SPINE.md` + its `.memlog.md` -- amend AD-3's rule text to the correct key, in place, following the AD-1/AD-2 amendment pattern
- [x] `scripts/generate-web-manifest.js` -- new script: read `app.json`, emit `public/manifest.json` + `public/icon-192.png` + `public/icon-512.png`
- [x] `src/app/+html.tsx` -- new document template linking the manifest and setting `theme-color`, base path read via `expo-constants`
- [x] `package.json` -- add `web:manifest` script AND declare `sharp` as a pinned `devDependency` at its installed version, then run `npm install` so `package-lock.json` gains a real entry (was `extraneous` -- see Spec Change Log)
- [x] `.gitignore` -- ignore `public/manifest.json`
- [x] `spec-web-platform-support/SPEC.md` -- update CAP-2's relevant constraint bullet if it still names `extra.basePath`

**Acceptance Criteria (from epics.md, verbatim ACs this story must satisfy):**
- Given `app.json#expo.experiments.baseUrl` (the corrected key) is set to the GitHub Pages subpath, when the app is built for web, then the router's base URL resolves assets and routes correctly at that subpath, and no other file hardcodes or re-derives the path.
- Given `app.json`'s web manifest fields, when the manifest is generated, then `start_url` and `scope` match the same `baseUrl` value.

## Implementation Notes

- `app.json#expo.experiments.baseUrl` set to `/Overlearn-App/`; `ARCHITECTURE-SPINE.md` AD-3 and `spec-web-platform-support/SPEC.md` corrected to the same key.
- `scripts/generate-web-manifest.js` (new): derives `public/manifest.json` and two `sharp`-resized icon PNGs from `app.json`, fail-loud on a missing/malformed `baseUrl` or `app.json`, icons generated before the manifest that references them.
- `src/app/+html.tsx` (new): expo-router document template linking the manifest and `theme-color`, `baseUrl` read via `expo-constants` with the same fail-loud guard.
- `package.json`/`package-lock.json`: `web:manifest` script added; `sharp` (previously `extraneous`, undeclared) now a pinned `devDependency`.
- Verified: `npm ls sharp` resolved, `node ./scripts/generate-web-manifest.js` exit 0 with correct output, `npx expo export --platform web` built clean with `dist/` assets/manifest/link href all prefixed `/Overlearn-App/`, `npx tsc --noEmit` clean, `npx eslint` clean.

## Review Triage Log

Three layers ran on the ~16.3kB diff (blind-hunter floor N=5, edge-case-hunter, verification-gap). Verdicts:

- **`scripts/generate-web-manifest.js` requires `sharp`, but `sharp` is not declared in `package.json` (no `dependencies`/`devDependencies` entry, no `package-lock.json` entry) — `npm ls sharp` reports it `extraneous`.** `high`, real (verified: grepped `package.json` and `package-lock.json`, zero matches; `npm ls sharp` confirms extraneous). Caused by this story. Root cause is in the non-frozen Code Map/Tasks (which said "already present in node_modules" but never added a task to declare/pin it) — the frozen Approach's premise remains true and adequate, only the task list omitted formal governance. Routed **bad_spec**: Code Map/Tasks amended to add an explicit task pinning `sharp` as a `devDependency` at its installed version (`0.35.4`) with an `npm install` to regenerate the lockfile entry, satisfying Section 5.2/8.7 governance. Reported by all three layers independently.
- **Neither `scripts/generate-web-manifest.js` nor `src/app/+html.tsx` validates `baseUrl` before concatenating it into paths** (`${baseUrl}icon-192.png`, `${baseUrl}manifest.json`) or falls back silently to `""` when the key is missing. `medium`, real (verified: naive template-literal concatenation, no guard, confirmed in both files). Caused by this story. **Moot** — this iteration loops back via the bad_spec entry above; will be re-verified after re-derivation. If still present next round, route **patch** (trivial guard: assert `baseUrl` is truthy and ends with `/`, fail loud otherwise).
- **`require(app.json)` is unguarded — malformed JSON throws an uncaught `SyntaxError` with a raw stack trace instead of the script's own clean error handling.** `low`, real but narrow (a corrupted `app.json` already breaks the entire Expo build, not just this script; failure is loud, just not pretty). Caused by this story. **Moot** — same reason as above.
- **`src/app/+html.tsx` hardcodes `#127A45`/theme-color with no comment pointing back to `src/constants/theme.ts`, unlike the same literal in `generate-web-manifest.js` which carries one.** `low`, real (verified: diff shows no such comment in `+html.tsx`). Caused by this story. **Moot** — same reason as above.
- **Manifest icons carry no `purpose: "any maskable"` field.** Rejected: unlikely to be noticed in everyday use (browsers fall back to plain icons), and a real fix requires safe-zone-aware icon regeneration, not a direct correction — exceeds the low-finding threshold for keeping.
- **`public/manifest.json` is gitignored while `public/icon-192.png`/`icon-512.png` are committed — reviewer read this as an inconsistency.** `false` — the spec's own Boundaries/Code Map explicitly designs this split: the manifest embeds config (`baseUrl`) and must never be hand-committed, while the icons are static/config-independent and are committed by design, same convention as other `assets/images/` files.
- **No wiring runs `generate-web-manifest.js` automatically before `expo export --platform web`.** `false`/out of scope — the frozen Boundaries explicitly exclude building the combined `build:web` pipeline here, reserving it for Story 6.3 (AD-5).
- **No automated test exercises `generate-web-manifest.js`'s derivation logic or `+html.tsx`'s manifest-link construction — a regression in either could silently ship a broken manifest with no test failing.** (verification-gap, pre-verified per its own filed evidence: grepped all `*.test.*` files, confirmed no coverage exists.) `medium` per filed severity. Its filed disposition is **defer** — real verification here is an export/e2e check that belongs with Story 6.4's deploy pipeline, not a unit test invented ahead of that infrastructure. **Moot** this iteration; re-file against the re-derived diff if it recurs.

### Review loop 2 (re-derived diff after `sharp` governance fix)

- **`baseUrl` guard in both `generate-web-manifest.js` and `+html.tsx` only checks `.endsWith("/")`, never a leading `/` or that the value is a string.** `medium`, real (verified: both files' guard is exactly `!baseUrl || !baseUrl.endsWith("/")`; a value like `"Overlearn-App/"` — missing leading slash — or a non-string truthy value both pass and produce broken/relative paths, the exact class of drift AD-3 exists to prevent). Caused by this story (the guard was added this round but left incomplete). Reported independently by blind-hunter and edge-case-hunter. **Patch** — harden to `typeof baseUrl !== 'string' || !baseUrl.startsWith('/') || !baseUrl.endsWith('/')` in both files, same fail-loud message.
- **`JSON.parse(fs.readFileSync(appJsonPath, "utf8"))` in `generate-web-manifest.js` is unguarded — malformed/missing `app.json` throws an uncaught `SyntaxError`/`ENOENT` with a raw stack trace instead of the script's own clean fail-loud style.** `low`, real (verified, unchanged since loop 1) but narrow — a corrupted `app.json` already breaks the entire Expo build, not just this script. Caused by this story. **Patch** — wrap in try/catch, `console.error` one line, `process.exit(1)`.
- **`main()` writes `public/manifest.json` before generating the two icon PNGs — if the `sharp` resize step throws (missing/corrupt master icon), the script exits non-zero but leaves a `manifest.json` on disk referencing icon files that don't exist.** `low`, real (verified: write-then-resize order in the diff). Caused by this story. **Patch** — reorder so both icons are generated successfully before `manifest.json` is written.
- **`main().catch((error) => ...)` assumes `error.message` exists; a non-`Error` rejection would print `undefined`.** `low`, real but narrow (both `fs.promises` and `sharp` reject with real `Error` instances in practice). Caused by this story. **Patch** — bundle with the fixes above (`error?.message ?? String(error)`).
- **`sharp` is pinned to an exact version (`"0.35.4"`) while every sibling `devDependency` in the same block uses a semver range, with no rationale recorded.** `low`, real (verified: `~57.0.2`, `~29.7.0`, `~6.0.3` vs. bare `0.35.4`). Caused by this story. **Patch** — one-line rationale recorded below (native-binary build tool; exact-pin favors reproducibility over auto-picking up patch releases) rather than a code comment, since `package.json` has no comment syntax.
- **This log's own loop-1 entries describe the `baseUrl` guard and `+html.tsx`'s theme-color sync comment as still pending ("Moot" / "if still present next round"), but the re-derived diff already added both.** `low`, real (stale bookkeeping, verified against the diff). Caused by this story's own review process. **Patch** — corrected via this loop-2 entry superseding the stale loop-1 language; no code change needed.
- **`package-lock.json` gained `"peer": true` on the pre-existing `@typescript-eslint/eslint-plugin` entry, undocumented in the diff's own account of itself.** `false` — this is `npm install`'s own recomputed peer-dependency graph metadata triggered by adding `sharp`, not a behavior change; it doesn't alter install resolution or introduce a new dependency.
- **Manifest `short_name` is the full `appName` with no truncation for platforms that display a shorter label.** Rejected: `app.json`'s `name` ("Overlearn") is well under typical `short_name` display limits, and no acceptance criterion requires a distinct value — no concrete harm shown.
- **`scripts/generate-web-manifest.js` carries an inert `#!/usr/bin/env node` shebang since it's always invoked via `node ./scripts/generate-web-manifest.js`.** Rejected: cosmetic, no real bad outcome — the file is never executed directly.
- **No automated test exercises `generate-web-manifest.js`'s derivation/guard logic or `+html.tsx`'s manifest-link construction.** (verification-gap, pre-verified: same claim and location as the loop-1 entry above; code still reads as that row describes — no test file exists.) `medium`, carried forward. **Defer** — filed to `deferred-work.md` (Story 6.4's deploy pipeline is the natural home for an export/e2e check per the original reasoning).

## Spec Change Log

- **2026-09-14, review loop 1 (bad_spec):** Triggering finding: `sharp` (required by `scripts/generate-web-manifest.js`) is physically present in `node_modules` but never declared in `package.json`/`package-lock.json` (`npm ls sharp` → `extraneous`). The frozen Approach's "already present in node_modules" premise is still true and adequate as rationale for not treating this as a net-new tool; what was missing is a Code Map/Tasks step to formally pin it, so a `npm ci` doesn't silently delete it and break `web:manifest`. Amended: Code Map gained a `package.json` bullet, and the `package.json` task now also covers declaring `sharp` as a pinned `devDependency` with a lockfile-regenerating `npm install`. Known-bad state avoided: shipping a build-time script whose only dependency is an ungoverned, `npm ci`-fragile package.
  - **KEEP instructions for re-derivation:** the AD-3 key correction (`expo.experiments.baseUrl`, confirmed the actual mechanism `@expo/cli` reads) is correct and verified — preserve it in `app.json`, `ARCHITECTURE-SPINE.md`, and `spec-web-platform-support/SPEC.md` exactly as before. The `generate-web-manifest.js` script's overall shape (plain CommonJS matching `reset-project.js`, reads `app.json`, derives `start_url`/`scope` from `baseUrl`, resizes via `sharp`) is correct — preserve it, adding only the guard noted in the Review Triage Log (`baseUrl` truthy and trailing-slash-terminated, fail loud otherwise) since it was flagged in the same review pass. The `+html.tsx` document template's structure and its `expo-constants` read are correct — preserve, adding the missing sync-back comment on its `theme-color` literal (see Review Triage Log). Brand colors (`#ffffff`/`#127A45`, sourced from `src/constants/theme.ts`) are correct — preserve as-is. The verification approach (`tsc`, `eslint`, `expo export --platform web` + `dist/` inspection) is correct — preserve and re-run in full after re-derivation.
- **2026-09-14, review loop 2 (patch — `sharp` version-pin rationale):** `sharp` is pinned to an exact version (`0.35.4`) in `package.json`, unlike sibling `devDependencies` which use semver ranges. Rationale: `sharp` ships a native binary per platform/architecture; an exact pin favors reproducible builds of that binary over auto-picking up patch releases, appropriate for a build-time-only tool with no runtime app-bundle exposure.

## Verification

**Commands:**
- `npm ls sharp` -- expected: shows a resolved, non-`extraneous` entry (declared in `package.json`, present in `package-lock.json`)
- `node ./scripts/generate-web-manifest.js` -- expected: writes `public/manifest.json` (`start_url`/`scope` both equal `/Overlearn-App/`) and the two icon PNGs, exits 0
- `npx expo export --platform web` -- expected: builds clean; inspect `dist/` output to confirm asset/route URLs are prefixed with `/Overlearn-App/` and `dist/manifest.json` is present with matching `start_url`/`scope`
- `npx tsc --noEmit` -- expected: clean
- `npx eslint src/app/+html.tsx scripts/generate-web-manifest.js` -- expected: clean

**Manual checks (if no CLI):**
- Open `dist/manifest.json` after export and confirm `start_url`, `scope` both equal `/Overlearn-App/`, and both icon files exist at the referenced paths.
