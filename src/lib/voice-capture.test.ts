// SPEC-voice-command-input I/O matrix: "Recording exceeds 2s | User holds
// record past 2s | Auto-stop at 2s; recorded segment used as-is". Only the
// native implementation (voice-capture.ts) is exercised here — its
// captureFor() timing/stop logic is what actually enforces the 2s cap; the
// web implementation (voice-capture.web.ts) enforces the same cap via a
// separate Date.now()-driven audio-callback loop that jsdom cannot drive
// deterministically, so it is not duplicated here.

import { voiceCapture } from '@/lib/voice-capture';

type MockAudioBuffer = { data: number[]; sampleRate: number };

jest.mock('expo-audio', () => {
  const mockStopSpy = jest.fn();
  const mockStartSpy = jest.fn();
  let listener: ((buffer: MockAudioBuffer) => void) | undefined;

  class AudioStream {
    addListener(_event: string, callback: (buffer: MockAudioBuffer) => void) {
      listener = callback;
      return { remove: jest.fn() };
    }
    start() {
      mockStartSpy();
      return Promise.resolve();
    }
    stop() {
      mockStopSpy();
    }
  }

  return {
    AudioModule: { AudioStream },
    requestRecordingPermissionsAsync: () => Promise.resolve({ granted: true, status: 'granted', expires: 'never', canAskAgain: true }),
    __emit: (buffer: MockAudioBuffer) => listener?.(buffer),
    __mockStopSpy: mockStopSpy,
  };
});

describe('lib/voice-capture (native) recordTrigger auto-stop', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('has not stopped the stream just before the 2s cap', async () => {
    const expoAudio = jest.requireMock('expo-audio') as { __emit: (b: MockAudioBuffer) => void; __mockStopSpy: jest.Mock };

    void voiceCapture.recordTrigger();
    await Promise.resolve(); // let stream.start() resolve

    expoAudio.__emit({ data: [0.1, 0.2, 0.3], sampleRate: 16000 });

    jest.advanceTimersByTime(1999);
    await Promise.resolve();

    expect(expoAudio.__mockStopSpy).not.toHaveBeenCalled();
  });

  it('auto-stops at exactly the 2s cap and resolves with the segment captured so far', async () => {
    const expoAudio = jest.requireMock('expo-audio') as { __emit: (b: MockAudioBuffer) => void; __mockStopSpy: jest.Mock };

    const resultPromise = voiceCapture.recordTrigger();
    await Promise.resolve();

    expoAudio.__emit({ data: [0.1, 0.2, 0.3], sampleRate: 16000 });

    jest.advanceTimersByTime(2000);
    const result = await resultPromise;

    expect(expoAudio.__mockStopSpy).toHaveBeenCalledTimes(1);
    const samples = Array.from(result.samples);
    expect(samples).toHaveLength(3);
    [0.1, 0.2, 0.3].forEach((expected, i) => expect(samples[i]).toBeCloseTo(expected, 5));
    expect(result.sampleRate).toBe(16000);
  });
});
