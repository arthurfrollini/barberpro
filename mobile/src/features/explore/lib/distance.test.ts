import { formatDistance } from './distance';

it.each([
  [0.05, '50 m'],
  [0.354, '350 m'],
  [1, '1 km'],
  [1.24, '1,2 km'],
  [9.96, '10 km'],
])('%f km reads %s', (km, text) => {
  expect(formatDistance(km)).toBe(text);
});
