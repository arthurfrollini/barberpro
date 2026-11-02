import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

// whole pages with typing take longer than the 1 s default when the suite runs in parallel
configure({ asyncUtilTimeout: 3000 });

// jsdom has no ResizeObserver; Radix (switch, select) measures elements with it
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup();
  // sonner keeps toasts in a module-level store and replays the active ones to a new Toaster
  toast.dismiss();
  server.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
});
afterAll(() => server.close());
