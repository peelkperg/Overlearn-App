// SPEC-voice-command-input CAP-1/CAP-3. On-device DTW-over-MFCC matching,
// hand-written pure TS per stack.md ("no library... runs on a decoded PCM
// buffer, so it's identical on both platforms; only capture is
// platform-specific"). Wake-word gating is always on in this scope
// (spec-voice-command-input.md's Spec Change Log deferred CAP-4's ON/OFF
// toggle) — VoiceMatcher below is stack.md's "Wake-word ON" two-state mode
// only.

import type { PcmAudio } from '@/lib/wav';

const FRAME_MS = 25;
const HOP_MS = 10;
const NUM_MEL_FILTERS = 26;
const NUM_MFCC = 13;

// Tuned against this file's own synthetic fixtures (voice-matcher.test.ts) —
// real human-recorded takes were not available to calibrate against in this
// environment. Both constants are pure engineering judgment, not a spec
// value; a real-device manual pass (Verification's manual-checks item) is
// required before these are trusted as-is. See Implementation Notes in
// spec-voice-command-input.md.
export const DTW_MATCH_THRESHOLD = 40;
// [Review][Patch] must stay above DTW_MATCH_THRESHOLD (2x it, not just >):
// this is the pairwise distance two *saved templates* must clear, while
// DTW_MATCH_THRESHOLD is how close a *live sample* must land to a template
// to count as a match. If this were below (or only marginally above)
// DTW_MATCH_THRESHOLD, two templates could each individually pass
// checkDistinguishability yet still both be within DTW_MATCH_THRESHOLD of
// some live sample in between them — an ambiguous match at runtime despite
// a "distinguishable" save-time verdict.
export const DISTINGUISHABILITY_MIN_DISTANCE = DTW_MATCH_THRESHOLD * 2;

function hammingWindow(size: number): Float64Array {
  const window = new Float64Array(size);
  for (let i = 0; i < size; i += 1) {
    window[i] = size === 1 ? 1 : 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (size - 1));
  }
  return window;
}

// cos(2*pi*k*t/n) depends only on (k*t) mod n, so a length-n table (built
// once per frame size, not per frame — every frame in a call shares the
// same n) replaces up to half*n individual Math.cos/sin calls with array
// lookups. [Perf] found while implementing: the original per-sample
// Math.cos/sin calls made a single extractMfcc() call on a 400ms clip take
// several seconds under Jest, which would block the JS thread for a
// perceptible, possibly unacceptable stretch on a real device during
// continuous listening — see Implementation Notes for why this remains a
// flagged risk even after this optimization (still O(n^2) overall, just
// with a smaller constant).
function trigTables(n: number): { cos: Float64Array; sin: Float64Array } {
  const cos = new Float64Array(n);
  const sin = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    const angle = (-2 * Math.PI * i) / n;
    cos[i] = Math.cos(angle);
    sin[i] = Math.sin(angle);
  }
  return { cos, sin };
}

// Naive O(n^2) DFT magnitude-squared spectrum. Frames are short (a few
// hundred samples at typical trigger sample rates) and clips are capped at
// 2s (Boundaries), so this stays algorithmically simple without pulling in
// an FFT dependency — stack.md's "no library" applies to the whole matching
// engine, not only DTW.
function powerSpectrum(frame: Float64Array, tables: { cos: Float64Array; sin: Float64Array }): Float64Array {
  const n = frame.length;
  const half = Math.floor(n / 2) + 1;
  const power = new Float64Array(half);
  for (let k = 0; k < half; k += 1) {
    let re = 0;
    let im = 0;
    for (let t = 0; t < n; t += 1) {
      const index = (k * t) % n;
      re += frame[t] * tables.cos[index];
      im += frame[t] * tables.sin[index];
    }
    power[k] = (re * re + im * im) / n;
  }
  return power;
}

function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

function melToHz(mel: number): number {
  return 700 * (10 ** (mel / 2595) - 1);
}

