import { colors } from './theme';

const luminance = (hex: string) => {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

// WCAG AA for body text (4.5:1) on every surface text sits on.
describe('palette contrast', () => {
  it.each(['ground', 'bar', 'raised'] as const)('text, muted and error read on %s', (surface) => {
    for (const fg of [colors.text, colors.muted, colors.error]) {
      expect(contrast(fg, colors[surface])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('text on the accent reads', () => {
    expect(contrast(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('the accent reads as text on the ground and the bars', () => {
    expect(contrast(colors.accent, colors.ground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.accent, colors.bar)).toBeGreaterThanOrEqual(4.5);
  });
});
