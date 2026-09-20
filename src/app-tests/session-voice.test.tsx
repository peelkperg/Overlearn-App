// SPEC-voice-command-input integration coverage: MicToggle wired into
// ActiveSessionScreen, driving the real useActiveSession().logCorrect/
// logIncorrect the same way the tap buttons do (CAP-1 parity). Colocated
// here rather than in session.test.tsx per index.test.tsx's header comment
// on why app screens are tested outside src/app/.
import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { createSegment } from '@/lib/segments';
import { storage } from '@/lib/storage';
import type { PcmAudio } from '@/lib/wav';
import { bytesToBase64 } from '@/lib/base64';
import { encodeWav } from '@/lib/wav';
import { saveVoiceTriggers } from '@/lib/voice-settings';

import ActiveSessionScreen from '@/app/session/[id]';

// [Review][Patch] MicToggle.tsx stops listening on blur (useFocusEffect),
// not only on unmount — the Stack navigator keeps session/[id].tsx mounted
// while the user is on Settings/voice-triggers, so unmount alone missed
// that case. This mock runs the effect like the real hook does on mount/
// focus, and exposes __triggerBlur so tests can simulate losing focus
// without a real NavigationContainer (this suite renders ActiveSessionScreen
// with no navigation ancestor).
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- inside a jest.mock factory, which is hoisted above any import
  const React = require('react');
  let currentCleanup: (() => void) | undefined;
  return {
    router: { push: jest.fn(), replace: jest.fn() },
    useLocalSearchParams: jest.fn(),
    useFocusEffect: (effect: () => void | (() => void)) => {
      // Deliberately mount-only ([]), not [effect] — this stand-in only
      // needs to run once (the screen starts focused) and expose
      // __triggerBlur to simulate losing focus; MicToggle.tsx's own
      // useFocusEffect call already memoizes its effect with useCallback,
      // so re-running on an `effect` identity change isn't something this
      // mock needs to reproduce.
      React.useEffect(() => {
        const result = effect();
        currentCleanup = typeof result === 'function' ? result : undefined;
        return () => {
          currentCleanup?.();
          currentCleanup = undefined;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
    },
    __triggerBlur: () => currentCleanup?.(),
  };
});
jest.mock('@/lib/voice-capture');

const useLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams as jest.Mock;
const triggerBlur = () => (jest.requireMock('expo-router').__triggerBlur as () => void)();
const voiceCaptureMock = jest.requireMock('@/lib/voice-capture') as typeof import('@/lib/__mocks__/voice-capture');

function tone(freqHz: number, durationMs: number, sampleRate = 16000, amplitude = 0.8): PcmAudio {
  const count = Math.round((durationMs / 1000) * sampleRate);
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i += 1) samples[i] = amplitude * Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
  return { samples, sampleRate };
}

const wake = () => tone(300, 400);
const correct = () => tone(600, 400);
const incorrect = () => tone(1000, 400);

// The matcher's MFCC extraction (voice-matcher.ts) is a hand-written O(n^2)
// DFT — each of this file's tests builds a VoiceMatcher (3 templates) and
// feeds 1-2 live windows through it, which is close enough to Jest's 5s
// default under this environment's CPU to occasionally miss it. Real-device
// performance is untested; see spec-voice-command-input.md's Implementation
// Notes for this risk.
jest.setTimeout(20000);

function saveSyntheticTriggerSet() {
  const encode = (pcm: PcmAudio) => bytesToBase64(encodeWav(pcm));
  saveVoiceTriggers({ wake: encode(wake()), correct: encode(correct()), incorrect: encode(incorrect()) });
}

