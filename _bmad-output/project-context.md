---
project_name: 'Overlearn'
user_name: 'Gerardo'
date: '2026-09-05'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 20
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Expo SDK** ~57.0.18, **React Native** 0.86.3, **React** 19.2.3 — pin to these minor ranges; do not bump majors without an explicit architecture decision.
- **TypeScript** ~6.0.3, `strict: true` — no implicit `any`.
- **Persistence:** `react-native-mmkv` ^4.3.2 (Nitro-based native module) + `react-native-nitro-modules` ^0.37.1 (explicit peer dependency, not always auto-declared).
- **Routing:** `expo-router` ~57.0.17 (file-based).
- **Testing:** `jest` ~29.7.0 with `jest-expo` preset ~57.0.5, `@testing-library/react-native` ^14.0.1.
- **Linting:** `eslint` ^9.0.0, flat config (`eslint.config.js`) via `eslint-config-expo/flat`.
- Also present: `react-native-web` ~0.21.0 (web target scaffolded but not a built feature — see backlog), `react-native-reanimated` 4.5.1, `expo-haptics`, `@expo/ui`, `expo-glass-effect`.
- Requires `expo-dev-client` — MMKV is a native module, incompatible with plain Expo Go.

## Critical Implementation Rules

### Language-Specific Rules

- **Path aliases:** `@/*` → `./src/*`, `@/assets/*` → `./assets/*` (tsconfig.json). Use these for cross-module imports, not long relative chains.
- **Field-name casing split (deliberate, not a bug):** the PRD/Mechanic Specification and architecture.md use `snake_case` (`current_streak`, `total_incorrect_this_session`) as the *conceptual* vocabulary; actual TypeScript code uses `camelCase` (`currentStreak`, `totalIncorrectThisSession`) for the same fields. When implementing from PRD/architecture prose, translate the casing — don't introduce snake_case into code, and don't "fix" the docs to camelCase.
- **Untrusted-storage type guards:** every value read back from MMKV (`getObject<T>`) must be validated by a runtime type guard (`isSegmentArray`, `isHistoryEntryArray`, `isSessionState` in `src/lib/types.ts`) before use — a bare generic cast is an unchecked assertion against on-device data that can be corrupted. New persisted shapes need a new guard, not just a new interface.
- **`strict: true`** — no implicit `any`; this is enforced, not aspirational.

### Framework-Specific Rules

- **All source lives under `src/`** (`src/app/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/constants/`), reached via the `@/*` alias. `architecture.md`'s documented tree shows these at the repo root — that document is stale on this point; `src/` is what actually shipped.
- **Expo Router treats every file under `src/app/` as a route** — no test files may be co-located there (see Testing Rules). The one non-route file that *does* live in `src/app/` (`stack-screens.ts`) is safe only because it has no default export, so the router doesn't register it as a screen.
- **Route registration is a silent-failure trap:** every route the app navigates to (`router.push`/`.replace`) must be listed in `STACK_SCREENS` (`src/app/stack-screens.ts`). A route missing from that list — or a `<Stack.Screen>` missing from `_layout.tsx` — is **silently dropped in production with no error and no dev-mode signal** (regression guard for a real past bug, commit `b2dc4e6`). Adding a new screen means updating both the route file and this list.
- **`useActiveSession` subscribes via `useSyncExternalStore`, not local `useState`** — two screens (list + active session) can have it mounted simultaneously in the nav stack, and a private snapshot would let one screen's write go unseen by the other. Any new session-mutating function must re-read `sessionStore.readSession()` fresh at call time, never close over a render's `session` value — two taps dispatched before React commits the first would otherwise let the second overwrite instead of compound on it.
- **Single point of contact for MMKV:** only `src/lib/storage.ts` calls `react-native-mmkv` directly. Only `src/lib/mechanic.ts`'s `calculateTargetStreak()` implements the target formula. No component, hook, or other `lib/` module may bypass either.
- **Confirmed exception to the "session mutations only via `useActiveSession`" rule (code review 2026-09-05):** `src/lib/segments.ts`'s `deleteSegment()` calls `clearSessionForSegment()` (`src/lib/session.ts`) directly, bypassing the hook — a deliberate, accepted deviation, not a bug. Rationale: `useActiveSession` is a React hook and cannot be called from `deleteSegment`'s plain-function context; routing the clear through the hook would require the UI to make two coordinated calls (`deleteSegment` + a hook-exposed clear) instead of one atomic, foolproof call, shifting responsibility for "never orphan a session on segment delete" onto every future call site. Given the app has exactly one delete-segment call path, keeping the guarantee baked into `deleteSegment()` itself is the safer trade. Do not "fix" this by refactoring it through `useActiveSession` without re-confirming with the user — and do not add a second direct-session-mutation path elsewhere without the same conversation.

