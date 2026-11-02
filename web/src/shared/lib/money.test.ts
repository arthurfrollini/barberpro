import { describe, expect, it } from 'vitest';
import { formatBRL, parseBRL } from './money';

describe('formatBRL', () => {
  it('formats cents as reais', () => {
    expect(formatBRL(5000)).toMatch(/^R\$\s50,00$/);
    expect(formatBRL(123456)).toMatch(/^R\$\s1\.234,56$/);
  });
});

describe('parseBRL', () => {
  it.each([
    ['50', 5000],
    ['50,5', 5050],
    ['50,50', 5050],
    ['R$ 1.234,56', 123456],
    ['  35 ', 3500],
    ['0,99', 99],
  ])('reads %s as %i cents', (input, cents) => {
    expect(parseBRL(input)).toBe(cents);
  });

  it.each(['abc', '-5', '', '50,555', '1.2.3', 'R$'])('rejects %j', (input) => {
    expect(parseBRL(input)).toBeNull();
  });
});
