---
name: 'Web platform support — version/reality-check review'
type: review
target: ARCHITECTURE-SPINE.md (architecture-Overlearn-App-2026-09-13)
date: '2026-09-13'
---

# Review — Version & Reality Check

Scope: verify every version/tooling/defaults claim in ARCHITECTURE-SPINE.md and .memlog.md was
web-researched rather than asserted from training data. Live web search performed 2026-09-13.

## 1. workbox-build version (AD-5, Stack table)

**Claim:** `workbox-build` 7.4.1, "verify current at install time"; memlog says checked via web search
citing npmjs.com.

**Verified:** Queried `https://registry.npmjs.org/workbox-build` directly. `dist-tags.latest` = `7.4.1`.
Confirmed current as of 2026-09-13.

**Verdict:** PASS. Matches registry ground truth exactly.

## 2. generateSW default update-lifecycle behavior (AD-5)

**Claim:** "Update lifecycle uses Workbox's own default (no `skipWaiting`/`clientsClaim`): a newly
deployed worker activates only once every tab running the old version has closed."

**Verified:** Fetched `https://developer.chrome.com/docs/workbox/modules/workbox-build` directly.
Documented defaults: `skipWaiting: false`, `clientsClaim: false`. Cross-checked against
`https://developer.chrome.com/docs/workbox/handling-service-worker-updates`, which confirms the
standard-lifecycle description: an updated SW installs and waits; all open tabs controlled by the
current SW must close or navigate away before the new one activates and takes control.

Note: an initial web-search *summary* (not the source page itself) asserted the opposite — that
`generateSW` injects `skipWaiting`/`clientsClaim` automatically. That summary is wrong; the primary
source (official Workbox docs) contradicts it. This is a caution about trusting search-snippet
summaries over primary sources, not a defect in the spine.

**Verdict:** PASS. The spine's description is accurate against the primary source.

## 3. GitHub Pages native Actions deployment path (AD-6)

**Claim:** Deploy via `actions/upload-pages-artifact` + `actions/deploy-pages`, first-party, not a
`gh-pages`-branch push via third-party action.

**Verified:** Web search confirms this remains the current, GitHub-documented, first-party mechanism
for Pages deploys via Actions (`docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages`).
Not deprecated.

**Finding (minor, unaddressed in spine):** Both actions have moved through major versions since
introduction; current majors are `actions/upload-pages-artifact@v4`/`v5` and `actions/deploy-pages@v4`/`v5`
(older `@v1`–`@v3` pins are stale/deprecated due to the `actions/upload-artifact` v3 deprecation,
per GitHub's 2024-12-05 changelog notice). The spine names the actions but pins no version — correct
to defer exact version to implementation time (`.github/workflows/deploy-pages.yml` is listed as not
yet created), but the eventual workflow file must not pin `@v1`–`@v3`.

**Verdict:** PASS (mechanism), with an implementation-time reminder — not a spine defect since the
spine doesn't assert a version here.

## 4. Expo / expo-router / react-native-web / react-dom versions (Stack table)

**Claims:** `expo ~57.0.18`, `expo-router ~57.0.17`, `react-native-web ~0.21.0`, `react-dom 19.2.3`.

**Verified:**
- SDK 57 line is real; `expo-router` on the SDK 57 line is confirmed to exist with patch releases up
  to at least `57.0.21` as of search date. `57.0.17` is a plausible earlier patch on the same line —
  version-number shape is consistent with real Expo releases, not fabricated.
- `react-native-web 0.21.0` (and `.2`) is confirmed as the version paired with SDK 57.
- `react-dom` 19.2.x line confirmed real (types package `@types/react-dom@19.2.3` published and
  indexed); current `react-dom` latest has since moved to `19.2.7`/`19.3.0`. `19.2.3` is a real,
  slightly-behind-latest pinned version, not a fabricated one.

**Finding (low severity):** None of these four pins were individually re-verified against the npm
registry the way `workbox-build` was (memlog only documents the workbox-build check). They are
plausible and internally consistent (all SDK-57-line), but the spine does not show its work for them
the way it does for workbox-build — meaning it's not possible to confirm from the artifacts alone
whether these were web-checked or carried over from training-data recall. Given search results
corroborate the same version shapes, treat as **substantively correct but process-unverified** in the
spine's own audit trail.

**Verdict:** PASS on plausibility/no fabrication. Process gap: no cited source for these four pins,
unlike workbox-build's explicit citation.

## 5. Other named technology/version claims (Stack table, AD rules)

- **MMKV / localStorage as the two storage adapters (AD-1):** Not version-pinned; native platform
  APIs, nothing to verify.
- **Expo Router base-path / static export mechanics (AD-3, AD-4):** Described mechanism (base path
  threading router/manifest/SW scope; client-side resolution of dynamic routes against `localStorage`
  post-load) is architecturally sound and consistent with how Expo Router static export + SPA hosting
  is documented to behave; no specific version-bound claim to fact-check beyond what's covered above.
- **No other version numbers or product/tool names appear in the Stack table or AD rules** beyond the
  five already checked.

## Summary Table

| # | Claim | Status | Evidence |
|---|---|---|---|
| 1 | workbox-build 7.4.1 current | PASS | npm registry dist-tags.latest = 7.4.1 |
| 2 | generateSW default = no skipWaiting/clientsClaim, waits for old tabs to close | PASS | developer.chrome.com/docs/workbox/modules/workbox-build (primary source) |
| 3 | GitHub Pages native Actions path still current/first-party | PASS | docs.github.com, GitHub changelog; note: pin @v4/@v5 at implementation time, not @v1-v3 |
| 4 | expo ~57.0.18 / expo-router ~57.0.17 / react-native-web ~0.21.0 | PASS (plausible, not individually source-cited in spine) | Web search corroborates SDK-57-line version shapes |
| 5 | react-dom 19.2.3 | PASS (real, slightly behind current latest 19.2.7/19.3.0 — acceptable as a pin) | Web search |

## Overall

No fabricated or hallucinated technology, API, or version was found. The one claim most exposed to
training-data risk — Workbox's default update-lifecycle behavior — was checked against the primary
Chrome/Workbox documentation and confirmed accurate; a misleading search-summary surfaced during this
review that asserted the opposite was itself checked against the primary source and rejected. The
weakest point in the spine's own audit trail is that four version pins (Expo/expo-router/react-native-web/react-dom)
carry no cited verification the way workbox-build does, though external verification here found them
plausible and consistent.
