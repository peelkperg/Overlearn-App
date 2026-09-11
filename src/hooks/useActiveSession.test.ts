import { act, renderHook } from '@testing-library/react-native';

import { readHistory } from '@/lib/history';
import { setOverlearningPercent } from '@/lib/settings';
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

describe('useActiveSession overlearningLevel threading [Story 5.1]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it("reflects the configured level in the hook's returned targetStreak", async () => {
    setOverlearningPercent(300); // level 3.0
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    for (let i = 0; i < 10; i++) {
      await act(() => {
        result.current.logIncorrect();
      });
    }

    // Default level would hold at the floor (5) through the 10th incorrect
    // tap; at level 3.0, calculateTargetStreak(10, 3.0) = 30.
    expect(result.current.targetStreak).toBe(30);
  });

  it('raises the target on logIncorrect consistent with the configured level, not the 50% default', async () => {
    setOverlearningPercent(150); // level 1.5
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });

    await act(() => {
      result.current.logIncorrect();
      result.current.logIncorrect();
    });

    // calculateTargetStreak(2, 1.5) = ceil(3) = 5 (still the floor);
    // calculateTargetStreak(4, 1.5) = ceil(6) = 6 — verify via a case that
    // actually diverges from the default-level (0.5) target.
    for (let i = 0; i < 2; i++) {
      await act(() => {
        result.current.logIncorrect();
      });
    }
    expect(result.current.session?.totalIncorrectThisSession).toBe(4);
    expect(result.current.targetStreak).toBe(6);
  });

  it("writes a history entry whose finalTarget matches the configured level, at the site Task 4 flags as most likely to be missed", async () => {
    setOverlearningPercent(300); // level 3.0
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    // 2 mistakes: calculateTargetStreak(2, 3.0) = ceil(6) = 6, which diverges
    // from calculateTargetStreak(2, 0.5) = floor 5 — so a finalTarget of 5
    // here would mean complete() used the default level, not the configured
    // one.
    await act(() => {
      result.current.logIncorrect();
      result.current.logIncorrect();
    });
    expect(result.current.targetStreak).toBe(6);

    for (let i = 0; i < 6; i++) {
      await act(() => {
        result.current.logCorrect();
      });
    }
    expect(result.current.session?.sessionComplete).toBe(true);

    await act(() => {
      result.current.complete();
    });

    const entries = readHistory('segment-1');
    expect(entries).toHaveLength(1);
    expect(entries[0].finalTarget).toBe(6);
  });

  // [Review][Patch] found via code review 2026-09-10: complete() used to
  // recompute finalTarget from the *live* overlearningLevel at Done-time
  // instead of the level in effect when the session actually completed —
  // a settings change in that window would permanently misrecord history.
  it('writes the target actually met, unaffected by a settings change between completion and Done', async () => {
    setOverlearningPercent(150); // level 1.5
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    // 10 mistakes at level 1.5: calculateTargetStreak(10, 1.5) = ceil(15) = 15.
    for (let i = 0; i < 10; i++) {
      await act(() => {
        result.current.logIncorrect();
      });
    }
    for (let i = 0; i < 15; i++) {
      await act(() => {
        result.current.logCorrect();
      });
    }
    expect(result.current.session?.sessionComplete).toBe(true);

    // Simulates backing out to Settings before tapping Done and lowering
    // the level — must not change what gets recorded for this session.
    await act(() => {
      setOverlearningPercent(50);
    });

    await act(() => {
      result.current.complete();
    });

    const entries = readHistory('segment-1');
    expect(entries).toHaveLength(1);
    expect(entries[0].finalTarget).toBe(15); // the target actually met, not calculateTargetStreak(10, 0.5) = 5
  });
});

// Story 5.2 (FR37, AC #1): the setting is changed *after* the session has
// already started, not before — the case Story 5.1's own threading tests
// above never exercised. targetStreak must reflect it on the very next
// read, with no restart() call.
describe('useActiveSession mid-session settings change [Story 5.2]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it("reflects a level changed after start(), with no restart or re-navigation", async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    for (let i = 0; i < 11; i++) {
      await act(() => {
        result.current.logIncorrect();
      });
    }
    expect(result.current.targetStreak).toBe(6); // 50% default

    await act(() => {
      setOverlearningPercent(300); // changed mid-session, not before start()
    });

    expect(result.current.targetStreak).toBe(33); // calculateTargetStreak(11, 3.0)
    expect(result.current.session?.totalIncorrectThisSession).toBe(11); // untouched by the settings change
  });
});

