const km = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** 0.354 → "350 m", 1.24 → "1,2 km": meters under 1 km, rounded to 10. */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) return `${Math.max(10, Math.round(distanceKm * 100) * 10)} m`;
  return `${km.format(distanceKm)} km`;
}
