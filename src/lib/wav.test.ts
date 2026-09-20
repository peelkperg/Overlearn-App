import { decodeWav, encodeWav, type PcmAudio } from './wav';

function sineWave(freqHz: number, durationMs: number, sampleRate: number): Float32Array {
  const count = Math.round((durationMs / 1000) * sampleRate);
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i += 1) samples[i] = Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
  return samples;
}

describe('lib/wav', () => {
  it('round-trips PCM samples through encode/decode within 16-bit quantization error', () => {
    const audio: PcmAudio = { samples: sineWave(440, 200, 16000), sampleRate: 16000 };
    const decoded = decodeWav(encodeWav(audio));

    expect(decoded.sampleRate).toBe(16000);
    expect(decoded.samples.length).toBe(audio.samples.length);
    for (let i = 0; i < audio.samples.length; i += 1) {
      expect(Math.abs(decoded.samples[i] - audio.samples[i])).toBeLessThan(0.001);
    }
  });

  it('downmixes a stereo WAV to mono by averaging channels', () => {
    // Hand-built two-channel, 16-bit PCM WAV: two frames, L/R interleaved.
    const buffer = new ArrayBuffer(44 + 8);
    const view = new DataView(buffer);
    const writeStr = (offset: number, s: string) => {
      for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + 8, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 2, true); // stereo
    view.setUint32(24, 8000, true);
    view.setUint32(28, 8000 * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, 8, true);
    view.setInt16(44, 0x4000, true); // L frame 1: 0.5
    view.setInt16(46, -0x4000, true); // R frame 1: -0.5
    view.setInt16(48, 0x0000, true); // L frame 2: 0
    view.setInt16(50, 0x0000, true); // R frame 2: 0

    const decoded = decodeWav(new Uint8Array(buffer));
    expect(decoded.sampleRate).toBe(8000);
    expect(decoded.samples.length).toBe(2);
    expect(decoded.samples[0]).toBeCloseTo(0, 2);
    expect(decoded.samples[1]).toBeCloseTo(0, 2);
  });

  it('throws on a non-WAV buffer', () => {
    expect(() => decodeWav(new Uint8Array([1, 2, 3, 4]))).toThrow();
  });
});