// Story 5.2 (Task 3) — reproduces the deferred finding from Story 5.1's code
// review (deferred-work.md, "code review of 5-1..."): sessionComplete is a
// stored boolean, only ever flipped inside logCorrect's own transition —
// unlike targetStreak, it is not derived fresh on every read. Lowering the
// live level mid-session, enough that the already-achieved currentStreak now
// meets or exceeds the new (lower) target, must not leave the session stuck
// showing incomplete until another tap.
describe('useActiveSession mid-session target decrease reconciliation [Story 5.2, Task 3]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('marks the session complete once a settings change alone brings the target down to the achieved streak', async () => {
    setOverlearningPercent(300); // level 3.0
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    for (let i = 0; i < 11; i++) {
      await act(() => {
        result.current.logIncorrect();
      });
    }
    for (let i = 0; i < 6; i++) {
      await act(() => {
        result.current.logCorrect();
      });
    }
    // At level 3.0: calculateTargetStreak(11, 3.0) = 33; currentStreak 6 < 33,
    // genuinely incomplete so far.
    expect(result.current.session?.sessionComplete).toBe(false);
    expect(result.current.session?.currentStreak).toBe(6);

    await act(() => {
      setOverlearningPercent(50); // level 0.5: calculateTargetStreak(11, 0.5) = 6, already met
    });

    expect(result.current.targetStreak).toBe(6);
    expect(result.current.session?.currentStreak).toBe(6);
    // No further Correct/Incorrect tap has happened — only the setting
    // changed. sessionComplete must still become true, and completedTarget
    // must be captured, exactly as a tap-driven completion would.
    expect(result.current.session?.sessionComplete).toBe(true);
    expect(result.current.session?.completedTarget).toBe(6);
  });

  // [Review][Patch] found via code review 2026-09-11: this test previously
  // set the level to 50 when it was already the default 50 — a no-op
  // dependency change that never re-fires the effect, so it passed even
  // with the `>=` guard deleted entirely. Now genuinely changes the level
  // to one whose recalculated target the streak still falls short of.
  it('does not affect a session that genuinely remains below the new target', async () => {
    setOverlearningPercent(50); // level 0.5
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    for (let i = 0; i < 11; i++) {
      await act(() => {
        result.current.logIncorrect();
      });
    }
    await act(() => {
      result.current.logCorrect();
    });
    expect(result.current.session?.currentStreak).toBe(1); // target(11, 0.5) = 6

    await act(() => {
      setOverlearningPercent(300); // target rises to 33 — moves further away, not closer
    });

    expect(result.current.session?.sessionComplete).toBe(false);
    expect(result.current.session?.completedTarget).toBeNull();
  });

  // [Review][Patch] found via code review 2026-09-11: only the
  // currentStreak === target boundary was covered; nothing distinguished
  // `>=` from `===`, and nothing covered the off-by-one just below it.
  it('does not complete at currentStreak exactly one below the new target (boundary)', async () => {
    setOverlearningPercent(300); // level 3.0
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    for (let i = 0; i < 11; i++) {
      await act(() => {
        result.current.logIncorrect();
      });
    }
    for (let i = 0; i < 5; i++) {
      await act(() => {
        result.current.logCorrect();
      });
    }
    expect(result.current.session?.currentStreak).toBe(5); // target(11, 0.5) = 6, one above

    await act(() => {
      setOverlearningPercent(50);
    });

    expect(result.current.session?.sessionComplete).toBe(false);
  });

  // [Review][Decision] resolved 2026-09-11 (record the achieved streak):
  // a settings decrease can leave currentStreak strictly above the newly
  // recalculated target — a shape logCorrect itself can never produce
  // (tap-driven completion always lands at currentStreak === targetStreak
  // exactly). completedTarget must record what was actually achieved.
  it('captures the achieved streak, not the lowered target, when the streak overshoots it', async () => {
    setOverlearningPercent(300); // level 3.0, target(11, 3.0) = 33
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    for (let i = 0; i < 11; i++) {
      await act(() => {
        result.current.logIncorrect();
      });
    }
    for (let i = 0; i < 20; i++) {
      await act(() => {
        result.current.logCorrect();
      });
    }
    expect(result.current.session?.sessionComplete).toBe(false);

    await act(() => {
      setOverlearningPercent(50); // target drops to 6; currentStreak 20 overshoots it
    });

    expect(result.current.session?.sessionComplete).toBe(true);
    expect(result.current.session?.completedTarget).toBe(20); // not 6
  });

  // [Review][Patch] found via code review 2026-09-11: a settings-driven
  // completion previously wrote state directly with no feedback.completion
  // call, unlike logCorrect's own completion tier — a screen-reader user
  // got no announcement at all that their session had just ended.
  it('fires the same completion feedback tier a tap-driven completion would', async () => {
    setOverlearningPercent(300);
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    for (let i = 0; i < 11; i++) {
      await act(() => {
        result.current.logIncorrect();
      });
    }
    for (let i = 0; i < 6; i++) {
      await act(() => {
        result.current.logCorrect();
      });
    }
    expect(result.current.settled).toBe(false);

    await act(() => {
      setOverlearningPercent(50);
    });

    expect(result.current.session?.sessionComplete).toBe(true);
    expect(result.current.settled).toBe(true); // useFeedbackSignal's completion tier fired
  });
});
