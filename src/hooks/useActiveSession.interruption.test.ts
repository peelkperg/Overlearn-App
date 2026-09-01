import { act, renderHook } from '@testing-library/react-native';

import { getObject, storage } from '@/lib/storage';
import type { SessionState } from '@/lib/types';

import { useActiveSession } from './useActiveSession';

const SESSION_KEY = 'session.active';

// Story 2.9: verifies the interruption-survival guarantee (FR23, NFR3) —
// not new persistence logic (that's foundational since Story 2.1), but
// confirmation that every tap's synchronous write actually lands in MMKV
// with the full session state, for any combination of the five fields.
// Reads storage directly (bypassing React state / useActiveSession
// entirely) to simulate "the app was just killed" as closely as a unit
// test can — a genuinely fresh read, not a second render of the same hook.
describe('useActiveSession interruption survival [Story 2.9]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  function readPersistedSession(): SessionState | undefined {
    return getObject<SessionState>(SESSION_KEY);
  }

  it('persists full state after every tap across a mixed sequence', async () => {
    const { result } = await renderHook(() => useActiveSession());

    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    expect(readPersistedSession()).toEqual(result.current.session);

    await act(() => {
      result.current.logCorrect();
    });
    expect(readPersistedSession()).toEqual(result.current.session);

    await act(() => {
      result.current.logIncorrect();
    });
    expect(readPersistedSession()).toEqual(result.current.session);

    // Drive total_incorrect_this_session past the 10/11 boundary — the
    // riskiest state combination per R1 — verifying persistence at each step.
    for (let i = 0; i < 10; i++) {
      await act(() => {
        result.current.logIncorrect();
      });
      expect(readPersistedSession()).toEqual(result.current.session);
    }

    // Drive to completion; session_complete must persist synchronously in
    // the same write as the triggering current_streak update (Story 2.5).
    for (let i = 0; i < 6; i++) {
      await act(() => {
        result.current.logCorrect();
      });
      expect(readPersistedSession()).toEqual(result.current.session);
    }
    expect(readPersistedSession()?.sessionComplete).toBe(true);
  });

  it('persists the full state after Restart', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    await act(() => {
      result.current.logCorrect();
    });
    await act(() => {
      result.current.logIncorrect();
    });

    await act(() => {
      result.current.restart();
    });

    expect(readPersistedSession()).toEqual(result.current.session);
  });

  it('a fresh hook instance (simulated relaunch) reconstructs the exact same state', async () => {
    const { result } = await renderHook(() => useActiveSession());
    await act(() => {
      result.current.start('segment-1', 'Bar 24 arpeggio');
    });
    for (let i = 0; i < 3; i++) {
      await act(() => {
        result.current.logCorrect();
      });
    }
    await act(() => {
      result.current.logIncorrect();
    });

    const persisted = readPersistedSession();
    const { result: relaunched } = await renderHook(() => useActiveSession());

    expect(relaunched.current.session).toEqual(persisted);
    expect(relaunched.current.targetStreak).toBe(result.current.targetStreak);
  });
});
