import { act, renderHook } from '@testing-library/react-native';

import { storage } from '@/lib/storage';

import { useActiveSession } from './useActiveSession';

// See _bmad-output/planning-artifacts/architecture.md's RNTL v14 note:
// render()/renderHook() are async in this version — always await them.
describe('useActiveSession [Story 2.1]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('has no session before start() is called', async () => {
    const { result } = await renderHook(() => useActiveSession());
    expect(result.current.session).toBeNull();
  });

  it('start() begins a session at current_streak=0 with target_streak=5', async () => {
    const { result } = await renderHook(() => useActiveSession());

    await act(() => {
      result.current.start('Bar 24 arpeggio');
    });

    expect(result.current.session?.segmentName).toBe('Bar 24 arpeggio');
    expect(result.current.session?.currentStreak).toBe(0);
    expect(result.current.session?.totalIncorrectThisSession).toBe(0);
    expect(result.current.session?.sessionComplete).toBe(false);
    expect(result.current.targetStreak).toBe(5);
  });

  it('persists the started session via the MMKV write helpers', async () => {
    const { result } = await renderHook(() => useActiveSession());

    await act(() => {
      result.current.start('Bar 24 arpeggio');
    });

    const { result: reloaded } = await renderHook(() => useActiveSession());
    expect(reloaded.current.session?.segmentName).toBe('Bar 24 arpeggio');
  });
});
