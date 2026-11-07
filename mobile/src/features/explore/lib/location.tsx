import * as Location from 'expo-location';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

export type Coords = { latitude: number; longitude: number };

/** Where the phone is. The real one asks the OS; tests pass their own. */
export type LocationSource = {
  /** Asks for foreground permission; true when granted. */
  request(): Promise<boolean>;
  current(): Promise<Coords>;
};

export const deviceLocation: LocationSource = {
  async request() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },
  async current() {
    // a recent fix answers at once; a fresh one can take seconds
    const known = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
    const position =
      known ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  },
};

const LocationContext = createContext<LocationSource>(deviceLocation);

export function LocationProvider({
  source,
  children,
}: {
  source: LocationSource;
  children: ReactNode;
}) {
  return <LocationContext value={source}>{children}</LocationContext>;
}

export type LocationState =
  | { status: 'asking' }
  | { status: 'denied' }
  | { status: 'unavailable' }
  | { status: 'granted'; coords: Coords };

/** A position that takes longer than this counts as unavailable. */
export const LOCATION_TIMEOUT_MS = 10_000;

async function withDeadline<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('no position in time')), LOCATION_TIMEOUT_MS);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/** Asks once, when the screen opens; a refusal or a failure leaves search to the user. */
export function useLocation(): LocationState {
  const source = use(LocationContext);
  const [state, setState] = useState<LocationState>({ status: 'asking' });
  useEffect(() => {
    let live = true;
    void (async () => {
      let next: LocationState;
      try {
        next = (await source.request())
          ? { status: 'granted', coords: await withDeadline(source.current()) }
          : { status: 'denied' };
      } catch {
        next = { status: 'unavailable' };
      }
      if (live) setState(next);
    })();
    return () => {
      live = false;
    };
  }, [source]);
  return state;
}
