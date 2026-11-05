import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useApi } from '@/shared/api';
import { fetchNearby, searchShops } from '../api/explore';
import type { Coords } from '../lib/location';

/** Shops within 10 km; `coords` rounded so a jittery fix does not refetch. */
export function useNearby(coords: Coords | null) {
  const api = useApi();
  const key = coords && [coords.latitude.toFixed(3), coords.longitude.toFixed(3)];
  return useQuery({
    queryKey: ['shops', 'nearby', key],
    queryFn: () => fetchNearby(api, coords!),
    enabled: coords !== null,
  });
}

export const MIN_SEARCH = 2;

/** Typo-tolerant search by name, 300 ms after the user stops typing. */
export function useSearch(text: string) {
  const api = useApi();
  const query = useDebounced(text.trim(), 300);
  return useQuery({
    queryKey: ['shops', 'search', query],
    queryFn: () => searchShops(api, query),
    enabled: query.length >= MIN_SEARCH,
    placeholderData: keepPreviousData,
  });
}

function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}
