export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** The API's rules for logos and photos, checked before spending an upload on them. */
export function checkImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Use uma imagem JPEG, PNG ou WebP.';
  if (file.size > MAX_IMAGE_BYTES) return 'A imagem pode ter no máximo 2 MB.';
  return null;
}