function melFilterbank(numFilters: number, frameSize: number, sampleRate: number): Float64Array[] {
  const nyquist = sampleRate / 2;
  const melMax = hzToMel(nyquist);
  const melPoints = Array.from({ length: numFilters + 2 }, (_, i) => (i * melMax) / (numFilters + 1));
  const hzPoints = melPoints.map(melToHz);
  const half = Math.floor(frameSize / 2) + 1;
  const bins = hzPoints.map((hz) => Math.floor(((frameSize + 1) * hz) / sampleRate));

  const filters: Float64Array[] = [];
  for (let m = 1; m <= numFilters; m += 1) {
    const filter = new Float64Array(half);
    const left = bins[m - 1];
    const center = bins[m];
    const right = bins[m + 1];
    for (let k = left; k < center; k += 1) {
      if (k >= 0 && k < half && center > left) filter[k] = (k - left) / (center - left);
    }
    for (let k = center; k < right; k += 1) {
      if (k >= 0 && k < half && right > center) filter[k] = (right - k) / (right - center);
    }
    filters.push(filter);
  }
  return filters;
}

function dct(input: Float64Array, numCoeffs: number): number[] {
  const n = input.length;
  const output: number[] = [];
  for (let k = 0; k < numCoeffs; k += 1) {
    let sum = 0;
    for (let i = 0; i < n; i += 1) {
      sum += input[i] * Math.cos((Math.PI / n) * (i + 0.5) * k);
    }
    output.push(sum);
  }
  return output;
}

// Frames -> MFCC coefficient vectors. Returns [] for audio shorter than one
// frame (e.g. a zero-length capture failure) rather than throwing — callers
// (dtwDistance) already treat an empty sequence as "no match, maximal
// distance".
export function extractMfcc(audio: PcmAudio): number[][] {
  const { samples, sampleRate } = audio;
  const frameSize = Math.round((FRAME_MS / 1000) * sampleRate);
  const hopSize = Math.round((HOP_MS / 1000) * sampleRate);
  if (frameSize <= 1 || samples.length < frameSize) return [];

  const window = hammingWindow(frameSize);
  const filters = melFilterbank(NUM_MEL_FILTERS, frameSize, sampleRate);
  const tables = trigTables(frameSize);
  const frames: number[][] = [];

  for (let start = 0; start + frameSize <= samples.length; start += hopSize) {
    const frame = new Float64Array(frameSize);
    for (let i = 0; i < frameSize; i += 1) frame[i] = samples[start + i] * window[i];
    const power = powerSpectrum(frame, tables);

    const melEnergies = new Float64Array(NUM_MEL_FILTERS);
    for (let m = 0; m < NUM_MEL_FILTERS; m += 1) {
      let sum = 0;
      const filter = filters[m];
      for (let k = 0; k < filter.length; k += 1) sum += filter[k] * power[k];
      melEnergies[m] = Math.log(sum + 1e-10);
    }
    frames.push(dct(melEnergies, NUM_MFCC));
  }
  return frames;
}

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Standard DTW over the two MFCC-frame sequences, normalized by the warping
// path's length so the result is comparable across recordings of different
// duration (a live window is rarely the same length as its template).
export function dtwDistance(a: number[][], b: number[][]): number {
  if (a.length === 0 || b.length === 0) return Infinity;

  const n = a.length;
  const m = b.length;
  const cost: number[] = new Array((n + 1) * (m + 1)).fill(Infinity);
  const pathLength: number[] = new Array((n + 1) * (m + 1)).fill(0);
  const at = (i: number, j: number) => i * (m + 1) + j;
  cost[at(0, 0)] = 0;

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const d = euclidean(a[i - 1], b[j - 1]);
      const candidates: [number, number][] = [
        [cost[at(i - 1, j)], pathLength[at(i - 1, j)]],
        [cost[at(i, j - 1)], pathLength[at(i, j - 1)]],
        [cost[at(i - 1, j - 1)], pathLength[at(i - 1, j - 1)]],
      ];
      let best = candidates[0];
      for (const candidate of candidates) if (candidate[0] < best[0]) best = candidate;
      cost[at(i, j)] = d + best[0];
      pathLength[at(i, j)] = best[1] + 1;
    }
  }

  const finalPathLength = pathLength[at(n, m)] || 1;
  return cost[at(n, m)] / finalPathLength;
}

export type TriggerName = 'wake' | 'correct' | 'incorrect';

export interface VoiceTemplates {
  wake: PcmAudio;
  correct: PcmAudio;
  incorrect: PcmAudio;
}

