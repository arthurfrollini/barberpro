import { readFileSync } from 'node:fs';

/** Reads a .graphql file that sits next to the calling module (`import.meta.url`). */
export function loadSdl(moduleUrl: string, fileName: string): string {
  return readFileSync(new URL(fileName, moduleUrl), 'utf8');
}
