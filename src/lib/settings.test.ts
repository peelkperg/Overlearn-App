import { readSettings, setSortOption } from './settings';
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
