/** Time is a port so rules like "at least 2 hours before" can be tested with a fixed clock. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
