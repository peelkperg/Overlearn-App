# Story 5.1: Configure the Overlearning Target

Status: review

<!-- Note: Validate with validate-create-story before dev-story if desired. -->

## Story

As a user,
I want to set the overlearning-% used to calculate my target streak,
so that I can make the mechanic stricter or more lenient than the default.

## Acceptance Criteria

1. **Given** the segment list screen **When** the user taps the gear icon in its header **Then** the Settings screen opens, showing the current overlearning-% (default 50%) via a stepper (UX-DR14), a live worked example that recomputes with the value (UX-DR15), and a static floor note explaining `TARGET_FLOOR`=5 (UX-DR16) (FR35, UX-DR13)

2. **Given** the Settings screen **When** the user taps `+` or `−` **Then** the value changes by 10 percentage points, is saved immediately with no confirmation step, and the buttons disable at 50% and 300% respectively, with `accessibilityState: { disabled: true }` set so the limit is announced to a screen reader, not just shown visually (FR36, UX-DR14, UX-DR24)

3. **Given** the overlearning-% has been changed **When** a new session is subsequently started **Then** its target-streak calculation uses the new value, not the previous one (FR35, FR36 — verified via `calculateTargetStreak`'s new optional parameter, read from `lib/settings.ts` by `useActiveSession`)

[Source: _bmad-output/planning-artifacts/epics.md#Story-5.1-Configure-the-Overlearning-Target]

## Tasks / Subtasks

- [x] Task 1: Add `setOverlearningPercent` to the settings storage boundary (AC #2, #3)
  - [x] In `src/lib/settings.ts`, add `export function setOverlearningPercent(value: number): void`. Per architecture.md:524, the function does not trust its caller: guard non-finite input first (`const safe = Number.isFinite(value) ? value : DEFAULT_SETTINGS.overlearningPercent;` — a bare clamp on `NaN`/`Infinity` still produces `NaN`, since `Math.max`/`Math.min`/`Math.round` all propagate it, and a corrupted `overlearningPercent` fails `isSettings` on the next read, quarantining the *entire* `settings.general` key including the unrelated `sortKey`/`sortDirection` fields), then clamp to the closed range [50, 300] and round to the nearest multiple of 10 before writing — `Math.min(300, Math.max(50, Math.round(safe / 10) * 10))`. The Settings screen's stepper can only ever produce a valid value by construction (steps of 10, disabled at bounds), but this is the second, defensive layer, matching `renameSegment`'s posture toward `SegmentForm`.
  - [x] Write via `setObject(SETTINGS_KEY, { ...readSettings(), overlearningPercent: clamped })` — same pattern as the existing `setSortOption`. No new MMKV key, no schema-version bump: `overlearningPercent` already exists in `Settings`/`isSettings` (shipped by Story 4.3) and in `DEFAULT_SETTINGS` (`{ overlearningPercent: 50, ... }`).
  - [x] Do NOT add a separate getter — `readSettings().overlearningPercent` is already the read path via `useSettings().settings.overlearningPercent`.

- [x] Task 2: Extend `useSettings()` to expose the new setter (AC #2)
  - [x] In `src/hooks/useSettings.ts`, add `setOverlearningPercent: settings.setOverlearningPercent` to the returned object, alongside the existing `settings` and `setSortOption`. This is the only change to this file — the `useSyncExternalStore` subscription already covers the new field, since it re-reads the whole `Settings` object on any `settings.general` write.

- [x] Task 3: Thread the live overlearning level through the mechanic layer (AC #3)
  - [x] In `src/lib/mechanic.ts`, add an optional second parameter to `calculateTargetStreak`: `calculateTargetStreak(totalIncorrectThisSession: number, overlearningLevel: number = OVERLEARNING_LEVEL): number`. Replace the internal `OVERLEARNING_LEVEL` reference in the formula with `overlearningLevel`. This is the **only** change to this file's logic — `TARGET_FLOOR`, the NaN/Infinity guard, and the function's exported name all stay as-is. Every existing call site and every existing test in `mechanic.test.ts` calls with one argument and must keep passing unmodified — this is the whole point of the optional-parameter design (architecture.md:528-541).
  - [x] **Round the product before ceiling.** `overlearningPercent / 100` is not exact in floating point for most of the 26 valid values (e.g. `110 / 100` → `1.1`, and `50 * 1.1` → `55.00000000000001`, not `55`). Left unguarded, `Math.ceil` on that value returns one too many at dozens of valid (percent, mistake-count) pairs — verified: at 110%/50 mistakes the naive formula yields 56, not the correct 55. Since this value is threaded into `complete()`'s `finalTarget` (Task 4), the error would be written permanently into a segment's history with no way to detect or correct it later. Compute as `Math.max(TARGET_FLOOR, Math.ceil(Number((safeTotal * overlearningLevel).toFixed(6))))` — the `toFixed(6)` round-trip clears the floating-point noise without affecting any legitimate fractional result at the precision this formula ever produces (`overlearningLevel` is always a multiple of 0.1).
  - [x] **Guard `overlearningLevel` against non-finite input**, the same way the existing `totalIncorrectThisSession` guard works: `const safeLevel = Number.isFinite(overlearningLevel) ? overlearningLevel : OVERLEARNING_LEVEL;`. Not reachable through the UI as built (the stepper only ever produces a valid clamped value), but `setOverlearningPercent`'s own defensive clamp (Task 1) can itself produce `NaN` from a `NaN`/`Infinity` caller — without this guard, that `NaN` propagates through `calculateTargetStreak` to a non-finite target, silently soft-locking any session using it. Same failure class the existing `totalIncorrectThisSession` guard already prevents.
  - [x] In `src/lib/session-transitions.ts`, add the same optional parameter to `logCorrect(session: SessionState, overlearningLevel?: number)` only, and pass it through to its internal `calculateTargetStreak` call. **Do NOT add the parameter to `logIncorrect`** — read `logIncorrect`'s current body first: it does not call `calculateTargetStreak` at all (it only zeroes `currentStreak` and increments `totalIncorrectThisSession`; the target is re-derived by the caller afterward). Adding an unused parameter there would be dead code contradicting architecture.md:548's claim that both functions already call it internally — that claim is incorrect for `logIncorrect` as shipped; do not "fix" `logIncorrect` to match the stale claim, and note the correction in this story's Dev Notes / Change Log for a later architecture.md sync (CLAUDE.md §13.4).

- [x] Task 4: Pass the live level from `useActiveSession` to every `calculateTargetStreak` call site (AC #3)
  - [x] In `src/hooks/useActiveSession.ts`, import `useSettings` and compute `const overlearningLevel = useSettings().settings.overlearningPercent / 100;` once per render, near the top of the hook (alongside the existing `useSyncExternalStore(sessionStore...)` call). This is the one and only place in the app that converts the stored percent (50–300) to the level the mechanic layer expects (0.5–3.0) — `lib/mechanic.ts` and `lib/session-transitions.ts` never read storage or perform this conversion themselves.
  - [x] Pass `overlearningLevel` into **all four** existing `calculateTargetStreak` call sites in this file (not three — verify by re-reading the current file, since architecture.md's own count of three is stale against the shipped code):
    1. `logIncorrect()`'s `previousTarget` computation (line ~66)
    2. `logIncorrect()`'s `nextTarget` computation (line ~68) — these two drive the mild-vs-alert feedback tier choice; both must use the same level or the tier comparison is meaningless
    3. `complete()`'s `finalTarget` field written into the history entry (line ~117) — **this is the site most likely to be missed**, since it is visually distant from the other three and easy to assume is Epic 3/4's territory. Missing it means a completed session's history record is permanently computed at whatever level was in effect after the code review, not what the user practiced under, with no way to detect or correct it later — a silent data-integrity defect, not a display bug.
    4. The hook's returned `targetStreak` value (line ~125)
  - [x] Pass `overlearningLevel` into `logCorrect()`'s call to `transitions.logCorrect(current, overlearningLevel)` (its only current argument is `current`).
  - [x] `logIncorrect()`'s call to `transitions.logIncorrect(current)` takes **no** new argument, per Task 3's correction — `logIncorrect` does not use the level.

- [x] Task 5: Register the new `settings` route (AC #1)
  - [x] Add `'settings'` to `STACK_SCREENS` in `src/app/stack-screens.ts`. `_layout.tsx` needs no separate edit — it maps `STACK_SCREENS` dynamically to `<Stack.Screen>` entries.
  - [x] Add `'settings'` to the `navigatedRoutes` array in `src/app-tests/stack-screens.test.ts`, with a one-line comment noting the call site (`index.tsx`'s gear icon). This is not optional cleanup: that file's `toHaveLength(navigatedRoutes.length)` assertion fails the suite if the two arrays diverge.

- [x] Task 6: Build the Settings screen (`src/app/settings.tsx`, new file) (AC #1, #2)
  - [x] Structure: `ThemedView` → `SafeAreaView`, matching every other screen's container pattern (`segment/[id].tsx`, `segment/[id]/rename.tsx`), including that same `SafeAreaView`'s `maxWidth: MaxContentWidth` (from `@/constants/theme`) constraint — every other screen applies it so content doesn't stretch edge-to-edge on a tablet; Settings should match. No header component — this app has none (`_layout.tsx` sets `headerShown: false` app-wide, and `rename.tsx`, the app's only other leaf screen, has zero back affordance and relies entirely on the OS back gesture/hardware back button). Settings is a leaf screen in the same shape; do not build a back button or invent header chrome.
  - [x] Call `const { settings, setOverlearningPercent } = useSettings();` for the current value and the write path.
  - [x] **Label**: `<ThemedText>Overlearning target</ThemedText>` — exact copy per the UX spec (ux-design-specification.md line 514). Not "Overlearning Target," not "Overlearning %."
  - [x] **Stepper row**: three elements in a row — `−` button, the percent value, `+` button. Value display: `` `${settings.overlearningPercent}%` `` using `ThemedText type="title"` (fontSize 48/weight 600) as the "large-numeral type scale" the UX spec calls for (ux-design-specification.md line 515) — `StreakReadout.tsx`'s own 44px/700-weight scale is a session-only styled component using `SessionColors`, not the reusable design system, so it is not reused here; `ThemedText`'s `title` type is the closest system equivalent and is used instead. Add `accessibilityLiveRegion="polite"` to this value's `ThemedText` — ux-design-specification.md line 644 (inside the same Accessibility (v1.1) block Task 6 already draws from): "Stepper value is announced on change, so a screen-reader user hears the new value without re-navigating to it." Same mechanism `index.tsx` already uses for its `notice`/`error` lines.
  - [x] `−` button: `onPress={() => setOverlearningPercent(settings.overlearningPercent - 10)}`, `disabled={settings.overlearningPercent <= 50}`, `accessibilityState={{ disabled: settings.overlearningPercent <= 50 }}`, `accessibilityLabel="Decrease overlearning target"`, `accessibilityRole="button"`. Visually recessive when disabled — apply `opacity: 0.4` (or similar) conditionally, matching `SegmentForm.tsx`'s `buttonDisabled` pattern (`opacity: 0.6` there; either value is acceptable, but the disabled state must be visually distinct, not just functionally inert).
  - [x] `+` button: mirror of `−`, `onPress={() => setOverlearningPercent(settings.overlearningPercent + 10)}`, `disabled={settings.overlearningPercent >= 300}`, same `accessibilityState`, `accessibilityLabel="Increase overlearning target"`.
  - [x] Both buttons at minimum 44×44pt touch targets (project-wide NFR6 convention — see every other `Pressable` in the codebase for the pattern, e.g. `SegmentListItem.tsx`'s `menuButton` style).
  - [x] No confirmation, no Save button — every tap writes immediately via `setOverlearningPercent`, per FR36/UX-DR14's "saved immediately with no confirmation step."
  - [x] **Worked example**: one line below the stepper, `type="small"` with `themeColor="textSecondary"` (the app's established de-emphasized/neutral treatment — see `SegmentDetailScreen`'s "No completed sessions yet." for the same pairing). Exact template, computed through `calculateTargetStreak` itself so the example and the real mechanic can never diverge: `` `At ${settings.overlearningPercent}%, 10 mistakes in a session sets a target of ${calculateTargetStreak(10, settings.overlearningPercent / 100)} correct in a row.` ``. Do NOT hand-compute this with a separate percent formula — import and call the real function, exactly as every other display site in the app is required to (project-context.md's "single point of contact" rule extends naturally here: one formula, every consumer calls it, no exceptions for a "just a display string").
  - [x] **Floor note**: one line below the worked example, same `type="small"`/`themeColor="textSecondary"` treatment, exact copy: `"A session never targets fewer than 5 correct in a row."` — do not reference `TARGET_FLOOR` by name in the UI copy; the spec's line is the literal string to ship.
  - [x] Do not build Story 5.3's in-progress-session notice in this story, and do not add a placeholder slot for it — a `{null}` first child leaves nothing in the tree for 5.3 to key off, and the UX spec's layout order (Label → Stepper, with the FR39 notice sitting *between* them as item 5, "shown above the stepper") means 5.3 inserts its own row between the label and the stepper, not above the whole screen. The only constraint on this story: do not write the label/stepper block in a way that assumes it is the screen's topmost element (e.g. no hardcoded top margin computed from the label's own height).

- [x] Task 7: Add the gear icon to the segment list (AC #1)
  - [x] In `src/app/index.tsx`, add a `Pressable` right-aligned, containing `<ThemedText themeColor="textSecondary">⚙</ThemedText>` — a plain Unicode glyph inside `ThemedText`, matching the app's established icon-free convention (`SegmentListItem.tsx`'s row-menu button uses `⋯` the same way; the project has no icon library — `expo-symbols` is a declared dependency but is used nowhere in `src/`, and introducing `@expo/vector-icons` or similar would be a new dependency requiring the explicit approval CLAUDE.md §5.2 requires, which is out of scope for a one-glyph control that already has a working, shipped precedent).
  - [x] `onPress={() => router.push('/settings')}`, `accessibilityRole="button"`, `accessibilityLabel="Settings"` (exact string, per ux-design-specification.md line 650's icon-only-control rule, same pattern the row's `⋯` menu button follows with its own `accessibilityLabel`).
  - [x] 44×44pt touch target (`hitSlop` or explicit sizing, matching `SegmentListItem.tsx`'s `menuButton` style: `minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center'`).
  - [x] `testID="segment-list-settings"`.
  - [x] **Placement — unconditional, not inside the empty-state branch.** `index.tsx`'s render body has `error`/`notice` as direct children of `SafeAreaView`, followed by `{segments.length === 0 ? <EmptyState /> : (<>...<SortControl/><FlatList/>...</>)}`. `SortControl` and `FlatList` only exist in the non-empty branch — placing the gear there makes Settings unreachable for a brand-new user with zero segments, and Settings has no other entry point in the app. The UX spec (line 508) is explicit that the gear is "Present on Home only," unconditionally. Mount the gear as its own direct child of `SafeAreaView`, alongside `error`/`notice` and *above* the `segments.length === 0` ternary — not inside either branch of it.
  - [x] No platform header: this app has none (`headerShown: false` app-wide) despite the UX spec describing the gear as living "in the Segment List header" — `SortControl` already establishes the precedent of an in-screen control occupying that conceptual position for the same reason. Do not add a `Stack.Screen options={{ headerShown: true }}` override, which would introduce header chrome unique to this one screen that no design artifact specifies the shape of.

- [x] Task 8: Tests in `src/lib/settings.test.ts` (AC #2, #3)
  - [x] `setOverlearningPercent` writes the exact value when already a valid multiple of 10 in range.
  - [x] `setOverlearningPercent` clamps a value below 50 to 50, and above 300 to 300.
  - [x] `setOverlearningPercent` rounds a non-multiple-of-10 input to the nearest 10 (defensive — the UI never produces one, but the function must not trust its caller).
  - [x] `setOverlearningPercent` preserves the existing `sortKey`/`sortDirection` fields (does not clobber the rest of the `Settings` object) — mirrors the existing `setSortOption` test's shape for the inverse case.

- [x] Task 9: Tests in `src/lib/mechanic.test.ts` (AC #3)
  - [x] `calculateTargetStreak(totalIncorrect, level)` with an explicit second argument produces the scaled result (e.g., at level `1.5`, `calculateTargetStreak(10, 1.5)` returns `15`).
  - [x] Every existing test in this file (which calls with one argument) continues to pass unmodified — do not edit any existing test in this file; this task only adds new cases.
  - [x] The floor still governs at a non-default level: `calculateTargetStreak(1, 3.0)` returns `TARGET_FLOOR` (5), not `3`.

- [x] Task 10: Tests in `src/lib/session-transitions.test.ts` (AC #3)
  - [x] `logCorrect(session, level)` with an explicit level produces a `sessionComplete` determination consistent with `calculateTargetStreak(session.totalIncorrectThisSession, level)`, not the default-level value, for a case where the two would disagree (e.g. a session with `totalIncorrectThisSession` that sits at the default-level floor but above the floor at a higher configured level).
  - [x] Every existing test in this file continues to pass unmodified.
  - [x] `logIncorrect` is NOT given a second parameter in this story — no test should call it with one.

- [x] Task 11: Tests in `src/hooks/useActiveSession.test.ts` (AC #3)
  - [x] With `useSettings()`'s stored `overlearningPercent` set to a non-default value (write via `setOverlearningPercent` or directly via storage before rendering the hook), verify: the hook's returned `targetStreak` reflects the configured level; `logIncorrect` twice raises the target consistent with the configured level, not the 50% default; `complete()` writes a history entry whose `finalTarget` matches the configured level (this is the call site Task 4 flags as most likely to be missed — assert it explicitly, by reading back the written entry via `readHistory(segmentId)` from `src/lib/history.ts`, not just by inspecting the hook's returned value).

- [x] Task 12: Tests in a new `src/app-tests/settings.test.tsx` (AC #1, #2)
  - [x] Renders the current `overlearningPercent` (default 50%) as the stepper value on mount.
  - [x] Tapping `+` increments the displayed value by 10 and persists it (verify via `readSettings()`).
  - [x] Tapping `−` decrements the displayed value by 10 and persists it.
  - [x] At 50% (the default, no setup needed), the `−` button carries `accessibilityState={{ disabled: true }}`. At 300%, `+` carries the same — reach it by writing `overlearningPercent: 300` directly via storage (same `storage.clearAll()`-then-direct-write pattern `settings.test.ts` already uses) before rendering, not by simulating 25 taps.
  - [x] The stepper value's `ThemedText` carries `accessibilityLiveRegion="polite"`.
  - [x] The worked example line updates its text when the value changes (assert the exact recomputed string at two different values, e.g. 50% and 150%, matching the literal template in Task 6).
  - [x] The floor note's exact copy is present and unconditional (always rendered, does not change with the stepper).
  - [x] No confirmation dialog, no Save button exists anywhere on the screen.

- [x] Task 13: Tests in `src/app-tests/index.test.tsx` (AC #1)
  - [x] Tapping the gear icon (`testID="segment-list-settings"`) calls `router.push` with `/settings` — same assertion shape as the existing tests for `onOpen`/`onRename`/`onDuplicate` navigation in this file.
  - [x] The gear icon (`testID="segment-list-settings"`) is present with zero segments, using this file's existing empty-state test as the base — regression guard for Task 7's placement fix (the gear must not live inside the `segments.length === 0 ? <EmptyState /> : ...` branch).

- [x] Task 14: Correct `architecture.md`'s stale Epic 5 section (CLAUDE.md §13.4 — spec must match shipped behavior in the same commit or the next)
  - [x] Update the "Call sites that pass the live value explicitly" list (~architecture.md:543-546): three → four call sites, adding `complete()`'s `finalTarget` computation; remove `transitions.logIncorrect(current, overlearningLevel)` from the list — `logIncorrect` does not take this parameter (Task 3).
  - [x] Correct the paragraph claiming `logCorrect` and `logIncorrect` "both already call `calculateTargetStreak` internally" (~architecture.md:548) — only `logCorrect` does.
  - [x] Correct the Enforcement bullet listing `calculateTargetStreak`, `logCorrect`, and `logIncorrect` as never taking a required parameter (~architecture.md:672) — `logIncorrect` does not carry this parameter at all, required or optional, so naming it there is misleading.

## Dev Notes

### Architecture compliance

- **Optional-parameter threading, not a required parameter or internal storage read** (architecture.md:528-541): `calculateTargetStreak` gains an optional second parameter defaulting to the current `OVERLEARNING_LEVEL` constant. This keeps `lib/mechanic.ts` a pure function with zero storage awareness — reading the live setting is `useActiveSession`'s job, consistent with the project's `lib/` module-boundary rule (`project-context.md`: "only `src/lib/mechanic.ts`'s `calculateTargetStreak()` implements the target formula. No component, hook, or other `lib/` module may bypass either.").
- **Correction to architecture.md, made during this story's creation (2026-09-10), to record before/alongside implementation per CLAUDE.md §13.4:**
  - architecture.md:548 states `logCorrect` and `logIncorrect` "both already call `calculateTargetStreak` internally." Confirmed false for `logIncorrect` by direct inspection of `src/lib/session-transitions.ts` — only `logCorrect` calls it. `logIncorrect` only zeroes `currentStreak` and increments `totalIncorrectThisSession`; its own comment says the caller re-derives the target. **Only `logCorrect` gets the optional parameter.**
  - architecture.md:543-546 states there are three `calculateTargetStreak` call sites in `useActiveSession.ts`. Confirmed **four** by direct inspection: `previousTarget` (~line 66), `nextTarget` (~line 68), `finalTarget` inside `complete()` (~line 117), and the returned `targetStreak` (~line 125). All four must receive the live level; missing the `complete()` site would silently persist a wrong `finalTarget` into a segment's permanent history.
  - architecture.md:231 states `TARGET_FLOOR`/`OVERLEARNING_LEVEL` live in `constants/`. As shipped, both are defined in `src/lib/mechanic.ts`; `src/constants/` contains only `theme.ts`. Follow the shipped location — this story does not move the constants.
- **`lib/settings.ts` is the single point of contact** for this data (project-context.md's MMKV single-point-of-contact rule, extended by architecture.md:670: "Route every settings read/write through `lib/settings.ts` — never a direct `storage.ts` call from a hook or component"). `useSettings()`, `useActiveSession()`, and `settings.tsx` all go through it; nothing calls `storage.ts` or `getObject`/`setObject` directly.
- **No schema migration.** `overlearningPercent` already exists in the `Settings` interface, `isSettings` guard, and `DEFAULT_SETTINGS`, all shipped by Story 4.3 specifically so this story would need none. The versioned envelope (`{ __v, data }`, `lib/storage.ts`) already covers this key.
- **Route registration is a silent-failure trap** (project-context.md, commit `b2dc4e6` regression guard): `settings` must be added to both `STACK_SCREENS` (`stack-screens.ts`) and `navigatedRoutes` (`stack-screens.test.ts`) or the route is silently dropped in production with no error, and/or the existing test suite fails on the length assertion.
- **FR37 (Story 5.2's basis) requires no work in this story beyond correct threading.** `target_streak` is derived on every read, never stored — `useActiveSession`'s returned `targetStreak` is already recomputed on every render. Once Task 4 threads `overlearningLevel` correctly, a mid-session settings change propagates automatically via `useSettings`'s `useSyncExternalStore` subscription triggering a re-render wherever `useActiveSession` is mounted. Story 5.2 verifies this; it does not build it.

### Existing code confirmed by direct inspection

- **`src/lib/settings.ts`** (read in full): `DEFAULT_SETTINGS = { overlearningPercent: 50, sortKey: 'createdAt', sortDirection: 'asc' }`; `readSettings()` and `subscribeToSettings()` already handle the whole `Settings` object, so no change is needed to either for this story — only the new `setOverlearningPercent` writer is added. The file's own comment at line 39-40 states: "overlearningPercent's setter is Epic 5's job, against this same file/key."
- **`src/hooks/useSettings.ts`** (read in full): currently returns `{ settings, setSortOption }`. Add `setOverlearningPercent` to this object; no other change.
- **`src/lib/types.ts`** (relevant section read): `Settings` interface and `isSettings` guard already validate `overlearningPercent` as `>= 50 && <= 300 && % 10 === 0` (lines 155-164, shipped by Story 4.3) — no type-layer change needed in this story.
- **`src/lib/mechanic.ts`** (read in full, 18 lines): `TARGET_FLOOR = 5`, `OVERLEARNING_LEVEL = 0.5`, both exported. `calculateTargetStreak` is the entire file's logic — one function, no side effects, no imports beyond none. The NaN/Infinity guard (`Number.isFinite`) stays untouched; it applies to `totalIncorrectThisSession`, not the new `overlearningLevel` parameter (out of scope — a caller passing a non-finite level is not a case any existing call site can produce, since `useActiveSession` always derives it from a validated, clamped stored percent).
- **`src/lib/session-transitions.ts`** (read in full, 60 lines): `startSession`, `logCorrect`, `logIncorrect`, `restartSession`. Only `logCorrect` (line 29) calls `calculateTargetStreak` — confirmed above. `restartSession` calls `startSession`, which has no target-streak involvement at all (target derives to the floor via `calculateTargetStreak(0)` at the caller, not here).
- **`src/hooks/useActiveSession.ts`** (read in full, 140 lines): the single owner of session lifecycle mutations, per its own header comment. Confirmed four `calculateTargetStreak` call sites at lines 66, 68, 117, 125 (see Architecture compliance correction above). Already imports `calculateTargetStreak` from `@/lib/mechanic`; will additionally import `useSettings` from `@/hooks/useSettings`.
- **`src/app/stack-screens.ts`** (read in full, 12 lines): `STACK_SCREENS = ['index', 'segment/new', 'segment/[id]', 'segment/[id]/rename', 'session/[id]']`. `_layout.tsx` maps this array directly to `<Stack.Screen>` entries — no second edit needed there.
- **`src/app/_layout.tsx`** (read in full, 31 lines): `<Stack screenOptions={{ headerShown: false }}>` — confirms no platform header exists anywhere in the app. This directly resolves the UX spec's "gear icon in the Segment List header" language: there is no header to put it in; Task 7's in-screen `Pressable` is the correct, already-established pattern (see `SortControl`'s identical situation).
- **`src/app/segment/[id]/rename.tsx`** (read in full, 77 lines): the app's only other leaf screen. Confirmed: no header, no back button, no explicit exit affordance beyond the OS back gesture and a successful-submit `router.replace('/')`. Settings needs no new "how do I leave" mechanism — same shape.
- **`src/components/SegmentListItem.tsx`** (relevant section read): the row-menu button renders `<ThemedText themeColor="textSecondary">⋯</ThemedText>` inside a `Pressable` with `accessibilityLabel`, `hitSlop={Spacing.two}`, and a `menuButton` style of `minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center'`. This is the exact pattern Task 7's gear icon follows.
- **`src/components/SortControl.tsx`** (read in full, 135 lines): confirms the in-screen-control-in-place-of-a-header pattern already shipped (the "below the header" framing is the UX spec's Sort Control section, not this file's own comment, which cites FR33/FR34/UX-DR18/19). Confirms the Modal-menu visual pattern used elsewhere, though Settings needs no modal/menu — it's a direct-manipulation stepper, not a picker.
- **`src/constants/theme.ts`** (read in full): `Colors.light`/`Colors.dark` include `textSecondary`, `accent`, `border`; no icon-related tokens. `Spacing` scale (`half`=2 … `six`=64) is the project's spacing unit system — use it for Settings' layout, not raw numbers.
- **`src/components/themed-text.tsx`** (read in full): `type="title"` = fontSize 48/weight 600/lineHeight 52 — the closest reusable "large-numeral" scale to what the UX spec calls for, confirmed NOT the same as `StreakReadout.tsx`'s bespoke 44px/700-weight/`SessionColors` styling (a session-only component, out of scope to reuse here).
- **`src/app-tests/stack-screens.test.ts`** (read in full, 37 lines): confirmed the `toHaveLength(navigatedRoutes.length)` assertion that makes Task 5's second array edit non-optional.
- **`package.json`**: `expo-symbols` (`~57.0.2`) is a declared dependency but has zero usages anywhere under `src/` (confirmed by search) — do not introduce it or any other icon library for Task 7's gear glyph; the plain-Unicode-in-`ThemedText` pattern is both sufficient and already shipped precedent.

### Previous story intelligence (4.5 / 4.3)

- Story 4.3 deliberately shipped the full `Settings` shape (including `overlearningPercent`) and `isSettings`'s validation range a full epic ahead of this story specifically to avoid a schema migration here — confirmed by that story's own code comments. This story should not need to touch `isSettings`, `DEFAULT_SETTINGS`'s shape, or the MMKV key at all.
- Story 4.5's code review found and fixed a pattern worth carrying forward here: a UI-layer-only validation constant (`MaxNameLength`) that diverged from the domain-layer function it was meant to guard, letting a second entry point silently bypass it. The equivalent risk in this story is `setOverlearningPercent`'s clamp/round logic diverging from what the stepper UI can actually produce — Task 1 keeps the defensive clamp in `lib/settings.ts` itself (the actual write path), not duplicated or approximated in `settings.tsx`.
- Story 4.5's review also found that a "same validation as an existing screen" AC clause is easy to satisfy only partially (the 80-char cap was missed entirely on first pass). This story's equivalent is AC #3's "uses the new value, not the previous one" — Task 4's explicit four-call-site enumeration exists specifically to prevent a partial-coverage repeat of that mistake, since `useActiveSession.ts` has more call sites than architecture.md itself claims.
- All previous stories followed atomic commit discipline: stage only the story's files, write a root-cause commit body, update this story file's `Dev Agent Record` before committing. Given this story touches both the mechanic/session-transitions layer and a new UI screen, consider whether the threading (Tasks 1-4, 8-11) and the screen (Tasks 5-7, 12-13) warrant separate commits — a judgment call for the dev agent to make explicitly, not silently default on.

### Git intelligence

Last 5 commits at story-creation time: `6515f79` (code review fixes to Story 4.5's inline rename), `cdc4a43` (MaxNameLength move), `5df8da1` (Story 4.5 initial implementation), `5a6df4c` (Story 4.4, Solidification %), `b0159cc` (Story 4.3, sort control + settings storage boundary). Story 4.3's commit is the one that established `lib/settings.ts`/`useSettings.ts`/the `Settings` type — this story extends that boundary rather than creating it. No dependency changes in recent history; no new library should be introduced by this story either (Task 7's icon decision explicitly avoids one).

### Project Structure Notes

**New:**
- `src/app/settings.tsx` — the Settings screen
- `src/app-tests/settings.test.tsx` — its tests (co-located tests are forbidden under `src/app/`, per project-context.md's Testing Rules)

**Modified:**
- `src/lib/settings.ts` — add `setOverlearningPercent`
- `src/hooks/useSettings.ts` — expose `setOverlearningPercent`
- `src/lib/mechanic.ts` — add optional `overlearningLevel` parameter to `calculateTargetStreak`
- `src/lib/session-transitions.ts` — add optional `overlearningLevel` parameter to `logCorrect` only
- `src/hooks/useActiveSession.ts` — read `useSettings()`, thread the level through all four call sites
- `src/app/index.tsx` — add the gear icon row
- `src/app/stack-screens.ts` — add `'settings'`
- `src/lib/settings.test.ts` — new tests for `setOverlearningPercent`
- `src/lib/mechanic.test.ts` — new tests for the optional parameter (existing tests untouched)
- `src/lib/session-transitions.test.ts` — new tests for `logCorrect`'s optional parameter (existing tests untouched)
- `src/hooks/useActiveSession.test.ts` — new tests covering all four call sites under a non-default level
- `src/app-tests/stack-screens.test.ts` — add `'settings'` to `navigatedRoutes`
- `src/app-tests/index.test.tsx` — new test for the gear icon's navigation

**Not touched:**
- `src/lib/types.ts` — `Settings`/`isSettings` already complete (Story 4.3)
- `src/app/_layout.tsx` — `STACK_SCREENS` mapping is dynamic; no route-specific edit needed
- `src/lib/session.ts`, `src/lib/history.ts`, `src/lib/segments.ts` — no involvement in this story
- `src/constants/theme.ts` — no new tokens needed; existing `Colors`/`Spacing` cover this screen

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.1-Configure-the-Overlearning-Target] — story statement and all 3 ACs (verbatim above)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#New-Screen:-Settings] (lines 506-539) — entry point, layout order, exact copy strings for the label/worked-example/floor-note, stepper behavior table, no-confirmation rule
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility-(v1.1)] (lines 639-650) — stepper `accessibilityLabel`/`accessibilityState` requirements, gear icon's `accessibilityLabel="Settings"`
- [Source: _bmad-output/planning-artifacts/architecture.md] (lines 503-560) — `lib/settings.ts` shape and key naming, the optional-parameter threading decision and its rationale, the derive-on-read basis for FR37/Story 5.2, `app/settings.tsx`'s no-new-mechanism decision (with two corrections recorded above per direct code inspection)
- [Source: _bmad-output/planning-artifacts/prd.md] (lines 268-289, 350-355) — `TARGET_FLOOR`/`OVERLEARNING_LEVEL` formula and v1.1 range, FR35/FR36/FR37/FR39 full text with version-scope markers
- [Source: _bmad-output/project-context.md] — MMKV single-point-of-contact rule, route-registration silent-failure trap, "never reimplement the target-streak formula inline" rule, co-located-tests-forbidden-under-app rule

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5), via bmad-dev-story.

### Debug Log References

None — no failing runs or investigation needed. `npx tsc --noEmit` failed once before `.expo/types/router.d.ts` (gitignored, auto-generated) was regenerated via `npx expo customize tsconfig.json` to pick up the new `/settings` route; re-running typecheck after that regeneration passed clean.

### Completion Notes List

- Tasks 1–4 (mechanic/settings threading) and Tasks 5–7 (route + screen) were implemented as one continuous pass rather than split into separate commits — the story's own Dev Notes flagged this as a judgment call; kept as one commit set below since the two halves share the same `overlearningLevel` concept end-to-end and splitting would have left an intermediate commit with an unused `setOverlearningPercent`.
- Task 4's four-call-site enumeration (not three, correcting architecture.md) was verified against the file as shipped — confirmed all four (`previousTarget`, `nextTarget`, `complete()`'s `finalTarget`, returned `targetStreak`) before threading.
- Task 3's correction (`logIncorrect` does not take the optional parameter, since it never calls `calculateTargetStreak`) was implemented as specified — no parameter added to `logIncorrect`.
- Task 14: `architecture.md`'s stale Epic 5 section corrected in the same change (three→four call sites, `logIncorrect` removed from the optional-parameter list and Enforcement bullet) per CLAUDE.md §13.4.
- Full test suite (325 tests across 25 suites), lint, and typecheck all pass clean. No regressions in any pre-existing test.

### File List

**New:**
- `src/app/settings.tsx`
- `src/app-tests/settings.test.tsx`

**Modified:**
- `src/lib/settings.ts`
- `src/hooks/useSettings.ts`
- `src/lib/mechanic.ts`
- `src/lib/session-transitions.ts`
- `src/hooks/useActiveSession.ts`
- `src/app/index.tsx`
- `src/app/stack-screens.ts`
- `src/lib/settings.test.ts`
- `src/lib/mechanic.test.ts`
- `src/lib/session-transitions.test.ts`
- `src/hooks/useActiveSession.test.ts`
- `src/app-tests/stack-screens.test.ts`
- `src/app-tests/index.test.tsx`
- `_bmad-output/planning-artifacts/architecture.md` (Task 14: spec/code sync)

### Change Log

- 2026-09-10: Implemented Story 5.1 — `setOverlearningPercent` storage boundary, optional `overlearningLevel` parameter threaded through `calculateTargetStreak`/`logCorrect`/all four `useActiveSession` call sites, new Settings screen with stepper/worked-example/floor-note, gear icon on the segment list, `settings` route registration, and corresponding tests across 7 files. Corrected `architecture.md`'s stale three-call-site/both-functions-take-the-parameter claims to match shipped behavior (CLAUDE.md §13.4).