describe('ActiveSessionScreen voice commands [SPEC-voice-command-input, CAP-1, CAP-2]', () => {
  beforeEach(() => {
    storage.clearAll();
    (router.replace as jest.Mock).mockClear();
    voiceCaptureMock.__reset();
  });

  it('is off by default and disabled until a trigger set is saved (CAP-2)', async () => {
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    const toggle = view.getByTestId('mic-toggle');
    expect(toggle.props.accessibilityState.selected).toBe(false);
    expect(toggle.props.accessibilityState.disabled).toBe(true); // no saved triggers yet
  });

  it('wake-then-correct updates counters identically to tapping Correct (CAP-1 success)', async () => {
    saveSyntheticTriggerSet();
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    await act(async () => {
      fireEvent.press(view.getByTestId('mic-toggle'));
    });
    expect(view.getByTestId('mic-toggle').props.accessibilityState.selected).toBe(true);
    expect(voiceCaptureMock.__isListening()).toBe(true);

    await act(async () => {
      voiceCaptureMock.__emitWindow(wake());
    });
    expect(view.getByTestId('streak-readout').props.children[0]).toBe(0); // wake alone changes nothing

    await act(async () => {
      voiceCaptureMock.__emitWindow(correct());
    });
    expect(view.getByTestId('streak-readout').props.children[0]).toBe(1);
  });

  it('wake-then-incorrect calls the same logIncorrect path as tapping Incorrect', async () => {
    saveSyntheticTriggerSet();
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    await act(async () => {
      fireEvent.press(view.getByTestId('mic-toggle'));
    });
    await act(async () => {
      voiceCaptureMock.__emitWindow(wake());
    });
    await act(async () => {
      voiceCaptureMock.__emitWindow(incorrect());
    });

    const readout = view.getByTestId('streak-readout');
    expect(readout.props.children[0]).toBe(0); // streak reset by Incorrect, same as a tap
  });

  it('a Correct/Incorrect trigger with no preceding wake never fires (Constraints, wake-gating always on)', async () => {
    saveSyntheticTriggerSet();
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    await act(async () => {
      fireEvent.press(view.getByTestId('mic-toggle'));
    });
    await act(async () => {
      voiceCaptureMock.__emitWindow(correct());
    });

    expect(view.getByTestId('streak-readout').props.children[0]).toBe(0);
  });

  it('emits nothing while the toggle is off — zero capture (CAP-2)', async () => {
    saveSyntheticTriggerSet();
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    // Mic toggle never pressed — startListening was never called, so the
    // mock's onWindow handler is unset and __emitWindow is a no-op.
    voiceCaptureMock.__emitWindow(wake());
    voiceCaptureMock.__emitWindow(correct());

    expect(view.getByTestId('streak-readout').props.children[0]).toBe(0);
  });

  it('reverts to off and surfaces denial when the OS denies mic permission (I/O matrix)', async () => {
    saveSyntheticTriggerSet();
    voiceCaptureMock.__setPermissionResult('denied');
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    await act(async () => {
      fireEvent.press(view.getByTestId('mic-toggle'));
    });

    expect(view.getByTestId('mic-toggle').props.accessibilityState.selected).toBe(false);
    expect(view.getByTestId('mic-permission-denied')).toBeTruthy();
    expect(voiceCaptureMock.__isListening()).toBe(false);
  });

  it('stops listening when the toggle is turned back off', async () => {
    saveSyntheticTriggerSet();
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    await act(async () => {
      fireEvent.press(view.getByTestId('mic-toggle'));
    });
    expect(voiceCaptureMock.__isListening()).toBe(true);

    await act(async () => {
      fireEvent.press(view.getByTestId('mic-toggle'));
    });
    expect(voiceCaptureMock.__isListening()).toBe(false);
    expect(view.getByTestId('mic-toggle').props.accessibilityState.selected).toBe(false);
  });

  it('stops listening when the screen loses focus, without unmounting (e.g. navigating to Settings)', async () => {
    saveSyntheticTriggerSet();
    const segment = createSegment('Bar 24 arpeggio');
    useLocalSearchParams.mockReturnValue({ id: segment.id });
    const view = await render(<ActiveSessionScreen />);

    await act(async () => {
      fireEvent.press(view.getByTestId('mic-toggle'));
    });
    expect(voiceCaptureMock.__isListening()).toBe(true);

    await act(async () => {
      triggerBlur();
    });
    expect(voiceCaptureMock.__isListening()).toBe(false);
  });
});
