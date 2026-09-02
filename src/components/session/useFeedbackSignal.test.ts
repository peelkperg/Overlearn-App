import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, Vibration } from 'react-native';

import { useFeedbackSignal } from './useFeedbackSignal';

describe('useFeedbackSignal [Review][Patch]', () => {
  it('reset() clears settled, incorrectPulse, and targetRaiseFlash', async () => {
    const { result } = await renderHook(() => useFeedbackSignal());

    await act(() => {
      result.current.completion('Session complete.');
      result.current.mild();
      result.current.alert('Target raised to 6');
    });
    expect(result.current.settled).toBe(true);
    expect(result.current.incorrectPulse).toBe(true);
    expect(result.current.targetRaiseFlash).toBe(true);

    await act(() => {
      result.current.reset();
    });

    expect(result.current.settled).toBe(false);
    expect(result.current.incorrectPulse).toBe(false);
    expect(result.current.targetRaiseFlash).toBe(false);
  });

  it('clears pending timers on unmount without throwing', async () => {
    const { result, unmount } = await renderHook(() => useFeedbackSignal());

    await act(() => {
      result.current.mild();
      result.current.alert('Target raised to 6');
    });

    // The pulse/flash timers are still pending at this point; unmounting
    // must cancel them rather than let them fire setState on a gone hook.
    expect(() => unmount()).not.toThrow();
  });

  it('does not throw when Vibration.vibrate or the accessibility announcement throws', async () => {
    jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {
      throw new Error('no vibration motor');
    });
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {
      throw new Error('accessibility service unavailable');
    });

    const { result } = await renderHook(() => useFeedbackSignal());

    await expect(
      act(() => {
        result.current.alert('Target raised to 6');
      }),
    ).resolves.not.toThrow();

    jest.restoreAllMocks();
  });
});
