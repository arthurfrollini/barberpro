import { initials } from './thumb';

it.each([
  ['Navalha de Ouro', 'NO'],
  ['José Almeida', 'JA'],
  ['barba', 'B'],
  ['Corte e Cia', 'CC'],
])('%s → %s', (name, expected) => {
  expect(initials(name)).toBe(expected);
});
