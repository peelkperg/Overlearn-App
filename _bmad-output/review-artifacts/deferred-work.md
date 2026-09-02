# Deferred Work

## Deferred from: code review of epics.md Epic 1 (2026-09-01)

- `archiveSegment` throws on a missing id while `deleteSegment` silently no-ops — opposite failure semantics on sibling mutators, enshrined in the test suite (`src/lib/segments.ts:43,56`).
- Story 1.1's MMKV round-trip AC is validated only against the Jest mock (`isTest()` path) and the stubbed nitro-modules bridge — no real native instance has been exercised (`src/lib/storage.test.ts`, `__mocks__/react-native-nitro-modules.js`).
- `src/lib/storage.ts:7` exports the raw MMKV instance, so architecture.md:316's "single point of contact" boundary is documentation-only and already bypassed by `segments.test.ts:2`. No lint rule enforces it.
- No schema version or migration field on the persisted shape (`src/lib/types.ts`, key `segments.list`); an older array missing `archived` coerces to visible with no detection.
- History ordering trusts a monotonic device clock — `useSegmentHistory` performs no sort (`src/hooks/useSegmentHistory.ts:11-13`).
- Segment names are not normalized or sanitized for newlines, RTL overrides (U+202E), or unusual unicode (`src/lib/segments.ts:22`).
