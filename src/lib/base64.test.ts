import { base64ToBytes, bytesToBase64 } from './base64';

describe('lib/base64', () => {
  it('round-trips arbitrary byte sequences of every length-mod-3 remainder', () => {
    for (const bytes of [[], [1], [1, 2], [1, 2, 3], [255, 0, 128, 64, 32], [0, 0, 0, 0]]) {
      const input = new Uint8Array(bytes);
      expect(Array.from(base64ToBytes(bytesToBase64(input)))).toEqual(bytes);
    }
  });
});
