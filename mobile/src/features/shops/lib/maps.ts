import { Platform } from 'react-native';

type Place = { name: string; latitude: number; longitude: number };

/** The phone's own maps app: Apple Maps on iOS, Google Maps elsewhere (web included). */
export function mapsUrl(place: Place, os: string = Platform.OS): string {
  const at = `${place.latitude},${place.longitude}`;
  return os === 'ios'
    ? `https://maps.apple.com/?q=${encodeURIComponent(place.name)}&ll=${at}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(at)}`;
}
