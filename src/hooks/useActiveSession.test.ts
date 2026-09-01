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

describe('useActiveSession logCorrect [Story 2.2]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('increments current_streak by 1', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('Bar 24 arpeggio');
    });

    await act(() => {
      result.current.logCorrect();
    });

    expect(result.current.session?.currentStreak).toBe(1);
  });

  it('persists the increment via the MMKV write helpers', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('Bar 24 arpeggio');
    });
    await act(() => {
      result.current.logCorrect();
    });

    const { result: reloaded } = await renderHook(() => useActiveSession());
    expect(reloaded.current.session?.currentStreak).toBe(1);
  });

  it('is a no-op with no active session', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.logCorrect();
    });

    expect(result.current.session).toBeNull();
  });
});

describe('useActiveSession logIncorrect [Story 2.3]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('resets current_streak to 0 and increments total_incorrect_this_session', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('Bar 24 arpeggio');
    });
    await act(() => {
      result.current.logCorrect();
      result.current.logCorrect();
    });

    await act(() => {
      result.current.logIncorrect();
    });

    expect(result.current.session?.currentStreak).toBe(0);
    expect(result.current.session?.totalIncorrectThisSession).toBe(1);
  });

  it('keeps target_streak at the floor through the 10th incorrect tap', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('Bar 24 arpeggio');
    });

    for (let i = 0; i < 10; i++) {
      await act(() => {
        result.current.logIncorrect();
      });
    }

    expect(result.current.session?.totalIncorrectThisSession).toBe(10);
    expect(result.current.targetStreak).toBe(5);
  });

  it('raises target_streak on the 11th incorrect tap', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('Bar 24 arpeggio');
    });

    for (let i = 0; i < 11; i++) {
      await act(() => {
        result.current.logIncorrect();
      });
    }

    expect(result.current.session?.totalIncorrectThisSession).toBe(11);
    expect(result.current.targetStreak).toBe(6);
  });

  it('is a no-op with no active session', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.logIncorrect();
    });

    expect(result.current.session).toBeNull();
  });
});
