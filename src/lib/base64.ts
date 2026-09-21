// Pure-TS base64, no Buffer/atob dependency — Buffer isn't globally
// available under Hermes (RN runtime) and atob/btoa aren't available on
// native either, only on web. storage.ts's string API is the only
// persistence path (Boundaries: "no raw buffers"), so trigger audio must
// round-trip through this before every write/read.

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const triplet = (b0 << 16) | ((b1 ?? 0) << 8) | (b2 ?? 0);
    result += CHARS[(triplet >> 18) & 63];
    result += CHARS[(triplet >> 12) & 63];
    result += i + 1 < bytes.length ? CHARS[(triplet >> 6) & 63] : '=';
    result += i + 2 < bytes.length ? CHARS[triplet & 63] : '=';
  }
  return result;
}

export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/=+$/, '');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i += 1) {
    const value = CHARS.indexOf(clean[i]);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}
