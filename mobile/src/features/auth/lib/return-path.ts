/** Where to go after signing in: the screen that sent the user here, if it is one of ours. */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : null;
}

/** `/entrar?voltar=<here>`: a sign-in (or sign-up) path that comes back to `back`. */
export function returnPathWith(path: string, back: string | null): string {
  return back ? `${path}?voltar=${encodeURIComponent(back)}` : path;
}
