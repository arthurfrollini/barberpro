import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Error text must stay readable (WCAG AA, 4.5:1) on the base and the sheet backgrounds.
const css = readFileSync(`${process.cwd()}/src/index.css`, 'utf8');
const token = (name: string) => {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(css);
  if (!match) throw new Error(`--${name} not found`);
  return match[1]!;
};

const luminance = (hex: string) => {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe('palette contrast', () => {
  it.each(['background', 'popover'])('error text on --%s is at least 4.5:1', (surface) => {
    expect(contrast(token('destructive'), token(surface))).toBeGreaterThanOrEqual(4.5);
  });

  it('text on a destructive button is at least 4.5:1', () => {
    expect(contrast(token('destructive-foreground'), token('destructive'))).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
