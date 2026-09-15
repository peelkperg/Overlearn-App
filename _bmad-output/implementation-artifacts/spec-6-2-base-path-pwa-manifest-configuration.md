---
title: 'Story 6.2: Base Path & PWA Manifest Configuration'
type: 'feature'
created: '2026-09-14'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context: []
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
- New `src/app/+html.tsx` -- expo-router document template. Base it on the framework default (charset, viewport meta, `ScrollViewStyleReset` from `expo-router/html`) and add `<link rel="manifest">` + `<meta name="theme-color">`, with the href built from `Constants.expoConfig?.experiments?.baseUrl` (via `expo-constants`, already a dependency) — not a literal string.
- `package.json` -- add a `"web:manifest": "node ./scripts/generate-web-manifest.js"` script. Do not fold this into a combined `build:web` pipeline yet — Story 6.3 (AD-5) owns creating that canonical script alongside `404.html`/service-worker generation; this story's script must run standalone before `expo export --platform web`.
- `.gitignore` -- add `public/manifest.json` (generated from `app.json`, never hand-committed — same convention Story 6.3 will use for `public/404.html`/`public/service-worker.js`). The two generated icon PNGs ARE committed (static, config-independent, like other files under `assets/images/`).

## Tasks & Acceptance

**Execution:**
- [ ] `app.json` -- add `expo.experiments.baseUrl: "/Overlearn-App/"`
- [ ] `ARCHITECTURE-SPINE.md` + its `.memlog.md` -- amend AD-3's rule text to the correct key, in place, following the AD-1/AD-2 amendment pattern
- [ ] `scripts/generate-web-manifest.js` -- new script: read `app.json`, emit `public/manifest.json` + `public/icon-192.png` + `public/icon-512.png`
- [ ] `src/app/+html.tsx` -- new document template linking the manifest and setting `theme-color`, base path read via `expo-constants`
- [ ] `package.json` -- add `web:manifest` script
- [ ] `.gitignore` -- ignore `public/manifest.json`
- [ ] `spec-web-platform-support/SPEC.md` -- update CAP-2's relevant constraint bullet if it still names `extra.basePath`

**Acceptance Criteria (from epics.md, verbatim ACs this story must satisfy):**
- Given `app.json#expo.experiments.baseUrl` (the corrected key) is set to the GitHub Pages subpath, when the app is built for web, then the router's base URL resolves assets and routes correctly at that subpath, and no other file hardcodes or re-derives the path.
- Given `app.json`'s web manifest fields, when the manifest is generated, then `start_url` and `scope` match the same `baseUrl` value.

## Implementation Notes

## Verification

**Commands:**
- `node ./scripts/generate-web-manifest.js` -- expected: writes `public/manifest.json` (`start_url`/`scope` both equal `/Overlearn-App/`) and the two icon PNGs, exits 0
- `npx expo export --platform web` -- expected: builds clean; inspect `dist/` output to confirm asset/route URLs are prefixed with `/Overlearn-App/` and `dist/manifest.json` is present with matching `start_url`/`scope`
- `npx tsc --noEmit` -- expected: clean
- `npx eslint src/app/+html.tsx scripts/generate-web-manifest.js` -- expected: clean

**Manual checks (if no CLI):**
- Open `dist/manifest.json` after export and confirm `start_url`, `scope` both equal `/Overlearn-App/`, and both icon files exist at the referenced paths.
