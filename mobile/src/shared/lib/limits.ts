// The API's validation limits, mirrored so forms can say what is wrong before a round trip.
// The API stays the authority: its error codes are still mapped in error-messages.ts.
export const LIMITS = {
  userName: 80,
  password: { min: 8, max: 128 },
} as const;
