import { useEffect, useState } from 'react';

/** The current time, refreshed every 30 seconds: enough for a "now" line and the 2-hour rule. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
