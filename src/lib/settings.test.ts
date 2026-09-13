import { readSettings, setOverlearningPercent, setSortOption } from './settings';
import { storage } from './storage';

describe('lib/settings [Story 4.3]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('returns the default settings when nothing has been written yet', () => {
    expect(readSettings()).toEqual({ overlearningPercent: 50, sortKey: 'createdAt', sortDirection: 'asc' });
  });

  it('persists a sort option and reflects it on the next read', () => {
    setSortOption('lastPracticed', 'desc');
    expect(readSettings()).toEqual({ overlearningPercent: 50, sortKey: 'lastPracticed', sortDirection: 'desc' });
  });

  it('returns the same object reference across calls when nothing has changed', () => {
    setSortOption('name', 'asc');
    const first = readSettings();
    const second = readSettings();
    expect(first).toBe(second);
  });

  it('falls back to defaults and quarantines a corrupted settings payload', () => {
    storage.set('settings.general', '{"not":"valid"}');
    expect(readSettings()).toEqual({ overlearningPercent: 50, sortKey: 'createdAt', sortDirection: 'asc' });

    const backup = storage.getAllKeys().find((key) => key.startsWith('settings.general.corrupt.'));
    expect(backup).toBeDefined();
  });

  // [Review][Patch] found via code review of a deferred item logged against
  // Story 4.7 (2026-09-12): setSortOption used to spread readSettings()'s
  // DEFAULT_SETTINGS fallback over whatever the user had actually configured
  // — a sort tap after any settings.general corruption silently reset
  // overlearningPercent to 50 with no error surfaced. It must now refuse the
  // write instead, distinguishing "quarantined" (raw data present, invalid)
  // from "genuinely never configured" (no raw data at all — see the next
  // test), since only the former is data loss in the making.
  it('refuses to write a sort option over quarantined settings data instead of resetting it', () => {
    storage.set('settings.general', '{"not":"valid"}');
    expect(() => setSortOption('lastPracticed', 'desc')).toThrow();

    // The corrupt payload itself must survive untouched — a refused write
    // must not leave the key in some third, different-again shape.
    expect(storage.getString('settings.general')).toBe('{"not":"valid"}');
  });

  it('writes normally when the key has never been touched at all (not quarantined, just absent)', () => {
    expect(() => setSortOption('lastPracticed', 'desc')).not.toThrow();
    expect(readSettings().sortKey).toBe('lastPracticed');
  });
});

describe('lib/settings setOverlearningPercent [Story 5.1]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('writes the exact value when already a valid multiple of 10 in range', () => {
    setOverlearningPercent(150);
    expect(readSettings().overlearningPercent).toBe(150);
  });

  it('clamps a value below 50 to 50', () => {
    setOverlearningPercent(10);
    expect(readSettings().overlearningPercent).toBe(50);
  });

  it('clamps a value above 300 to 300', () => {
    setOverlearningPercent(400);
    expect(readSettings().overlearningPercent).toBe(300);
  });

  it('rounds a non-multiple-of-10 input to the nearest 10 (defensive — the UI never produces one)', () => {
    setOverlearningPercent(123);
    expect(readSettings().overlearningPercent).toBe(120);
  });

  // [Review][Patch] found via code review 2026-09-10: only 123 (below the
  // .5 boundary) was tested — Math.round could silently regress to
  // Math.floor/Math.trunc with no red test. 125 (exactly at the boundary,
  // 12.5 decades) rounds up to 130 only under true half-up rounding; floor
  // and trunc would both give 120.
  it('rounds up at exactly the .5 boundary within a decade, not down', () => {
    setOverlearningPercent(125);
    expect(readSettings().overlearningPercent).toBe(130);
  });

  it('leaves the exact boundary values 50 and 300 unchanged', () => {
    setOverlearningPercent(50);
    expect(readSettings().overlearningPercent).toBe(50);
    setOverlearningPercent(300);
    expect(readSettings().overlearningPercent).toBe(300);
  });

  // [Review][Patch] found via code review 2026-09-10: the non-finite guard
  // carried the longest comment in the diff but had zero test coverage —
  // CLAUDE.md SS11.1 requires error-condition tests for new logic. A bare
  // clamp on NaN/Infinity still yields NaN (Math.max/min/round all
  // propagate it), which would fail isSettings on the next read and
  // quarantine the entire settings.general key, including the unrelated
  // sortKey/sortDirection fields.
  it.each([NaN, Infinity, -Infinity])('falls back to the default instead of writing a non-finite value (%p)', (value) => {
    setOverlearningPercent(value);
    expect(readSettings().overlearningPercent).toBe(50);
  });

  it('does not quarantine sortKey/sortDirection when given a non-finite value', () => {
    setSortOption('lastPracticed', 'desc');
    setOverlearningPercent(NaN);
    expect(readSettings()).toEqual({ overlearningPercent: 50, sortKey: 'lastPracticed', sortDirection: 'desc' });
  });

  it('preserves the existing sortKey/sortDirection fields', () => {
    setSortOption('lastPracticed', 'desc');
    setOverlearningPercent(200);
    expect(readSettings()).toEqual({ overlearningPercent: 200, sortKey: 'lastPracticed', sortDirection: 'desc' });
  });

  // [Review][Patch] found via code review of a deferred item logged against
  // Story 4.7 (2026-09-12): same refuse-on-quarantine guarantee as
  // setSortOption's, verified for this writer too — both share
  // readSettingsForWrite().
  it('refuses to write a target change over quarantined settings data instead of resetting other fields', () => {
    storage.set('settings.general', '{"not":"valid"}');
    expect(() => setOverlearningPercent(150)).toThrow();
    expect(storage.getString('settings.general')).toBe('{"not":"valid"}');
  });
});
