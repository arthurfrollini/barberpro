// The shop the user chose in the switcher. Each tab keeps its own (sessionStorage), so two
// tabs can sit on two shops without pulling each other along; the last choice is also kept
// per user in localStorage, as the starting point for the next tab.
const key = (userId: string) => `barberpro.workspace.${userId}`;
const listeners = new Set<() => void>();

const get = (storage: Storage, k: string) => {
  try {
    return storage.getItem(k);
  } catch {
    return null;
  }
};

export function readChoice(userId: string): string | null {
  return get(sessionStorage, key(userId)) ?? get(localStorage, key(userId));
}

export function choose(userId: string, shopId: string) {
  try {
    sessionStorage.setItem(key(userId), shopId);
    localStorage.setItem(key(userId), shopId);
  } catch {
    // private mode: the choice lasts until reload
  }
  for (const listener of listeners) listener();
}

/** Changes made in this tab only; other tabs keep their own shop. */
export function subscribeChoice(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
