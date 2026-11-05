import { mapsUrl } from './maps';

const place = { name: 'Navalha de Ouro', latitude: -23.5614, longitude: -46.6559 };

it('opens Apple Maps on iOS and Google Maps elsewhere', () => {
  expect(mapsUrl(place, 'ios')).toBe(
    'https://maps.apple.com/?q=Navalha%20de%20Ouro&ll=-23.5614,-46.6559',
  );
  expect(mapsUrl(place, 'android')).toBe(
    'https://www.google.com/maps/search/?api=1&query=-23.5614%2C-46.6559',
  );
});