### Testing Rules

- **Co-located tests everywhere except `src/app/`** — `*.test.ts`/`*.test.tsx` sit next to the module under test, but route-screen tests live in the separate `src/app-tests/` directory (see Framework-Specific Rules: any `*.test.tsx` inside `src/app/` would be registered as a phantom route).
- **`react-native-mmkv`'s Jest auto-mock needs a manual shim to even load:** `react-native-nitro-modules` eagerly calls the native Turbo module registry at import time, which crashes under Jest before MMKV's own `isTest()` mock path is reached. Fixed by `__mocks__/react-native-nitro-modules.js` — Jest auto-applies this for the real package, no `jest.mock()` call needed per file. Don't remove it or "clean it up" as dead code.
- **Shared MMKV mock instance across all suites** — `jest.setup.js` calls `storage.clearAll()` in a global `beforeEach`, importing `storage` via the exact same `@/lib/storage` specifier the source uses (a different specifier resolves to a second, unrelated mock instance). A new test file doesn't need its own storage-clearing `beforeEach`, but must import `storage` the same way if it needs direct access.
- **`@testing-library/react-native` v14: `render()`, `renderHook()`, and `act()` are all `async`.** Omitting `await` doesn't throw — it silently leaves `screen`/`result.current` unpopulated or stale on the next assertion. Always `await` these three calls.
- **Coverage intentionally includes screens/components** (`collectCoverageFrom` in `jest.config.js` covers `src/app/**/*.tsx` and `src/components/**/*.tsx`, not just `lib`/`hooks`) — this was a deliberate fix after the two worst Epic 1 bugs shipped in code that excluded coverage made look healthy. Don't narrow this list back down.

### Code Quality & Style Rules

- **Naming (architecture.md, confirmed as-shipped):** components PascalCase (`CorrectButton.tsx`, one component per file, filename matches exactly); hooks camelCase with `use` prefix (`useActiveSession`, `useSegmentHistory`); functions camelCase verb-first (`calculateTargetStreak`, `writeHistoryEntry`). **Exception:** starter-template hooks kept their original kebab-case filenames (`use-color-scheme.ts`, `use-theme.ts`) — only Overlearn's own bespoke hooks follow the `useXxx.ts` convention; don't rename the inherited ones just for consistency.
- **MMKV key naming:** namespaced, lowercase, dot-separated (`session.active`, `segments.list`, `history.{segmentId}`) — defined and read only through `src/lib/storage.ts`.
- **Comment style:** comments explain *why*, not *what* — story/FR numbers, regression context (e.g. "Regression guard for commit b2dc4e6"), and the reasoning behind a non-obvious choice are the norm throughout `src/lib/` and `src/hooks/`. Match this density and purpose when adding new logic; don't add narrating comments for self-evident code.

### Development Workflow Rules

- **No CI/CD pipeline** — solo-dev project, EAS Build/Submit only (architecture.md's explicit decision). Don't propose adding GitHub Actions or similar unless asked.
- **Push only when asked** — commits happen locally as work completes; `git push` to `origin` is a separate, explicit step this project's owner requests, not an automatic follow-on to committing.
- **No branch-per-feature convention observed** — history to date is direct commits to `main`; don't invent a branching model unprompted.

### Critical Don't-Miss Rules

- **`react-native-mmkv` v4 (Nitro-based): use `createMMKV()`, never `new MMKV()`.** `MMKV` is a type-only export in this version — instantiating it as a constructor fails at runtime (`TypeError: undefined cannot be used as a constructor`). This already broke Story 1.1's first implementation once.
- **Corrupt-data quarantine, not silent overwrite:** `getObject<T>` in `src/lib/storage.ts` moves an unparseable or shape-invalid read to a timestamped `{key}.corrupt.{timestamp}` key (first-corruption-wins — a later corruption never clobbers the earliest surviving snapshot) rather than discarding it or crashing. Preserve this pattern for any new persisted shape; don't replace it with a bare `try/catch` that swallows the raw bytes.
- **Zero networking, ever (NFR8):** no networking library — direct or transitive — may enter the dependency tree. This is verified by code inspection, not just by unused imports; adding any HTTP/analytics/crash-reporting package (even "just for dev") breaks a load-bearing product guarantee.
- **Never reimplement the target-streak formula inline** — always call `calculateTargetStreak()` from `src/lib/mechanic.ts`. A second implementation (even ostensibly identical) is exactly the drift the single-function rule exists to prevent.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow ALL rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new patterns emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update when technology stack changes.
- Review periodically for outdated rules.
- Remove rules that become obvious over time.

Last Updated: 2026-09-05
