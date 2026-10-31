import { setupServer } from 'msw/node';

/** Every test starts with no handlers; each one declares the API responses it needs. */
export const server = setupServer();
