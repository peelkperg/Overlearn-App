# Backlog

Small, tactical feature requests not yet scoped into an epic/story. Distinct
from the product brief's "Explicitly out for v1" list, which tracks major
capability categories (metronome, tuner, voice input, etc.) cut at the
strategic-scope level. Items here are candidates for a future story pass —
none are designed or estimated yet.

## Open

### Rename a segment from the row menu

**Requested:** 2026-09-02, by Gerardo.

Add a **Rename** option to the segment row's action menu (`SegmentListItem.tsx`), alongside Delete. No FR currently covers this — segment names are set once at creation (FR1) with no way to change them afterward.

**Context:** `SegmentForm.tsx` was already designed as a shared create/rename form (see `architecture.md`'s Project Structure and `ux-design-specification.md`'s Component Strategy — both describe it as "segment creation/rename"), but rename was never actually wired into the UI; only creation ships today. Implementing this is substantially reusing existing form/validation logic (`normalizeSegmentName`, disambiguation against existing names in `lib/segments.ts`), not building from scratch.

**Open questions for scoping (not yet answered):**
- Does a rename mid-active-session update the segment name shown on that session's Active Session screen and any history entries already recorded for it, or only future ones? (`SessionState.segmentName` and `HistoryEntry` don't currently store a live reference back to the segment — they copy the name at the time.)
- Does the resume/discard prompt's segment name (`ResumeDiscardDialog`) need to reflect a rename that happened while a session was interrupted?
