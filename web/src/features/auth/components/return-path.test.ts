import { describe, expect, it } from 'vitest';
import { returnPath } from './return-path';

const from = (voltar: string) => returnPath(new URLSearchParams({ voltar }));

describe('returnPath', () => {
  it('keeps paths inside the app', () => {
    expect(from('/agenda?dia=2026-11-02')).toBe('/agenda?dia=2026-11-02');
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'agenda'])(
    'falls back to / for %s',
    (target) => {
      expect(from(target)).toBe('/');
    },
  );
});
