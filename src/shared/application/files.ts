import { randomUUID } from 'node:crypto';
import { DomainError } from '../domain/domain-error.js';
import type { Clock } from './clock.js';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export type StoredFile = {
  id: string;
  ownerId: string;
  contentType: ImageType;
  sizeBytes: number;
  createdAt: Date;
};

export interface FileRepository {
  create(file: StoredFile): Promise<void>;
  findById(id: string): Promise<StoredFile | null>;
}

/** Where the bytes live: a disk folder in v1, an object store later. */
export interface FileStorage {
  put(id: string, bytes: Uint8Array): Promise<void>;
  get(id: string): Promise<Uint8Array | null>;
}

export type FileDeps = {
  files: FileRepository;
  storage: FileStorage;
  clock: Clock;
  detectType: (bytes: Uint8Array) => ImageType | null;
};

/** The type comes from the bytes, never from the file name or the header the client sent. */
export async function uploadImage(
  deps: FileDeps,
  ownerId: string,
  bytes: Uint8Array,
): Promise<StoredFile> {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new DomainError('FILE_TOO_LARGE', 'Images can be at most 2 MB.');
  }
  const contentType = deps.detectType(bytes);
  if (!contentType) {
    throw new DomainError('UNSUPPORTED_FILE_TYPE', 'Upload a JPEG, PNG or WebP image.');
  }
  const file: StoredFile = {
    id: randomUUID(),
    ownerId,
    contentType,
    sizeBytes: bytes.byteLength,
    createdAt: deps.clock.now(),
  };
  await deps.storage.put(file.id, bytes);
  await deps.files.create(file);
  return file;
}
