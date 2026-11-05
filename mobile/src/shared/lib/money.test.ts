import { formatBRL, formatDuration } from './money';

describe('formatBRL', () => {
  it('formats cents as reais', () => {
    expect(formatBRL(5000)).toMatch(/^R\$\s50,00$/);
    expect(formatBRL(123456)).toMatch(/^R\$\s1\.234,56$/);
  });
});

describe('formatDuration', () => {
  it.each([
    [30, '30 min'],
    [60, '1 h'],
    [75, '1 h 15 min'],
    [480, '8 h'],
  ])('%i minutes reads %s', (minutes, text) => {
    expect(formatDuration(minutes)).toBe(text);
  });
});
