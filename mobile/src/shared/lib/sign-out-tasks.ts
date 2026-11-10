// Work that must run while the session still exists, right before signing out (unregistering
// this phone's push token, for one). Registered by the features that own it.

type Task = () => Promise<unknown>;

const tasks = new Set<Task>();

export function onSignOut(task: Task): () => void {
  tasks.add(task);
  return () => {
    tasks.delete(task);
  };
}

/**
 * Runs every task, but never holds sign-out longer than `timeoutMs`: offline, the user still
 * signs out, and the server forgets the phone the next time it reports it gone.
 */
export async function runSignOutTasks(timeoutMs = 3_000): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  try {
    await Promise.race([Promise.allSettled([...tasks].map((task) => task())), deadline]);
  } finally {
    clearTimeout(timer);
  }
}
