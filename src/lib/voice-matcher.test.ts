import {
  checkDistinguishability,
  dtwDistance,
  extractMfcc,
  matchesTemplate,
  VoiceMatcher,
  type VoiceTemplates,
} from './voice-matcher';
import type { PcmAudio } from './wav';

const SAMPLE_RATE = 16000;

// Synthetic fixtures stand in for the recorded-audio fixtures Verification
// calls for — this environment has no way to record or ship real audio
// files. Pure tones at well-separated frequencies exercise the MFCC/DTW
// pipeline's actual spectral-shape comparison (not just amplitude), while
// staying fully deterministic across runs and platforms.
function tone(freqHz: number, durationMs: number, sampleRate = SAMPLE_RATE, amplitude = 0.8): PcmAudio {
  const count = Math.round((durationMs / 1000) * sampleRate);
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i += 1) samples[i] = amplitude * Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
  return { samples, sampleRate };
}

// Deterministic pseudo-random noise (LCG) — stands in for ambient
// instrument/room noise in the I/O matrix's "Ambient noise" row. Not
// Math.random(): superpowers/CLAUDE.md's flaky-test prohibition rules out
// non-deterministic fixtures.
function noise(durationMs: number, sampleRate = SAMPLE_RATE, seed = 1): PcmAudio {
  let state = seed;
  const next = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return (state / 0x7fffffff) * 2 - 1;
  };
  const count = Math.round((durationMs / 1000) * sampleRate);
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i += 1) samples[i] = next() * 0.4;
  return { samples, sampleRate };
}

const wakeTone = () => tone(300, 400);
const correctTone = () => tone(600, 400);
const incorrectTone = () => tone(1000, 400);

describe('lib/voice-matcher', () => {
  describe('extractMfcc', () => {
    it('returns one 13-coefficient vector per frame for audio at least one frame long', () => {
      const frames = extractMfcc(tone(440, 200));
      expect(frames.length).toBeGreaterThan(0);
      for (const frame of frames) expect(frame).toHaveLength(13);
    });

    it('returns no frames for audio shorter than a single frame', () => {
      expect(extractMfcc({ samples: new Float32Array(10), sampleRate: SAMPLE_RATE })).toEqual([]);
    });
  });

  describe('dtwDistance', () => {
    it('is ~0 between a signal and itself', () => {
      const mfcc = extractMfcc(wakeTone());
      expect(dtwDistance(mfcc, mfcc)).toBeLessThan(1);
    });

    it('is Infinity when either sequence is empty', () => {
      expect(dtwDistance([], extractMfcc(wakeTone()))).toBe(Infinity);
    });

    it('is much larger between clearly different-frequency tones than between near-identical takes', () => {
      const a = extractMfcc(tone(300, 400));
      const aAgain = extractMfcc(tone(300, 380)); // slightly shorter take, same sound
      const b = extractMfcc(tone(1000, 400));

      const sameSound = dtwDistance(a, aAgain);
      const differentSound = dtwDistance(a, b);
      expect(differentSound).toBeGreaterThan(sameSound * 5);
    });
  });

  describe('matchesTemplate / checkDistinguishability', () => {
    it('matches a near-identical take of the same recorded sound', () => {
      const template = wakeTone();
      const liveWindow = tone(300, 380); // same frequency, slightly different duration
      expect(matchesTemplate(liveWindow, template)).toBe(true);
    });

    it('does not match a different recorded sound', () => {
      expect(matchesTemplate(correctTone(), wakeTone())).toBe(false);
    });

    it('does not match ambient noise against any template', () => {
      expect(matchesTemplate(noise(400), wakeTone())).toBe(false);
    });

    it('accepts a well-separated three-trigger set (CAP-3 success path)', () => {
      const templates: VoiceTemplates = { wake: wakeTone(), correct: correctTone(), incorrect: incorrectTone() };
      const result = checkDistinguishability(templates);
      expect(result.ok).toBe(true);
      expect(result.tooSimilarPairs).toEqual([]);
    });

    it('blocks a set where two recordings are acoustically too similar (CAP-3 I/O matrix)', () => {
      // wake and correct recorded as (near enough) the same sound.
      const templates: VoiceTemplates = { wake: tone(300, 400), correct: tone(300, 410), incorrect: incorrectTone() };
      const result = checkDistinguishability(templates);
      expect(result.ok).toBe(false);
      expect(result.tooSimilarPairs).toContainEqual(['wake', 'correct']);
    });
  });

  describe('VoiceMatcher', () => {
    const templates: VoiceTemplates = { wake: wakeTone(), correct: correctTone(), incorrect: incorrectTone() };

    it('wake-then-command happy path: fires correct after wake, then re-arms for the next wake (I/O matrix)', () => {
      const matcher = new VoiceMatcher(templates);
      expect(matcher.getState()).toBe('LISTENING_FOR_WAKE');

      expect(matcher.processWindow(tone(300, 380), 0)).toBeNull();
      expect(matcher.getState()).toBe('AWAITING_COMMAND');

      expect(matcher.processWindow(tone(600, 380), 100)).toBe('correct');
      expect(matcher.getState()).toBe('LISTENING_FOR_WAKE');
    });

    it('recognizes incorrect the same way as correct once armed', () => {
      const matcher = new VoiceMatcher(templates);
      matcher.processWindow(tone(300, 380), 0);
      expect(matcher.processWindow(tone(1000, 380), 100)).toBe('incorrect');
    });

    it('never fires on a Correct/Incorrect trigger heard without a preceding wake (Constraints)', () => {
      const matcher = new VoiceMatcher(templates);
      expect(matcher.processWindow(tone(600, 380), 0)).toBeNull();
      expect(matcher.getState()).toBe('LISTENING_FOR_WAKE');
    });

    it('ignores ambient noise while listening for wake (I/O matrix)', () => {
      const matcher = new VoiceMatcher(templates);
      expect(matcher.processWindow(noise(400), 0)).toBeNull();
      expect(matcher.getState()).toBe('LISTENING_FOR_WAKE');
    });

    it('ignores ambient noise while awaiting a command, staying armed', () => {
      const matcher = new VoiceMatcher(templates);
      matcher.processWindow(tone(300, 380), 0);
      expect(matcher.processWindow(noise(400), 100)).toBeNull();
      expect(matcher.getState()).toBe('AWAITING_COMMAND');
    });

    it('reverts to LISTENING_FOR_WAKE once the command window elapses (I/O matrix: reverts on timeout)', () => {
      const matcher = new VoiceMatcher(templates, 1000);
      matcher.processWindow(tone(300, 380), 0);
      expect(matcher.getState()).toBe('AWAITING_COMMAND');

      expect(matcher.processWindow(tone(600, 380), 2000)).toBeNull(); // arrives after the 1000ms window
      expect(matcher.getState()).toBe('LISTENING_FOR_WAKE');
    });

    it('reset() forces LISTENING_FOR_WAKE regardless of prior state', () => {
      const matcher = new VoiceMatcher(templates);
      matcher.processWindow(tone(300, 380), 0);
      expect(matcher.getState()).toBe('AWAITING_COMMAND');
      matcher.reset();
      expect(matcher.getState()).toBe('LISTENING_FOR_WAKE');
    });
  });
});
