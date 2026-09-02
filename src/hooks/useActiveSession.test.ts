import { act, renderHook } from '@testing-library/react-native';

import { readHistory } from '@/lib/history';
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
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });

    expect(result.current.session?.segmentId).toBe('segment-1');
    expect(result.current.session?.segmentName).toBe('Bar 24 arpeggio');
    expect(result.current.session?.currentStreak).toBe(0);
    expect(result.current.session?.totalIncorrectThisSession).toBe(0);
    expect(result.current.session?.sessionComplete).toBe(false);
    expect(result.current.targetStreak).toBe(5);
  });

  it('persists the started session via the MMKV write helpers', async () => {
    const { result } = await renderHook(() => useActiveSession());

    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
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
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });

    await act(() => {
      result.current.logCorrect();
    });

    expect(result.current.session?.currentStreak).toBe(1);
  });

  it('persists the increment via the MMKV write helpers', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
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
      result.current.start('segment-1', 'Bar 24 arpeggio');
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
      result.current.start('segment-1', 'Bar 24 arpeggio');
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
      result.current.start('segment-1', 'Bar 24 arpeggio');
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

describe('useActiveSession restart [Story 2.4]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('resets all four session fields to starting values', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    await act(() => {
      result.current.logCorrect();
    });
    for (let i = 0; i < 11; i++) {
      await act(() => {
        result.current.logIncorrect();
      });
    }
    expect(result.current.targetStreak).toBe(6); // sanity check before restart

    await act(() => {
      result.current.restart();
    });

    expect(result.current.session?.currentStreak).toBe(0);
    expect(result.current.session?.totalIncorrectThisSession).toBe(0);
    expect(result.current.targetStreak).toBe(5);
    expect(result.current.session?.segmentName).toBe('Bar 24 arpeggio');
  });

  it('persists the reset via the MMKV write helpers', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    await act(() => {
      result.current.logCorrect();
    });
    await act(() => {
      result.current.restart();
    });

    const { result: reloaded } = await renderHook(() => useActiveSession());
    expect(reloaded.current.session?.currentStreak).toBe(0);
  });

  it('is a no-op with no active session', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.restart();
    });

    expect(result.current.session).toBeNull();
  });

  // FR29: a restarted/abandoned attempt must never appear in history — only
  // Done (Story 2.7) writes an entry. restart() has no reference to
  // lib/history at all; this asserts that at the observable-behavior level
  // rather than relying on that structural fact holding under refactor.
  it('writes no history entry (FR29)', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    await act(() => {
      result.current.logCorrect();
    });
    for (let i = 0; i < 11; i++) {
      await act(() => {
        result.current.logIncorrect();
      });
    }

    await act(() => {
      result.current.restart();
    });

    expect(readHistory('segment-1')).toEqual([]);
  });
});

describe('useActiveSession completion [Story 2.5]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('marks session_complete once current_streak reaches target_streak (5)', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });

    for (let i = 0; i < 4; i++) {
      await act(() => {
        result.current.logCorrect();
      });
    }
    expect(result.current.session?.sessionComplete).toBe(false);

    await act(() => {
      result.current.logCorrect();
    });
    expect(result.current.session?.currentStreak).toBe(5);
    expect(result.current.session?.sessionComplete).toBe(true);
  });

  it('locks out logCorrect, logIncorrect, and restart once complete', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    for (let i = 0; i < 5; i++) {
      await act(() => {
        result.current.logCorrect();
      });
    }
    expect(result.current.session?.sessionComplete).toBe(true);

    await act(() => {
      result.current.logCorrect();
    });
    expect(result.current.session?.currentStreak).toBe(5); // unchanged

    await act(() => {
      result.current.logIncorrect();
    });
    expect(result.current.session?.totalIncorrectThisSession).toBe(0); // unchanged

    await act(() => {
      result.current.restart();
    });
    expect(result.current.session?.sessionComplete).toBe(true); // unchanged, not reset
  });

  it('sets settled once complete', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    expect(result.current.settled).toBe(false);

    for (let i = 0; i < 5; i++) {
      await act(() => {
        result.current.logCorrect();
      });
    }
    expect(result.current.settled).toBe(true);
  });
});

describe('useActiveSession endSession [Story 2.7]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('clears the session', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });

    await act(() => {
      result.current.endSession();
    });

    expect(result.current.session).toBeNull();
  });

  it('clears the persisted session too, not just local state', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    await act(() => {
      result.current.endSession();
    });

    const { result: reloaded } = await renderHook(() => useActiveSession());
    expect(reloaded.current.session).toBeNull();
  });
});

describe('useActiveSession rapid taps [Review][Patch, CRITICAL]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('compounds two Correct taps issued before a re-render, instead of dropping one', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });

    // Both calls happen synchronously in one act(), before React commits
    // the first setSession — this is what a fast double-tap looks like.
    // Previously both mutators read the same stale `session` from the
    // render closure, so the second overwrote the first instead of
    // compounding on it, and this asserted 1.
    await act(() => {
      result.current.logCorrect();
      result.current.logCorrect();
    });

    expect(result.current.session?.currentStreak).toBe(2);
  });

  it('compounds two Incorrect taps issued before a re-render', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });

    await act(() => {
      result.current.logIncorrect();
      result.current.logIncorrect();
    });

    expect(result.current.session?.totalIncorrectThisSession).toBe(2);
  });

  it('two mounted instances stay in sync — a mutation on one is visible on the other', async () => {
    // Mirrors app/index.tsx and app/session/[id].tsx both holding their
    // own useActiveSession() instance at the same time.
    const a = await renderHook(() => useActiveSession());
    const b = await renderHook(() => useActiveSession());

    await act(() => {
      a.result.current.start('segment-1', 'Bar 24 arpeggio');
    });

    expect(b.result.current.session?.segmentId).toBe('segment-1');

    await act(() => {
      b.result.current.logCorrect();
    });

    expect(a.result.current.session?.currentStreak).toBe(1);
  });
});

describe('useActiveSession feedback reset on Repeat [Review][Patch]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('clears settled when a new session starts on the same mounted instance', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    // Reach completion (target floor is 5).
    await act(() => {
      for (let i = 0; i < 5; i += 1) result.current.logCorrect();
    });
    expect(result.current.settled).toBe(true);

    // Story 2.8: Repeat calls start() again on this same instance.
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });

    expect(result.current.settled).toBe(false);
  });
});
