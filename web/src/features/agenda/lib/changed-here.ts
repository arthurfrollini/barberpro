// Appointments this tab changed in the last few seconds. The live stream echoes every change,
// including the barber's own; those already got their toast from the action itself.
const WINDOW_MS = 10_000;
const changed = new Map<string, number>();

export function markChangedHere(id: string, now = Date.now()) {
  changed.set(id, now);
}

export function wasChangedHere(id: string, now = Date.now()): boolean {
  const at = changed.get(id);
  if (at === undefined) return false;
  if (now - at > WINDOW_MS) {
    changed.delete(id);
    return false;
  }
  return true;
}
