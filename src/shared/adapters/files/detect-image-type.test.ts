import { describe, expect, it } from 'vitest';
import { detectImageType } from './detect-image-type.js';

const bytes = (...b: number[]) => Uint8Array.from(b);

describe('detectImageType', () => {
  it('recognizes jpeg, png and webp from their first bytes', () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe('image/jpeg');
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe(
      'image/png',
    );
    const webp = new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ');
    expect(detectImageType(webp)).toBe('image/webp');
  });

  it.each([
    ['html', new TextEncoder().encode('<!doctype html><script>')],
    ['pdf', new TextEncoder().encode('%PDF-1.7')],
    ['a RIFF that is not webp', new TextEncoder().encode('RIFF\0\0\0\0WAVEfmt ')],
    ['empty', bytes()],
  ])('rejects %s', (_, input) => {
    expect(detectImageType(input)).toBeNull();
  });
});
