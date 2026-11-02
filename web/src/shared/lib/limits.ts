// The API's validation limits, mirrored so forms can say what is wrong before a round trip.
// The API stays the authority: its error codes are still mapped in error-messages.ts.
export const LIMITS = {
  userName: 80,
  password: { min: 8, max: 128 },
  shopName: 80,
  shopDescription: 1000,
  address: 200,
  bio: 500,
  serviceName: 60,
  serviceDescription: 500,
  duration: { min: 5, max: 480, step: 5 },
} as const;