export function matchesTemplate(window: PcmAudio, template: PcmAudio): boolean {
  return dtwDistance(extractMfcc(window), extractMfcc(template)) < DTW_MATCH_THRESHOLD;
}

export interface DistinguishabilityResult {
  ok: boolean;
  tooSimilarPairs: [TriggerName, TriggerName][];
}

// CAP-3: pairwise DTW distance across the three saved templates, same
// DTW/MFCC pipeline as the runtime match check (stack.md: "the same DTW
// distance computed pairwise between the three saved templates") but
// against a wider separation threshold — two templates can each be
// individually recognizable yet still too close to reliably distinguish
// from one another live.
export function checkDistinguishability(templates: VoiceTemplates): DistinguishabilityResult {
  const mfcc = {
    wake: extractMfcc(templates.wake),
    correct: extractMfcc(templates.correct),
    incorrect: extractMfcc(templates.incorrect),
  };
  const pairs: [TriggerName, TriggerName][] = [
    ['wake', 'correct'],
    ['wake', 'incorrect'],
    ['correct', 'incorrect'],
  ];
  const tooSimilarPairs = pairs.filter(([a, b]) => dtwDistance(mfcc[a], mfcc[b]) < DISTINGUISHABILITY_MIN_DISTANCE);
  return { ok: tooSimilarPairs.length === 0, tooSimilarPairs };
}

export type MatcherState = 'LISTENING_FOR_WAKE' | 'AWAITING_COMMAND';

// Bounded window (I/O matrix: "reverts on timeout") the command must arrive
// within after a wake match. Same engineering-judgment caveat as the match
// thresholds above — no spec value exists for this duration.
export const COMMAND_WINDOW_MS = 4000;

// Wake-then-command state machine (CAP-1). One instance per active
// listening session (constructed fresh in MicToggle.tsx's start()) so a
// prior session's state never leaks into the next.
export class VoiceMatcher {
  private state: MatcherState = 'LISTENING_FOR_WAKE';
  private awaitingSince = 0;
  private readonly templateMfcc: { wake: number[][]; correct: number[][]; incorrect: number[][] };
  private readonly commandWindowMs: number;

  constructor(templates: VoiceTemplates, commandWindowMs: number = COMMAND_WINDOW_MS) {
    this.templateMfcc = {
      wake: extractMfcc(templates.wake),
      correct: extractMfcc(templates.correct),
      incorrect: extractMfcc(templates.incorrect),
    };
    this.commandWindowMs = commandWindowMs;
  }

  getState(): MatcherState {
    return this.state;
  }

  reset(): void {
    this.state = 'LISTENING_FOR_WAKE';
  }

  // Feeds one live audio window through the matcher. `now` is an injected
  // clock (ms), not Date.now(), so tests can drive the AWAITING_COMMAND
  // timeout deterministically.
  processWindow(window: PcmAudio, now: number): 'correct' | 'incorrect' | null {
    const windowMfcc = extractMfcc(window);

    if (this.state === 'LISTENING_FOR_WAKE') {
      if (dtwDistance(windowMfcc, this.templateMfcc.wake) < DTW_MATCH_THRESHOLD) {
        this.state = 'AWAITING_COMMAND';
        this.awaitingSince = now;
      }
      return null;
    }

    // AWAITING_COMMAND
    if (now - this.awaitingSince > this.commandWindowMs) {
      this.state = 'LISTENING_FOR_WAKE';
      return null;
    }

    const correctDistance = dtwDistance(windowMfcc, this.templateMfcc.correct);
    const incorrectDistance = dtwDistance(windowMfcc, this.templateMfcc.incorrect);
    const correctMatches = correctDistance < DTW_MATCH_THRESHOLD;
    const incorrectMatches = incorrectDistance < DTW_MATCH_THRESHOLD;

    if (correctMatches && (!incorrectMatches || correctDistance <= incorrectDistance)) {
      this.state = 'LISTENING_FOR_WAKE';
      return 'correct';
    }
    if (incorrectMatches) {
      this.state = 'LISTENING_FOR_WAKE';
      return 'incorrect';
    }
    return null; // ambient noise (I/O matrix) — stays in AWAITING_COMMAND
  }
}
