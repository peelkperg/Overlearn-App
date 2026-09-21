// Minimal WAV (16-bit PCM, any channel count on read, mono on write)
// encode/decode — pure TS, no native decode dependency. Both capture
// platforms (voice-capture.ts, voice-capture.web.ts) hand back raw decoded
// PcmAudio directly, not a WAV file — this module exists so a saved trigger
// can be encoded to bytes for base64 storage (storage.ts's string API) and
// decoded back to PcmAudio for matching, with an exact round trip.

export interface PcmAudio {
  samples: Float32Array; // mono, normalized to [-1, 1]
  sampleRate: number;
}

function writeAsciiString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
}

function readAsciiString(view: DataView, offset: number, length: number): string {
  let value = '';
  for (let i = 0; i < length; i += 1) value += String.fromCharCode(view.getUint8(offset + i));
  return value;
}

export function encodeWav({ samples, sampleRate }: PcmAudio): Uint8Array {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAsciiString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAsciiString(view, 8, 'WAVE');
  writeAsciiString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size (PCM)
  view.setUint16(20, 1, true); // PCM format tag
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAsciiString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff), true);
    offset += 2;
  }
  return new Uint8Array(buffer);
}

// Downmixes any channel count to mono by averaging — only 16-bit PCM is
// supported (the only format this project's own encoder and capture
// configuration ever produce; a foreign WAV with a different bit depth was
// never a requirement here).
export function decodeWav(bytes: Uint8Array): PcmAudio {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (readAsciiString(view, 0, 4) !== 'RIFF' || readAsciiString(view, 8, 4) !== 'WAVE') {
    throw new Error('Not a WAV file');
  }

  let offset = 12;
  let sampleRate = 0;
  let numChannels = 1;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= view.byteLength) {
    const chunkId = readAsciiString(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    if (chunkId === 'fmt ') {
      numChannels = view.getUint16(chunkStart + 2, true);
      sampleRate = view.getUint32(chunkStart + 4, true);
      bitsPerSample = view.getUint16(chunkStart + 14, true);
    } else if (chunkId === 'data') {
      dataOffset = chunkStart;
      dataSize = chunkSize;
    }
    offset = chunkStart + chunkSize + (chunkSize % 2); // chunks are word-aligned
  }

  if (dataOffset < 0) throw new Error('WAV file has no data chunk');
  if (bitsPerSample !== 16) throw new Error(`Unsupported WAV bit depth: ${bitsPerSample}`);

  const frameCount = Math.floor(dataSize / 2 / numChannels);
  const samples = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i += 1) {
    let sum = 0;
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sampleOffset = dataOffset + (i * numChannels + channel) * 2;
      sum += view.getInt16(sampleOffset, true) / 0x8000;
    }
    samples[i] = sum / numChannels;
  }
  return { samples, sampleRate };
}
