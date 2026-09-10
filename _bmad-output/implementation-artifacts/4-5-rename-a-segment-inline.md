# Story 4.5: Rename a Segment Inline

Status: review

<!-- Note: Validate with validate-create-story before dev-story if desired. -->

## Story

As a user,
I want to rename a segment by pressing and holding its name,
so that I can fix a name quickly without opening a separate screen.

## Acceptance Criteria

1. **Given** a segment's name displayed at the segment list row or the segment detail heading **When** the user presses and holds the name for 1 second **Then** the name becomes an editable text field in place, pre-filled with the current name, keyboard open, with no shift in the row/heading's layout (FR40, UX-DR25)

2. **Given** the name is in its editable state **When** the user edits the text and presses the keyboard's return/submit key **Then** the new name is saved using the same validation and disambiguation rule as Story 4.1, and the field returns to static text showing the new name (FR40)

3. **Given** the name is in its editable state **When** the user taps outside the field without submitting **Then** the edit is discarded and the field reverts to the original name (FR40)

4. **Given** the name is in its editable state **When** the user submits an empty name **Then** the edit is rejected and the field remains editable with an error, consistent with FR1/FR30's non-empty validation (FR40)

5. **Given** the segment list row **When** the user taps it normally (not a long-press) **Then** navigation to the segment detail screen still occurs as before — the long-press threshold does not interfere with the existing tap-to-open behavior (FR40)

