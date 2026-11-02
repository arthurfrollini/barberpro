import multipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import { type FileDeps, MAX_UPLOAD_BYTES, uploadImage } from '../../application/files.js';
import { DomainError } from '../../domain/domain-error.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const STATUS: Record<string, number> = { FILE_TOO_LARGE: 413, UNSUPPORTED_FILE_TYPE: 415 };

/**
 * REST, because a file is a plain HTTP body: POST /uploads returns an id that GraphQL
 * mutations reference (logoFileId, avatarFileId); GET /files/:id serves it publicly,
 * since logos and avatars are shown to anyone browsing.
 */
export async function registerUploadRoutes(
  app: FastifyInstance,
  deps: FileDeps & {
    authenticate: (authorization: string | undefined) => Promise<string | null>;
    publicUrl: string;
  },
): Promise<void> {
  await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES + 1, files: 1 } });

  app.post('/uploads', async (request, reply) => {
    const userId = await deps.authenticate(request.headers.authorization);
    if (!userId) {
      return reply.code(401).send({ code: 'UNAUTHENTICATED', message: 'Sign in to continue.' });
    }
    const part = await request.file();
    if (!part) {
      return reply.code(400).send({ code: 'FILE_REQUIRED', message: 'Send a "file" field.' });
    }
    let bytes: Buffer;
    try {
      bytes = await part.toBuffer();
    } catch (error) {
      if (error instanceof app.multipartErrors.RequestFileTooLargeError) {
        return reply
          .code(413)
          .send({ code: 'FILE_TOO_LARGE', message: 'Images can be at most 2 MB.' });
      }
      throw error;
    }
    try {
      const file = await uploadImage(deps, userId, bytes);
      return reply.code(201).send({ id: file.id, url: `${deps.publicUrl}/files/${file.id}` });
    } catch (error) {
      if (error instanceof DomainError && STATUS[error.code]) {
        return reply.code(STATUS[error.code]!).send({ code: error.code, message: error.message });
      }
      throw error;
    }
  });

  app.get<{ Params: { id: string } }>('/files/:id', async (request, reply) => {
    const { id } = request.params;
    const file = UUID.test(id) ? await deps.files.findById(id) : null;
    const bytes = file ? await deps.storage.get(id) : null;
    if (!file || !bytes) {
      return reply.code(404).send({ code: 'FILE_NOT_FOUND', message: 'File not found.' });
    }
    return reply
      .header('content-type', file.contentType)
      .header('x-content-type-options', 'nosniff')
      .header('cache-control', 'public, max-age=31536000, immutable')
      .send(Buffer.from(bytes));
  });
}
