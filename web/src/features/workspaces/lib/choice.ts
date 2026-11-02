// The shop the user last chose in the switcher, per browser, shared by its tabs.
const KEY = 'barberpro.workspace';
const listeners = new Set<() => void>();

export function readChoice(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function choose(shopId: string) {
  try {
    localStorage.setItem(KEY, shopId);
  } catch {
    // private mode: the choice lasts until reload
  }
  for (const listener of listeners) listener();
}

export function subscribeChoice(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => event.key === KEY && listener();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