[Source: _bmad-output/planning-artifacts/epics.md#Story-4.5-Rename-a-Segment-Inline]

## Tasks / Subtasks

- [x] Task 1: Add inline rename to `SegmentListItem` (AC #1–5)
  - [ ] Add `onInlineRename: (name: string) => void` to `SegmentListItemProps`. This follows the existing callback-delegation pattern (`onRename`, `onDuplicate`, `onDelete`): the component manages local editing UI state; the parent (`index.tsx`) owns the data write and error recovery via `runAction`.
  - [ ] Add local state: `isEditing: boolean` (false), `editValue: string` (empty — initialized on long-press entry), `editError: string | null` (null). Add `submittedRef = useRef(false)` to distinguish blur-after-submit from blur-without-submit.
  - [ ] Wrap the existing `<Pressable testID="segment-row-{id}" style={styles.rowLabel} onPress={onOpen}>` with `onLongPress` and `delayLongPress={1000}`. When `onLongPress` fires: set `editValue = segment.name`, `setIsEditing(true)`, `setEditError(null)`. The `onPress={onOpen}` stays on the same Pressable — AC #5 depends on this; do NOT remove it.
  - [ ] In the Pressable's child, conditionally render:
    - **Static state** (`!isEditing`): `<ThemedText numberOfLines={1}>{segment.name}</ThemedText>` — identical to current, plus `accessibilityHint="Press and hold to rename"` on the parent Pressable. **Do NOT add `accessibilityHint` when `isEditing` is true** — the Pressable's role shifts from "tap to open / long-press to rename" to "hosting an active text field."
    - **Editing state** (`isEditing`): a `<TextInput>` (from `react-native`) pre-filled with `editValue`, `autoFocus={true}`, `returnKeyType="done"`, `onChangeText={setEditValue}`, `onSubmitEditing={handleSubmit}`, `onBlur={handleBlur}`. Apply a style that matches the `<ThemedText>` geometry (same `flex`, same font, same padding) so the row does not shift when the field appears — the key attributes are `flex: 1`, the same horizontal padding as `styles.rowLabel`, and a font size matching `ThemedText`'s default (`type="default"`). Use `theme.text` for the text color and `theme.backgroundElement` for background so it reads as the row itself becoming editable, not a foreign element appearing.
  - [ ] `handleSubmit`: if `editValue.trim().length === 0`, set `setEditError('Name must not be empty')` and return early (AC #4). Otherwise: set `submittedRef.current = true`, call `onInlineRename(editValue.trim())`, `setIsEditing(false)`, `setEditError(null)`, then reset `submittedRef.current = false`. **Do NOT call `renameSegment` directly** — the parent owns the write.
  - [ ] `handleBlur`: if `submittedRef.current` is true, return early (submit already closed editing). Otherwise: `setIsEditing(false)`, `setEditError(null)` — the revert to `segment.name` is automatic because `editValue` is discarded and static text re-renders from `segment.name` (AC #3). Note: on iOS, `onSubmitEditing` fires before `onBlur`; this pattern handles both.
  - [ ] If `editError` is non-null and `isEditing` is true, render a `<ThemedText type="small" themeColor="textSecondary" testID="segment-row-inline-error-{segment.id}">{editError}</ThemedText>` below the TextInput, inside the Pressable — same error style as the form validation on the rename screen.

- [x] Task 2: Thread `onInlineRename` through `index.tsx` (AC #2, #4)
  - [ ] Destructure `renameSegment` from `useSegments()` in `HomeScreen` (it is already re-exported there — see `useSegments.ts` line 70; no import change needed for the hook itself).
  - [ ] Pass `onInlineRename` to `<SegmentListItem>` in the `FlatList`'s `renderItem`:
    ```tsx
    onInlineRename={(name) => runAction(() => renameSegment(item.id, name), 'Could not rename that segment.')}
    ```
    This wraps the write in the same try/catch + error-display pattern every other row action already uses. `renameSegment` throws on empty (lib-level guard), but the component already validates empty before calling — this catch is the defensive second layer.

- [x] Task 3: Add inline rename to the segment detail heading (AC #1–4)
  - [ ] In `src/app/segment/[id].tsx`, add import: `import { renameSegment } from '@/lib/segments';`. Direct lib import is appropriate here — the detail screen doesn't need the full `useSegments()` list and sort plumbing; `useSegment(id)` for reactivity is already in place and will reflect the rename immediately via its `useSyncExternalStore` subscription.
  - [ ] Add the same local state/ref pattern as Task 1: `isEditing`, `editValue`, `editError`, `submittedRef`.
  - [ ] Wrap the existing `<ThemedText type="title" numberOfLines={2} style={styles.title}>{segment.name}</ThemedText>` in a `<Pressable onLongPress={...} delayLongPress={1000} accessibilityHint="Press and hold to rename">`. In editing state, swap to a `<TextInput>` with `autoFocus`, `returnKeyType="done"`, matching `styles.title`'s font size/weight so there is no layout shift. Use `theme.text` color and a transparent or `theme.background` background.
  - [ ] `handleSubmit` for the detail heading: if empty after trim, set error and return. Otherwise: `submittedRef.current = true`, call `renameSegment(id, editValue.trim())` directly (no parent callback — this screen owns its own write path), `setIsEditing(false)`, `setEditError(null)`, reset ref. After `renameSegment` writes, `useSegment(id)` will re-render `segment.name` to the new value — no manual state update needed for the display text.
  - [ ] `handleBlur` for the detail heading: identical logic to Task 1.
  - [ ] Render `editError` when non-null and editing, in the same style as Task 1.
  - [ ] Add `testID="segment-detail-heading"` to the Pressable wrapper (used in tests for long-press targeting).
  - [ ] Wrap the write in a try/catch — `renameSegment` can throw (lib-level guard, same as every other write on this screen is guarded against). On catch: `setEditError('Could not rename that segment.')`, stay in editing state. This is the detail screen's equivalent of `index.tsx`'s `runAction`.

- [x] Task 4: Tests in `src/components/SegmentListItem.test.tsx` (AC #1–5)
  - [x] Update `renderRow` helper to supply a no-op `onInlineRename={jest.fn()}` as default (matches the `onRename` pattern).
  - [x] **AC #5 — tap still opens:** `fireEvent.press(getByTestId('segment-row-segment-1'))` → `onOpen` called, no TextInput in the tree. (Regression guard: long-press threshold must not intercept plain taps.)
  - [x] **AC #1 — long-press enters edit mode:** `fireEvent.longPress(getByTestId('segment-row-segment-1'))` → `queryByText('Bar 24 arpeggio')` (ThemedText) is gone; a TextInput with value `'Bar 24 arpeggio'` is present. Use `fireEvent.longPress`, not `fireEvent.press`.
  - [x] **Static `accessibilityHint`:** before any long-press, `getByTestId('segment-row-segment-1').props.accessibilityHint` equals `"Press and hold to rename"`.
  - [x] **AC #2 — submit saves:** long-press → edit value → `fireEvent(input, 'submitEditing')` → `onInlineRename` called with the new value; TextInput is gone; static text shows the new name. Use `fireEvent(input, 'submitEditing')` (RNTL v14 form).
  - [x] **AC #3 — blur reverts:** long-press → edit value → `fireEvent(input, 'blur')` → `onInlineRename` NOT called; original name shown; TextInput gone.
  - [x] **AC #4 — empty submit shows error:** long-press → clear the input value → `fireEvent(input, 'submitEditing')` → `onInlineRename` NOT called; TextInput still present; `getByTestId('segment-row-inline-error-segment-1')` is present with a non-empty message.
  - [x] **Blur after submit does NOT revert:** long-press → edit → submitEditing → immediately fireEvent blur → `onInlineRename` called exactly once, static text shown (the `submittedRef` guard).

- [x] Task 5: Tests in `src/app-tests/segment-detail.test.tsx` (AC #1–4)
  - [x] The detail screen test file already creates segments and sets up `useLocalSearchParams`. Add a new `describe('inline rename on detail heading [Story 4.5]', ...)` block following the Story 4.4 describe blocks. Reuse the existing `beforeEach` that creates a segment and mocks `useLocalSearchParams`.
  - [x] **AC #1 — long-press enters edit mode:** `fireEvent.longPress(getByTestId('segment-detail-heading'))` → a TextInput with value matching the segment name is present; the static title ThemedText is gone.
  - [x] **AC #2 — submit renames:** long-press → change input → `fireEvent(input, 'submitEditing')` → heading shows new name (via `useSegment` reactive update); TextInput gone. Verify the new name is stored by checking `readSegments()` or the rendered text matches the stored value.
  - [x] **AC #3 — blur reverts:** long-press → change input → blur → original name shown; `renameSegment` NOT called (verify via `readSegments()` that the name is unchanged).
  - [x] **AC #4 — empty submit shows error:** long-press → clear → submitEditing → TextInput still present; error message rendered; segment name unchanged in storage.

## Dev Notes

### Architecture compliance

- **FR40 is a second UI entry point to the existing `renameSegment` function** — no new `lib/` function, no schema change. `architecture.md` (edit history, 2026-09-06): "a second UI entry point to the existing renameSegment function, not a second implementation of it."
- **No new component** — per `ux-design-specification.md` §605: "No new custom component. This is a state of the existing text label... a Pressable wrapping the text, using `onLongPress`/`delayLongPress={1000}`, swapping its rendered child between `<Text>` and `<TextInput>` based on local edit-state."
- **No new route, no `stack-screens.ts` change, no `_layout.tsx` change** — inline editing is UI state, not a navigation event. The rename screen (`app/segment/[id]/rename.tsx`) from Story 4.1 coexists with this; neither replaces the other.
- **`renameSegment` already handles everything** — empty name throws, disambiguation is automatic (returns the corrected name), unknown id throws. The component/screen validation (`trim().length === 0`) is a UX-first guard; `renameSegment`'s throw is the safety net.

### Existing code confirmed by direct inspection

- **`src/components/SegmentListItem.tsx`** (read in full): currently a `ThemedView` row with a `Pressable` for tap-to-open (`onPress={onOpen}`) and a separate menu `Pressable`. The tap Pressable already has `testID="segment-row-{id}"`. The name text is `<ThemedText numberOfLines={1}>{segment.name}</ThemedText>` inside that Pressable. Long-press adds `onLongPress` and `delayLongPress={1000}` to the existing Pressable — the `onPress` stays, satisfying AC #5 with zero extra structure.

- **`src/app/segment/[id].tsx`** (read in full): heading is `<ThemedText type="title" numberOfLines={2} style={styles.title}>{segment.name}</ThemedText>` as a plain child of the `<>` fragment inside the `segment ?` branch. Wrapping it in a Pressable adds one nesting level; the outer `SafeAreaView`/`ThemedView` structure is untouched. `useSegment(id)` is already `useSyncExternalStore`-backed — after `renameSegment` writes, `segment.name` updates reactively on the next render, so there is no manual display state to maintain.

- **`src/app/index.tsx`** (read in full): `useSegments()` already exposes `renameSegment` (line 70 of `useSegments.ts`). `index.tsx` already destructures `deleteSegment` and `duplicateSegment`; adding `renameSegment` follows the same pattern. `runAction` wraps every data write on this screen in a try/catch that sets `error` state and surfaces it via `segment-list-error` — `onInlineRename` must use it too.

- **`src/lib/segments.ts#renameSegment`** (confirmed): `export function renameSegment(id: string, name: string): Segment`. Throws `'Segment name must not be empty'` on empty-after-normalize, throws `'Segment not found: {id}'` on unknown id. Calls `disambiguate` with `excludeId=id` so a case-change rename on the same name succeeds. Returns the updated `Segment` record (including the disambiguated name). Called correctly with `renameSegment(id, name.trim())`.

- **`src/hooks/useSegments.ts`** (read in full, line 70): `renameSegment: segments.renameSegment` — already re-exported. No hook change needed.

### `onLongPress` + `onPress` coexistence in React Native / Pressable

A `Pressable` with both `onPress` and `onLongPress` calls `onPress` when the finger lifts before `delayLongPress` expires, and calls `onLongPress` (not `onPress`) when it expires first. So `delayLongPress={1000}` means:
- A tap shorter than 1 s → `onPress` → navigates (AC #5 satisfied automatically)
- A hold ≥ 1 s → `onLongPress` → enters edit mode

No additional state or gesture detection is needed for AC #5.

### `onSubmitEditing` before `onBlur` ordering

On iOS, `onSubmitEditing` fires before the keyboard-dismiss `onBlur`. The `submittedRef` pattern handles this correctly: by the time `onBlur` runs, `submittedRef.current` is `true`, so the revert branch is skipped. On Android the ordering is consistent with this pattern too.

### TextInput styling for no-layout-shift

The key is matching the exact dimensions of the replaced `<ThemedText>`:
- `flex: 1` — fills the Pressable's available width (same as `ThemedText` inside `styles.rowLabel`)
- `paddingHorizontal: Spacing.three`, `paddingVertical: Spacing.three` — matches `styles.rowLabel`
- `fontSize: 14` (ThemedText default), `fontWeight: 'normal'` for the list row
- For the detail heading: `fontSize` and `fontWeight` matching `type="title"` (see `themed-text.tsx` for the exact values)
- `color: theme.text` — uses the theme token, not a hardcoded color
- `backgroundColor: 'transparent'` — the `ThemedView` row background already shows through

### Previous story intelligence (4.4 / 4.3)

- Story 4.1's `rename.tsx` screen uses `SegmentForm` which handles empty validation internally before calling `renameSegment`. This story's inline path duplicates only the UI-level guard (the `trim().length === 0` check before calling the handler) — it does not reuse `SegmentForm` (per UX spec: no new component, in-place swap, no screen push).
- Story 4.2's duplicate-confirmation pattern (inline notice, auto-dismiss, `accessibilityLiveRegion="polite"`) is NOT needed here — the rename result is immediately visible as the field reverts to static text with the new name, so no separate confirmation is warranted.
- Story 4.4 established that `useSegment(id)` in the detail screen re-renders reactively on any segment write. The heading will update to the new name without any additional subscription work.
- All previous stories followed atomic commit discipline: stage only the story's files, write a root-cause commit body, update this story file's `Dev Agent Record` before committing.

### Test patterns from existing files

- `SegmentListItem.test.tsx` uses `fireEvent.press` / `within(menu).getAllByRole` — `fireEvent.longPress` follows the same import/call pattern.
- `segment-detail.test.tsx` uses `await render(...)` (RNTL v14 async), `createSegment(...)` for fixtures, `storage.clearAll()` in `beforeEach` (shared with all suites via `jest.setup.js`), and `readSegments()` for storage-state assertions.
- `fireEvent(input, 'submitEditing')` is the RNTL v14 idiom for triggering `onSubmitEditing` on a `TextInput`. `fireEvent(input, 'blur')` triggers `onBlur`.
- Always `await` `render()`, `renderHook()`, and `act()` calls (RNTL v14 rule from project-context.md).

### Project Structure Notes

**Modified:**
- `src/components/SegmentListItem.tsx` — add `onInlineRename` prop, local edit state, inline TextInput
- `src/components/SegmentListItem.test.tsx` — new describe block for inline rename (Tasks 4)
- `src/app/segment/[id].tsx` — inline rename on detail heading; add `renameSegment` import from `@/lib/segments`; add `testID="segment-detail-heading"` to Pressable wrapper
- `src/app-tests/segment-detail.test.tsx` — new describe block for inline rename (Task 5)
- `src/app/index.tsx` — destructure `renameSegment` from `useSegments()`, pass `onInlineRename` to `SegmentListItem`

**Not touched:**
- `src/app/segment/[id]/rename.tsx` — the Story 4.1 screen coexists unchanged
- `src/lib/segments.ts` — no new lib function
- `src/lib/history.ts`, `src/hooks/useSegments.ts`, `src/hooks/useSegmentHistory.ts` — no changes
- `src/app/stack-screens.ts`, `src/app/_layout.tsx` — no new routes

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.5] — story statement and all 5 ACs (verbatim above)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Inline-Rename-(FR40)] (~lines 591–607) — trigger, editing state, commit, cancel, "no new component," accessibility
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility-(v1.1)] — UX-DR25: `accessibilityHint="Press and hold to rename"` static, "Editing segment name" on entry
- [Source: _bmad-output/planning-artifacts/architecture.md] (edit 2026-09-06) — "second UI entry point to the existing renameSegment function, not a second implementation of it. No new lib/ function, no schema change."
- [Source: _bmad-output/project-context.md] — `useRef` pattern, RNTL v14 async-API rule, co-located vs. `app-tests/` rule, no direct MMKV (storage.ts only), single-contact `renameSegment` rule

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — all tests green on first implementation pass.

### Completion Notes List

- All 5 ACs implemented and covered by tests.
- AC #1 (long-press enters edit mode): both list row (`SegmentListItem`) and detail heading (`segment/[id].tsx`) accept a 1-second `onLongPress`/`delayLongPress={1000}` and swap their text label for an auto-focused `TextInput` pre-filled with the current name — no layout shift (TextInput styled to match ThemedText dimensions exactly).
- AC #2 (submit saves): `onSubmitEditing` trims and calls `onInlineRename` (list row, via parent `runAction`) or `renameSegment` directly (detail heading); field returns to static text. `useSegment(id)` reactive subscription means the heading re-renders the new name automatically — no manual display state.
- AC #3 (blur reverts): `onBlur` discards `editValue` and returns to static text showing `segment.name`. `submittedRef` guard prevents a post-submit blur from firing a second revert.
- AC #4 (empty submit shows error): UI-level guard sets `editError` and returns early; `onInlineRename`/`renameSegment` is never called; field stays open.
- AC #5 (tap still opens): `onPress={onOpen}` stays on the same Pressable; React Native's Pressable calls `onPress` when the finger lifts before `delayLongPress` expires — no extra state or gesture detection needed.
- 11 new tests added (7 in `SegmentListItem.test.tsx`, 4 in `segment-detail.test.tsx`). Full suite: 288/288 passing (was 277). `tsc --noEmit` clean.
- No new routes, no `stack-screens.ts` change, no new lib/ functions, no new dependencies.
- `renameSegment` already imported via `useSegments` hook in `index.tsx`; destructured alongside `deleteSegment`/`duplicateSegment`.

### File List

**Modified:**
- `src/components/SegmentListItem.tsx` (added `onInlineRename` prop, local edit state, `TextInput` inline rename, `submittedRef` blur guard)
- `src/components/SegmentListItem.test.tsx` (added `onInlineRename` default prop; new describe block with 7 tests for inline rename)
- `src/app/segment/[id].tsx` (added `renameSegment` import, `isEditing`/`editValue`/`editError`/`submittedRef` state, Pressable heading wrapper with `testID="segment-detail-heading"`, `TextInput` inline rename)
- `src/app-tests/segment-detail.test.tsx` (added `readSegments` import; new describe block with 4 tests for detail heading inline rename)
- `src/app/index.tsx` (destructured `renameSegment` from `useSegments()`; added `onInlineRename` prop to `SegmentListItem`)

### Change Log

- 2026-09-10: Implemented Story 4.5 in full (Tasks 1–5) — inline rename via press-and-hold at the segment list row and segment detail heading. No new lib/ functions, no new routes. 11 new tests. 288/288 passing, tsc clean. Status: ready-for-dev → review.
