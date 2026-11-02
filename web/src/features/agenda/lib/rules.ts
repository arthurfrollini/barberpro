/** The API's rule, mirrored to disable buttons: no cancel or move within 2 hours of the start. */
export const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function canChange(startsAt: string, now: Date): boolean {
  return Date.parse(startsAt) - now.getTime() >= TWO_HOURS_MS;
}
