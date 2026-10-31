import { describe, expect, it } from 'vitest';
import { canChange } from './rules';

describe('canChange', () => {
  const start = '2026-11-02T17:00:00.000Z';

  it('allows changes up to exactly 2 hours before', () => {
    expect(canChange(start, new Date('2026-11-02T15:00:00.000Z'))).toBe(true);
  });

  it('closes 2 hours before', () => {
    expect(canChange(start, new Date('2026-11-02T15:01:00.000Z'))).toBe(false);
    expect(canChange(start, new Date('2026-11-02T18:00:00.000Z'))).toBe(false);
  });
});
