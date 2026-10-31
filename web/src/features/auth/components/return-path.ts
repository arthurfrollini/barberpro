/** Where to go after signing in: the page that sent the user here, if it is one of ours. */
export function returnPath(search: URLSearchParams): string {
  const target = search.get('voltar');
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
}
