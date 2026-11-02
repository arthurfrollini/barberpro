import { describe, expect, it } from 'vitest';
import { checkImage } from './check-image';

const file = (type: string, bytes: number) => new File([new Uint8Array(bytes)], 'x', { type });

describe('checkImage', () => {
  it('accepts JPEG, PNG and WebP up to 2 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(checkImage(file(type, 2 * 1024 * 1024))).toBeNull();
    }
  });

  it('rejects other types and larger files', () => {
    expect(checkImage(file('image/gif', 10))).toBe('Use uma imagem JPEG, PNG ou WebP.');
    expect(checkImage(file('image/png', 3 * 1024 * 1024))).toBe(
      'A imagem pode ter no máximo 2 MB.',
    );
  });
});
