# Deferred Work

Items surfaced by review workflows that were real but not actionable at the time they were found.

## Deferred from: code review of 4-1-rename-a-segment (2026-09-06)

- **Generic `catch` in the Rename screen misattributes non-storage failures.** `src/app/segment/[id]/rename.tsx`'s `handleSubmit` collapses every throw into "Could not rename that segment. Check that the device has free storage." `renameSegment` also throws on an empty name and on an unknown segment id, neither of which is a storage problem. Deferred because: (a) the identical generic-catch pattern is the established convention in `src/app/segment/new.tsx`, so changing only the new screen would introduce an inconsistency; (b) both non-storage throw paths are unreachable in practice today — `SegmentForm` blocks submission of an empty/whitespace-only name before `onSubmit` fires, and this single-user offline app has no path to delete a segment while its Rename screen sits on top of the navigation stack. Revisit if either invariant changes (e.g. FR40's inline rename bypasses `SegmentForm`'s validation, or any background/multi-surface mutation is introduced).
