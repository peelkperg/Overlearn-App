import { renderHook } from '@testing-library/react-native';

import { writeHistoryEntry } from '@/lib/history';
import { storage } from '@/lib/storage';

import { useSegmentHistory } from './useSegmentHistory';

describe('useSegmentHistory [Story 3.1]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('returns an empty array for a segment with no completed sessions', async () => {
    const { result } = await renderHook(() => useSegmentHistory('segment-1'));
    expect(result.current).toEqual([]);
  });

  it('returns entries in chronological (write) order', async () => {
    const first = { date: '2026-08-31T12:00:00.000Z', finalTarget: 5, totalMistakes: 0, totalAttempts: 5 };
    const second = { date: '2026-08-31T13:00:00.000Z', finalTarget: 6, totalMistakes: 11, totalAttempts: 17 };
    writeHistoryEntry('segment-1', first);
    writeHistoryEntry('segment-1', second);

    const { result } = await renderHook(() => useSegmentHistory('segment-1'));
    expect(result.current).toEqual([first, second]);
  });

  it('only returns history for the requested segment', async () => {
    writeHistoryEntry('segment-1', { date: '2026-08-31T12:00:00.000Z', finalTarget: 5, totalMistakes: 0, totalAttempts: 5 });
    writeHistoryEntry('segment-2', { date: '2026-08-31T13:00:00.000Z', finalTarget: 6, totalMistakes: 11, totalAttempts: 17 });

    const { result } = await renderHook(() => useSegmentHistory('segment-1'));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].finalTarget).toBe(5);
  });
});
