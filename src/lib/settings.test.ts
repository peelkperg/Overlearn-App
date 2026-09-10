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

  it('preserves the existing sortKey/sortDirection fields', () => {
    setSortOption('lastPracticed', 'desc');
    setOverlearningPercent(200);
    expect(readSettings()).toEqual({ overlearningPercent: 200, sortKey: 'lastPracticed', sortDirection: 'desc' });
  });
});
